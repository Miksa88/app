// ============================================================================
// hydration.test.ts — pure helper za dnevni hydration target (IT-14)
// ============================================================================

import { describe, it, expect } from "vitest";

import {
  calcHydrationTarget,
  HYDRATION_MIN_ML,
  HYDRATION_MAX_ML,
  HYDRATION_TRAINING_BONUS_ML,
  HYDRATION_ML_PER_KG,
} from "./hydration";

describe("calcHydrationTarget — dnevni cilj u ml (spec 02 §8.1)", () => {
  it("baseline: 70kg, non-training → 2450 ml (70 × 35)", () => {
    // 70 * 35 = 2450, bez bonusa, unutar [1500, 4000]
    expect(calcHydrationTarget(70, false)).toBe(2450);
  });

  it("training day: 70kg, training → 2950 ml (2450 + 500)", () => {
    // Trening bonus se primenjuje pre clamp-a
    expect(calcHydrationTarget(70, true)).toBe(2450 + HYDRATION_TRAINING_BONUS_ML);
    expect(calcHydrationTarget(70, true)).toBe(2950);
  });

  it("edge weight: 40kg, non-training → 1500 ml (floor clamp)", () => {
    // 40 * 35 = 1400 → ispod MIN → clamp na 1500
    expect(calcHydrationTarget(40, false)).toBe(HYDRATION_MIN_ML);
    expect(calcHydrationTarget(40, false)).toBe(1500);
  });

  it("fractional kg: 72.5kg, training → 3038 ml (round(72.5*35)+500, unutar clamp-a)", () => {
    // 72.5 * 35 = 2537.5 → round → 2538 + 500 = 3038, unutar [1500, 4000]
    const base = Math.round(72.5 * HYDRATION_ML_PER_KG);
    expect(base).toBe(2538);
    expect(calcHydrationTarget(72.5, true)).toBe(3038);
    expect(calcHydrationTarget(72.5, true)).toBeLessThanOrEqual(HYDRATION_MAX_ML);
  });
});
