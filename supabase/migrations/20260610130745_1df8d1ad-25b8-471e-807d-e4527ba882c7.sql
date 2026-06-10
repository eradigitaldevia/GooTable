
-- =====================================================================
-- 1) Restaurantes: colunas de configuração do repasse
-- =====================================================================
ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS couvert_artistico_repasse_habilitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS couvert_artistico_repasse_percentual numeric(5,2);

-- =====================================================================
-- 2) Tabela artistas
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.artistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  documento text,
  chave_pix text,
  tipo_chave_pix text,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artistas_restaurante ON public.artistas(restaurante_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.artistas TO authenticated;
GRANT ALL ON public.artistas TO service_role;

ALTER TABLE public.artistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artistas_rw_membro" ON public.artistas
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE TRIGGER artistas_touch
  BEFORE UPDATE ON public.artistas
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- =====================================================================
-- 3) Tabela apresentacoes
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.apresentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  inicio_em timestamptz NOT NULL DEFAULT now(),
  fim_em timestamptz,
  encerrada_por uuid,
  criada_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apresentacoes_restaurante ON public.apresentacoes(restaurante_id);
-- 1 apresentação aberta por restaurante
CREATE UNIQUE INDEX IF NOT EXISTS uq_apresentacoes_aberta
  ON public.apresentacoes(restaurante_id) WHERE fim_em IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apresentacoes TO authenticated;
GRANT ALL ON public.apresentacoes TO service_role;

ALTER TABLE public.apresentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apresentacoes_rw_membro" ON public.apresentacoes
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE TRIGGER apresentacoes_touch
  BEFORE UPDATE ON public.apresentacoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- =====================================================================
-- 4) Tabela apresentacao_artistas (peso configurável)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.apresentacao_artistas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apresentacao_id uuid NOT NULL REFERENCES public.apresentacoes(id) ON DELETE CASCADE,
  artista_id uuid NOT NULL REFERENCES public.artistas(id) ON DELETE RESTRICT,
  peso numeric(5,2) NOT NULL DEFAULT 100,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apresentacao_id, artista_id)
);

CREATE INDEX IF NOT EXISTS idx_apres_artistas_apres ON public.apresentacao_artistas(apresentacao_id);
CREATE INDEX IF NOT EXISTS idx_apres_artistas_artista ON public.apresentacao_artistas(artista_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apresentacao_artistas TO authenticated;
GRANT ALL ON public.apresentacao_artistas TO service_role;

ALTER TABLE public.apresentacao_artistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apres_artistas_rw_membro" ON public.apresentacao_artistas
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.apresentacoes a
    WHERE a.id = apresentacao_id
      AND (public.is_restaurante_membro(auth.uid(), a.restaurante_id) OR public.is_platform_admin(auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.apresentacoes a
    WHERE a.id = apresentacao_id
      AND (public.is_restaurante_membro(auth.uid(), a.restaurante_id) OR public.is_platform_admin(auth.uid()))
  ));

-- =====================================================================
-- 5) comanda_couverts: coluna apresentacao_id + trigger
-- =====================================================================
ALTER TABLE public.comanda_couverts
  ADD COLUMN IF NOT EXISTS apresentacao_id uuid REFERENCES public.apresentacoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_comanda_couverts_apresentacao
  ON public.comanda_couverts(apresentacao_id) WHERE apresentacao_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.trg_comanda_couverts_set_apresentacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo = 'artistico' AND NEW.apresentacao_id IS NULL THEN
    SELECT id INTO NEW.apresentacao_id
    FROM public.apresentacoes
    WHERE restaurante_id = NEW.restaurante_id
      AND fim_em IS NULL
    ORDER BY inicio_em DESC
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comanda_couverts_set_apres ON public.comanda_couverts;
CREATE TRIGGER trg_comanda_couverts_set_apres
  BEFORE INSERT ON public.comanda_couverts
  FOR EACH ROW EXECUTE FUNCTION public.trg_comanda_couverts_set_apresentacao();

-- =====================================================================
-- 6) Tabela repasses_couvert_artistico
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.repasses_couvert_artistico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  apresentacao_id uuid NOT NULL REFERENCES public.apresentacoes(id) ON DELETE CASCADE,
  artista_id uuid NOT NULL REFERENCES public.artistas(id) ON DELETE RESTRICT,
  valor_couvert_total numeric(12,2) NOT NULL DEFAULT 0,
  percentual_repasse numeric(5,2) NOT NULL DEFAULT 100,
  peso numeric(5,2) NOT NULL DEFAULT 100,
  valor_repasse numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago')),
  calculado_em timestamptz NOT NULL DEFAULT now(),
  pago_em timestamptz,
  pago_por uuid,
  UNIQUE (apresentacao_id, artista_id)
);

CREATE INDEX IF NOT EXISTS idx_repcouv_restaurante ON public.repasses_couvert_artistico(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_repcouv_apresentacao ON public.repasses_couvert_artistico(apresentacao_id);
CREATE INDEX IF NOT EXISTS idx_repcouv_artista ON public.repasses_couvert_artistico(artista_id);
CREATE INDEX IF NOT EXISTS idx_repcouv_status ON public.repasses_couvert_artistico(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.repasses_couvert_artistico TO authenticated;
GRANT ALL ON public.repasses_couvert_artistico TO service_role;

ALTER TABLE public.repasses_couvert_artistico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repcouv_rw_membro" ON public.repasses_couvert_artistico
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

-- =====================================================================
-- 7) Função: gerar repasse no encerramento da apresentação
-- =====================================================================
CREATE OR REPLACE FUNCTION public.gerar_repasse_couvert_artistico(p_apresentacao_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_apres public.apresentacoes%ROWTYPE;
  v_hab boolean;
  v_perc numeric;
  v_total numeric := 0;
  v_a_repassar numeric;
  v_count int := 0;
  r record;
BEGIN
  SELECT * INTO v_apres FROM public.apresentacoes WHERE id = p_apresentacao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'apresentacao_invalida';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_apres.restaurante_id) OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT couvert_artistico_repasse_habilitado, couvert_artistico_repasse_percentual
    INTO v_hab, v_perc
  FROM public.restaurantes WHERE id = v_apres.restaurante_id;

  IF NOT COALESCE(v_hab, false) THEN
    RETURN 0;
  END IF;
  v_perc := COALESCE(v_perc, 100);

  SELECT COALESCE(SUM(quantidade * valor_unitario), 0) INTO v_total
  FROM public.comanda_couverts
  WHERE apresentacao_id = p_apresentacao_id AND tipo = 'artistico';

  v_a_repassar := round(v_total * v_perc / 100.0, 2);

  FOR r IN
    SELECT artista_id, peso FROM public.apresentacao_artistas WHERE apresentacao_id = p_apresentacao_id
  LOOP
    INSERT INTO public.repasses_couvert_artistico (
      restaurante_id, apresentacao_id, artista_id,
      valor_couvert_total, percentual_repasse, peso, valor_repasse, status
    ) VALUES (
      v_apres.restaurante_id, p_apresentacao_id, r.artista_id,
      v_total, v_perc, r.peso,
      round(v_a_repassar * r.peso / 100.0, 2),
      'pendente'
    )
    ON CONFLICT (apresentacao_id, artista_id) DO UPDATE
      SET valor_couvert_total = EXCLUDED.valor_couvert_total,
          percentual_repasse = EXCLUDED.percentual_repasse,
          peso = EXCLUDED.peso,
          valor_repasse = EXCLUDED.valor_repasse,
          calculado_em = now()
      WHERE public.repasses_couvert_artistico.status = 'pendente';
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- =====================================================================
-- 8) Função: marcar repasses como pagos
-- =====================================================================
CREATE OR REPLACE FUNCTION public.pagar_repasses_couvert_artistico(_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count int := 0;
  v_rid uuid;
BEGIN
  IF _ids IS NULL OR array_length(_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_rid IN
    SELECT DISTINCT restaurante_id FROM public.repasses_couvert_artistico WHERE id = ANY(_ids)
  LOOP
    IF NOT (public.is_restaurante_membro(v_uid, v_rid) OR public.is_platform_admin(v_uid)) THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
  END LOOP;

  UPDATE public.repasses_couvert_artistico
  SET status = 'pago', pago_em = now(), pago_por = v_uid
  WHERE id = ANY(_ids) AND status = 'pendente';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;
