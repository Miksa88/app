import { describe, it, expect } from 'vitest';
import { pickExerciseForSlot } from './exerciseSubstitution';
import type {
  Exercise,
  ExerciseSlot,
  ClientTrainingProfile,
  MovementPattern,
  MuscleGroup,
} from '@/types/training';

function makeExercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: 1,
    name: 'Test',
    nameSr: 'Test',
    isSystemExercise: true,
    createdByTrainerId: null,
    movementPattern: 'hip_dominant',
    primaryMuscle: 'glutes',
    secondaryMuscles: [],
    tensionProfile: 'mid_range',
    cnsLoad: 3,
    fatigueIndex: 3,
    equipment: ['barbell'],
    difficulty: 'intermediate',
    requiresStabilization: false,
    contraindications: [],
    gentleOn: [],
    weightIncrement: 2.5,
    isBilateral: true,
    videoUrl: null,
    instructions: '',
    isGluteBuilder: false,
    isCompound: true,
    isFinisherEligible: false,
    ...overrides,
  };
}

function makeSlot(
  movement: MovementPattern,
  muscle: MuscleGroup,
  priority: ExerciseSlot['priority'] = 'primary',
): ExerciseSlot {
  return {
    slotIndex: 1,
    movementPattern: movement,
    muscleGroup: muscle,
    setsRange: [3, 5],
    repRange: [8, 12],
    priority,
  };
}

const baseProfile: ClientTrainingProfile = {
  clientId: 't',
  gender: 'female',
  age: 30,
  weight: 65,
  height: 165,
  bmi: 23.9,
  experienceLevel: 'intermediate',
  trainingDays: 4,
  primaryGoal: 'glute_focus',
  metabolicConditions: [],
  injuries: [],
  allergies: [],
  sleepHoursAvg: 7,
  stressLevel: 3,
  jobPhysicality: 'sedentary',
  cycleTrackingEnabled: false,
  recoveryMultiplier: 1.0,
  strengthTier: 'competent',
};

describe('pickExerciseForSlot — strict match', () => {
  it('izabere vezbu koja matchuje pattern + muscle group', () => {
    const pool = [
      makeExercise({ id: 1, movementPattern: 'hip_dominant', primaryMuscle: 'glutes' }),
      makeExercise({ id: 2, movementPattern: 'knee_dominant', primaryMuscle: 'quads' }),
    ];
    const result = pickExerciseForSlot({
      pool,
      slot: makeSlot('hip_dominant', 'glutes'),
      profile: baseProfile,
    });
    expect(result.chosen?.id).toBe(1);
    expect(result.fallbackApplied).toBe('none');
  });

  it('iskljuci kontraindikovane vezbe', () => {
    const pool = [
      makeExercise({ id: 1, contraindications: ['lower_back'] }),
      makeExercise({ id: 2, contraindications: [] }),
    ];
    const result = pickExerciseForSlot({
      pool,
      slot: makeSlot('hip_dominant', 'glutes'),
      profile: { ...baseProfile, injuries: ['lower_back'] },
    });
    expect(result.chosen?.id).toBe(2);
  });

  it('beginner ne sme advanced exercises', () => {
    const pool = [
      makeExercise({ id: 1, difficulty: 'advanced' }),
      makeExercise({ id: 2, difficulty: 'beginner_safe' }),
    ];
    const result = pickExerciseForSlot({
      pool,
      slot: makeSlot('hip_dominant', 'glutes'),
      profile: { ...baseProfile, experienceLevel: 'beginner' },
    });
    expect(result.chosen?.id).toBe(2);
  });

  it('GLUTE_FOCUS overlay + primary slot mora biti glute builder', () => {
    const pool = [
      makeExercise({ id: 1, isGluteBuilder: false }),
      makeExercise({ id: 2, isGluteBuilder: true }),
    ];
    const result = pickExerciseForSlot({
      pool,
      slot: makeSlot('hip_dominant', 'glutes', 'primary'),
      profile: baseProfile,
      goalOverlay: 'GLUTE_FOCUS',
    });
    expect(result.chosen?.id).toBe(2);
  });
});

describe('pickExerciseForSlot — scoring', () => {
  it('preferira "stretch" tension profile za hipertrofiju', () => {
    const pool = [
      makeExercise({ id: 1, tensionProfile: 'shortened' }),
      makeExercise({ id: 2, tensionProfile: 'stretch' }),
      makeExercise({ id: 3, tensionProfile: 'mid_range' }),
    ];
    const result = pickExerciseForSlot({
      pool,
      slot: makeSlot('hip_dominant', 'glutes'),
      profile: baseProfile,
    });
    expect(result.chosen?.id).toBe(2);
  });

  it('niski recovery → preferira nizak CNS load', () => {
    const pool = [
      makeExercise({ id: 1, cnsLoad: 5, tensionProfile: 'mid_range' }),
      makeExercise({ id: 2, cnsLoad: 1, tensionProfile: 'mid_range' }),
    ];
    const result = pickExerciseForSlot({
      pool,
      slot: makeSlot('hip_dominant', 'glutes'),
      profile: { ...baseProfile, recoveryMultiplier: 0.75 },
    });
    expect(result.chosen?.id).toBe(2);
  });

  it('variety — kad su tension profili izjednaceni, recently used je demote-ovan', () => {
    const pool = [
      makeExercise({ id: 1, tensionProfile: 'mid_range', cnsLoad: 3 }),
      makeExercise({ id: 2, tensionProfile: 'mid_range', cnsLoad: 3 }),
    ];
    // Bez recently used: tie → prvi (id 1) ostaje. Sa recently=[1]: id 1 dobija
    // -1 score → id 2 pobedjuje.
    const result = pickExerciseForSlot({
      pool,
      slot: makeSlot('hip_dominant', 'glutes'),
      profile: baseProfile,
      recentlyUsedExerciseIds: [1],
    });
    expect(result.chosen?.id).toBe(2);
  });
});

describe('pickExerciseForSlot — fallback strategija', () => {
  it('fallback 1: ublazi muscleGroup match (samo movementPattern)', () => {
    // Pool ima vezbu sa pattern matchem ali pogresan muscle group
    const pool = [
      makeExercise({
        id: 1,
        movementPattern: 'hip_dominant',
        primaryMuscle: 'hamstrings',  // ne `glutes`
        difficulty: 'beginner_safe',
      }),
    ];
    const result = pickExerciseForSlot({
      pool,
      slot: makeSlot('hip_dominant', 'glutes'),
      profile: { ...baseProfile, experienceLevel: 'beginner' },
    });
    expect(result.chosen?.id).toBe(1);
    expect(result.fallbackApplied).toBe('movement_pattern_only');
    expect(result.note).toBeDefined();
  });

  it('fallback 2: gentle_on match za povredu', () => {
    const pool = [
      // Pattern mismatch ali gentle za korisnicku povredu
      makeExercise({
        id: 1,
        movementPattern: 'hip_dominant',
        primaryMuscle: 'glutes',
        gentleOn: ['lower_back'],
        contraindications: ['lower_back'],  // STRICT i LOOSE matcher iskljucuju
      }),
    ];
    const result = pickExerciseForSlot({
      pool,
      slot: makeSlot('hip_dominant', 'glutes'),
      profile: { ...baseProfile, injuries: ['lower_back'] },
    });
    // STRICT/LOOSE iskljucuju zbog contraindications. Gentle fallback ne bi
    // trebalo da iskljucuje (tu je svrha — pokusati i pored povrede). Trenutna
    // implementacija filtrira samo po movementPattern + gentleOn.
    expect(result.chosen?.id).toBe(1);
    expect(result.fallbackApplied).toBe('gentle_on_match');
  });

  it('vraca null ako pool je prazan posle svih fallback-a', () => {
    const result = pickExerciseForSlot({
      pool: [],
      slot: makeSlot('hip_dominant', 'glutes'),
      profile: baseProfile,
    });
    expect(result.chosen).toBeNull();
    expect(result.fallbackApplied).toBe('none');
  });
});
