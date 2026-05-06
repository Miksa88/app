-- ============================================================================
-- seed.sql — sistemski default template-i (4 pozicije)
-- Spec: 01_TRAINING_FLOW_MASTER.md Sekcija 3 (Template sistem)
-- ============================================================================
--
-- 4 pozicije pokrivaju sve legalne kombinacije experience × frequency:
--   beginner_3      Full Body × 3 (A/B/A linearna)         → SYS_BEG_FB_3
--   beginner_4      Full Body × 4 (H/L/H/L linearna)       → SYS_BEG_FB_4
--   intermediate_4  Upper/Lower × 2 (undulating)           → SYS_INT_UL_4
--   intermediate_5  L/U/L/U/L (undulating)                 → SYS_INT_LULUL_5
--
-- Skeleton sadrzi exerciseSlots sa MOVEMENT PATTERN + MUSCLE GROUP — runtime
-- pickExerciseForSlot bira konkretnu vezbu iz exercise_library na osnovu
-- klijentkinjinog profile-a (povrede, level, oprema).
--
-- INVARIJANTA: Tačno 1 active per position (DB partial unique index garantuje).
--
-- Idempotentno: ON CONFLICT DO NOTHING — moze se zvati vise puta bez duplikata.
-- ============================================================================

-- ── BEGINNER 3× FULL BODY (linearna) ──────────────────────────────────────
INSERT INTO public.session_templates (id, name, position, status, is_system_default, trainer_id, skeleton, compatible_overlays, activated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Sistem: Beginner Full Body 3×',
  'beginner_3', 'active', TRUE, NULL,
  '{
    "id": "SYS_BEG_FB_3",
    "level": "beginner",
    "daysPerWeek": 3,
    "name": "Beginner Full Body 3×",
    "periodizationType": "linear",
    "days": [
      {
        "dayIndex": 1, "dayType": "FullBody", "dayRole": "Heavy",
        "defaultRepRangeZone": "hypertrophy", "targetRIR": 3,
        "exerciseSlots": [
          { "slotIndex": 1, "movementPattern": "knee_dominant",  "muscleGroup": "quads",      "setsRange": [3,4], "repRange": [8,12],  "priority": "primary" },
          { "slotIndex": 2, "movementPattern": "hip_dominant",   "muscleGroup": "glutes",     "setsRange": [3,4], "repRange": [10,15], "priority": "secondary" },
          { "slotIndex": 3, "movementPattern": "horizontal_push","muscleGroup": "chest",      "setsRange": [3,4], "repRange": [8,12],  "priority": "secondary" },
          { "slotIndex": 4, "movementPattern": "horizontal_pull","muscleGroup": "back_lats",  "setsRange": [3,4], "repRange": [10,12], "priority": "secondary" },
          { "slotIndex": 5, "movementPattern": "core_antirotation","muscleGroup": "core",     "setsRange": [3,3], "repRange": [30,60], "priority": "isolation" }
        ]
      },
      { "dayIndex": 2, "dayType": "Rest", "defaultRepRangeZone": "hypertrophy", "targetRIR": 3, "exerciseSlots": [] },
      {
        "dayIndex": 3, "dayType": "FullBody", "dayRole": "Pump",
        "defaultRepRangeZone": "hypertrophy", "targetRIR": 2,
        "exerciseSlots": [
          { "slotIndex": 1, "movementPattern": "hip_dominant",        "muscleGroup": "glutes",          "setsRange": [3,4], "repRange": [10,12], "priority": "primary" },
          { "slotIndex": 2, "movementPattern": "knee_dominant",       "muscleGroup": "quads",           "setsRange": [3,4], "repRange": [8,12],  "priority": "secondary" },
          { "slotIndex": 3, "movementPattern": "vertical_push",       "muscleGroup": "shoulders_side",  "setsRange": [3,4], "repRange": [10,12], "priority": "secondary" },
          { "slotIndex": 4, "movementPattern": "vertical_pull",       "muscleGroup": "back_lats",       "setsRange": [3,4], "repRange": [10,12], "priority": "secondary" },
          { "slotIndex": 5, "movementPattern": "abduction",           "muscleGroup": "glutes_med",      "setsRange": [3,3], "repRange": [12,15], "priority": "isolation" }
        ]
      },
      { "dayIndex": 4, "dayType": "Rest", "defaultRepRangeZone": "hypertrophy", "targetRIR": 3, "exerciseSlots": [] },
      {
        "dayIndex": 5, "dayType": "FullBody", "dayRole": "Heavy",
        "defaultRepRangeZone": "hypertrophy", "targetRIR": 3,
        "exerciseSlots": [
          { "slotIndex": 1, "movementPattern": "knee_dominant",       "muscleGroup": "quads",      "setsRange": [3,4], "repRange": [8,12],  "priority": "primary" },
          { "slotIndex": 2, "movementPattern": "hip_dominant",        "muscleGroup": "hamstrings", "setsRange": [3,4], "repRange": [10,12], "priority": "secondary" },
          { "slotIndex": 3, "movementPattern": "horizontal_push",     "muscleGroup": "chest",      "setsRange": [3,4], "repRange": [8,12],  "priority": "secondary" },
          { "slotIndex": 4, "movementPattern": "horizontal_pull",     "muscleGroup": "back_upper", "setsRange": [3,4], "repRange": [10,12], "priority": "secondary" },
          { "slotIndex": 5, "movementPattern": "core_flexion",        "muscleGroup": "core",       "setsRange": [3,3], "repRange": [12,15], "priority": "isolation" }
        ]
      },
      { "dayIndex": 6, "dayType": "Rest", "defaultRepRangeZone": "hypertrophy", "targetRIR": 3, "exerciseSlots": [] },
      { "dayIndex": 7, "dayType": "Rest", "defaultRepRangeZone": "hypertrophy", "targetRIR": 3, "exerciseSlots": [] }
    ]
  }'::jsonb,
  ARRAY['GLUTE_FOCUS','TONE','FAT_LOSS']::public.goal_overlay[],
  now()
)
ON CONFLICT (id) DO NOTHING;

-- ── BEGINNER 4× FULL BODY (Heavy/Light/Heavy/Light linearna) ──────────────
INSERT INTO public.session_templates (id, name, position, status, is_system_default, trainer_id, skeleton, compatible_overlays, activated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Sistem: Beginner Full Body 4× (H/L)',
  'beginner_4', 'active', TRUE, NULL,
  '{
    "id": "SYS_BEG_FB_4",
    "level": "beginner",
    "daysPerWeek": 4,
    "name": "Beginner Full Body 4× (Heavy/Light)",
    "periodizationType": "linear",
    "days": [
      {
        "dayIndex": 1, "dayType": "FullBody", "dayRole": "Heavy",
        "defaultRepRangeZone": "strength", "targetRIR": 3,
        "exerciseSlots": [
          { "slotIndex": 1, "movementPattern": "knee_dominant",       "muscleGroup": "quads",      "setsRange": [4,5], "repRange": [5,8],   "priority": "primary" },
          { "slotIndex": 2, "movementPattern": "hip_dominant",        "muscleGroup": "glutes",     "setsRange": [4,4], "repRange": [8,10],  "priority": "secondary" },
          { "slotIndex": 3, "movementPattern": "horizontal_push",     "muscleGroup": "chest",      "setsRange": [4,4], "repRange": [6,10],  "priority": "secondary" },
          { "slotIndex": 4, "movementPattern": "horizontal_pull",     "muscleGroup": "back_lats",  "setsRange": [3,4], "repRange": [6,10],  "priority": "secondary" },
          { "slotIndex": 5, "movementPattern": "core_flexion",        "muscleGroup": "core",       "setsRange": [3,3], "repRange": [10,15], "priority": "isolation" }
        ]
      },
      {
        "dayIndex": 2, "dayType": "FullBody", "dayRole": "Light",
        "defaultRepRangeZone": "metabolic", "targetRIR": 2,
        "exerciseSlots": [
          { "slotIndex": 1, "movementPattern": "hip_dominant",        "muscleGroup": "glutes",         "setsRange": [3,4], "repRange": [10,15], "priority": "primary" },
          { "slotIndex": 2, "movementPattern": "knee_dominant",       "muscleGroup": "quads",          "setsRange": [3,4], "repRange": [10,15], "priority": "secondary" },
          { "slotIndex": 3, "movementPattern": "abduction",           "muscleGroup": "glutes_med",     "setsRange": [3,4], "repRange": [12,15], "priority": "secondary" },
          { "slotIndex": 4, "movementPattern": "isolation_lateral_delt","muscleGroup": "shoulders_side","setsRange": [3,4], "repRange": [12,15], "priority": "isolation" },
          { "slotIndex": 5, "movementPattern": "isolation_biceps",    "muscleGroup": "biceps",         "setsRange": [3,4], "repRange": [10,15], "priority": "isolation" }
        ]
      },
      { "dayIndex": 3, "dayType": "Rest", "defaultRepRangeZone": "hypertrophy", "targetRIR": 3, "exerciseSlots": [] },
      {
        "dayIndex": 4, "dayType": "FullBody", "dayRole": "Heavy",
        "defaultRepRangeZone": "strength", "targetRIR": 3,
        "exerciseSlots": [
          { "slotIndex": 1, "movementPattern": "hip_dominant",        "muscleGroup": "glutes",     "setsRange": [4,5], "repRange": [6,10],  "priority": "primary" },
          { "slotIndex": 2, "movementPattern": "knee_dominant",       "muscleGroup": "quads",      "setsRange": [3,4], "repRange": [8,12],  "priority": "secondary" },
          { "slotIndex": 3, "movementPattern": "vertical_push",       "muscleGroup": "shoulders_side","setsRange": [3,4], "repRange": [8,10],"priority": "secondary" },
          { "slotIndex": 4, "movementPattern": "vertical_pull",       "muscleGroup": "back_lats",  "setsRange": [3,4], "repRange": [8,10],  "priority": "secondary" },
          { "slotIndex": 5, "movementPattern": "core_antirotation",   "muscleGroup": "core",       "setsRange": [3,3], "repRange": [30,60], "priority": "isolation" }
        ]
      },
      {
        "dayIndex": 5, "dayType": "FullBody", "dayRole": "Light",
        "defaultRepRangeZone": "metabolic", "targetRIR": 2,
        "exerciseSlots": [
          { "slotIndex": 1, "movementPattern": "hip_dominant",        "muscleGroup": "hamstrings",     "setsRange": [3,4], "repRange": [10,15], "priority": "primary" },
          { "slotIndex": 2, "movementPattern": "abduction",           "muscleGroup": "glutes_med",     "setsRange": [4,4], "repRange": [12,15], "priority": "secondary" },
          { "slotIndex": 3, "movementPattern": "isolation_rear_delt", "muscleGroup": "shoulders_rear", "setsRange": [3,4], "repRange": [12,15], "priority": "secondary" },
          { "slotIndex": 4, "movementPattern": "isolation_triceps",   "muscleGroup": "triceps",        "setsRange": [3,4], "repRange": [10,15], "priority": "isolation" },
          { "slotIndex": 5, "movementPattern": "calf_raise",          "muscleGroup": "calves",         "setsRange": [3,4], "repRange": [12,15], "priority": "isolation" }
        ]
      },
      { "dayIndex": 6, "dayType": "Rest", "defaultRepRangeZone": "hypertrophy", "targetRIR": 3, "exerciseSlots": [] },
      { "dayIndex": 7, "dayType": "Rest", "defaultRepRangeZone": "hypertrophy", "targetRIR": 3, "exerciseSlots": [] }
    ]
  }'::jsonb,
  ARRAY['GLUTE_FOCUS','TONE','FAT_LOSS']::public.goal_overlay[],
  now()
)
ON CONFLICT (id) DO NOTHING;

-- ── INTERMEDIATE 4× UPPER/LOWER (undulating) ──────────────────────────────
INSERT INTO public.session_templates (id, name, position, status, is_system_default, trainer_id, skeleton, compatible_overlays, activated_at)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Sistem: Intermediate U/L 4×',
  'intermediate_4', 'active', TRUE, NULL,
  '{
    "id": "SYS_INT_UL_4",
    "level": "intermediate",
    "daysPerWeek": 4,
    "name": "Intermediate Upper/Lower 4× (undulating)",
    "periodizationType": "undulating",
    "days": [
      {
        "dayIndex": 1, "dayType": "Lower", "dayRole": "Tension",
        "defaultRepRangeZone": "strength", "targetRIR": 2,
        "exerciseSlots": [
          { "slotIndex": 1, "movementPattern": "hip_dominant",        "muscleGroup": "glutes",     "setsRange": [4,5], "repRange": [6,8],   "priority": "primary" },
          { "slotIndex": 2, "movementPattern": "knee_dominant",       "muscleGroup": "quads",      "setsRange": [3,4], "repRange": [6,8],   "priority": "secondary" },
          { "slotIndex": 3, "movementPattern": "hip_dominant",        "muscleGroup": "hamstrings", "setsRange": [3,4], "repRange": [8,12],  "priority": "secondary" },
          { "slotIndex": 4, "movementPattern": "abduction",           "muscleGroup": "glutes_med", "setsRange": [3,4], "repRange": [12,15], "priority": "isolation" },
          { "slotIndex": 5, "movementPattern": "calf_raise",          "muscleGroup": "calves",     "setsRange": [3,4], "repRange": [12,15], "priority": "isolation" }
        ]
      },
      {
        "dayIndex": 2, "dayType": "Upper", "dayRole": "Heavy",
        "defaultRepRangeZone": "strength", "targetRIR": 2,
        "exerciseSlots": [
          { "slotIndex": 1, "movementPattern": "horizontal_push",     "muscleGroup": "chest",          "setsRange": [4,5], "repRange": [6,8],   "priority": "primary" },
          { "slotIndex": 2, "movementPattern": "horizontal_pull",     "muscleGroup": "back_lats",      "setsRange": [4,4], "repRange": [6,10],  "priority": "primary" },
          { "slotIndex": 3, "movementPattern": "vertical_push",       "muscleGroup": "shoulders_side", "setsRange": [3,4], "repRange": [8,10],  "priority": "secondary" },
          { "slotIndex": 4, "movementPattern": "vertical_pull",       "muscleGroup": "back_upper",     "setsRange": [3,4], "repRange": [8,10],  "priority": "secondary" },
          { "slotIndex": 5, "movementPattern": "isolation_biceps",    "muscleGroup": "biceps",         "setsRange": [2,3], "repRange": [10,12], "priority": "isolation" },
          { "slotIndex": 6, "movementPattern": "isolation_triceps",   "muscleGroup": "triceps",        "setsRange": [2,3], "repRange": [10,12], "priority": "isolation" }
        ]
      },
      { "dayIndex": 3, "dayType": "Rest", "defaultRepRangeZone": "hypertrophy", "targetRIR": 2, "exerciseSlots": [] },
      {
        "dayIndex": 4, "dayType": "Lower", "dayRole": "Pump",
        "defaultRepRangeZone": "metabolic", "targetRIR": 1,
        "exerciseSlots": [
          { "slotIndex": 1, "movementPattern": "hip_dominant",        "muscleGroup": "glutes",     "setsRange": [4,5], "repRange": [10,15], "priority": "primary" },
          { "slotIndex": 2, "movementPattern": "knee_dominant",       "muscleGroup": "quads",      "setsRange": [3,4], "repRange": [12,15], "priority": "secondary" },
          { "slotIndex": 3, "movementPattern": "abduction",           "muscleGroup": "glutes_med", "setsRange": [4,5], "repRange": [15,20], "priority": "secondary" },
          { "slotIndex": 4, "movementPattern": "calf_raise",          "muscleGroup": "calves",     "setsRange": [3,4], "repRange": [15,20], "priority": "isolation" },
          { "slotIndex": 5, "movementPattern": "core_antirotation",   "muscleGroup": "core",       "setsRange": [3,3], "repRange": [30,60], "priority": "isolation" }
        ]
      },
      {
        "dayIndex": 5, "dayType": "Upper", "dayRole": "Light",
        "defaultRepRangeZone": "metabolic", "targetRIR": 1,
        "exerciseSlots": [
          { "slotIndex": 1, "movementPattern": "horizontal_push",     "muscleGroup": "chest",          "setsRange": [3,4], "repRange": [10,15], "priority": "primary" },
          { "slotIndex": 2, "movementPattern": "horizontal_pull",     "muscleGroup": "back_lats",      "setsRange": [3,4], "repRange": [10,15], "priority": "primary" },
          { "slotIndex": 3, "movementPattern": "isolation_lateral_delt","muscleGroup": "shoulders_side","setsRange": [3,4], "repRange": [12,15], "priority": "secondary" },
          { "slotIndex": 4, "movementPattern": "isolation_rear_delt", "muscleGroup": "shoulders_rear", "setsRange": [3,4], "repRange": [12,15], "priority": "secondary" },
          { "slotIndex": 5, "movementPattern": "isolation_biceps",    "muscleGroup": "biceps",         "setsRange": [3,4], "repRange": [12,15], "priority": "isolation" },
          { "slotIndex": 6, "movementPattern": "isolation_triceps",   "muscleGroup": "triceps",        "setsRange": [3,4], "repRange": [12,15], "priority": "isolation" }
        ]
      },
      { "dayIndex": 6, "dayType": "Rest", "defaultRepRangeZone": "hypertrophy", "targetRIR": 2, "exerciseSlots": [] },
      { "dayIndex": 7, "dayType": "Rest", "defaultRepRangeZone": "hypertrophy", "targetRIR": 2, "exerciseSlots": [] }
    ]
  }'::jsonb,
  ARRAY['GLUTE_FOCUS','TONE','FAT_LOSS']::public.goal_overlay[],
  now()
)
ON CONFLICT (id) DO NOTHING;

-- ── INTERMEDIATE 5× L/U/L/U/L (undulating) ────────────────────────────────
INSERT INTO public.session_templates (id, name, position, status, is_system_default, trainer_id, skeleton, compatible_overlays, activated_at)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'Sistem: Intermediate L/U/L/U/L 5×',
  'intermediate_5', 'active', TRUE, NULL,
  '{
    "id": "SYS_INT_LULUL_5",
    "level": "intermediate",
    "daysPerWeek": 5,
    "name": "Intermediate L/U/L/U/L 5× (undulating)",
    "periodizationType": "undulating",
    "days": [
      {
        "dayIndex": 1, "dayType": "Lower", "dayRole": "Tension",
        "defaultRepRangeZone": "strength", "targetRIR": 2,
        "exerciseSlots": [
          { "slotIndex": 1, "movementPattern": "hip_dominant",  "muscleGroup": "glutes",     "setsRange": [4,5], "repRange": [6,8],   "priority": "primary" },
          { "slotIndex": 2, "movementPattern": "knee_dominant", "muscleGroup": "quads",      "setsRange": [3,4], "repRange": [6,8],   "priority": "secondary" },
          { "slotIndex": 3, "movementPattern": "hip_dominant",  "muscleGroup": "hamstrings", "setsRange": [3,4], "repRange": [8,12],  "priority": "secondary" },
          { "slotIndex": 4, "movementPattern": "abduction",     "muscleGroup": "glutes_med", "setsRange": [3,4], "repRange": [12,15], "priority": "isolation" },
          { "slotIndex": 5, "movementPattern": "calf_raise",    "muscleGroup": "calves",     "setsRange": [3,4], "repRange": [12,15], "priority": "isolation" }
        ]
      },
      {
        "dayIndex": 2, "dayType": "Upper", "dayRole": "Heavy",
        "defaultRepRangeZone": "strength", "targetRIR": 2,
        "exerciseSlots": [
          { "slotIndex": 1, "movementPattern": "horizontal_push",     "muscleGroup": "chest",          "setsRange": [4,5], "repRange": [6,8],   "priority": "primary" },
          { "slotIndex": 2, "movementPattern": "horizontal_pull",     "muscleGroup": "back_lats",      "setsRange": [4,4], "repRange": [6,10],  "priority": "primary" },
          { "slotIndex": 3, "movementPattern": "vertical_push",       "muscleGroup": "shoulders_side", "setsRange": [3,4], "repRange": [8,10],  "priority": "secondary" },
          { "slotIndex": 4, "movementPattern": "vertical_pull",       "muscleGroup": "back_upper",     "setsRange": [3,4], "repRange": [8,10],  "priority": "secondary" },
          { "slotIndex": 5, "movementPattern": "isolation_biceps",    "muscleGroup": "biceps",         "setsRange": [2,3], "repRange": [10,12], "priority": "isolation" },
          { "slotIndex": 6, "movementPattern": "isolation_triceps",   "muscleGroup": "triceps",        "setsRange": [2,3], "repRange": [10,12], "priority": "isolation" }
        ]
      },
      {
        "dayIndex": 3, "dayType": "Lower", "dayRole": "Pump",
        "defaultRepRangeZone": "metabolic", "targetRIR": 1,
        "exerciseSlots": [
          { "slotIndex": 1, "movementPattern": "hip_dominant",  "muscleGroup": "glutes",     "setsRange": [4,5], "repRange": [10,15], "priority": "primary" },
          { "slotIndex": 2, "movementPattern": "knee_dominant", "muscleGroup": "quads",      "setsRange": [3,4], "repRange": [12,15], "priority": "secondary" },
          { "slotIndex": 3, "movementPattern": "abduction",     "muscleGroup": "glutes_med", "setsRange": [4,5], "repRange": [15,20], "priority": "secondary" },
          { "slotIndex": 4, "movementPattern": "calf_raise",    "muscleGroup": "calves",     "setsRange": [3,4], "repRange": [15,20], "priority": "isolation" },
          { "slotIndex": 5, "movementPattern": "core_antirotation","muscleGroup": "core",    "setsRange": [3,3], "repRange": [30,60], "priority": "isolation" }
        ]
      },
      {
        "dayIndex": 4, "dayType": "Upper", "dayRole": "Light",
        "defaultRepRangeZone": "metabolic", "targetRIR": 1,
        "exerciseSlots": [
          { "slotIndex": 1, "movementPattern": "horizontal_push",     "muscleGroup": "chest",          "setsRange": [3,4], "repRange": [10,15], "priority": "primary" },
          { "slotIndex": 2, "movementPattern": "horizontal_pull",     "muscleGroup": "back_lats",      "setsRange": [3,4], "repRange": [10,15], "priority": "primary" },
          { "slotIndex": 3, "movementPattern": "isolation_lateral_delt","muscleGroup": "shoulders_side","setsRange": [3,4], "repRange": [12,15], "priority": "secondary" },
          { "slotIndex": 4, "movementPattern": "isolation_rear_delt", "muscleGroup": "shoulders_rear", "setsRange": [3,4], "repRange": [12,15], "priority": "secondary" },
          { "slotIndex": 5, "movementPattern": "isolation_biceps",    "muscleGroup": "biceps",         "setsRange": [3,4], "repRange": [12,15], "priority": "isolation" },
          { "slotIndex": 6, "movementPattern": "isolation_triceps",   "muscleGroup": "triceps",        "setsRange": [3,4], "repRange": [12,15], "priority": "isolation" }
        ]
      },
      {
        "dayIndex": 5, "dayType": "Lower", "dayRole": "Stretch",
        "defaultRepRangeZone": "hypertrophy", "targetRIR": 2,
        "exerciseSlots": [
          { "slotIndex": 1, "movementPattern": "hip_dominant",  "muscleGroup": "hamstrings", "setsRange": [4,5], "repRange": [10,12], "priority": "primary" },
          { "slotIndex": 2, "movementPattern": "knee_dominant", "muscleGroup": "quads",      "setsRange": [3,4], "repRange": [10,15], "priority": "secondary" },
          { "slotIndex": 3, "movementPattern": "hip_dominant",  "muscleGroup": "glutes",     "setsRange": [4,5], "repRange": [12,15], "priority": "secondary" },
          { "slotIndex": 4, "movementPattern": "abduction",     "muscleGroup": "glutes_med", "setsRange": [3,4], "repRange": [15,20], "priority": "isolation" },
          { "slotIndex": 5, "movementPattern": "calf_raise",    "muscleGroup": "calves",     "setsRange": [3,4], "repRange": [15,20], "priority": "isolation" }
        ]
      },
      { "dayIndex": 6, "dayType": "Rest", "defaultRepRangeZone": "hypertrophy", "targetRIR": 2, "exerciseSlots": [] },
      { "dayIndex": 7, "dayType": "Rest", "defaultRepRangeZone": "hypertrophy", "targetRIR": 2, "exerciseSlots": [] }
    ]
  }'::jsonb,
  ARRAY['GLUTE_FOCUS','TONE','FAT_LOSS']::public.goal_overlay[],
  now()
)
ON CONFLICT (id) DO NOTHING;
