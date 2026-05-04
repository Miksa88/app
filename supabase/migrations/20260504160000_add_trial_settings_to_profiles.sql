-- Migracija: profiles.trial_settings JSONB
-- W-15 (P0-3): persist trener trial postavki za TrainerFreeTrial.tsx

ALTER TABLE public.profiles
  ADD COLUMN trial_settings JSONB;

COMMENT ON COLUMN public.profiles.trial_settings IS
  'Trener trial postavke (P0-3): { duration: int, includes: { workouts, nutrition, chat, progress }, programId: uuid|null, mealPlanId: uuid|null }. Pisao je samo trener za sebe.';
