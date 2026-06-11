
ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS cor_secundaria text DEFAULT '#1f2937',
  ADD COLUMN IF NOT EXISTS cor_acento text DEFAULT '#f59e0b',
  ADD COLUMN IF NOT EXISTS tema_cardapio text NOT NULL DEFAULT 'claro';

ALTER TABLE public.restaurantes
  DROP CONSTRAINT IF EXISTS restaurantes_tema_cardapio_check;

ALTER TABLE public.restaurantes
  ADD CONSTRAINT restaurantes_tema_cardapio_check
  CHECK (tema_cardapio IN ('claro','escuro'));
