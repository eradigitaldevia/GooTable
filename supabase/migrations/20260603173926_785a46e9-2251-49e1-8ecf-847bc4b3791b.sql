
-- 1) Nova flag de configuração no restaurante
ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS comissao_rateio_troca_turno boolean NOT NULL DEFAULT false;

-- 2) Atualiza atribuir_garcom_mesa para aplicar rateio automático na troca
CREATE OR REPLACE FUNCTION public.atribuir_garcom_mesa(
  _mesa_id uuid,
  _garcom_id uuid,
  _sessao_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_restaurante_id uuid;
  v_garcom_restaurante uuid;
  v_id uuid;
  v_garcom_anterior uuid;
  v_rateio_on boolean := false;
  v_sessao_ativa uuid;
  v_pedido record;
  v_garcons uuid[];
  v_n int;
  v_peso_base numeric;
  v_peso_resto numeric;
  v_idx int;
  v_pagos int;
BEGIN
  SELECT restaurante_id INTO v_restaurante_id FROM public.mesas WHERE id = _mesa_id;
  IF v_restaurante_id IS NULL THEN
    RAISE EXCEPTION 'Mesa não encontrada';
  END IF;

  SELECT restaurante_id INTO v_garcom_restaurante
  FROM public.garcons
  WHERE id = _garcom_id AND ativo = true;
  IF v_garcom_restaurante IS NULL THEN
    RAISE EXCEPTION 'Garçom não encontrado ou inativo';
  END IF;

  IF v_garcom_restaurante <> v_restaurante_id THEN
    RAISE EXCEPTION 'Garçom e mesa pertencem a restaurantes diferentes';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_restaurante_id) OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Garçom ativo atual (antes da troca)
  SELECT garcom_id INTO v_garcom_anterior
  FROM public.mesa_garcom
  WHERE mesa_id = _mesa_id AND liberado_em IS NULL
  LIMIT 1;

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

  -- Rateio automático na troca de garçom (se habilitado)
  SELECT comissao_rateio_troca_turno INTO v_rateio_on
  FROM public.restaurantes WHERE id = v_restaurante_id;

  IF v_rateio_on
     AND v_garcom_anterior IS NOT NULL
     AND v_garcom_anterior <> _garcom_id THEN

    -- Sessão aberta atual da mesa
    SELECT id INTO v_sessao_ativa
    FROM public.mesa_sessoes
    WHERE mesa_id = _mesa_id AND status = 'aberta'
    ORDER BY aberta_em DESC
    LIMIT 1;

    IF v_sessao_ativa IS NOT NULL THEN
      -- Garçons distintos que passaram por essa sessão (incluindo o novo),
      -- ordenados pela primeira atribuição
      SELECT array_agg(garcom_id ORDER BY primeira)
      INTO v_garcons
      FROM (
        SELECT garcom_id, MIN(atribuido_em) AS primeira
        FROM public.mesa_garcom
        WHERE sessao_id = v_sessao_ativa
        GROUP BY garcom_id
      ) g;

      v_n := COALESCE(array_length(v_garcons, 1), 0);

      IF v_n >= 2 THEN
        v_peso_base := round((100.0 / v_n)::numeric, 2);
        v_peso_resto := 100 - (v_peso_base * (v_n - 1));

        -- Para cada pedido aberto ou já entregue (mas não pago) da sessão,
        -- regrava o rateio
        FOR v_pedido IN
          SELECT p.id
          FROM public.pedidos p
          WHERE p.sessao_id = v_sessao_ativa
            AND p.status <> 'cancelado'
        LOOP
          -- Pula se já existe comissão paga para esse pedido
          SELECT COUNT(*) INTO v_pagos
          FROM public.comissoes
          WHERE pedido_id = v_pedido.id AND status = 'pago';

          IF v_pagos > 0 THEN
            CONTINUE;
          END IF;

          DELETE FROM public.pedido_garcons WHERE pedido_id = v_pedido.id;

          FOR v_idx IN 1..v_n LOOP
            INSERT INTO public.pedido_garcons (
              restaurante_id, pedido_id, garcom_id, peso
            ) VALUES (
              v_restaurante_id,
              v_pedido.id,
              v_garcons[v_idx],
              CASE WHEN v_idx = v_n THEN v_peso_resto ELSE v_peso_base END
            );
          END LOOP;
        END LOOP;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('mesa_garcom', v_id, 'atribuir', v_uid,
          jsonb_build_object(
            'mesa_id', _mesa_id,
            'garcom_id', _garcom_id,
            'garcom_anterior', v_garcom_anterior,
            'rateio_aplicado', v_rateio_on AND v_garcom_anterior IS NOT NULL AND v_garcom_anterior <> _garcom_id
          ));

  RETURN v_id;
END; $function$;
