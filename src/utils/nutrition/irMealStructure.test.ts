import { describe, it, expect } from 'vitest';
import {
  applyIRMealStructure,
  shouldApplyIRStructure,
  isIRMiniMealSlot,
  pickMealCalorieDistribution,
  IR_MEAL_CALORIE_DISTRIBUTION,
  DEFAULT_MEAL_CALORIE_DISTRIBUTION,
} from './irMealStructure';
import type { MealSlot, MacroTarget } from '@/types/nutrition';

const baseMacros: MacroTarget = {
  proteinG: 130,
  carbsG: 180,
  fatG: 60,
  fiberMinG: 25,
};

function makeSlot(category: MealSlot['category'], time: string): MealSlot {
  return {
    slotId: category,
    category,
    preferredTime: time,
    role: 'regular',
    proteinTarget: 26,
    carbsTarget: 36,
    fatTarget: 12,
  };
}

const fiveSlots: MealSlot[] = [
  makeSlot('breakfast', '08:00'),
  makeSlot('morning_snack', '11:00'),
  makeSlot('lunch', '13:30'),
  makeSlot('afternoon_snack', '16:30'),
  makeSlot('dinner', '19:30'),
];

describe('applyIRMealStructure', () => {
  it('pretvara slot 2 (morning_snack) u P+F mini-meal', () => {
    const result = applyIRMealStructure(fiveSlots, baseMacros);
    const morningSnack = result[1];
    expect(morningSnack.slotType).toBe('mini_meal_ir');
    expect(morningSnack.carbsTarget).toBe(0);
    expect(morningSnack.proteinTarget).toBe(26);  // 130/5
    expect(morningSnack.fatTarget).toBe(Math.round(12 * 1.2));  // +20%
    expect(morningSnack.label).toBe('Mini-obrok (P+F)');
    expect(morningSnack.uiNote).toBeDefined();
  });

  it('pretvara slot 4 (afternoon_snack) u P+F mini-meal', () => {
    const result = applyIRMealStructure(fiveSlots, baseMacros);
    const afternoonSnack = result[3];
    expect(afternoonSnack.slotType).toBe('mini_meal_ir');
    expect(afternoonSnack.carbsTarget).toBe(0);
  });

  it('NE menja glavne obroke (breakfast, lunch, dinner)', () => {
    const result = applyIRMealStructure(fiveSlots, baseMacros);
    expect(result[0]).toEqual(fiveSlots[0]);  // breakfast nepromenjen
    expect(result[2]).toEqual(fiveSlots[2]);  // lunch nepromenjen
    expect(result[4]).toEqual(fiveSlots[4]);  // dinner nepromenjen
  });

  it('postavlja mealGap na 180 min (3h)', () => {
    const result = applyIRMealStructure(fiveSlots, baseMacros);
    expect(result[1].mealGap).toBe(180);
    expect(result[3].mealGap).toBe(180);
  });

  it('postavlja allowed/forbidden food tags', () => {
    const result = applyIRMealStructure(fiveSlots, baseMacros);
    expect(result[1].allowedFoodTags).toContain('ir_friendly');
    expect(result[1].allowedFoodTags).toContain('high_protein');
    expect(result[1].forbiddenFoodTags).toContain('snack');
    expect(result[1].forbiddenFoodTags).toContain('high_gi');
  });

  it('NE primenjuje na <5 obroka (no-op)', () => {
    const threeSlots = fiveSlots.slice(0, 3);
    const result = applyIRMealStructure(threeSlots, baseMacros);
    expect(result).toEqual(threeSlots);
  });

  it('NE mutira ulazni niz', () => {
    const original = JSON.parse(JSON.stringify(fiveSlots));
    applyIRMealStructure(fiveSlots, baseMacros);
    expect(fiveSlots).toEqual(original);
  });

  it('idempotentno — 3× isti rezultat', () => {
    const r1 = applyIRMealStructure(fiveSlots, baseMacros);
    const r2 = applyIRMealStructure(fiveSlots, baseMacros);
    const r3 = applyIRMealStructure(fiveSlots, baseMacros);
    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);
  });
});

describe('shouldApplyIRStructure', () => {
  it('true ako insulin_resistance u listi', () => {
    expect(shouldApplyIRStructure(['insulin_resistance'])).toBe(true);
    expect(shouldApplyIRStructure(['hashimoto', 'insulin_resistance'])).toBe(true);
  });

  it('false bez IR', () => {
    expect(shouldApplyIRStructure([])).toBe(false);
    expect(shouldApplyIRStructure(['pcos'])).toBe(false);
  });
});

describe('isIRMiniMealSlot', () => {
  it('vraca true samo za index 1 i 3', () => {
    expect(isIRMiniMealSlot(0)).toBe(false);
    expect(isIRMiniMealSlot(1)).toBe(true);
    expect(isIRMiniMealSlot(2)).toBe(false);
    expect(isIRMiniMealSlot(3)).toBe(true);
    expect(isIRMiniMealSlot(4)).toBe(false);
  });
});

describe('pickMealCalorieDistribution (IT-19)', () => {
  it('vraca IR distribuciju (28/10/32/10/20) za IR klijentkinje', () => {
    const dist = pickMealCalorieDistribution(['insulin_resistance']);
    expect(dist).toBe(IR_MEAL_CALORIE_DISTRIBUTION);
    expect(dist.breakfast).toBe(0.28);
    expect(dist.morning_snack).toBe(0.10);
    expect(dist.lunch).toBe(0.32);
    expect(dist.afternoon_snack).toBe(0.10);
    expect(dist.dinner).toBe(0.20);
  });

  it('vraca default distribuciju (25/12/30/13/20) za non-IR klijentkinje', () => {
    expect(pickMealCalorieDistribution([])).toBe(DEFAULT_MEAL_CALORIE_DISTRIBUTION);
    expect(pickMealCalorieDistribution(['hashimoto'])).toBe(DEFAULT_MEAL_CALORIE_DISTRIBUTION);
    expect(pickMealCalorieDistribution(['pcos', 'hypertension'])).toBe(
      DEFAULT_MEAL_CALORIE_DISTRIBUTION,
    );
  });

  it('radi IR detekciju cak i kad je u kombinaciji sa drugim stanjima', () => {
    const dist = pickMealCalorieDistribution(['hashimoto', 'insulin_resistance']);
    expect(dist).toBe(IR_MEAL_CALORIE_DISTRIBUTION);
  });

  it('obe distribucije sabiraju na 1.0 (pokrivena sva kalorija)', () => {
    const sumIR = Object.values(IR_MEAL_CALORIE_DISTRIBUTION).reduce((a, b) => a + b, 0);
    const sumDefault = Object.values(DEFAULT_MEAL_CALORIE_DISTRIBUTION).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sumIR).toBeCloseTo(1.0, 5);
    expect(sumDefault).toBeCloseTo(1.0, 5);
  });
});
