CREATE POLICY itens_select_membro ON public.pedido_itens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_itens.pedido_id
      AND (public.is_restaurante_membro(auth.uid(), p.restaurante_id) OR public.is_platform_admin(auth.uid()))
  )
);