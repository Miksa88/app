import { describe, it, expect } from 'vitest';
import { calcMacroSplit, macroTotalCalories } from './macroSplit';

describe('calcMacroSplit — Sekcija 4 spec-a 02', () => {
  it('70kg / 1853 kcal (fat_loss target) — primer iz Sekcije 4.4', () => {
    const m = calcMacroSplit({ weightKg: 70, totalCalories: 1853 });
    // Protein: 70 × 2.0 = 140g = 560 kcal
    // Fat: max(70×0.9=63, 1853×0.25/9=51) = 63g = 567 kcal
    // Carbs: (1853 - 560 - 567) / 4 = 726/4 = 181g
    expect(m.proteinG).toBe(140);
    expect(m.fatG).toBe(63);
    expect(m.carbsG).toBe(182);  // round od 181.5 → 182
    expect(m.fiberMinG).toBe(25);
  });

  it('70kg / 2490 kcal (glute_focus +7.5%)', () => {
    const m = calcMacroSplit({ weightKg: 70, totalCalories: 2490 });
    expect(m.proteinG).toBe(140);
    expect(m.fatG).toBe(69);    // round od 2490*0.25/9 = 69.16
    // Carbs: (2490 - 560 - 621) / 4 = 1309/4 = 327
    expect(m.carbsG).toBe(327);
  });

  it('60kg / niski cilj 1500 — fat min od bodyweight nadvladava 25% carb-cap', () => {
    const m = calcMacroSplit({ weightKg: 60, totalCalories: 1500 });
    // Fat: max(60*0.9=54, 1500*0.25/9=41.67) = 54g (bodyweight win)
    // Protein: 60*2 = 120g = 480 kcal
    // Fat: 54g = 486 kcal
    // Carbs: (1500 - 480 - 486)/4 = 534/4 = 134
    expect(m.fatG).toBe(54);
    expect(m.proteinG).toBe(120);
    expect(m.carbsG).toBe(134);
  });

  it('jako visok cilj — 25% kcal cap nadvladava bodyweight floor za masti', () => {
    const m = calcMacroSplit({ weightKg: 60, totalCalories: 3000 });
    // Fat: max(60*0.9=54, 3000*0.25/9=83.33) = 83g (kcal cap win)
    expect(m.fatG).toBe(83);
  });

  it('idempotentno — 3× isti ulaz daje isti rezultat', () => {
    const r1 = calcMacroSplit({ weightKg: 65, totalCalories: 1900 });
    const r2 = calcMacroSplit({ weightKg: 65, totalCalories: 1900 });
    const r3 = calcMacroSplit({ weightKg: 65, totalCalories: 1900 });
    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);
  });

  it('macroTotalCalories — sumira u priblizno totalCalories (rounding tolerance)', () => {
    const m = calcMacroSplit({ weightKg: 70, totalCalories: 1853 });
    const recomputed = macroTotalCalories(m);
    // Tolerancija ±5 kcal zbog round-anja u 3 polja
    expect(Math.abs(recomputed - 1853)).toBeLessThanOrEqual(5);
  });

  it('carbs nikad nisu negativni — protect floor 0', () => {
    // Apsurdno mali totalCalories — protein+fat sami premasuju sve
    const m = calcMacroSplit({ weightKg: 70, totalCalories: 1000 });
    expect(m.carbsG).toBeGreaterThanOrEqual(0);
  });
});
