CREATE OR REPLACE FUNCTION public.restaurante_esta_ativo(_restaurante_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.restaurantes WHERE id = _restaurante_id AND ativo = true)
$$;
GRANT EXECUTE ON FUNCTION public.restaurante_esta_ativo(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS restaurantes_insert_auth ON public.restaurantes;
CREATE POLICY restaurantes_insert_auth ON public.restaurantes FOR INSERT TO authenticated
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR NOT EXISTS (SELECT 1 FROM public.restaurante_membros m WHERE m.user_id = auth.uid())
);

DROP POLICY IF EXISTS produtos_select_public ON public.produtos;
CREATE POLICY produtos_select_public ON public.produtos FOR SELECT
USING (public.restaurante_esta_ativo(restaurante_id));

DROP POLICY IF EXISTS categorias_select_public ON public.categorias;
CREATE POLICY categorias_select_public ON public.categorias FOR SELECT
USING (public.restaurante_esta_ativo(restaurante_id));

DROP POLICY IF EXISTS tipos_chamado_select_public ON public.tipos_chamado;
CREATE POLICY tipos_chamado_select_public ON public.tipos_chamado FOR SELECT
USING (public.restaurante_esta_ativo(restaurante_id));