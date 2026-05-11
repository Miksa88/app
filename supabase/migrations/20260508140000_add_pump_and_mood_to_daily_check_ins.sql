-- pocetnici.md §5.1: Emergency Refeed trigger zahteva 4 markera (san, pumpa,
-- energija, raspoloženje). Trenutno daily_check_ins ima samo 3 (sleep, energy,
-- stress). Dodaj pump_score i mood_score (1–10 skala kao i ostali).
ALTER TABLE public.daily_check_ins
  ADD COLUMN IF NOT EXISTS pump_score smallint
    CHECK (pump_score IS NULL OR (pump_score BETWEEN 1 AND 10)),
  ADD COLUMN IF NOT EXISTS mood_score smallint
    CHECK (mood_score IS NULL OR (mood_score BETWEEN 1 AND 10));

COMMENT ON COLUMN public.daily_check_ins.pump_score IS
  'pocetnici.md §5.1 — pumpa na treningu 1-10 (NULL ako nije bio trening tog dana)';
COMMENT ON COLUMN public.daily_check_ins.mood_score IS
  'pocetnici.md §5.1 — raspoloženje 1-10 (4. marker za Emergency Refeed trigger)';
