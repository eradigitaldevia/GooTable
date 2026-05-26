-- Atribuir garçom à mesa
CREATE OR REPLACE FUNCTION public.atribuir_garcom_mesa(_mesa_id uuid, _garcom_id uuid, _sessao_id uuid DEFAULT NULL)
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
BEGIN
  SELECT restaurante_id INTO v_restaurante_id FROM public.mesas WHERE id = _mesa_id;
  IF v_restaurante_id IS NULL THEN
    RAISE EXCEPTION 'Mesa não encontrada';
  END IF;

  SELECT restaurante_id INTO v_garcom_restaurante FROM public.garcons WHERE id = _garcom_id AND ativo = true;
  IF v_garcom_restaurante IS NULL THEN
    RAISE EXCEPTION 'Garçom não encontrado ou inativo';
  END IF;

  IF v_garcom_restaurante <> v_restaurante_id THEN
    RAISE EXCEPTION 'Garçom e mesa pertencem a restaurantes diferentes';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_restaurante_id) OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Encerra atribuição ativa atual (se houver)
  UPDATE public.mesa_garcom
  SET liberado_em = now(), liberado_por = v_uid
  WHERE mesa_id = _mesa_id AND liberado_em IS NULL;

  INSERT INTO public.mesa_garcom (restaurante_id, mesa_id, sessao_id, garcom_id, atribuido_por)
  VALUES (v_restaurante_id, _mesa_id, _sessao_id, _garcom_id, v_uid)
  RETURNING id INTO v_id;

  -- Atualiza pedidos abertos sem garçom desta mesa
  UPDATE public.pedidos
  SET garcom_id = _garcom_id, atualizado_em = now()
  WHERE mesa_id = _mesa_id
    AND status IN ('recebido','em_preparo','pronto')
    AND garcom_id IS NULL;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('mesa_garcom', v_id, 'atribuir', v_uid,
          jsonb_build_object('mesa_id', _mesa_id, 'garcom_id', _garcom_id));

  RETURN v_id;
END; $$;

-- Liberar garçom da mesa
CREATE OR REPLACE FUNCTION public.liberar_garcom_mesa(_mesa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_restaurante_id uuid;
BEGIN
  SELECT restaurante_id INTO v_restaurante_id FROM public.mesas WHERE id = _mesa_id;
  IF v_restaurante_id IS NULL THEN
    RAISE EXCEPTION 'Mesa não encontrada';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_restaurante_id) OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.mesa_garcom
  SET liberado_em = now(), liberado_por = v_uid
  WHERE mesa_id = _mesa_id AND liberado_em IS NULL;
END; $$;

-- Trigger: ao criar pedido, herda garçom ativo da mesa
CREATE OR REPLACE FUNCTION public.trg_pedido_set_garcom()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.garcom_id IS NULL THEN
    SELECT garcom_id INTO NEW.garcom_id
    FROM public.mesa_garcom
    WHERE mesa_id = NEW.mesa_id AND liberado_em IS NULL
    LIMIT 1;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_pedidos_set_garcom
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.trg_pedido_set_garcom();

-- Trigger: ao marcar pedido como entregue, gera comissão
CREATE OR REPLACE FUNCTION public.trg_pedido_gerar_comissao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_percentual numeric;
  v_valor numeric;
BEGIN
  IF NEW.status = 'entregue' AND (OLD.status IS DISTINCT FROM 'entregue') AND NEW.garcom_id IS NOT NULL THEN
    SELECT percentual_comissao INTO v_percentual FROM public.garcons WHERE id = NEW.garcom_id;
    IF v_percentual IS NULL THEN
      RETURN NEW;
    END IF;
    v_valor := round(COALESCE(NEW.total,0) * v_percentual / 100.0, 2);

    INSERT INTO public.comissoes (restaurante_id, garcom_id, pedido_id, valor_pedido, percentual, valor_comissao)
    VALUES (NEW.restaurante_id, NEW.garcom_id, NEW.id, COALESCE(NEW.total,0), v_percentual, v_valor)
    ON CONFLICT (pedido_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_pedidos_gerar_comissao
  AFTER UPDATE OF status ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.trg_pedido_gerar_comissao();

-- Pagar comissões em lote
CREATE OR REPLACE FUNCTION public.pagar_comissoes(_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count integer;
  v_restaurante_id uuid;
BEGIN
  IF _ids IS NULL OR array_length(_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Verifica todos os restaurantes envolvidos pertencem ao usuário
  FOR v_restaurante_id IN
    SELECT DISTINCT restaurante_id FROM public.comissoes WHERE id = ANY(_ids)
  LOOP
    IF NOT (public.is_restaurante_membro(v_uid, v_restaurante_id) OR public.is_platform_admin(v_uid)) THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;
  END LOOP;

  UPDATE public.comissoes
  SET status = 'pago', pago_em = now(), pago_por = v_uid
  WHERE id = ANY(_ids) AND status = 'pendente';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  SELECT 'comissao', id, 'pagar', v_uid, jsonb_build_object('valor', valor_comissao)
  FROM public.comissoes WHERE id = ANY(_ids) AND status = 'pago' AND pago_por = v_uid;

  RETURN v_count;
END; $$;

-- Resumo de comissões por garçom
CREATE OR REPLACE FUNCTION public.resumo_comissoes(_restaurante_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF NOT (public.is_restaurante_membro(v_uid, _restaurante_id) OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'garcom_id', g.id,
    'nome', g.nome,
    'ativo', g.ativo,
    'percentual', g.percentual_comissao,
    'pendente', COALESCE(c.pendente, 0),
    'pago', COALESCE(c.pago, 0),
    'pedidos_count', COALESCE(c.pedidos_count, 0)
  ) ORDER BY g.nome), '[]'::jsonb)
  INTO v_result
  FROM public.garcons g
  LEFT JOIN (
    SELECT garcom_id,
           SUM(valor_comissao) FILTER (WHERE status = 'pendente') AS pendente,
           SUM(valor_comissao) FILTER (WHERE status = 'pago') AS pago,
           COUNT(*) AS pedidos_count
    FROM public.comissoes
    WHERE restaurante_id = _restaurante_id
    GROUP BY garcom_id
  ) c ON c.garcom_id = g.id
  WHERE g.restaurante_id = _restaurante_id;

  RETURN v_result;
END; $$;
