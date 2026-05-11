-- pocetnici.md §2.4 Surgical Swap Matrix verifikacija (P-1, 2026-05-08):
-- 1. Box Squat — dodaj 'knee' u gentle_on (postoji 'knee_pain' u
--    contraindications iz starije šeme; novi enum koristi 'knee')
-- 2. Leg Extension — dodaj kao surgical swap za bol u donjim leđima (uklanja
--    aksijalno opterećenje na kičmu — pocetnici.md §2.4 A.1.3)
UPDATE public.exercises
SET gentle_on = array_append(gentle_on, 'knee')
WHERE name = 'Box Squat'
  AND NOT ('knee' = ANY(gentle_on));

INSERT INTO public.exercises (
  name, name_sr, movement_pattern, primary_muscle, secondary_muscles,
  tension_profile, cns_load, fatigue_index, equipment, difficulty,
  requires_stabilization, contraindications, gentle_on,
  weight_increment, is_bilateral, instructions,
  is_glute_builder, is_compound, is_finisher_eligible, is_system_exercise
) VALUES (
  'Leg Extension', 'Ekstenzija nogu (mašina)',
  'knee_dominant', 'quads', ARRAY[]::text[],
  'shortened', 1, 1, ARRAY['machine']::text[], 'beginner_safe',
  false, ARRAY[]::text[], ARRAY['lower_back']::text[],
  2.5, true,
  'Sedi u mašinu, stopala fiksirana ispod jastučića. Polako ispruži kolena, pauziraj 1s na vrhu, kontrolisano spusti.',
  false, false, true, true
)
ON CONFLICT DO NOTHING;
