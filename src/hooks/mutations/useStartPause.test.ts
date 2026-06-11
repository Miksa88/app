// ============================================================================
// useStartPause tests
// ============================================================================
//
// Pattern: isti kao useSwapNextSessions.test.ts — testiramo pure orchestrator
// `runStartPause` bez React Query setup-a.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { runStartPause } from './useStartPause';
import type { StartPauseDeps } from './useStartPause';

function makeDeps(
  override?: Partial<StartPauseDeps>,
): StartPauseDeps {
  return {
    invoke: vi.fn(async () => ({
      data: {
        ok: true,
        pauseEvent: {
          id: 'pause-1',
          pause_type: 'illness',
          start_date: '2026-04-23',
          is_active: true,
          recovery_penalty: -0.15,
          penalty_sessions_remaining: 2,
        },
        status: {
          clientId: 'c1',
          training: {
            activePauseEvent: {
              type: 'illness',
              startDate: '2026-04-23',
              penaltySessionsRemaining: 2,
              recoveryPenalty: -0.15,
            },
          },
        },
      },
      error: null,
    })),
    ...override,
  };
}

describe('runStartPause', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path — Edge Function vraca ok, mutation resolve-uje sa payloadom', async () => {
    const deps = makeDeps();
    const result = await runStartPause(
      {
        clientId: 'c1',
        pauseType: 'illness',
        startDate: '2026-04-23',
      },
      deps,
    );

    expect(result.ok).toBe(true);
    expect(deps.invoke).toHaveBeenCalledTimes(1);
    expect(deps.invoke).toHaveBeenCalledWith({
      clientId: 'c1',
      pauseType: 'illness',
      startDate: '2026-04-23',
      pauseUntil: undefined,
      notes: undefined,
    });
  });

  it('pauseUntil passthrough — duration picker vrednost ide u EF body', async () => {
    const deps = makeDeps();
    await runStartPause(
      {
        clientId: 'c1',
        pauseType: 'travel',
        startDate: '2026-06-11',
        pauseUntil: '2026-06-18',
      },
      deps,
    );

    expect(deps.invoke).toHaveBeenCalledWith({
      clientId: 'c1',
      pauseType: 'travel',
      startDate: '2026-06-11',
      pauseUntil: '2026-06-18',
      notes: undefined,
    });
  });

  it('pauseUntil null ("dok se ne vratim") — salje undefined, ne null', async () => {
    const deps = makeDeps();
    await runStartPause(
      {
        clientId: 'c1',
        pauseType: 'travel',
        startDate: '2026-06-11',
        pauseUntil: null,
      },
      deps,
    );

    expect(deps.invoke).toHaveBeenCalledWith(
      expect.objectContaining({ pauseUntil: undefined }),
    );
  });

  it('server validacija — EF vraca 400 za pauzu duzu od 30 dana, mutation throw-a', async () => {
    const deps = makeDeps({
      invoke: vi.fn(async () => ({
        data: { ok: false, error: 'Pauza moze trajati najvise 30 dana' },
        error: null,
      })),
    });

    await expect(
      runStartPause(
        {
          clientId: 'c1',
          pauseType: 'travel',
          startDate: '2026-06-11',
          pauseUntil: '2026-08-01',
        },
        deps,
      ),
    ).rejects.toThrow(/30 dana/);
  });

  it('error path — Edge Function vraca 409 konflikt, mutation throw-a', async () => {
    const deps = makeDeps({
      invoke: vi.fn(async () => ({
        data: {
          ok: false,
          error: 'Vec imas aktivnu pauzu. Zavrsi je pre nove.',
        },
        error: null,
      })),
    });

    await expect(
      runStartPause(
        {
          clientId: 'c1',
          pauseType: 'illness',
          startDate: '2026-04-23',
        },
        deps,
      ),
    ).rejects.toThrow(/aktivnu pauzu/);
  });
});
