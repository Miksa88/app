-- pocetnici.md §4.1 — weekly_check_ins ekstenzija (X-7, 2026-05-08)
-- Bazne metrike već postoje (energy_avg, identity_score). Dodaj 5 novih:
--   pump_avg, digestion_avg, libido_score, mood_avg, water_retention
ALTER TABLE public.weekly_check_ins
  ADD COLUMN IF NOT EXISTS pump_avg smallint
    CHECK (pump_avg IS NULL OR (pump_avg BETWEEN 1 AND 10)),
  ADD COLUMN IF NOT EXISTS digestion_avg smallint
    CHECK (digestion_avg IS NULL OR (digestion_avg BETWEEN 1 AND 10)),
  ADD COLUMN IF NOT EXISTS libido_score smallint
    CHECK (libido_score IS NULL OR (libido_score BETWEEN 1 AND 10)),
  ADD COLUMN IF NOT EXISTS mood_avg smallint
    CHECK (mood_avg IS NULL OR (mood_avg BETWEEN 1 AND 10)),
  ADD COLUMN IF NOT EXISTS water_retention smallint
    CHECK (water_retention IS NULL OR (water_retention BETWEEN 1 AND 10));

COMMENT ON COLUMN public.weekly_check_ins.pump_avg IS
  'pocetnici.md §4.1 — prosek pumpe na treningu tokom nedelje (1-10)';
COMMENT ON COLUMN public.weekly_check_ins.digestion_avg IS
  'pocetnici.md §4.1 — kvalitet varenja (10 = bez nadutosti, 1 = stalna nadutost)';
COMMENT ON COLUMN public.weekly_check_ins.libido_score IS
  'pocetnici.md §4.1 — ženska metrika; pad <4 signal preagresivnog deficita (§4.3)';
COMMENT ON COLUMN public.weekly_check_ins.mood_avg IS
  'pocetnici.md §4.1 — raspoloženje prosek (1-10)';
COMMENT ON COLUMN public.weekly_check_ins.water_retention IS
  'pocetnici.md §4.1 — zadržavanje vode (lice, prsti); >7 trigger §4.3 alert';
