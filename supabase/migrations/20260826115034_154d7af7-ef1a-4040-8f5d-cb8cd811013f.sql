ALTER TABLE public.plataforma_config
  ADD COLUMN IF NOT EXISTS social_instagram_ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS social_facebook_ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS social_youtube_ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS social_linkedin_ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS social_tiktok_ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS social_x_ativo boolean NOT NULL DEFAULT true;