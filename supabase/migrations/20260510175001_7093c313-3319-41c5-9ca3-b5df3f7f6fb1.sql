
CREATE OR REPLACE FUNCTION public.creditar_cashback_pedido(_pedido_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido          public.pedidos%ROWTYPE;
  v_percentual      numeric;
  v_ativo           boolean;
  v_total_creditado numeric := 0;
  v_rec             record;
  v_valor           numeric;
BEGIN
  SELECT * INTO v_pedido FROM public.pedidos WHERE id = _pedido_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido nao encontrado';
  END IF;

  SELECT ativo, percentual_cashback
    INTO v_ativo, v_percentual
  FROM public.programa_fidelidade
  WHERE restaurante_id = v_pedido.restaurante_id
  ORDER BY atualizado_em DESC
  LIMIT 1;

  IF NOT COALESCE(v_ativo, false) OR COALESCE(v_percentual, 0) <= 0 THEN
    RETURN 0;
  END IF;

  FOR v_rec IN
    SELECT cliente_id, SUM(preco_unit * quantidade) AS subtotal
    FROM public.pedido_itens
    WHERE pedido_id = _pedido_id
      AND cliente_id IS NOT NULL
    GROUP BY cliente_id
  LOOP
    v_valor := round(v_rec.subtotal * v_percentual / 100.0, 2);
    IF v_valor <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public.cashback_movimentos (
      restaurante_id, cliente_id, tipo, valor, pedido_id, comanda_id, observacao
    ) VALUES (
      v_pedido.restaurante_id, v_rec.cliente_id, 'credito', v_valor,
      _pedido_id, v_pedido.comanda_id,
      'Credito de cashback pelo pedido'
    )
    ON CONFLICT ON CONSTRAINT uq_cashback_credito_por_pedido DO NOTHING;

    IF FOUND THEN
      UPDATE public.clientes
      SET cashback_saldo = COALESCE(cashback_saldo, 0) + v_valor,
          atualizado_em = now()
      WHERE id = v_rec.cliente_id
        AND restaurante_id = v_pedido.restaurante_id;
      v_total_creditado := v_total_creditado + v_valor;
    END IF;
  END LOOP;

  IF v_total_creditado > 0 THEN
    UPDATE public.pedidos
    SET cashback_gerado = COALESCE(cashback_gerado, 0) + v_total_creditado,
        atualizado_em = now()
    WHERE id = _pedido_id;
  END IF;

  RETURN v_total_creditado;
END;
$$;

REVOKE ALL ON FUNCTION public.creditar_cashback_pedido(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.creditar_cashback_pedido(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.aplicar_cashback(
  _comanda_id uuid,
  _cliente_id uuid,
  _valor numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comanda             public.comandas%ROWTYPE;
  v_cliente             public.clientes%ROWTYPE;
  v_percentual_max      numeric;
  v_subtotal_individual numeric := 0;
  v_limite_pct          numeric;
  v_limite              numeric;
BEGIN
  IF _valor <= 0 THEN
    RAISE EXCEPTION 'Valor de resgate invalido';
  END IF;

  SELECT * INTO v_comanda FROM public.comandas WHERE id = _comanda_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda nao encontrada';
  END IF;
  IF v_comanda.status <> 'aberta' THEN
    RAISE EXCEPTION 'Comanda nao esta aberta';
  END IF;

  SELECT * INTO v_cliente FROM public.clientes WHERE id = _cliente_id FOR UPDATE;
  IF NOT FOUND OR v_cliente.restaurante_id <> v_comanda.restaurante_id THEN
    RAISE EXCEPTION 'Cliente invalido';
  END IF;

  SELECT COALESCE(SUM(it.preco_unit * it.quantidade), 0)
    INTO v_subtotal_individual
  FROM public.pedido_itens it
  JOIN public.pedidos p ON p.id = it.pedido_id
  WHERE p.comanda_id = _comanda_id
    AND it.cliente_id = _cliente_id;

  IF v_subtotal_individual <= 0 THEN
    RAISE EXCEPTION 'Voce nao tem itens nesta comanda para aplicar cashback';
  END IF;

  SELECT COALESCE(percentual_max_resgate, 100)
    INTO v_percentual_max
  FROM public.programa_fidelidade
  WHERE restaurante_id = v_comanda.restaurante_id
  ORDER BY atualizado_em DESC
  LIMIT 1;

  v_limite_pct := round(v_subtotal_individual * COALESCE(v_percentual_max, 100) / 100.0, 2);
  v_limite := LEAST(COALESCE(v_cliente.cashback_saldo, 0), v_limite_pct);

  IF _valor > v_limite THEN
    RAISE EXCEPTION 'Valor acima do limite permitido (max %)', v_limite;
  END IF;

  UPDATE public.clientes
  SET cashback_saldo = COALESCE(cashback_saldo, 0) - _valor,
      atualizado_em = now()
  WHERE id = _cliente_id;

  UPDATE public.comandas
  SET cashback_resgatado = COALESCE(cashback_resgatado, 0) + _valor,
      total = COALESCE(subtotal, 0) - (COALESCE(cashback_resgatado, 0) + _valor),
      atualizado_em = now()
  WHERE id = _comanda_id;

  INSERT INTO public.cashback_movimentos (
    restaurante_id, cliente_id, tipo, valor, comanda_id, observacao
  ) VALUES (
    v_comanda.restaurante_id, _cliente_id, 'resgate', _valor, _comanda_id,
    'Resgate aplicado na comanda'
  );

  RETURN jsonb_build_object(
    'aplicado', _valor,
    'novo_saldo', COALESCE(v_cliente.cashback_saldo, 0) - _valor,
    'cashback_resgatado_comanda', COALESCE(v_comanda.cashback_resgatado, 0) + _valor
  );
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_cashback(uuid, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aplicar_cashback(uuid, uuid, numeric) TO service_role;
