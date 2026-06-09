-- Taxa de serviço (configuração no restaurante)
ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS taxa_servico_habilitada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS taxa_servico_percentual numeric(5,2) NULL,
  ADD COLUMN IF NOT EXISTS taxa_servico_descricao text NULL,
  ADD COLUMN IF NOT EXISTS couvert_mesa_habilitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS couvert_mesa_valor numeric(10,2) NULL,
  ADD COLUMN IF NOT EXISTS couvert_mesa_descricao text NULL,
  ADD COLUMN IF NOT EXISTS couvert_artistico_habilitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS couvert_artistico_valor numeric(10,2) NULL,
  ADD COLUMN IF NOT EXISTS couvert_artistico_descricao text NULL;

ALTER TABLE public.restaurantes
  DROP CONSTRAINT IF EXISTS restaurantes_taxa_servico_percentual_check;
ALTER TABLE public.restaurantes
  ADD CONSTRAINT restaurantes_taxa_servico_percentual_check
    CHECK (taxa_servico_percentual IS NULL OR (taxa_servico_percentual >= 0 AND taxa_servico_percentual <= 30));

ALTER TABLE public.restaurantes
  DROP CONSTRAINT IF EXISTS restaurantes_couvert_mesa_valor_check;
ALTER TABLE public.restaurantes
  ADD CONSTRAINT restaurantes_couvert_mesa_valor_check
    CHECK (couvert_mesa_valor IS NULL OR couvert_mesa_valor >= 0);

ALTER TABLE public.restaurantes
  DROP CONSTRAINT IF EXISTS restaurantes_couvert_artistico_valor_check;
ALTER TABLE public.restaurantes
  ADD CONSTRAINT restaurantes_couvert_artistico_valor_check
    CHECK (couvert_artistico_valor IS NULL OR couvert_artistico_valor >= 0);

-- Tabela de lançamentos de couvert por comanda
CREATE TABLE IF NOT EXISTS public.comanda_couverts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id uuid NOT NULL REFERENCES public.comandas(id) ON DELETE CASCADE,
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('mesa','artistico')),
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  valor_unitario numeric(10,2) NOT NULL CHECK (valor_unitario >= 0),
  descricao text NULL,
  lancado_por uuid NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comanda_couverts_comanda ON public.comanda_couverts(comanda_id);
CREATE INDEX IF NOT EXISTS idx_comanda_couverts_restaurante ON public.comanda_couverts(restaurante_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comanda_couverts TO authenticated;
GRANT SELECT ON public.comanda_couverts TO anon;
GRANT ALL ON public.comanda_couverts TO service_role;

ALTER TABLE public.comanda_couverts ENABLE ROW LEVEL SECURITY;

-- Membros do restaurante: leitura/escrita total
CREATE POLICY "comanda_couverts_rw_membro"
ON public.comanda_couverts
FOR ALL
TO authenticated
USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

-- Cliente em sessão ativa pode visualizar os couverts da comanda
CREATE POLICY "comanda_couverts_select_publico"
ON public.comanda_couverts
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.comandas c
    JOIN public.mesa_sessoes s ON s.id = c.sessao_id
    WHERE c.id = comanda_couverts.comanda_id
      AND s.status = 'aberta'
  )
);

-- Trigger: recalcular subtotal/total da comanda quando couverts mudam
CREATE OR REPLACE FUNCTION public.recalcular_couvert_comanda(_comanda_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedidos numeric := 0;
  v_couverts numeric := 0;
  v_cashback numeric := 0;
  v_desconto numeric := 0;
BEGIN
  SELECT COALESCE(SUM(total),0) INTO v_pedidos
  FROM public.pedidos
  WHERE comanda_id = _comanda_id AND status <> 'cancelado';

  SELECT COALESCE(SUM(quantidade * valor_unitario),0) INTO v_couverts
  FROM public.comanda_couverts
  WHERE comanda_id = _comanda_id;

  SELECT COALESCE(cashback_resgatado,0), COALESCE(desconto_cupom,0)
    INTO v_cashback, v_desconto
  FROM public.comandas WHERE id = _comanda_id;

  UPDATE public.comandas
  SET subtotal = v_pedidos + v_couverts,
      total = GREATEST((v_pedidos + v_couverts) - v_cashback - v_desconto, 0)
  WHERE id = _comanda_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_comanda_couverts_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalcular_couvert_comanda(OLD.comanda_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalcular_couvert_comanda(NEW.comanda_id);
    IF TG_OP = 'UPDATE' AND OLD.comanda_id <> NEW.comanda_id THEN
      PERFORM public.recalcular_couvert_comanda(OLD.comanda_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_comanda_couverts_recalc ON public.comanda_couverts;
CREATE TRIGGER trg_comanda_couverts_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.comanda_couverts
FOR EACH ROW EXECUTE FUNCTION public.trg_comanda_couverts_recalc();