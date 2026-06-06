-- 1) Nova coluna de configuração
ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS comissao_pedido_cliente boolean NOT NULL DEFAULT true;

-- 2) Trigger de geração de comissão: pular quando pedido é do cliente e flag está off
CREATE OR REPLACE FUNCTION public.trg_pedido_gerar_comissao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_modo text;
  v_pagar_cliente boolean;
  v_count int;
  v_percentual numeric;
  v_valor numeric;
  v_base numeric;
  r record;
BEGIN
  IF NEW.status = 'entregue' AND (OLD.status IS DISTINCT FROM 'entregue') THEN
    SELECT comissao_modo, comissao_pedido_cliente
      INTO v_modo, v_pagar_cliente
      FROM public.restaurantes WHERE id = NEW.restaurante_id;
    v_modo := COALESCE(v_modo, 'pedido');
    v_pagar_cliente := COALESCE(v_pagar_cliente, true);

    -- Pedido lançado pelo cliente (QR): pular se admin desligou a opção.
    IF NEW.garcom_id IS NULL AND v_pagar_cliente = false THEN
      RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.pedido_garcons WHERE pedido_id = NEW.id;

    IF v_modo = 'item' THEN
      IF v_count > 0 THEN
        FOR r IN
          SELECT pg.garcom_id, pg.peso, g.percentual_comissao
          FROM public.pedido_garcons pg
          JOIN public.garcons g ON g.id = pg.garcom_id
          WHERE pg.pedido_id = NEW.id
        LOOP
          SELECT
            COALESCE(SUM(pi.preco_unit * pi.quantidade), 0),
            COALESCE(SUM(
              pi.preco_unit * pi.quantidade
              * COALESCE(p.percentual_comissao, r.percentual_comissao) / 100.0
            ), 0)
          INTO v_base, v_valor
          FROM public.pedido_itens pi
          LEFT JOIN public.produtos p ON p.id = pi.produto_id
          WHERE pi.pedido_id = NEW.id
            AND COALESCE(p.comissao_aplicavel, true) = true;

          v_valor := round(v_valor * r.peso / 100.0, 2);
          IF v_valor > 0 THEN
            INSERT INTO public.comissoes (restaurante_id, garcom_id, pedido_id, valor_pedido, percentual, valor_comissao, peso)
            VALUES (NEW.restaurante_id, r.garcom_id, NEW.id, v_base, r.percentual_comissao, v_valor, r.peso)
            ON CONFLICT (pedido_id, garcom_id) DO NOTHING;
          END IF;
        END LOOP;
      ELSIF NEW.garcom_id IS NOT NULL THEN
        SELECT percentual_comissao INTO v_percentual FROM public.garcons WHERE id = NEW.garcom_id;
        IF v_percentual IS NULL THEN
          RETURN NEW;
        END IF;
        SELECT
          COALESCE(SUM(pi.preco_unit * pi.quantidade), 0),
          COALESCE(SUM(
            pi.preco_unit * pi.quantidade
            * COALESCE(p.percentual_comissao, v_percentual) / 100.0
          ), 0)
        INTO v_base, v_valor
        FROM public.pedido_itens pi
        LEFT JOIN public.produtos p ON p.id = pi.produto_id
        WHERE pi.pedido_id = NEW.id
          AND COALESCE(p.comissao_aplicavel, true) = true;

        v_valor := round(v_valor, 2);
        IF v_valor > 0 THEN
          INSERT INTO public.comissoes (restaurante_id, garcom_id, pedido_id, valor_pedido, percentual, valor_comissao, peso)
          VALUES (NEW.restaurante_id, NEW.garcom_id, NEW.id, v_base, v_percentual, v_valor, 100)
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
          WHERE pg.pedido_id = NEW.id
        LOOP
          v_valor := round(COALESCE(NEW.total,0) * r.percentual_comissao / 100.0 * r.peso / 100.0, 2);
          INSERT INTO public.comissoes (restaurante_id, garcom_id, pedido_id, valor_pedido, percentual, valor_comissao, peso)
          VALUES (NEW.restaurante_id, r.garcom_id, NEW.id, COALESCE(NEW.total,0), r.percentual_comissao, v_valor, r.peso)
          ON CONFLICT (pedido_id, garcom_id) DO NOTHING;
        END LOOP;
      ELSIF NEW.garcom_id IS NOT NULL THEN
        SELECT percentual_comissao INTO v_percentual FROM public.garcons WHERE id = NEW.garcom_id;
        IF v_percentual IS NULL THEN
          RETURN NEW;
        END IF;
        v_valor := round(COALESCE(NEW.total,0) * v_percentual / 100.0, 2);
        INSERT INTO public.comissoes (restaurante_id, garcom_id, pedido_id, valor_pedido, percentual, valor_comissao, peso)
        VALUES (NEW.restaurante_id, NEW.garcom_id, NEW.id, COALESCE(NEW.total,0), v_percentual, v_valor, 100)
        ON CONFLICT (pedido_id, garcom_id) DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) Apuração de metas: excluir pedidos do cliente (garcom_id IS NULL) quando flag está off
CREATE OR REPLACE FUNCTION public.calcular_bonus_garcom(_meta_id uuid, _periodo_ref date)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_meta public.garcom_metas%ROWTYPE;
  v_range record;
  v_valor numeric := 0;
  v_base numeric := 0;
  v_contagem int := 0;
  v_hora_ini int;
  v_hora_fim int;
  v_dias int[];
  v_pagar_cliente boolean;
BEGIN
  SELECT * INTO v_meta FROM public.garcom_metas WHERE id = _meta_id;
  IF NOT FOUND OR NOT v_meta.ativo THEN
    RETURN 0;
  END IF;

  IF v_meta.vigencia_inicio IS NOT NULL AND _periodo_ref < v_meta.vigencia_inicio THEN RETURN 0; END IF;
  IF v_meta.vigencia_fim IS NOT NULL AND _periodo_ref > v_meta.vigencia_fim THEN RETURN 0; END IF;

  SELECT * INTO v_range FROM public.periodo_range(v_meta.periodo, _periodo_ref);

  SELECT COALESCE(comissao_pedido_cliente, true) INTO v_pagar_cliente
    FROM public.restaurantes WHERE id = v_meta.restaurante_id;

  IF v_meta.tipo = 'faturamento' THEN
    SELECT COALESCE(SUM(p.total), 0) INTO v_base
    FROM public.pedidos p
    WHERE p.restaurante_id = v_meta.restaurante_id
      AND p.status = 'entregue'
      AND p.criado_em >= v_range.inicio
      AND p.criado_em < v_range.fim
      AND (v_pagar_cliente OR p.garcom_id IS NOT NULL)
      AND (p.garcom_id = v_meta.garcom_id
           OR EXISTS (SELECT 1 FROM public.pedido_garcons pg
                      WHERE pg.pedido_id = p.id AND pg.garcom_id = v_meta.garcom_id));
    IF v_base >= v_meta.alvo AND v_meta.alvo > 0 THEN
      v_valor := COALESCE(v_meta.bonus_valor, 0) + round(v_base * COALESCE(v_meta.bonus_percentual,0) / 100.0, 2);
    END IF;
  ELSIF v_meta.tipo = 'pedidos' THEN
    SELECT COUNT(*) INTO v_contagem
    FROM public.pedidos p
    WHERE p.restaurante_id = v_meta.restaurante_id
      AND p.status = 'entregue'
      AND p.criado_em >= v_range.inicio
      AND p.criado_em < v_range.fim
      AND (v_pagar_cliente OR p.garcom_id IS NOT NULL)
      AND (p.garcom_id = v_meta.garcom_id
           OR EXISTS (SELECT 1 FROM public.pedido_garcons pg
                      WHERE pg.pedido_id = p.id AND pg.garcom_id = v_meta.garcom_id));
    IF v_contagem >= v_meta.alvo AND v_meta.alvo > 0 THEN
      v_valor := COALESCE(v_meta.bonus_valor, 0);
    END IF;
  ELSIF v_meta.tipo = 'horario' THEN
    v_hora_ini := COALESCE((v_meta.regras_json->>'hora_inicio')::int, 0);
    v_hora_fim := COALESCE((v_meta.regras_json->>'hora_fim')::int, 24);
    v_dias := CASE WHEN v_meta.regras_json ? 'dias_semana'
                   THEN ARRAY(SELECT jsonb_array_elements_text(v_meta.regras_json->'dias_semana')::int)
                   ELSE NULL END;

    SELECT COALESCE(SUM(c.valor_comissao), 0) INTO v_base
    FROM public.comissoes c
    JOIN public.pedidos p ON p.id = c.pedido_id
    WHERE c.restaurante_id = v_meta.restaurante_id
      AND c.garcom_id = v_meta.garcom_id
      AND p.criado_em >= v_range.inicio
      AND p.criado_em < v_range.fim
      AND EXTRACT(HOUR FROM p.criado_em)::int >= v_hora_ini
      AND EXTRACT(HOUR FROM p.criado_em)::int < v_hora_fim
      AND (v_dias IS NULL OR EXTRACT(DOW FROM p.criado_em)::int = ANY(v_dias));

    v_valor := round(v_base * COALESCE(v_meta.bonus_percentual,0) / 100.0, 2)
             + COALESCE(v_meta.bonus_valor, 0) * (CASE WHEN v_base > 0 THEN 1 ELSE 0 END);
  END IF;

  RETURN COALESCE(v_valor, 0);
END;
$function$;
