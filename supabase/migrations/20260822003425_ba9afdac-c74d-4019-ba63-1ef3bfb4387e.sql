CREATE OR REPLACE FUNCTION public.ajustar_descontos_comanda(_comanda_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_comanda public.comandas%ROWTYPE;
  v_codigo text;
  v_res jsonb;
  v_novo_desconto numeric := 0;
  v_limite_cashback numeric;
  v_excesso numeric;
  v_cliente_id uuid;
BEGIN
  SELECT * INTO v_comanda FROM public.comandas WHERE id = _comanda_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  -- 1) Revalidar cupom sobre o novo subtotal
  IF v_comanda.cupom_id IS NOT NULL THEN
    SELECT codigo INTO v_codigo FROM public.cupons WHERE id = v_comanda.cupom_id;
    IF v_codigo IS NOT NULL THEN
      v_res := public.validar_cupom(
        v_comanda.restaurante_id, v_codigo, COALESCE(v_comanda.subtotal,0), v_comanda.titular_cliente_id
      );
      IF COALESCE((v_res->>'valido')::boolean, false) THEN
        v_novo_desconto := LEAST(COALESCE((v_res->>'desconto')::numeric, 0), COALESCE(v_comanda.subtotal,0));
      ELSE
        v_novo_desconto := 0;
      END IF;
    END IF;

    IF v_novo_desconto <> COALESCE(v_comanda.desconto_cupom, 0) THEN
      IF v_novo_desconto = 0 THEN
        UPDATE public.cupons
        SET uso_atual = GREATEST(uso_atual - 1, 0), atualizado_em = now()
        WHERE id = v_comanda.cupom_id;

        UPDATE public.comandas
        SET cupom_id = NULL, desconto_cupom = 0, atualizado_em = now()
        WHERE id = _comanda_id;
      ELSE
        UPDATE public.comandas
        SET desconto_cupom = v_novo_desconto, atualizado_em = now()
        WHERE id = _comanda_id;
      END IF;

      INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
      VALUES ('comanda', _comanda_id, 'reavaliar_cupom', auth.uid(),
              jsonb_build_object('desconto_anterior', v_comanda.desconto_cupom,
                                 'desconto_novo', v_novo_desconto,
                                 'subtotal', v_comanda.subtotal));
    END IF;
  END IF;

  -- 2) Estornar cashback resgatado acima do que a conta comporta
  SELECT * INTO v_comanda FROM public.comandas WHERE id = _comanda_id;
  v_limite_cashback := GREATEST(COALESCE(v_comanda.subtotal,0) - COALESCE(v_comanda.desconto_cupom,0), 0);
  v_excesso := ROUND(GREATEST(COALESCE(v_comanda.cashback_resgatado,0) - v_limite_cashback, 0), 2);

  IF v_excesso > 0 THEN
    SELECT cliente_id INTO v_cliente_id
    FROM public.cashback_movimentos
    WHERE comanda_id = _comanda_id AND tipo = 'resgate'
    ORDER BY criado_em DESC
    LIMIT 1;

    v_cliente_id := COALESCE(v_cliente_id, v_comanda.titular_cliente_id);

    UPDATE public.comandas
    SET cashback_resgatado = GREATEST(COALESCE(cashback_resgatado,0) - v_excesso, 0),
        atualizado_em = now()
    WHERE id = _comanda_id;

    IF v_cliente_id IS NOT NULL THEN
      UPDATE public.clientes
      SET cashback_saldo = COALESCE(cashback_saldo,0) + v_excesso,
          atualizado_em = now()
      WHERE id = v_cliente_id;

      INSERT INTO public.cashback_movimentos (
        restaurante_id, cliente_id, tipo, valor, comanda_id, observacao
      ) VALUES (
        v_comanda.restaurante_id, v_cliente_id, 'ajuste', v_excesso, _comanda_id,
        'Estorno de resgate por cancelamento de itens'
      );
    END IF;
  END IF;

  PERFORM public.recalcular_total_comanda(_comanda_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.ajustar_descontos_comanda(uuid) FROM anon, authenticated;

-- cancelar_pedido: reavaliar descontos após recalcular
CREATE OR REPLACE FUNCTION public.cancelar_pedido(_pedido_id uuid, _motivo text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_pedido public.pedidos%ROWTYPE;
  v_status_anterior public.pedido_status;
  v_algum_pronto int;
  v_exige_motivo boolean;
  v_motivo text;
BEGIN
  SELECT * INTO v_pedido FROM public.pedidos WHERE id = _pedido_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido nao encontrado';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_pedido.restaurante_id) OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF v_pedido.status IN ('entregue','cancelado') THEN
    RAISE EXCEPTION 'Pedido ja % nao pode ser cancelado', v_pedido.status;
  END IF;

  SELECT COUNT(*) INTO v_algum_pronto
  FROM public.pedido_itens
  WHERE pedido_id = _pedido_id AND quantidade_pronta > 0;

  v_exige_motivo := v_pedido.status IN ('em_preparo','pronto') OR v_algum_pronto > 0;
  v_motivo := NULLIF(btrim(COALESCE(_motivo,'')), '');

  IF v_exige_motivo AND (v_motivo IS NULL OR length(v_motivo) < 3) THEN
    RAISE EXCEPTION 'Motivo obrigatorio para cancelar pedido com itens em preparo/prontos';
  END IF;

  v_status_anterior := v_pedido.status;

  UPDATE public.pedidos
  SET status = 'cancelado', atualizado_em = now()
  WHERE id = _pedido_id;

  IF v_pedido.comanda_id IS NOT NULL THEN
    PERFORM public.recalcular_couvert_comanda(v_pedido.comanda_id);
    PERFORM public.ajustar_descontos_comanda(v_pedido.comanda_id);
  END IF;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('pedido', _pedido_id, 'cancelar', v_uid,
          jsonb_build_object(
            'status_anterior', v_status_anterior,
            'total_revertido', v_pedido.total,
            'comanda_id', v_pedido.comanda_id,
            'motivo', v_motivo
          ));
END;
$function$;

-- cancelar_item_pedido: reavaliar descontos após recalcular
CREATE OR REPLACE FUNCTION public.cancelar_item_pedido(_item_id uuid, _motivo text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_item public.pedido_itens%ROWTYPE;
  v_pedido public.pedidos%ROWTYPE;
  v_valor numeric;
  v_exige_motivo boolean;
  v_motivo text;
  v_restantes int;
BEGIN
  SELECT * INTO v_item FROM public.pedido_itens WHERE id = _item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item nao encontrado';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos WHERE id = v_item.pedido_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido nao encontrado';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_pedido.restaurante_id) OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF v_pedido.status IN ('entregue','cancelado') THEN
    RAISE EXCEPTION 'Pedido ja % nao pode ter itens cancelados', v_pedido.status;
  END IF;

  v_exige_motivo := v_pedido.status IN ('em_preparo','pronto') OR COALESCE(v_item.quantidade_pronta,0) > 0;
  v_motivo := NULLIF(btrim(COALESCE(_motivo,'')), '');

  IF v_exige_motivo AND (v_motivo IS NULL OR length(v_motivo) < 3) THEN
    RAISE EXCEPTION 'Motivo obrigatorio para cancelar item em preparo/pronto';
  END IF;

  v_valor := COALESCE(v_item.preco_unit,0) * COALESCE(v_item.quantidade,0);

  DELETE FROM public.pedido_itens WHERE id = _item_id;

  UPDATE public.pedidos
  SET total = GREATEST(COALESCE(total,0) - v_valor, 0),
      atualizado_em = now()
  WHERE id = v_pedido.id;

  SELECT COUNT(*) INTO v_restantes FROM public.pedido_itens WHERE pedido_id = v_pedido.id;
  IF v_restantes = 0 THEN
    UPDATE public.pedidos
    SET status = 'cancelado', atualizado_em = now()
    WHERE id = v_pedido.id;
  END IF;

  IF v_pedido.comanda_id IS NOT NULL THEN
    PERFORM public.recalcular_couvert_comanda(v_pedido.comanda_id);
    PERFORM public.ajustar_descontos_comanda(v_pedido.comanda_id);
  END IF;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('pedido_item', _item_id, 'cancelar', v_uid,
          jsonb_build_object(
            'pedido_id', v_pedido.id,
            'comanda_id', v_pedido.comanda_id,
            'produto_id', v_item.produto_id,
            'nome_produto', v_item.nome_produto,
            'quantidade', v_item.quantidade,
            'valor_revertido', v_valor,
            'motivo', v_motivo,
            'restantes', v_restantes
          ));
END;
$function$;

-- registrar_pagamento: teto no saldo devedor
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
  v_saldo numeric;
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

  v_saldo := ROUND(COALESCE(v_comanda.total,0) - COALESCE(v_comanda.total_pago,0), 2);
  IF v_saldo <= 0 THEN
    RAISE EXCEPTION 'Comanda já está quitada';
  END IF;
  IF _valor > v_saldo + 0.01 THEN
    RAISE EXCEPTION 'Valor acima do saldo devedor (máx %)', v_saldo;
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