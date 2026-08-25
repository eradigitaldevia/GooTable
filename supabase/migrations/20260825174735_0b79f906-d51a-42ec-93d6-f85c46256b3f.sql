ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS contrato_vencimento_em date;
ALTER TABLE public.restaurantes ADD COLUMN IF NOT EXISTS contrato_notas text;