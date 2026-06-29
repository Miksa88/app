import { describe, it, expect } from "vitest";
import { isValidMealCalories, isValidMacroGrams, MEAL_MACRO_MAX } from "./mealMacros";

describe("isValidMealCalories", () => {
  it("accepts positive calories within the cap", () => {
    expect(isValidMealCalories("500")).toBe(true);
    expect(isValidMealCalories(String(MEAL_MACRO_MAX.calories))).toBe(true);
  });
  it("rejects zero, empty, negative, NaN and over-cap", () => {
    expect(isValidMealCalories("0")).toBe(false);
    expect(isValidMealCalories("")).toBe(false);
    expect(isValidMealCalories("-50")).toBe(false);
    expect(isValidMealCalories("abc")).toBe(false);
    expect(isValidMealCalories("99999")).toBe(false);
  });
});

describe("isValidMacroGrams", () => {
  it("allows empty (treated as 0) and valid non-negative grams", () => {
    expect(isValidMacroGrams("")).toBe(true);
    expect(isValidMacroGrams("   ")).toBe(true);
    expect(isValidMacroGrams("0")).toBe(true);
    expect(isValidMacroGrams("40")).toBe(true);
    expect(isValidMacroGrams(String(MEAL_MACRO_MAX.grams))).toBe(true);
  });
  it("rejects negative, NaN and over-cap", () => {
    expect(isValidMacroGrams("-50")).toBe(false);
    expect(isValidMacroGrams("abc")).toBe(false);
    expect(isValidMacroGrams("99999")).toBe(false);
  });
});
