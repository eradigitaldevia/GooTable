
CREATE OR REPLACE FUNCTION public.dashboard_produtos_top(
  _restaurante_id uuid,
  _periodo text DEFAULT 'hoje',
  _limit int DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inicio timestamptz;
  _resultado jsonb;
BEGIN
  _inicio := CASE _periodo
    WHEN '7d'  THEN date_trunc('day', now()) - interval '6 days'
    WHEN '30d' THEN date_trunc('day', now()) - interval '29 days'
    ELSE date_trunc('day', now())
  END;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.quantidade DESC), '[]'::jsonb)
    INTO _resultado
  FROM (
    SELECT
      pi.produto_id,
      COALESCE(MAX(pi.nome_produto), 'Produto') AS nome,
      SUM(pi.quantidade)::int AS quantidade,
      SUM(pi.quantidade * pi.preco_unit)::numeric AS faturamento
    FROM public.pedido_itens pi
    JOIN public.pedidos p ON p.id = pi.pedido_id
    WHERE p.restaurante_id = _restaurante_id
      AND p.status = 'entregue'
      AND p.criado_em >= _inicio
    GROUP BY pi.produto_id
    ORDER BY quantidade DESC
    LIMIT _limit
  ) t;

  RETURN _resultado;
END;
$$;

CREATE OR REPLACE FUNCTION public.dashboard_ticket_medio_mesa(
  _restaurante_id uuid,
  _periodo text DEFAULT 'hoje'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inicio timestamptz;
  _faturamento numeric;
  _mesas int;
BEGIN
  _inicio := CASE _periodo
    WHEN '7d'  THEN date_trunc('day', now()) - interval '6 days'
    WHEN '30d' THEN date_trunc('day', now()) - interval '29 days'
    ELSE date_trunc('day', now())
  END;

  SELECT
    COALESCE(SUM(p.total), 0)::numeric,
    COUNT(DISTINCT p.sessao_id)::int
  INTO _faturamento, _mesas
  FROM public.pedidos p
  WHERE p.restaurante_id = _restaurante_id
    AND p.status = 'entregue'
    AND p.sessao_id IS NOT NULL
    AND p.criado_em >= _inicio;

  RETURN jsonb_build_object(
    'ticket_medio', CASE WHEN _mesas > 0 THEN (_faturamento / _mesas) ELSE 0 END,
    'mesas_atendidas', _mesas,
    'faturamento_total', _faturamento
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_produtos_top(uuid, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_ticket_medio_mesa(uuid, text) TO authenticated;
