ALTER TABLE public.identificacao_tentativas
  ADD COLUMN IF NOT EXISTS escopo text NOT NULL DEFAULT 'lookup';

ALTER TABLE public.identificacao_tentativas
  DROP CONSTRAINT IF EXISTS identificacao_tentativas_escopo_check;
ALTER TABLE public.identificacao_tentativas
  ADD CONSTRAINT identificacao_tentativas_escopo_check
  CHECK (escopo IN ('lookup', 'confirmacao'));

CREATE INDEX IF NOT EXISTS idx_ident_tent_telefone
  ON public.identificacao_tentativas (restaurante_id, telefone_hash, escopo, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_ident_tent_qr
  ON public.identificacao_tentativas (restaurante_id, qr_token, escopo, criado_em DESC);

CREATE OR REPLACE FUNCTION public.limpar_identificacao_tentativas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removidos integer;
BEGIN
  DELETE FROM public.identificacao_tentativas
  WHERE criado_em < now() - interval '7 days';
  GET DIAGNOSTICS v_removidos = ROW_COUNT;
  RETURN v_removidos;
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('limpar-identificacao-tentativas');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'limpar-identificacao-tentativas',
  '20 3 * * *',
  $$SELECT public.limpar_identificacao_tentativas();$$
);