import { describe, it, expect } from 'vitest';
import { calcCycleDay, getCyclePhase, getModifiersForPhase, isCyclePhaseActive } from './cyclePhase';

describe('calcCycleDay', () => {
  it('isti dan = day 1', () => {
    const start = new Date('2026-04-19T00:00:00Z');
    const today = new Date('2026-04-19T12:00:00Z');
    expect(calcCycleDay(start, today)).toBe(1);
  });

  it('5 dana posle = day 6', () => {
    const start = new Date('2026-04-14T00:00:00Z');
    const today = new Date('2026-04-19T00:00:00Z');
    expect(calcCycleDay(start, today)).toBe(6);
  });

  it('14 dana posle = day 15', () => {
    const start = new Date('2026-04-05T00:00:00Z');
    const today = new Date('2026-04-19T00:00:00Z');
    expect(calcCycleDay(start, today)).toBe(15);
  });

  it('budućnost — vraća null', () => {
    const start = new Date('2026-04-25T00:00:00Z');
    const today = new Date('2026-04-19T00:00:00Z');
    expect(calcCycleDay(start, today)).toBeNull();
  });

  it('preko 35 dana = preskočen ciklus, vraća null', () => {
    const start = new Date('2026-03-01T00:00:00Z');
    const today = new Date('2026-04-19T00:00:00Z');
    expect(calcCycleDay(start, today)).toBeNull();
  });
});

describe('getCyclePhase — 4-fazni model (Sekcija 2.2 spec-a 02)', () => {
  it('dan 1–5 = menstrual', () => {
    [1, 2, 3, 4, 5].forEach(d => expect(getCyclePhase(d)).toBe('menstrual'));
  });

  it('dan 6–13 = follicular', () => {
    [6, 7, 10, 13].forEach(d => expect(getCyclePhase(d)).toBe('follicular'));
  });

  it('dan 14 = ovulation (jedan jedini dan)', () => {
    expect(getCyclePhase(14)).toBe('ovulation');
  });

  it('dan 15+ = luteal (ukljucujuci sve do 35)', () => {
    [15, 21, 28, 32].forEach(d => expect(getCyclePhase(d)).toBe('luteal'));
  });
});

describe('getModifiersForPhase', () => {
  it('luteal aktivira carb bonus', () => {
    expect(getModifiersForPhase('luteal')).toContain('luteal_phase_carb_bonus');
  });

  it('menstrual flag-uje weight kao nepouzdan', () => {
    expect(getModifiersForPhase('menstrual')).toContain('weight_data_unreliable');
  });

  it('follicular i ovulation nemaju aktivne modifikatore (default scena)', () => {
    expect(getModifiersForPhase('follicular')).toEqual([]);
    expect(getModifiersForPhase('ovulation')).toEqual([]);
  });
});

describe('isCyclePhaseActive — convenience', () => {
  it('vraca true samo za eksaktan match', () => {
    expect(isCyclePhaseActive('luteal', 'luteal')).toBe(true);
    expect(isCyclePhaseActive('menstrual', 'luteal')).toBe(false);
    expect(isCyclePhaseActive(null, 'luteal')).toBe(false);
  });
});
