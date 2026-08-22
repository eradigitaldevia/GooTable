-- 1) Cashback nunca para pedido cancelado
CREATE OR REPLACE FUNCTION public.creditar_cashback_pedido(_pedido_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF v_pedido.status = 'cancelado' THEN
    RETURN 0;
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
$function$;

-- 2) Pagamento confirmado que vira cancelado devolve o valor pago
CREATE OR REPLACE FUNCTION public.trg_pagamento_cancelado_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'confirmado' AND NEW.status = 'cancelado' THEN
    UPDATE public.comandas
    SET total_pago = GREATEST(COALESCE(total_pago,0) - COALESCE(OLD.valor,0), 0),
        atualizado_em = now()
    WHERE id = OLD.comanda_id;

    UPDATE public.comandas
    SET status = 'aberta', fechada_em = NULL, atualizado_em = now()
    WHERE id = OLD.comanda_id
      AND status = 'fechada'
      AND COALESCE(total_pago,0) < COALESCE(total,0);
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.trg_pagamento_cancelado_sync() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS pagamentos_cancelado_sync_trg ON public.pagamentos;
CREATE TRIGGER pagamentos_cancelado_sync_trg
AFTER UPDATE OF status ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.trg_pagamento_cancelado_sync();

-- 3) Comissões: recomputo idempotente enquanto pendente
CREATE OR REPLACE FUNCTION public.gerar_comissao_comanda(_comanda_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_comanda public.comandas%ROWTYPE;
  v_ativa boolean;
  v_modo text;
  v_pagar_cliente boolean;
  v_perc_cliente numeric;
  v_fator_liquido numeric := 1;
  v_percentual numeric;
  v_perc_efetivo numeric;
  v_base numeric;
  v_valor numeric;
  v_count int;
  r record;
  p record;
BEGIN
  SELECT * INTO v_comanda FROM public.comandas WHERE id = _comanda_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_comanda.status <> 'fechada' THEN RETURN; END IF;
  IF COALESCE(v_comanda.total_pago, 0) < v_comanda.total THEN RETURN; END IF;

  SELECT comissao_ativa, comissao_modo, comissao_pedido_cliente, comissao_pedido_cliente_percentual
    INTO v_ativa, v_modo, v_pagar_cliente, v_perc_cliente
  FROM public.restaurantes WHERE id = v_comanda.restaurante_id;
  IF COALESCE(v_ativa, true) = false THEN RETURN; END IF;

  v_modo := COALESCE(v_modo, 'pedido');
  v_pagar_cliente := COALESCE(v_pagar_cliente, true);

  IF COALESCE(v_comanda.subtotal, 0) > 0 THEN
    v_fator_liquido := GREATEST(
      (COALESCE(v_comanda.subtotal,0) - COALESCE(v_comanda.cashback_resgatado,0) - COALESCE(v_comanda.desconto_cupom,0))
      / v_comanda.subtotal,
      0
    );
  END IF;

  FOR p IN
    SELECT id, restaurante_id, total, origem, garcom_id
    FROM public.pedidos
    WHERE comanda_id = _comanda_id AND status = 'entregue'
  LOOP
    SELECT COUNT(*) INTO v_count FROM public.pedido_garcons WHERE pedido_id = p.id;

    IF v_modo = 'item' THEN
      IF v_count > 0 THEN
        FOR r IN
          SELECT pg.garcom_id, pg.peso, g.percentual_comissao
          FROM public.pedido_garcons pg
          JOIN public.garcons g ON g.id = pg.garcom_id
          WHERE pg.pedido_id = p.id
        LOOP
          IF p.origem = 'cliente' AND v_perc_cliente IS NOT NULL THEN
            SELECT
              COALESCE(SUM(pi.preco_unit * pi.quantidade), 0),
              COALESCE(SUM(pi.preco_unit * pi.quantidade * v_perc_cliente / 100.0), 0)
            INTO v_base, v_valor
            FROM public.pedido_itens pi
            LEFT JOIN public.produtos pr ON pr.id = pi.produto_id
            WHERE pi.pedido_id = p.id
              AND COALESCE(pr.comissao_aplicavel, true) = true;
            v_perc_efetivo := v_perc_cliente;
          ELSE
            SELECT
              COALESCE(SUM(pi.preco_unit * pi.quantidade), 0),
              COALESCE(SUM(
                pi.preco_unit * pi.quantidade
                * COALESCE(pr.percentual_comissao, r.percentual_comissao) / 100.0
              ), 0)
            INTO v_base, v_valor
            FROM public.pedido_itens pi
            LEFT JOIN public.produtos pr ON pr.id = pi.produto_id
            WHERE pi.pedido_id = p.id
              AND COALESCE(pr.comissao_aplicavel, true) = true;
            v_perc_efetivo := r.percentual_comissao;
          END IF;

          v_base := ROUND(v_base * v_fator_liquido, 2);
          v_valor := ROUND(v_valor * v_fator_liquido * r.peso / 100.0, 2);
          IF v_valor > 0 THEN
            INSERT INTO public.comissoes (restaurante_id, garcom_id, pedido_id, valor_pedido, percentual, valor_comissao, peso)
            VALUES (p.restaurante_id, r.garcom_id, p.id, v_base, v_perc_efetivo, v_valor, r.peso)
            ON CONFLICT (pedido_id, garcom_id) DO UPDATE
              SET valor_pedido = EXCLUDED.valor_pedido,
                  percentual = EXCLUDED.percentual,
                  valor_comissao = EXCLUDED.valor_comissao,
                  peso = EXCLUDED.peso,
                  calculado_em = now()
              WHERE public.comissoes.status = 'pendente';
          END IF;
        END LOOP;
      ELSIF p.garcom_id IS NOT NULL THEN
        SELECT percentual_comissao INTO v_percentual FROM public.garcons WHERE id = p.garcom_id;
        IF v_percentual IS NULL THEN CONTINUE; END IF;

        IF p.origem = 'cliente' AND v_perc_cliente IS NOT NULL THEN
          SELECT
            COALESCE(SUM(pi.preco_unit * pi.quantidade), 0),
            COALESCE(SUM(pi.preco_unit * pi.quantidade * v_perc_cliente / 100.0), 0)
          INTO v_base, v_valor
          FROM public.pedido_itens pi
          LEFT JOIN public.produtos pr ON pr.id = pi.produto_id
          WHERE pi.pedido_id = p.id
            AND COALESCE(pr.comissao_aplicavel, true) = true;
          v_perc_efetivo := v_perc_cliente;
        ELSE
          SELECT
            COALESCE(SUM(pi.preco_unit * pi.quantidade), 0),
            COALESCE(SUM(
              pi.preco_unit * pi.quantidade
              * COALESCE(pr.percentual_comissao, v_percentual) / 100.0
            ), 0)
          INTO v_base, v_valor
          FROM public.pedido_itens pi
          LEFT JOIN public.produtos pr ON pr.id = pi.produto_id
          WHERE pi.pedido_id = p.id
            AND COALESCE(pr.comissao_aplicavel, true) = true;
          v_perc_efetivo := v_percentual;
        END IF;

        v_base := ROUND(v_base * v_fator_liquido, 2);
        v_valor := ROUND(v_valor * v_fator_liquido, 2);
        IF v_valor > 0 THEN
          INSERT INTO public.comissoes (restaurante_id, garcom_id, pedido_id, valor_pedido, percentual, valor_comissao, peso)
          VALUES (p.restaurante_id, p.garcom_id, p.id, v_base, v_perc_efetivo, v_valor, 100)
          ON CONFLICT (pedido_id, garcom_id) DO UPDATE
            SET valor_pedido = EXCLUDED.valor_pedido,
                percentual = EXCLUDED.percentual,
                valor_comissao = EXCLUDED.valor_comissao,
                peso = EXCLUDED.peso,
                calculado_em = now()
            WHERE public.comissoes.status = 'pendente';
        END IF;
      END IF;
    ELSE
      -- Modo 'pedido'
      IF v_count > 0 THEN
        FOR r IN
          SELECT pg.garcom_id, pg.peso, g.percentual_comissao
          FROM public.pedido_garcons pg
          JOIN public.garcons g ON g.id = pg.garcom_id
          WHERE pg.pedido_id = p.id
        LOOP
          v_perc_efetivo := CASE
            WHEN p.origem = 'cliente' AND v_perc_cliente IS NOT NULL THEN v_perc_cliente
            ELSE r.percentual_comissao
          END;
          v_base := ROUND(COALESCE(p.total,0) * v_fator_liquido, 2);
          v_valor := ROUND(v_base * v_perc_efetivo / 100.0 * r.peso / 100.0, 2);
          IF v_valor > 0 THEN
            INSERT INTO public.comissoes (restaurante_id, garcom_id, pedido_id, valor_pedido, percentual, valor_comissao, peso)
            VALUES (p.restaurante_id, r.garcom_id, p.id, v_base, v_perc_efetivo, v_valor, r.peso)
            ON CONFLICT (pedido_id, garcom_id) DO UPDATE
              SET valor_pedido = EXCLUDED.valor_pedido,
                  percentual = EXCLUDED.percentual,
                  valor_comissao = EXCLUDED.valor_comissao,
                  peso = EXCLUDED.peso,
                  calculado_em = now()
              WHERE public.comissoes.status = 'pendente';
          END IF;
        END LOOP;
      ELSIF p.garcom_id IS NOT NULL THEN
        SELECT percentual_comissao INTO v_percentual FROM public.garcons WHERE id = p.garcom_id;
        IF v_percentual IS NULL THEN CONTINUE; END IF;
        v_perc_efetivo := CASE
          WHEN p.origem = 'cliente' AND v_perc_cliente IS NOT NULL THEN v_perc_cliente
          ELSE v_percentual
        END;
        v_base := ROUND(COALESCE(p.total,0) * v_fator_liquido, 2);
        v_valor := ROUND(v_base * v_perc_efetivo / 100.0, 2);
        IF v_valor > 0 THEN
          INSERT INTO public.comissoes (restaurante_id, garcom_id, pedido_id, valor_pedido, percentual, valor_comissao, peso)
          VALUES (p.restaurante_id, p.garcom_id, p.id, v_base, v_perc_efetivo, v_valor, 100)
          ON CONFLICT (pedido_id, garcom_id) DO UPDATE
            SET valor_pedido = EXCLUDED.valor_pedido,
                percentual = EXCLUDED.percentual,
                valor_comissao = EXCLUDED.valor_comissao,
                peso = EXCLUDED.peso,
                calculado_em = now()
            WHERE public.comissoes.status = 'pendente';
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$function$;