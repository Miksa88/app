// ============================================================================
// tempoAndRampUp — pocetnici.md §2.2.B/C + SREDNJE_NAPREDNE_V2 §2.2.B/C
// ============================================================================
//
// BEGINNER:
//   Tempo: 2-0-2-0 compound, 2-1-2-1 Hip Thrust, 3-0-1-0 RDL, 2-0-2-2 abdukcija.
//   Ramp-up za compound: 50% × 10-12 → 75% × 4-6 (2 setova).
//   Ramp-up za prvu izolaciju: 60% × 10-12 (1 set).
//
// INTERMEDIATE:
//   Tempo: kao beginner za compound + Hip Thrust + RDL, ali izolacije
//   dobijaju 3-0-1-2 (3s ekscentrik, 0s bottom, 1s koncentrik, 2s contracted
//   hold) — kontrakcija fokus, više stimulus po seriji uz manji volumen.
//   Ramp-up za PRVU compound vežbu treninga: dodaje se 3. set 90% × 2-3
//   (priprema za RPE 8-9 radne serije).
// ============================================================================

import type {
  ExerciseSlot,
  ExperienceLevel,
  MovementPattern,
  SlotPriority,
} from '@/types/training';

// ============================================================================
// getDefaultTempo — vraća tempo string per movement pattern
// ============================================================================

export function getDefaultTempo(
  movementPattern: MovementPattern,
  muscleGroup?: string,
  experienceLevel: ExperienceLevel = 'beginner',
): string {
  // Hip Thrust dobija 2-1-2-1 (1s pauza u dnu i vrhu za glute squeeze)
  if (movementPattern === 'hip_extension' && muscleGroup === 'glutes') {
    return '2-1-2-1';
  }
  // RDL — 3s ekscentrik za stretch emphasis na hamstrings
  if (movementPattern === 'hip_dominant') {
    return '3-0-1-0';
  }
  // Abdukcija — sustained tension (2s pauza u contracted position)
  if (movementPattern === 'abduction') {
    return '2-0-2-2';
  }
  // Plank / izometrija — fiksna izometrija, nema tempa
  if (movementPattern === 'core_antirotation') {
    return 'isometric';
  }

  // Intermediate izolacije — kontrakcija fokus 3-0-1-2 (SREDNJE_NAPREDNE_V2 §2.2.C)
  if (experienceLevel === 'intermediate' && isIsolationPattern(movementPattern)) {
    return '3-0-1-2';
  }

  // Default kompound: 2-0-2-0
  return '2-0-2-0';
}

const ISOLATION_PATTERNS: Set<MovementPattern> = new Set([
  'isolation_biceps',
  'isolation_triceps',
  'isolation_rear_delt',
  'isolation_lateral_delt',
]);

function isIsolationPattern(pattern: MovementPattern): boolean {
  return ISOLATION_PATTERNS.has(pattern);
}

// ============================================================================
// generateRampUpSets — pre prve radne serije compound (§2.2.B)
// ============================================================================
//
// Pravilo:
//   - PRIMARY/SECONDARY compound (priority='primary' ili 'secondary' i
//     movementPattern je compound) → 2 ramp-up seta (50% i 75%)
//   - Prvi ISOLATION slot u treningu → 1 ramp-up set (60% × 10-12)
//   - Finisher i ostali izolation slotovi → bez ramp-up-a (već su zagrejani
//     iz prethodnih radnih serija)

const COMPOUND_PATTERNS: Set<MovementPattern> = new Set([
  'knee_dominant',
  'hip_dominant',
  'hip_extension',
  'horizontal_push',
  'vertical_push',
  'horizontal_pull',
  'vertical_pull',
]);

export function generateRampUpSets(
  slot: { priority: SlotPriority; movementPattern: MovementPattern },
  isFirstIsolationOfSession: boolean = false,
  options: {
    experienceLevel?: ExperienceLevel;
    isFirstCompoundOfSession?: boolean;
  } = {},
): ExerciseSlot['rampUpSets'] {
  const isCompound = COMPOUND_PATTERNS.has(slot.movementPattern);
  const { experienceLevel = 'beginner', isFirstCompoundOfSession = false } = options;

  if ((slot.priority === 'primary' || slot.priority === 'secondary') && isCompound) {
    const baseSets: NonNullable<ExerciseSlot['rampUpSets']> = [
      { weightPct: 0.50, reps: 12, targetRest: 60 },
      { weightPct: 0.75, reps: 6, targetRest: 105 },  // 90-120s mid
    ];
    // SREDNJE_NAPREDNE_V2 §2.2.B: prvi compound treninga dobija dodatnu
    // 90% × 2-3 ramp-up seriju (priprema za RPE 8-9).
    if (experienceLevel === 'intermediate' && isFirstCompoundOfSession) {
      baseSets.push({ weightPct: 0.90, reps: 3, targetRest: 105 });
    }
    return baseSets;
  }

  if (slot.priority === 'isolation' && isFirstIsolationOfSession) {
    return [
      { weightPct: 0.60, reps: 12, targetRest: 60 },
    ];
  }

  return undefined;
}

// ============================================================================
// applyTempoAndRampUp — u skeleton.day.exerciseSlots
// ============================================================================
//
// Mutator: prolazi kroz sve slot-ove i popunjava `tempo` + `rampUpSets`.
// Vraća izmenjeni dan (immutable kopija).

export function applyTempoAndRampUp<T extends {
  exerciseSlots: ExerciseSlot[];
}>(day: T, experienceLevel: ExperienceLevel = 'beginner'): T {
  let firstIsolationFound = false;
  let firstCompoundFound = false;
  const newSlots = day.exerciseSlots.map((slot) => {
    const tempo = slot.tempo
      ?? getDefaultTempo(slot.movementPattern, slot.muscleGroup, experienceLevel);
    const isFirstIsolation = !firstIsolationFound && slot.priority === 'isolation';
    if (isFirstIsolation) firstIsolationFound = true;

    const isCompoundSlot = COMPOUND_PATTERNS.has(slot.movementPattern)
      && (slot.priority === 'primary' || slot.priority === 'secondary');
    const isFirstCompound = !firstCompoundFound && isCompoundSlot;
    if (isFirstCompound) firstCompoundFound = true;

    const rampUpSets = slot.rampUpSets ?? generateRampUpSets(
      slot,
      isFirstIsolation,
      { experienceLevel, isFirstCompoundOfSession: isFirstCompound },
    );
    return { ...slot, tempo, rampUpSets };
  });
  return { ...day, exerciseSlots: newSlots };
}
