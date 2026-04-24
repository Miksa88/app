import { describe, it, expect } from 'vitest';
import {
  shouldStartDeload,
  handleMesocycleEnd,
  type MesocycleEndProfile,
} from './mesocycleLifecycle';
import { buildMesocycleQueue } from './queueBuilder';
import type { MesocycleQueue, SessionSkeleton, SkeletonDay } from '@/types/training';

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

const profile: MesocycleEndProfile = {
  experienceLevel: 'intermediate',
  daysPerWeek: 4,
  activeTemplateId: 'tpl-1',
};

function buildBaseQueue(startDate: Date = new Date('2026-04-20T00:00:00Z')): MesocycleQueue {
  return buildMesocycleQueue({
    clientId: 'c1',
    templateId: 'tpl-1',
    skeleton,
    mesocycleIndex: 1,
    startDate,
  });
}

describe('shouldStartDeload', () => {
  it('vraća shouldStart=true, reason=week_4_of_mesocycle kad je index poslednji', () => {
    const result = shouldStartDeload(3, 4, 'deficit');
    expect(result.shouldStart).toBe(true);
    expect(result.reason).toBe('week_4_of_mesocycle');
  });

  it('vraća shouldStart=false, reason=not_yet u prvoj nedelji novog mezo', () => {
    const result = shouldStartDeload(0, 4, 'deficit');
    expect(result.shouldStart).toBe(false);
    expect(result.reason).toBe('not_yet');
  });

  it('lean_bulk preskače deload — shouldStart=false, reason=lean_bulk_no_deload', () => {
    const result = shouldStartDeload(3, 4, 'lean_bulk');
    expect(result.shouldStart).toBe(false);
    expect(result.reason).toBe('lean_bulk_no_deload');
  });
});

describe('handleMesocycleEnd', () => {
  it('mid mezo (pointer < sessions.length): nema rollover, mesocycleJustEnded=false', () => {
    const queue = buildBaseQueue();
    // pointer=0 je default iz builder-a, 16 sesija ukupno
    expect(queue.sessionPointer).toBe(0);
    expect(queue.sessions.length).toBe(16);

    const result = handleMesocycleEnd(queue, profile, skeleton, 4);
    expect(result.mesocycleJustEnded).toBe(false);
    expect(result.newQueue).toBe(queue); // referenca identična → nije novi queue
  });

  it('kraj mezo (pointer >= sessions.length): novi queue 16 sesija, poslednje 4 su isDeloadWeek=true', () => {
    const queue = buildBaseQueue();
    const exhausted: MesocycleQueue = {
      ...queue,
      sessionPointer: queue.sessions.length,  // 16 → end
    };

    const result = handleMesocycleEnd(exhausted, profile, skeleton, 4);
    expect(result.mesocycleJustEnded).toBe(true);
    expect(result.newQueue.sessions).toHaveLength(16);

    // Poslednja 4 sesije (indexi 12–15) su deload week
    const deloadSessions = result.newQueue.sessions.slice(12);
    expect(deloadSessions.every(s => s.isDeloadWeek === true)).toBe(true);

    // Prvih 12 sesija NISU deload
    const nonDeloadSessions = result.newQueue.sessions.slice(0, 12);
    expect(nonDeloadSessions.every(s => !s.isDeloadWeek)).toBe(true);

    // Mesocycle index je inkrementovan
    expect(result.newQueue.mesocycleIndex).toBe(queue.mesocycleIndex + 1);

    // Pointer je resetovan
    expect(result.newQueue.sessionPointer).toBe(0);
  });
});
