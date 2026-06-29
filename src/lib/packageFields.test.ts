import { describe, it, expect } from "vitest";
import { isOptionalNumericInRange, isNumericInRange, PACKAGE_FIELD_BOUNDS } from "./packageFields";

describe("isOptionalNumericInRange", () => {
  const { min, max } = PACKAGE_FIELD_BOUNDS.price;
  it("allows empty (optional field)", () => {
    expect(isOptionalNumericInRange("", min, max)).toBe(true);
    expect(isOptionalNumericInRange("   ", min, max)).toBe(true);
  });
  it("accepts in-range values", () => {
    expect(isOptionalNumericInRange("49", min, max)).toBe(true);
  });
  it("rejects zero, negative, NaN and over-cap price", () => {
    expect(isOptionalNumericInRange("0", min, max)).toBe(false);
    expect(isOptionalNumericInRange("-10", min, max)).toBe(false);
    expect(isOptionalNumericInRange("abc", min, max)).toBe(false);
    expect(isOptionalNumericInRange("9999999", min, max)).toBe(false);
  });
});

describe("isNumericInRange", () => {
  const { min, max } = PACKAGE_FIELD_BOUNDS.videoCallFrequency;
  it("accepts 0..31 video-call frequency", () => {
    expect(isNumericInRange(0, min, max)).toBe(true);
    expect(isNumericInRange(8, min, max)).toBe(true);
    expect(isNumericInRange(31, min, max)).toBe(true);
  });
  it("rejects negative, over-cap and NaN", () => {
    expect(isNumericInRange(-1, min, max)).toBe(false);
    expect(isNumericInRange(999, min, max)).toBe(false);
    expect(isNumericInRange(NaN, min, max)).toBe(false);
  });
});
