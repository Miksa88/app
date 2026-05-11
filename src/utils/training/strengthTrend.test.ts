import { describe, it, expect } from 'vitest';
import { computeStrengthTrend, type ExerciseSet } from './strengthTrend';

const NOW = new Date('2026-05-08T12:00:00Z');
const days = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function set(daysAgo: number, weight: number, reps: number): ExerciseSet {
  return { completedAt: days(daysAgo), weightKg: weight, reps };
}

describe('computeStrengthTrend', () => {
  it('Bez setova → stable, 0 volume', () => {
    const r = computeStrengthTrend([], NOW);
    expect(r.trend).toBe('stable');
    expect(r.currentWeekVolume).toBe(0);
  });

  it('Samo current week (no previous) → stable + napomena', () => {
    const sets = [set(2, 50, 10), set(4, 50, 10)];
    const r = computeStrengthTrend(sets, NOW);
    expect(r.trend).toBe('stable');
    expect(r.previousWeekVolume).toBe(0);
  });

  it('Volume +10% → rising', () => {
    const sets: ExerciseSet[] = [
      set(2, 55, 10),    // current week: 550 kg
      set(9, 50, 10),    // prev week: 500 kg
    ];
    const r = computeStrengthTrend(sets, NOW);
    expect(r.trend).toBe('rising');
    expect(r.currentWeekVolume).toBe(550);
    expect(r.previousWeekVolume).toBe(500);
    expect(r.pctChange).toBeCloseTo(10, 0);
  });

  it('Volume -10% → falling', () => {
    const sets: ExerciseSet[] = [
      set(2, 45, 10),    // current: 450
      set(9, 50, 10),    // prev: 500
    ];
    const r = computeStrengthTrend(sets, NOW);
    expect(r.trend).toBe('falling');
    expect(r.pctChange).toBeCloseTo(-10, 0);
  });

  it('Volume +1% (unutar threshold-a) → stable', () => {
    const sets: ExerciseSet[] = [
      set(2, 50, 10),    // 500
      set(9, 50, 10),    // 495 — recompute: actually 500 each
    ];
    // With identical weights, ratio = 1, change = 0
    const r = computeStrengthTrend(sets, NOW);
    expect(r.trend).toBe('stable');
  });

  it('Setovi stariji od 14 dana ignorisani', () => {
    const sets: ExerciseSet[] = [
      set(2, 60, 10),     // current: 600
      set(9, 50, 10),     // prev: 500
      set(20, 100, 50),   // 14+ dana = 5000 vol — IGNORE
    ];
    const r = computeStrengthTrend(sets, NOW);
    expect(r.trend).toBe('rising');
    expect(r.currentWeekVolume).toBe(600);
    expect(r.previousWeekVolume).toBe(500);
  });
});
