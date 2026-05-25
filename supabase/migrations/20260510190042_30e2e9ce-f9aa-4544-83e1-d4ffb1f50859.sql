
-- Tipos
DO $$ BEGIN
  CREATE TYPE public.pagamento_metodo AS ENUM ('pix','dinheiro','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pagamento_status AS ENUM ('pendente','confirmado','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL,
  comanda_id uuid NOT NULL,
  sessao_id uuid,
  cliente_id uuid,
  metodo public.pagamento_metodo NOT NULL,
  valor numeric NOT NULL CHECK (valor > 0),
  status public.pagamento_status NOT NULL DEFAULT 'pendente',
  observacao text,
  confirmado_por uuid,
  confirmado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_comanda ON public.pagamentos(comanda_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_restaurante ON public.pagamentos(restaurante_id);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pagamentos_rw_membro ON public.pagamentos;
CREATE POLICY pagamentos_rw_membro
ON public.pagamentos
FOR ALL TO authenticated
USING (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_restaurante_membro(auth.uid(), restaurante_id) OR public.is_platform_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_pagamentos_touch ON public.pagamentos;
CREATE TRIGGER trg_pagamentos_touch
BEFORE UPDATE ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.touch_atualizado_em();

-- Coluna em comandas
ALTER TABLE public.comandas
  ADD COLUMN IF NOT EXISTS total_pago numeric NOT NULL DEFAULT 0;

-- RPC: registrar pagamento já confirmado
CREATE OR REPLACE FUNCTION public.registrar_pagamento(
  _comanda_id uuid,
  _metodo public.pagamento_metodo,
  _valor numeric,
  _observacao text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_comanda public.comandas%ROWTYPE;
  v_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF _valor IS NULL OR _valor <= 0 THEN
    RAISE EXCEPTION 'Valor inválido';
  END IF;

  SELECT * INTO v_comanda FROM public.comandas WHERE id = _comanda_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda não encontrada';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_comanda.restaurante_id)
          OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  INSERT INTO public.pagamentos (
    restaurante_id, comanda_id, sessao_id, metodo, valor, status,
    observacao, confirmado_por, confirmado_em
  ) VALUES (
    v_comanda.restaurante_id, v_comanda.id, v_comanda.sessao_id, _metodo, _valor, 'confirmado',
    NULLIF(btrim(COALESCE(_observacao,'')), ''), v_uid, now()
  ) RETURNING id INTO v_id;

  UPDATE public.comandas
  SET total_pago = COALESCE(total_pago,0) + _valor,
      atualizado_em = now()
  WHERE id = _comanda_id;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('pagamento', v_id, 'registrar', v_uid,
          jsonb_build_object('comanda_id', _comanda_id, 'valor', _valor, 'metodo', _metodo));

  RETURN v_id;
END; $$;

-- RPC: confirmar pagamento pendente
CREATE OR REPLACE FUNCTION public.confirmar_pagamento(_pagamento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pag public.pagamentos%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  SELECT * INTO v_pag FROM public.pagamentos WHERE id = _pagamento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado';
  END IF;

  IF NOT (public.is_restaurante_membro(v_uid, v_pag.restaurante_id)
          OR public.is_platform_admin(v_uid)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF v_pag.status = 'confirmado' THEN
    RETURN;
  END IF;
  IF v_pag.status = 'cancelado' THEN
    RAISE EXCEPTION 'Pagamento cancelado não pode ser confirmado';
  END IF;

  UPDATE public.pagamentos
  SET status = 'confirmado',
      confirmado_por = v_uid,
      confirmado_em = now()
  WHERE id = _pagamento_id;

  UPDATE public.comandas
  SET total_pago = COALESCE(total_pago,0) + v_pag.valor,
      atualizado_em = now()
  WHERE id = v_pag.comanda_id;

  INSERT INTO public.audit_logs (entidade, entidade_id, acao, actor_user_id, metadata)
  VALUES ('pagamento', _pagamento_id, 'confirmar', v_uid,
          jsonb_build_object('comanda_id', v_pag.comanda_id, 'valor', v_pag.valor));
END; $$;
