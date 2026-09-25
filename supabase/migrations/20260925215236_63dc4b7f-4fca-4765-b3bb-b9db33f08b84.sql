
CREATE TABLE public.categorias_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('receita','despesa')),
  nome text NOT NULL,
  icone text,
  cor text,
  padrao boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurante_id, tipo, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_financeiras TO authenticated;
GRANT ALL ON public.categorias_financeiras TO service_role;
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_cat_membros" ON public.categorias_financeiras FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE TABLE public.fornecedores_financeiro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cnpj_cpf text,
  telefone text,
  email text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores_financeiro TO authenticated;
GRANT ALL ON public.fornecedores_financeiro TO service_role;
ALTER TABLE public.fornecedores_financeiro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_forn_membros" ON public.fornecedores_financeiro FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE TABLE public.lancamentos_financeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('pagar','receber')),
  descricao text NOT NULL,
  categoria_id uuid REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL,
  fornecedor_id uuid REFERENCES public.fornecedores_financeiro(id) ON DELETE SET NULL,
  valor numeric(12,2) NOT NULL CHECK (valor > 0),
  data_vencimento date NOT NULL,
  data_competencia date NOT NULL,
  data_pagamento date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','cancelado')),
  forma_pagamento text,
  comprovante_url text,
  observacao text,
  origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','caixa_sangria','comissao','couvert','faturamento')),
  referencia_id uuid,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX lanc_fin_origem_ref_uk ON public.lancamentos_financeiros (origem, referencia_id) WHERE referencia_id IS NOT NULL;
CREATE INDEX lanc_fin_rest_venc_idx ON public.lancamentos_financeiros (restaurante_id, data_vencimento);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos_financeiros TO authenticated;
GRANT ALL ON public.lancamentos_financeiros TO service_role;
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_lanc_membros" ON public.lancamentos_financeiros FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_fin_cat_touch BEFORE UPDATE ON public.categorias_financeiras FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();
CREATE TRIGGER trg_fin_forn_touch BEFORE UPDATE ON public.fornecedores_financeiro FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();
CREATE TRIGGER trg_fin_lanc_touch BEFORE UPDATE ON public.lancamentos_financeiros FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- Categorias padrão
CREATE OR REPLACE FUNCTION public.seed_categorias_financeiras(_restaurante_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.categorias_financeiras (restaurante_id, tipo, nome, padrao)
  SELECT _restaurante_id, t.tipo, t.nome, true FROM (VALUES
    ('despesa','Insumos & CMV'),('despesa','Equipe & Pessoal'),('despesa','Aluguel & Ocupação'),
    ('despesa','Serviços & Utilidades'),('despesa','Taxas & Impostos'),('despesa','Marketing & Divulgação'),
    ('despesa','Manutenção & Outros'),
    ('receita','Vendas Restaurante & Delivery'),('receita','Serviços & Taxas'),('receita','Aportes / Outras Receitas')
  ) AS t(tipo, nome)
  ON CONFLICT (restaurante_id, tipo, nome) DO NOTHING;
$$;
REVOKE EXECUTE ON FUNCTION public.seed_categorias_financeiras(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_seed_categorias_financeiras()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.seed_categorias_financeiras(NEW.id); RETURN NEW; END; $$;
REVOKE EXECUTE ON FUNCTION public.trg_seed_categorias_financeiras() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_restaurante_seed_cat_fin AFTER INSERT ON public.restaurantes FOR EACH ROW EXECUTE FUNCTION public.trg_seed_categorias_financeiras();

SELECT public.seed_categorias_financeiras(id) FROM public.restaurantes;

CREATE OR REPLACE FUNCTION public.fin_assert_acesso(_restaurante_id uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_restaurante_membro(auth.uid(), _restaurante_id) OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Sem acesso a este restaurante';
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.fin_assert_acesso(uuid) FROM PUBLIC, anon;

-- Resumo
CREATE OR REPLACE FUNCTION public.obter_resumo_financeiro(_restaurante_id uuid, _inicio date, _fim date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; r jsonb;
BEGIN
  PERFORM public.fin_assert_acesso(_restaurante_id);
  SELECT jsonb_build_object(
    'a_pagar', COALESCE(SUM(valor) FILTER (WHERE tipo='pagar' AND status='pendente' AND data_vencimento BETWEEN _inicio AND _fim),0),
    'a_receber', COALESCE(SUM(valor) FILTER (WHERE tipo='receber' AND status='pendente' AND data_vencimento BETWEEN _inicio AND _fim),0),
    'pago', COALESCE(SUM(valor) FILTER (WHERE tipo='pagar' AND status='pago' AND data_pagamento BETWEEN _inicio AND _fim),0),
    'recebido', COALESCE(SUM(valor) FILTER (WHERE tipo='receber' AND status='pago' AND data_pagamento BETWEEN _inicio AND _fim),0),
    'vencidos_pagar', COALESCE(SUM(valor) FILTER (WHERE tipo='pagar' AND status='pendente' AND data_vencimento < v_hoje),0),
    'vencidos_receber', COALESCE(SUM(valor) FILTER (WHERE tipo='receber' AND status='pendente' AND data_vencimento < v_hoje),0),
    'qtd_vencidos', COUNT(*) FILTER (WHERE status='pendente' AND data_vencimento < v_hoje),
    'a_pagar_hoje', COALESCE(SUM(valor) FILTER (WHERE tipo='pagar' AND status='pendente' AND data_vencimento = v_hoje),0),
    'a_pagar_semana', COALESCE(SUM(valor) FILTER (WHERE tipo='pagar' AND status='pendente' AND data_vencimento BETWEEN v_hoje AND v_hoje+7),0)
  ) INTO r FROM public.lancamentos_financeiros WHERE restaurante_id = _restaurante_id;
  r := r || jsonb_build_object('faturamento', (
    SELECT COALESCE(SUM(valor),0) FROM public.pagamentos
    WHERE restaurante_id=_restaurante_id AND status='confirmado'
      AND (COALESCE(confirmado_em, criado_em) AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN _inicio AND _fim));
  r := r || jsonb_build_object('saldo_periodo',
    (r->>'faturamento')::numeric + (r->>'recebido')::numeric - (r->>'pago')::numeric);
  RETURN r;
END; $$;

-- DRE
CREATE OR REPLACE FUNCTION public.obter_dre_gerencial(_restaurante_id uuid, _inicio date, _fim date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_vendas numeric; v_outras numeric; v_deducoes numeric; v_cmv numeric; v_desp jsonb; v_desp_total numeric; v_rec_cat jsonb;
BEGIN
  PERFORM public.fin_assert_acesso(_restaurante_id);
  SELECT COALESCE(SUM(valor),0) INTO v_vendas FROM public.pagamentos
    WHERE restaurante_id=_restaurante_id AND status='confirmado'
      AND (COALESCE(confirmado_em, criado_em) AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN _inicio AND _fim;
  SELECT COALESCE(SUM(l.valor),0),
    COALESCE(jsonb_agg(jsonb_build_object('categoria', x.nome, 'valor', x.total)) FILTER (WHERE x.nome IS NOT NULL),'[]'::jsonb)
  INTO v_outras, v_rec_cat FROM (SELECT 1) d
  LEFT JOIN LATERAL (
    SELECT COALESCE(c.nome,'Sem categoria') nome, SUM(l2.valor) total FROM public.lancamentos_financeiros l2
    LEFT JOIN public.categorias_financeiras c ON c.id=l2.categoria_id
    WHERE l2.restaurante_id=_restaurante_id AND l2.tipo='receber' AND l2.status<>'cancelado'
      AND l2.data_competencia BETWEEN _inicio AND _fim GROUP BY 1) x ON true
  LEFT JOIN LATERAL (SELECT x.total AS valor) l ON true;
  SELECT COALESCE(SUM(valor),0) INTO v_deducoes FROM public.lancamentos_financeiros
    WHERE restaurante_id=_restaurante_id AND tipo='pagar' AND status<>'cancelado'
      AND origem IN ('comissao','couvert') AND data_competencia BETWEEN _inicio AND _fim;
  SELECT COALESCE(SUM(l.valor),0) INTO v_cmv FROM public.lancamentos_financeiros l
    JOIN public.categorias_financeiras c ON c.id=l.categoria_id
    WHERE l.restaurante_id=_restaurante_id AND l.tipo='pagar' AND l.status<>'cancelado'
      AND l.origem NOT IN ('comissao','couvert') AND c.nome='Insumos & CMV' AND l.data_competencia BETWEEN _inicio AND _fim;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('categoria', nome, 'valor', total) ORDER BY total DESC),'[]'::jsonb), COALESCE(SUM(total),0)
  INTO v_desp, v_desp_total FROM (
    SELECT COALESCE(c.nome,'Sem categoria') nome, SUM(l.valor) total FROM public.lancamentos_financeiros l
    LEFT JOIN public.categorias_financeiras c ON c.id=l.categoria_id
    WHERE l.restaurante_id=_restaurante_id AND l.tipo='pagar' AND l.status<>'cancelado'
      AND l.origem NOT IN ('comissao','couvert') AND COALESCE(c.nome,'')<>'Insumos & CMV'
      AND l.data_competencia BETWEEN _inicio AND _fim GROUP BY 1) s;
  RETURN jsonb_build_object(
    'receita_vendas', v_vendas, 'outras_receitas', v_outras, 'receitas_categorias', v_rec_cat,
    'receita_bruta', v_vendas + v_outras, 'deducoes', v_deducoes,
    'receita_liquida', v_vendas + v_outras - v_deducoes, 'cmv', v_cmv,
    'margem_contribuicao', v_vendas + v_outras - v_deducoes - v_cmv,
    'despesas_operacionais', v_desp, 'total_despesas_operacionais', v_desp_total,
    'resultado_liquido', v_vendas + v_outras - v_deducoes - v_cmv - v_desp_total);
END; $$;

-- Fluxo de caixa
CREATE OR REPLACE FUNCTION public.obter_fluxo_caixa(_restaurante_id uuid, _inicio date, _fim date, _agrupamento text DEFAULT 'dia')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_trunc text := CASE WHEN _agrupamento='mes' THEN 'month' ELSE 'day' END; r jsonb;
BEGIN
  PERFORM public.fin_assert_acesso(_restaurante_id);
  WITH base AS (
    SELECT date_trunc(v_trunc, data_vencimento)::date p, tipo, valor, 'previsto' k FROM public.lancamentos_financeiros
      WHERE restaurante_id=_restaurante_id AND status<>'cancelado' AND data_vencimento BETWEEN _inicio AND _fim
    UNION ALL
    SELECT date_trunc(v_trunc, data_pagamento)::date, tipo, valor, 'realizado' FROM public.lancamentos_financeiros
      WHERE restaurante_id=_restaurante_id AND status='pago' AND data_pagamento BETWEEN _inicio AND _fim
    UNION ALL
    SELECT date_trunc(v_trunc, (COALESCE(confirmado_em, criado_em) AT TIME ZONE 'America/Sao_Paulo')::date)::date, 'receber', valor, x.k
      FROM public.pagamentos CROSS JOIN (VALUES ('previsto'),('realizado')) x(k)
      WHERE restaurante_id=_restaurante_id AND status='confirmado'
        AND (COALESCE(confirmado_em, criado_em) AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN _inicio AND _fim
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'periodo', p,
    'entradas_previstas', ep, 'saidas_previstas', sp, 'entradas_realizadas', er, 'saidas_realizadas', sr,
    'saldo_previsto', ep - sp, 'saldo_realizado', er - sr) ORDER BY p), '[]'::jsonb) INTO r
  FROM (SELECT p,
    COALESCE(SUM(valor) FILTER (WHERE tipo='receber' AND k='previsto'),0) ep,
    COALESCE(SUM(valor) FILTER (WHERE tipo='pagar' AND k='previsto'),0) sp,
    COALESCE(SUM(valor) FILTER (WHERE tipo='receber' AND k='realizado'),0) er,
    COALESCE(SUM(valor) FILTER (WHERE tipo='pagar' AND k='realizado'),0) sr
    FROM base GROUP BY p) g;
  RETURN r;
END; $$;

-- Integração
CREATE OR REPLACE FUNCTION public.integrar_repasses_caixa_financeiro(_restaurante_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n integer := 0; v_c integer; v_cat_outros uuid; v_cat_equipe uuid; v_cat_serv uuid;
BEGIN
  PERFORM public.fin_assert_acesso(_restaurante_id);
  PERFORM public.seed_categorias_financeiras(_restaurante_id);
  SELECT id INTO v_cat_outros FROM public.categorias_financeiras WHERE restaurante_id=_restaurante_id AND tipo='despesa' AND nome='Manutenção & Outros';
  SELECT id INTO v_cat_equipe FROM public.categorias_financeiras WHERE restaurante_id=_restaurante_id AND tipo='despesa' AND nome='Equipe & Pessoal';
  SELECT id INTO v_cat_serv FROM public.categorias_financeiras WHERE restaurante_id=_restaurante_id AND tipo='despesa' AND nome='Serviços & Utilidades';

  INSERT INTO public.lancamentos_financeiros (restaurante_id,tipo,descricao,categoria_id,valor,data_vencimento,data_competencia,data_pagamento,status,forma_pagamento,origem,referencia_id,criado_por)
  SELECT _restaurante_id,'pagar','Sangria de caixa' || COALESCE(' — '||m.motivo,''), v_cat_outros, m.valor,
    (m.criado_em AT TIME ZONE 'America/Sao_Paulo')::date,(m.criado_em AT TIME ZONE 'America/Sao_Paulo')::date,(m.criado_em AT TIME ZONE 'America/Sao_Paulo')::date,
    'pago','dinheiro','caixa_sangria',m.id,auth.uid()
  FROM public.movimentos_caixa m WHERE m.restaurante_id=_restaurante_id AND m.tipo='sangria' AND m.valor>0
  ON CONFLICT (origem, referencia_id) WHERE referencia_id IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;

  INSERT INTO public.lancamentos_financeiros (restaurante_id,tipo,descricao,categoria_id,valor,data_vencimento,data_competencia,data_pagamento,status,origem,referencia_id,criado_por)
  SELECT _restaurante_id,'pagar','Comissão garçom — '||g.nome, v_cat_equipe, c.valor_comissao,
    (c.pago_em AT TIME ZONE 'America/Sao_Paulo')::date,(c.calculado_em AT TIME ZONE 'America/Sao_Paulo')::date,(c.pago_em AT TIME ZONE 'America/Sao_Paulo')::date,
    'pago','comissao',c.id,auth.uid()
  FROM public.comissoes c JOIN public.garcons g ON g.id=c.garcom_id
  WHERE c.restaurante_id=_restaurante_id AND c.status='pago' AND c.pago_em IS NOT NULL AND c.valor_comissao>0
  ON CONFLICT (origem, referencia_id) WHERE referencia_id IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;

  INSERT INTO public.lancamentos_financeiros (restaurante_id,tipo,descricao,categoria_id,valor,data_vencimento,data_competencia,data_pagamento,status,origem,referencia_id,criado_por)
  SELECT _restaurante_id,'pagar','Repasse taxa de serviço — '||g.nome, v_cat_equipe, c.valor_repasse,
    (c.pago_em AT TIME ZONE 'America/Sao_Paulo')::date,(c.calculado_em AT TIME ZONE 'America/Sao_Paulo')::date,(c.pago_em AT TIME ZONE 'America/Sao_Paulo')::date,
    'pago','comissao',c.id,auth.uid()
  FROM public.comissoes_taxa_servico c JOIN public.garcons g ON g.id=c.garcom_id
  WHERE c.restaurante_id=_restaurante_id AND c.status='pago' AND c.pago_em IS NOT NULL AND c.valor_repasse>0
  ON CONFLICT (origem, referencia_id) WHERE referencia_id IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;

  INSERT INTO public.lancamentos_financeiros (restaurante_id,tipo,descricao,categoria_id,valor,data_vencimento,data_competencia,data_pagamento,status,origem,referencia_id,criado_por)
  SELECT _restaurante_id,'pagar','Repasse couvert — '||a.nome, v_cat_serv, r.valor_repasse,
    (r.pago_em AT TIME ZONE 'America/Sao_Paulo')::date,(r.calculado_em AT TIME ZONE 'America/Sao_Paulo')::date,(r.pago_em AT TIME ZONE 'America/Sao_Paulo')::date,
    'pago','couvert',r.id,auth.uid()
  FROM public.repasses_couvert_artistico r JOIN public.artistas a ON a.id=r.artista_id
  WHERE r.restaurante_id=_restaurante_id AND r.status='pago' AND r.pago_em IS NOT NULL AND r.valor_repasse>0
  ON CONFLICT (origem, referencia_id) WHERE referencia_id IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;
  RETURN v_n;
END; $$;

REVOKE EXECUTE ON FUNCTION public.obter_resumo_financeiro(uuid,date,date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.obter_dre_gerencial(uuid,date,date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.obter_fluxo_caixa(uuid,date,date,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.integrar_repasses_caixa_financeiro(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obter_resumo_financeiro(uuid,date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_dre_gerencial(uuid,date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_fluxo_caixa(uuid,date,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.integrar_repasses_caixa_financeiro(uuid) TO authenticated;
