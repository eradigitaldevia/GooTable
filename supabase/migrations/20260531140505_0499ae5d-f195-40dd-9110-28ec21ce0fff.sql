
-- 1) Remove privilege-escalation policy on restaurante_membros (insert handled by server fn with admin)
DROP POLICY IF EXISTS "membros_insert_self" ON public.restaurante_membros;

-- 2) Storage produtos bucket: scope INSERT/UPDATE/DELETE to restaurant members via path prefix {restaurante_id}/...
DROP POLICY IF EXISTS "produtos_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "produtos_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "produtos_storage_delete" ON storage.objects;

CREATE POLICY "produtos_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'produtos'
    AND public.is_restaurante_membro(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "produtos_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'produtos'
    AND public.is_restaurante_membro(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'produtos'
    AND public.is_restaurante_membro(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "produtos_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'produtos'
    AND public.is_restaurante_membro(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- 3) Set search_path on remaining function flagged as mutable
ALTER FUNCTION public.periodo_range(garcom_meta_periodo, date) SET search_path = public;

-- 4) ETAPA 2 — Remove public anon read/write policies; public flows now go through server fns (supabaseAdmin)
DROP POLICY IF EXISTS "pedidos_select_publico_por_id" ON public.pedidos;
DROP POLICY IF EXISTS "itens_select_public" ON public.pedido_itens;
DROP POLICY IF EXISTS "itens_insert_publico" ON public.pedido_itens;
DROP POLICY IF EXISTS "mesas_select_public" ON public.mesas;
DROP POLICY IF EXISTS "restaurantes_select_public" ON public.restaurantes;
DROP POLICY IF EXISTS "programa_fidelidade_select_public" ON public.programa_fidelidade;
