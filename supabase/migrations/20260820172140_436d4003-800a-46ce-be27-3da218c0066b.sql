ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS sessao_ociosa_horas integer NOT NULL DEFAULT 4;

CREATE OR REPLACE FUNCTION public.encerrar_sessoes_ociosas()
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
    SELECT s.id, s.mesa_id
    FROM public.mesa_sessoes s
    JOIN public.restaurantes rest ON rest.id = s.restaurante_id
    WHERE s.status = 'aberta'
      AND s.aberta_em < now() - make_interval(hours => GREATEST(COALESCE(rest.sessao_ociosa_horas, 4), 1))
      AND NOT EXISTS (SELECT 1 FROM public.pedidos p WHERE p.sessao_id = s.id)
      AND NOT EXISTS (
        SELECT 1 FROM public.comandas c
        WHERE c.sessao_id = s.id
          AND (COALESCE(c.subtotal,0) > 0
               OR COALESCE(c.total,0) > 0
               OR COALESCE(c.total_pago,0) > 0
               OR COALESCE(c.taxa_servico_valor,0) > 0
               OR EXISTS (SELECT 1 FROM public.comanda_couverts cc WHERE cc.comanda_id = c.id))
      )
  LOOP
    UPDATE public.comandas
      SET status = 'fechada', fechada_em = now(), atualizado_em = now()
      WHERE sessao_id = r.id AND status = 'aberta';

    UPDATE public.mesa_sessao_clientes
      SET saiu_em = now()
      WHERE sessao_id = r.id AND saiu_em IS NULL;

    UPDATE public.mesa_sessoes
      SET status = 'fechada', fechada_em = now(), atualizado_em = now()
      WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('encerrar-sessoes-ociosas')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'encerrar-sessoes-ociosas');

SELECT cron.schedule(
  'encerrar-sessoes-ociosas',
  '*/15 * * * *',
  $$SELECT public.encerrar_sessoes_ociosas();$$
);

SELECT public.encerrar_sessoes_ociosas();