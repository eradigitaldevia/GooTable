
CREATE OR REPLACE FUNCTION public.criar_pedido_publico(
  _restaurante_id uuid,
  _mesa_id uuid,
  _sessao_id uuid,
  _comanda_id uuid,
  _cliente_id uuid,
  _observacao text,
  _total numeric,
  _itens jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido_id uuid;
  v_item jsonb;
  v_cliente_id uuid;
  v_total_cliente numeric;
BEGIN
  -- 1) cria o pedido
  INSERT INTO public.pedidos (
    restaurante_id, mesa_id, sessao_id, comanda_id, cliente_id,
    total, observacao
  ) VALUES (
    _restaurante_id, _mesa_id, _sessao_id, _comanda_id, _cliente_id,
    _total, NULLIF(btrim(_observacao), '')
  )
  RETURNING id INTO v_pedido_id;

  -- 2) insere itens
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

  -- 3) atualiza subtotal/total da comanda
  UPDATE public.comandas
  SET subtotal = COALESCE(subtotal,0) + _total,
      total = COALESCE(subtotal,0) + _total - COALESCE(cashback_resgatado,0),
      atualizado_em = now()
  WHERE id = _comanda_id;

  -- 4) atualiza métricas dos clientes autores (proporcional ao que cada um pediu)
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
$$;

REVOKE ALL ON FUNCTION public.criar_pedido_publico(uuid, uuid, uuid, uuid, uuid, text, numeric, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_pedido_publico(uuid, uuid, uuid, uuid, uuid, text, numeric, jsonb) TO service_role;
