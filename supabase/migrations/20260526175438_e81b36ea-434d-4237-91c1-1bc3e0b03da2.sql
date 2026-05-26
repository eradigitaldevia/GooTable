REVOKE EXECUTE ON FUNCTION public.derivar_status_pedido(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_pedido_itens_derivar_status() FROM PUBLIC, anon, authenticated;