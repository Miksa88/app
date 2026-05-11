import { describe, it, expect } from 'vitest';
import { computeWeightTrend, type WeightLogEntry } from './weightTrend';

const NOW = new Date('2026-05-08T12:00:00Z');
const days = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function log(daysAgo: number, weight: number): WeightLogEntry {
  return { loggedAt: days(daysAgo), weightKg: weight };
}

describe('computeWeightTrend', () => {
  it('Manje od 2 unosa → null', () => {
    expect(computeWeightTrend([], NOW).weightChangePctLast7Days).toBeNull();
    expect(computeWeightTrend([log(1, 65)], NOW).weightChangePctLast7Days).toBeNull();
  });

  it('Nedostaje prethodna nedelja → null', () => {
    const r = computeWeightTrend([log(1, 65), log(3, 64.8)], NOW);
    expect(r.weightChangePctLast7Days).toBeNull();
  });

  it('Vaga +1% → +1.00', () => {
    const logs: WeightLogEntry[] = [
      log(1, 65.65), log(3, 65.65), log(5, 65.65),  // current avg 65.65
      log(8, 65),    log(10, 65),   log(12, 65),    // prev avg 65
    ];
    const r = computeWeightTrend(logs, NOW);
    expect(r.weightChangePctLast7Days).toBeCloseTo(1.0, 2);
  });

  it('Vaga -0.5% → -0.5%', () => {
    const logs: WeightLogEntry[] = [
      log(1, 64.675), log(3, 64.675),  // current avg 64.675
      log(8, 65), log(10, 65),         // prev avg 65
    ];
    const r = computeWeightTrend(logs, NOW);
    expect(r.weightChangePctLast7Days).toBeCloseTo(-0.5, 1);
  });

  it('Logovi stariji od 14 dana ignorisani', () => {
    const logs: WeightLogEntry[] = [
      log(2, 65),
      log(9, 65),
      log(20, 50),  // ignore
    ];
    const r = computeWeightTrend(logs, NOW);
    expect(r.weightChangePctLast7Days).toBeCloseTo(0, 1);
    expect(r.previousWeekAvg).toBe(65);
  });
});
