-- Dashboard do dono do restaurante
CREATE OR REPLACE FUNCTION public.dashboard_admin_resumo(_restaurante_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio_hoje timestamptz := date_trunc('day', now());
  v_inicio_7d   timestamptz := date_trunc('day', now()) - interval '6 days';
  v_em_andamento int;
  v_finalizados_hoje int;
  v_mesas_ocupadas int;
  v_faturamento_hoje numeric;
  v_chart jsonb;
BEGIN
  IF NOT (public.is_restaurante_membro(auth.uid(), _restaurante_id) OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT count(*) INTO v_em_andamento
  FROM public.pedidos
  WHERE restaurante_id = _restaurante_id
    AND criado_em >= v_inicio_hoje
    AND status IN ('recebido','em_preparo','pronto');

  SELECT count(*), COALESCE(sum(total),0)
    INTO v_finalizados_hoje, v_faturamento_hoje
  FROM public.pedidos
  WHERE restaurante_id = _restaurante_id
    AND criado_em >= v_inicio_hoje
    AND status = 'entregue';

  SELECT count(DISTINCT mesa_id) INTO v_mesas_ocupadas
  FROM public.pedidos
  WHERE restaurante_id = _restaurante_id
    AND criado_em >= v_inicio_hoje
    AND status IN ('recebido','em_preparo','pronto');

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'data', to_char(d, 'YYYY-MM-DD'),
            'valor', COALESCE(s.valor, 0)
         ) ORDER BY d), '[]'::jsonb)
    INTO v_chart
  FROM generate_series(v_inicio_7d, date_trunc('day', now()), interval '1 day') AS d
  LEFT JOIN (
    SELECT date_trunc('day', criado_em) AS dia, sum(total) AS valor
    FROM public.pedidos
    WHERE restaurante_id = _restaurante_id
      AND status = 'entregue'
      AND criado_em >= v_inicio_7d
    GROUP BY 1
  ) s ON s.dia = d;

  RETURN jsonb_build_object(
    'em_andamento', v_em_andamento,
    'finalizados_hoje', v_finalizados_hoje,
    'mesas_ocupadas', v_mesas_ocupadas,
    'faturamento_hoje', v_faturamento_hoje,
    'chart_7d', v_chart
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_admin_resumo(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.dashboard_admin_resumo(uuid) TO authenticated;

-- Dashboard do super-admin
CREATE OR REPLACE FUNCTION public.dashboard_superadmin_resumo()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio_hoje timestamptz := date_trunc('day', now());
  v_inicio_mes  timestamptz := date_trunc('month', now());
  v_inicio_30d  timestamptz := date_trunc('day', now()) - interval '29 days';
  v_total int;
  v_ativos int;
  v_pedidos_hoje int;
  v_faturamento_hoje numeric;
  v_faturamento_mes numeric;
  v_chart jsonb;
  v_top jsonb;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT count(*), count(*) FILTER (WHERE ativo)
    INTO v_total, v_ativos
  FROM public.restaurantes;

  SELECT count(*) INTO v_pedidos_hoje
  FROM public.pedidos
  WHERE criado_em >= v_inicio_hoje;

  SELECT COALESCE(sum(total), 0) INTO v_faturamento_hoje
  FROM public.pedidos
  WHERE status = 'entregue' AND criado_em >= v_inicio_hoje;

  SELECT COALESCE(sum(total), 0) INTO v_faturamento_mes
  FROM public.pedidos
  WHERE status = 'entregue' AND criado_em >= v_inicio_mes;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'data', to_char(d, 'YYYY-MM-DD'),
            'total', COALESCE(s.valor, 0)
         ) ORDER BY d), '[]'::jsonb)
    INTO v_chart
  FROM generate_series(v_inicio_30d, date_trunc('day', now()), interval '1 day') AS d
  LEFT JOIN (
    SELECT date_trunc('day', criado_em) AS dia, sum(total) AS valor
    FROM public.pedidos
    WHERE status = 'entregue' AND criado_em >= v_inicio_30d
    GROUP BY 1
  ) s ON s.dia = d;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('nome', nome, 'total', total) ORDER BY total DESC), '[]'::jsonb)
    INTO v_top
  FROM (
    SELECT r.nome, COALESCE(sum(p.total), 0) AS total
    FROM public.restaurantes r
    JOIN public.pedidos p ON p.restaurante_id = r.id
    WHERE p.status = 'entregue' AND p.criado_em >= v_inicio_mes
    GROUP BY r.id, r.nome
    ORDER BY total DESC
    LIMIT 5
  ) t;

  RETURN jsonb_build_object(
    'total', v_total,
    'ativos', v_ativos,
    'suspensos', v_total - v_ativos,
    'pedidos_hoje', v_pedidos_hoje,
    'faturamento_hoje', v_faturamento_hoje,
    'faturamento_mes', v_faturamento_mes,
    'chart_30d', v_chart,
    'top_restaurantes', v_top
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_superadmin_resumo() FROM public;
GRANT EXECUTE ON FUNCTION public.dashboard_superadmin_resumo() TO authenticated;