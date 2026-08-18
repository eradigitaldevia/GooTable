DROP TRIGGER IF EXISTS pedido_itens_derivar_status_au ON public.pedido_itens;
DROP TRIGGER IF EXISTS pedido_itens_derivar_status_aiud ON public.pedido_itens;
DROP FUNCTION IF EXISTS public.trg_pedido_itens_derivar_status();
DROP FUNCTION IF EXISTS public.derivar_status_pedido(uuid);
