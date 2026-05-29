
-- 1) Papel 'bar' no enum app_role (não pode ser usado na mesma transação, ok aqui — não inserimos dados)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'bar';

-- 2) Enum de destino de preparo
DO $$ BEGIN
  CREATE TYPE public.destino_preparo AS ENUM ('cozinha', 'bar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Classificação no cardápio
ALTER TABLE public.categorias
  ADD COLUMN IF NOT EXISTS destino public.destino_preparo NOT NULL DEFAULT 'cozinha';

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS destino_override public.destino_preparo NULL;

-- 4) Coluna congelada no item do pedido
ALTER TABLE public.pedido_itens
  ADD COLUMN IF NOT EXISTS destino public.destino_preparo NOT NULL DEFAULT 'cozinha';

CREATE INDEX IF NOT EXISTS pedido_itens_destino_idx ON public.pedido_itens(pedido_id, destino);

-- 5) Trigger BEFORE INSERT: deriva destino do item a partir de produto/categoria
CREATE OR REPLACE FUNCTION public.pedido_itens_set_destino()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_override destino_preparo;
  v_cat_id uuid;
  v_cat_destino destino_preparo;
BEGIN
  IF NEW.destino IS NULL OR TG_OP = 'INSERT' THEN
    SELECT destino_override, categoria_id
      INTO v_override, v_cat_id
      FROM public.produtos
      WHERE id = NEW.produto_id;

    IF v_override IS NOT NULL THEN
      NEW.destino := v_override;
    ELSIF v_cat_id IS NOT NULL THEN
      SELECT destino INTO v_cat_destino FROM public.categorias WHERE id = v_cat_id;
      NEW.destino := COALESCE(v_cat_destino, 'cozinha');
    ELSE
      NEW.destino := 'cozinha';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedido_itens_set_destino_trg ON public.pedido_itens;
CREATE TRIGGER pedido_itens_set_destino_trg
BEFORE INSERT ON public.pedido_itens
FOR EACH ROW EXECUTE FUNCTION public.pedido_itens_set_destino();

-- 6) Status por destino do pedido
CREATE TABLE IF NOT EXISTS public.pedido_destino_status (
  pedido_id uuid NOT NULL,
  destino public.destino_preparo NOT NULL,
  status public.pedido_status NOT NULL DEFAULT 'recebido',
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pedido_id, destino)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedido_destino_status TO authenticated;
GRANT ALL ON public.pedido_destino_status TO service_role;

ALTER TABLE public.pedido_destino_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pedido_destino_status_select_membro ON public.pedido_destino_status;
CREATE POLICY pedido_destino_status_select_membro
  ON public.pedido_destino_status
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_destino_status.pedido_id
      AND (public.is_restaurante_membro(auth.uid(), p.restaurante_id)
           OR public.is_platform_admin(auth.uid()))
  ));

DROP POLICY IF EXISTS pedido_destino_status_update_membro ON public.pedido_destino_status;
CREATE POLICY pedido_destino_status_update_membro
  ON public.pedido_destino_status
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_destino_status.pedido_id
      AND (public.is_restaurante_membro(auth.uid(), p.restaurante_id)
           OR public.is_platform_admin(auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_destino_status.pedido_id
      AND (public.is_restaurante_membro(auth.uid(), p.restaurante_id)
           OR public.is_platform_admin(auth.uid()))
  ));

-- Permite ao realtime emitir eventos
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedido_destino_status;

-- 7) Função de recomputação do status de um destino a partir dos itens
CREATE OR REPLACE FUNCTION public.recomputar_destino_status(_pedido_id uuid, _destino public.destino_preparo)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_pendentes int;
  v_prontos int;
  v_novo pedido_status;
BEGIN
  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE status = 'pendente'),
         COUNT(*) FILTER (WHERE status = 'pronto')
    INTO v_total, v_pendentes, v_prontos
  FROM public.pedido_itens
  WHERE pedido_id = _pedido_id AND destino = _destino;

  IF v_total = 0 THEN
    DELETE FROM public.pedido_destino_status
      WHERE pedido_id = _pedido_id AND destino = _destino;
    RETURN;
  END IF;

  IF v_prontos = v_total THEN
    v_novo := 'pronto';
  ELSIF v_pendentes = v_total THEN
    v_novo := 'recebido';
  ELSE
    v_novo := 'em_preparo';
  END IF;

  INSERT INTO public.pedido_destino_status (pedido_id, destino, status, atualizado_em)
  VALUES (_pedido_id, _destino, v_novo, now())
  ON CONFLICT (pedido_id, destino) DO UPDATE
    SET status = EXCLUDED.status, atualizado_em = now()
    WHERE pedido_destino_status.status IS DISTINCT FROM EXCLUDED.status;
END;
$$;

-- 8) Função de derivação do pedido.status a partir dos destinos
CREATE OR REPLACE FUNCTION public.derivar_pedido_status(_pedido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_atual pedido_status;
  v_total int;
  v_prontos int;
  v_pendentes int;
  v_novo pedido_status;
BEGIN
  SELECT status INTO v_atual FROM public.pedidos WHERE id = _pedido_id;
  -- Só sobrescreve estados ativos (não toca em entregue/cancelado)
  IF v_atual IS NULL OR v_atual IN ('entregue','cancelado') THEN
    RETURN;
  END IF;

  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE status = 'pronto'),
         COUNT(*) FILTER (WHERE status = 'recebido')
    INTO v_total, v_prontos, v_pendentes
  FROM public.pedido_destino_status
  WHERE pedido_id = _pedido_id;

  IF v_total = 0 THEN
    RETURN;
  END IF;

  IF v_prontos = v_total THEN
    v_novo := 'pronto';
  ELSIF v_pendentes = v_total THEN
    v_novo := 'recebido';
  ELSE
    v_novo := 'em_preparo';
  END IF;

  IF v_novo <> v_atual THEN
    UPDATE public.pedidos
      SET status = v_novo, atualizado_em = now()
      WHERE id = _pedido_id;
  END IF;
END;
$$;

-- 9) Triggers em pedido_itens (após mudanças) → recomputa destino_status
CREATE OR REPLACE FUNCTION public.pedido_itens_trigger_destino_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido uuid;
  v_destino destino_preparo;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_pedido := OLD.pedido_id;
    v_destino := OLD.destino;
  ELSE
    v_pedido := NEW.pedido_id;
    v_destino := NEW.destino;
  END IF;

  PERFORM public.recomputar_destino_status(v_pedido, v_destino);

  -- Se UPDATE alterou destino (raro), recomputa o destino antigo também
  IF TG_OP = 'UPDATE' AND OLD.destino IS DISTINCT FROM NEW.destino THEN
    PERFORM public.recomputar_destino_status(OLD.pedido_id, OLD.destino);
  END IF;

  PERFORM public.derivar_pedido_status(v_pedido);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS pedido_itens_destino_status_trg ON public.pedido_itens;
CREATE TRIGGER pedido_itens_destino_status_trg
AFTER INSERT OR UPDATE OR DELETE ON public.pedido_itens
FOR EACH ROW EXECUTE FUNCTION public.pedido_itens_trigger_destino_status();

-- 10) Trigger em pedido_destino_status → deriva pedidos.status
CREATE OR REPLACE FUNCTION public.pedido_destino_status_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.derivar_pedido_status(OLD.pedido_id);
  ELSE
    PERFORM public.derivar_pedido_status(NEW.pedido_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS pedido_destino_status_derivar_trg ON public.pedido_destino_status;
CREATE TRIGGER pedido_destino_status_derivar_trg
AFTER INSERT OR UPDATE OR DELETE ON public.pedido_destino_status
FOR EACH ROW EXECUTE FUNCTION public.pedido_destino_status_trigger();

-- 11) RPC para atualizar manualmente o status de um destino (cozinha/bar avançar)
CREATE OR REPLACE FUNCTION public.atualizar_status_destino(
  _pedido_id uuid,
  _destino public.destino_preparo,
  _status public.pedido_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rest uuid;
  v_papel app_role;
  v_ok boolean := false;
BEGIN
  IF _status NOT IN ('recebido','em_preparo','pronto') THEN
    RAISE EXCEPTION 'status_invalido';
  END IF;

  SELECT restaurante_id INTO v_rest FROM public.pedidos WHERE id = _pedido_id;
  IF v_rest IS NULL THEN
    RAISE EXCEPTION 'pedido_nao_encontrado';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_rest) OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Papel compatível com o destino (admin/staff podem tudo)
  SELECT papel INTO v_papel
    FROM public.restaurante_membros
    WHERE user_id = v_uid AND restaurante_id = v_rest
    ORDER BY criado_em ASC
    LIMIT 1;

  IF public.is_platform_admin(v_uid) OR v_papel IN ('admin','staff') THEN
    v_ok := true;
  ELSIF _destino = 'cozinha' AND v_papel = 'cozinheiro' THEN
    v_ok := true;
  ELSIF _destino = 'bar' AND v_papel = 'bar' THEN
    v_ok := true;
  END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'papel_incompativel_com_destino';
  END IF;

  INSERT INTO public.pedido_destino_status (pedido_id, destino, status, atualizado_em)
  VALUES (_pedido_id, _destino, _status, now())
  ON CONFLICT (pedido_id, destino) DO UPDATE
    SET status = EXCLUDED.status, atualizado_em = now();
END;
$$;

REVOKE ALL ON FUNCTION public.atualizar_status_destino(uuid, public.destino_preparo, public.pedido_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.atualizar_status_destino(uuid, public.destino_preparo, public.pedido_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_destino(uuid, public.destino_preparo, public.pedido_status) TO service_role;

-- 12) Backfill: cria linhas em pedido_destino_status para pedidos ativos já existentes
INSERT INTO public.pedido_destino_status (pedido_id, destino, status, atualizado_em)
SELECT pi.pedido_id, pi.destino,
       CASE
         WHEN COUNT(*) FILTER (WHERE pi.status = 'pronto') = COUNT(*) THEN 'pronto'::pedido_status
         WHEN COUNT(*) FILTER (WHERE pi.status = 'pendente') = COUNT(*) THEN 'recebido'::pedido_status
         ELSE 'em_preparo'::pedido_status
       END,
       now()
FROM public.pedido_itens pi
JOIN public.pedidos p ON p.id = pi.pedido_id
WHERE p.status NOT IN ('entregue','cancelado')
GROUP BY pi.pedido_id, pi.destino
ON CONFLICT (pedido_id, destino) DO NOTHING;
