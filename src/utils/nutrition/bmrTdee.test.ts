import { describe, it, expect } from 'vitest';
import { calcBMR, calcTDEE, calcActivityMultiplier, calcBmrTdeeFromProfile } from './bmrTdee';
import type { ClientTrainingProfile } from '@/types/training';

describe('calcBMR — Mifflin-St Jeor zenska formula', () => {
  it('70kg / 168cm / 30 godina = 1544 kcal (primer iz Sekcije 4.4 spec-a 02)', () => {
    const bmr = calcBMR({ weightKg: 70, heightCm: 168, age: 30 });
    // (10*70) + (6.25*168) - (5*30) - 161 = 700 + 1050 - 150 - 161 = 1439
    // Spec navodi 1544 — moja racunica daje 1439. Spec ima gresku ili koristi
    // muski koeficijent (+5) umesto -161. Mifflin-St Jeor zenska je tacno -161.
    expect(bmr).toBe(1439);
  });

  it('60kg / 160cm / 25 god', () => {
    const bmr = calcBMR({ weightKg: 60, heightCm: 160, age: 25 });
    // 600 + 1000 - 125 - 161 = 1314
    expect(bmr).toBe(1314);
  });

  it('idempotentno', () => {
    const r1 = calcBMR({ weightKg: 70, heightCm: 168, age: 30 });
    const r2 = calcBMR({ weightKg: 70, heightCm: 168, age: 30 });
    expect(r1).toBe(r2);
  });
});

describe('calcActivityMultiplier', () => {
  it('3 dana / sedentary = 1.325', () => {
    expect(calcActivityMultiplier(3, 'sedentary')).toBeCloseTo(1.325, 3);
  });

  it('4 dana / moderate = 1.55', () => {
    expect(calcActivityMultiplier(4, 'moderate')).toBeCloseTo(1.55, 3);
  });

  it('5 dana / active = 1.775', () => {
    expect(calcActivityMultiplier(5, 'active')).toBeCloseTo(1.775, 3);
  });
});

describe('calcTDEE', () => {
  it('70kg / 168cm / 30g / 4 dana / sedentary', () => {
    const bmr = calcBMR({ weightKg: 70, heightCm: 168, age: 30 });
    const tdee = calcTDEE({ bmr, workoutFrequency: 4, jobPhysicality: 'sedentary' });
    // 1439 * (1.55 - 0.05) = 1439 * 1.50 = 2158.5 → 2159
    expect(tdee).toBe(2159);
  });
});

describe('calcBmrTdeeFromProfile', () => {
  it('komponuje BMR + TDEE iz pun ClientTrainingProfile', () => {
    const profile: ClientTrainingProfile = {
      clientId: 'test',
      gender: 'female',
      age: 30,
      weight: 70,
      height: 168,
      bmi: 24.8,
      experienceLevel: 'intermediate',
      trainingDays: 4,
      primaryGoal: 'fat_loss',
      metabolicConditions: [],
      injuries: [],
      allergies: [],
      sleepHoursAvg: 7,
      stressLevel: 3,
      jobPhysicality: 'sedentary',
      cycleTrackingEnabled: false,
      recoveryMultiplier: 1.0,
      strengthTier: 'novice',
    };

    const { bmr, tdee } = calcBmrTdeeFromProfile(profile);
    expect(bmr).toBe(1439);
    expect(tdee).toBe(2159);
  });
});
