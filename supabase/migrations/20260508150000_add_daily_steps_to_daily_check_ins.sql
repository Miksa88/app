-- pocetnici.md §3.8: NEAT 10k gate za Smart Cut hijerarhiju.
-- Dodaj daily_steps polje (manual unos ili HealthKit/Google Fit kasnije).
ALTER TABLE public.daily_check_ins
  ADD COLUMN IF NOT EXISTS daily_steps integer
    CHECK (daily_steps IS NULL OR daily_steps >= 0);

COMMENT ON COLUMN public.daily_check_ins.daily_steps IS
  'pocetnici.md §3.8 — koraci tog dana (NEAT). 10k threshold otključava Smart Cut hijerarhiju.';
