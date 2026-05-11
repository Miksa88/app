-- ============================================================================
-- Add recipe fields to food_items
-- ============================================================================
--
-- Klijent može da otvori obrok i vidi:
--   - prep_time_min: koliko vremena treba (5-45 min)
--   - servings: koliko porcija recept daje (default 1)
--   - recipe_steps: korake pripreme (jsonb array of step objects)
--   - video_url: YouTube/Vimeo URL za vizuelno uputstvo (NULL = no video)
--
-- ingredients (existing TEXT[]) ostaje za shopping list aggregation;
-- recipe_steps je čist text za prikaz.
-- ============================================================================

ALTER TABLE public.food_items
  ADD COLUMN IF NOT EXISTS prep_time_min  INT          NULL CHECK (prep_time_min IS NULL OR (prep_time_min > 0 AND prep_time_min <= 240)),
  ADD COLUMN IF NOT EXISTS servings       INT          NOT NULL DEFAULT 1 CHECK (servings > 0 AND servings <= 20),
  ADD COLUMN IF NOT EXISTS recipe_steps   JSONB        NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS video_url      TEXT         NULL;

-- recipe_steps shape (jsonb array):
--   [
--     { "n": 1, "text_en": "Heat olive oil in pan", "text_sr": "Zagrej maslinovo ulje u tiganju" },
--     { "n": 2, "text_en": "Add chicken breast, cook 6 min per side", "text_sr": "Dodaj pileće belo meso, peci 6 min sa svake strane" }
--   ]
--
-- Validacija na kasnijem nivou (klijent renderer); migracija samo dozvoljava jsonb.

-- Index za brzu pretragu jela sa video-om (UI filter "Sa video uputstvom")
CREATE INDEX IF NOT EXISTS idx_food_items_video_url
  ON public.food_items (video_url)
  WHERE video_url IS NOT NULL;

COMMENT ON COLUMN public.food_items.prep_time_min IS 'Vreme pripreme u minutima (NULL = nepoznato/instant — voće, šejkovi)';
COMMENT ON COLUMN public.food_items.servings      IS 'Broj porcija koje recept daje (default 1)';
COMMENT ON COLUMN public.food_items.recipe_steps  IS 'Koraci pripreme — jsonb array of {n, text_en, text_sr}';
COMMENT ON COLUMN public.food_items.video_url     IS 'YouTube/Vimeo embed URL za vizuelno uputstvo (NULL = no video)';
