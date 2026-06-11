// ============================================================================
// clientPauseService — pause state helpers
// V3 §10
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  computePauseUntil,
  isPauseExpired,
  MAX_CLIENT_PAUSE_DAYS,
  PAUSE_DURATION_PRESETS,
  type PauseState,
} from "./clientPauseService";

const baseState = (overrides: Partial<PauseState> = {}): PauseState => ({
  paused_at: "2026-01-01T00:00:00Z",
  pause_until: null,
  reason: null,
  paused_by_trainer_id: null,
  ...overrides,
});

describe("isPauseExpired", () => {
  it("returns false for null state", () => {
    expect(isPauseExpired(null)).toBe(false);
  });

  it("returns false for indefinite pause (pause_until=null)", () => {
    expect(isPauseExpired(baseState({ pause_until: null }))).toBe(false);
  });

  it("returns true when pause_until is in the past", () => {
    expect(isPauseExpired(baseState({ pause_until: "2020-01-01" }))).toBe(true);
  });

  it("returns false when pause_until is in the future", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const iso = future.toISOString().slice(0, 10);
    expect(isPauseExpired(baseState({ pause_until: iso }))).toBe(false);
  });
});

// ============================================================================
// computePauseUntil — duration picker logika (MVP_PRESET gap #1)
// ============================================================================

describe("computePauseUntil", () => {
  const from = new Date("2026-06-11T12:00:00");

  it("vraca null za indefinitivnu pauzu (days=null)", () => {
    expect(computePauseUntil(null, from)).toBe(null);
  });

  it("racuna YYYY-MM-DD za 7 dana", () => {
    expect(computePauseUntil(7, from)).toBe("2026-06-18");
  });

  it("racuna preko granice meseca (21 dan)", () => {
    expect(computePauseUntil(21, from)).toBe("2026-07-02");
  });

  it("dozvoljava tacno MAX_CLIENT_PAUSE_DAYS", () => {
    expect(computePauseUntil(MAX_CLIENT_PAUSE_DAYS, from)).toBe("2026-07-11");
  });

  it("throw-uje za 0 dana", () => {
    expect(() => computePauseUntil(0, from)).toThrow(/1\.\.30/);
  });

  it("throw-uje preko max (31 dan)", () => {
    expect(() => computePauseUntil(MAX_CLIENT_PAUSE_DAYS + 1, from)).toThrow(/1\.\.30/);
  });

  it("throw-uje za ne-integer", () => {
    expect(() => computePauseUntil(7.5, from)).toThrow();
  });

  it("svi preseti su validni (<= max)", () => {
    for (const days of PAUSE_DURATION_PRESETS) {
      expect(days).toBeLessThanOrEqual(MAX_CLIENT_PAUSE_DAYS);
      expect(computePauseUntil(days, from)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
