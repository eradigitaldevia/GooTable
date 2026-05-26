-- 1. Tabela garcons
CREATE TABLE public.garcons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL,
  nome text NOT NULL,
  telefone text,
  percentual_comissao numeric(5,2) NOT NULL DEFAULT 8.00 CHECK (percentual_comissao >= 0 AND percentual_comissao <= 100),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_garcons_restaurante ON public.garcons(restaurante_id) WHERE ativo = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.garcons TO authenticated;
GRANT ALL ON public.garcons TO service_role;

ALTER TABLE public.garcons ENABLE ROW LEVEL SECURITY;

CREATE POLICY garcons_rw_membro ON public.garcons
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_garcons_touch
  BEFORE UPDATE ON public.garcons
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- 2. Tabela mesa_garcom (atribuições)
CREATE TABLE public.mesa_garcom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL,
  mesa_id uuid NOT NULL,
  sessao_id uuid,
  garcom_id uuid NOT NULL REFERENCES public.garcons(id) ON DELETE RESTRICT,
  atribuido_em timestamptz NOT NULL DEFAULT now(),
  atribuido_por uuid,
  liberado_em timestamptz,
  liberado_por uuid
);

CREATE INDEX idx_mesa_garcom_mesa_ativa ON public.mesa_garcom(mesa_id) WHERE liberado_em IS NULL;
CREATE INDEX idx_mesa_garcom_garcom ON public.mesa_garcom(garcom_id);
CREATE INDEX idx_mesa_garcom_restaurante ON public.mesa_garcom(restaurante_id);
CREATE UNIQUE INDEX uq_mesa_garcom_ativo_por_mesa ON public.mesa_garcom(mesa_id) WHERE liberado_em IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mesa_garcom TO authenticated;
GRANT ALL ON public.mesa_garcom TO service_role;

ALTER TABLE public.mesa_garcom ENABLE ROW LEVEL SECURITY;

CREATE POLICY mesa_garcom_rw_membro ON public.mesa_garcom
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

-- 3. Adicionar garcom_id em pedidos
ALTER TABLE public.pedidos ADD COLUMN garcom_id uuid REFERENCES public.garcons(id) ON DELETE SET NULL;
CREATE INDEX idx_pedidos_garcom ON public.pedidos(garcom_id) WHERE garcom_id IS NOT NULL;

-- 4. Tabela comissoes
CREATE TABLE public.comissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL,
  garcom_id uuid NOT NULL REFERENCES public.garcons(id) ON DELETE RESTRICT,
  pedido_id uuid NOT NULL UNIQUE,
  valor_pedido numeric(10,2) NOT NULL,
  percentual numeric(5,2) NOT NULL,
  valor_comissao numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago')),
  calculado_em timestamptz NOT NULL DEFAULT now(),
  pago_em timestamptz,
  pago_por uuid
);

CREATE INDEX idx_comissoes_garcom_status ON public.comissoes(garcom_id, status);
CREATE INDEX idx_comissoes_restaurante_status ON public.comissoes(restaurante_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comissoes TO authenticated;
GRANT ALL ON public.comissoes TO service_role;

ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY comissoes_rw_membro ON public.comissoes
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.garcons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mesa_garcom;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comissoes;
