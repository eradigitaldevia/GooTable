-- Trigger central: qualquer mudança em pedidos recalcula a comanda
CREATE OR REPLACE FUNCTION public.trg_pedido_recalc_comanda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.comanda_id IS NOT NULL THEN
      PERFORM public.recalcular_couvert_comanda(OLD.comanda_id);
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.comanda_id IS NOT NULL
     AND OLD.comanda_id IS DISTINCT FROM NEW.comanda_id THEN
    PERFORM public.recalcular_couvert_comanda(OLD.comanda_id);
  END IF;

  IF NEW.comanda_id IS NOT NULL THEN
    PERFORM public.recalcular_couvert_comanda(NEW.comanda_id);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS pedidos_recalc_comanda_trg ON public.pedidos;
CREATE TRIGGER pedidos_recalc_comanda_trg
AFTER INSERT OR DELETE OR UPDATE OF status, comanda_id, total ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.trg_pedido_recalc_comanda();

-- criar_pedido_publico: remover cálculo manual do total da comanda
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
    total, observacao, origem
  ) VALUES (
    _restaurante_id, _mesa_id, _sessao_id, _comanda_id, _cliente_id,
    _total, NULLIF(btrim(_observacao), ''), 'cliente'
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

  -- total da comanda recalculado pela trigger pedidos_recalc_comanda_trg
  PERFORM public.recalcular_couvert_comanda(_comanda_id);

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

-- cancelar_pedido: usar cálculo central
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

-- cancelar_item_pedido: usar cálculo central
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

-- Backfill: recalcular comandas abertas
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.comandas WHERE status = 'aberta' LOOP
    PERFORM public.recalcular_couvert_comanda(r.id);
  END LOOP;
END $$;