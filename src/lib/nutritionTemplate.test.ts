import { describe, it, expect } from "vitest";
import { isNutritionTemplateValid, type NutritionTemplateDraft } from "./nutritionTemplate";

const base: NutritionTemplateDraft = {
  macros: { protein: 40, carbs: 40, fat: 20 },
  mealSlots: [{ caloriePercentage: 30 }, { caloriePercentage: 40 }, { caloriePercentage: 30 }],
  calorieStrategy: "fixed",
  fixedCalories: 2000,
  calorieRange: { min: 1600, max: 2200 },
  differentOnTrainingDays: false,
  trainingDayMod: 200,
  restDayMod: -100,
};

describe("isNutritionTemplateValid", () => {
  it("accepts a well-formed template", () => {
    expect(isNutritionTemplateValid(base)).toBe(true);
  });

  it("rejects macro ratio that does not sum to 100", () => {
    expect(isNutritionTemplateValid({ ...base, macros: { protein: 30, carbs: 40, fat: 20 } })).toBe(false);
  });

  it("rejects meal-slot split that does not sum to 100", () => {
    expect(isNutritionTemplateValid({ ...base, mealSlots: [{ caloriePercentage: 50 }, { caloriePercentage: 40 }] })).toBe(false);
  });

  it("rejects out-of-range fixed calories", () => {
    expect(isNutritionTemplateValid({ ...base, fixedCalories: 0 })).toBe(false);
    expect(isNutritionTemplateValid({ ...base, fixedCalories: 99999 })).toBe(false);
  });

  it("rejects inverted or out-of-range calorie range", () => {
    expect(isNutritionTemplateValid({ ...base, calorieStrategy: "range", calorieRange: { min: 2200, max: 1600 } })).toBe(false);
    expect(isNutritionTemplateValid({ ...base, calorieStrategy: "range", calorieRange: { min: 100, max: 2200 } })).toBe(false);
  });

  it("ignores calorie fields when strategy is auto", () => {
    expect(isNutritionTemplateValid({ ...base, calorieStrategy: "auto", fixedCalories: 0 })).toBe(true);
  });

  it("rejects absurd day modifiers only when training-day split is on", () => {
    expect(isNutritionTemplateValid({ ...base, differentOnTrainingDays: true, trainingDayMod: 50000 })).toBe(false);
    expect(isNutritionTemplateValid({ ...base, differentOnTrainingDays: false, trainingDayMod: 50000 })).toBe(true);
  });
});
