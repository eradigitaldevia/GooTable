
-- 1) Nova tabela pedido_garcons
CREATE TABLE public.pedido_garcons (
  pedido_id uuid NOT NULL,
  garcom_id uuid NOT NULL,
  restaurante_id uuid NOT NULL,
  peso numeric NOT NULL CHECK (peso > 0 AND peso <= 100),
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pedido_id, garcom_id)
);

CREATE INDEX idx_pedido_garcons_garcom ON public.pedido_garcons(garcom_id);
CREATE INDEX idx_pedido_garcons_restaurante ON public.pedido_garcons(restaurante_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedido_garcons TO authenticated;
GRANT ALL ON public.pedido_garcons TO service_role;

ALTER TABLE public.pedido_garcons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pedido_garcons_rw_membro"
ON public.pedido_garcons
FOR ALL
TO authenticated
USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

-- 2) Coluna peso em comissoes + nova unique
ALTER TABLE public.comissoes
  ADD COLUMN IF NOT EXISTS peso numeric NOT NULL DEFAULT 100;

ALTER TABLE public.comissoes DROP CONSTRAINT IF EXISTS comissoes_pedido_id_key;

ALTER TABLE public.comissoes
  ADD CONSTRAINT comissoes_pedido_garcom_key UNIQUE (pedido_id, garcom_id);

-- 3) Reescreve trigger de geração de comissão
CREATE OR REPLACE FUNCTION public.trg_pedido_gerar_comissao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
  v_percentual numeric;
  v_valor numeric;
  r record;
BEGIN
  IF NEW.status = 'entregue' AND (OLD.status IS DISTINCT FROM 'entregue') THEN
    SELECT COUNT(*) INTO v_count FROM public.pedido_garcons WHERE pedido_id = NEW.id;

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
  RETURN NEW;
END;
$function$;

-- 4) RPC definir_garcons_pedido
CREATE OR REPLACE FUNCTION public.definir_garcons_pedido(_pedido_id uuid, _items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_pedido public.pedidos%ROWTYPE;
  v_soma numeric := 0;
  v_count_pagos int;
  v_principal uuid;
  v_principal_peso numeric := 0;
  v_garcom_restaurante uuid;
  it jsonb;
BEGIN
  SELECT * INTO v_pedido FROM public.pedidos WHERE id = _pedido_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_pedido.restaurante_id) OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT COUNT(*) INTO v_count_pagos FROM public.comissoes
   WHERE pedido_id = _pedido_id AND status = 'pago';
  IF v_count_pagos > 0 THEN
    RAISE EXCEPTION 'Pedido já possui comissões pagas; divisão bloqueada';
  END IF;

  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos um garçom';
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    IF (it->>'garcom_id') IS NULL OR (it->>'peso') IS NULL THEN
      RAISE EXCEPTION 'Item inválido (garcom_id/peso obrigatórios)';
    END IF;
    SELECT restaurante_id INTO v_garcom_restaurante FROM public.garcons WHERE id = (it->>'garcom_id')::uuid;
    IF v_garcom_restaurante IS DISTINCT FROM v_pedido.restaurante_id THEN
      RAISE EXCEPTION 'Garçom % não pertence ao restaurante do pedido', (it->>'garcom_id');
    END IF;
    v_soma := v_soma + (it->>'peso')::numeric;
    IF (it->>'peso')::numeric > v_principal_peso THEN
      v_principal_peso := (it->>'peso')::numeric;
      v_principal := (it->>'garcom_id')::uuid;
    END IF;
  END LOOP;

  IF round(v_soma, 2) <> 100 THEN
    RAISE EXCEPTION 'Soma dos pesos deve ser 100 (recebido: %)', v_soma;
  END IF;

  DELETE FROM public.pedido_garcons WHERE pedido_id = _pedido_id;
  DELETE FROM public.comissoes WHERE pedido_id = _pedido_id AND status = 'pendente';

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    INSERT INTO public.pedido_garcons (pedido_id, garcom_id, restaurante_id, peso)
    VALUES (_pedido_id, (it->>'garcom_id')::uuid, v_pedido.restaurante_id, (it->>'peso')::numeric);
  END LOOP;

  UPDATE public.pedidos
     SET garcom_id = v_principal, atualizado_em = now()
   WHERE id = _pedido_id;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('pedido_garcons', _pedido_id, 'definir', v_uid, jsonb_build_object('itens', _items));
END;
$function$;
