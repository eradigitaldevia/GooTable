ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS delivery_modo_taxa text NOT NULL DEFAULT 'fixa',
  ADD COLUMN IF NOT EXISTS delivery_origem_endereco text,
  ADD COLUMN IF NOT EXISTS delivery_origem_lat double precision,
  ADD COLUMN IF NOT EXISTS delivery_origem_lng double precision,
  ADD COLUMN IF NOT EXISTS delivery_km_modelo text NOT NULL DEFAULT 'faixas',
  ADD COLUMN IF NOT EXISTS delivery_km_faixas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_km_base_valor numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_km_base_km numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_km_valor_extra numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_km_falha text NOT NULL DEFAULT 'taxa_fixa';

UPDATE public.restaurantes SET delivery_modo_taxa = 'bairro' WHERE delivery_taxa_por_bairro = true;

ALTER TABLE public.restaurantes
  ADD CONSTRAINT restaurantes_delivery_modo_taxa_chk CHECK (delivery_modo_taxa IN ('fixa','bairro','distancia')),
  ADD CONSTRAINT restaurantes_delivery_km_modelo_chk CHECK (delivery_km_modelo IN ('faixas','base_km')),
  ADD CONSTRAINT restaurantes_delivery_km_falha_chk CHECK (delivery_km_falha IN ('taxa_fixa','bloquear'));

ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS distancia_km numeric(7,2);

CREATE TABLE public.delivery_distancia_cache (
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  chave text NOT NULL,
  origem text NOT NULL,
  distancia_m integer,
  duracao_s integer,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (restaurante_id, chave, origem)
);
GRANT ALL ON public.delivery_distancia_cache TO service_role;
ALTER TABLE public.delivery_distancia_cache ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.delivery_distancia_uso (
  escopo text NOT NULL,
  janela timestamptz NOT NULL,
  consultas integer NOT NULL DEFAULT 0,
  PRIMARY KEY (escopo, janela)
);
GRANT ALL ON public.delivery_distancia_uso TO service_role;
ALTER TABLE public.delivery_distancia_uso ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.registrar_consulta_distancia(_restaurante_id uuid, _visitante text, _limite_dia integer, _limite_hora integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dia timestamptz := date_trunc('day', now());
  _hora timestamptz := date_trunc('hour', now());
  _c_dia integer;
  _c_hora integer;
BEGIN
  SELECT consultas INTO _c_dia FROM delivery_distancia_uso WHERE escopo = 'r:' || _restaurante_id AND janela = _dia;
  SELECT consultas INTO _c_hora FROM delivery_distancia_uso WHERE escopo = 'v:' || _restaurante_id || ':' || _visitante AND janela = _hora;
  IF coalesce(_c_dia,0) >= _limite_dia OR coalesce(_c_hora,0) >= _limite_hora THEN
    RETURN false;
  END IF;
  INSERT INTO delivery_distancia_uso(escopo, janela, consultas) VALUES ('r:' || _restaurante_id, _dia, 1)
    ON CONFLICT (escopo, janela) DO UPDATE SET consultas = delivery_distancia_uso.consultas + 1;
  INSERT INTO delivery_distancia_uso(escopo, janela, consultas) VALUES ('v:' || _restaurante_id || ':' || _visitante, _hora, 1)
    ON CONFLICT (escopo, janela) DO UPDATE SET consultas = delivery_distancia_uso.consultas + 1;
  DELETE FROM delivery_distancia_uso WHERE janela < now() - interval '3 days';
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_consulta_distancia(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_consulta_distancia(uuid, text, integer, integer) TO service_role;