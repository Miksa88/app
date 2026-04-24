// ============================================================================
// useSwapNextSessions tests
// ============================================================================
//
// Testiramo `runSwapNextSessions` orchestrator direktno (isti pattern kao
// useFinishWorkout.test.ts / useDailyCheckIn.test.ts) — bez renderHook, jer
// React Query testing setup bi zahtevao QueryClientProvider wrapper. Pokriva
// dva glavna invarijanta:
//   1. Happy path — Edge Function vraca { ok: true, success: true }, mutation
//      resolve-uje sa payloadom.
//   2. Not-allowed error path — Edge Function vraca { error: 'reason' } kroz
//      SupabaseClient.functions.invoke, mutation throw-a sa tom porukom.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { runSwapNextSessions } from './useSwapNextSessions';
import type { SwapNextSessionsDeps } from './useSwapNextSessions';

function makeDeps(
  override?: Partial<SwapNextSessionsDeps>,
): SwapNextSessionsDeps {
  return {
    invoke: vi.fn(async () => ({
      data: {
        ok: true,
        success: true,
        newFirstSession: { sessionId: 'B1', partition: 'Upper' },
        status: { clientId: 'c1' },
      },
      error: null,
    })),
    ...override,
  };
}

describe('runSwapNextSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path — Edge Function vraca ok, mutation resolve-uje sa payloadom', async () => {
    const deps = makeDeps();
    const result = await runSwapNextSessions({ clientId: 'c1' }, deps);

    expect(result.ok).toBe(true);
    expect(result.success).toBe(true);
    expect(result.newFirstSession).toEqual({ sessionId: 'B1', partition: 'Upper' });
    expect(deps.invoke).toHaveBeenCalledTimes(1);
    expect(deps.invoke).toHaveBeenCalledWith({ clientId: 'c1' });
  });

  it('not-allowed error path — Edge Function vraca { error }, mutation throw-a', async () => {
    const deps = makeDeps({
      invoke: vi.fn(async () => ({
        data: null,
        error: { message: 'Vec si iskoristila swap u ovom krugu sesija.' },
      })),
    });

    await expect(
      runSwapNextSessions({ clientId: 'c1' }, deps),
    ).rejects.toThrow(/Vec si iskoristila swap/);

    expect(deps.invoke).toHaveBeenCalledTimes(1);
  });

  it('EF vraca { ok: false, error } body — mutation throw-a sa tom porukom', async () => {
    // EF moze vratiti 400 sa body-em umesto error objekta (supabase-js ponekad
    // vraca data sa 4xx response-om bez error field-a). Hook treba da
    // detektuje ok=false i throw-a.
    const deps = makeDeps({
      invoke: vi.fn(async () => ({
        data: { ok: false, error: 'Swap nije dostupan za Full Body splitove.' },
        error: null,
      })),
    });

    await expect(
      runSwapNextSessions({ clientId: 'c1' }, deps),
    ).rejects.toThrow(/Full Body/);
  });
});
