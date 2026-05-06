-- ============================================================================
-- Migracija #2: Proširi profiles + Drop daily_nutrition_logs + Create meal_logs
-- Spec referenca: 01_TRAINING (Sekcija 4.1 ClientTrainingProfile),
--                 02_NUTRITION (Sekcija 13 Daily Logging),
--                 03_INTEGRATION (Sekcija 4 Vlasništvo podataka)
-- ============================================================================
--
-- Ova migracija dovodi profiles do shape-a koji algoritam očekuje + zamenjuje
-- per-day rollup tabelu sa per-meal audit log-om (jer Sync Rule 6 — metabolic
-- noise — traži per-meal granularnost sa was_liquid_calories flag-om).
--
-- ============================================================================
-- KORAK 1: ENUM tipovi (PostgreSQL native, ne TEXT CHECK)
-- ============================================================================

-- Iskustvo (Sloj 1 input, conditional branching u onboardingu)
CREATE TYPE public.experience_level AS ENUM ('beginner', 'intermediate');

-- Primarni cilj (određuje calorie target mode + Goal Overlay)
CREATE TYPE public.primary_goal AS ENUM ('glute_focus', 'tone', 'fat_loss');

-- Job physicality (faktor u TDEE activity multiplier-u, Sloj 2 nutrition)
CREATE TYPE public.job_physicality AS ENUM ('sedentary', 'moderate', 'active');

-- Status meal log unosa (Sekcija 13 spec-a 02)
CREATE TYPE public.meal_log_status AS ENUM ('logged', 'skipped', 'replaced');

-- ============================================================================
-- KORAK 2: Proširi profiles tabelu
-- ============================================================================

-- Sloj 1 inputi (Training)
ALTER TABLE public.profiles
  ADD COLUMN experience_level public.experience_level,
  ADD COLUMN training_days INTEGER CHECK (training_days BETWEEN 3 AND 5),
  ADD COLUMN primary_goal public.primary_goal;

-- Conditional branching constraint (Sekcija 3 spec-a 01):
--   beginner → samo 3 ili 4 dana
--   intermediate → samo 4 ili 5 dana
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_experience_days_combo CHECK (
    experience_level IS NULL OR training_days IS NULL OR (
      (experience_level = 'beginner' AND training_days IN (3, 4)) OR
      (experience_level = 'intermediate' AND training_days IN (4, 5))
    )
  );

-- Sloj 2 inputi (Bio filter — Patološka matrica)
-- TEXT[] umesto TEXT slobodnog unosa — algoritam treba listu, ne string
ALTER TABLE public.profiles
  ADD COLUMN metabolic_conditions TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Sloj 3 inputi (Recovery calibration)
ALTER TABLE public.profiles
  ADD COLUMN sleep_hours_avg NUMERIC(3,1) CHECK (sleep_hours_avg BETWEEN 0 AND 14),
  ADD COLUMN stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5);

-- Job physicality (postojeći job_type je slobodan tekst — uvodimo enum-driven kolonu)
-- Stari job_type ostaje za migraciju podataka, briše se u sledećoj migraciji
ALTER TABLE public.profiles
  ADD COLUMN job_physicality public.job_physicality DEFAULT 'sedentary';

-- Cycle Tracker (Sekcija 2.2 spec-a 02 — POSLEDNJI onboarding korak)
ALTER TABLE public.profiles
  ADD COLUMN cycle_tracking_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN last_period_start DATE;

-- Konvertuj postojeća TEXT polja u TEXT[] (algoritam traži listu)
-- Strategija: dodaj nove kolone, kopiraj postojeće (ako ima podataka — split po
-- zarezu kao fallback), drop stare, rename nove
ALTER TABLE public.profiles
  ADD COLUMN injuries_arr TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN allergies_arr TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN food_dislikes_arr TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migriraj postojeće podatke (split po zarezu, trim whitespace)
UPDATE public.profiles
SET
  injuries_arr = CASE
    WHEN injuries IS NULL OR trim(injuries) = '' THEN ARRAY[]::TEXT[]
    ELSE string_to_array(trim(injuries), ',')
  END,
  allergies_arr = CASE
    WHEN allergies IS NULL OR trim(allergies) = '' THEN ARRAY[]::TEXT[]
    ELSE string_to_array(trim(allergies), ',')
  END,
  food_dislikes_arr = CASE
    WHEN food_dislikes IS NULL OR trim(food_dislikes) = '' THEN ARRAY[]::TEXT[]
    ELSE string_to_array(trim(food_dislikes), ',')
  END;

-- Drop stare TEXT kolone i rename nove
ALTER TABLE public.profiles
  DROP COLUMN injuries,
  DROP COLUMN allergies,
  DROP COLUMN food_dislikes;

ALTER TABLE public.profiles
  RENAME COLUMN injuries_arr TO injuries;
ALTER TABLE public.profiles
  RENAME COLUMN allergies_arr TO allergies;
ALTER TABLE public.profiles
  RENAME COLUMN food_dislikes_arr TO food_dislikes;

-- Konvertuj postojeći goal TEXT u primary_goal ENUM (sa fallback-om)
-- Stari goal ostaje za buduću migraciju ako se koristi u UI-u još uvek;
-- novi primary_goal je autoritativan za algoritam
UPDATE public.profiles
SET primary_goal = CASE
  WHEN goal ILIKE '%glute%' THEN 'glute_focus'::public.primary_goal
  WHEN goal ILIKE '%tone%' OR goal ILIKE '%toning%' THEN 'tone'::public.primary_goal
  WHEN goal ILIKE '%fat%' OR goal ILIKE '%loss%' OR goal ILIKE '%weight%' THEN 'fat_loss'::public.primary_goal
  ELSE NULL
END
WHERE goal IS NOT NULL AND primary_goal IS NULL;

COMMENT ON COLUMN public.profiles.metabolic_conditions IS
  'Patološka matrica iz Sloja 4 nutrition (02 Sekcija 5.1). ' ||
  'Validne vrednosti: insulin_resistance, hashimoto, pcos, hypertension, none. ' ||
  'Validacija je app-side (TS enum), DB čuva kao slobodan TEXT[] za fleksibilnost.';

COMMENT ON COLUMN public.profiles.cycle_tracking_enabled IS
  'Da li je klijentkinja aktivirala Cycle Tracker (poslednje onboarding pitanje, ' ||
  '02 Sekcija 2.2). Ako je TRUE i last_period_start je set, Hormonal_Aware_Mode je aktivan.';

-- ============================================================================
-- KORAK 3: DROP daily_nutrition_logs
-- ============================================================================
--
-- Razlog: per-day rollup ne može da snimi WAS_LIQUID_CALORIES po obroku, što je
-- input za Sync Rule 6 (metabolic noise > 10% triger). Per-meal audit dolazi.
--
-- Bezbedno za drop: src/integrations/supabase/types.ts je jedini referent u
-- kodu (proverno grep-om). Nijedna komponenta ne čita ovu tabelu.

DROP TABLE IF EXISTS public.daily_nutrition_logs;

-- ============================================================================
-- KORAK 4: CREATE meal_logs (per-meal audit)
-- ============================================================================

CREATE TABLE public.meal_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Šta je bio plan
  meal_id TEXT NOT NULL,                  -- referenca na food database (TEXT za sad,
                                          -- konvertuje se u UUID FK kad food_database
                                          -- postane prava tabela)
  meal_slot_index INTEGER NOT NULL CHECK (meal_slot_index BETWEEN 0 AND 4),
                                          -- 0=breakfast, 1=morning_snack, 2=lunch,
                                          -- 3=afternoon_snack, 4=dinner

  -- Šta se desilo
  status public.meal_log_status NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Stvarne makro vrednosti (mogu se razlikovati od plana ako je status='replaced'
  -- ili ako klijentkinja unese custom unos)
  calories_actual NUMERIC(6,1) NOT NULL DEFAULT 0,
  protein_actual NUMERIC(5,1) NOT NULL DEFAULT 0,
  carbs_actual NUMERIC(5,1) NOT NULL DEFAULT 0,
  fat_actual NUMERIC(5,1) NOT NULL DEFAULT 0,

  -- KRITIČNO za Sync Rule 6 (metabolic noise > 10% tečnih kalorija)
  was_liquid_calories BOOLEAN NOT NULL DEFAULT FALSE,

  -- Ako je status='replaced', ovde ide replacement meal_id
  replacement_meal_id TEXT,

  -- Slobodne napomene (npr. "jeo se ranije zbog sastanka")
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Konzistentnost: ako je 'replaced', mora postojati replacement_meal_id
  CONSTRAINT chk_replacement_consistency CHECK (
    (status = 'replaced' AND replacement_meal_id IS NOT NULL) OR
    (status != 'replaced' AND replacement_meal_id IS NULL)
  ),

  -- Konzistentnost: ako je 'skipped', svi makro brojevi moraju biti 0
  CONSTRAINT chk_skipped_zero_macros CHECK (
    status != 'skipped' OR (
      calories_actual = 0 AND protein_actual = 0 AND
      carbs_actual = 0 AND fat_actual = 0
    )
  )
);

-- Indexi za česte upite
CREATE INDEX idx_meal_logs_user_date
  ON public.meal_logs (user_id, logged_at DESC);

-- Za Sync Rule 6 — brzo skupi tečne kalorije za poslednjih 24h
CREATE INDEX idx_meal_logs_liquid_recent
  ON public.meal_logs (user_id, logged_at)
  WHERE was_liquid_calories = TRUE;

-- Za red flag "skipCount7d" — brzo prebroji preskočene poslednjih 7 dana
CREATE INDEX idx_meal_logs_skipped_recent
  ON public.meal_logs (user_id, logged_at)
  WHERE status = 'skipped';

-- Auto-update updated_at na svaki UPDATE
CREATE OR REPLACE FUNCTION public.update_meal_logs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meal_logs_set_timestamp
  BEFORE UPDATE ON public.meal_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_meal_logs_timestamp();

-- RLS: klijentkinja CRUD-uje svoje meal log-ove; trener čita sve
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Klijentkinja vidi svoje meal log-ove"
  ON public.meal_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Klijentkinja ubacuje svoj meal log"
  ON public.meal_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Klijentkinja menja svoj meal log"
  ON public.meal_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Klijentkinja briše svoj meal log"
  ON public.meal_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Trener vidi sve meal log-ove"
  ON public.meal_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'trainer'
    )
  );

COMMENT ON TABLE public.meal_logs IS
  'Per-meal audit log. Zamenjuje raniji daily_nutrition_logs (per-day rollup). ' ||
  'Razlog: Sync Rule 6 (metabolic noise) traži per-meal granularnost sa ' ||
  'was_liquid_calories flag-om. Daily aggregate računa view ili RPC funkcija.';

COMMENT ON COLUMN public.meal_logs.was_liquid_calories IS
  'TRUE za sokove, alkohol, kafu sa šećerom, smoothies — sve što je tečno i ' ||
  'ima >50 kcal. Ulazni podatak za Sync Rule 6 — ako tečne kal > 10% dnevnog ' ||
  'budžeta, triggeruje METABOLIC_NOISE event i blokira plan adjustment 3 dana.';

-- ============================================================================
-- KORAK 5: Realtime publication za meal_logs (frontend treba live update)
-- ============================================================================
-- Razlog: kad klijentkinja loguje obrok na telefonu, FuelingStatusBar na drugom
-- uređaju (npr. tablet u kuhinji) treba da se osveži bez refresh-a.

ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_logs;
ALTER TABLE public.meal_logs REPLICA IDENTITY FULL;
