-- ============================================================================
-- Update beginner_3 session_templates to match pocetnici.md A/B/A protocol
-- Source: pocetnici.md §2.3 Master Plan Treninga
-- Date: 2026-05-08
--
-- Trening A (Day 1, Day 5 — ABA rotation): Leg Press, Hip Thrust, Lat Pulldown,
--   Chest Press, Abdukcija, Dead Bug
-- Trening B (Day 3): RDL, Reverse Lunge, Seated Row, Shoulder Press, Lateral
--   Raise, Plank
--
-- Goal-overlay variations:
--   GLUTE_FOCUS — slot 1/2 reordered: Hip Thrust before Leg Press (glute first)
--   FAT_LOSS    — targetRest reduced (90/75/45) + restDayCardio LISS
--   TONE        — superset:true on slots 5-6
--
-- Compound rests: 120-180s -> 150 (default), 90 (FAT_LOSS)
-- Isolation rests: 60-90s -> 75 (default), 45 (FAT_LOSS)
-- Reps: compound 8-12 (double progression), abdukcija/lateral 12-15
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) GLUTE_FOCUS template (Hip Thrust before Leg Press on Day A)
-- ────────────────────────────────────────────────────────────────────────────
UPDATE public.session_templates
SET skeleton = jsonb_build_object(
  'id', 'SYS_BEG_FB_3_GLUTE',
  'name', 'Sistem: Beginner FB 3x · Glute Focus (pocetnici.md)',
  'level', 'beginner',
  'daysPerWeek', 3,
  'periodizationType', 'linear',
  'days', jsonb_build_array(
    jsonb_build_object(
      'dayIndex', 1, 'dayType', 'FullBody', 'dayRole', 'Heavy',
      'defaultRepRangeZone', 'hypertrophy', 'targetRIR', 2,
      'exerciseSlots', jsonb_build_array(
        jsonb_build_object('slotIndex',0,'isWarmup',true,'warmupName','Aktivacija cora','priority','isolation','movementPattern','core_antirotation','muscleGroup','core','setsRange',jsonb_build_array(1,1),'repRange',jsonb_build_array(12,15),'targetRest',30),
        jsonb_build_object('slotIndex',1,'priority','primary','movementPattern','hip_extension','muscleGroup','glutes','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',150),
        jsonb_build_object('slotIndex',2,'priority','primary','movementPattern','knee_dominant','muscleGroup','quads','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',150),
        jsonb_build_object('slotIndex',3,'priority','secondary','movementPattern','vertical_pull','muscleGroup','back_lats','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',120),
        jsonb_build_object('slotIndex',4,'priority','secondary','movementPattern','horizontal_push','muscleGroup','chest','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',120),
        jsonb_build_object('slotIndex',5,'priority','isolation','movementPattern','abduction','muscleGroup','glutes_med','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(12,15),'targetRest',75),
        jsonb_build_object('slotIndex',6,'priority','finisher','isFinisher',true,'finisherName','Dead Bug','movementPattern','core_anti_extension','muscleGroup','core','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(10,12),'targetRest',60)
      )
    ),
    jsonb_build_object('dayIndex',2,'dayType','Rest','targetRIR',3,'defaultRepRangeZone','hypertrophy','exerciseSlots', jsonb_build_array()),
    jsonb_build_object(
      'dayIndex', 3, 'dayType', 'FullBody', 'dayRole', 'Tension',
      'defaultRepRangeZone', 'hypertrophy', 'targetRIR', 2,
      'exerciseSlots', jsonb_build_array(
        jsonb_build_object('slotIndex',0,'isWarmup',true,'warmupName','Aktivacija cora','priority','isolation','movementPattern','core_antirotation','muscleGroup','core','setsRange',jsonb_build_array(1,1),'repRange',jsonb_build_array(12,15),'targetRest',30),
        jsonb_build_object('slotIndex',1,'priority','primary','movementPattern','hip_dominant','muscleGroup','hamstrings','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',150),
        jsonb_build_object('slotIndex',2,'priority','primary','movementPattern','lunge','muscleGroup','glutes','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',120),
        jsonb_build_object('slotIndex',3,'priority','secondary','movementPattern','horizontal_pull','muscleGroup','back_lats','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',120),
        jsonb_build_object('slotIndex',4,'priority','secondary','movementPattern','vertical_push','muscleGroup','shoulders_side','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',120),
        jsonb_build_object('slotIndex',5,'priority','isolation','movementPattern','isolation_lateral_delt','muscleGroup','shoulders_side','setsRange',jsonb_build_array(2,2),'repRange',jsonb_build_array(12,15),'targetRest',75),
        jsonb_build_object('slotIndex',6,'priority','finisher','isFinisher',true,'finisherName','Plank','movementPattern','core_antirotation','muscleGroup','core','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(10,12),'targetRest',60)
      )
    ),
    jsonb_build_object('dayIndex',4,'dayType','Rest','targetRIR',3,'defaultRepRangeZone','hypertrophy','exerciseSlots', jsonb_build_array()),
    jsonb_build_object(
      'dayIndex', 5, 'dayType', 'FullBody', 'dayRole', 'Pump',
      'defaultRepRangeZone', 'hypertrophy', 'targetRIR', 2,
      'exerciseSlots', jsonb_build_array(
        jsonb_build_object('slotIndex',0,'isWarmup',true,'warmupName','Aktivacija cora','priority','isolation','movementPattern','core_antirotation','muscleGroup','core','setsRange',jsonb_build_array(1,1),'repRange',jsonb_build_array(12,15),'targetRest',30),
        jsonb_build_object('slotIndex',1,'priority','primary','movementPattern','hip_extension','muscleGroup','glutes','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',150),
        jsonb_build_object('slotIndex',2,'priority','primary','movementPattern','knee_dominant','muscleGroup','quads','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',150),
        jsonb_build_object('slotIndex',3,'priority','secondary','movementPattern','vertical_pull','muscleGroup','back_lats','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',120),
        jsonb_build_object('slotIndex',4,'priority','secondary','movementPattern','horizontal_push','muscleGroup','chest','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',120),
        jsonb_build_object('slotIndex',5,'priority','isolation','movementPattern','abduction','muscleGroup','glutes_med','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(12,15),'targetRest',75),
        jsonb_build_object('slotIndex',6,'priority','finisher','isFinisher',true,'finisherName','Dead Bug','movementPattern','core_anti_extension','muscleGroup','core','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(10,12),'targetRest',60)
      )
    ),
    jsonb_build_object('dayIndex',6,'dayType','Rest','targetRIR',3,'defaultRepRangeZone','hypertrophy','exerciseSlots', jsonb_build_array()),
    jsonb_build_object('dayIndex',7,'dayType','Rest','targetRIR',3,'defaultRepRangeZone','hypertrophy','exerciseSlots', jsonb_build_array())
  )
),
name = 'Sistem: Beginner FB 3x · Glute Focus (pocetnici.md)'
WHERE id = 'a1111111-1111-4111-8111-111111111111';

-- ────────────────────────────────────────────────────────────────────────────
-- 2) FAT_LOSS template (default order, shorter rests + restDayCardio)
-- ────────────────────────────────────────────────────────────────────────────
UPDATE public.session_templates
SET skeleton = jsonb_build_object(
  'id', 'SYS_BEG_FB_3_FATLOSS',
  'name', 'Sistem: Beginner FB 3x · Fat Loss (pocetnici.md)',
  'level', 'beginner',
  'daysPerWeek', 3,
  'periodizationType', 'linear',
  'restDayCardio', 'LISS 30 min lagana šetnja',
  'days', jsonb_build_array(
    jsonb_build_object(
      'dayIndex', 1, 'dayType', 'FullBody', 'dayRole', 'Heavy',
      'defaultRepRangeZone', 'hypertrophy', 'targetRIR', 2,
      'exerciseSlots', jsonb_build_array(
        jsonb_build_object('slotIndex',0,'isWarmup',true,'warmupName','Aktivacija cora','priority','isolation','movementPattern','core_antirotation','muscleGroup','core','setsRange',jsonb_build_array(1,1),'repRange',jsonb_build_array(12,15),'targetRest',30),
        jsonb_build_object('slotIndex',1,'priority','primary','movementPattern','knee_dominant','muscleGroup','quads','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',90),
        jsonb_build_object('slotIndex',2,'priority','primary','movementPattern','hip_extension','muscleGroup','glutes','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',90),
        jsonb_build_object('slotIndex',3,'priority','secondary','movementPattern','vertical_pull','muscleGroup','back_lats','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',75),
        jsonb_build_object('slotIndex',4,'priority','secondary','movementPattern','horizontal_push','muscleGroup','chest','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',75),
        jsonb_build_object('slotIndex',5,'priority','isolation','movementPattern','abduction','muscleGroup','glutes_med','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(12,15),'targetRest',45),
        jsonb_build_object('slotIndex',6,'priority','finisher','isFinisher',true,'finisherName','Dead Bug','movementPattern','core_anti_extension','muscleGroup','core','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(10,12),'targetRest',45)
      )
    ),
    jsonb_build_object('dayIndex',2,'dayType','Rest','targetRIR',3,'defaultRepRangeZone','hypertrophy','exerciseSlots', jsonb_build_array()),
    jsonb_build_object(
      'dayIndex', 3, 'dayType', 'FullBody', 'dayRole', 'Tension',
      'defaultRepRangeZone', 'hypertrophy', 'targetRIR', 2,
      'exerciseSlots', jsonb_build_array(
        jsonb_build_object('slotIndex',0,'isWarmup',true,'warmupName','Aktivacija cora','priority','isolation','movementPattern','core_antirotation','muscleGroup','core','setsRange',jsonb_build_array(1,1),'repRange',jsonb_build_array(12,15),'targetRest',30),
        jsonb_build_object('slotIndex',1,'priority','primary','movementPattern','hip_dominant','muscleGroup','hamstrings','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',90),
        jsonb_build_object('slotIndex',2,'priority','primary','movementPattern','lunge','muscleGroup','glutes','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',75),
        jsonb_build_object('slotIndex',3,'priority','secondary','movementPattern','horizontal_pull','muscleGroup','back_lats','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',75),
        jsonb_build_object('slotIndex',4,'priority','secondary','movementPattern','vertical_push','muscleGroup','shoulders_side','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',75),
        jsonb_build_object('slotIndex',5,'priority','isolation','movementPattern','isolation_lateral_delt','muscleGroup','shoulders_side','setsRange',jsonb_build_array(2,2),'repRange',jsonb_build_array(12,15),'targetRest',45),
        jsonb_build_object('slotIndex',6,'priority','finisher','isFinisher',true,'finisherName','Plank','movementPattern','core_antirotation','muscleGroup','core','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(10,12),'targetRest',45)
      )
    ),
    jsonb_build_object('dayIndex',4,'dayType','Rest','targetRIR',3,'defaultRepRangeZone','hypertrophy','exerciseSlots', jsonb_build_array()),
    jsonb_build_object(
      'dayIndex', 5, 'dayType', 'FullBody', 'dayRole', 'Pump',
      'defaultRepRangeZone', 'hypertrophy', 'targetRIR', 2,
      'exerciseSlots', jsonb_build_array(
        jsonb_build_object('slotIndex',0,'isWarmup',true,'warmupName','Aktivacija cora','priority','isolation','movementPattern','core_antirotation','muscleGroup','core','setsRange',jsonb_build_array(1,1),'repRange',jsonb_build_array(12,15),'targetRest',30),
        jsonb_build_object('slotIndex',1,'priority','primary','movementPattern','knee_dominant','muscleGroup','quads','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',90),
        jsonb_build_object('slotIndex',2,'priority','primary','movementPattern','hip_extension','muscleGroup','glutes','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',90),
        jsonb_build_object('slotIndex',3,'priority','secondary','movementPattern','vertical_pull','muscleGroup','back_lats','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',75),
        jsonb_build_object('slotIndex',4,'priority','secondary','movementPattern','horizontal_push','muscleGroup','chest','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',75),
        jsonb_build_object('slotIndex',5,'priority','isolation','movementPattern','abduction','muscleGroup','glutes_med','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(12,15),'targetRest',45),
        jsonb_build_object('slotIndex',6,'priority','finisher','isFinisher',true,'finisherName','Dead Bug','movementPattern','core_anti_extension','muscleGroup','core','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(10,12),'targetRest',45)
      )
    ),
    jsonb_build_object('dayIndex',6,'dayType','Rest','targetRIR',3,'defaultRepRangeZone','hypertrophy','exerciseSlots', jsonb_build_array()),
    jsonb_build_object('dayIndex',7,'dayType','Rest','targetRIR',3,'defaultRepRangeZone','hypertrophy','exerciseSlots', jsonb_build_array())
  )
),
name = 'Sistem: Beginner FB 3x · Fat Loss (pocetnici.md)'
WHERE id = 'a2222222-2222-4222-8222-222222222222';

-- ────────────────────────────────────────────────────────────────────────────
-- 3) TONE template (default order, supersets on slots 5-6)
-- ────────────────────────────────────────────────────────────────────────────
UPDATE public.session_templates
SET skeleton = jsonb_build_object(
  'id', 'SYS_BEG_FB_3_TONE',
  'name', 'Sistem: Beginner FB 3x · Tone (pocetnici.md)',
  'level', 'beginner',
  'daysPerWeek', 3,
  'periodizationType', 'linear',
  'days', jsonb_build_array(
    jsonb_build_object(
      'dayIndex', 1, 'dayType', 'FullBody', 'dayRole', 'Heavy',
      'defaultRepRangeZone', 'hypertrophy', 'targetRIR', 2,
      'exerciseSlots', jsonb_build_array(
        jsonb_build_object('slotIndex',0,'isWarmup',true,'warmupName','Aktivacija cora','priority','isolation','movementPattern','core_antirotation','muscleGroup','core','setsRange',jsonb_build_array(1,1),'repRange',jsonb_build_array(12,15),'targetRest',30),
        jsonb_build_object('slotIndex',1,'priority','primary','movementPattern','knee_dominant','muscleGroup','quads','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',150),
        jsonb_build_object('slotIndex',2,'priority','primary','movementPattern','hip_extension','muscleGroup','glutes','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',150),
        jsonb_build_object('slotIndex',3,'priority','secondary','movementPattern','vertical_pull','muscleGroup','back_lats','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',120),
        jsonb_build_object('slotIndex',4,'priority','secondary','movementPattern','horizontal_push','muscleGroup','chest','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',120),
        jsonb_build_object('slotIndex',5,'priority','isolation','superset',true,'movementPattern','abduction','muscleGroup','glutes_med','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(12,15),'targetRest',75),
        jsonb_build_object('slotIndex',6,'priority','finisher','isFinisher',true,'superset',true,'finisherName','Dead Bug','movementPattern','core_anti_extension','muscleGroup','core','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(10,12),'targetRest',60)
      )
    ),
    jsonb_build_object('dayIndex',2,'dayType','Rest','targetRIR',3,'defaultRepRangeZone','hypertrophy','exerciseSlots', jsonb_build_array()),
    jsonb_build_object(
      'dayIndex', 3, 'dayType', 'FullBody', 'dayRole', 'Tension',
      'defaultRepRangeZone', 'hypertrophy', 'targetRIR', 2,
      'exerciseSlots', jsonb_build_array(
        jsonb_build_object('slotIndex',0,'isWarmup',true,'warmupName','Aktivacija cora','priority','isolation','movementPattern','core_antirotation','muscleGroup','core','setsRange',jsonb_build_array(1,1),'repRange',jsonb_build_array(12,15),'targetRest',30),
        jsonb_build_object('slotIndex',1,'priority','primary','movementPattern','hip_dominant','muscleGroup','hamstrings','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',150),
        jsonb_build_object('slotIndex',2,'priority','primary','movementPattern','lunge','muscleGroup','glutes','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',120),
        jsonb_build_object('slotIndex',3,'priority','secondary','movementPattern','horizontal_pull','muscleGroup','back_lats','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',120),
        jsonb_build_object('slotIndex',4,'priority','secondary','movementPattern','vertical_push','muscleGroup','shoulders_side','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',120),
        jsonb_build_object('slotIndex',5,'priority','isolation','superset',true,'movementPattern','isolation_lateral_delt','muscleGroup','shoulders_side','setsRange',jsonb_build_array(2,2),'repRange',jsonb_build_array(12,15),'targetRest',75),
        jsonb_build_object('slotIndex',6,'priority','finisher','isFinisher',true,'superset',true,'finisherName','Plank','movementPattern','core_antirotation','muscleGroup','core','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(10,12),'targetRest',60)
      )
    ),
    jsonb_build_object('dayIndex',4,'dayType','Rest','targetRIR',3,'defaultRepRangeZone','hypertrophy','exerciseSlots', jsonb_build_array()),
    jsonb_build_object(
      'dayIndex', 5, 'dayType', 'FullBody', 'dayRole', 'Pump',
      'defaultRepRangeZone', 'hypertrophy', 'targetRIR', 2,
      'exerciseSlots', jsonb_build_array(
        jsonb_build_object('slotIndex',0,'isWarmup',true,'warmupName','Aktivacija cora','priority','isolation','movementPattern','core_antirotation','muscleGroup','core','setsRange',jsonb_build_array(1,1),'repRange',jsonb_build_array(12,15),'targetRest',30),
        jsonb_build_object('slotIndex',1,'priority','primary','movementPattern','knee_dominant','muscleGroup','quads','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',150),
        jsonb_build_object('slotIndex',2,'priority','primary','movementPattern','hip_extension','muscleGroup','glutes','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',150),
        jsonb_build_object('slotIndex',3,'priority','secondary','movementPattern','vertical_pull','muscleGroup','back_lats','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',120),
        jsonb_build_object('slotIndex',4,'priority','secondary','movementPattern','horizontal_push','muscleGroup','chest','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(8,12),'targetRest',120),
        jsonb_build_object('slotIndex',5,'priority','isolation','superset',true,'movementPattern','abduction','muscleGroup','glutes_med','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(12,15),'targetRest',75),
        jsonb_build_object('slotIndex',6,'priority','finisher','isFinisher',true,'superset',true,'finisherName','Dead Bug','movementPattern','core_anti_extension','muscleGroup','core','setsRange',jsonb_build_array(3,3),'repRange',jsonb_build_array(10,12),'targetRest',60)
      )
    ),
    jsonb_build_object('dayIndex',6,'dayType','Rest','targetRIR',3,'defaultRepRangeZone','hypertrophy','exerciseSlots', jsonb_build_array()),
    jsonb_build_object('dayIndex',7,'dayType','Rest','targetRIR',3,'defaultRepRangeZone','hypertrophy','exerciseSlots', jsonb_build_array())
  )
),
name = 'Sistem: Beginner FB 3x · Tone (pocetnici.md)'
WHERE id = 'a3333333-3333-4333-8333-333333333333';

-- ────────────────────────────────────────────────────────────────────────────
-- Verify
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt
  FROM public.session_templates
  WHERE position = 'beginner_3'
    AND status = 'active'
    AND skeleton->>'name' LIKE '%pocetnici.md%';
  IF cnt <> 3 THEN
    RAISE EXCEPTION 'Expected 3 active beginner_3 templates with pocetnici.md, got %', cnt;
  END IF;
END $$;
