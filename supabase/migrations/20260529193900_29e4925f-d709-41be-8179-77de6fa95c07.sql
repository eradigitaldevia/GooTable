
ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS permitir_atendimento_cruzado boolean NOT NULL DEFAULT true;

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
AS $function$
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
  v_total_cliente numeric;
  v_permite_cruzado boolean;
  v_mesa_atribuida boolean;
  v_garcom_dono uuid;
BEGIN
  -- Autorização: precisa ser membro do restaurante ou admin da plataforma
  IF v_uid IS NULL
     OR NOT (public.is_restaurante_membro(v_uid, _restaurante_id)
             OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Valida mesa
  SELECT ativa, restaurante_id INTO v_mesa_ativa, v_mesa_rest
  FROM public.mesas WHERE id = _mesa_id;
  IF v_mesa_rest IS NULL OR v_mesa_rest <> _restaurante_id OR v_mesa_ativa IS NOT TRUE THEN
    RAISE EXCEPTION 'mesa_invalida';
  END IF;

  -- Valida garçom (quando informado) — precisa pertencer ao restaurante e estar ativo
  IF _garcom_id IS NOT NULL THEN
    PERFORM 1 FROM public.garcons
      WHERE id = _garcom_id AND restaurante_id = _restaurante_id AND ativo = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'garcom_invalido';
    END IF;

    -- Se atendimento cruzado está desativado, garçom só pode lançar nas próprias mesas.
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

  -- Valida cliente (quando informado)
  IF _cliente_id IS NOT NULL THEN
    PERFORM 1 FROM public.clientes
      WHERE id = _cliente_id AND restaurante_id = _restaurante_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'cliente_invalido';
    END IF;
  END IF;

  -- Garante sessão aberta
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

  -- Resolução de comanda (mesma lógica anterior)
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

  -- Cria pedido
  INSERT INTO public.pedidos (
    restaurante_id, mesa_id, sessao_id, comanda_id, cliente_id, garcom_id,
    observacao, total, status
  ) VALUES (
    _restaurante_id, _mesa_id, v_sessao_id, v_comanda_id, _cliente_id, _garcom_id,
    COALESCE(NULLIF(_observacao,''), NULL), _total, 'recebido'
  )
  RETURNING id INTO v_pedido_id;

  -- Itens
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

  -- Atualiza totais por cliente (para comandas compartilhadas com identificação)
  FOR v_cliente_id IN
    SELECT DISTINCT cliente_id FROM public.pedido_itens
    WHERE pedido_id = v_pedido_id AND cliente_id IS NOT NULL
  LOOP
    SELECT COALESCE(SUM(preco_unit * quantidade), 0) INTO v_total_cliente
    FROM public.pedido_itens
    WHERE pedido_id = v_pedido_id AND cliente_id = v_cliente_id;
  END LOOP;

  -- Audit: atendimento cruzado (quando o garçom que lança não é o dono da mesa)
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
$function$;
