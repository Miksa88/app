import { describe, it, expect } from 'vitest';
import {
  calcRecoveryMultiplier,
  mapMultiplierToZone,
  type RecoveryInputs,
} from './recoveryCalibration';

const baseline: RecoveryInputs = {
  sleepHoursAvg: 7,
  stressLevel: 3,
  age: 30,
  metabolicConditions: [],
};

describe('calcRecoveryMultiplier', () => {
  it('zdrava klijentkinja, 7h san, stres 3, mlada → blizu 1.0', () => {
    const result = calcRecoveryMultiplier(baseline);
    // 1.0 + 0.02 (sleep) + 0 (stress) = 1.02
    expect(result).toBeCloseTo(1.02, 2);
  });

  it('odlican san (8h+) i nizak stres (1) → bonus', () => {
    const result = calcRecoveryMultiplier({
      ...baseline,
      sleepHoursAvg: 8.5,
      stressLevel: 1,
    });
    // 1.0 + 0.05 + 0.05 = 1.10
    expect(result).toBeCloseTo(1.10, 2);
  });

  it('los san (<5h) → ozbiljan penalty', () => {
    const result = calcRecoveryMultiplier({
      ...baseline,
      sleepHoursAvg: 4.5,
    });
    // 1.0 - 0.20 + 0 = 0.80
    expect(result).toBeCloseTo(0.80, 2);
  });

  it('hashimoto + IR + stresa 4 → ide ka MEV zoni', () => {
    const result = calcRecoveryMultiplier({
      ...baseline,
      stressLevel: 4,
      metabolicConditions: ['hashimoto', 'insulin_resistance'],
    });
    // 1.0 + 0.02 (sleep 7) - 0.10 (stress 4) - 0.10 (hashimoto) - 0.05 (IR) = 0.77
    expect(result).toBeCloseTo(0.77, 2);
  });

  it('clamp na 0.7 — najgori scenario nikad ispod floor-a', () => {
    const result = calcRecoveryMultiplier({
      sleepHoursAvg: 3,
      stressLevel: 5,
      age: 60,
      metabolicConditions: ['hashimoto', 'insulin_resistance', 'pcos', 'hypertension'],
    });
    // 1.0 - 0.20 - 0.15 - 0.10 - 0.05 - 0.05 - 0.03 - 0.05 - 0.05 = 0.32 → clamp na 0.7
    expect(result).toBe(0.7);
  });

  it('clamp na 1.1 — najbolji scenario nikad iznad ceil-a', () => {
    const result = calcRecoveryMultiplier({
      sleepHoursAvg: 9,
      stressLevel: 1,
      age: 25,
      metabolicConditions: [],
    });
    // 1.0 + 0.05 + 0.05 = 1.10 → tacno na ceil
    expect(result).toBe(1.10);
  });

  it('godine — 45+ uzme -0.05, 55+ jos -0.05 (kumulativno)', () => {
    const at44 = calcRecoveryMultiplier({ ...baseline, age: 44 });
    const at45 = calcRecoveryMultiplier({ ...baseline, age: 45 });
    const at55 = calcRecoveryMultiplier({ ...baseline, age: 55 });

    expect(at44 - at45).toBeCloseTo(0.05, 2);
    expect(at45 - at55).toBeCloseTo(0.05, 2);
  });

  it('idempotentno — pozivanje 5x sa istim ulazom = isti rezultat', () => {
    const results = Array.from({ length: 5 }, () => calcRecoveryMultiplier(baseline));
    const unique = new Set(results);
    expect(unique.size).toBe(1);
  });

  // ==========================================================================
  // IT-16: illness penalty (spec 01 §4.8)
  // ==========================================================================

  it('illness penalty — normalan san/stres + illness oduzima 0.15 od baseline-a', () => {
    // baseline (sleep 7, stress 3) = 1.02; sa illness (-0.15) = 0.87
    const result = calcRecoveryMultiplier({
      ...baseline,
      illnessPenalty: -0.15,
    });
    expect(result).toBeCloseTo(0.87, 2);
  });

  it('illness penalty — odlican san + nizak stres + illness — spec §4.8 primer 1.07 - 0.15 = 0.92', () => {
    // 1.0 + 0.05 (sleep>=8) + 0.02 (stress=2) = 1.07; sa illness = 0.92
    const result = calcRecoveryMultiplier({
      ...baseline,
      sleepHoursAvg: 8,
      stressLevel: 2,
      illnessPenalty: -0.15,
    });
    expect(result).toBeCloseTo(0.92, 2);
  });

  it('illness penalty + los san — clamp na 0.7 (ne ide ispod floor-a)', () => {
    // 1.0 - 0.20 (sleep 4.5) + 0 (stress 3) - 0.15 (illness) = 0.65 → clamp 0.7
    const result = calcRecoveryMultiplier({
      ...baseline,
      sleepHoursAvg: 4.5,
      illnessPenalty: -0.15,
    });
    expect(result).toBe(0.7);
  });

  it('illness penalty = 0 (default/no pause) — backward compat sa postojecim case-ovima', () => {
    // Eksplicitni 0 mora dati isti rezultat kao omitted param
    const withZero = calcRecoveryMultiplier({ ...baseline, illnessPenalty: 0 });
    const withoutParam = calcRecoveryMultiplier(baseline);
    expect(withZero).toBe(withoutParam);
  });
});

describe('mapMultiplierToZone', () => {
  it('mapira granice ispravno', () => {
    expect(mapMultiplierToZone(0.70)).toBe('MEV');
    expect(mapMultiplierToZone(0.80)).toBe('MEV');
    expect(mapMultiplierToZone(0.81)).toBe('MEV_MAV');
    expect(mapMultiplierToZone(0.95)).toBe('MEV_MAV');
    expect(mapMultiplierToZone(0.96)).toBe('MAV');
    expect(mapMultiplierToZone(1.05)).toBe('MAV');
    expect(mapMultiplierToZone(1.06)).toBe('MAV_MRV');
    expect(mapMultiplierToZone(1.10)).toBe('MAV_MRV');
  });
});
