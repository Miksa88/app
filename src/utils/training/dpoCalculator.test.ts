import { describe, it, expect } from 'vitest';
import {
  calcNextWeight,
  type ExerciseHistorySample,
  type ExerciseMeta,
  type ClientProfileSnapshot,
} from './dpoCalculator';

const compoundBilateralSquat: ExerciseMeta = {
  id: 'squat',
  weight_increment: 2.5,
  is_bilateral: true,
  is_compound: true,
};

const beginnerProfile: ClientProfileSnapshot = {
  currentWeightKg: 60,
  experienceLevel: 'beginner',
};

function sample(
  weight_kg: number,
  reps: number,
  completed_at: string,
  set_number = 1,
): ExerciseHistorySample {
  return { weight_kg, reps, set_number, rir: null, completed_at };
}

describe('calcNextWeight — DPO (Loading Sloj 4)', () => {
  it('first time compound bilateral beginner → bodyweight × 0.5 rounded to increment', () => {
    const result = calcNextWeight(
      [],
      compoundBilateralSquat,
      'PROGRESS',
      beginnerProfile,
      false,
      8,
      2,
    );
    expect(result.targetWeight).toBe(30); // 60 × 0.5 = 30
    expect(result.reason).toBe('first_time');
    expect(result.targetReps).toBe(8);
    expect(result.targetRIR).toBe(2);
  });

  it('hit top reps → +weight_increment', () => {
    const history = [
      sample(50, 8, '2026-04-20T10:00:00Z', 1),
      sample(50, 8, '2026-04-20T10:05:00Z', 2),
      sample(50, 8, '2026-04-20T10:10:00Z', 3),
    ];
    const result = calcNextWeight(
      history,
      compoundBilateralSquat,
      'PROGRESS',
      beginnerProfile,
      false,
      8,
      2,
    );
    expect(result.targetWeight).toBe(52.5);
    expect(result.reason).toBe('hit_top');
  });

  it('missed top reps → ostaje isto', () => {
    const history = [
      sample(50, 6, '2026-04-20T10:00:00Z', 1),
      sample(50, 6, '2026-04-20T10:05:00Z', 2),
      sample(50, 6, '2026-04-20T10:10:00Z', 3),
    ];
    const result = calcNextWeight(
      history,
      compoundBilateralSquat,
      'PROGRESS',
      beginnerProfile,
      false,
      8,
      2,
    );
    expect(result.targetWeight).toBe(50);
    expect(result.reason).toBe('missed_top');
  });

  it('RFB + MINI_DELOAD → last weight × 0.80', () => {
    const history = [sample(50, 8, '2026-04-20T10:00:00Z')];
    const result = calcNextWeight(
      history,
      compoundBilateralSquat,
      'MINI_DELOAD',
      beginnerProfile,
      true,
      8,
      2,
    );
    expect(result.targetWeight).toBe(40); // 50 × 0.80 = 40
    expect(result.reason).toBe('rfb_deload');
  });

  it('MAINTAIN → ostaje isto bez obzira na top reps', () => {
    const history = [sample(50, 8, '2026-04-20T10:00:00Z')];
    const result = calcNextWeight(
      history,
      compoundBilateralSquat,
      'MAINTAIN',
      beginnerProfile,
      false,
      8,
      2,
    );
    expect(result.targetWeight).toBe(50);
    expect(result.reason).toBe('maintain');
  });
});
