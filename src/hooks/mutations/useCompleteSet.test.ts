// ============================================================================
// useCompleteSet tests
// ============================================================================
//
// Testiramo `runCompleteSet` orchestrator direktno (bez renderHook). Dva
// glavna invarijanta:
//   1. Happy path — insert uspesno vraca red, mutation resolve-uje red.
//   2. RLS error — Supabase vraca { error: { code: '42501' } }, mutation
//      throw-a.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { runCompleteSet } from './useCompleteSet';
import type { CompleteSetDeps, CompletedSetRow } from './useCompleteSet';

function makeRow(): CompletedSetRow {
  return {
    id: 'row-1',
    user_id: 'user-a',
    exercise_id: 'exer-1',
    workout_session_id: null,
    set_number: 1,
    weight_kg: 50,
    reps: 8,
    rir: 2,
    completed_at: '2026-04-23T12:00:00Z',
    created_at: '2026-04-23T12:00:00Z',
  };
}

function makeDeps(override?: Partial<CompleteSetDeps>): CompleteSetDeps {
  return {
    insertSet: vi.fn(async () => ({ data: makeRow(), error: null })),
    ...override,
  };
}

describe('runCompleteSet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path — insert uspesno, mutation vraca red sa normalizovanim poljima', async () => {
    const deps = makeDeps();
    const result = await runCompleteSet(
      {
        userId: 'user-a',
        exerciseId: 'exer-1',
        setNumber: 1,
        weightKg: 50,
        reps: 8,
        rir: 2,
      },
      deps,
    );

    expect(result.id).toBe('row-1');
    expect(result.weight_kg).toBe(50);
    expect(result.reps).toBe(8);
    expect(deps.insertSet).toHaveBeenCalledWith({
      user_id: 'user-a',
      exercise_id: 'exer-1',
      workout_session_id: null,
      set_number: 1,
      weight_kg: 50,
      reps: 8,
      rir: 2,
    });
  });

  it('RLS error (code 42501) — mutation throw-a sa describing message-om', async () => {
    const deps = makeDeps({
      insertSet: vi.fn(async () => ({
        data: null,
        error: { code: '42501', message: 'row-level security policy violation' },
      })),
    });

    await expect(
      runCompleteSet(
        {
          userId: 'user-a',
          exerciseId: 'exer-1',
          setNumber: 1,
          weightKg: 50,
          reps: 8,
        },
        deps,
      ),
    ).rejects.toThrow(/42501/);
  });
});
