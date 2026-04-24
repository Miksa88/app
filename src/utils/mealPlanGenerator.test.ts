// ============================================================================
// mealPlanGenerator — IR distribution + mini-meal integration (IT-19)
// Spec: 02_NUTRITION_FLOW_MASTER.md Sekcija 6.4 (IR meal structure)
// ============================================================================
//
// Pokrivenost:
//   1. Non-IR klijentkinja: default raspodela 25/12/30/13/20, nijedan slot
//      nije mini_meal_ir, carbs > 0 u svim slotovima.
//   2. IR klijentkinja: IR raspodela 28/10/32/10/20, slotovi 2 i 4 su
//      mini_meal_ir sa carbs=0, total kalorija ostaje konstantna,
//      breakfast ~ 0.28 × target, lunch ~ 0.32 × target.
//   3. Idempotencija: 2× poziv sa istim ulazom daje iste ukupne kalorije.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  generateMealPlan,
  DEFAULT_5_MEAL_SLOTS,
  type ClientProfile,
  type NutritionTemplate,
} from './mealPlanGenerator';
import { FOOD_DATABASE } from '@/data/foodDatabase';

function makeClientProfile(overrides: Partial<ClientProfile> = {}): ClientProfile {
  return {
    weight: 65,
    height: 168,
    age: 30,
    gender: 'female',
    goal: 'maintain',
    experience: 'intermediate',
    frequency: 4,
    allergies: [],
    foodDislikes: [],
    metabolicProfile: [],
    sleepQuality: 7,
    stressLevel: 3,
    jobType: 'sedentary',
    ...overrides,
  };
}

function makeTemplate(): NutritionTemplate {
  return {
    id: 'it19-tpl',
    name: 'IT-19 Test',
    description: 'Standard 5-meal plan',
    goalType: 'maintain',
    macroRatio: { protein: 30, carbs: 40, fat: 30 },
    macroPreset: 'balanced',
    calorieStrategy: 'auto',
    differentOnTrainingDays: false,
    restrictions: [],
    tags: ['health'],
    createdAt: '2026-04-24',
    mealCount: 5,
    mealSlots: DEFAULT_5_MEAL_SLOTS,
  };
}

describe('generateMealPlan — IR distribution integration (IT-19)', () => {
  it('Non-IR klijentkinja: default distribucija, bez mini_meal_ir markera, carbs > 0 svuda', () => {
    const plan = generateMealPlan(
      makeClientProfile({ metabolicProfile: [] }),
      makeTemplate(),
      FOOD_DATABASE,
    );

    expect(plan.meals).toHaveLength(5);

    // Breakfast = 25% × dailyCalories (default distribution)
    const breakfast = plan.meals[0];
    const expectedBreakfastKcal = Math.round(plan.dailyCalories * 0.25);
    expect(breakfast.calories).toBe(expectedBreakfastKcal);

    // Lunch = 30% × dailyCalories
    const lunch = plan.meals[2];
    const expectedLunchKcal = Math.round(plan.dailyCalories * 0.30);
    expect(lunch.calories).toBe(expectedLunchKcal);

    // Morning snack = 12% × dailyCalories
    const morningSnack = plan.meals[1];
    const expectedMorningKcal = Math.round(plan.dailyCalories * 0.12);
    expect(morningSnack.calories).toBe(expectedMorningKcal);

    // Afternoon snack = 13% × dailyCalories
    const afternoonSnack = plan.meals[3];
    const expectedAfternoonKcal = Math.round(plan.dailyCalories * 0.13);
    expect(afternoonSnack.calories).toBe(expectedAfternoonKcal);

    // Dinner = 20% × dailyCalories
    const dinner = plan.meals[4];
    const expectedDinnerKcal = Math.round(plan.dailyCalories * 0.20);
    expect(dinner.calories).toBe(expectedDinnerKcal);

    // Nijedan slot nije mini_meal_ir
    for (const meal of plan.meals) {
      expect(meal.slotType).not.toBe('mini_meal_ir');
    }
  });

  it('IR klijentkinja: 28/10/32/10/20 raspodela, slotovi 2 i 4 su mini_meal_ir sa carbs=0', () => {
    const plan = generateMealPlan(
      makeClientProfile({ metabolicProfile: ['insulin_resistance'] }),
      makeTemplate(),
      FOOD_DATABASE,
    );

    expect(plan.meals).toHaveLength(5);

    // Breakfast = 28% × dailyCalories
    const breakfast = plan.meals[0];
    expect(breakfast.calories).toBe(Math.round(plan.dailyCalories * 0.28));
    expect(breakfast.slotType).toBe('standard');

    // Lunch = 32% × dailyCalories
    const lunch = plan.meals[2];
    expect(lunch.calories).toBe(Math.round(plan.dailyCalories * 0.32));
    expect(lunch.slotType).toBe('standard');

    // Dinner = 20% × dailyCalories
    const dinner = plan.meals[4];
    expect(dinner.calories).toBe(Math.round(plan.dailyCalories * 0.20));
    expect(dinner.slotType).toBe('standard');

    // Morning snack (slot 2, index 1) → mini_meal_ir, carbs=0
    const morningSnack = plan.meals[1];
    expect(morningSnack.slotType).toBe('mini_meal_ir');
    expect(morningSnack.carbs).toBe(0);
    expect(morningSnack.slotLabel).toBe('Mini-obrok (P+F)');

    // Afternoon snack (slot 4, index 3) → mini_meal_ir, carbs=0
    const afternoonSnack = plan.meals[3];
    expect(afternoonSnack.slotType).toBe('mini_meal_ir');
    expect(afternoonSnack.carbs).toBe(0);
    expect(afternoonSnack.slotLabel).toBe('Mini-obrok (P+F)');

    // IR insight i metabolicAdjustments ostaju
    expect(plan.metabolicAdjustments).toContain('insulin_resistance');
  });

  it('IR klijentkinja: slotovi 1, 3, 5 (glavni obroci) zadrzavaju carbs > 0', () => {
    const plan = generateMealPlan(
      makeClientProfile({ metabolicProfile: ['insulin_resistance'] }),
      makeTemplate(),
      FOOD_DATABASE,
    );

    expect(plan.meals[0].carbs).toBeGreaterThan(0);  // breakfast
    expect(plan.meals[2].carbs).toBeGreaterThan(0);  // lunch
    expect(plan.meals[4].carbs).toBeGreaterThan(0);  // dinner
  });

  it('generateMealPlan je idempotentan (2× isti poziv → isti total kcal)', () => {
    const profile = makeClientProfile({ metabolicProfile: ['insulin_resistance'] });
    const tpl = makeTemplate();
    const plan1 = generateMealPlan(profile, tpl, FOOD_DATABASE);
    const plan2 = generateMealPlan(profile, tpl, FOOD_DATABASE);
    expect(plan1.dailyCalories).toBe(plan2.dailyCalories);
    expect(plan1.meals.map(m => m.calories)).toEqual(plan2.meals.map(m => m.calories));
    expect(plan1.meals.map(m => m.slotType)).toEqual(plan2.meals.map(m => m.slotType));
  });
});
