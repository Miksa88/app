import { describe, it, expect } from "vitest";
import { clampBodyMetric, BODY_METRIC_BOUNDS } from "./bodyMetrics";

describe("clampBodyMetric", () => {
  it("accepts values inside the valid range", () => {
    expect(clampBodyMetric("currentWeight", 70)).toBe(70);
    expect(clampBodyMetric("height", 165)).toBe(165);
    expect(clampBodyMetric("currentWeight", 70.5)).toBe(70.5);
  });

  it("accepts the exact bounds", () => {
    expect(clampBodyMetric("currentWeight", BODY_METRIC_BOUNDS.currentWeight.min)).toBe(30);
    expect(clampBodyMetric("currentWeight", BODY_METRIC_BOUNDS.currentWeight.max)).toBe(250);
    expect(clampBodyMetric("height", BODY_METRIC_BOUNDS.height.min)).toBe(120);
    expect(clampBodyMetric("height", BODY_METRIC_BOUNDS.height.max)).toBe(230);
  });

  it("rejects empty/zero input (Number('') === 0)", () => {
    expect(clampBodyMetric("currentWeight", 0)).toBeNull();
    expect(clampBodyMetric("height", 0)).toBeNull();
  });

  it("rejects negative values", () => {
    expect(clampBodyMetric("currentWeight", -5)).toBeNull();
    expect(clampBodyMetric("height", -170)).toBeNull();
  });

  it("rejects absurdly large values", () => {
    expect(clampBodyMetric("currentWeight", 99999)).toBeNull();
    expect(clampBodyMetric("height", 1000)).toBeNull();
  });

  it("rejects NaN", () => {
    expect(clampBodyMetric("currentWeight", NaN)).toBeNull();
    expect(clampBodyMetric("height", Number("abc"))).toBeNull();
  });
});
