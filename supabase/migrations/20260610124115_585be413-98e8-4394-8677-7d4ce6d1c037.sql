-- 1) Config no restaurante
ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS taxa_servico_repasse_habilitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS taxa_servico_repasse_percentual numeric(5,2) NULL
    CHECK (taxa_servico_repasse_percentual IS NULL OR (taxa_servico_repasse_percentual >= 0 AND taxa_servico_repasse_percentual <= 100));

-- 2) Tabela de repasses
CREATE TABLE IF NOT EXISTS public.comissoes_taxa_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  comanda_id uuid NOT NULL REFERENCES public.comandas(id) ON DELETE CASCADE,
  garcom_id uuid NOT NULL REFERENCES public.garcons(id) ON DELETE RESTRICT,
  valor_taxa_total numeric(10,2) NOT NULL CHECK (valor_taxa_total >= 0),
  percentual_repasse numeric(5,2) NOT NULL CHECK (percentual_repasse >= 0 AND percentual_repasse <= 100),
  peso numeric NOT NULL CHECK (peso >= 0),
  valor_repasse numeric(10,2) NOT NULL CHECK (valor_repasse >= 0),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago')),
  calculado_em timestamptz NOT NULL DEFAULT now(),
  pago_em timestamptz NULL,
  pago_por uuid NULL,
  CONSTRAINT comissoes_taxa_servico_comanda_garcom_unique UNIQUE (comanda_id, garcom_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comissoes_taxa_servico TO authenticated;
GRANT ALL ON public.comissoes_taxa_servico TO service_role;

ALTER TABLE public.comissoes_taxa_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comissoes_taxa_servico_rw_membro"
  ON public.comissoes_taxa_servico
  FOR ALL
  TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_comissoes_taxa_servico_restaurante_status
  ON public.comissoes_taxa_servico (restaurante_id, status);
CREATE INDEX IF NOT EXISTS idx_comissoes_taxa_servico_garcom_status
  ON public.comissoes_taxa_servico (garcom_id, status);

-- 3) Função e trigger no fechamento da comanda
CREATE OR REPLACE FUNCTION public.gerar_repasse_taxa_servico(p_comanda_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurante_id uuid;
  v_total numeric;
  v_total_pago numeric;
  v_taxa_hab boolean;
  v_taxa_perc numeric;
  v_repasse_hab boolean;
  v_repasse_perc numeric;
  v_taxa_total numeric;
  v_excedente numeric;
  v_taxa_paga numeric;
  v_valor_para_garcons numeric;
  v_peso_total numeric := 0;
  v_fallback_garcom uuid;
  r RECORD;
BEGIN
  -- Lock leve para evitar dupla execução concorrente
  SELECT c.restaurante_id, c.total, c.total_pago
    INTO v_restaurante_id, v_total, v_total_pago
  FROM public.comandas c
  WHERE c.id = p_comanda_id
  FOR UPDATE;

  IF v_restaurante_id IS NULL THEN RETURN; END IF;

  SELECT taxa_servico_habilitada, taxa_servico_percentual,
         taxa_servico_repasse_habilitado, taxa_servico_repasse_percentual
    INTO v_taxa_hab, v_taxa_perc, v_repasse_hab, v_repasse_perc
  FROM public.restaurantes WHERE id = v_restaurante_id;

  IF NOT COALESCE(v_taxa_hab, false) OR NOT COALESCE(v_repasse_hab, false) THEN
    RETURN;
  END IF;
  v_taxa_perc := COALESCE(v_taxa_perc, 0);
  v_repasse_perc := COALESCE(v_repasse_perc, 0);
  IF v_taxa_perc <= 0 OR v_repasse_perc <= 0 THEN RETURN; END IF;

  v_taxa_total := ROUND(COALESCE(v_total, 0) * v_taxa_perc / 100.0, 2);
  v_excedente := GREATEST(COALESCE(v_total_pago, 0) - COALESCE(v_total, 0), 0);
  v_taxa_paga := LEAST(v_taxa_total, v_excedente);
  IF v_taxa_paga <= 0 THEN RETURN; END IF;

  v_valor_para_garcons := ROUND(v_taxa_paga * v_repasse_perc / 100.0, 2);
  IF v_valor_para_garcons <= 0 THEN RETURN; END IF;

  -- Agrega pesos por garçom via pedidos da comanda
  CREATE TEMP TABLE tmp_pesos (garcom_id uuid PRIMARY KEY, peso numeric) ON COMMIT DROP;
  INSERT INTO tmp_pesos (garcom_id, peso)
  SELECT pg.garcom_id, SUM(pg.peso)
  FROM public.pedido_garcons pg
  JOIN public.pedidos p ON p.id = pg.pedido_id
  WHERE p.comanda_id = p_comanda_id
  GROUP BY pg.garcom_id;

  SELECT COALESCE(SUM(peso), 0) INTO v_peso_total FROM tmp_pesos;

  IF v_peso_total = 0 THEN
    -- Fallback: garçom ativo da mesa via sessão
    SELECT mg.garcom_id INTO v_fallback_garcom
    FROM public.mesa_garcom mg
    JOIN public.mesa_sessoes s ON s.mesa_id = mg.mesa_id
    JOIN public.comandas c ON c.sessao_id = s.id
    WHERE c.id = p_comanda_id
      AND mg.liberado_em IS NULL
    LIMIT 1;

    IF v_fallback_garcom IS NULL THEN RETURN; END IF;
    INSERT INTO tmp_pesos (garcom_id, peso) VALUES (v_fallback_garcom, 100);
    v_peso_total := 100;
  END IF;

  FOR r IN SELECT garcom_id, peso FROM tmp_pesos LOOP
    INSERT INTO public.comissoes_taxa_servico (
      restaurante_id, comanda_id, garcom_id,
      valor_taxa_total, percentual_repasse, peso, valor_repasse
    ) VALUES (
      v_restaurante_id, p_comanda_id, r.garcom_id,
      v_taxa_paga, v_repasse_perc, r.peso,
      ROUND(v_valor_para_garcons * r.peso / v_peso_total, 2)
    )
    ON CONFLICT (comanda_id, garcom_id) DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_comanda_repasse_taxa_servico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'fechada' AND OLD.status IS DISTINCT FROM 'fechada' THEN
    PERFORM public.gerar_repasse_taxa_servico(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comanda_repasse_taxa_servico ON public.comandas;
CREATE TRIGGER trg_comanda_repasse_taxa_servico
AFTER UPDATE OF status ON public.comandas
FOR EACH ROW
EXECUTE FUNCTION public.trg_comanda_repasse_taxa_servico();

-- 4) Atualiza pagar_comissoes para incluir comissoes_taxa_servico
CREATE OR REPLACE FUNCTION public.pagar_comissoes(_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count integer := 0;
  v_count_taxa integer := 0;
  v_restaurante_id uuid;
BEGIN
  IF _ids IS NULL OR array_length(_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_restaurante_id IN
    SELECT DISTINCT restaurante_id FROM public.comissoes WHERE id = ANY(_ids)
    UNION
    SELECT DISTINCT restaurante_id FROM public.comissoes_taxa_servico WHERE id = ANY(_ids)
  LOOP
    IF NOT (public.is_restaurante_membro(v_uid, v_restaurante_id) OR public.is_platform_admin(v_uid)) THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;
  END LOOP;

  UPDATE public.comissoes
  SET status = 'pago', pago_em = now(), pago_por = v_uid
  WHERE id = ANY(_ids) AND status = 'pendente';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.comissoes_taxa_servico
  SET status = 'pago', pago_em = now(), pago_por = v_uid
  WHERE id = ANY(_ids) AND status = 'pendente';
  GET DIAGNOSTICS v_count_taxa = ROW_COUNT;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  SELECT 'comissao', id, 'pagar', v_uid, jsonb_build_object('valor', valor_comissao)
  FROM public.comissoes WHERE id = ANY(_ids) AND status = 'pago' AND pago_por = v_uid;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  SELECT 'comissao_taxa_servico', id, 'pagar', v_uid, jsonb_build_object('valor', valor_repasse)
  FROM public.comissoes_taxa_servico WHERE id = ANY(_ids) AND status = 'pago' AND pago_por = v_uid;

  RETURN v_count + v_count_taxa;
END;
$$;