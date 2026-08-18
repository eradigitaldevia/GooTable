-- ETAPA 2: fórmula única de total da comanda
CREATE OR REPLACE FUNCTION public.recalcular_total_comanda(_comanda_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.comandas
  SET total = GREATEST(
        COALESCE(subtotal, 0)
        - COALESCE(cashback_resgatado, 0)
        - COALESCE(desconto_cupom, 0), 0),
      atualizado_em = now()
  WHERE id = _comanda_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.recalcular_total_comanda(uuid) FROM PUBLIC, anon, authenticated;

-- ETAPA 1: fechamento automático quando quitada
CREATE OR REPLACE FUNCTION public.fechar_comanda_se_quitada(_comanda_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_comanda public.comandas%ROWTYPE;
  v_restantes int;
BEGIN
  SELECT * INTO v_comanda FROM public.comandas WHERE id = _comanda_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_comanda.status <> 'aberta'
     OR COALESCE(v_comanda.total, 0) <= 0
     OR COALESCE(v_comanda.total_pago, 0) < v_comanda.total THEN
    RETURN false;
  END IF;

  UPDATE public.comandas
  SET status = 'fechada',
      fechada_em = COALESCE(fechada_em, now()),
      atualizado_em = now()
  WHERE id = _comanda_id;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('comanda', _comanda_id, 'fechar_automatico', auth.uid(),
          jsonb_build_object('total', v_comanda.total, 'total_pago', v_comanda.total_pago));

  -- Fecha a sessão da mesa quando não resta comanda aberta
  IF v_comanda.sessao_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_restantes
    FROM public.comandas
    WHERE sessao_id = v_comanda.sessao_id AND status = 'aberta';

    IF v_restantes = 0 THEN
      UPDATE public.mesa_sessoes
      SET status = 'fechada',
          fechada_em = COALESCE(fechada_em, now()),
          atualizado_em = now()
      WHERE id = v_comanda.sessao_id AND status = 'aberta';
    END IF;
  END IF;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.fechar_comanda_se_quitada(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.registrar_pagamento(_comanda_id uuid, _metodo pagamento_metodo, _valor numeric, _observacao text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_comanda public.comandas%ROWTYPE;
  v_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF _valor IS NULL OR _valor <= 0 THEN
    RAISE EXCEPTION 'Valor inválido';
  END IF;

  SELECT * INTO v_comanda FROM public.comandas WHERE id = _comanda_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda não encontrada';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_comanda.restaurante_id)
          OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  INSERT INTO public.pagamentos (
    restaurante_id, comanda_id, sessao_id, metodo, valor, status,
    observacao, confirmado_por, confirmado_em
  ) VALUES (
    v_comanda.restaurante_id, v_comanda.id, v_comanda.sessao_id, _metodo, _valor, 'confirmado',
    NULLIF(btrim(COALESCE(_observacao,'')), ''), v_uid, now()
  ) RETURNING id INTO v_id;

  UPDATE public.comandas
  SET total_pago = COALESCE(total_pago,0) + _valor,
      atualizado_em = now()
  WHERE id = _comanda_id;

  PERFORM public.fechar_comanda_se_quitada(_comanda_id);

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('pagamento', v_id, 'registrar', v_uid,
          jsonb_build_object('comanda_id', _comanda_id, 'valor', _valor, 'metodo', _metodo));

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirmar_pagamento(_pagamento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pag public.pagamentos%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  SELECT * INTO v_pag FROM public.pagamentos WHERE id = _pagamento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_pag.restaurante_id)
          OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF v_pag.status = 'confirmado' THEN
    RETURN;
  END IF;
  IF v_pag.status = 'cancelado' THEN
    RAISE EXCEPTION 'Pagamento cancelado não pode ser confirmado';
  END IF;

  UPDATE public.pagamentos
  SET status = 'confirmado',
      confirmado_por = v_uid,
      confirmado_em = now()
  WHERE id = _pagamento_id;

  UPDATE public.comandas
  SET total_pago = COALESCE(total_pago,0) + v_pag.valor,
      atualizado_em = now()
  WHERE id = v_pag.comanda_id;

  PERFORM public.fechar_comanda_se_quitada(v_pag.comanda_id);

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('pagamento', _pagamento_id, 'confirmar', v_uid,
          jsonb_build_object('comanda_id', v_pag.comanda_id, 'valor', v_pag.valor));
END;
$function$;

-- ETAPA 2: usar a fórmula única nos três caminhos
CREATE OR REPLACE FUNCTION public.recalcular_couvert_comanda(_comanda_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pedidos numeric := 0;
  v_couverts numeric := 0;
BEGIN
  SELECT COALESCE(SUM(total),0) INTO v_pedidos
  FROM public.pedidos
  WHERE comanda_id = _comanda_id AND status <> 'cancelado';

  SELECT COALESCE(SUM(quantidade * valor_unitario),0) INTO v_couverts
  FROM public.comanda_couverts
  WHERE comanda_id = _comanda_id;

  UPDATE public.comandas
  SET subtotal = v_pedidos + v_couverts
  WHERE id = _comanda_id;

  PERFORM public.recalcular_total_comanda(_comanda_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.aplicar_cashback(_comanda_id uuid, _cliente_id uuid, _valor numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_comanda             public.comandas%ROWTYPE;
  v_cliente             public.clientes%ROWTYPE;
  v_percentual_max      numeric;
  v_subtotal_individual numeric := 0;
  v_limite_pct          numeric;
  v_limite              numeric;
BEGIN
  IF _valor <= 0 THEN
    RAISE EXCEPTION 'Valor de resgate invalido';
  END IF;

  SELECT * INTO v_comanda FROM public.comandas WHERE id = _comanda_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda nao encontrada';
  END IF;
  IF v_comanda.status <> 'aberta' THEN
    RAISE EXCEPTION 'Comanda nao esta aberta';
  END IF;

  SELECT * INTO v_cliente FROM public.clientes WHERE id = _cliente_id FOR UPDATE;
  IF NOT FOUND OR v_cliente.restaurante_id <> v_comanda.restaurante_id THEN
    RAISE EXCEPTION 'Cliente invalido';
  END IF;

  SELECT COALESCE(SUM(it.preco_unit * it.quantidade), 0)
    INTO v_subtotal_individual
  FROM public.pedido_itens it
  JOIN public.pedidos p ON p.id = it.pedido_id
  WHERE p.comanda_id = _comanda_id
    AND it.cliente_id = _cliente_id;

  IF v_subtotal_individual <= 0 THEN
    RAISE EXCEPTION 'Voce nao tem itens nesta comanda para aplicar cashback';
  END IF;

  SELECT COALESCE(percentual_max_resgate, 100)
    INTO v_percentual_max
  FROM public.programa_fidelidade
  WHERE restaurante_id = v_comanda.restaurante_id
  ORDER BY atualizado_em DESC
  LIMIT 1;

  v_limite_pct := round(v_subtotal_individual * COALESCE(v_percentual_max, 100) / 100.0, 2);
  v_limite := LEAST(COALESCE(v_cliente.cashback_saldo, 0), v_limite_pct);

  IF _valor > v_limite THEN
    RAISE EXCEPTION 'Valor acima do limite permitido (max %)', v_limite;
  END IF;

  UPDATE public.clientes
  SET cashback_saldo = COALESCE(cashback_saldo, 0) - _valor,
      atualizado_em = now()
  WHERE id = _cliente_id;

  UPDATE public.comandas
  SET cashback_resgatado = COALESCE(cashback_resgatado, 0) + _valor,
      atualizado_em = now()
  WHERE id = _comanda_id;

  PERFORM public.recalcular_total_comanda(_comanda_id);

  INSERT INTO public.cashback_movimentos (
    restaurante_id, cliente_id, tipo, valor, comanda_id, observacao
  ) VALUES (
    v_comanda.restaurante_id, _cliente_id, 'resgate', _valor, _comanda_id,
    'Resgate aplicado na comanda'
  );

  RETURN jsonb_build_object(
    'aplicado', _valor,
    'novo_saldo', COALESCE(v_cliente.cashback_saldo, 0) - _valor,
    'cashback_resgatado_comanda', COALESCE(v_comanda.cashback_resgatado, 0) + _valor
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.aplicar_cupom_comanda(_comanda_id uuid, _codigo text, _cliente_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_comanda public.comandas%ROWTYPE;
  v_res jsonb;
  v_cupom_id uuid;
  v_desconto numeric;
  v_uid uuid := auth.uid();
BEGIN
  SELECT * INTO v_comanda FROM public.comandas WHERE id = _comanda_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda não encontrada';
  END IF;
  IF v_comanda.status <> 'aberta' THEN
    RAISE EXCEPTION 'Comanda não está aberta';
  END IF;

  IF v_comanda.cupom_id IS NOT NULL THEN
    UPDATE public.cupons
    SET uso_atual = GREATEST(uso_atual - 1, 0), atualizado_em = now()
    WHERE id = v_comanda.cupom_id;
  END IF;

  v_res := public.validar_cupom(v_comanda.restaurante_id, _codigo, COALESCE(v_comanda.subtotal,0), _cliente_id);
  IF NOT (v_res->>'valido')::boolean THEN
    IF v_comanda.cupom_id IS NOT NULL THEN
      UPDATE public.cupons
      SET uso_atual = uso_atual + 1, atualizado_em = now()
      WHERE id = v_comanda.cupom_id;
    END IF;
    RETURN v_res;
  END IF;

  v_cupom_id := (v_res->>'cupom_id')::uuid;
  v_desconto := (v_res->>'desconto')::numeric;

  UPDATE public.comandas
  SET cupom_id = v_cupom_id,
      desconto_cupom = v_desconto,
      atualizado_em = now()
  WHERE id = _comanda_id;

  PERFORM public.recalcular_total_comanda(_comanda_id);

  UPDATE public.cupons
  SET uso_atual = uso_atual + 1, atualizado_em = now()
  WHERE id = v_cupom_id;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('cupom', v_cupom_id, 'aplicar', v_uid,
          jsonb_build_object('comanda_id', _comanda_id, 'desconto', v_desconto));

  RETURN v_res;
END;
$function$;

CREATE OR REPLACE FUNCTION public.remover_cupom_comanda(_comanda_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_comanda public.comandas%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  SELECT * INTO v_comanda FROM public.comandas WHERE id = _comanda_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda não encontrada';
  END IF;
  IF v_comanda.cupom_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.cupons
  SET uso_atual = GREATEST(uso_atual - 1, 0), atualizado_em = now()
  WHERE id = v_comanda.cupom_id;

  UPDATE public.comandas
  SET cupom_id = NULL,
      desconto_cupom = 0,
      atualizado_em = now()
  WHERE id = _comanda_id;

  PERFORM public.recalcular_total_comanda(_comanda_id);

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('cupom', v_comanda.cupom_id, 'remover', v_uid,
          jsonb_build_object('comanda_id', _comanda_id));
END;
$function$;

-- Correção pontual das comandas abertas existentes
UPDATE public.comandas
SET total = GREATEST(COALESCE(subtotal,0) - COALESCE(cashback_resgatado,0) - COALESCE(desconto_cupom,0), 0)
WHERE status = 'aberta'
  AND total IS DISTINCT FROM GREATEST(COALESCE(subtotal,0) - COALESCE(cashback_resgatado,0) - COALESCE(desconto_cupom,0), 0);
