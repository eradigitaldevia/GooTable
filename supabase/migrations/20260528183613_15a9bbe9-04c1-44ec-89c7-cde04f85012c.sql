CREATE OR REPLACE FUNCTION public.criar_pedido_garcom(
  _restaurante_id uuid,
  _mesa_id uuid,
  _garcom_id uuid,
  _cliente_id uuid,
  _comanda_id uuid,
  _observacao text,
  _total numeric,
  _itens jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_mesa_ativa boolean;
  v_mesa_rest uuid;
  v_sessao_id uuid;
  v_comanda_id uuid := _comanda_id;
  v_count_abertas int;
  v_pedido_id uuid;
  v_item jsonb;
  v_cliente_id uuid;
  v_total_cliente numeric;
BEGIN
  -- Autorização: precisa ser membro do restaurante ou admin da plataforma
  IF v_uid IS NULL
     OR NOT (public.is_restaurante_membro(v_uid, _restaurante_id)
             OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Valida mesa
  SELECT ativa, restaurante_id INTO v_mesa_ativa, v_mesa_rest
  FROM public.mesas WHERE id = _mesa_id;
  IF v_mesa_rest IS NULL OR v_mesa_rest <> _restaurante_id OR v_mesa_ativa IS NOT TRUE THEN
    RAISE EXCEPTION 'mesa_invalida';
  END IF;

  -- Valida garçom (quando informado) — precisa pertencer ao restaurante e estar ativo
  IF _garcom_id IS NOT NULL THEN
    PERFORM 1 FROM public.garcons
      WHERE id = _garcom_id AND restaurante_id = _restaurante_id AND ativo = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'garcom_invalido';
    END IF;
  END IF;

  -- Valida cliente (quando informado)
  IF _cliente_id IS NOT NULL THEN
    PERFORM 1 FROM public.clientes
      WHERE id = _cliente_id AND restaurante_id = _restaurante_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'cliente_invalido';
    END IF;
  END IF;

  -- Garante sessão aberta
  SELECT id INTO v_sessao_id
  FROM public.mesa_sessoes
  WHERE mesa_id = _mesa_id AND status = 'aberta'
  ORDER BY aberta_em DESC
  LIMIT 1;

  IF v_sessao_id IS NULL THEN
    INSERT INTO public.mesa_sessoes (mesa_id, restaurante_id)
    VALUES (_mesa_id, _restaurante_id)
    RETURNING id INTO v_sessao_id;
  END IF;

  -- Resolve comanda
  IF v_comanda_id IS NOT NULL THEN
    PERFORM 1 FROM public.comandas
      WHERE id = v_comanda_id
        AND sessao_id = v_sessao_id
        AND restaurante_id = _restaurante_id
        AND status = 'aberta';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'comanda_invalida';
    END IF;
  ELSE
    SELECT COUNT(*) INTO v_count_abertas
    FROM public.comandas
    WHERE sessao_id = v_sessao_id AND status = 'aberta';

    IF v_count_abertas = 0 THEN
      INSERT INTO public.comandas (sessao_id, restaurante_id, tipo, titular_cliente_id)
      VALUES (v_sessao_id, _restaurante_id, 'compartilhada', NULL)
      RETURNING id INTO v_comanda_id;
    ELSIF v_count_abertas = 1 THEN
      SELECT id INTO v_comanda_id
      FROM public.comandas
      WHERE sessao_id = v_sessao_id AND status = 'aberta'
      LIMIT 1;
    ELSE
      RAISE EXCEPTION 'multiplas_comandas_abertas';
    END IF;
  END IF;

  -- Insere pedido (com garçom)
  INSERT INTO public.pedidos (
    restaurante_id, mesa_id, sessao_id, comanda_id, cliente_id, garcom_id,
    total, observacao
  ) VALUES (
    _restaurante_id, _mesa_id, v_sessao_id, v_comanda_id, _cliente_id, _garcom_id,
    _total, NULLIF(btrim(_observacao), '')
  )
  RETURNING id INTO v_pedido_id;

  -- Insere itens
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

  -- Atualiza totais da comanda (mesma lógica do fluxo público)
  UPDATE public.comandas
  SET subtotal = COALESCE(subtotal,0) + _total,
      total = GREATEST(COALESCE(subtotal,0) + _total - COALESCE(cashback_resgatado,0) - COALESCE(desconto_cupom,0), 0),
      atualizado_em = now()
  WHERE id = v_comanda_id;

  -- Atualiza estatísticas do cliente (quando identificado)
  FOR v_cliente_id, v_total_cliente IN
    SELECT
      COALESCE(NULLIF(it->>'cliente_id','')::uuid, _cliente_id) AS cid,
      SUM((it->>'preco_unit')::numeric * (it->>'quantidade')::int) AS soma
    FROM jsonb_array_elements(_itens) AS it
    GROUP BY 1
  LOOP
    IF v_cliente_id IS NOT NULL THEN
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
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'pedido_id', v_pedido_id,
    'sessao_id', v_sessao_id,
    'comanda_id', v_comanda_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.criar_pedido_garcom(uuid, uuid, uuid, uuid, uuid, text, numeric, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_pedido_garcom(uuid, uuid, uuid, uuid, uuid, text, numeric, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_pedido_garcom(uuid, uuid, uuid, uuid, uuid, text, numeric, jsonb) TO service_role;