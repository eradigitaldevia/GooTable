
-- =========================================================
-- 1. PEDIDOS — canal + dados de delivery
-- =========================================================
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS canal TEXT NOT NULL DEFAULT 'mesa'
    CHECK (canal IN ('mesa','balcao','delivery','retirada')),
  ADD COLUMN IF NOT EXISTS cliente_telefone TEXT,
  ADD COLUMN IF NOT EXISTS endereco_cep TEXT,
  ADD COLUMN IF NOT EXISTS endereco_rua TEXT,
  ADD COLUMN IF NOT EXISTS endereco_numero TEXT,
  ADD COLUMN IF NOT EXISTS endereco_complemento TEXT,
  ADD COLUMN IF NOT EXISTS endereco_bairro TEXT,
  ADD COLUMN IF NOT EXISTS endereco_cidade TEXT,
  ADD COLUMN IF NOT EXISTS endereco_uf TEXT,
  ADD COLUMN IF NOT EXISTS endereco_referencia TEXT,
  ADD COLUMN IF NOT EXISTS taxa_entrega NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS previsao_entrega_min INTEGER;

CREATE INDEX IF NOT EXISTS idx_pedidos_canal_delivery
  ON public.pedidos (restaurante_id, canal, criado_em DESC)
  WHERE canal IN ('delivery','retirada');

-- =========================================================
-- 2. RESTAURANTES — configs delivery
-- =========================================================
ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS delivery_ativo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS delivery_taxa_entrega NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_pedido_minimo NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_tempo_estimado_min INTEGER NOT NULL DEFAULT 45,
  ADD COLUMN IF NOT EXISTS delivery_retirada_ativa BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_raio_km NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS delivery_aceita_dinheiro BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_aceita_cartao_entrega BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_aceita_pix BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_whatsapp TEXT;

-- =========================================================
-- 3. MESAS — flag de mesa virtual
-- =========================================================
ALTER TABLE public.mesas
  ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN NOT NULL DEFAULT false;

-- =========================================================
-- 4. CLIENTES — endereços salvos (últimos 3)
-- =========================================================
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS enderecos JSONB NOT NULL DEFAULT '[]'::jsonb;

-- =========================================================
-- 5. Função: gerar slug público de delivery
-- =========================================================
CREATE OR REPLACE FUNCTION public.gerar_delivery_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base TEXT;
  candidato TEXT;
  sufixo INT := 0;
BEGIN
  IF NEW.delivery_slug IS NOT NULL AND NEW.delivery_slug <> '' THEN
    RETURN NEW;
  END IF;

  -- normaliza nome -> slug
  base := lower(unaccent(NEW.nome));
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := regexp_replace(base, '(^-+|-+$)', '', 'g');
  IF base = '' THEN base := 'restaurante'; END IF;

  candidato := base;
  WHILE EXISTS (SELECT 1 FROM public.restaurantes WHERE delivery_slug = candidato AND id <> NEW.id) LOOP
    sufixo := sufixo + 1;
    candidato := base || '-' || sufixo;
  END LOOP;

  NEW.delivery_slug := candidato;
  RETURN NEW;
END;
$$;

-- precisamos da extensão unaccent
CREATE EXTENSION IF NOT EXISTS unaccent;

DROP TRIGGER IF EXISTS trg_restaurantes_delivery_slug ON public.restaurantes;
CREATE TRIGGER trg_restaurantes_delivery_slug
  BEFORE INSERT OR UPDATE OF nome, delivery_slug ON public.restaurantes
  FOR EACH ROW EXECUTE FUNCTION public.gerar_delivery_slug();

-- =========================================================
-- 6. Função: garantir mesa virtual DELIVERY ao ativar delivery
-- =========================================================
CREATE OR REPLACE FUNCTION public.garantir_mesa_delivery_virtual()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.delivery_ativo IS TRUE THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mesas
      WHERE restaurante_id = NEW.id AND is_virtual = true AND numero = 'DELIVERY'
    ) THEN
      INSERT INTO public.mesas (restaurante_id, numero, is_virtual, ativa)
      VALUES (NEW.id, 'DELIVERY', true, true);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restaurantes_mesa_delivery ON public.restaurantes;
CREATE TRIGGER trg_restaurantes_mesa_delivery
  AFTER INSERT OR UPDATE OF delivery_ativo ON public.restaurantes
  FOR EACH ROW EXECUTE FUNCTION public.garantir_mesa_delivery_virtual();

-- =========================================================
-- 7. Backfill: gerar slug para restaurantes existentes
-- =========================================================
UPDATE public.restaurantes SET nome = nome WHERE delivery_slug IS NULL;
