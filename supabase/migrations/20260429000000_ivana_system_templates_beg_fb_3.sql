-- ============================================================================
-- Ivanini sistemski templates za beginner_3 poziciju
-- Spec: 01_TRAINING_FLOW_MASTER.md §3 + user-spec za 3 goal-overlay templates
-- ============================================================================
--
-- Promene:
-- 1. Relax unique constraint: jedan aktivan template po (position, overlay[1])
--    umesto po samom position-u (omogućava 3 templates za GLUTE/FAT_LOSS/TONE)
-- 2. Deactivate legacy "Sistem: Beginner Full Body 3x" (id=11111111-...)
-- 3. Seed 7 novih vežbi (Smith Hip Thrust, Smith Squat, Lateral Band Walk,
--    Cable Glute Kickback, Single-leg RDL, Hyperextension, Dumbbell Fly)
-- 4. Insert 3 templates: SYS_BEG_FB_3_GLUTE, _FATLOSS, _TONE — sve u
--    "Sistem: Beginner FB 3x · ..." pojavni naming, trainer_id=Ivana
--
-- Pravila po overlay-u (baked u skeleton):
--   GLUTE_FOCUS: prva primary slot je glutes/hip_extension (glute builder)
--   FAT_LOSS:    targetRest=45 na svim slot-ovima + restDayCardio "LISS 30 min"
--   TONE:        zadnja 3 slot-a (slot 4, 5, 6) imaju superset:true
-- ============================================================================

-- 1. Relax constraint
DROP INDEX IF EXISTS public.one_active_template_per_position;
DROP INDEX IF EXISTS public.idx_session_templates_active_by_position;

CREATE INDEX idx_session_templates_active_by_position
  ON public.session_templates ("position")
  WHERE status = 'active'::template_status;

CREATE UNIQUE INDEX one_active_template_per_position_overlay
  ON public.session_templates ("position", (compatible_overlays[1]))
  WHERE status = 'active'::template_status;

-- 2. Deactivate legacy generic template
UPDATE public.session_templates
SET status = 'inactive'::public.template_status,
    deactivated_at = now()
WHERE id = '11111111-1111-1111-1111-111111111111';

-- 3. Seed missing exercises
INSERT INTO public.exercises (
  name, name_sr, movement_pattern, primary_muscle, secondary_muscles,
  tension_profile, cns_load, fatigue_index, equipment, difficulty,
  requires_stabilization, contraindications, gentle_on,
  weight_increment, is_bilateral, instructions,
  is_glute_builder, is_compound, is_finisher_eligible, is_system_exercise
) VALUES
  ('Lateral Band Walk', 'Lateralno hodanje sa trakom',
    'abduction', 'glutes_med', ARRAY[]::text[],
    'mid_range', 1, 1, ARRAY['band']::text[], 'beginner_safe',
    false, ARRAY[]::text[], ARRAY['knee']::text[],
    0, false,
    'Mini band oko butina iznad kolena. Polučučanj. Korake u stranu, drži tenziju u trakama.',
    true, false, true, true),
  ('Cable Glute Kickback', 'Kickback na sajli',
    'hip_extension', 'glutes', ARRAY['hamstrings']::text[],
    'shortened', 2, 2, ARRAY['cable','ankle_strap']::text[], 'beginner_safe',
    false, ARRAY[]::text[], ARRAY['knee']::text[],
    1.25, false,
    'Ankle strap na sajli, niska tačka kabla. Stoji ravno, jedna noga oslonac. Druga noga pravo unazad sa ekstenzijom kuka.',
    true, false, false, true),
  ('Single-Leg Romanian Deadlift', 'Rumunsko mrtvo dizanje na jednoj nozi (B-stance)',
    'hip_dominant', 'glutes', ARRAY['hamstrings']::text[],
    'stretch', 3, 3, ARRAY['dumbbell']::text[], 'beginner_safe',
    true, ARRAY[]::text[], ARRAY['lower_back']::text[],
    1, false,
    'B-stance: zadnja noga lagana, prsti dodiruju pod. Bučice u rukama, savijaj se u kuku.',
    true, true, false, true),
  ('Back Extension (Hyperextension)', 'Ekstenzija leđa (hyperextension)',
    'hip_extension', 'glutes', ARRAY['hamstrings','lower_back']::text[],
    'mid_range', 2, 2, ARRAY['hyperextension_bench']::text[], 'beginner_safe',
    false, ARRAY['lower_back']::text[], ARRAY[]::text[],
    1.25, true,
    'Glutes-focused: zaobli leđa lagano, pokret iz kukova. Ne idi u hiperekstenziju leđa.',
    true, false, false, true),
  ('Dumbbell Fly', 'Letenje bučicama',
    'horizontal_push', 'chest', ARRAY[]::text[],
    'stretch', 1, 1, ARRAY['dumbbell','bench']::text[], 'beginner_safe',
    false, ARRAY['shoulder']::text[], ARRAY[]::text[],
    1, true,
    'Lezi na klupu, bučice iznad grudi sa blago savijenim laktovima.',
    false, false, false, true),
  ('Smith Machine Hip Thrust', 'Podizanje kukova (Smit)',
    'hip_extension', 'glutes', ARRAY['hamstrings']::text[],
    'mid_range', 2, 2, ARRAY['smith_machine','bench']::text[], 'beginner_safe',
    false, ARRAY[]::text[], ARRAY['lower_back']::text[],
    2.5, true,
    'Klupa iza, lopatice na klupi. Smit šipka preko kukova (sa pad-om).',
    true, true, false, true),
  ('Smith Machine Squat', 'Čučanj na Smit mašini',
    'squat', 'quads', ARRAY['glutes']::text[],
    'mid_range', 3, 3, ARRAY['smith_machine']::text[], 'beginner_safe',
    false, ARRAY[]::text[], ARRAY['knee']::text[],
    2.5, true,
    'Šipka preko traparesa. Stopala malo ispred. Spustaj se kontrolisano, koleno prati prste.',
    false, true, false, true)
ON CONFLICT DO NOTHING;

-- 4. Templates su seedovani u sledećem migration call-u (apply_migration radi
-- inserts inline iz Supabase MCP-a; vidi seed_ivana_3_templates_v2 koji je
-- već applied). Ovaj fajl je za repo trail / re-run skripte.