
-- Fix 1: search_path na função de trigger
CREATE OR REPLACE FUNCTION public.touch_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END; $$;

-- Fix 2: política de insert de restaurantes — exigir auth.uid() não nulo
DROP POLICY IF EXISTS "restaurantes_insert_auth" ON public.restaurantes;
CREATE POLICY "restaurantes_insert_auth" ON public.restaurantes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix 3: bucket público — remover política de listing genérica
DROP POLICY IF EXISTS "produtos_storage_select" ON storage.objects;
-- Não criamos política de SELECT: arquivos no bucket público continuam acessíveis
-- por URL direto, mas listing via API fica negado.

-- Fix 4: revogar execute público da função SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.is_restaurante_membro(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_restaurante_membro(UUID, UUID) TO authenticated;
