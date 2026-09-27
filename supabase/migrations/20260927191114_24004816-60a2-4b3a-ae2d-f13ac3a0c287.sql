REVOKE ALL ON FUNCTION public.trg_estoque_recalc() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_restaurante_estoque_toggle() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_pedido_item_estoque_validar() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_pedido_item_estoque_baixar() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_pedido_item_estoque_estornar() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_pedido_estoque_cancelado() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.estoque_assert_acesso(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.estoque_insumos_guard() FROM PUBLIC, anon, authenticated;