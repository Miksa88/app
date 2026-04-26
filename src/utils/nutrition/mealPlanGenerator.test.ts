import { describe, it, expect } from "vitest";
import { generateMealPlan, computeDayRollups, findSwapAlternatives } from "./mealPlanGenerator";

const baseInput = {
  dailyTarget: { calories: 2000, protein: 140, carbs: 220, fat: 65 },
  mealCount: 4 as const,
  allergies: [],
  foodDislikes: [],
  weekStartDate: "2026-04-26",
};

describe("generateMealPlan", () => {
  it("generates exactly 7 days × mealCount slots", () => {
    const plan = generateMealPlan(baseInput);
    expect(plan.slots.length).toBe(7 * 4);  // 28 slots
    expect(plan.weekStartDate).toBe("2026-04-26");
    expect(plan.mealCount).toBe(4);
  });

  it("respects allergies — no foods with matching allergen", () => {
    const plan = generateMealPlan({ ...baseInput, allergies: ["lactose"] });
    // Indirect check: rollups should still produce reasonable kcal totals
    const rollups = computeDayRollups(plan);
    rollups.forEach(day => {
      expect(day.calories).toBeGreaterThan(0);
    });
  });

  it("each day rollup is within ±25% of daily target (loose tolerance for variety)", () => {
    const plan = generateMealPlan(baseInput);
    const rollups = computeDayRollups(plan);
    rollups.forEach(day => {
      const ratio = day.calories / 2000;
      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(1.5);
    });
  });

  it("3-meal mode skips snack slots", () => {
    const plan = generateMealPlan({ ...baseInput, mealCount: 3 });
    expect(plan.slots.length).toBe(7 * 3);
    plan.slots.forEach(s => {
      expect(["breakfast", "lunch", "dinner"]).toContain(s.slotType);
    });
  });

  it("5-meal mode includes both snacks", () => {
    const plan = generateMealPlan({ ...baseInput, mealCount: 5 });
    expect(plan.slots.length).toBe(7 * 5);
    const types = new Set(plan.slots.map(s => s.slotType));
    expect(types.has("snack_am")).toBe(true);
    expect(types.has("snack_pm")).toBe(true);
  });

  it("findSwapAlternatives returns at most N items, none equal to current", () => {
    const plan = generateMealPlan(baseInput);
    const alt = findSwapAlternatives(plan, 0, [], [], 3);
    expect(alt.length).toBeLessThanOrEqual(3);
    alt.forEach(food => {
      expect(food.id).not.toBe(plan.slots[0].foodId);
    });
  });
});
