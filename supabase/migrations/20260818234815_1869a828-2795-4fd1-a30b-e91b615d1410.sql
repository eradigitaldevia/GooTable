CREATE OR REPLACE FUNCTION public.recalcular_total_comanda(_comanda_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_restaurante_id uuid;
  v_liquido numeric := 0;
  v_taxa_hab boolean;
  v_taxa_perc numeric;
  v_taxa numeric := 0;
BEGIN
  SELECT restaurante_id,
         GREATEST(COALESCE(subtotal,0) - COALESCE(cashback_resgatado,0) - COALESCE(desconto_cupom,0), 0)
    INTO v_restaurante_id, v_liquido
  FROM public.comandas WHERE id = _comanda_id;

  IF v_restaurante_id IS NULL THEN
    RETURN;
  END IF;

  SELECT taxa_servico_habilitada, taxa_servico_percentual
    INTO v_taxa_hab, v_taxa_perc
  FROM public.restaurantes WHERE id = v_restaurante_id;

  IF COALESCE(v_taxa_hab, false) AND COALESCE(v_taxa_perc, 0) > 0 THEN
    v_taxa := ROUND(v_liquido * v_taxa_perc / 100.0, 2);
  END IF;

  UPDATE public.comandas
  SET total = v_liquido + v_taxa,
      taxa_servico_valor = v_taxa,
      atualizado_em = now()
  WHERE id = _comanda_id;
END;
$function$;

-- Backfill das comandas abertas para refletir total com taxa
UPDATE public.comandas
SET total = GREATEST(COALESCE(subtotal,0) - COALESCE(cashback_resgatado,0) - COALESCE(desconto_cupom,0), 0)
            + COALESCE(taxa_servico_valor, 0),
    atualizado_em = now()
WHERE status = 'aberta';

-- Remove a geração de comissão da trigger de pedido (mantém a trigger vazia para não quebrar)
CREATE OR REPLACE FUNCTION public.trg_pedido_gerar_comissao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Comissão agora é gerada apenas no fechamento da comanda (trg_comanda_gerar_comissao).
  RETURN NEW;
END;
$function$;

-- Função de geração de comissão na quitação da comanda
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
            ON CONFLICT (pedido_id, garcom_id) DO NOTHING;
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
          ON CONFLICT (pedido_id, garcom_id) DO NOTHING;
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
            ON CONFLICT (pedido_id, garcom_id) DO NOTHING;
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
          ON CONFLICT (pedido_id, garcom_id) DO NOTHING;
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$function$;

-- Trigger em comandas que gera comissão no fechamento
CREATE OR REPLACE FUNCTION public.trg_comanda_gerar_comissao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'fechada' AND OLD.status IS DISTINCT FROM 'fechada' THEN
    PERFORM public.gerar_comissao_comanda(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_comanda_gerar_comissao ON public.comandas;
CREATE TRIGGER trg_comanda_gerar_comissao
  AFTER UPDATE OF status ON public.comandas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_comanda_gerar_comissao();
