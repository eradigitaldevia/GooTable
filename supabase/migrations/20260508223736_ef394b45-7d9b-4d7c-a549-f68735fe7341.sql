
-- 1. platform_admins
CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 2. is_platform_admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id);
$$;

CREATE POLICY "platform_admins_select" ON public.platform_admins
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "platform_admins_write" ON public.platform_admins
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- 3. coluna ativo
ALTER TABLE public.restaurantes ADD COLUMN ativo boolean NOT NULL DEFAULT true;

-- 4. audit_logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  acao text NOT NULL,
  entidade text NOT NULL,
  entidade_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_criado_em_idx ON public.audit_logs (criado_em DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "audit_logs_insert_admin" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- 5. atualizar policies para incluir super-admin
-- restaurantes
DROP POLICY IF EXISTS restaurantes_update_membro ON public.restaurantes;
CREATE POLICY "restaurantes_update_membro" ON public.restaurantes
  FOR UPDATE TO authenticated
  USING (is_restaurante_membro(auth.uid(), id) OR is_platform_admin(auth.uid()))
  WITH CHECK (is_restaurante_membro(auth.uid(), id) OR is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS restaurantes_delete_membro ON public.restaurantes;
CREATE POLICY "restaurantes_delete_membro" ON public.restaurantes
  FOR DELETE TO authenticated
  USING (is_restaurante_membro(auth.uid(), id) OR is_platform_admin(auth.uid()));

-- produtos
DROP POLICY IF EXISTS produtos_write_membro ON public.produtos;
CREATE POLICY "produtos_write_membro" ON public.produtos
  FOR ALL TO authenticated
  USING (is_restaurante_membro(auth.uid(), restaurante_id) OR is_platform_admin(auth.uid()))
  WITH CHECK (is_restaurante_membro(auth.uid(), restaurante_id) OR is_platform_admin(auth.uid()));

-- categorias
DROP POLICY IF EXISTS categorias_write_membro ON public.categorias;
CREATE POLICY "categorias_write_membro" ON public.categorias
  FOR ALL TO authenticated
  USING (is_restaurante_membro(auth.uid(), restaurante_id) OR is_platform_admin(auth.uid()))
  WITH CHECK (is_restaurante_membro(auth.uid(), restaurante_id) OR is_platform_admin(auth.uid()));

-- mesas
DROP POLICY IF EXISTS mesas_write_membro ON public.mesas;
CREATE POLICY "mesas_write_membro" ON public.mesas
  FOR ALL TO authenticated
  USING (is_restaurante_membro(auth.uid(), restaurante_id) OR is_platform_admin(auth.uid()))
  WITH CHECK (is_restaurante_membro(auth.uid(), restaurante_id) OR is_platform_admin(auth.uid()));

-- pedidos
DROP POLICY IF EXISTS pedidos_select_membro ON public.pedidos;
CREATE POLICY "pedidos_select_membro" ON public.pedidos
  FOR SELECT TO authenticated
  USING (is_restaurante_membro(auth.uid(), restaurante_id) OR is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS pedidos_update_membro ON public.pedidos;
CREATE POLICY "pedidos_update_membro" ON public.pedidos
  FOR UPDATE TO authenticated
  USING (is_restaurante_membro(auth.uid(), restaurante_id) OR is_platform_admin(auth.uid()))
  WITH CHECK (is_restaurante_membro(auth.uid(), restaurante_id) OR is_platform_admin(auth.uid()));

-- bloquear pedidos para restaurantes suspensos
DROP POLICY IF EXISTS pedidos_insert_publico ON public.pedidos;
CREATE POLICY "pedidos_insert_publico" ON public.pedidos
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mesas m
      JOIN restaurantes r ON r.id = m.restaurante_id
      WHERE m.id = pedidos.mesa_id
        AND m.restaurante_id = pedidos.restaurante_id
        AND m.ativa = true
        AND r.ativo = true
    )
  );

-- membros: super-admin pode gerenciar
DROP POLICY IF EXISTS membros_select_self ON public.restaurante_membros;
CREATE POLICY "membros_select_self" ON public.restaurante_membros
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_restaurante_membro(auth.uid(), restaurante_id) OR is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS membros_insert_self ON public.restaurante_membros;
CREATE POLICY "membros_insert_self" ON public.restaurante_membros
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS membros_delete_self ON public.restaurante_membros;
CREATE POLICY "membros_delete_self" ON public.restaurante_membros
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_platform_admin(auth.uid()));
