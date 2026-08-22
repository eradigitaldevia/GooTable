REVOKE ALL ON FUNCTION public.trg_pedido_recalc_comanda() FROM anon, authenticated;

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

  -- Base: taxa de serviço efetivamente paga (comanda quitada = taxa integral;
  -- pagamento parcial = proporcional ao que foi pago).
  IF COALESCE(v_total, 0) <= 0 THEN
    v_taxa_paga := 0;
  ELSIF COALESCE(v_total_pago, 0) >= v_total THEN
    v_taxa_paga := v_taxa_total;
  ELSE
    v_taxa_paga := ROUND(v_taxa_total * COALESCE(v_total_pago,0) / v_total, 2);
  END IF;

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
    ON CONFLICT (comanda_id, garcom_id) DO UPDATE
      SET valor_taxa_total = EXCLUDED.valor_taxa_total,
          percentual_repasse = EXCLUDED.percentual_repasse,
          peso = EXCLUDED.peso,
          valor_repasse = EXCLUDED.valor_repasse,
          calculado_em = now()
      WHERE public.comissoes_taxa_servico.status = 'pendente';
  END LOOP;
END;
$function$;