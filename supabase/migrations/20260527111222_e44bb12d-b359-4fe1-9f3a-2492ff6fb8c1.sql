-- 1) Coluna de modo de comissão no restaurante
ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS comissao_modo text NOT NULL DEFAULT 'pedido';

ALTER TABLE public.restaurantes
  DROP CONSTRAINT IF EXISTS restaurantes_comissao_modo_check;
ALTER TABLE public.restaurantes
  ADD CONSTRAINT restaurantes_comissao_modo_check
  CHECK (comissao_modo IN ('pedido','item'));

-- 2) Campos de comissão por produto
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS percentual_comissao numeric NULL,
  ADD COLUMN IF NOT EXISTS comissao_aplicavel boolean NOT NULL DEFAULT true;

ALTER TABLE public.produtos
  DROP CONSTRAINT IF EXISTS produtos_percentual_comissao_check;
ALTER TABLE public.produtos
  ADD CONSTRAINT produtos_percentual_comissao_check
  CHECK (percentual_comissao IS NULL OR (percentual_comissao >= 0 AND percentual_comissao <= 100));

-- 3) Trigger de geração de comissão com suporte a modo 'item'
CREATE OR REPLACE FUNCTION public.trg_pedido_gerar_comissao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_modo text;
  v_count int;
  v_percentual numeric;
  v_valor numeric;
  v_base numeric;
  r record;
BEGIN
  IF NEW.status = 'entregue' AND (OLD.status IS DISTINCT FROM 'entregue') THEN
    SELECT comissao_modo INTO v_modo FROM public.restaurantes WHERE id = NEW.restaurante_id;
    v_modo := COALESCE(v_modo, 'pedido');

    SELECT COUNT(*) INTO v_count FROM public.pedido_garcons WHERE pedido_id = NEW.id;

    IF v_modo = 'item' THEN
      -- Base por item (somatório considerando override por produto, fallback no % do garçom),
      -- limitada aos itens com comissao_aplicavel = true.
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
      -- Modo 'pedido' (comportamento existente)
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