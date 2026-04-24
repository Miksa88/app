// ============================================================================
// useUpdateClientOverrides tests
// ============================================================================
//
// Pattern: isti kao useStartPause.test.ts — testiramo pure orchestrator
// `runUpdateClientOverrides` bez React Query setup-a.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { runUpdateClientOverrides } from './useUpdateClientOverrides';
import type { UpdateClientOverridesDeps } from './useUpdateClientOverrides';

function makeDeps(
  override?: Partial<UpdateClientOverridesDeps>,
): UpdateClientOverridesDeps {
  return {
    invoke: vi.fn(async () => ({
      data: {
        ok: true,
        status: {
          clientId: 'c1',
          clientOverrides: ['hormonal_sync'],
        },
      },
      error: null,
    })),
    ...override,
  };
}

describe('runUpdateClientOverrides', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path — Edge Function vraca ok sa novim clientOverrides nizom', async () => {
    const deps = makeDeps();
    const result = await runUpdateClientOverrides(
      {
        clientId: 'c1',
        overrides: { hormonal_sync: 'disabled' },
      },
      deps,
    );

    expect(result.ok).toBe(true);
    expect(result.status.clientOverrides).toEqual(['hormonal_sync']);
    expect(deps.invoke).toHaveBeenCalledTimes(1);
    expect(deps.invoke).toHaveBeenCalledWith({
      clientId: 'c1',
      overrides: { hormonal_sync: 'disabled' },
    });
  });

  it('error path — non-trainer 403, mutation throw-a sa jasnom porukom', async () => {
    const deps = makeDeps({
      invoke: vi.fn(async () => ({
        data: {
          ok: false,
          error: 'Forbidden: caller is not a trainer',
        },
        error: null,
      })),
    });

    await expect(
      runUpdateClientOverrides(
        {
          clientId: 'c1',
          overrides: { hormonal_sync: 'disabled' },
        },
        deps,
      ),
    ).rejects.toThrow(/trainer/);
  });
});
