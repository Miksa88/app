// ============================================================================
// useEndPause tests
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { runEndPause } from './useEndPause';
import type { EndPauseDeps } from './useEndPause';

function makeDeps(
  override?: Partial<EndPauseDeps>,
): EndPauseDeps {
  return {
    invoke: vi.fn(async () => ({
      data: {
        ok: true,
        status: {
          clientId: 'c1',
          training: {
            activePauseEvent: null,
          },
        },
        endedPauseEvent: {
          id: 'pause-1',
          is_active: false,
          end_date: '2026-04-25',
        },
      },
      error: null,
    })),
    ...override,
  };
}

describe('runEndPause', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path — Edge Function vraca ok, mutation resolve-uje', async () => {
    const deps = makeDeps();
    const result = await runEndPause({ clientId: 'c1' }, deps);

    expect(result.ok).toBe(true);
    expect(deps.invoke).toHaveBeenCalledTimes(1);
    expect(deps.invoke).toHaveBeenCalledWith({
      clientId: 'c1',
      endDate: undefined,
    });
  });

  it('error path — Edge Function vraca "nema aktivne pauze", mutation throw-a', async () => {
    const deps = makeDeps({
      invoke: vi.fn(async () => ({
        data: {
          ok: false,
          error: 'Nema aktivne pauze za zavrsiti.',
        },
        error: null,
      })),
    });

    await expect(
      runEndPause({ clientId: 'c1' }, deps),
    ).rejects.toThrow(/Nema aktivne pauze/);
  });
});
