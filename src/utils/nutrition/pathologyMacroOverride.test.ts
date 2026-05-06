import { describe, it, expect } from 'vitest';
import { applyPathologyMacroOverride } from './pathologyMacroOverride';
import type { MacroTarget } from '@/types/nutrition';

const BASELINE: MacroTarget = {
  proteinG: 140,
  carbsG: 200,
  fatG: 60,
  fiberMinG: 25,
};

describe('applyPathologyMacroOverride', () => {
  it('bez patologija — vraca ulaz nepromenjen', () => {
    const result = applyPathologyMacroOverride({
      macros: BASELINE,
      totalCalories: 2000,
      conditions: [],
    });
    expect(result).toEqual(BASELINE);
  });

  it('IR — carbs cap na 23% kcal, razlika ide u masti', () => {
    const result = applyPathologyMacroOverride({
      macros: BASELINE,
      totalCalories: 2000,           // 23% = 460 kcal = 115g carbs
      conditions: ['insulin_resistance'],
    });
    expect(result.carbsG).toBe(115);
    // Razlika: 200 - 115 = 85g carbs = 340 kcal → 340/9 ≈ 38g masti
    expect(result.fatG).toBe(60 + 38);
  });

  it('IR — ako su carbs vec ispod 23%, NE menja nista', () => {
    const lowCarb: MacroTarget = { ...BASELINE, carbsG: 80 }; // 80*4=320 kcal = 16% od 2000
    const result = applyPathologyMacroOverride({
      macros: lowCarb,
      totalCalories: 2000,
      conditions: ['insulin_resistance'],
    });
    expect(result.carbsG).toBe(80);
    expect(result.fatG).toBe(60);
  });

  it('PCOS — postavlja omega3MinG=2 i maxAllowedGI=40', () => {
    const result = applyPathologyMacroOverride({
      macros: BASELINE,
      totalCalories: 2000,
      conditions: ['pcos'],
    });
    expect(result.omega3MinG).toBe(2);
    expect(result.maxAllowedGI).toBe(40);
  });

  it('Hashimoto — postavlja antiInflammatoryFlag', () => {
    const result = applyPathologyMacroOverride({
      macros: BASELINE,
      totalCalories: 2000,
      conditions: ['hashimoto'],
    });
    expect(result.antiInflammatoryFlag).toBe(true);
  });

  it('Hipertenzija — sodium cap + potassium min', () => {
    const result = applyPathologyMacroOverride({
      macros: BASELINE,
      totalCalories: 2000,
      conditions: ['hypertension'],
    });
    expect(result.sodiumMaxMg).toBe(2000);
    expect(result.potassiumMinMg).toBe(3500);
  });

  it('IR + PCOS combo — najstroziji filter (PCOS-ov maxGI 40 preglasi)', () => {
    const result = applyPathologyMacroOverride({
      macros: BASELINE,
      totalCalories: 2000,
      conditions: ['insulin_resistance', 'pcos'],
    });
    expect(result.carbsG).toBe(115);              // IR cap
    expect(result.maxAllowedGI).toBe(40);         // PCOS strozi
    expect(result.omega3MinG).toBe(2);
  });

  it('Hashimoto + Hipertenzija — kumulira flag-ove bez konflikta', () => {
    const result = applyPathologyMacroOverride({
      macros: BASELINE,
      totalCalories: 2000,
      conditions: ['hashimoto', 'hypertension'],
    });
    expect(result.antiInflammatoryFlag).toBe(true);
    expect(result.sodiumMaxMg).toBe(2000);
    expect(result.potassiumMinMg).toBe(3500);
  });

  it('idempotentno — primena 3× daje isti rezultat', () => {
    const inputs = {
      macros: BASELINE,
      totalCalories: 2000,
      conditions: ['insulin_resistance', 'pcos', 'hashimoto'] as const,
    };
    const r1 = applyPathologyMacroOverride({ ...inputs, conditions: [...inputs.conditions] });
    const r2 = applyPathologyMacroOverride({ ...inputs, conditions: [...inputs.conditions] });
    const r3 = applyPathologyMacroOverride({ ...inputs, conditions: [...inputs.conditions] });
    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);
  });

  it('NE mutira ulaznu macros vrednost', () => {
    const original: MacroTarget = { ...BASELINE };
    applyPathologyMacroOverride({
      macros: BASELINE,
      totalCalories: 2000,
      conditions: ['insulin_resistance'],
    });
    expect(BASELINE).toEqual(original);
  });
});
