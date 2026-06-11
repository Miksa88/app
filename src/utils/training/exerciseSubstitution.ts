// ============================================================================
// exerciseSubstitution — Sloj 2: bioloski filter za izbor vezbi
// Spec: 01_TRAINING_FLOW_MASTER.md Sekcija 5 Korak 4 (Filter and Substitute)
// ============================================================================
//
// Za svaki ExerciseSlot u skeleton-u, biramo konkretnu vezbu iz library-ja
// koja:
//   1. Matchuje movementPattern + muscleGroup slota
//   2. NIJE kontraindikovana za ijednu povredu klijentkinje
//   3. Matchuje difficulty (beginner_safe za beginner-a)
//   4. Za GLUTE_FOCUS overlay + primary slot: mora biti isGluteBuilder
//
// Scoring (Sekcija 5 Korak 4):
//   tensionProfile: 'stretch' > 'mid_range' > 'shortened' (za hipertrofiju)
//   cnsLoad: niži je bolji kada je recoveryMultiplier nizak
//   variety: ako je vec radjena uzastopno, demote
// ============================================================================

import type {
  Exercise,
  ExerciseSlot,
  ClientTrainingProfile,
  GoalOverlay,
  TensionProfile,
} from '@/types/training';

export interface SubstitutionInputs {
  pool: Exercise[];
  slot: ExerciseSlot;
  profile: ClientTrainingProfile;
  goalOverlay?: GoalOverlay;
  recentlyUsedExerciseIds?: number[];   // za variety scoring
}

export interface SubstitutionResult {
  chosen: Exercise | null;
  candidates: Exercise[];
  fallbackApplied: 'none' | 'movement_pattern_only' | 'gentle_on_match';
  note?: string;
}

// ============================================================================
// pickExerciseForSlot — glavni entry point
// ============================================================================

export function pickExerciseForSlot(input: SubstitutionInputs): SubstitutionResult {
  // Strict filter (Sekcija 5 Korak 4 — sve uslove istovremeno)
  const strictCandidates = input.pool.filter(ex => matchesStrict(ex, input));

  if (strictCandidates.length > 0) {
    return {
      chosen: pickBest(strictCandidates, input),
      candidates: strictCandidates,
      fallbackApplied: 'none',
    };
  }

  // Fallback 1: ublazi muscleGroup match (samo movementPattern + bezbedna)
  const looseCandidates = input.pool.filter(ex => matchesLoose(ex, input));
  if (looseCandidates.length > 0) {
    return {
      chosen: pickBest(looseCandidates, input),
      candidates: looseCandidates,
      fallbackApplied: 'movement_pattern_only',
      note: 'Nema vezbe koja matchuje i pattern i muscle group; uzeli pattern-only.',
    };
  }

  // Fallback 2: trazi vezbu koja je `gentleOn` za neku povredu
  if (input.profile.injuries.length > 0 && input.profile.injuries[0] !== 'none') {
    const gentleCandidates = input.pool.filter(ex =>
      input.profile.injuries.some(inj => ex.gentleOn.includes(inj)) &&
      ex.movementPattern === input.slot.movementPattern,
    );
    if (gentleCandidates.length > 0) {
      return {
        chosen: pickBest(gentleCandidates, input),
        candidates: gentleCandidates,
        fallbackApplied: 'gentle_on_match',
        note: 'Trazimo gentle-on opciju za povredu klijentkinje.',
      };
    }
  }

  // Nista — slot ostaje prazan, programGenerator mora da signalizira gresku
  return {
    chosen: null,
    candidates: [],
    fallbackApplied: 'none',
    note: 'Pool je prazan posle filtera. Trener mora da doda vezbe ili da relaksira ogranicenja.',
  };
}

// ============================================================================
// matchesStrict — sva pravila istovremeno
// ============================================================================

function matchesStrict(ex: Exercise, input: SubstitutionInputs): boolean {
  // Movement pattern + muscle group match
  if (ex.movementPattern !== input.slot.movementPattern) return false;
  if (ex.primaryMuscle !== input.slot.muscleGroup) return false;

  // Povrede — ni jedna kontraindikacija ne sme da matchuje
  if (hasContraindicationForInjuries(ex, input.profile)) return false;

  // Difficulty
  if (!matchesDifficulty(ex, input.profile.experienceLevel)) return false;

  // GLUTE_FOCUS overlay: primary slot mora biti glute builder
  if (input.goalOverlay === 'GLUTE_FOCUS' &&
      input.slot.priority === 'primary' &&
      !ex.isGluteBuilder) {
    return false;
  }

  return true;
}

// ============================================================================
// matchesLoose — samo movement pattern (fallback 1)
// ============================================================================

function matchesLoose(ex: Exercise, input: SubstitutionInputs): boolean {
  if (ex.movementPattern !== input.slot.movementPattern) return false;
  if (hasContraindicationForInjuries(ex, input.profile)) return false;
  if (!matchesDifficulty(ex, input.profile.experienceLevel)) return false;
  return true;
}

// ============================================================================
// hasContraindicationForInjuries
// ============================================================================

function hasContraindicationForInjuries(
  ex: Exercise,
  profile: ClientTrainingProfile,
): boolean {
  return profile.injuries.some(inj =>
    inj !== 'none' && ex.contraindications.includes(inj),
  );
}

// ============================================================================
// matchesDifficulty — beginner ne sme advanced exercises
// ============================================================================

function matchesDifficulty(
  ex: Exercise,
  level: ClientTrainingProfile['experienceLevel'],
): boolean {
  if (level === 'beginner') {
    return ex.difficulty === 'beginner_safe';
  }
  // intermediate moze 'beginner_safe' i 'intermediate', ali ne 'advanced'
  return ex.difficulty !== 'advanced';
}

// ============================================================================
// pickBest — scoring (Sekcija 5 Korak 4)
// ============================================================================

const TENSION_PROFILE_SCORE: Record<TensionProfile, number> = {
  stretch: 3,         // najveci stimulus, top za hipertrofiju
  full_rom: 2.5,
  mid_range: 2,
  shortened: 1,        // manji zamor, dobar za finisher
};

/**
 * Kontekst za rangiranje kandidata — podskup SubstitutionInputs koji je
 * dostupan i van automatskog surgical swap-a (npr. klijent-facing
 * SwapExerciseSheet, koji nema pun ClientTrainingProfile pri ruci).
 */
export interface ExerciseRankingContext {
  /** Recovery multiplier klijentkinje; default 1 (normalan oporavak). */
  recoveryMultiplier?: number;
  /** Nedavno korišćene vežbe — variety demote. */
  recentlyUsedExerciseIds?: number[];
}

/**
 * Skor jednog kandidata po Sekciji 5 Korak 4 (tension profile / CNS load /
 * variety). Izdvojeno iz pickBest da bi SwapExerciseSheet mogao da sortira
 * alternative istom logikom kao automatski surgical swap.
 */
export function scoreExerciseCandidate(
  ex: Exercise,
  ctx: ExerciseRankingContext = {},
): number {
  const recovery = ctx.recoveryMultiplier ?? 1;
  const recentlyUsed = new Set(ctx.recentlyUsedExerciseIds ?? []);

  let score = 0;

  // Tension profile (vise je bolje za hipertrofiju)
  score += TENSION_PROFILE_SCORE[ex.tensionProfile];

  // CNS load — ako recovery nizak, preferiramo manji CNS load
  if (recovery < 0.85) {
    score -= ex.cnsLoad * 0.5;          // penalty za visok CNS pri losem oporavku
  } else {
    score += (5 - ex.cnsLoad) * 0.2;    // mali bonus na lakim vezbama
  }

  // Variety — ako je nedavno koriscena, demote
  if (recentlyUsed.has(ex.id)) {
    score -= 1;
  }

  return score;
}

/**
 * Sortira kandidate po skoru opadajuće (stabilno — ties zadržavaju ulazni
 * redosled). Ne mutira ulazni niz.
 */
export function rankExerciseCandidates(
  candidates: Exercise[],
  ctx: ExerciseRankingContext = {},
): Exercise[] {
  return candidates
    .map(ex => ({ ex, score: scoreExerciseCandidate(ex, ctx) }))
    .sort((a, b) => b.score - a.score)
    .map(s => s.ex);
}

function pickBest(candidates: Exercise[], input: SubstitutionInputs): Exercise {
  if (candidates.length === 1) return candidates[0];

  return rankExerciseCandidates(candidates, {
    recoveryMultiplier: input.profile.recoveryMultiplier,
    recentlyUsedExerciseIds: input.recentlyUsedExerciseIds,
  })[0];
}
