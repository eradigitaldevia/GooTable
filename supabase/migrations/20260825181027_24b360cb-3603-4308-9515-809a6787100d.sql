CREATE TABLE public.lgpd_cookies_consentimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitante_id uuid NOT NULL,
  versao text NOT NULL,
  essenciais boolean NOT NULL DEFAULT true,
  funcionais boolean NOT NULL DEFAULT false,
  analise boolean NOT NULL DEFAULT false,
  origem text NOT NULL DEFAULT 'landing',
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_lgpd_cookies_visitante ON public.lgpd_cookies_consentimentos (visitante_id, criado_em DESC);

GRANT ALL ON public.lgpd_cookies_consentimentos TO service_role;

ALTER TABLE public.lgpd_cookies_consentimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins podem ler consentimentos de cookies"
ON public.lgpd_cookies_consentimentos
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));