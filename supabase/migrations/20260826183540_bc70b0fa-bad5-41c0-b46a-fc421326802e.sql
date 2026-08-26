ALTER TABLE public.restaurantes
  ADD COLUMN IF NOT EXISTS impressao_auto_cozinha boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS impressao_auto_bar boolean NOT NULL DEFAULT false;