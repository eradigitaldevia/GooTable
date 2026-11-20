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
  -- Restaurante precisa estar ativo para receber pedidos pelo cardápio
  PERFORM 1 FROM public.restaurantes WHERE id = _restaurante_id AND ativo = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'restaurante_inativo';
  END IF;

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

  -- Subtotal/total da comanda são recalculados pelo trigger pedidos_recalc_comanda_trg
  -- (recalcular_couvert_comanda + recalcular_total_comanda). Não somar manualmente aqui.

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

  PERFORM public.gerar_pedido_garcons(v_pedido_id, _restaurante_id, _mesa_id);

  RETURN v_pedido_id;
END;
$function$;