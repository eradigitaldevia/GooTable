CREATE TABLE public.plataforma_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendas_whatsapp text,
  vendas_mensagem text,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plataforma_config TO anon;
GRANT SELECT ON public.plataforma_config TO authenticated;
GRANT ALL ON public.plataforma_config TO service_role;

ALTER TABLE public.plataforma_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Configuracao da plataforma e publica para leitura"
ON public.plataforma_config
FOR SELECT
USING (true);

CREATE POLICY "Platform admins podem inserir config da plataforma"
ON public.plataforma_config
FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins podem atualizar config da plataforma"
ON public.plataforma_config
FOR UPDATE
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_plataforma_config_touch
BEFORE UPDATE ON public.plataforma_config
FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

INSERT INTO public.plataforma_config (vendas_whatsapp, vendas_mensagem)
VALUES (NULL, 'Olá! Quero conhecer o sistema Mesa.');