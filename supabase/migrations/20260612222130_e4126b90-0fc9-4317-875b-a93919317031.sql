
-- 1) Add 'cumim' role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cumim';

-- 2) Cumins table (own entity, like garcons but no commission)
CREATE TABLE public.cumins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id  uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id),
  nome            text NOT NULL,
  telefone        text,
  ativo           boolean NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cumins_restaurante ON public.cumins(restaurante_id) WHERE ativo;
CREATE UNIQUE INDEX uq_cumins_user_id ON public.cumins(user_id) WHERE user_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cumins TO authenticated;
GRANT ALL ON public.cumins TO service_role;

ALTER TABLE public.cumins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cumins_rw_membro" ON public.cumins
  TO authenticated
  USING (
    public.is_restaurante_membro(auth.uid(), restaurante_id)
    OR public.is_platform_admin(auth.uid())
  )
  WITH CHECK (
    public.is_restaurante_membro(auth.uid(), restaurante_id)
    OR public.is_platform_admin(auth.uid())
  );

CREATE TRIGGER trg_cumins_touch
  BEFORE UPDATE ON public.cumins
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

ALTER PUBLICATION supabase_realtime ADD TABLE public.cumins;

-- 3) Delivery tracking on pedidos
ALTER TABLE public.pedidos
  ADD COLUMN entregue_por_cumim_id  uuid REFERENCES public.cumins(id),
  ADD COLUMN entregue_por_garcom_id uuid REFERENCES public.garcons(id),
  ADD COLUMN entregue_em            timestamptz;

CREATE INDEX idx_pedidos_entregue_cumim
  ON public.pedidos(restaurante_id, entregue_por_cumim_id)
  WHERE entregue_por_cumim_id IS NOT NULL;
CREATE INDEX idx_pedidos_entregue_garcom_runner
  ON public.pedidos(restaurante_id, entregue_por_garcom_id)
  WHERE entregue_por_garcom_id IS NOT NULL;

-- 4) Feature flag on restaurantes
ALTER TABLE public.restaurantes
  ADD COLUMN usa_cumim boolean NOT NULL DEFAULT false;
