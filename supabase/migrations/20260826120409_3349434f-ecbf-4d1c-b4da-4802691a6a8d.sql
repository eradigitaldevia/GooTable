ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS contrato_bloqueio_automatico boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.aplicar_bloqueio_contratos()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT id, nome, contrato_vencimento_em
    FROM public.restaurantes
    WHERE ativo = true
      AND contrato_bloqueio_automatico = true
      AND contrato_vencimento_em IS NOT NULL
      AND contrato_vencimento_em < current_date
  LOOP
    UPDATE public.restaurantes SET ativo = false WHERE id = r.id;

    INSERT INTO public.audit_logs (actor_user_id, acao, entidade, entidade_id, metadata)
    VALUES (NULL, 'suspender_restaurante_automatico', 'restaurante', r.id,
            jsonb_build_object('motivo', 'contrato_vencido',
                               'vencimento', r.contrato_vencimento_em,
                               'nome', r.nome));
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_bloqueio_contratos() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('aplicar-bloqueio-contratos')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'aplicar-bloqueio-contratos');
    PERFORM cron.schedule('aplicar-bloqueio-contratos', '0 6 * * *', 'SELECT public.aplicar_bloqueio_contratos();');
  END IF;
END $$;