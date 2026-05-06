import { describe, it, expect } from 'vitest';
import {
  calcDecay,
  nextCountdownAfterSession,
  RETURN_FROM_BREAK_INITIAL_COUNTDOWN,
} from './decayCalculator';

const today = new Date('2026-04-19T12:00:00Z');
const daysAgo = (n: number) => new Date(today.getTime() - n * 86400_000);

describe('calcDecay — zone (Sekcija 7.5 spec-a 01)', () => {
  it('prvi trening particije (no last seen) → PROGRESS', () => {
    const r = calcDecay({
      partition: 'Lower',
      partitionLastSeen: undefined,
      today,
      returnFromBreakCountdown: 0,
    });
    expect(r.loadingMode).toBe('PROGRESS');
    expect(r.daysSince).toBeNull();
    expect(r.shouldActivateReturnFromBreak).toBe(false);
  });

  it('0–3 dana → PROGRESS', () => {
    [0, 1, 2, 3].forEach(d => {
      const r = calcDecay({
        partition: 'Lower',
        partitionLastSeen: { date: daysAgo(d), sessionId: 'A1' },
        today,
        returnFromBreakCountdown: 0,
      });
      expect(r.loadingMode).toBe('PROGRESS');
      expect(r.shouldActivateReturnFromBreak).toBe(false);
    });
  });

  it('4–7 dana → MAINTAIN', () => {
    [4, 5, 6, 7].forEach(d => {
      const r = calcDecay({
        partition: 'Lower',
        partitionLastSeen: { date: daysAgo(d), sessionId: 'A1' },
        today,
        returnFromBreakCountdown: 0,
      });
      expect(r.loadingMode).toBe('MAINTAIN');
      expect(r.shouldActivateReturnFromBreak).toBe(false);
    });
  });

  it('8+ dana → MINI_DELOAD i aktivira Return from Break', () => {
    [8, 10, 14, 21].forEach(d => {
      const r = calcDecay({
        partition: 'Lower',
        partitionLastSeen: { date: daysAgo(d), sessionId: 'A1' },
        today,
        returnFromBreakCountdown: 0,
      });
      expect(r.loadingMode).toBe('MINI_DELOAD');
      expect(r.shouldActivateReturnFromBreak).toBe(true);
      expect(r.daysSince).toBe(d);
    });
  });
});

describe('calcDecay — Return from Break countdown override', () => {
  it('countdown > 0 nakon kratke pauze → MINI_DELOAD ostaje (nastavlja protokol)', () => {
    // Klijentkinja je posle pauze odradila 1 sesiju (countdown 2→1), sad dolazi
    // posle samo 2 dana — bez override-a bi bio PROGRESS, ali countdown ga drzi
    const r = calcDecay({
      partition: 'Lower',
      partitionLastSeen: { date: daysAgo(2), sessionId: 'A3' },
      today,
      returnFromBreakCountdown: 1,
    });
    expect(r.loadingMode).toBe('MINI_DELOAD');
    expect(r.shouldActivateReturnFromBreak).toBe(false);  // ne aktivira ponovo
  });

  it('countdown = 0 i 2 dana → standardno PROGRESS', () => {
    const r = calcDecay({
      partition: 'Lower',
      partitionLastSeen: { date: daysAgo(2), sessionId: 'A3' },
      today,
      returnFromBreakCountdown: 0,
    });
    expect(r.loadingMode).toBe('PROGRESS');
  });
});

describe('nextCountdownAfterSession', () => {
  it('decrement', () => {
    expect(nextCountdownAfterSession(2)).toBe(1);
    expect(nextCountdownAfterSession(1)).toBe(0);
  });

  it('ne ide ispod 0', () => {
    expect(nextCountdownAfterSession(0)).toBe(0);
  });
});

describe('RETURN_FROM_BREAK_INITIAL_COUNTDOWN', () => {
  it('je 2 sesije (Sekcija 7.5)', () => {
    expect(RETURN_FROM_BREAK_INITIAL_COUNTDOWN).toBe(2);
  });
});
