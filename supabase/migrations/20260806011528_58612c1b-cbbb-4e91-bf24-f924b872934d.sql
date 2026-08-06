CREATE OR REPLACE FUNCTION public.atualizar_status_destino(_pedido_id uuid, _destino destino_preparo, _status pedido_status)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_rest uuid;
  v_papel app_role;
  v_ok boolean := false;
  v_item_status pedido_item_status;
BEGIN
  IF _status NOT IN ('recebido','em_preparo','pronto') THEN
    RAISE EXCEPTION 'status_invalido';
  END IF;

  SELECT restaurante_id INTO v_rest FROM public.pedidos WHERE id = _pedido_id;
  IF v_rest IS NULL THEN
    RAISE EXCEPTION 'pedido_nao_encontrado';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_rest) OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Papel compatível com o destino (admin/staff podem tudo)
  SELECT papel INTO v_papel
    FROM public.restaurante_membros
    WHERE user_id = v_uid AND restaurante_id = v_rest
    ORDER BY criado_em ASC
    LIMIT 1;

  IF public.is_platform_admin(v_uid) OR v_papel IN ('admin','staff') THEN
    v_ok := true;
  ELSIF _destino = 'cozinha' AND v_papel = 'cozinheiro' THEN
    v_ok := true;
  ELSIF _destino = 'bar' AND v_papel = 'bar' THEN
    v_ok := true;
  END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'papel_incompativel_com_destino';
  END IF;

  -- Mantém os itens do destino coerentes com o avanço feito no card
  v_item_status := CASE _status
    WHEN 'recebido' THEN 'pendente'::pedido_item_status
    WHEN 'em_preparo' THEN 'em_preparo'::pedido_item_status
    ELSE 'pronto'::pedido_item_status
  END;

  UPDATE public.pedido_itens
     SET status = v_item_status,
         quantidade_pronta = CASE WHEN _status = 'pronto' THEN quantidade ELSE 0 END
   WHERE pedido_id = _pedido_id
     AND destino = _destino
     AND (status IS DISTINCT FROM v_item_status
          OR quantidade_pronta IS DISTINCT FROM (CASE WHEN _status = 'pronto' THEN quantidade ELSE 0 END));

  INSERT INTO public.pedido_destino_status (pedido_id, destino, status, atualizado_em)
  VALUES (_pedido_id, _destino, _status, now())
  ON CONFLICT (pedido_id, destino) DO UPDATE
    SET status = EXCLUDED.status, atualizado_em = now();
END;
$function$;