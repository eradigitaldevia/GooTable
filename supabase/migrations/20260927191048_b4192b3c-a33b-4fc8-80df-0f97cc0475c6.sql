
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS estoque_ativo boolean NOT NULL DEFAULT false;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS estoque_bloqueado boolean NOT NULL DEFAULT false;

CREATE TABLE public.estoque_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  unidade text NOT NULL DEFAULT 'un' CHECK (unidade IN ('un','kg','g','L','ml')),
  custo_medio numeric NOT NULL DEFAULT 0 CHECK (custo_medio >= 0),
  saldo numeric NOT NULL DEFAULT 0,
  estoque_minimo numeric NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
  bloquear_ao_zerar boolean NOT NULL DEFAULT false,
  is_preparo boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurante_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_insumos TO authenticated;
GRANT ALL ON public.estoque_insumos TO service_role;
ALTER TABLE public.estoque_insumos ENABLE ROW LEVEL SECURITY;
CREATE POLICY estoque_insumos_membros ON public.estoque_insumos FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE TABLE public.estoque_fichas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE CASCADE,
  preparo_id uuid REFERENCES public.estoque_insumos(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.estoque_insumos(id) ON DELETE RESTRICT,
  quantidade numeric NOT NULL CHECK (quantidade > 0),
  criado_em timestamptz NOT NULL DEFAULT now(),
  CHECK ((produto_id IS NULL) <> (preparo_id IS NULL)),
  CHECK (preparo_id IS NULL OR preparo_id <> insumo_id),
  UNIQUE (produto_id, insumo_id),
  UNIQUE (preparo_id, insumo_id)
);
CREATE INDEX estoque_fichas_insumo_idx ON public.estoque_fichas(insumo_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_fichas TO authenticated;
GRANT ALL ON public.estoque_fichas TO service_role;
ALTER TABLE public.estoque_fichas ENABLE ROW LEVEL SECURITY;
CREATE POLICY estoque_fichas_membros ON public.estoque_fichas FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

CREATE TABLE public.estoque_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL REFERENCES public.restaurantes(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.estoque_insumos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida_venda','estorno','perda','ajuste','producao','inventario')),
  quantidade numeric NOT NULL,
  custo_unit numeric,
  saldo_apos numeric NOT NULL,
  pedido_id uuid,
  pedido_item_id uuid,
  fornecedor_id uuid REFERENCES public.fornecedores_financeiro(id) ON DELETE SET NULL,
  lancamento_id uuid REFERENCES public.lancamentos_financeiros(id) ON DELETE SET NULL,
  observacao text,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX estoque_mov_rest_idx ON public.estoque_movimentos(restaurante_id, criado_em DESC);
CREATE INDEX estoque_mov_item_idx ON public.estoque_movimentos(pedido_item_id) WHERE pedido_item_id IS NOT NULL;
GRANT SELECT ON public.estoque_movimentos TO authenticated;
GRANT ALL ON public.estoque_movimentos TO service_role;
ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY estoque_mov_select ON public.estoque_movimentos FOR SELECT TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

-- Protege saldo/custo: só alterados por funções internas
CREATE OR REPLACE FUNCTION public.estoque_insumos_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF COALESCE(current_setting('estoque.interno', true), '') <> '1' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.saldo := 0;
    ELSE
      NEW.saldo := OLD.saldo;
      NEW.custo_medio := CASE WHEN NEW.custo_medio IS DISTINCT FROM OLD.custo_medio AND OLD.saldo <= 0
                              THEN NEW.custo_medio ELSE OLD.custo_medio END;
      NEW.restaurante_id := OLD.restaurante_id;
    END IF;
  END IF;
  NEW.atualizado_em := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_estoque_insumos_guard BEFORE INSERT OR UPDATE ON public.estoque_insumos
FOR EACH ROW EXECUTE FUNCTION public.estoque_insumos_guard();

-- Recalcula bloqueio de produtos
CREATE OR REPLACE FUNCTION public.estoque_recalc_bloqueio(_restaurante_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ativo boolean;
BEGIN
  SELECT estoque_ativo INTO v_ativo FROM restaurantes WHERE id = _restaurante_id;
  UPDATE produtos p SET estoque_bloqueado = new_val
  FROM (
    SELECT p2.id, (COALESCE(v_ativo,false) AND EXISTS (
      SELECT 1 FROM estoque_fichas f JOIN estoque_insumos i ON i.id = f.insumo_id
      WHERE f.produto_id = p2.id AND i.ativo AND i.bloquear_ao_zerar AND i.saldo < f.quantidade
    )) AS new_val
    FROM produtos p2 WHERE p2.restaurante_id = _restaurante_id
  ) x
  WHERE p.id = x.id AND p.estoque_bloqueado IS DISTINCT FROM x.new_val;
END $$;

CREATE OR REPLACE FUNCTION public.trg_estoque_recalc() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM estoque_recalc_bloqueio(COALESCE(NEW.restaurante_id, OLD.restaurante_id));
  RETURN NULL;
END $$;
CREATE TRIGGER trg_estoque_insumos_recalc AFTER INSERT OR UPDATE OR DELETE ON public.estoque_insumos
FOR EACH ROW EXECUTE FUNCTION public.trg_estoque_recalc();
CREATE TRIGGER trg_estoque_fichas_recalc AFTER INSERT OR UPDATE OR DELETE ON public.estoque_fichas
FOR EACH ROW EXECUTE FUNCTION public.trg_estoque_recalc();

CREATE OR REPLACE FUNCTION public.trg_restaurante_estoque_toggle() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.estoque_ativo IS DISTINCT FROM OLD.estoque_ativo THEN
    PERFORM estoque_recalc_bloqueio(NEW.id);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_restaurante_estoque_toggle AFTER UPDATE OF estoque_ativo ON public.restaurantes
FOR EACH ROW EXECUTE FUNCTION public.trg_restaurante_estoque_toggle();

-- Movimento interno (não exposto)
CREATE OR REPLACE FUNCTION public.estoque_mov_interno(
  _insumo_id uuid, _tipo text, _qtd numeric, _custo_unit numeric,
  _pedido_id uuid, _item_id uuid, _obs text, _fornecedor_id uuid, _lancamento_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_i estoque_insumos%ROWTYPE; v_novo_custo numeric; v_id uuid; v_base numeric;
BEGIN
  SELECT * INTO v_i FROM estoque_insumos WHERE id = _insumo_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insumo nao encontrado'; END IF;
  v_novo_custo := v_i.custo_medio;
  IF _qtd > 0 AND _custo_unit IS NOT NULL AND _tipo IN ('entrada','producao') THEN
    v_base := GREATEST(v_i.saldo, 0);
    v_novo_custo := round((v_base * v_i.custo_medio + _qtd * _custo_unit) / NULLIF(v_base + _qtd, 0), 4);
  END IF;
  PERFORM set_config('estoque.interno', '1', true);
  UPDATE estoque_insumos SET saldo = saldo + _qtd, custo_medio = COALESCE(v_novo_custo, custo_medio)
  WHERE id = _insumo_id;
  PERFORM set_config('estoque.interno', '0', true);
  INSERT INTO estoque_movimentos (restaurante_id, insumo_id, tipo, quantidade, custo_unit, saldo_apos,
    pedido_id, pedido_item_id, fornecedor_id, lancamento_id, observacao, criado_por)
  VALUES (v_i.restaurante_id, _insumo_id, _tipo, _qtd, COALESCE(_custo_unit, v_i.custo_medio), v_i.saldo + _qtd,
    _pedido_id, _item_id, _fornecedor_id, _lancamento_id, _obs, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.estoque_mov_interno(uuid,text,numeric,numeric,uuid,uuid,text,uuid,uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.estoque_estornar_item(_item_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT insumo_id, max(pedido_id::text)::uuid AS pedido_id, sum(quantidade) AS net
    FROM estoque_movimentos
    WHERE pedido_item_id = _item_id AND tipo IN ('saida_venda','estorno')
    GROUP BY insumo_id HAVING sum(quantidade) < 0
  LOOP
    PERFORM estoque_mov_interno(r.insumo_id, 'estorno', -r.net, NULL, r.pedido_id, _item_id, 'Estorno por cancelamento', NULL, NULL);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.estoque_estornar_item(uuid) FROM PUBLIC, anon, authenticated;

-- Triggers de pedido
CREATE OR REPLACE FUNCTION public.trg_pedido_item_estoque_validar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rest uuid; v_ativo boolean; r record;
BEGIN
  SELECT p.restaurante_id, rs.estoque_ativo INTO v_rest, v_ativo
  FROM pedidos p JOIN restaurantes rs ON rs.id = p.restaurante_id WHERE p.id = NEW.pedido_id;
  IF NOT COALESCE(v_ativo, false) THEN RETURN NEW; END IF;
  FOR r IN
    SELECT i.nome FROM estoque_fichas f JOIN estoque_insumos i ON i.id = f.insumo_id
    WHERE f.produto_id = NEW.produto_id AND i.ativo AND i.bloquear_ao_zerar
      AND i.saldo < f.quantidade * NEW.quantidade
  LOOP
    RAISE EXCEPTION 'Produto % indisponivel: estoque insuficiente', NEW.nome_produto;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_pedido_item_estoque_validar BEFORE INSERT ON public.pedido_itens
FOR EACH ROW EXECUTE FUNCTION public.trg_pedido_item_estoque_validar();

CREATE OR REPLACE FUNCTION public.trg_pedido_item_estoque_baixar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ativo boolean; r record;
BEGIN
  SELECT rs.estoque_ativo INTO v_ativo
  FROM pedidos p JOIN restaurantes rs ON rs.id = p.restaurante_id WHERE p.id = NEW.pedido_id;
  IF NOT COALESCE(v_ativo, false) THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM estoque_movimentos WHERE pedido_item_id = NEW.id AND tipo = 'saida_venda') THEN
    RETURN NULL;
  END IF;
  FOR r IN
    SELECT f.insumo_id, f.quantidade FROM estoque_fichas f JOIN estoque_insumos i ON i.id = f.insumo_id
    WHERE f.produto_id = NEW.produto_id AND i.ativo ORDER BY f.insumo_id
  LOOP
    PERFORM estoque_mov_interno(r.insumo_id, 'saida_venda', -(r.quantidade * NEW.quantidade), NULL,
      NEW.pedido_id, NEW.id, NULL, NULL, NULL);
  END LOOP;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_pedido_item_estoque_baixar AFTER INSERT ON public.pedido_itens
FOR EACH ROW EXECUTE FUNCTION public.trg_pedido_item_estoque_baixar();

CREATE OR REPLACE FUNCTION public.trg_pedido_item_estoque_estornar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM estoque_estornar_item(OLD.id);
  RETURN NULL;
END $$;
CREATE TRIGGER trg_pedido_item_estoque_estornar AFTER DELETE ON public.pedido_itens
FOR EACH ROW EXECUTE FUNCTION public.trg_pedido_item_estoque_estornar();

CREATE OR REPLACE FUNCTION public.trg_pedido_estoque_cancelado() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NEW.status = 'cancelado' AND OLD.status IS DISTINCT FROM 'cancelado' THEN
    FOR r IN SELECT id FROM pedido_itens WHERE pedido_id = NEW.id LOOP
      PERFORM estoque_estornar_item(r.id);
    END LOOP;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_pedido_estoque_cancelado AFTER UPDATE OF status ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.trg_pedido_estoque_cancelado();

-- RPCs públicas (autenticadas)
CREATE OR REPLACE FUNCTION public.estoque_assert_acesso(_restaurante_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (is_restaurante_membro(auth.uid(), _restaurante_id) OR is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.estoque_registrar_movimento(
  _insumo_id uuid, _tipo text, _quantidade numeric, _custo_unit numeric DEFAULT NULL,
  _fornecedor_id uuid DEFAULT NULL, _observacao text DEFAULT NULL,
  _gerar_conta boolean DEFAULT false, _vencimento date DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_i estoque_insumos%ROWTYPE; v_qtd numeric; v_lanc uuid;
BEGIN
  SELECT * INTO v_i FROM estoque_insumos WHERE id = _insumo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insumo nao encontrado'; END IF;
  PERFORM estoque_assert_acesso(v_i.restaurante_id);
  IF _tipo NOT IN ('entrada','perda','ajuste') THEN RAISE EXCEPTION 'Tipo invalido'; END IF;
  IF _quantidade IS NULL OR _quantidade = 0 THEN RAISE EXCEPTION 'Quantidade invalida'; END IF;
  IF _tipo IN ('entrada','perda') AND _quantidade < 0 THEN RAISE EXCEPTION 'Quantidade deve ser positiva'; END IF;
  IF _custo_unit IS NOT NULL AND _custo_unit < 0 THEN RAISE EXCEPTION 'Custo invalido'; END IF;
  v_qtd := CASE WHEN _tipo = 'perda' THEN -_quantidade ELSE _quantidade END;

  IF _tipo = 'entrada' AND _gerar_conta AND COALESCE(_custo_unit,0) > 0 THEN
    INSERT INTO lancamentos_financeiros (restaurante_id, tipo, descricao, fornecedor_id, valor,
      data_vencimento, data_competencia, status, origem, criado_por)
    VALUES (v_i.restaurante_id, 'pagar', 'Compra de estoque: ' || v_i.nome, _fornecedor_id,
      round(_quantidade * _custo_unit, 2), COALESCE(_vencimento, current_date), current_date,
      'pendente', 'manual', auth.uid())
    RETURNING id INTO v_lanc;
  END IF;

  RETURN estoque_mov_interno(_insumo_id, _tipo, v_qtd, CASE WHEN _tipo='entrada' THEN _custo_unit END,
    NULL, NULL, NULLIF(btrim(COALESCE(_observacao,'')),''), _fornecedor_id, v_lanc);
END $$;

CREATE OR REPLACE FUNCTION public.estoque_produzir_preparo(_preparo_id uuid, _quantidade numeric, _observacao text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p estoque_insumos%ROWTYPE; r record; v_custo numeric := 0; v_n int := 0;
BEGIN
  SELECT * INTO v_p FROM estoque_insumos WHERE id = _preparo_id;
  IF NOT FOUND OR NOT v_p.is_preparo THEN RAISE EXCEPTION 'Preparo nao encontrado'; END IF;
  PERFORM estoque_assert_acesso(v_p.restaurante_id);
  IF _quantidade IS NULL OR _quantidade <= 0 THEN RAISE EXCEPTION 'Quantidade invalida'; END IF;
  FOR r IN
    SELECT f.insumo_id, f.quantidade, i.custo_medio FROM estoque_fichas f
    JOIN estoque_insumos i ON i.id = f.insumo_id WHERE f.preparo_id = _preparo_id ORDER BY f.insumo_id
  LOOP
    v_n := v_n + 1;
    v_custo := v_custo + r.custo_medio * r.quantidade * _quantidade;
    PERFORM estoque_mov_interno(r.insumo_id, 'producao', -(r.quantidade * _quantidade), NULL, NULL, NULL,
      'Consumo na producao de ' || v_p.nome, NULL, NULL);
  END LOOP;
  IF v_n = 0 THEN RAISE EXCEPTION 'Preparo sem ficha tecnica'; END IF;
  PERFORM estoque_mov_interno(_preparo_id, 'producao', _quantidade, v_custo / _quantidade, NULL, NULL,
    NULLIF(btrim(COALESCE(_observacao,'')),''), NULL, NULL);
END $$;

CREATE OR REPLACE FUNCTION public.estoque_aplicar_inventario(_restaurante_id uuid, _itens jsonb, _observacao text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_saldo numeric; v_n int := 0;
BEGIN
  PERFORM estoque_assert_acesso(_restaurante_id);
  FOR r IN SELECT (e->>'insumo_id')::uuid AS insumo_id, (e->>'contagem')::numeric AS contagem
           FROM jsonb_array_elements(COALESCE(_itens,'[]'::jsonb)) e
  LOOP
    IF r.contagem IS NULL OR r.contagem < 0 THEN RAISE EXCEPTION 'Contagem invalida'; END IF;
    SELECT saldo INTO v_saldo FROM estoque_insumos WHERE id = r.insumo_id AND restaurante_id = _restaurante_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insumo invalido'; END IF;
    IF r.contagem <> v_saldo THEN
      PERFORM estoque_mov_interno(r.insumo_id, 'inventario', r.contagem - v_saldo, NULL, NULL, NULL,
        COALESCE(NULLIF(btrim(COALESCE(_observacao,'')),''), 'Inventario'), NULL, NULL);
      v_n := v_n + 1;
    END IF;
  END LOOP;
  RETURN v_n;
END $$;

CREATE OR REPLACE FUNCTION public.estoque_resumo(_restaurante_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  PERFORM estoque_assert_acesso(_restaurante_id);
  SELECT jsonb_build_object(
    'total_insumos', count(*),
    'abaixo_minimo', count(*) FILTER (WHERE saldo > 0 AND saldo <= estoque_minimo),
    'zerados', count(*) FILTER (WHERE saldo <= 0),
    'valor_total', COALESCE(round(sum(GREATEST(saldo,0) * custo_medio), 2), 0),
    'produtos_bloqueados', (SELECT count(*) FROM produtos WHERE restaurante_id = _restaurante_id AND estoque_bloqueado),
    'alertas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', a.id, 'nome', a.nome, 'unidade', a.unidade, 'saldo', a.saldo,
        'estoque_minimo', a.estoque_minimo, 'bloquear_ao_zerar', a.bloquear_ao_zerar) ORDER BY a.saldo)
      FROM estoque_insumos a
      WHERE a.restaurante_id = _restaurante_id AND a.ativo AND a.saldo <= a.estoque_minimo
    ), '[]'::jsonb)
  ) INTO v
  FROM estoque_insumos WHERE restaurante_id = _restaurante_id AND ativo;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.estoque_custo_produtos(_restaurante_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM estoque_assert_acesso(_restaurante_id);
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('produto_id', p.id, 'custo', c.custo, 'preco', p.preco,
      'margem', CASE WHEN p.preco > 0 THEN round((p.preco - c.custo) / p.preco * 100, 1) END))
    FROM produtos p
    JOIN (SELECT f.produto_id, round(sum(f.quantidade * i.custo_medio), 2) AS custo
          FROM estoque_fichas f JOIN estoque_insumos i ON i.id = f.insumo_id
          WHERE f.restaurante_id = _restaurante_id AND f.produto_id IS NOT NULL
          GROUP BY f.produto_id) c ON c.produto_id = p.id
  ), '[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.estoque_recalc_bloqueio(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.estoque_assert_acesso(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.estoque_registrar_movimento(uuid,text,numeric,numeric,uuid,text,boolean,date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.estoque_produzir_preparo(uuid,numeric,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.estoque_aplicar_inventario(uuid,jsonb,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.estoque_resumo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.estoque_custo_produtos(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estoque_registrar_movimento(uuid,text,numeric,numeric,uuid,text,boolean,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estoque_produzir_preparo(uuid,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estoque_aplicar_inventario(uuid,jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estoque_resumo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estoque_custo_produtos(uuid) TO authenticated;
