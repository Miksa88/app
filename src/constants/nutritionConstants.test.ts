import { describe, it, expect } from 'vitest';
import * as C from './nutritionConstants';

// Karakterizacioni test (Task 1.6): zakucava vrednosti ekstraktovanih
// konstanti. Promena bilo koje vrednosti = promena ponašanja generatora
// i mora biti svesna odluka (uz spec citat).
describe('nutritionConstants — characterization', () => {
  it('Atwater faktori (IR mini-meal konverzija)', () => {
    expect(C.CARBS_KCAL_PER_G).toBe(4);
    expect(C.FAT_KCAL_PER_G).toBe(9);
  });

  it('workout frequency opseg 3-5, fallback 4', () => {
    expect(C.MIN_WORKOUT_FREQUENCY).toBe(3);
    expect(C.MAX_WORKOUT_FREQUENCY).toBe(5);
    expect(C.DEFAULT_WORKOUT_FREQUENCY).toBe(4);
  });

  it('fatigue safeguard pragovi (Spec 03 Rule 2)', () => {
    expect(C.HIGH_STRESS_THRESHOLD).toBe(7);
    expect(C.LOW_SLEEP_QUALITY_THRESHOLD).toBe(4);
  });

  it('training/rest day default modifikatori', () => {
    expect(C.DEFAULT_TRAINING_DAY_CALORIE_BONUS).toBe(150);
    expect(C.DEFAULT_REST_DAY_CALORIE_REDUCTION).toBe(-100);
  });

  it('mTOR protein floor (pocetnici.md §3.4)', () => {
    expect(C.PROTEIN_FLOOR_PER_MEAL_G).toBe(25);
    expect(C.PROTEIN_RANGE_PER_SLOT_G).toBe(20);
  });

  it('meal matching heuristika', () => {
    expect(C.PROTEIN_SHORTFALL_PENALTY).toBe(50);
    expect(C.CALORIE_DIFF_WEIGHT).toBe(1);
    expect(C.PROTEIN_DIFF_WEIGHT).toBe(2);
  });

  it('A/B/C rotacija i nedelja', () => {
    expect(C.MEAL_ROTATION_VARIANTS).toBe(3);
    expect(C.DAYS_PER_WEEK).toBe(7);
    expect(C.TOP_MATCHES_FOR_ROTATION).toBe(3);
    expect(C.IR_MINI_MEAL_MIN_SLOT_COUNT).toBe(5);
  });

  it('findSimilarMeals defaults i template score tezine', () => {
    expect(C.SIMILAR_MEAL_TOLERANCE).toBe(0.10);
    expect(C.SIMILAR_MEAL_TOP_N).toBe(5);
    expect(C.TEMPLATE_SCORE_GOAL_MATCH).toBe(3);
    expect(C.TEMPLATE_SCORE_EXPERIENCE_MATCH).toBe(2);
    expect(C.TEMPLATE_SCORE_FREQUENCY_MATCH).toBe(2);
    expect(C.TEMPLATE_SCORE_LIMITATION_SAFE).toBe(1);
    expect(C.TEMPLATE_SCORE_FREE_TRIAL).toBe(1);
  });
});
