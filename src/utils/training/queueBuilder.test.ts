import { describe, it, expect } from 'vitest';
import { buildMesocycleQueue } from './queueBuilder';
import type { SessionSkeleton, SkeletonDay } from '@/types/training';

function makeDay(
  dayIndex: number,
  dayType: SkeletonDay['dayType'],
  dayRole?: SkeletonDay['dayRole'],
): SkeletonDay {
  return {
    dayIndex,
    dayType,
    dayRole,
    defaultRepRangeZone: 'hypertrophy',
    targetRIR: 2,
    exerciseSlots: [],
  };
}

describe('buildMesocycleQueue — U/L 4× nedeljno (intermediate_4)', () => {
  const skeleton: SessionSkeleton = {
    id: 'INT_UL_4',
    level: 'intermediate',
    daysPerWeek: 4,
    name: 'Intermediate U/L 4×',
    periodizationType: 'undulating',
    days: [
      makeDay(1, 'Lower', 'Tension'),
      makeDay(2, 'Upper', 'Heavy'),
      makeDay(3, 'Rest'),
      makeDay(4, 'Lower', 'Pump'),
      makeDay(5, 'Upper', 'Light'),
      makeDay(6, 'Rest'),
      makeDay(7, 'Rest'),
    ],
  };

  const startDate = new Date('2026-04-20T00:00:00Z');

  it('generise 4 sesije × 7 nedelja = 28 sesija (pocetnici.md §2.1: 6 load + 1 deload)', () => {
    const queue = buildMesocycleQueue({
      clientId: 'c1',
      templateId: 'tpl-1',
      skeleton,
      mesocycleIndex: 1,
      startDate,
    });
    expect(queue.sessions).toHaveLength(28);
  });

  it('preskace Rest dane (nema "Rest" QueuedSession)', () => {
    const queue = buildMesocycleQueue({
      clientId: 'c1',
      templateId: 'tpl-1',
      skeleton,
      mesocycleIndex: 1,
      startDate,
    });
    expect(queue.sessions.every(s => s.dayType !== 'Rest')).toBe(true);
  });

  it('sessionId pattern A1, B1, C1, D1, A2, B2, ...', () => {
    const queue = buildMesocycleQueue({
      clientId: 'c1',
      templateId: 'tpl-1',
      skeleton,
      mesocycleIndex: 1,
      startDate,
    });
    expect(queue.sessions.slice(0, 8).map(s => s.sessionId)).toEqual([
      'A1', 'B1', 'C1', 'D1',
      'A2', 'B2', 'C2', 'D2',
    ]);
  });

  it('partition mapping: Lower→Lower, Upper→Upper', () => {
    const queue = buildMesocycleQueue({
      clientId: 'c1',
      templateId: 'tpl-1',
      skeleton,
      mesocycleIndex: 1,
      startDate,
    });
    expect(queue.sessions[0].partition).toBe('Lower');   // Lower Tension
    expect(queue.sessions[1].partition).toBe('Upper');   // Upper Heavy
  });

  it('prva sesija ima status="next", ostale "pending"', () => {
    const queue = buildMesocycleQueue({
      clientId: 'c1',
      templateId: 'tpl-1',
      skeleton,
      mesocycleIndex: 1,
      startDate,
    });
    expect(queue.sessions[0].status).toBe('next');
    expect(queue.sessions.slice(1).every(s => s.status === 'pending')).toBe(true);
  });

  it('label kombinuje partition + dayRole', () => {
    const queue = buildMesocycleQueue({
      clientId: 'c1',
      templateId: 'tpl-1',
      skeleton,
      mesocycleIndex: 1,
      startDate,
    });
    expect(queue.sessions[0].label).toBe('Lower — Tension');
    expect(queue.sessions[1].label).toBe('Upper — Heavy');
  });

  it('pointer = 0, currentMicrocycleIndex = 0, swap nije iskoriscen', () => {
    const queue = buildMesocycleQueue({
      clientId: 'c1',
      templateId: 'tpl-1',
      skeleton,
      mesocycleIndex: 1,
      startDate,
    });
    expect(queue.sessionPointer).toBe(0);
    expect(queue.currentMicrocycleIndex).toBe(0);
    expect(queue.swapUsedThisMicrocycle).toBe(false);
  });
});

describe('buildMesocycleQueue — Full Body 3× (beginner_3)', () => {
  const skeleton: SessionSkeleton = {
    id: 'BEG_FB_3',
    level: 'beginner',
    daysPerWeek: 3,
    name: 'Beginner Full Body 3×',
    periodizationType: 'linear',
    days: [
      makeDay(1, 'FullBody'),
      makeDay(2, 'Rest'),
      makeDay(3, 'FullBody'),
      makeDay(4, 'Rest'),
      makeDay(5, 'FullBody'),
      makeDay(6, 'Rest'),
      makeDay(7, 'Rest'),
    ],
  };

  it('generise 3 × 7 = 21 FullBody sesija (pocetnici.md)', () => {
    const queue = buildMesocycleQueue({
      clientId: 'c1',
      templateId: 'tpl-1',
      skeleton,
      mesocycleIndex: 1,
      startDate: new Date('2026-04-20T00:00:00Z'),
    });
    expect(queue.sessions).toHaveLength(21);
    expect(queue.sessions.every(s => s.partition === 'FullBody')).toBe(true);
  });
});

describe('buildMesocycleQueue — error cases', () => {
  it('throw ako nema training dana (sve Rest)', () => {
    const skeleton: SessionSkeleton = {
      id: 'BAD',
      level: 'beginner',
      daysPerWeek: 3,
      name: 'Bad',
      periodizationType: 'linear',
      days: [makeDay(1, 'Rest'), makeDay(2, 'Rest')],
    };
    expect(() => buildMesocycleQueue({
      clientId: 'c1',
      templateId: 'tpl-1',
      skeleton,
      mesocycleIndex: 1,
      startDate: new Date(),
    })).toThrow();
  });

  it('respektuje custom weeksInMesocycle', () => {
    const skeleton: SessionSkeleton = {
      id: 'INT_UL_2',
      level: 'intermediate',
      daysPerWeek: 2,
      name: 'INT',
      periodizationType: 'undulating',
      days: [
        makeDay(1, 'Lower'),
        makeDay(2, 'Upper'),
        makeDay(3, 'Rest'),
        makeDay(4, 'Rest'),
        makeDay(5, 'Rest'),
        makeDay(6, 'Rest'),
        makeDay(7, 'Rest'),
      ],
    };
    const queue = buildMesocycleQueue({
      clientId: 'c1',
      templateId: 'tpl-1',
      skeleton,
      mesocycleIndex: 1,
      startDate: new Date(),
      weeksInMesocycle: 6,
    });
    expect(queue.sessions).toHaveLength(12);  // 2 × 6
  });

  it('validateSkeleton: throw za <7 dana skeleton', () => {
    const skeleton: SessionSkeleton = {
      id: 'BAD_5_DAYS',
      level: 'beginner',
      daysPerWeek: 3,
      name: 'BAD',
      periodizationType: 'linear',
      days: [
        makeDay(1, 'FullBody'),
        makeDay(2, 'Rest'),
        makeDay(3, 'FullBody'),
        makeDay(4, 'Rest'),
        makeDay(5, 'FullBody'),
      ],
    };
    expect(() => buildMesocycleQueue({
      clientId: 'c1',
      templateId: 'tpl-1',
      skeleton,
      mesocycleIndex: 1,
      startDate: new Date(),
    })).toThrow(/mora imati tačno 7 dana/);
  });

  it('validateSkeleton: throw kad daysPerWeek != broj non-Rest dana', () => {
    const skeleton: SessionSkeleton = {
      id: 'BAD_MISMATCH',
      level: 'beginner',
      daysPerWeek: 5,  // ali samo 3 non-Rest
      name: 'BAD',
      periodizationType: 'linear',
      days: [
        makeDay(1, 'FullBody'),
        makeDay(2, 'Rest'),
        makeDay(3, 'FullBody'),
        makeDay(4, 'Rest'),
        makeDay(5, 'FullBody'),
        makeDay(6, 'Rest'),
        makeDay(7, 'Rest'),
      ],
    };
    expect(() => buildMesocycleQueue({
      clientId: 'c1',
      templateId: 'tpl-1',
      skeleton,
      mesocycleIndex: 1,
      startDate: new Date(),
    })).toThrow(/daysPerWeek=5/);
  });
});
