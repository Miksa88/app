import { describe, it, expect } from "vitest";
import { clampSetMetric, SET_METRIC_MAX } from "./setMetrics";

describe("clampSetMetric", () => {
  it("passes through valid in-range values", () => {
    expect(clampSetMetric("weight", 80)).toBe(80);
    expect(clampSetMetric("reps", 12)).toBe(12);
    expect(clampSetMetric("weight", 0)).toBe(0); // bodyweight
  });

  it("caps values above the per-field max", () => {
    expect(clampSetMetric("weight", 99999)).toBe(SET_METRIC_MAX.weight);
    expect(clampSetMetric("reps", 99999)).toBe(SET_METRIC_MAX.reps);
  });

  it("floors negatives to 0", () => {
    expect(clampSetMetric("weight", -10)).toBe(0);
    expect(clampSetMetric("reps", -3)).toBe(0);
  });

  it("coerces NaN/Infinity to 0 (Math.max(0, NaN) === NaN leak)", () => {
    expect(clampSetMetric("weight", NaN)).toBe(0);
    expect(clampSetMetric("reps", Number("abc"))).toBe(0);
    expect(clampSetMetric("weight", Infinity)).toBe(0);
  });
});
