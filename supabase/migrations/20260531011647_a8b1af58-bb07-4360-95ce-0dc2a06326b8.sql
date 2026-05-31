
-- 1) Extend enums
ALTER TYPE public.pagamento_metodo ADD VALUE IF NOT EXISTS 'cartao';
ALTER TYPE public.pagamento_metodo ADD VALUE IF NOT EXISTS 'fiado';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'caixa';

-- 2) Status enum for turnos
DO $$ BEGIN
  CREATE TYPE public.turno_caixa_status AS ENUM ('aberto','fechado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.movimento_caixa_tipo AS ENUM ('abertura','sangria','suprimento','fechamento');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Tables
CREATE TABLE public.turnos_caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL,
  operador_user_id uuid NOT NULL,
  operador_nome text NOT NULL,
  aberto_em timestamptz NOT NULL DEFAULT now(),
  fechado_em timestamptz,
  fundo_inicial numeric(12,2) NOT NULL DEFAULT 0,
  fundo_final numeric(12,2),
  contagem_fisica numeric(12,2),
  diferenca numeric(12,2),
  obs_fechamento text,
  status public.turno_caixa_status NOT NULL DEFAULT 'aberto',
  snapshot_total_vendas numeric(12,2),
  snapshot_total_dinheiro numeric(12,2),
  snapshot_total_cartao numeric(12,2),
  snapshot_total_pix numeric(12,2),
  snapshot_total_fiado numeric(12,2),
  snapshot_total_outro numeric(12,2),
  snapshot_total_sangrias numeric(12,2),
  snapshot_total_suprimentos numeric(12,2),
  snapshot_qtd_pedidos integer,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_turno_aberto_unico
  ON public.turnos_caixa(restaurante_id)
  WHERE status = 'aberto';

CREATE INDEX idx_turnos_caixa_restaurante ON public.turnos_caixa(restaurante_id, aberto_em DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.turnos_caixa TO authenticated;
GRANT ALL ON public.turnos_caixa TO service_role;

ALTER TABLE public.turnos_caixa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "turnos_caixa_rw_membro" ON public.turnos_caixa
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_turnos_caixa_touch
  BEFORE UPDATE ON public.turnos_caixa
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

CREATE TABLE public.movimentos_caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id uuid NOT NULL REFERENCES public.turnos_caixa(id) ON DELETE CASCADE,
  restaurante_id uuid NOT NULL,
  tipo public.movimento_caixa_tipo NOT NULL,
  valor numeric(12,2) NOT NULL,
  motivo text,
  operador_user_id uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_movimentos_caixa_turno ON public.movimentos_caixa(turno_id, criado_em);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentos_caixa TO authenticated;
GRANT ALL ON public.movimentos_caixa TO service_role;

ALTER TABLE public.movimentos_caixa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movimentos_caixa_rw_membro" ON public.movimentos_caixa
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

-- 4) Helper: pode operar caixa (admin/caixa do restaurante OU platform admin)
CREATE OR REPLACE FUNCTION public.pode_operar_caixa(_user_id uuid, _restaurante_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_platform_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.restaurante_membros
    WHERE user_id = _user_id
      AND restaurante_id = _restaurante_id
      AND papel::text IN ('admin','caixa')
  );
$$;

-- 5) Totais (usa cast text para os novos valores do enum funcionarem na mesma migração)
CREATE OR REPLACE FUNCTION public.totais_turno_caixa(_turno_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_turno public.turnos_caixa%ROWTYPE;
  v_fim timestamptz;
  v_total_dinheiro numeric := 0;
  v_total_cartao numeric := 0;
  v_total_pix numeric := 0;
  v_total_fiado numeric := 0;
  v_total_outro numeric := 0;
  v_total_vendas numeric := 0;
  v_total_sangrias numeric := 0;
  v_total_suprimentos numeric := 0;
  v_qtd_pedidos int := 0;
  v_saldo_esperado numeric := 0;
BEGIN
  SELECT * INTO v_turno FROM public.turnos_caixa WHERE id = _turno_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'turno_nao_encontrado';
  END IF;

  IF NOT (public.is_restaurante_membro(auth.uid(), v_turno.restaurante_id) OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;

  v_fim := COALESCE(v_turno.fechado_em, now());

  SELECT
    COALESCE(SUM(valor) FILTER (WHERE metodo::text = 'dinheiro'), 0),
    COALESCE(SUM(valor) FILTER (WHERE metodo::text = 'cartao'), 0),
    COALESCE(SUM(valor) FILTER (WHERE metodo::text = 'pix'), 0),
    COALESCE(SUM(valor) FILTER (WHERE metodo::text = 'fiado'), 0),
    COALESCE(SUM(valor) FILTER (WHERE metodo::text = 'outro'), 0),
    COALESCE(SUM(valor), 0),
    COUNT(DISTINCT comanda_id)
  INTO v_total_dinheiro, v_total_cartao, v_total_pix, v_total_fiado, v_total_outro, v_total_vendas, v_qtd_pedidos
  FROM public.pagamentos
  WHERE restaurante_id = v_turno.restaurante_id
    AND status = 'confirmado'
    AND confirmado_em IS NOT NULL
    AND confirmado_em >= v_turno.aberto_em
    AND confirmado_em <= v_fim;

  SELECT
    COALESCE(SUM(valor) FILTER (WHERE tipo = 'sangria'), 0),
    COALESCE(SUM(valor) FILTER (WHERE tipo = 'suprimento'), 0)
  INTO v_total_sangrias, v_total_suprimentos
  FROM public.movimentos_caixa
  WHERE turno_id = _turno_id;

  v_saldo_esperado := COALESCE(v_turno.fundo_inicial,0) + v_total_dinheiro + v_total_suprimentos - v_total_sangrias;

  RETURN jsonb_build_object(
    'fundo_inicial', v_turno.fundo_inicial,
    'total_vendas', v_total_vendas,
    'total_dinheiro', v_total_dinheiro,
    'total_cartao', v_total_cartao,
    'total_pix', v_total_pix,
    'total_fiado', v_total_fiado,
    'total_outro', v_total_outro,
    'total_sangrias', v_total_sangrias,
    'total_suprimentos', v_total_suprimentos,
    'qtd_pedidos', v_qtd_pedidos,
    'saldo_esperado', v_saldo_esperado
  );
END;
$$;

-- 6) Abrir turno
CREATE OR REPLACE FUNCTION public.abrir_turno_caixa(_restaurante_id uuid, _operador_nome text, _fundo_inicial numeric)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF NOT public.pode_operar_caixa(v_uid, _restaurante_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  IF COALESCE(_fundo_inicial,0) < 0 THEN
    RAISE EXCEPTION 'fundo_inicial_invalido';
  END IF;
  IF NULLIF(btrim(_operador_nome),'') IS NULL THEN
    RAISE EXCEPTION 'operador_obrigatorio';
  END IF;

  INSERT INTO public.turnos_caixa (restaurante_id, operador_user_id, operador_nome, fundo_inicial)
  VALUES (_restaurante_id, v_uid, btrim(_operador_nome), _fundo_inicial)
  RETURNING id INTO v_id;

  INSERT INTO public.movimentos_caixa (turno_id, restaurante_id, tipo, valor, motivo, operador_user_id)
  VALUES (v_id, _restaurante_id, 'abertura', _fundo_inicial, 'Fundo inicial', v_uid);

  RETURN v_id;
END;
$$;

-- 7) Registrar movimento
CREATE OR REPLACE FUNCTION public.registrar_movimento_caixa(_turno_id uuid, _tipo public.movimento_caixa_tipo, _valor numeric, _motivo text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_turno public.turnos_caixa%ROWTYPE;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT * INTO v_turno FROM public.turnos_caixa WHERE id = _turno_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'turno_nao_encontrado'; END IF;
  IF v_turno.status <> 'aberto' THEN RAISE EXCEPTION 'turno_nao_aberto'; END IF;
  IF NOT public.pode_operar_caixa(v_uid, v_turno.restaurante_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  IF _tipo NOT IN ('sangria','suprimento') THEN
    RAISE EXCEPTION 'tipo_invalido';
  END IF;
  IF COALESCE(_valor,0) <= 0 THEN
    RAISE EXCEPTION 'valor_invalido';
  END IF;

  INSERT INTO public.movimentos_caixa (turno_id, restaurante_id, tipo, valor, motivo, operador_user_id)
  VALUES (_turno_id, v_turno.restaurante_id, _tipo, _valor, NULLIF(btrim(COALESCE(_motivo,'')),''), v_uid)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 8) Fechar turno
CREATE OR REPLACE FUNCTION public.fechar_turno_caixa(_turno_id uuid, _contagem_fisica numeric, _fundo_final numeric, _obs text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_turno public.turnos_caixa%ROWTYPE;
  v_totais jsonb;
  v_saldo_esperado numeric;
  v_diferenca numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT * INTO v_turno FROM public.turnos_caixa WHERE id = _turno_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'turno_nao_encontrado'; END IF;
  IF v_turno.status <> 'aberto' THEN RAISE EXCEPTION 'turno_nao_aberto'; END IF;
  IF NOT public.pode_operar_caixa(v_uid, v_turno.restaurante_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;

  -- Atualiza fechado_em primeiro para que totais usem o intervalo correto
  UPDATE public.turnos_caixa SET fechado_em = now() WHERE id = _turno_id;
  SELECT * INTO v_turno FROM public.turnos_caixa WHERE id = _turno_id;

  v_totais := public.totais_turno_caixa(_turno_id);
  v_saldo_esperado := (v_totais->>'saldo_esperado')::numeric;
  v_diferenca := COALESCE(_contagem_fisica,0) - v_saldo_esperado;

  UPDATE public.turnos_caixa
  SET status = 'fechado',
      fundo_final = _fundo_final,
      contagem_fisica = _contagem_fisica,
      diferenca = v_diferenca,
      obs_fechamento = NULLIF(btrim(COALESCE(_obs,'')),''),
      snapshot_total_vendas = (v_totais->>'total_vendas')::numeric,
      snapshot_total_dinheiro = (v_totais->>'total_dinheiro')::numeric,
      snapshot_total_cartao = (v_totais->>'total_cartao')::numeric,
      snapshot_total_pix = (v_totais->>'total_pix')::numeric,
      snapshot_total_fiado = (v_totais->>'total_fiado')::numeric,
      snapshot_total_outro = (v_totais->>'total_outro')::numeric,
      snapshot_total_sangrias = (v_totais->>'total_sangrias')::numeric,
      snapshot_total_suprimentos = (v_totais->>'total_suprimentos')::numeric,
      snapshot_qtd_pedidos = (v_totais->>'qtd_pedidos')::int
  WHERE id = _turno_id;

  INSERT INTO public.movimentos_caixa (turno_id, restaurante_id, tipo, valor, motivo, operador_user_id)
  VALUES (_turno_id, v_turno.restaurante_id, 'fechamento', COALESCE(_contagem_fisica,0), 'Fechamento do turno', v_uid);

  RETURN jsonb_build_object('diferenca', v_diferenca, 'totais', v_totais);
END;
$$;
