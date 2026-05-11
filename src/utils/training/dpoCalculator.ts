// ============================================================================
// dpoCalculator.ts — Loading Sloj 4: Double Progressive Overload
// Spec: 01_TRAINING_FLOW_MASTER.md §5 Korak 6
// ============================================================================
//
// Pure funkcija koja vraća target (weight, reps, RIR) za sledeći set iz
// istorije setova + loading mode + RFB flag. Popunjava placeholder koji
// programGenerator ranije vraćao samo kao `loadingNote` string.
//
// Algoritam:
//   PROGRESS      → ako lastSet.reps >= slotRepsTop → +weight_increment
//                   inače ostaje isto
//   MAINTAIN      → ostaje isto
//   MINI_DELOAD   → × 0.90 (ili × 0.80 ako je RFB aktivan — spec §7.5)
//   First time    → estimateInitialWeight(profile, exercise)
//
// Weight se zaokružuje na najbliži `exercise.weight_increment`.
// ============================================================================

export type LoadingMode = 'PROGRESS' | 'MAINTAIN' | 'MINI_DELOAD';

export interface ExerciseHistorySample {
  weight_kg: number;
  reps: number;
  set_number: number;
  rir: number | null;
  completed_at: string;
}

export interface ExerciseMeta {
  id: string;
  weight_increment: number;
  is_bilateral: boolean;
  is_compound: boolean;
}

export interface ClientProfileSnapshot {
  currentWeightKg: number;
  experienceLevel: 'beginner' | 'intermediate';
}

export type DPOReason =
  | 'first_time'
  | 'hit_top'
  | 'missed_top'
  | 'rfb_deload'
  | 'rfb_maintain_90pct'
  | 'rfb_progress_90pct'
  | 'maintain';

export interface DPOResult {
  targetWeight: number;
  targetReps: number;
  targetRIR: number;
  loadingMode: LoadingMode;
  reason: DPOReason;
}

const ISOLATION_INITIAL_KG = 5;
const COMPOUND_BILATERAL_RATIO = { beginner: 0.5, intermediate: 0.7 } as const;
const COMPOUND_UNILATERAL_RATIO = 0.3;

// Spec 01 §5 Korak 6 line 1108: MINI_DELOAD = -20% težine.
// (Bilo 0.9 / -10% — silent drift; usklađeno sa spec-om 2026-05-04.)
const MINI_DELOAD_MULTIPLIER = 0.8;
const MINI_DELOAD_RFB_MULTIPLIER = 0.8;
// pocetnici.md §5.4 (A-5, 2026-05-08): pauza <7 dana → re-entry sa 90%
// snage prve nedelje. Primenjuje se u PROGRESS i MAINTAIN modovima dok je
// `returnFromBreakActive` true. Klijentkinja ne sme da forsira full intensity
// odmah po povratku — tetive i CNS treba 1 nedelju za reaktivaciju.
const RFB_PROGRESS_MULTIPLIER = 0.90;

function estimateInitialWeight(
  profile: ClientProfileSnapshot,
  exercise: ExerciseMeta,
): number {
  if (!exercise.is_compound) return ISOLATION_INITIAL_KG;
  if (exercise.is_bilateral) {
    return profile.currentWeightKg * COMPOUND_BILATERAL_RATIO[profile.experienceLevel];
  }
  return profile.currentWeightKg * COMPOUND_UNILATERAL_RATIO;
}

function roundToIncrement(weight: number, increment: number): number {
  if (increment <= 0) return weight;
  return Math.round(weight / increment) * increment;
}

// SREDNJE_NAPREDNE_V2 §0.3 + §2.2.F: intermediate ima manje skokove
// (Hip Thrust +2.5 vs +5 beginner, RDL +2.5 vs +5, DB +1 vs +2 itd.).
// Halve the increment, floor at 1kg (mikro-plate / DB granular minimum).
function getEffectiveIncrement(
  exercise: ExerciseMeta,
  experienceLevel: ClientProfileSnapshot['experienceLevel'],
): number {
  if (experienceLevel !== 'intermediate') return exercise.weight_increment;
  const halved = exercise.weight_increment / 2;
  return Math.max(1, halved);
}

/**
 * Bira top-set iz poslednje sesije (najnoviji `completed_at`): najveća
 * kombinacija težina × reps unutar te grupe datuma.
 *
 * Ulaz sortiran DESC po completed_at (kako Supabase query vraća).
 */
function selectLastTopSet(
  history: ExerciseHistorySample[],
): ExerciseHistorySample | null {
  if (history.length === 0) return null;

  const latestDate = history[0].completed_at.slice(0, 10);
  const latestSessionSets = history.filter(
    (s) => s.completed_at.slice(0, 10) === latestDate,
  );

  return latestSessionSets.reduce((top, s) => {
    const topVolume = top.weight_kg * top.reps;
    const sVolume = s.weight_kg * s.reps;
    return sVolume > topVolume ? s : top;
  }, latestSessionSets[0]);
}

export function calcNextWeight(
  history: ExerciseHistorySample[],
  exercise: ExerciseMeta,
  loadingMode: LoadingMode,
  profile: ClientProfileSnapshot,
  returnFromBreakActive: boolean,
  slotRepsTop: number = 8,
  slotTargetRIR: number = 2,
): DPOResult {
  if (history.length === 0) {
    const raw = estimateInitialWeight(profile, exercise);
    return {
      targetWeight: Math.max(0, roundToIncrement(raw, exercise.weight_increment)),
      targetReps: slotRepsTop,
      targetRIR: slotTargetRIR,
      loadingMode,
      reason: 'first_time',
    };
  }

  const topSet = selectLastTopSet(history);
  if (!topSet) {
    // Safety net — svejedno ne bi trebalo da se desi
    const raw = estimateInitialWeight(profile, exercise);
    return {
      targetWeight: Math.max(0, roundToIncrement(raw, exercise.weight_increment)),
      targetReps: slotRepsTop,
      targetRIR: slotTargetRIR,
      loadingMode,
      reason: 'first_time',
    };
  }

  const baseWeight = topSet.weight_kg;

  if (loadingMode === 'MINI_DELOAD') {
    const multiplier = returnFromBreakActive
      ? MINI_DELOAD_RFB_MULTIPLIER
      : MINI_DELOAD_MULTIPLIER;
    return {
      targetWeight: Math.max(0, roundToIncrement(baseWeight * multiplier, exercise.weight_increment)),
      targetReps: slotRepsTop,
      targetRIR: slotTargetRIR,
      loadingMode,
      reason: 'rfb_deload',
    };
  }

  if (loadingMode === 'MAINTAIN') {
    const w = returnFromBreakActive ? baseWeight * RFB_PROGRESS_MULTIPLIER : baseWeight;
    return {
      targetWeight: Math.max(0, roundToIncrement(w, exercise.weight_increment)),
      targetReps: slotRepsTop,
      targetRIR: slotTargetRIR,
      loadingMode,
      reason: returnFromBreakActive ? 'rfb_maintain_90pct' : 'maintain',
    };
  }

  // PROGRESS — pocetnici.md §5.4: ako je return from break, clamp na 90% čak i
  // kad je topSet hit. Tek druge nedelje ide pun progres.
  if (returnFromBreakActive) {
    return {
      targetWeight: Math.max(0, roundToIncrement(baseWeight * RFB_PROGRESS_MULTIPLIER, exercise.weight_increment)),
      targetReps: slotRepsTop,
      targetRIR: slotTargetRIR,
      loadingMode,
      reason: 'rfb_progress_90pct',
    };
  }

  if (topSet.reps >= slotRepsTop) {
    const effInc = getEffectiveIncrement(exercise, profile.experienceLevel);
    return {
      targetWeight: Math.max(0, roundToIncrement(baseWeight + effInc, effInc)),
      targetReps: slotRepsTop,
      targetRIR: slotTargetRIR,
      loadingMode,
      reason: 'hit_top',
    };
  }

  return {
    targetWeight: Math.max(0, roundToIncrement(baseWeight, exercise.weight_increment)),
    targetReps: slotRepsTop,
    targetRIR: slotTargetRIR,
    loadingMode,
    reason: 'missed_top',
  };
}
