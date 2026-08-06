CREATE TABLE public.banners_cardapio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  imagem_url text NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  vigencia_inicio timestamptz,
  vigencia_fim timestamptz,
  exibir_em text NOT NULL DEFAULT 'ambos',
  destino_tipo text NOT NULL DEFAULT 'nenhum',
  destino_valor text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT banners_cardapio_exibir_em_check CHECK (exibir_em IN ('mesa','delivery','ambos')),
  CONSTRAINT banners_cardapio_destino_tipo_check CHECK (destino_tipo IN ('nenhum','categoria','produto','link'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners_cardapio TO authenticated;
GRANT ALL ON public.banners_cardapio TO service_role;

ALTER TABLE public.banners_cardapio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banners_membro_all" ON public.banners_cardapio
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE INDEX banners_cardapio_restaurante_idx ON public.banners_cardapio (restaurante_id, ordem);

CREATE TRIGGER banners_cardapio_touch
  BEFORE UPDATE ON public.banners_cardapio
  FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

CREATE OR REPLACE FUNCTION public.banners_cardapio_limite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_qtd int;
BEGIN
  IF NEW.ativo THEN
    SELECT COUNT(*) INTO v_qtd
      FROM public.banners_cardapio
     WHERE restaurante_id = NEW.restaurante_id
       AND ativo
       AND id <> NEW.id;
    IF v_qtd >= 3 THEN
      RAISE EXCEPTION 'limite_banners_ativos';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER banners_cardapio_limite_trg
  BEFORE INSERT OR UPDATE ON public.banners_cardapio
  FOR EACH ROW EXECUTE FUNCTION public.banners_cardapio_limite();