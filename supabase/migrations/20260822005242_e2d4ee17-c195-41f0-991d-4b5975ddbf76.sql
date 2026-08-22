CREATE TABLE public.identificacao_tentativas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  qr_token text NOT NULL,
  telefone_hash text NOT NULL,
  ip_hash text,
  sucesso boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ident_tent_qr ON public.identificacao_tentativas (restaurante_id, qr_token, criado_em DESC);
CREATE INDEX idx_ident_tent_tel ON public.identificacao_tentativas (restaurante_id, telefone_hash, criado_em DESC);

GRANT SELECT ON public.identificacao_tentativas TO authenticated;
GRANT ALL ON public.identificacao_tentativas TO service_role;

ALTER TABLE public.identificacao_tentativas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros do restaurante podem ver tentativas"
ON public.identificacao_tentativas
FOR SELECT
TO authenticated
USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));