
-- ====== Enums ======
DO $$ BEGIN
  CREATE TYPE public.garcom_meta_tipo AS ENUM ('faturamento','pedidos','horario');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.garcom_meta_periodo AS ENUM ('diario','semanal','mensal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.garcom_bonus_status AS ENUM ('pendente','pago');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ====== Tabela: garcom_metas ======
CREATE TABLE IF NOT EXISTS public.garcom_metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL,
  garcom_id uuid NOT NULL,
  nome text NOT NULL,
  tipo public.garcom_meta_tipo NOT NULL,
  periodo public.garcom_meta_periodo NOT NULL DEFAULT 'mensal',
  alvo numeric NOT NULL DEFAULT 0,
  bonus_valor numeric NOT NULL DEFAULT 0,
  bonus_percentual numeric NOT NULL DEFAULT 0,
  regras_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  vigencia_inicio date,
  vigencia_fim date,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.garcom_metas TO authenticated;
GRANT ALL ON public.garcom_metas TO service_role;

ALTER TABLE public.garcom_metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "garcom_metas_rw_membro"
ON public.garcom_metas
FOR ALL
TO authenticated
USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_garcom_metas_touch
BEFORE UPDATE ON public.garcom_metas
FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

CREATE INDEX IF NOT EXISTS idx_garcom_metas_garcom ON public.garcom_metas(garcom_id);
CREATE INDEX IF NOT EXISTS idx_garcom_metas_restaurante ON public.garcom_metas(restaurante_id);

-- ====== Tabela: garcom_bonus ======
CREATE TABLE IF NOT EXISTS public.garcom_bonus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL,
  garcom_id uuid NOT NULL,
  meta_id uuid NOT NULL,
  periodo_ref date NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  detalhe_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.garcom_bonus_status NOT NULL DEFAULT 'pendente',
  calculado_em timestamptz NOT NULL DEFAULT now(),
  pago_em timestamptz,
  pago_por uuid,
  UNIQUE (meta_id, periodo_ref)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.garcom_bonus TO authenticated;
GRANT ALL ON public.garcom_bonus TO service_role;

ALTER TABLE public.garcom_bonus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "garcom_bonus_rw_membro"
ON public.garcom_bonus
FOR ALL
TO authenticated
USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_garcom_bonus_garcom ON public.garcom_bonus(garcom_id);
CREATE INDEX IF NOT EXISTS idx_garcom_bonus_restaurante ON public.garcom_bonus(restaurante_id);

-- ====== Função auxiliar: range do período ======
CREATE OR REPLACE FUNCTION public.periodo_range(_periodo public.garcom_meta_periodo, _ref date)
RETURNS TABLE(inicio timestamptz, fim timestamptz)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF _periodo = 'diario' THEN
    inicio := _ref::timestamptz;
    fim := (_ref + interval '1 day')::timestamptz;
  ELSIF _periodo = 'semanal' THEN
    inicio := date_trunc('week', _ref::timestamptz);
    fim := inicio + interval '7 days';
  ELSE
    inicio := date_trunc('month', _ref::timestamptz);
    fim := inicio + interval '1 month';
  END IF;
  RETURN NEXT;
END; $$;

-- ====== Função: calcular_bonus_garcom ======
CREATE OR REPLACE FUNCTION public.calcular_bonus_garcom(_meta_id uuid, _periodo_ref date)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_meta public.garcom_metas%ROWTYPE;
  v_range record;
  v_valor numeric := 0;
  v_base numeric := 0;
  v_contagem int := 0;
  v_hora_ini int;
  v_hora_fim int;
  v_dias int[];
BEGIN
  SELECT * INTO v_meta FROM public.garcom_metas WHERE id = _meta_id;
  IF NOT FOUND OR NOT v_meta.ativo THEN
    RETURN 0;
  END IF;

  IF v_meta.vigencia_inicio IS NOT NULL AND _periodo_ref < v_meta.vigencia_inicio THEN RETURN 0; END IF;
  IF v_meta.vigencia_fim IS NOT NULL AND _periodo_ref > v_meta.vigencia_fim THEN RETURN 0; END IF;

  SELECT * INTO v_range FROM public.periodo_range(v_meta.periodo, _periodo_ref);

  IF v_meta.tipo = 'faturamento' THEN
    SELECT COALESCE(SUM(p.total), 0) INTO v_base
    FROM public.pedidos p
    WHERE p.restaurante_id = v_meta.restaurante_id
      AND p.status = 'entregue'
      AND p.criado_em >= v_range.inicio
      AND p.criado_em < v_range.fim
      AND (p.garcom_id = v_meta.garcom_id
           OR EXISTS (SELECT 1 FROM public.pedido_garcons pg
                      WHERE pg.pedido_id = p.id AND pg.garcom_id = v_meta.garcom_id));
    IF v_base >= v_meta.alvo AND v_meta.alvo > 0 THEN
      v_valor := COALESCE(v_meta.bonus_valor, 0) + round(v_base * COALESCE(v_meta.bonus_percentual,0) / 100.0, 2);
    END IF;
  ELSIF v_meta.tipo = 'pedidos' THEN
    SELECT COUNT(*) INTO v_contagem
    FROM public.pedidos p
    WHERE p.restaurante_id = v_meta.restaurante_id
      AND p.status = 'entregue'
      AND p.criado_em >= v_range.inicio
      AND p.criado_em < v_range.fim
      AND (p.garcom_id = v_meta.garcom_id
           OR EXISTS (SELECT 1 FROM public.pedido_garcons pg
                      WHERE pg.pedido_id = p.id AND pg.garcom_id = v_meta.garcom_id));
    IF v_contagem >= v_meta.alvo AND v_meta.alvo > 0 THEN
      v_valor := COALESCE(v_meta.bonus_valor, 0);
    END IF;
  ELSIF v_meta.tipo = 'horario' THEN
    v_hora_ini := COALESCE((v_meta.regras_json->>'hora_inicio')::int, 0);
    v_hora_fim := COALESCE((v_meta.regras_json->>'hora_fim')::int, 24);
    v_dias := CASE WHEN v_meta.regras_json ? 'dias_semana'
                   THEN ARRAY(SELECT jsonb_array_elements_text(v_meta.regras_json->'dias_semana')::int)
                   ELSE NULL END;

    SELECT COALESCE(SUM(c.valor_comissao), 0) INTO v_base
    FROM public.comissoes c
    JOIN public.pedidos p ON p.id = c.pedido_id
    WHERE c.restaurante_id = v_meta.restaurante_id
      AND c.garcom_id = v_meta.garcom_id
      AND p.criado_em >= v_range.inicio
      AND p.criado_em < v_range.fim
      AND EXTRACT(HOUR FROM p.criado_em)::int >= v_hora_ini
      AND EXTRACT(HOUR FROM p.criado_em)::int < v_hora_fim
      AND (v_dias IS NULL OR EXTRACT(DOW FROM p.criado_em)::int = ANY(v_dias));

    v_valor := round(v_base * COALESCE(v_meta.bonus_percentual,0) / 100.0, 2)
             + COALESCE(v_meta.bonus_valor, 0) * (CASE WHEN v_base > 0 THEN 1 ELSE 0 END);
  END IF;

  v_valor := COALESCE(v_valor, 0);

  IF v_valor > 0 THEN
    INSERT INTO public.garcom_bonus (restaurante_id, garcom_id, meta_id, periodo_ref, valor, detalhe_json)
    VALUES (v_meta.restaurante_id, v_meta.garcom_id, v_meta.id, _periodo_ref, v_valor,
            jsonb_build_object('base', v_base, 'contagem', v_contagem))
    ON CONFLICT (meta_id, periodo_ref) DO UPDATE
      SET valor = EXCLUDED.valor,
          detalhe_json = EXCLUDED.detalhe_json,
          calculado_em = now()
      WHERE public.garcom_bonus.status = 'pendente';
  END IF;

  RETURN v_valor;
END; $$;

-- ====== Função: calcular_bonus_restaurante ======
CREATE OR REPLACE FUNCTION public.calcular_bonus_restaurante(_restaurante_id uuid, _periodo_ref date DEFAULT CURRENT_DATE)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count int := 0;
  v_meta record;
BEGIN
  IF NOT (public.is_restaurante_membro(v_uid, _restaurante_id) OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  FOR v_meta IN
    SELECT id FROM public.garcom_metas
    WHERE restaurante_id = _restaurante_id AND ativo = true
  LOOP
    PERFORM public.calcular_bonus_garcom(v_meta.id, _periodo_ref);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END; $$;

-- ====== Função: pagar_bonus ======
CREATE OR REPLACE FUNCTION public.pagar_bonus(_ids uuid[])
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count int := 0;
  v_rid uuid;
BEGIN
  IF _ids IS NULL OR array_length(_ids,1) IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_rid IN
    SELECT DISTINCT restaurante_id FROM public.garcom_bonus WHERE id = ANY(_ids)
  LOOP
    IF NOT (public.is_restaurante_membro(v_uid, v_rid) OR public.is_platform_admin(v_uid)) THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;
  END LOOP;

  UPDATE public.garcom_bonus
  SET status = 'pago', pago_em = now(), pago_por = v_uid
  WHERE id = ANY(_ids) AND status = 'pendente';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END; $$;
