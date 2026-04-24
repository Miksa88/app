import { describe, it, expect } from 'vitest';
import { isMetabolicNoise } from './metabolicNoise';

describe('isMetabolicNoise — Sync Rule 6 input (>10% strict)', () => {
  it('tačno 10% tečnih kcal / target → false (granica je striktno veća od)', () => {
    // 200 / 2000 = 10.000000% exactly
    expect(isMetabolicNoise(200, 2000)).toBe(false);
  });

  it('11% tečnih kcal / target → true (iznad granice)', () => {
    // 220 / 2000 = 11.0%
    expect(isMetabolicNoise(220, 2000)).toBe(true);
  });

  it('calorieTarget = 0 → false (guard: divide-by-zero, nekompletan profil)', () => {
    expect(isMetabolicNoise(500, 0)).toBe(false);
  });
});
