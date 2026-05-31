DROP POLICY IF EXISTS "restaurantes_select_membro" ON public.restaurantes;

CREATE POLICY "restaurantes_select_membro"
  ON public.restaurantes
  FOR SELECT
  TO authenticated
  USING (
    is_restaurante_membro(auth.uid(), id)
    OR is_platform_admin(auth.uid())
  );