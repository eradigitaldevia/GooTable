ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'garcom';

ALTER TABLE public.garcons
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_garcons_user_id ON public.garcons(user_id) WHERE user_id IS NOT NULL;