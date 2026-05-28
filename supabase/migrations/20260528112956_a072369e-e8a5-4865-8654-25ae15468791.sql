
CREATE TABLE public.pedido_status_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id uuid NOT NULL,
  restaurante_id uuid NOT NULL,
  status_anterior public.pedido_status,
  status_novo public.pedido_status NOT NULL,
  mudou_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pedido_status_hist_rest_mudou ON public.pedido_status_historico (restaurante_id, mudou_em);
CREATE INDEX idx_pedido_status_hist_pedido ON public.pedido_status_historico (pedido_id, mudou_em);

GRANT SELECT ON public.pedido_status_historico TO authenticated;
GRANT ALL ON public.pedido_status_historico TO service_role;

ALTER TABLE public.pedido_status_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pedido_status_hist_select_membro"
  ON public.pedido_status_historico
  FOR SELECT
  TO authenticated
  USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

-- Trigger para registrar mudanças de status
CREATE OR REPLACE FUNCTION public.trg_pedido_log_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.pedido_status_historico (pedido_id, restaurante_id, status_anterior, status_novo, mudou_em)
    VALUES (NEW.id, NEW.restaurante_id, NULL, NEW.status, COALESCE(NEW.criado_em, now()));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.pedido_status_historico (pedido_id, restaurante_id, status_anterior, status_novo, mudou_em)
    VALUES (NEW.id, NEW.restaurante_id, OLD.status, NEW.status, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pedido_log_status_ins
AFTER INSERT ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.trg_pedido_log_status();

CREATE TRIGGER trg_pedido_log_status_upd
AFTER UPDATE OF status ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.trg_pedido_log_status();

-- Backfill: 1 linha sintética por pedido existente
INSERT INTO public.pedido_status_historico (pedido_id, restaurante_id, status_anterior, status_novo, mudou_em)
SELECT p.id, p.restaurante_id, NULL, p.status, p.criado_em
FROM public.pedidos p
WHERE NOT EXISTS (
  SELECT 1 FROM public.pedido_status_historico h WHERE h.pedido_id = p.id
);
