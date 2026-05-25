-- 1) Colunas em comandas
ALTER TABLE public.comandas
  ADD COLUMN IF NOT EXISTS cupom_id uuid NULL,
  ADD COLUMN IF NOT EXISTS desconto_cupom numeric NOT NULL DEFAULT 0;

-- 2) validar_cupom
CREATE OR REPLACE FUNCTION public.validar_cupom(
  _restaurante_id uuid,
  _codigo text,
  _subtotal numeric,
  _cliente_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cupom public.cupons%ROWTYPE;
  v_desconto numeric := 0;
  v_valor_min numeric;
  v_primeira boolean;
  v_pedidos_count int;
BEGIN
  SELECT * INTO v_cupom
  FROM public.cupons
  WHERE restaurante_id = _restaurante_id
    AND lower(codigo) = lower(btrim(_codigo))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Cupom não encontrado');
  END IF;

  IF NOT v_cupom.ativo THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Cupom inativo');
  END IF;

  IF v_cupom.validade_inicio IS NOT NULL AND now() < v_cupom.validade_inicio THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Cupom ainda não está válido');
  END IF;
  IF v_cupom.validade_fim IS NOT NULL AND now() > v_cupom.validade_fim THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Cupom expirado');
  END IF;

  IF v_cupom.uso_max IS NOT NULL AND v_cupom.uso_atual >= v_cupom.uso_max THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Cupom esgotado');
  END IF;

  v_valor_min := COALESCE((v_cupom.regras_json->>'valor_minimo')::numeric, 0);
  IF _subtotal < v_valor_min THEN
    RETURN jsonb_build_object('valido', false,
      'motivo', 'Valor mínimo de ' || v_valor_min::text || ' não atingido');
  END IF;

  v_primeira := COALESCE((v_cupom.regras_json->>'primeira_compra')::boolean, false);
  IF v_primeira THEN
    IF _cliente_id IS NULL THEN
      RETURN jsonb_build_object('valido', false, 'motivo', 'Cupom exige cliente identificado');
    END IF;
    SELECT pedidos_count INTO v_pedidos_count
    FROM public.clientes WHERE id = _cliente_id;
    IF COALESCE(v_pedidos_count, 0) > 0 THEN
      RETURN jsonb_build_object('valido', false, 'motivo', 'Cupom válido apenas na primeira compra');
    END IF;
  END IF;

  IF v_cupom.tipo = 'percentual' THEN
    v_desconto := round(_subtotal * v_cupom.valor / 100.0, 2);
  ELSE
    v_desconto := LEAST(v_cupom.valor, _subtotal);
  END IF;

  RETURN jsonb_build_object(
    'valido', true,
    'cupom_id', v_cupom.id,
    'codigo', v_cupom.codigo,
    'tipo', v_cupom.tipo,
    'valor', v_cupom.valor,
    'desconto', v_desconto
  );
END; $$;

-- 3) aplicar_cupom_comanda
CREATE OR REPLACE FUNCTION public.aplicar_cupom_comanda(
  _comanda_id uuid,
  _codigo text,
  _cliente_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Devolve uso do cupom anterior (se houver)
  IF v_comanda.cupom_id IS NOT NULL THEN
    UPDATE public.cupons
    SET uso_atual = GREATEST(uso_atual - 1, 0), atualizado_em = now()
    WHERE id = v_comanda.cupom_id;
  END IF;

  v_res := public.validar_cupom(v_comanda.restaurante_id, _codigo, COALESCE(v_comanda.subtotal,0), _cliente_id);
  IF NOT (v_res->>'valido')::boolean THEN
    -- Reverte: como já pode ter decrementado o anterior, refazer estado coerente: se era o mesmo cupom, reincrementa
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
      total = GREATEST(COALESCE(subtotal,0) - COALESCE(cashback_resgatado,0) - v_desconto, 0),
      atualizado_em = now()
  WHERE id = _comanda_id;

  UPDATE public.cupons
  SET uso_atual = uso_atual + 1, atualizado_em = now()
  WHERE id = v_cupom_id;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('cupom', v_cupom_id, 'aplicar', v_uid,
          jsonb_build_object('comanda_id', _comanda_id, 'desconto', v_desconto));

  RETURN v_res;
END; $$;

-- 4) remover_cupom_comanda
CREATE OR REPLACE FUNCTION public.remover_cupom_comanda(_comanda_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      total = GREATEST(COALESCE(subtotal,0) - COALESCE(cashback_resgatado,0), 0),
      atualizado_em = now()
  WHERE id = _comanda_id;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('cupom', v_comanda.cupom_id, 'remover', v_uid,
          jsonb_build_object('comanda_id', _comanda_id));
END; $$;

-- 5) Ajuste em criar_pedido_publico — desconta cupom no total
CREATE OR REPLACE FUNCTION public.criar_pedido_publico(_restaurante_id uuid, _mesa_id uuid, _sessao_id uuid, _comanda_id uuid, _cliente_id uuid, _observacao text, _total numeric, _itens jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pedido_id uuid;
  v_item jsonb;
  v_cliente_id uuid;
  v_total_cliente numeric;
BEGIN
  INSERT INTO public.pedidos (
    restaurante_id, mesa_id, sessao_id, comanda_id, cliente_id,
    total, observacao
  ) VALUES (
    _restaurante_id, _mesa_id, _sessao_id, _comanda_id, _cliente_id,
    _total, NULLIF(btrim(_observacao), '')
  )
  RETURNING id INTO v_pedido_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_itens)
  LOOP
    INSERT INTO public.pedido_itens (
      pedido_id, produto_id, nome_produto, quantidade,
      preco_unit, observacao, cliente_nome, cliente_id
    ) VALUES (
      v_pedido_id,
      (v_item->>'produto_id')::uuid,
      v_item->>'nome_produto',
      (v_item->>'quantidade')::int,
      (v_item->>'preco_unit')::numeric,
      NULLIF(btrim(COALESCE(v_item->>'observacao','')), ''),
      NULLIF(btrim(COALESCE(v_item->>'cliente_nome','')), ''),
      NULLIF(v_item->>'cliente_id','')::uuid
    );
  END LOOP;

  UPDATE public.comandas
  SET subtotal = COALESCE(subtotal,0) + _total,
      total = GREATEST(COALESCE(subtotal,0) + _total - COALESCE(cashback_resgatado,0) - COALESCE(desconto_cupom,0), 0),
      atualizado_em = now()
  WHERE id = _comanda_id;

  FOR v_cliente_id, v_total_cliente IN
    SELECT
      COALESCE(NULLIF(it->>'cliente_id','')::uuid, _cliente_id) AS cid,
      SUM((it->>'preco_unit')::numeric * (it->>'quantidade')::int) AS soma
    FROM jsonb_array_elements(_itens) AS it
    GROUP BY 1
  LOOP
    UPDATE public.clientes
    SET total_gasto   = COALESCE(total_gasto,0) + v_total_cliente,
        pedidos_count = COALESCE(pedidos_count,0) + 1,
        ultima_visita = now(),
        ticket_medio  = CASE
          WHEN COALESCE(pedidos_count,0) + 1 > 0
          THEN (COALESCE(total_gasto,0) + v_total_cliente) / (COALESCE(pedidos_count,0) + 1)
          ELSE 0
        END,
        atualizado_em = now()
    WHERE id = v_cliente_id
      AND restaurante_id = _restaurante_id;
  END LOOP;

  RETURN v_pedido_id;
END;
$function$;

-- Trigger touch_atualizado_em em cupons (caso ainda não exista)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'cupons_touch_atualizado_em'
  ) THEN
    CREATE TRIGGER cupons_touch_atualizado_em
    BEFORE UPDATE ON public.cupons
    FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();
  END IF;
END $$;