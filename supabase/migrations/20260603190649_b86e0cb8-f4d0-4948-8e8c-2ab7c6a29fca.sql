
-- =========================================================
-- 1) Tabela garcom_turnos
-- =========================================================
CREATE TABLE IF NOT EXISTS public.garcom_turnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL,
  garcom_id uuid NOT NULL,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  encerrado_em timestamptz,
  iniciado_por uuid,
  encerrado_por uuid,
  encerrado_auto boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.garcom_turnos TO authenticated;
GRANT ALL ON public.garcom_turnos TO service_role;

ALTER TABLE public.garcom_turnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY garcom_turnos_rw_membro ON public.garcom_turnos
  FOR ALL TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

-- Apenas um turno aberto por garçom
CREATE UNIQUE INDEX IF NOT EXISTS garcom_turnos_um_aberto
  ON public.garcom_turnos(garcom_id)
  WHERE encerrado_em IS NULL;

CREATE INDEX IF NOT EXISTS garcom_turnos_restaurante_aberto
  ON public.garcom_turnos(restaurante_id)
  WHERE encerrado_em IS NULL;

-- =========================================================
-- 2) RPCs: abrir, encerrar, encerrar expirados
-- =========================================================
CREATE OR REPLACE FUNCTION public.abrir_turno_garcom(_garcom_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rest uuid;
  v_id uuid;
BEGIN
  SELECT restaurante_id INTO v_rest
  FROM public.garcons
  WHERE id = _garcom_id AND ativo = true;
  IF v_rest IS NULL THEN
    RAISE EXCEPTION 'garcom_invalido';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_rest) OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Se já existe turno aberto, devolve o existente
  SELECT id INTO v_id FROM public.garcom_turnos
  WHERE garcom_id = _garcom_id AND encerrado_em IS NULL
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.garcom_turnos (restaurante_id, garcom_id, iniciado_por)
  VALUES (v_rest, _garcom_id, v_uid)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.encerrar_turno_garcom(_garcom_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rest uuid;
  v_count int;
BEGIN
  SELECT restaurante_id INTO v_rest
  FROM public.garcons
  WHERE id = _garcom_id;
  IF v_rest IS NULL THEN
    RAISE EXCEPTION 'garcom_invalido';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_rest) OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.garcom_turnos
  SET encerrado_em = now(),
      encerrado_por = v_uid,
      encerrado_auto = false
  WHERE garcom_id = _garcom_id AND encerrado_em IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.encerrar_turnos_expirados()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.garcom_turnos
  SET encerrado_em = now(),
      encerrado_auto = true
  WHERE encerrado_em IS NULL
    AND iniciado_em < now() - interval '16 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =========================================================
-- 3) RPC remover_garcom_mesa (remove vínculo específico)
-- =========================================================
CREATE OR REPLACE FUNCTION public.remover_garcom_mesa(_mesa_id uuid, _garcom_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rest uuid;
  v_count int;
BEGIN
  SELECT restaurante_id INTO v_rest FROM public.mesas WHERE id = _mesa_id;
  IF v_rest IS NULL THEN
    RAISE EXCEPTION 'mesa_invalida';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_rest) OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.mesa_garcom
  SET liberado_em = now(), liberado_por = v_uid
  WHERE mesa_id = _mesa_id
    AND garcom_id = _garcom_id
    AND liberado_em IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('mesa_garcom', _mesa_id, 'remover_garcom', v_uid,
          jsonb_build_object('garcom_id', _garcom_id));

  RETURN v_count;
END;
$$;

-- =========================================================
-- 4) Substituir atribuir_garcom_mesa (sem liberar anterior,
--    sem rateio retroativo)
-- =========================================================
CREATE OR REPLACE FUNCTION public.atribuir_garcom_mesa(
  _mesa_id uuid,
  _garcom_id uuid,
  _sessao_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_restaurante_id uuid;
  v_garcom_restaurante uuid;
  v_id uuid;
  v_existente uuid;
BEGIN
  SELECT restaurante_id INTO v_restaurante_id FROM public.mesas WHERE id = _mesa_id;
  IF v_restaurante_id IS NULL THEN
    RAISE EXCEPTION 'mesa_invalida';
  END IF;

  SELECT restaurante_id INTO v_garcom_restaurante
  FROM public.garcons
  WHERE id = _garcom_id AND ativo = true;
  IF v_garcom_restaurante IS NULL THEN
    RAISE EXCEPTION 'garcom_invalido';
  END IF;

  IF v_garcom_restaurante <> v_restaurante_id THEN
    RAISE EXCEPTION 'restaurantes_diferentes';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_restaurante_id) OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Já existe vínculo ativo? devolve sem duplicar
  SELECT id INTO v_existente
  FROM public.mesa_garcom
  WHERE mesa_id = _mesa_id AND garcom_id = _garcom_id AND liberado_em IS NULL
  LIMIT 1;
  IF v_existente IS NOT NULL THEN
    RETURN v_existente;
  END IF;

  INSERT INTO public.mesa_garcom (restaurante_id, mesa_id, sessao_id, garcom_id, atribuido_por)
  VALUES (v_restaurante_id, _mesa_id, _sessao_id, _garcom_id, v_uid)
  RETURNING id INTO v_id;

  -- Atualiza pedidos abertos sem garçom desta mesa (atribuição inicial)
  UPDATE public.pedidos
  SET garcom_id = _garcom_id, atualizado_em = now()
  WHERE mesa_id = _mesa_id
    AND status IN ('recebido','em_preparo','pronto')
    AND garcom_id IS NULL;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('mesa_garcom', v_id, 'atribuir', v_uid,
          jsonb_build_object('mesa_id', _mesa_id, 'garcom_id', _garcom_id));

  RETURN v_id;
END;
$$;

-- =========================================================
-- 5) Helper: gerar pedido_garcons (intersecção atribuídos × turno aberto)
-- =========================================================
CREATE OR REPLACE FUNCTION public.gerar_pedido_garcons(
  _pedido_id uuid,
  _restaurante_id uuid,
  _mesa_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_garcons uuid[];
  v_n int;
  v_peso_base numeric;
  v_peso_resto numeric;
  v_idx int;
BEGIN
  -- Garçons atribuídos com turno aberto agora
  SELECT array_agg(DISTINCT mg.garcom_id) INTO v_garcons
  FROM public.mesa_garcom mg
  JOIN public.garcom_turnos gt
    ON gt.garcom_id = mg.garcom_id
   AND gt.encerrado_em IS NULL
  WHERE mg.mesa_id = _mesa_id
    AND mg.liberado_em IS NULL;

  v_n := COALESCE(array_length(v_garcons, 1), 0);
  IF v_n = 0 THEN
    RETURN 0;
  END IF;

  v_peso_base := round((100.0 / v_n)::numeric, 2);
  v_peso_resto := 100 - (v_peso_base * (v_n - 1));

  FOR v_idx IN 1..v_n LOOP
    INSERT INTO public.pedido_garcons (restaurante_id, pedido_id, garcom_id, peso)
    VALUES (
      _restaurante_id, _pedido_id, v_garcons[v_idx],
      CASE WHEN v_idx = v_n THEN v_peso_resto ELSE v_peso_base END
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN v_n;
END;
$$;

-- =========================================================
-- 6) Atualizar criar_pedido_garcom: se rateio ligado, popular pedido_garcons
-- =========================================================
CREATE OR REPLACE FUNCTION public.criar_pedido_garcom(
  _restaurante_id uuid,
  _mesa_id uuid,
  _garcom_id uuid,
  _cliente_id uuid,
  _comanda_id uuid,
  _observacao text,
  _total numeric,
  _itens jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_mesa_ativa boolean;
  v_mesa_rest uuid;
  v_sessao_id uuid;
  v_comanda_id uuid := _comanda_id;
  v_count_abertas int;
  v_pedido_id uuid;
  v_item jsonb;
  v_cliente_id uuid;
  v_permite_cruzado boolean;
  v_mesa_atribuida boolean;
  v_garcom_dono uuid;
  v_rateio_on boolean;
BEGIN
  IF v_uid IS NULL
     OR NOT (public.is_restaurante_membro(v_uid, _restaurante_id)
             OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT ativa, restaurante_id INTO v_mesa_ativa, v_mesa_rest
  FROM public.mesas WHERE id = _mesa_id;
  IF v_mesa_rest IS NULL OR v_mesa_rest <> _restaurante_id OR v_mesa_ativa IS NOT TRUE THEN
    RAISE EXCEPTION 'mesa_invalida';
  END IF;

  IF _garcom_id IS NOT NULL THEN
    PERFORM 1 FROM public.garcons
      WHERE id = _garcom_id AND restaurante_id = _restaurante_id AND ativo = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'garcom_invalido';
    END IF;

    SELECT permitir_atendimento_cruzado INTO v_permite_cruzado
      FROM public.restaurantes WHERE id = _restaurante_id;

    IF v_permite_cruzado IS NOT TRUE THEN
      SELECT EXISTS (
        SELECT 1 FROM public.mesa_garcom
        WHERE mesa_id = _mesa_id
          AND garcom_id = _garcom_id
          AND liberado_em IS NULL
      ) INTO v_mesa_atribuida;
      IF NOT v_mesa_atribuida THEN
        RAISE EXCEPTION 'mesa_nao_atribuida';
      END IF;
    END IF;
  END IF;

  IF _cliente_id IS NOT NULL THEN
    PERFORM 1 FROM public.clientes
      WHERE id = _cliente_id AND restaurante_id = _restaurante_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'cliente_invalido';
    END IF;
  END IF;

  SELECT id INTO v_sessao_id
  FROM public.mesa_sessoes
  WHERE mesa_id = _mesa_id AND status = 'aberta'
  ORDER BY aberta_em DESC
  LIMIT 1;

  IF v_sessao_id IS NULL THEN
    INSERT INTO public.mesa_sessoes (mesa_id, restaurante_id)
    VALUES (_mesa_id, _restaurante_id)
    RETURNING id INTO v_sessao_id;
  END IF;

  IF v_comanda_id IS NULL THEN
    SELECT count(*) INTO v_count_abertas
    FROM public.comandas
    WHERE sessao_id = v_sessao_id AND status = 'aberta';

    IF v_count_abertas = 0 THEN
      INSERT INTO public.comandas (
        restaurante_id, sessao_id, tipo, titular_cliente_id
      ) VALUES (
        _restaurante_id, v_sessao_id,
        CASE WHEN _cliente_id IS NULL THEN 'compartilhada'::comanda_tipo ELSE 'individual'::comanda_tipo END,
        _cliente_id
      )
      RETURNING id INTO v_comanda_id;
    ELSIF v_count_abertas = 1 THEN
      SELECT id INTO v_comanda_id
      FROM public.comandas
      WHERE sessao_id = v_sessao_id AND status = 'aberta'
      LIMIT 1;
    ELSE
      RAISE EXCEPTION 'multiplas_comandas_abertas';
    END IF;
  ELSE
    PERFORM 1 FROM public.comandas
      WHERE id = v_comanda_id AND sessao_id = v_sessao_id AND status = 'aberta';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'comanda_invalida';
    END IF;
  END IF;

  INSERT INTO public.pedidos (
    restaurante_id, mesa_id, sessao_id, comanda_id, cliente_id, garcom_id,
    observacao, total, status
  ) VALUES (
    _restaurante_id, _mesa_id, v_sessao_id, v_comanda_id, _cliente_id, _garcom_id,
    COALESCE(NULLIF(_observacao,''), NULL), _total, 'recebido'
  )
  RETURNING id INTO v_pedido_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_itens) LOOP
    v_cliente_id := NULLIF(v_item->>'cliente_id','')::uuid;

    INSERT INTO public.pedido_itens (
      pedido_id, produto_id, nome_produto, quantidade, preco_unit,
      observacao, cliente_nome, cliente_id
    ) VALUES (
      v_pedido_id,
      (v_item->>'produto_id')::uuid,
      v_item->>'nome_produto',
      (v_item->>'quantidade')::int,
      (v_item->>'preco_unit')::numeric,
      NULLIF(v_item->>'observacao',''),
      NULLIF(v_item->>'cliente_nome',''),
      v_cliente_id
    );
  END LOOP;

  -- Rateio: se toggle ligado, popular pedido_garcons (atribuídos × turno aberto)
  SELECT comissao_rateio_troca_turno INTO v_rateio_on
  FROM public.restaurantes WHERE id = _restaurante_id;

  IF COALESCE(v_rateio_on, false) THEN
    PERFORM public.gerar_pedido_garcons(v_pedido_id, _restaurante_id, _mesa_id);
  END IF;
  -- Quando rateio OFF: não inserir pedido_garcons; trigger usará pedidos.garcom_id (100%).

  -- Audit atendimento cruzado
  IF _garcom_id IS NOT NULL THEN
    SELECT garcom_id INTO v_garcom_dono
      FROM public.mesa_garcom
      WHERE mesa_id = _mesa_id AND liberado_em IS NULL
      ORDER BY atribuido_em DESC
      LIMIT 1;

    IF v_garcom_dono IS NOT NULL AND v_garcom_dono <> _garcom_id THEN
      INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
      VALUES (
        'pedido', v_pedido_id, 'atendimento_cruzado', v_uid,
        jsonb_build_object(
          'restaurante_id', _restaurante_id,
          'mesa_id', _mesa_id,
          'garcom_atendente_id', _garcom_id,
          'garcom_dono_id', v_garcom_dono
        )
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'pedido_id', v_pedido_id,
    'sessao_id', v_sessao_id,
    'comanda_id', v_comanda_id
  );
END;
$$;

-- =========================================================
-- 7) Atualizar criar_pedido_publico: sempre tenta popular pedido_garcons
-- =========================================================
CREATE OR REPLACE FUNCTION public.criar_pedido_publico(
  _restaurante_id uuid,
  _mesa_id uuid,
  _sessao_id uuid,
  _comanda_id uuid,
  _cliente_id uuid,
  _observacao text,
  _total numeric,
  _itens jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido_id uuid;
  v_item jsonb;
  v_cliente_id uuid;
  v_total_cliente numeric;
BEGIN
  INSERT INTO public.pedidos (
    restaurante_id, mesa_id, sessao_id, comanda_id, cliente_id,
    total, observacao
  ) VALUES (
    _restaurante_id, _mesa_id, _sessao_id, _comanda_id, _cliente_id,
    _total, NULLIF(btrim(_observacao), '')
  )
  RETURNING id INTO v_pedido_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_itens)
  LOOP
    INSERT INTO public.pedido_itens (
      pedido_id, produto_id, nome_produto, quantidade,
      preco_unit, observacao, cliente_nome, cliente_id
    ) VALUES (
      v_pedido_id,
      (v_item->>'produto_id')::uuid,
      v_item->>'nome_produto',
      (v_item->>'quantidade')::int,
      (v_item->>'preco_unit')::numeric,
      NULLIF(btrim(COALESCE(v_item->>'observacao','')), ''),
      NULLIF(btrim(COALESCE(v_item->>'cliente_nome','')), ''),
      NULLIF(v_item->>'cliente_id','')::uuid
    );
  END LOOP;

  UPDATE public.comandas
  SET subtotal = COALESCE(subtotal,0) + _total,
      total = GREATEST(COALESCE(subtotal,0) + _total - COALESCE(cashback_resgatado,0) - COALESCE(desconto_cupom,0), 0),
      atualizado_em = now()
  WHERE id = _comanda_id;

  FOR v_cliente_id, v_total_cliente IN
    SELECT
      COALESCE(NULLIF(it->>'cliente_id','')::uuid, _cliente_id) AS cid,
      SUM((it->>'preco_unit')::numeric * (it->>'quantidade')::int) AS soma
    FROM jsonb_array_elements(_itens) AS it
    GROUP BY 1
  LOOP
    UPDATE public.clientes
    SET total_gasto   = COALESCE(total_gasto,0) + v_total_cliente,
        pedidos_count = COALESCE(pedidos_count,0) + 1,
        ultima_visita = now(),
        ticket_medio  = CASE
          WHEN COALESCE(pedidos_count,0) + 1 > 0
          THEN (COALESCE(total_gasto,0) + v_total_cliente) / (COALESCE(pedidos_count,0) + 1)
          ELSE 0
        END,
        atualizado_em = now()
    WHERE id = v_cliente_id
      AND restaurante_id = _restaurante_id;
  END LOOP;

  -- Sempre tenta popular pedido_garcons (atribuídos × turno aberto)
  PERFORM public.gerar_pedido_garcons(v_pedido_id, _restaurante_id, _mesa_id);

  RETURN v_pedido_id;
END;
$$;
