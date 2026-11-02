ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS delivery_taxa_por_bairro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_bairro_fora_lista text NOT NULL DEFAULT 'bloquear'
    CHECK (delivery_bairro_fora_lista IN ('bloquear','taxa_padrao'));

CREATE TABLE public.delivery_bairros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  nome_normalizado text NOT NULL,
  taxa numeric NOT NULL DEFAULT 0 CHECK (taxa >= 0),
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurante_id, nome_normalizado)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_bairros TO authenticated;
GRANT ALL ON public.delivery_bairros TO service_role;

ALTER TABLE public.delivery_bairros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros gerenciam bairros" ON public.delivery_bairros
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE TRIGGER delivery_bairros_touch BEFORE UPDATE ON public.delivery_bairros
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();