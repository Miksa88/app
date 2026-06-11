import { describe, it, expect } from 'vitest';
import {
  applyGoalOverlay,
  calibrateVolume,
  resolveLoadingModeForSession,
  generateSessionSkeleton,
} from './programGenerator';
import type {
  SessionSkeleton,
  SkeletonDay,
  ExerciseSlot,
  MesocycleQueue,
  QueuedSession,
  Exercise,
  ClientTrainingProfile,
} from '@/types/training';

function makeSlot(overrides: Partial<ExerciseSlot> = {}): ExerciseSlot {
  return {
    slotIndex: 1,
    movementPattern: 'hip_dominant',
    muscleGroup: 'glutes',
    setsRange: [3, 5],
    repRange: [8, 12],
    priority: 'secondary',
    ...overrides,
  };
}

function makeDay(
  dayIndex: number,
  dayType: SkeletonDay['dayType'],
  slots: ExerciseSlot[],
): SkeletonDay {
  return {
    dayIndex,
    dayType,
    defaultRepRangeZone: 'hypertrophy',
    targetRIR: 2,
    exerciseSlots: slots,
  };
}

const baseSkeleton: SessionSkeleton = {
  id: 'TEST',
  level: 'intermediate',
  daysPerWeek: 4,
  name: 'Test',
  periodizationType: 'undulating',
  days: [
    makeDay(1, 'Lower', [
      makeSlot({ slotIndex: 1, movementPattern: 'knee_dominant', muscleGroup: 'quads', priority: 'primary' }),
      makeSlot({ slotIndex: 2, movementPattern: 'hip_dominant', muscleGroup: 'glutes', priority: 'secondary' }),
      makeSlot({ slotIndex: 3, movementPattern: 'isolation_biceps', muscleGroup: 'biceps', priority: 'isolation' }),
    ]),
  ],
};

describe('applyGoalOverlay — GLUTE_FOCUS', () => {
  it('pomera glute slot na poziciju 1 i markira kao primary', () => {
    const result = applyGoalOverlay(baseSkeleton, 'GLUTE_FOCUS');
    const lowerDay = result.days[0];
    expect(lowerDay.exerciseSlots[0].muscleGroup).toBe('glutes');
    expect(lowerDay.exerciseSlots[0].priority).toBe('primary');
  });

  it('NE mutira ulazni skeleton', () => {
    const original = JSON.parse(JSON.stringify(baseSkeleton));
    applyGoalOverlay(baseSkeleton, 'GLUTE_FOCUS');
    expect(baseSkeleton).toEqual(original);
  });
});

describe('applyGoalOverlay — TONE', () => {
  it('markira poslednje 2 vezbe kao finisher', () => {
    const result = applyGoalOverlay(baseSkeleton, 'TONE');
    const slots = result.days[0].exerciseSlots;
    expect(slots[slots.length - 1].priority).toBe('finisher');
    expect(slots[slots.length - 2].priority).toBe('finisher');
  });
});

describe('calibrateVolume — recovery → sets interpolacija', () => {
  it('recovery 0.7 → sets blizu min', () => {
    const result = calibrateVolume(baseSkeleton, { recoveryMultiplier: 0.7 });
    const slot = result.days[0].exerciseSlots[0];
    expect(slot.finalSets).toBe(3);  // min iz [3, 5]
  });

  it('recovery 1.1 → sets blizu max', () => {
    const result = calibrateVolume(baseSkeleton, { recoveryMultiplier: 1.1 });
    const slot = result.days[0].exerciseSlots[0];
    expect(slot.finalSets).toBe(5);
  });

  it('recovery 0.9 → sets na sredini', () => {
    const result = calibrateVolume(baseSkeleton, { recoveryMultiplier: 0.9 });
    const slot = result.days[0].exerciseSlots[0];
    expect(slot.finalSets).toBe(4);  // round od (0.9-0.7)/0.4 = 0.5; 3+0.5*2 = 4
  });

  it('cycle phase=menstrual smanji volume (efektivni recovery -0.08)', () => {
    const without = calibrateVolume(baseSkeleton, { recoveryMultiplier: 1.0 });
    const withMenstrual = calibrateVolume(baseSkeleton, {
      recoveryMultiplier: 1.0,
      cyclePhase: 'menstrual',
    });
    // Non-null: calibrateVolume uvek popunjava finalSets na svakom slotu.
    expect(withMenstrual.days[0].exerciseSlots[0].finalSets!).toBeLessThanOrEqual(
      without.days[0].exerciseSlots[0].finalSets!,
    );
  });

  it('Return from Break + MINI_DELOAD → finalSets = floor(sets × 0.5)', () => {
    const result = calibrateVolume(baseSkeleton, {
      recoveryMultiplier: 1.0,
      loadingMode: 'MINI_DELOAD',
      returnFromBreakActive: true,
    });
    const slot = result.days[0].exerciseSlots[0];
    // Bez Return: 4 sets za 1.0 recovery. Sa Return: floor(4 * 0.5) = 2
    expect(slot.finalSets).toBe(2);
  });
});

describe('resolveLoadingModeForSession', () => {
  const today = new Date('2026-04-19T12:00:00Z');
  const session: QueuedSession = {
    sessionId: 'A1',
    label: 'Lower',
    dayType: 'Lower',
    partition: 'Lower',
    status: 'next',
    scheduledDate: today,
    completedAt: null,
    actualWorkoutSessionId: null,
  };

  it('prvi trening particije → PROGRESS, ne aktivira return', () => {
    const queue: MesocycleQueue = {
      clientId: 't', mesocycleIndex: 1, templateId: 't', sessions: [session],
      sessionPointer: 0, currentMicrocycleIndex: 0, swapUsedThisMicrocycle: false,
      partitionLastSeen: {}, returnFromBreakCountdown: {},
      createdAt: today, completedAt: null,
    };
    const r = resolveLoadingModeForSession({ session, queue, today });
    expect(r.loadingMode).toBe('PROGRESS');
    expect(r.shouldActivateReturnFromBreak).toBe(false);
  });

  it('pauza > 7 dana → MINI_DELOAD + aktivira return countdown 2', () => {
    const tenDaysAgo = new Date(today.getTime() - 10 * 86400_000);
    const queue: MesocycleQueue = {
      clientId: 't', mesocycleIndex: 1, templateId: 't', sessions: [session],
      sessionPointer: 0, currentMicrocycleIndex: 0, swapUsedThisMicrocycle: false,
      partitionLastSeen: { Lower: { sessionId: 'A0', date: tenDaysAgo } },
      returnFromBreakCountdown: {},
      createdAt: tenDaysAgo, completedAt: null,
    };
    const r = resolveLoadingModeForSession({ session, queue, today });
    expect(r.loadingMode).toBe('MINI_DELOAD');
    expect(r.shouldActivateReturnFromBreak).toBe(true);
    expect(r.newReturnFromBreakCountdown).toBe(2);
  });
});

describe('generateSessionSkeleton — full pipeline integration', () => {
  const today = new Date('2026-04-19T12:00:00Z');
  const profile: ClientTrainingProfile = {
    clientId: 't', gender: 'female', age: 30, weight: 65, height: 165, bmi: 23.9,
    experienceLevel: 'intermediate', trainingDays: 4, primaryGoal: 'glute_focus',
    metabolicConditions: [], injuries: [], allergies: [],
    sleepHoursAvg: 7, stressLevel: 3, jobPhysicality: 'sedentary',
    cycleTrackingEnabled: false, recoveryMultiplier: 1.0, strengthTier: 'competent',
  };

  const exercises: Exercise[] = [
    {
      id: 100, name: 'Hip Thrust', nameSr: 'Hip Thrust', isSystemExercise: true,
      createdByTrainerId: null, movementPattern: 'hip_dominant', primaryMuscle: 'glutes',
      secondaryMuscles: ['hamstrings'], tensionProfile: 'mid_range', cnsLoad: 3,
      fatigueIndex: 3, equipment: ['barbell'], difficulty: 'intermediate',
      requiresStabilization: false, contraindications: [], gentleOn: [],
      weightIncrement: 5, isBilateral: true, videoUrl: null, instructions: '',
      isGluteBuilder: true, isCompound: true, isFinisherEligible: false,
    },
    {
      id: 101, name: 'Goblet Squat', nameSr: 'Goblet Squat', isSystemExercise: true,
      createdByTrainerId: null, movementPattern: 'knee_dominant', primaryMuscle: 'quads',
      secondaryMuscles: [], tensionProfile: 'mid_range', cnsLoad: 3, fatigueIndex: 3,
      equipment: ['dumbbell'], difficulty: 'intermediate', requiresStabilization: false,
      contraindications: [], gentleOn: [], weightIncrement: 2.5, isBilateral: true,
      videoUrl: null, instructions: '', isGluteBuilder: false, isCompound: true, isFinisherEligible: false,
    },
    {
      id: 102, name: 'DB Curl', nameSr: 'DB Curl', isSystemExercise: true,
      createdByTrainerId: null, movementPattern: 'isolation_biceps', primaryMuscle: 'biceps',
      secondaryMuscles: [], tensionProfile: 'mid_range', cnsLoad: 1, fatigueIndex: 1,
      equipment: ['dumbbell'], difficulty: 'beginner_safe', requiresStabilization: false,
      contraindications: [], gentleOn: [], weightIncrement: 1, isBilateral: false,
      videoUrl: null, instructions: '', isGluteBuilder: false, isCompound: false, isFinisherEligible: true,
    },
  ];

  const session: QueuedSession = {
    sessionId: 'A1', label: 'Lower', dayType: 'Lower', partition: 'Lower',
    status: 'next', scheduledDate: today, completedAt: null, actualWorkoutSessionId: null,
  };

  const queue: MesocycleQueue = {
    clientId: 't', mesocycleIndex: 1, templateId: 't', sessions: [session],
    sessionPointer: 0, currentMicrocycleIndex: 0, swapUsedThisMicrocycle: false,
    partitionLastSeen: {}, returnFromBreakCountdown: {},
    createdAt: today, completedAt: null,
  };

  it('puni pipeline: GLUTE_FOCUS overlay → glute prvi → svi slotovi imaju chosen exercise', () => {
    const result = generateSessionSkeleton({
      templateSkeleton: baseSkeleton,
      session,
      queue,
      profile,
      exerciseLibrary: exercises,
      today,
      goalOverlay: 'GLUTE_FOCUS',
    });

    const lowerDay = result.skeleton.days[0];
    // GLUTE_FOCUS pomera glute na slot 1
    expect(lowerDay.exerciseSlots[0].muscleGroup).toBe('glutes');
    // Hip thrust (id 100, isGluteBuilder=true) je odabran
    expect(lowerDay.exerciseSlots[0].chosenExerciseId).toBe(100);
    // Sets izracunati (recovery 1.0 → ~4 sets)
    expect(lowerDay.exerciseSlots[0].finalSets).toBeGreaterThan(0);
    // Loading mode PROGRESS (prva sesija)
    expect(result.loadingMode).toBe('PROGRESS');
    // Bez failures
    expect(result.substitutionFailures).toEqual([]);
  });

  it('signalizira substitution failure ako pool ne pokrije slot', () => {
    const incompleteLibrary = [exercises[0]];  // samo glute, nema quad ili biceps
    const result = generateSessionSkeleton({
      templateSkeleton: baseSkeleton,
      session,
      queue,
      profile,
      exerciseLibrary: incompleteLibrary,
      today,
    });
    expect(result.substitutionFailures.length).toBeGreaterThan(0);
  });
});
