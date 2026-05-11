import { describe, it, expect } from 'vitest';
import {
  applySmartCut,
  isSmartCutBlocked,
  decideSmartCutAction,
  NEAT_DAILY_GATE,
  FAT_GRAM_FLOOR_PER_KG,
} from './smartCut';

describe('applySmartCut — pocetnici.md §3.8', () => {
  const baseInput = {
    macros: { proteinG: 130, carbsG: 230, fatG: 60 },
    totalCalories: 2000,
    weightKg: 65,
  };

  it('Step 0 — maintenance baseline, ne menja makroe', () => {
    const r = applySmartCut({ ...baseInput, step: 0 });
    expect(r.totalCalories).toBe(2000);
    expect(r.macros).toEqual(baseInput.macros);
    expect(r.appliedStep).toBe(0);
  });

  it('Step 1 — smanji masti, ali fat floor (39g za 65kg) štiti', () => {
    const r = applySmartCut({ ...baseInput, step: 1 });
    // 60g - 22.2g = 37.8g, ali floor = 65*0.6 = 39g → fat clamped na 39g
    expect(r.macros.fatG).toBe(65 * FAT_GRAM_FLOOR_PER_KG);
    expect(r.macros.carbsG).toBe(230);
    expect(r.macros.proteinG).toBe(130);
    // Reduction = 60-39 = 21g × 9 = 189 kcal → 2000-189 = 1811
    expect(r.totalCalories).toBe(1811);
  });

  it('Step 1 — bez floor blokade, full -200 kcal iz masti', () => {
    // Visok fat unos da floor ne aktivira clamp
    const highFat = { ...baseInput, macros: { proteinG: 130, carbsG: 230, fatG: 80 } };
    const r = applySmartCut({ ...highFat, step: 1 });
    // 80 - 22.22 = 57.78g (iznad 39g floor-a)
    expect(r.macros.fatG).toBeCloseTo(80 - 200 / 9, 1);
    expect(r.totalCalories).toBe(1800);
  });

  it('Step 2 — kumulativno fats + off-window carbs', () => {
    const r = applySmartCut({ ...baseInput, step: 2 });
    // Step 1: fat floor → 21g out (189 kcal)
    // Step 2: carbs 230 → 180 (50g out, 200 kcal)
    expect(r.macros.fatG).toBe(39);
    expect(r.macros.carbsG).toBe(180);
    expect(r.totalCalories).toBe(1611);
  });

  it('Step 3 — peri-workout carbs (POSLEDNJA LINIJA), kumulativno do ~-30%', () => {
    const r = applySmartCut({ ...baseInput, step: 3 });
    // Step 1: 189 kcal, Step 2: 200 kcal, Step 3: 200 kcal = ~589 kcal
    expect(r.totalCalories).toBe(1411);
    expect(r.macros.carbsG).toBe(130);
    expect(r.notes.some(n => n.includes('POSLEDNJA LINIJA'))).toBe(true);
  });
});

describe('isSmartCutBlocked — NEAT 10k gate', () => {
  it('NEAT < 10,000 koraka → BLOCKED', () => {
    expect(isSmartCutBlocked(7500)).toBe(true);
    expect(isSmartCutBlocked(9999)).toBe(true);
  });

  it('NEAT >= 10,000 koraka → ne-blokiran', () => {
    expect(isSmartCutBlocked(NEAT_DAILY_GATE)).toBe(false);
    expect(isSmartCutBlocked(12000)).toBe(false);
  });
});

describe('decideSmartCutAction — pocetnici.md §3.9 logical diagram', () => {
  it('NEAT < 10k → BLOCKED (uvek pre svega)', () => {
    const r = decideSmartCutAction({
      weightChangePctLast7Days: 1.0,
      strengthTrend: 'stable',
      currentStep: 0,
      neatDailyAvg: 5000,
    });
    expect(r.action).toBe('blocked');
  });

  it('Vaga PADA & snaga PADA → Emergency Refeed', () => {
    const r = decideSmartCutAction({
      weightChangePctLast7Days: -0.5,
      strengthTrend: 'falling',
      currentStep: 1,
      neatDailyAvg: 11000,
    });
    expect(r.action).toBe('emergency_refeed');
  });

  it('Vaga PADA & snaga RASTE → MAINTAIN (idealno)', () => {
    const r = decideSmartCutAction({
      weightChangePctLast7Days: -0.3,
      strengthTrend: 'rising',
      currentStep: 1,
      neatDailyAvg: 11000,
    });
    expect(r.action).toBe('maintain');
  });

  it('Vaga STOJI & snaga RASTE → MAINTAIN (rekompozicija radi)', () => {
    const r = decideSmartCutAction({
      weightChangePctLast7Days: 0.1,
      strengthTrend: 'rising',
      currentStep: 1,
      neatDailyAvg: 11000,
    });
    expect(r.action).toBe('maintain');
  });

  it('Vaga RASTE >0.5% & snaga STOJI → ADVANCE step', () => {
    const r = decideSmartCutAction({
      weightChangePctLast7Days: 0.7,
      strengthTrend: 'stable',
      currentStep: 0,
      neatDailyAvg: 11000,
    });
    expect(r.action).toBe('advance');
    if (r.action === 'advance') {
      expect(r.nextStep).toBe(1);
    }
  });

  it('Već na Step 3 + stagnira → MAINTAIN sa preporukom Diet Break', () => {
    const r = decideSmartCutAction({
      weightChangePctLast7Days: 0.7,
      strengthTrend: 'stable',
      currentStep: 3,
      neatDailyAvg: 11000,
    });
    expect(r.action).toBe('maintain');
    expect(r.reason).toContain('Diet Break');
  });
});
