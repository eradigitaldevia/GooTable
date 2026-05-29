
-- RPC: cancelar_pedido
CREATE OR REPLACE FUNCTION public.cancelar_pedido(_pedido_id uuid, _motivo text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    UPDATE public.comandas
    SET subtotal = GREATEST(COALESCE(subtotal,0) - COALESCE(v_pedido.total,0), 0),
        total = GREATEST(GREATEST(COALESCE(subtotal,0) - COALESCE(v_pedido.total,0), 0)
                         - COALESCE(cashback_resgatado,0) - COALESCE(desconto_cupom,0), 0),
        atualizado_em = now()
    WHERE id = v_pedido.comanda_id;
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
$$;

-- RPC: cancelar_item_pedido
CREATE OR REPLACE FUNCTION public.cancelar_item_pedido(_item_id uuid, _motivo text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  IF v_pedido.comanda_id IS NOT NULL THEN
    UPDATE public.comandas
    SET subtotal = GREATEST(COALESCE(subtotal,0) - v_valor, 0),
        total = GREATEST(GREATEST(COALESCE(subtotal,0) - v_valor, 0)
                         - COALESCE(cashback_resgatado,0) - COALESCE(desconto_cupom,0), 0),
        atualizado_em = now()
    WHERE id = v_pedido.comanda_id;
  END IF;

  SELECT COUNT(*) INTO v_restantes FROM public.pedido_itens WHERE pedido_id = v_pedido.id;
  IF v_restantes = 0 THEN
    UPDATE public.pedidos
    SET status = 'cancelado', atualizado_em = now()
    WHERE id = v_pedido.id;
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
$$;

GRANT EXECUTE ON FUNCTION public.cancelar_pedido(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_item_pedido(uuid, text) TO authenticated;
