-- 1. Enum
CREATE TYPE public.pedido_item_status AS ENUM ('pendente', 'em_preparo', 'pronto');

-- 2. Columns
ALTER TABLE public.pedido_itens
  ADD COLUMN status public.pedido_item_status NOT NULL DEFAULT 'pendente',
  ADD COLUMN quantidade_pronta integer NOT NULL DEFAULT 0;

ALTER TABLE public.pedido_itens
  ADD CONSTRAINT pedido_itens_quantidade_pronta_check
  CHECK (quantidade_pronta >= 0 AND quantidade_pronta <= quantidade);

-- 3. Backfill: pedidos entregue/pronto -> itens prontos
UPDATE public.pedido_itens AS pi
SET quantidade_pronta = pi.quantidade,
    status = 'pronto'
FROM public.pedidos p
WHERE p.id = pi.pedido_id
  AND p.status IN ('entregue', 'pronto');

-- 4. Index
CREATE INDEX idx_pedido_itens_pedido_status
  ON public.pedido_itens (pedido_id, status);

-- 5. RLS update policy for members
CREATE POLICY itens_update_membro ON public.pedido_itens
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = pedido_itens.pedido_id
        AND (public.is_restaurante_membro(auth.uid(), p.restaurante_id)
             OR public.is_platform_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = pedido_itens.pedido_id
        AND (public.is_restaurante_membro(auth.uid(), p.restaurante_id)
             OR public.is_platform_admin(auth.uid()))
    )
  );

-- 6. Derivation function
CREATE OR REPLACE FUNCTION public.derivar_status_pedido(_pedido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status_atual public.pedido_status;
  v_total int;
  v_prontos int;
  v_em_preparo int;
  v_novo public.pedido_status;
BEGIN
  SELECT status INTO v_status_atual FROM public.pedidos WHERE id = _pedido_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Terminais: não mexer
  IF v_status_atual IN ('entregue', 'cancelado') THEN
    RETURN;
  END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'pronto'),
    count(*) FILTER (WHERE status = 'em_preparo')
  INTO v_total, v_prontos, v_em_preparo
  FROM public.pedido_itens
  WHERE pedido_id = _pedido_id;

  IF v_total = 0 THEN
    RETURN;
  END IF;

  IF v_prontos = v_total THEN
    v_novo := 'pronto';
  ELSIF v_em_preparo > 0 OR v_prontos > 0 THEN
    v_novo := 'em_preparo';
  ELSE
    v_novo := 'recebido';
  END IF;

  IF v_novo <> v_status_atual THEN
    UPDATE public.pedidos
    SET status = v_novo,
        atualizado_em = now()
    WHERE id = _pedido_id;
  END IF;
END;
$$;

-- 7. Trigger function
CREATE OR REPLACE FUNCTION public.trg_pedido_itens_derivar_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.derivar_status_pedido(OLD.pedido_id);
    RETURN OLD;
  ELSE
    PERFORM public.derivar_status_pedido(NEW.pedido_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER pedido_itens_derivar_status_aiud
AFTER INSERT OR DELETE ON public.pedido_itens
FOR EACH ROW EXECUTE FUNCTION public.trg_pedido_itens_derivar_status();

CREATE TRIGGER pedido_itens_derivar_status_au
AFTER UPDATE OF status ON public.pedido_itens
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.trg_pedido_itens_derivar_status();