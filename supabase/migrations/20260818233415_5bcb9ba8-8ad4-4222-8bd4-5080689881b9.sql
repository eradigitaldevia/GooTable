ALTER TABLE public.comandas
  ADD COLUMN IF NOT EXISTS taxa_servico_valor numeric NOT NULL DEFAULT 0;

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
  SET total = v_liquido,
      taxa_servico_valor = v_taxa,
      atualizado_em = now()
  WHERE id = _comanda_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.recalcular_total_comanda(uuid) FROM PUBLIC, anon, authenticated;

-- Repasse da taxa usa o valor gravado na comanda
CREATE OR REPLACE FUNCTION public.gerar_repasse_taxa_servico(p_comanda_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_restaurante_id uuid;
  v_total numeric;
  v_total_pago numeric;
  v_taxa_hab boolean;
  v_taxa_perc numeric;
  v_repasse_hab boolean;
  v_repasse_perc numeric;
  v_taxa_total numeric;
  v_excedente numeric;
  v_taxa_paga numeric;
  v_valor_para_garcons numeric;
  v_peso_total numeric := 0;
  v_fallback_garcom uuid;
  r RECORD;
BEGIN
  SELECT c.restaurante_id, c.total, c.total_pago, c.taxa_servico_valor
    INTO v_restaurante_id, v_total, v_total_pago, v_taxa_total
  FROM public.comandas c
  WHERE c.id = p_comanda_id
  FOR UPDATE;

  IF v_restaurante_id IS NULL THEN RETURN; END IF;

  SELECT taxa_servico_habilitada, taxa_servico_percentual,
         taxa_servico_repasse_habilitado, taxa_servico_repasse_percentual
    INTO v_taxa_hab, v_taxa_perc, v_repasse_hab, v_repasse_perc
  FROM public.restaurantes WHERE id = v_restaurante_id;

  IF NOT COALESCE(v_taxa_hab, false) OR NOT COALESCE(v_repasse_hab, false) THEN
    RETURN;
  END IF;
  v_repasse_perc := COALESCE(v_repasse_perc, 0);
  IF v_repasse_perc <= 0 THEN RETURN; END IF;

  v_taxa_total := COALESCE(v_taxa_total, 0);
  IF v_taxa_total <= 0 THEN RETURN; END IF;

  v_excedente := GREATEST(COALESCE(v_total_pago, 0) - COALESCE(v_total, 0), 0);
  v_taxa_paga := LEAST(v_taxa_total, v_excedente);
  IF v_taxa_paga <= 0 THEN RETURN; END IF;

  v_valor_para_garcons := ROUND(v_taxa_paga * v_repasse_perc / 100.0, 2);
  IF v_valor_para_garcons <= 0 THEN RETURN; END IF;

  CREATE TEMP TABLE tmp_pesos (garcom_id uuid PRIMARY KEY, peso numeric) ON COMMIT DROP;
  INSERT INTO tmp_pesos (garcom_id, peso)
  SELECT pg.garcom_id, SUM(pg.peso)
  FROM public.pedido_garcons pg
  JOIN public.pedidos p ON p.id = pg.pedido_id
  WHERE p.comanda_id = p_comanda_id
  GROUP BY pg.garcom_id;

  SELECT COALESCE(SUM(peso), 0) INTO v_peso_total FROM tmp_pesos;

  IF v_peso_total = 0 THEN
    SELECT mg.garcom_id INTO v_fallback_garcom
    FROM public.mesa_garcom mg
    JOIN public.mesa_sessoes s ON s.mesa_id = mg.mesa_id
    JOIN public.comandas c ON c.sessao_id = s.id
    WHERE c.id = p_comanda_id
      AND mg.liberado_em IS NULL
    LIMIT 1;

    IF v_fallback_garcom IS NULL THEN RETURN; END IF;
    INSERT INTO tmp_pesos (garcom_id, peso) VALUES (v_fallback_garcom, 100);
    v_peso_total := 100;
  END IF;

  FOR r IN SELECT garcom_id, peso FROM tmp_pesos LOOP
    INSERT INTO public.comissoes_taxa_servico (
      restaurante_id, comanda_id, garcom_id,
      valor_taxa_total, percentual_repasse, peso, valor_repasse
    ) VALUES (
      v_restaurante_id, p_comanda_id, r.garcom_id,
      v_taxa_paga, v_repasse_perc, r.peso,
      ROUND(v_valor_para_garcons * r.peso / v_peso_total, 2)
    )
    ON CONFLICT (comanda_id, garcom_id) DO NOTHING;
  END LOOP;
END;
$function$;

-- Preenche a taxa nas comandas abertas existentes
UPDATE public.comandas c
SET taxa_servico_valor = CASE
      WHEN COALESCE(r.taxa_servico_habilitada, false) AND COALESCE(r.taxa_servico_percentual, 0) > 0
        THEN ROUND(GREATEST(COALESCE(c.subtotal,0) - COALESCE(c.cashback_resgatado,0) - COALESCE(c.desconto_cupom,0), 0) * r.taxa_servico_percentual / 100.0, 2)
      ELSE 0
    END
FROM public.restaurantes r
WHERE r.id = c.restaurante_id
  AND c.status = 'aberta';
