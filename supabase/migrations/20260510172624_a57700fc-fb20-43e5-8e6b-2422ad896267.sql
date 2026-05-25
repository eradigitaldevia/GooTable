
-- =========================================================
-- FASE 0 — Fundação: Clientes, Sessões, Comandas, Cashback, Fidelidade
-- =========================================================

-- ---------- ENUMs ----------
DO $$ BEGIN
  CREATE TYPE public.mesa_sessao_status AS ENUM ('aberta','fechada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.comanda_tipo AS ENUM ('individual','compartilhada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.comanda_status AS ENUM ('aberta','fechada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cashback_movimento_tipo AS ENUM ('credito','resgate','ajuste','expiracao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.campanha_canal AS ENUM ('whatsapp','email','sms');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.campanha_status AS ENUM ('rascunho','agendada','enviando','enviada','cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- clientes ----------
CREATE TABLE public.clientes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurante_id uuid NOT NULL,
  nome text NOT NULL,
  telefone text NOT NULL,
  cashback_saldo numeric(12,2) NOT NULL DEFAULT 0,
  total_gasto numeric(12,2) NOT NULL DEFAULT 0,
  pedidos_count integer NOT NULL DEFAULT 0,
  ultima_visita timestamptz,
  ticket_medio numeric(12,2) NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clientes_telefone_unico_por_restaurante UNIQUE (restaurante_id, telefone)
);
CREATE INDEX idx_clientes_restaurante ON public.clientes(restaurante_id);
CREATE INDEX idx_clientes_telefone ON public.clientes(restaurante_id, telefone);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY clientes_rw_membro ON public.clientes
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_clientes_touch
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- ---------- mesa_sessoes ----------
CREATE TABLE public.mesa_sessoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mesa_id uuid NOT NULL,
  restaurante_id uuid NOT NULL,
  status public.mesa_sessao_status NOT NULL DEFAULT 'aberta',
  aberta_em timestamptz NOT NULL DEFAULT now(),
  fechada_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mesa_sessoes_mesa ON public.mesa_sessoes(mesa_id);
CREATE INDEX idx_mesa_sessoes_restaurante ON public.mesa_sessoes(restaurante_id);
CREATE UNIQUE INDEX uq_mesa_sessao_aberta_por_mesa
  ON public.mesa_sessoes(mesa_id) WHERE status = 'aberta';

ALTER TABLE public.mesa_sessoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY mesa_sessoes_rw_membro ON public.mesa_sessoes
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_mesa_sessoes_touch
  BEFORE UPDATE ON public.mesa_sessoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- ---------- comandas ----------
CREATE TABLE public.comandas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id uuid NOT NULL REFERENCES public.mesa_sessoes(id) ON DELETE CASCADE,
  restaurante_id uuid NOT NULL,
  tipo public.comanda_tipo NOT NULL DEFAULT 'individual',
  titular_cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  cashback_resgatado numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  status public.comanda_status NOT NULL DEFAULT 'aberta',
  fechada_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comandas_sessao ON public.comandas(sessao_id);
CREATE INDEX idx_comandas_restaurante ON public.comandas(restaurante_id);
CREATE INDEX idx_comandas_titular ON public.comandas(titular_cliente_id);

ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;

CREATE POLICY comandas_rw_membro ON public.comandas
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_comandas_touch
  BEFORE UPDATE ON public.comandas
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- ---------- mesa_sessao_clientes ----------
CREATE TABLE public.mesa_sessao_clientes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id uuid NOT NULL REFERENCES public.mesa_sessoes(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  comanda_id uuid REFERENCES public.comandas(id) ON DELETE SET NULL,
  entrou_em timestamptz NOT NULL DEFAULT now(),
  saiu_em timestamptz,
  CONSTRAINT mesa_sessao_clientes_unico UNIQUE (sessao_id, cliente_id)
);
CREATE INDEX idx_mesa_sessao_clientes_sessao ON public.mesa_sessao_clientes(sessao_id);
CREATE INDEX idx_mesa_sessao_clientes_cliente ON public.mesa_sessao_clientes(cliente_id);
CREATE INDEX idx_mesa_sessao_clientes_comanda ON public.mesa_sessao_clientes(comanda_id);

ALTER TABLE public.mesa_sessao_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY mesa_sessao_clientes_rw_membro ON public.mesa_sessao_clientes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mesa_sessoes s
      WHERE s.id = mesa_sessao_clientes.sessao_id
        AND (public.is_restaurante_membro(auth.uid(), s.restaurante_id) OR public.is_platform_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mesa_sessoes s
      WHERE s.id = mesa_sessao_clientes.sessao_id
        AND (public.is_restaurante_membro(auth.uid(), s.restaurante_id) OR public.is_platform_admin(auth.uid()))
    )
  );

-- ---------- cashback_movimentos ----------
CREATE TABLE public.cashback_movimentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  restaurante_id uuid NOT NULL,
  tipo public.cashback_movimento_tipo NOT NULL,
  valor numeric(12,2) NOT NULL,
  pedido_id uuid,
  comanda_id uuid REFERENCES public.comandas(id) ON DELETE SET NULL,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cashback_cliente ON public.cashback_movimentos(cliente_id);
CREATE INDEX idx_cashback_restaurante ON public.cashback_movimentos(restaurante_id);
CREATE INDEX idx_cashback_pedido ON public.cashback_movimentos(pedido_id);
CREATE UNIQUE INDEX uq_cashback_credito_por_pedido
  ON public.cashback_movimentos(pedido_id, cliente_id) WHERE tipo = 'credito';

ALTER TABLE public.cashback_movimentos ENABLE ROW LEVEL SECURITY;

-- Apenas leitura por membros; escrita ficará restrita a funções de servidor (service role).
CREATE POLICY cashback_select_membro ON public.cashback_movimentos
  FOR SELECT TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

-- ---------- programa_fidelidade ----------
CREATE TABLE public.programa_fidelidade (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurante_id uuid NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT false,
  percentual_cashback numeric(5,2) NOT NULL DEFAULT 0,
  percentual_max_resgate numeric(5,2) NOT NULL DEFAULT 100,
  validade_dias integer NOT NULL DEFAULT 0,
  valor_minimo_pedido numeric(12,2) NOT NULL DEFAULT 0,
  regras_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.programa_fidelidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY programa_fidelidade_select_public ON public.programa_fidelidade
  FOR SELECT TO public USING (true);

CREATE POLICY programa_fidelidade_rw_membro ON public.programa_fidelidade
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_programa_fidelidade_touch
  BEFORE UPDATE ON public.programa_fidelidade
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- ---------- cupons (reserva roadmap) ----------
CREATE TABLE public.cupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurante_id uuid NOT NULL,
  codigo text NOT NULL,
  tipo text NOT NULL DEFAULT 'percentual',
  valor numeric(12,2) NOT NULL DEFAULT 0,
  validade_inicio timestamptz,
  validade_fim timestamptz,
  uso_max integer,
  uso_atual integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  regras_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cupons_codigo_unico_por_restaurante UNIQUE (restaurante_id, codigo)
);
ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY cupons_rw_membro ON public.cupons
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));
CREATE TRIGGER trg_cupons_touch
  BEFORE UPDATE ON public.cupons
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- ---------- campanhas (reserva roadmap) ----------
CREATE TABLE public.campanhas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurante_id uuid NOT NULL,
  nome text NOT NULL,
  canal public.campanha_canal NOT NULL,
  status public.campanha_status NOT NULL DEFAULT 'rascunho',
  segmento_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  template_id text,
  conteudo_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  agendada_para timestamptz,
  enviada_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY campanhas_rw_membro ON public.campanhas
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));
CREATE TRIGGER trg_campanhas_touch
  BEFORE UPDATE ON public.campanhas
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- ---------- ia_eventos (reserva roadmap) ----------
CREATE TABLE public.ia_eventos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurante_id uuid NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  payload_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ia_eventos_restaurante ON public.ia_eventos(restaurante_id);
CREATE INDEX idx_ia_eventos_cliente ON public.ia_eventos(cliente_id);
ALTER TABLE public.ia_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY ia_eventos_select_membro ON public.ia_eventos
  FOR SELECT TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

-- ---------- alterações aditivas em pedidos / pedido_itens ----------
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comanda_id uuid REFERENCES public.comandas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sessao_id uuid REFERENCES public.mesa_sessoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cashback_gerado numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashback_resgatado numeric(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_comanda ON public.pedidos(comanda_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_sessao ON public.pedidos(sessao_id);

ALTER TABLE public.pedido_itens
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pedido_itens_cliente ON public.pedido_itens(cliente_id);
