// ============================================================================
// useWeeklyCheckIn tests (IT-17)
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { runWeeklyCheckIn } from './useWeeklyCheckIn';
import type { WeeklyCheckInDeps } from './useWeeklyCheckIn';

function makeDeps(
  override?: Partial<WeeklyCheckInDeps>,
): WeeklyCheckInDeps {
  return {
    invoke: vi.fn(async () => ({
      data: {
        ok: true,
        weeklyRow: {
          id: 'w-1',
          week_start_date: '2026-04-20',
          weight_avg_kg: 62.4,
        },
        status: {
          clientId: 'c1',
          bio: { weeklyWeightDelta: -0.5 },
          nutrition: { currentCalorieTarget: 1800, targetMode: 'deficit' },
          redFlags: { daysSinceLastWeeklyCheckIn: 0 },
        },
        trendline: {
          newCalorieTarget: 1800,
          action: 'status_quo',
          reason: 'within_expected_range',
        },
        weeklyWeightDelta: -0.5,
      },
      error: null,
    })),
    ...override,
  };
}

describe('runWeeklyCheckIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('happy path — EF vraca ok, orchestrator vraca payload', async () => {
    const deps = makeDeps();
    const result = await runWeeklyCheckIn(
      {
        clientId: 'c1',
        weekStartDate: '2026-04-20',
        weightAvgKg: 62.4,
        energyAvg: 7,
        identityScore: 4,
      },
      deps,
    );

    expect(result.ok).toBe(true);
    expect(result.trendline.action).toBe('status_quo');
    expect(deps.invoke).toHaveBeenCalledTimes(1);
    expect(deps.invoke).toHaveBeenCalledWith({
      clientId: 'c1',
      weekStartDate: '2026-04-20',
      weightAvgKg: 62.4,
      energyAvg: 7,
      identityScore: 4,
    });
  });

  it('409 konflikt — vec popunjena ista nedelja → throw', async () => {
    const deps = makeDeps({
      invoke: vi.fn(async () => ({
        data: {
          ok: false,
          error: 'Već si popunila ovu nedelju.',
        },
        error: null,
      })),
    });

    await expect(
      runWeeklyCheckIn(
        {
          clientId: 'c1',
          weekStartDate: '2026-04-20',
          weightAvgKg: 62.4,
          energyAvg: 7,
          identityScore: 4,
        },
        deps,
      ),
    ).rejects.toThrow(/popunila ovu nedelju/i);
  });

  it('error path — supabase invoke error → throw sa poruke', async () => {
    const deps = makeDeps({
      invoke: vi.fn(async () => ({
        data: null,
        error: { message: 'network timeout' },
      })),
    });

    await expect(
      runWeeklyCheckIn(
        {
          clientId: 'c1',
          weekStartDate: '2026-04-20',
          weightAvgKg: 62.4,
          energyAvg: 7,
          identityScore: 4,
        },
        deps,
      ),
    ).rejects.toThrow(/network timeout/);
  });
});
