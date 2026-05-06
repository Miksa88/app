import { describe, it, expect } from 'vitest';
import {
  recalcCalorieTarget,
  resolveTargetMode,
  CALORIE_FLOOR,
  LUTEAL_CARB_BONUS_KCAL,
} from './calorieTarget';

describe('recalcCalorieTarget — base modes', () => {
  it('deficit = TDEE × 0.80', () => {
    expect(recalcCalorieTarget({ tdee: 2000, targetMode: 'deficit' })).toBe(1600);
  });

  it('recomposition = TDEE × 0.90', () => {
    expect(recalcCalorieTarget({ tdee: 2000, targetMode: 'recomposition' })).toBe(1800);
  });

  it('lean_bulk = TDEE × 1.075', () => {
    expect(recalcCalorieTarget({ tdee: 2000, targetMode: 'lean_bulk' })).toBe(2150);
  });

  it('maintenance = TDEE', () => {
    expect(recalcCalorieTarget({ tdee: 2000, targetMode: 'maintenance' })).toBe(2000);
  });
});

describe('recalcCalorieTarget — floor 1400 kcal', () => {
  it('niska TDEE u deficit-u udari floor', () => {
    // 1500 × 0.80 = 1200, ali floor je 1400
    const result = recalcCalorieTarget({ tdee: 1500, targetMode: 'deficit' });
    expect(result).toBe(CALORIE_FLOOR);
  });

  it('floor se postuje cak i sa svim sync overrides', () => {
    const result = recalcCalorieTarget({
      tdee: 1300,
      targetMode: 'deficit',
      isInIllnessPause: true,        // tdee × 0.95 = 1235
      cyclePhase: 'luteal',           // +150 = 1385
    });
    expect(result).toBe(CALORIE_FLOOR);  // 1385 < 1400 → floor
  });
});

describe('recalcCalorieTarget — sync rule overrides', () => {
  const baseDeficit = { tdee: 2000, targetMode: 'deficit' as const };

  it('Rule 1 Luteal — dodaje +150 kcal NA VRH baseline-a', () => {
    const result = recalcCalorieTarget({ ...baseDeficit, cyclePhase: 'luteal' });
    expect(result).toBe(1600 + LUTEAL_CARB_BONUS_KCAL);
  });

  it('Rule 2 Fatigue sync — deficit pada na maintenance', () => {
    const result = recalcCalorieTarget({ ...baseDeficit, fatigueSyncActive: true });
    expect(result).toBe(2000);     // maintenance umesto 1600
  });

  it('Rule 3 Deload sync — deficit pada na maintenance', () => {
    const result = recalcCalorieTarget({ ...baseDeficit, isInDeload: true });
    expect(result).toBe(2000);
  });

  it('Rule 3 Deload sync — recomposition takodje pada na maintenance', () => {
    const result = recalcCalorieTarget({ tdee: 2000, targetMode: 'recomposition', isInDeload: true });
    expect(result).toBe(2000);
  });

  it('Rule 3 Deload sync — lean_bulk OSTAJE (ne menja se u deload-u)', () => {
    const result = recalcCalorieTarget({ tdee: 2000, targetMode: 'lean_bulk', isInDeload: true });
    expect(result).toBe(2150);     // i dalje +7.5%
  });

  it('Rule 4 Return from Break — deficit ide na 0.92', () => {
    const result = recalcCalorieTarget({ ...baseDeficit, isInReturnFromBreak: true });
    expect(result).toBe(Math.round(2000 * 0.92));
  });

  it('Rule 7 Illness — deficit pada na -5% (ne -20%)', () => {
    const result = recalcCalorieTarget({ ...baseDeficit, isInIllnessPause: true });
    expect(result).toBe(Math.round(2000 * 0.95));
  });
});

describe('recalcCalorieTarget — kombinacije sync rules', () => {
  it('Luteal + Deload — luteal bonus se dodaje NA VRH deload-baseline-a', () => {
    const result = recalcCalorieTarget({
      tdee: 2000,
      targetMode: 'deficit',
      isInDeload: true,
      cyclePhase: 'luteal',
    });
    // Deload: 2000 (maintenance), pa +150 luteal = 2150
    expect(result).toBe(2150);
  });

  it('Illness + Luteal — illness 0.95 baseline + luteal +150', () => {
    const result = recalcCalorieTarget({
      tdee: 2000,
      targetMode: 'deficit',
      isInIllnessPause: true,
      cyclePhase: 'luteal',
    });
    // Illness: 1900, +150 luteal = 2050
    expect(result).toBe(2050);
  });
});

describe('recalcCalorieTarget — IDEMPOTENT (KRITIČNO za Sync Engine)', () => {
  it('5x poziv sa istim ulazom = identičan rezultat', () => {
    const inputs = {
      tdee: 2000,
      targetMode: 'deficit' as const,
      isInDeload: true,
      cyclePhase: 'luteal' as const,
      isInReturnFromBreak: false,
    };
    const results = Array.from({ length: 5 }, () => recalcCalorieTarget(inputs));
    expect(new Set(results).size).toBe(1);
  });

  it('NIKAD ne akumulira luteal bonus kroz vise poziva', () => {
    // Klasican akumulator-bug: ako bi += 150 koristili, drugi poziv bi dao 1750
    const inputs = { tdee: 2000, targetMode: 'deficit' as const, cyclePhase: 'luteal' as const };
    const r1 = recalcCalorieTarget(inputs);
    const r2 = recalcCalorieTarget(inputs);
    const r3 = recalcCalorieTarget(inputs);
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
    expect(r1).toBe(1750);   // 1600 + 150, ne 1900 ili 2050
  });
});

describe('resolveTargetMode', () => {
  it('mapira primaryGoal u targetMode', () => {
    expect(resolveTargetMode('fat_loss')).toBe('deficit');
    expect(resolveTargetMode('tone')).toBe('recomposition');
    expect(resolveTargetMode('glute_focus')).toBe('lean_bulk');
  });
});
