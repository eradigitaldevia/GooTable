-- Fase 1 do módulo Caixa: auditoria de eventos do turno
CREATE TABLE public.caixa_eventos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurante_id uuid NOT NULL,
  turno_id uuid NOT NULL,
  tipo text NOT NULL CHECK (
    tipo IN ('abrir','sangria','suprimento','pagamento_confirmado','fechar','assumir','aviso_teto')
  ),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ator_user_id uuid NULL,
  ator_nome text NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX caixa_eventos_turno_idx ON public.caixa_eventos (turno_id, criado_em);
CREATE INDEX caixa_eventos_restaurante_idx ON public.caixa_eventos (restaurante_id, criado_em DESC);

GRANT SELECT, INSERT ON public.caixa_eventos TO authenticated;
GRANT ALL ON public.caixa_eventos TO service_role;

ALTER TABLE public.caixa_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY caixa_eventos_select_membro
  ON public.caixa_eventos
  FOR SELECT
  TO authenticated
  USING (
    is_restaurante_membro(auth.uid(), restaurante_id)
    OR is_platform_admin(auth.uid())
  );

-- Membros do restaurante podem inserir; platform_admin NÃO (super-admin não muta caixa).
CREATE POLICY caixa_eventos_insert_membro
  ON public.caixa_eventos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_restaurante_membro(auth.uid(), restaurante_id)
  );