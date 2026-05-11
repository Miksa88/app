// ============================================================================
// userPreferencesService — unit tests for conversion helpers
// V3 §6 (units toggle)
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  cmToIn,
  displayLength,
  displayWeight,
  getActiveVacation,
  inToCm,
  kgToLb,
  lbToKg,
  type NotificationPreferences,
} from "./userPreferencesService";

describe("kg/lb conversion", () => {
  it("kgToLb is round-trippable within 0.1", () => {
    expect(kgToLb(100)).toBeCloseTo(220.5, 1);
    expect(lbToKg(kgToLb(70))).toBeCloseTo(70, 1);
  });

  it("lbToKg known fixture", () => {
    expect(lbToKg(220.5)).toBeCloseTo(100, 1);
  });
});

describe("cm/in conversion", () => {
  it("cmToIn is round-trippable within 0.5cm", () => {
    expect(cmToIn(170)).toBeCloseTo(66.9, 1);
    // Round-trip via 1-decimal floor introduces up to ~0.5cm drift; that's acceptable
    // for display-grade precision (clients aren't logging 0.5mm differences).
    expect(inToCm(cmToIn(85))).toBeCloseTo(85, 0);
  });
});

describe("getActiveVacation", () => {
  const basePrefs = (vacation: NotificationPreferences["vacation"]): NotificationPreferences => ({
    quiet_hours: { start: "22:00", end: "07:00" },
    categories: { workout: true, meals: true, chat: true, system: false, achievement: false },
    vacation,
  });

  it("returns null when no vacation set", () => {
    expect(getActiveVacation(basePrefs(undefined))).toBeNull();
  });

  it("returns null when vacation.active is false", () => {
    expect(getActiveVacation(basePrefs({ active: false, until: null, message: null }))).toBeNull();
  });

  it("returns vacation when active and indefinite", () => {
    const v = { active: true, until: null, message: "Be back" };
    expect(getActiveVacation(basePrefs(v))).toEqual(v);
  });

  it("returns null when until date is in the past (auto-expire)", () => {
    expect(
      getActiveVacation(basePrefs({ active: true, until: "2020-01-01", message: null })),
    ).toBeNull();
  });

  it("returns vacation when until date is in the future", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const v = { active: true, until: future.toISOString().slice(0, 10), message: null };
    expect(getActiveVacation(basePrefs(v))).toEqual(v);
  });
});

describe("display helpers", () => {
  it("displayWeight formats kg + lb", () => {
    expect(displayWeight(70, "kg")).toBe("70.0 kg");
    expect(displayWeight(70, "lb")).toMatch(/154\.[0-9]+ lb/);
  });

  it("displayLength formats cm + in", () => {
    expect(displayLength(170, "cm")).toBe("170.0 cm");
    expect(displayLength(170, "in")).toMatch(/66\.[0-9]+ in/);
  });
});
