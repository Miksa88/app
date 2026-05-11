// ============================================================================
// clientPauseService — pause state helpers
// V3 §10
// ============================================================================

import { describe, it, expect } from "vitest";
import { isPauseExpired, type PauseState } from "./clientPauseService";

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
