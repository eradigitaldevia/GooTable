CREATE OR REPLACE FUNCTION public.confirmar_pagamento(_pagamento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Fecha a comanda automaticamente quando integralmente paga.
  UPDATE public.comandas
  SET status = 'fechada',
      fechada_em = COALESCE(fechada_em, now()),
      atualizado_em = now()
  WHERE id = v_pag.comanda_id
    AND status = 'aberta'
    AND total > 0
    AND COALESCE(total_pago,0) >= total;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('pagamento', _pagamento_id, 'confirmar', v_uid,
          jsonb_build_object('comanda_id', v_pag.comanda_id, 'valor', v_pag.valor));
END;
$function$;