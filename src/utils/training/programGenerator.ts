// ============================================================================
// programGenerator — 4-slojni pipeline orkestrator
// Spec: 01_TRAINING_FLOW_MASTER.md Sekcija 2 (Arhitektura na 4 sloja)
//       + Sekcija 5 (Algoritamski pipeline)
// ============================================================================
//
// SLOJ 1: ARHITEKTURA — selectTemplate (vec u sessionTemplates.ts)
// SLOJ 2: BIOLOSKI FILTER — exerciseSubstitution
// SLOJ 3: KALIBRACIJA OPORAVKA — recoveryCalibration + calibrateVolume
// SLOJ 4: INTENZITET I LOADING — loadParameters (placeholder do Faze 2.4 sa
//                                  exercise library-jem; sada PROGRESS-only)
//
// Ovaj fajl orchestratuje sve slojeve. Pure funkcija — uzima skeleton +
// profile + exerciseLibrary + queue state, vraca konkretan applied skeleton
// (sa chosen exercises i finalSets izracunatim).
//
// Faza 2 scope: dovoljno da Sync Engine ima sta da poziva. Loading Sloj 4
// (Double Progressive Overload, weight calculation) bice popunjen u Fazi 2.4
// kad imamo realan exercise library i progress state.
// ============================================================================

import type {
  SessionSkeleton,
  ExerciseSlot,
  Exercise,
  ClientTrainingProfile,
  GoalOverlay,
  MesocycleQueue,
  QueuedSession,
  LoadingMode,
  Partition,
} from '@/types/training';
import type { NutritionCyclePhase } from '@/types/nutrition';

import { calcDecay, RETURN_FROM_BREAK_INITIAL_COUNTDOWN } from './decayCalculator';
import { pickExerciseForSlot } from './exerciseSubstitution';
import {
  calcNextWeight,
  type ClientProfileSnapshot,
  type ExerciseHistorySample,
  type ExerciseMeta,
} from './dpoCalculator';

// ============================================================================
// applyGoalOverlay — Sekcija 5 Korak 3
// ============================================================================
//
// Goal Overlay menja prioritete slotova. Najvazniji efekti:
//   GLUTE_FOCUS: pomeri glute slot na poziciju 1 svakog Lower dana
//   TONE: poslednje 2 vezbe svakog dana → markiraj kao superset
//   FAT_LOSS: rest times override 45–60s, weights ostaju iste
//
// Vraca DUBOKU KOPIJU skeleton-a (ne mutira ulaz).

export function applyGoalOverlay(
  skeleton: SessionSkeleton,
  overlay: GoalOverlay,
): SessionSkeleton {
  const cloned = cloneSkeleton(skeleton);

  switch (overlay) {
    case 'GLUTE_FOCUS':
      return applyGluteFocus(cloned);
    case 'TONE':
      return applyTone(cloned);
    case 'FAT_LOSS':
      return applyFatLoss(cloned);
  }
}

function applyGluteFocus(skel: SessionSkeleton): SessionSkeleton {
  // Za svaki Lower/FullBody dan, premesti prvi glute slot na poziciju 1
  for (const day of skel.days) {
    if (day.dayType !== 'Lower' && day.dayType !== 'FullBody' && day.dayType !== 'Legs') {
      continue;
    }
    const gluteIdx = day.exerciseSlots.findIndex(
      s => s.muscleGroup === 'glutes' || s.muscleGroup === 'glutes_med',
    );
    if (gluteIdx > 0) {
      const [glute] = day.exerciseSlots.splice(gluteIdx, 1);
      glute.priority = 'primary';
      day.exerciseSlots.unshift(glute);
      day.exerciseSlots.forEach((s, i) => { s.slotIndex = i + 1; });
    }
  }
  return skel;
}

function applyTone(skel: SessionSkeleton): SessionSkeleton {
  // Markiraj poslednje 2 vezbe kao finisher (superset bez pauze)
  for (const day of skel.days) {
    const slots = day.exerciseSlots;
    if (slots.length >= 2) {
      slots[slots.length - 1].priority = 'finisher';
      slots[slots.length - 2].priority = 'finisher';
    }
  }
  return skel;
}

function applyFatLoss(skel: SessionSkeleton): SessionSkeleton {
  // Override rest times — postavlja se u Loading Sloj 4
  // Za sad samo markiramo skeleton kao "fat_loss aware"
  // (stvarni rest override ide u loadParameters kad imamo Loading impl)
  return skel;
}

// ============================================================================
// applyExerciseSubstitution — Sloj 2
// ============================================================================
//
// Za svaki slot u skeletu, izaberi konkretnu vezbu iz pool-a. Vraca novi
// skeleton sa popunjenim `chosenExerciseId` u svakom slotu.

export interface SubstitutionContext {
  exerciseLibrary: Exercise[];
  profile: ClientTrainingProfile;
  goalOverlay?: GoalOverlay;
  recentlyUsedExerciseIds?: number[];
}

export interface SubstitutionFailure {
  dayIndex: number;
  slotIndex: number;
  reason: string;
}

export interface SubstitutionPipelineResult {
  skeleton: SessionSkeleton;
  failures: SubstitutionFailure[];
}

export function applyExerciseSubstitution(
  skeleton: SessionSkeleton,
  ctx: SubstitutionContext,
): SubstitutionPipelineResult {
  const cloned = cloneSkeleton(skeleton);
  const failures: SubstitutionFailure[] = [];

  for (const day of cloned.days) {
    for (const slot of day.exerciseSlots) {
      const result = pickExerciseForSlot({
        pool: ctx.exerciseLibrary,
        slot,
        profile: ctx.profile,
        goalOverlay: ctx.goalOverlay,
        recentlyUsedExerciseIds: ctx.recentlyUsedExerciseIds,
      });

      if (result.chosen) {
        slot.chosenExerciseId = result.chosen.id;
      } else {
        failures.push({
          dayIndex: day.dayIndex,
          slotIndex: slot.slotIndex,
          reason: result.note ?? 'No candidate found',
        });
      }
    }
  }

  return { skeleton: cloned, failures };
}

// ============================================================================
// calibrateVolume — Sloj 3 (Sekcija 5 Korak 5)
// ============================================================================
//
// Recovery multiplier (+ optional cycle bonus) interpoluje sets unutar
// setsRange[min, max]:
//   recovery 0.7 → blizu min
//   recovery 1.1 → blizu max
//
// Cycle bonus (Tabela u Sekciji 5 — "Late Follicular" +5%, "Late Luteal" -8%)
// dodaje se na effective recovery pre interpolacije. Posto NutritionCyclePhase
// koristi grublje 4-fazu, ovde mapiramo: ovulation/early-follicular = +5%,
// late-luteal/menstrual = -8%, ostale = 0.

export interface VolumeCalibrationContext {
  recoveryMultiplier: number;
  cyclePhase?: NutritionCyclePhase | null;
  loadingMode?: LoadingMode;             // ako MINI_DELOAD + returnFromBreak, jos -50%
  returnFromBreakActive?: boolean;
}

export function calibrateVolume(
  skeleton: SessionSkeleton,
  ctx: VolumeCalibrationContext,
): SessionSkeleton {
  const cloned = cloneSkeleton(skeleton);
  const cycleBonus = cycleBonusForPhase(ctx.cyclePhase ?? null);
  const effectiveRecovery = ctx.recoveryMultiplier + cycleBonus;
  const normalized = clamp((effectiveRecovery - 0.7) / 0.4, 0, 1);

  for (const day of cloned.days) {
    for (const slot of day.exerciseSlots) {
      const [min, max] = slot.setsRange;
      let sets = Math.round(min + normalized * (max - min));
      sets = Math.max(min, sets);          // sanity: nikad ispod MEV

      // Return from Break: -50% volume
      if (ctx.returnFromBreakActive && ctx.loadingMode === 'MINI_DELOAD') {
        sets = Math.max(1, Math.floor(sets * 0.5));
      }

      slot.finalSets = sets;
    }
  }

  return cloned;
}

function cycleBonusForPhase(phase: NutritionCyclePhase | null): number {
  switch (phase) {
    case 'follicular':
    case 'ovulation':
      return 0.05;            // peak performance
    case 'menstrual':
      return -0.08;           // low estrogen, smanji volume
    case 'luteal':
      return -0.03;           // late luteal/PMS — manji penalty od menstrualnog
    default:
      return 0;
  }
}

// ============================================================================
// resolveLoadingModeForSession — Sloj 4 entry point
// (Decay + Return from Break tracking)
// ============================================================================

export interface LoadingResolveContext {
  session: QueuedSession;
  queue: MesocycleQueue;
  today: Date;
}

export interface LoadingResolveResult {
  loadingMode: LoadingMode;
  daysSinceLastSamePartition: number | null;
  shouldActivateReturnFromBreak: boolean;
  newReturnFromBreakCountdown: number;
}

export function resolveLoadingModeForSession(
  ctx: LoadingResolveContext,
): LoadingResolveResult {
  const partition = ctx.session.partition;
  const decay = calcDecay({
    partition,
    partitionLastSeen: ctx.queue.partitionLastSeen[partition],
    today: ctx.today,
    returnFromBreakCountdown: ctx.queue.returnFromBreakCountdown[partition] ?? 0,
  });

  const newCountdown = decay.shouldActivateReturnFromBreak
    ? RETURN_FROM_BREAK_INITIAL_COUNTDOWN
    : (ctx.queue.returnFromBreakCountdown[partition] ?? 0);

  return {
    loadingMode: decay.loadingMode,
    daysSinceLastSamePartition: decay.daysSince,
    shouldActivateReturnFromBreak: decay.shouldActivateReturnFromBreak,
    newReturnFromBreakCountdown: newCountdown,
  };
}

// ============================================================================
// generateSessionSkeleton — full pipeline za jednu konkretnu sesiju
// ============================================================================
//
// Ovo je TOP-LEVEL funkcija koju Sync Engine zove kad treba "konkretizovati"
// sledecu sesiju. Vraca skeleton.day za jedan dan, popunjen sa chosen
// exercises + finalSets.

export interface GenerateSessionInputs {
  templateSkeleton: SessionSkeleton;
  session: QueuedSession;
  queue: MesocycleQueue;
  profile: ClientTrainingProfile;
  exerciseLibrary: Exercise[];
  today: Date;
  goalOverlay?: GoalOverlay;
  cyclePhase?: NutritionCyclePhase | null;
  recentlyUsedExerciseIds?: number[];

  /**
   * Opcioni DPO input: poslednjih N setova po exercise.id. Kada je prosledjen,
   * `targetWeight`, `targetReps`, `targetRIR` na svakom slot-u ce biti
   * popunjeni kroz `calcNextWeight`. Ako nije prosledjen (ili je prazan),
   * cuvamo legacy ponasanje (samo `loadingNote` placeholder).
   *
   * Mapa je keyed na Exercise.id (number).
   */
  exerciseHistoryMap?: Map<number, ExerciseHistorySample[]>;
}

export interface GenerateSessionResult {
  skeleton: SessionSkeleton;            // full skeleton sa applied overlays
  loadingMode: LoadingMode;
  daysSinceLastSamePartition: number | null;
  shouldActivateReturnFromBreak: boolean;
  newReturnFromBreakCountdown: number;
  substitutionFailures: SubstitutionFailure[];
}

export function generateSessionSkeleton(input: GenerateSessionInputs): GenerateSessionResult {
  // Sloj 1: vec smo dobili template (selectTemplate je u sessionTemplates.ts)
  let skeleton = input.templateSkeleton;

  // Goal Overlay (deo Sloja 1/2 transition)
  if (input.goalOverlay) {
    skeleton = applyGoalOverlay(skeleton, input.goalOverlay);
  }

  // Sloj 2: bioloski filter — chose vezbe za svaki slot
  const subResult = applyExerciseSubstitution(skeleton, {
    exerciseLibrary: input.exerciseLibrary,
    profile: input.profile,
    goalOverlay: input.goalOverlay,
    recentlyUsedExerciseIds: input.recentlyUsedExerciseIds,
  });
  skeleton = subResult.skeleton;

  // Sloj 4 entry: resolve loading mode (PROGRESS / MAINTAIN / MINI_DELOAD)
  const loading = resolveLoadingModeForSession({
    session: input.session,
    queue: input.queue,
    today: input.today,
  });

  // Sloj 3: kalibracija volumena (sets) sa cycle bonus + return from break penalty
  skeleton = calibrateVolume(skeleton, {
    recoveryMultiplier: input.profile.recoveryMultiplier,
    cyclePhase: input.cyclePhase,
    loadingMode: loading.loadingMode,
    returnFromBreakActive: loading.newReturnFromBreakCountdown > 0,
  });

  // Sloj 4 weight/reps/RIR: ako je `exerciseHistoryMap` prosledjena, pozivamo
  // DPO (calcNextWeight) za svaki slot i popunjavamo target*. Ako mapa nije
  // prosledjena (legacy caller), ostajemo na placeholder `loadingNote`-u.
  const returnFromBreakActive = loading.newReturnFromBreakCountdown > 0;
  const dpoProfile: ClientProfileSnapshot = {
    currentWeightKg: input.profile.weight,
    experienceLevel: input.profile.experienceLevel,
  };

  for (const day of skeleton.days) {
    if (day.dayType !== input.session.dayType) continue;
    for (const slot of day.exerciseSlots) {
      slot.loadingNote = loadingModeNote(loading.loadingMode);

      if (!input.exerciseHistoryMap || slot.chosenExerciseId === undefined) {
        continue;
      }

      const exercise = input.exerciseLibrary.find(
        (e) => e.id === slot.chosenExerciseId,
      );
      if (!exercise) continue;

      const history = input.exerciseHistoryMap.get(exercise.id) ?? [];
      const meta: ExerciseMeta = {
        id: String(exercise.id),
        weight_increment: exercise.weightIncrement,
        is_bilateral: exercise.isBilateral,
        is_compound: exercise.isCompound,
      };

      const [repMin, repMax] = slot.repRange;
      const slotRepsTop = repMax;
      const slotTargetRIR = day.targetRIR;

      const dpo = calcNextWeight(
        history,
        meta,
        loading.loadingMode,
        dpoProfile,
        returnFromBreakActive,
        slotRepsTop,
        slotTargetRIR,
      );

      slot.targetWeight = dpo.targetWeight;
      slot.targetReps = `${repMin}-${repMax}`;
      slot.targetRIR = dpo.targetRIR;
    }
  }

  return {
    skeleton,
    loadingMode: loading.loadingMode,
    daysSinceLastSamePartition: loading.daysSinceLastSamePartition,
    shouldActivateReturnFromBreak: loading.shouldActivateReturnFromBreak,
    newReturnFromBreakCountdown: loading.newReturnFromBreakCountdown,
    substitutionFailures: subResult.failures,
  };
}

function loadingModeNote(mode: LoadingMode): string {
  switch (mode) {
    case 'PROGRESS': return 'Standardna progresija — pokusaj da povisis tezinu ako si hit-ovala top reps proslog puta.';
    case 'MAINTAIN': return 'Iste tezine kao proslog puta — fokus na tehniku.';
    case 'MINI_DELOAD': return 'Lagana sesija — vracamo se polako u ritam.';
  }
}

// ============================================================================
// Helpers
// ============================================================================

function cloneSkeleton(skel: SessionSkeleton): SessionSkeleton {
  return {
    ...skel,
    days: skel.days.map(d => ({
      ...d,
      exerciseSlots: d.exerciseSlots.map(s => ({ ...s })),
    })),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ============================================================================
// Re-export za convenience
// ============================================================================

export type { Partition, LoadingMode } from '@/types/training';
