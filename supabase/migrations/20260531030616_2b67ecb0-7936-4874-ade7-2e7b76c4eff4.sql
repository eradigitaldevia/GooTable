ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS caixa_alerta_horas integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS caixa_teto_dinheiro numeric NULL,
  ADD COLUMN IF NOT EXISTS caixa_conferencia_cega boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS caixa_obrigatorio_para_pagamento boolean NOT NULL DEFAULT false;