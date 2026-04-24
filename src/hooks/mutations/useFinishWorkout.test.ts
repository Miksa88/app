// ============================================================================
// useFinishWorkout tests
// ============================================================================
//
// Testiramo `runFinishWorkout` orchestrator direktno (bez renderHook), isti
// pattern kao useDailyCheckIn.test.ts. Pokriva 2 glavna invarijanta:
//   1. Happy path — Edge Function vraca { ok: true }, mutation resolve-uje sa
//      payloadom.
//   2. Error path — Edge Function vraca { error }, mutation throw-a.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { runFinishWorkout } from './useFinishWorkout';
import type { FinishWorkoutDeps } from './useFinishWorkout';

function makeDeps(
  override?: Partial<FinishWorkoutDeps>,
): FinishWorkoutDeps {
  return {
    invoke: vi.fn(async () => ({
      data: { ok: true, queueAdvanced: true, status: { clientId: 'c1' } },
      error: null,
    })),
    ...override,
  };
}

describe('runFinishWorkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path — Edge Function vraca ok, mutation resolve-uje sa payloadom', async () => {
    const deps = makeDeps();
    const result = await runFinishWorkout(
      {
        clientId: 'c1',
        sessionId: 'sess-A1',
        completedAt: '2026-04-23T12:00:00Z',
      },
      deps,
    );

    expect(result.ok).toBe(true);
    expect(result.queueAdvanced).toBe(true);
    expect(deps.invoke).toHaveBeenCalledTimes(1);
    expect(deps.invoke).toHaveBeenCalledWith({
      clientId: 'c1',
      sessionId: 'sess-A1',
      completedAt: '2026-04-23T12:00:00Z',
    });
  });

  it('error path — Edge Function vraca { error }, mutation throw-a', async () => {
    const deps = makeDeps({
      invoke: vi.fn(async () => ({
        data: null,
        error: { message: 'Session mismatch' },
      })),
    });

    await expect(
      runFinishWorkout(
        { clientId: 'c1', sessionId: 'sess-A1' },
        deps,
      ),
    ).rejects.toThrow(/Session mismatch/);

    expect(deps.invoke).toHaveBeenCalledTimes(1);
  });
});
