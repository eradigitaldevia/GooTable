CREATE TABLE public.lgpd_consentimentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escopo text NOT NULL,
  entidade_tipo text NOT NULL CHECK (entidade_tipo IN ('restaurante','cliente')),
  entidade_id uuid NOT NULL,
  versao text NOT NULL DEFAULT 'v1.0',
  aceito_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lgpd_consentimentos_entidade ON public.lgpd_consentimentos (entidade_tipo, entidade_id);

GRANT SELECT ON public.lgpd_consentimentos TO authenticated;
GRANT ALL ON public.lgpd_consentimentos TO service_role;

ALTER TABLE public.lgpd_consentimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros leem consentimento do proprio restaurante"
ON public.lgpd_consentimentos FOR SELECT TO authenticated
USING (
  entidade_tipo = 'restaurante'
  AND public.is_restaurante_membro(auth.uid(), entidade_id)
);

CREATE TABLE public.lgpd_solicitacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL CHECK (tipo IN ('exclusao','consulta','retificacao','oposicao')),
  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  mensagem text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_analise','concluida','rejeitada')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.lgpd_solicitacoes TO service_role;

ALTER TABLE public.lgpd_solicitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Somente plataforma le solicitacoes"
ON public.lgpd_solicitacoes FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_lgpd_solicitacoes_touch
BEFORE UPDATE ON public.lgpd_solicitacoes
FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();