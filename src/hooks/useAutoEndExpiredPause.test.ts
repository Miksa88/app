// ============================================================================
// useAutoEndExpiredPause tests — auto-resume istekle pauze
// MVP_PRESET gap #1 (Pause/Freeze)
// ============================================================================
//
// Pattern: testiramo pure orchestrator `runAutoEndExpiredPause` bez React-a.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  runAutoEndExpiredPause,
  type AutoEndExpiredPauseDeps,
} from "./useAutoEndExpiredPause";
import type { PauseState } from "@/services/clientPauseService";

const expiredState = (overrides: Partial<PauseState> = {}): PauseState => ({
  paused_at: "2026-01-01T00:00:00Z",
  pause_until: "2020-01-01", // davno istekla
  reason: "travel",
  paused_by_trainer_id: null,
  ...overrides,
});

function makeDeps(
  override?: Partial<AutoEndExpiredPauseDeps>,
): AutoEndExpiredPauseDeps {
  return {
    endPause: vi.fn(async () => ({
      data: { ok: true, status: {} },
      error: null,
    })),
    resumeClient: vi.fn(async () => undefined),
    ...override,
  };
}

describe("runAutoEndExpiredPause", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ne radi nista za null state", async () => {
    const deps = makeDeps();
    const ended = await runAutoEndExpiredPause("c1", null, deps);
    expect(ended).toBe(false);
    expect(deps.endPause).not.toHaveBeenCalled();
    expect(deps.resumeClient).not.toHaveBeenCalled();
  });

  it("ne radi nista za indefinitivnu pauzu (pause_until=null)", async () => {
    const deps = makeDeps();
    const ended = await runAutoEndExpiredPause(
      "c1",
      expiredState({ pause_until: null }),
      deps,
    );
    expect(ended).toBe(false);
    expect(deps.endPause).not.toHaveBeenCalled();
  });

  it("ne radi nista za pauzu koja jos traje", async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const deps = makeDeps();
    const ended = await runAutoEndExpiredPause(
      "c1",
      expiredState({ pause_until: future.toISOString().slice(0, 10) }),
      deps,
    );
    expect(ended).toBe(false);
    expect(deps.endPause).not.toHaveBeenCalled();
  });

  it("istekla klijent-pauza → poziva end-pause EF, bez fallback-a", async () => {
    const deps = makeDeps();
    const ended = await runAutoEndExpiredPause("c1", expiredState(), deps);
    expect(ended).toBe(true);
    expect(deps.endPause).toHaveBeenCalledTimes(1);
    expect(deps.endPause).toHaveBeenCalledWith("c1");
    expect(deps.resumeClient).not.toHaveBeenCalled();
  });

  it("istekla trener-pauza (end-pause vraca ok:false) → fallback resumeClient", async () => {
    const deps = makeDeps({
      endPause: vi.fn(async () => ({
        data: { ok: false, error: "Nema aktivne pauze za zavrsiti." },
        error: null,
      })),
    });
    const ended = await runAutoEndExpiredPause("c1", expiredState(), deps);
    expect(ended).toBe(true);
    expect(deps.resumeClient).toHaveBeenCalledTimes(1);
    expect(deps.resumeClient).toHaveBeenCalledWith("c1");
  });

  it("end-pause EF error (network/500) → fallback resumeClient", async () => {
    const deps = makeDeps({
      endPause: vi.fn(async () => ({
        data: null,
        error: { message: "FunctionsHttpError" },
      })),
    });
    const ended = await runAutoEndExpiredPause("c1", expiredState(), deps);
    expect(ended).toBe(true);
    expect(deps.resumeClient).toHaveBeenCalledTimes(1);
  });
});
