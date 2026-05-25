
-- Enum
CREATE TYPE public.chamado_status AS ENUM ('pendente', 'atendido', 'cancelado');

-- Tabela de tipos de chamado (configuráveis por restaurante)
CREATE TABLE public.tipos_chamado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL,
  nome text NOT NULL,
  icone text NOT NULL DEFAULT 'bell',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tipos_chamado_restaurante ON public.tipos_chamado(restaurante_id, ordem);

ALTER TABLE public.tipos_chamado ENABLE ROW LEVEL SECURITY;

CREATE POLICY tipos_chamado_select_public ON public.tipos_chamado
  FOR SELECT TO public USING (true);

CREATE POLICY tipos_chamado_write_membro ON public.tipos_chamado
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_tipos_chamado_atualizado
  BEFORE UPDATE ON public.tipos_chamado
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- Tabela de chamados
CREATE TABLE public.chamados_garcom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL,
  mesa_id uuid NOT NULL,
  comanda_id uuid,
  sessao_id uuid,
  cliente_id uuid,
  tipo_chamado_id uuid NOT NULL,
  status public.chamado_status NOT NULL DEFAULT 'pendente',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atendido_em timestamptz,
  atendido_por uuid,
  tempo_atendimento_segundos integer
);
CREATE INDEX idx_chamados_restaurante_status ON public.chamados_garcom(restaurante_id, status, criado_em DESC);
CREATE INDEX idx_chamados_mesa ON public.chamados_garcom(mesa_id, status);

ALTER TABLE public.chamados_garcom ENABLE ROW LEVEL SECURITY;

CREATE POLICY chamados_select_membro ON public.chamados_garcom
  FOR SELECT TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE POLICY chamados_update_membro ON public.chamados_garcom
  FOR UPDATE TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

-- Insert acontece via server function com service role (sem policy para anon/auth)

CREATE TRIGGER trg_chamados_atualizado
  BEFORE UPDATE ON public.chamados_garcom
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- Trigger para calcular tempo de atendimento e setar atendido_em
CREATE OR REPLACE FUNCTION public.chamado_calcular_atendimento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'atendido' AND OLD.status <> 'atendido' THEN
    NEW.atendido_em := COALESCE(NEW.atendido_em, now());
    NEW.tempo_atendimento_segundos := EXTRACT(EPOCH FROM (NEW.atendido_em - NEW.criado_em))::int;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chamado_calcular_atendimento
  BEFORE UPDATE ON public.chamados_garcom
  FOR EACH ROW EXECUTE FUNCTION public.chamado_calcular_atendimento();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chamados_garcom;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tipos_chamado;

-- Seed de tipos default para restaurantes existentes
INSERT INTO public.tipos_chamado (restaurante_id, nome, icone, ordem)
SELECT r.id, 'Chamar garçom', 'bell', 0 FROM public.restaurantes r;
INSERT INTO public.tipos_chamado (restaurante_id, nome, icone, ordem)
SELECT r.id, 'Pedir a conta', 'receipt', 1 FROM public.restaurantes r;

-- Trigger para popular tipos default ao criar restaurante
CREATE OR REPLACE FUNCTION public.seed_tipos_chamado_restaurante()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tipos_chamado (restaurante_id, nome, icone, ordem)
  VALUES
    (NEW.id, 'Chamar garçom', 'bell', 0),
    (NEW.id, 'Pedir a conta', 'receipt', 1);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_tipos_chamado
  AFTER INSERT ON public.restaurantes
  FOR EACH ROW EXECUTE FUNCTION public.seed_tipos_chamado_restaurante();

-- RPC de métricas
CREATE OR REPLACE FUNCTION public.metricas_chamados(_restaurante_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio_hoje timestamptz := date_trunc('day', now());
  v_pendentes int;
  v_atendidos_hoje int;
  v_tempo_medio numeric;
  v_por_hora jsonb;
BEGIN
  IF NOT (public.is_restaurante_membro(auth.uid(), _restaurante_id) OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT count(*) INTO v_pendentes
  FROM public.chamados_garcom
  WHERE restaurante_id = _restaurante_id AND status = 'pendente';

  SELECT count(*), COALESCE(AVG(tempo_atendimento_segundos), 0)
    INTO v_atendidos_hoje, v_tempo_medio
  FROM public.chamados_garcom
  WHERE restaurante_id = _restaurante_id
    AND status = 'atendido'
    AND atendido_em >= v_inicio_hoje;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('hora', hora, 'total', total) ORDER BY hora), '[]'::jsonb)
    INTO v_por_hora
  FROM (
    SELECT EXTRACT(HOUR FROM criado_em)::int AS hora, count(*)::int AS total
    FROM public.chamados_garcom
    WHERE restaurante_id = _restaurante_id
      AND criado_em >= v_inicio_hoje
    GROUP BY 1
  ) t;

  RETURN jsonb_build_object(
    'pendentes', v_pendentes,
    'atendidos_hoje', v_atendidos_hoje,
    'tempo_medio_segundos', round(v_tempo_medio)::int,
    'por_hora', v_por_hora
  );
END;
$$;
