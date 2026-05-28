
CREATE OR REPLACE FUNCTION public.dashboard_metricas_operacionais(_restaurante_id uuid, _periodo text DEFAULT 'hoje')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio timestamptz;
  v_fila jsonb;
  v_tempos jsonb;
  v_throughput jsonb;
  v_recebido int := 0;
  v_em_preparo int := 0;
  v_pronto int := 0;
  v_mais_antigo_min int := 0;
BEGIN
  IF NOT (public.is_restaurante_membro(auth.uid(), _restaurante_id) OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF _periodo = '7d' THEN
    v_inicio := date_trunc('day', now()) - interval '6 days';
  ELSIF _periodo = '30d' THEN
    v_inicio := date_trunc('day', now()) - interval '29 days';
  ELSE
    v_inicio := date_trunc('day', now());
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE status = 'recebido'),
    COUNT(*) FILTER (WHERE status = 'em_preparo'),
    COUNT(*) FILTER (WHERE status = 'pronto'),
    COALESCE(EXTRACT(EPOCH FROM (now() - MIN(criado_em))) / 60.0, 0)::int
  INTO v_recebido, v_em_preparo, v_pronto, v_mais_antigo_min
  FROM public.pedidos
  WHERE restaurante_id = _restaurante_id
    AND status IN ('recebido','em_preparo','pronto');

  v_fila := jsonb_build_object(
    'recebido', v_recebido,
    'em_preparo', v_em_preparo,
    'pronto', v_pronto,
    'mais_antigo_min', v_mais_antigo_min
  );

  WITH ped AS (
    SELECT id FROM public.pedidos
    WHERE restaurante_id = _restaurante_id
      AND criado_em >= v_inicio
  ),
  hist AS (
    SELECT h.pedido_id, h.status_novo, h.mudou_em
    FROM public.pedido_status_historico h
    JOIN ped ON ped.id = h.pedido_id
  ),
  fases AS (
    SELECT
      pedido_id,
      MIN(mudou_em) FILTER (WHERE status_novo = 'recebido')   AS t_recebido,
      MIN(mudou_em) FILTER (WHERE status_novo = 'em_preparo') AS t_preparo,
      MIN(mudou_em) FILTER (WHERE status_novo = 'pronto')     AS t_pronto,
      MIN(mudou_em) FILTER (WHERE status_novo = 'entregue')   AS t_entregue
    FROM hist
    GROUP BY pedido_id
  )
  SELECT jsonb_build_object(
    'recebido_para_preparo_min',
      COALESCE(round(AVG(EXTRACT(EPOCH FROM (t_preparo - t_recebido)) / 60.0)::numeric, 1), 0),
    'preparo_para_pronto_min',
      COALESCE(round(AVG(EXTRACT(EPOCH FROM (t_pronto - t_preparo)) / 60.0)::numeric, 1), 0),
    'pronto_para_entregue_min',
      COALESCE(round(AVG(EXTRACT(EPOCH FROM (t_entregue - t_pronto)) / 60.0)::numeric, 1), 0),
    'ciclo_total_min',
      COALESCE(round(AVG(EXTRACT(EPOCH FROM (t_entregue - t_recebido)) / 60.0)::numeric, 1), 0)
  )
  INTO v_tempos
  FROM fases;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('hora', hora, 'total', total) ORDER BY hora), '[]'::jsonb)
  INTO v_throughput
  FROM (
    SELECT h.hora, COALESCE(t.total, 0)::int AS total
    FROM generate_series(0, 23) AS h(hora)
    LEFT JOIN (
      SELECT EXTRACT(HOUR FROM criado_em)::int AS hora, COUNT(*)::int AS total
      FROM public.pedidos
      WHERE restaurante_id = _restaurante_id
        AND status = 'entregue'
        AND criado_em >= v_inicio
      GROUP BY 1
    ) t ON t.hora = h.hora
  ) x;

  RETURN jsonb_build_object(
    'fila', v_fila,
    'tempo_fases', COALESCE(v_tempos, '{}'::jsonb),
    'throughput_24h', v_throughput
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dashboard_metricas_operacionais(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_metricas_operacionais(uuid, text) TO authenticated;
