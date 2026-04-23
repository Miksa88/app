// ============================================================================
// workoutCompletion.test — pure helpers za IT-7
// ============================================================================
//
// Ne testira `advancePointerAfterCompletion` (već pokriveno u
// sessionResolver.test.ts) — samo `applyPostCompletionCounters` koji decrement-uje
// RFB countdown i illness penalty, mirroruje partitionLastSeen i postavlja
// pauseJustEnded flag kad illness istekne.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { applyPostCompletionCounters } from './workoutCompletion';
import type { UserStatusTraining } from '@/types/userStatus';
import type { MesocycleQueue, QueuedSession } from '@/types/training';

// ----------------------------------------------------------------------------
// Fixtures — minimal valid training slice, fokus na polja koja helper dira.
// Queue je SIMULIRAN kao "već advancovan": pointer je već napredovao, poslednja
// completed sesija je session[oldPointer] (ali to helper ne vidi, samo treba
// da zna `completedPartition` argument).
// ----------------------------------------------------------------------------

function makeQueue(overrides: Partial<MesocycleQueue> = {}): MesocycleQueue {
  const baseSessions: QueuedSession[] = [
    {
      sessionId: 'A1',
      label: 'Lower — Tension',
      dayType: 'Lower',
      partition: 'Lower',
      status: 'completed',
      scheduledDate: new Date('2026-04-20T00:00:00Z'),
      completedAt: new Date('2026-04-20T18:00:00Z'),
      actualWorkoutSessionId: null,
    },
    {
      sessionId: 'B1',
      label: 'Upper — Heavy',
      dayType: 'Upper',
      partition: 'Upper',
      status: 'next',
      scheduledDate: new Date('2026-04-22T00:00:00Z'),
      completedAt: null,
      actualWorkoutSessionId: null,
    },
  ];

  return {
    clientId: 'client-uuid',
    mesocycleIndex: 1,
    templateId: 'tpl-1',
    sessions: baseSessions,
    sessionPointer: 1,
    currentMicrocycleIndex: 0,
    swapUsedThisMicrocycle: false,
    partitionLastSeen: {
      Lower: { sessionId: 'A1', date: new Date('2026-04-20T18:00:00Z') },
    },
    returnFromBreakCountdown: {},
    createdAt: new Date('2026-04-15T00:00:00Z'),
    completedAt: null,
    ...overrides,
  };
}

function makeTraining(queue: MesocycleQueue, overrides: Partial<UserStatusTraining> = {}): UserStatusTraining {
  return {
    activeTemplateId: 'tpl-1',
    position: 'intermediate_4',
    daysPerWeek: 4,
    queue,
    sessionPointer: queue.sessionPointer,
    nextSessionId: 'B1',
    nextSessionPartition: 'Upper',
    partitionLastSeen: {
      Lower: { date: new Date('2026-04-20T18:00:00Z'), sessionId: 'A1' },
    },
    isInDeload: false,
    isInReturnFromBreak: false,
    currentMesocycleIndex: 1,
    currentMicrocycleIndex: queue.currentMicrocycleIndex,
    activePauseEvent: null,
    ...overrides,
  };
}

describe('applyPostCompletionCounters — IT-7', () => {
  it('normal completion: mirror partitionLastSeen, no counters aktivni, pauseJustEnded=false', () => {
    const queue = makeQueue({
      partitionLastSeen: {
        Lower: { sessionId: 'A1', date: new Date('2026-04-20T18:00:00Z') },
      },
    });
    const training = makeTraining(queue, {
      partitionLastSeen: {}, // stari UI mirror, helper treba da ga pune iz queue-a
    });

    const { training: out, pauseJustEnded } = applyPostCompletionCounters({
      training,
      completedPartition: 'Lower',
    });

    expect(pauseJustEnded).toBe(false);
    expect(out.partitionLastSeen.Lower).toBeDefined();
    expect(out.partitionLastSeen.Lower?.sessionId).toBe('A1');
    expect(out.partitionLastSeen.Lower?.date.toISOString())
      .toBe(new Date('2026-04-20T18:00:00Z').toISOString());
    // RFB nijedna particija aktivna → countdown ostaje 0, isInReturnFromBreak=false
    expect(out.queue.returnFromBreakCountdown.Lower).toBe(0);
    expect(out.isInReturnFromBreak).toBe(false);
    // Pause ostaje null
    expect(out.activePauseEvent).toBeNull();
    // Mirror pointer + microcycle iz queue-a
    expect(out.sessionPointer).toBe(queue.sessionPointer);
    expect(out.currentMicrocycleIndex).toBe(queue.currentMicrocycleIndex);
  });

  it('RFB aktivan za Lower: countdown 2 → 1 posle Lower completion, isInReturnFromBreak ostaje true', () => {
    const queue = makeQueue({
      returnFromBreakCountdown: { Lower: 2, Upper: 2 },
      partitionLastSeen: {
        Lower: { sessionId: 'A1', date: new Date('2026-04-20T18:00:00Z') },
      },
    });
    const training = makeTraining(queue, {
      isInReturnFromBreak: true,
    });

    const { training: out, pauseJustEnded } = applyPostCompletionCounters({
      training,
      completedPartition: 'Lower',
    });

    expect(pauseJustEnded).toBe(false);
    expect(out.queue.returnFromBreakCountdown.Lower).toBe(1);
    // Upper nije diran
    expect(out.queue.returnFromBreakCountdown.Upper).toBe(2);
    // Bilo koja > 0 → isInReturnFromBreak = true
    expect(out.isInReturnFromBreak).toBe(true);
  });

  it('RFB obe particije na 1: Lower completion → Lower=0, Upper=1, isInReturnFromBreak ostaje true', () => {
    const queue = makeQueue({
      returnFromBreakCountdown: { Lower: 1, Upper: 1 },
    });
    const training = makeTraining(queue, { isInReturnFromBreak: true });

    const { training: out } = applyPostCompletionCounters({
      training,
      completedPartition: 'Lower',
    });

    expect(out.queue.returnFromBreakCountdown.Lower).toBe(0);
    expect(out.queue.returnFromBreakCountdown.Upper).toBe(1);
    // Upper=1 > 0 → still in RFB
    expect(out.isInReturnFromBreak).toBe(true);
  });

  it('illness pauza aktivna, penalty 2 → 1: activePauseEvent ostaje non-null, pauseJustEnded=false', () => {
    const queue = makeQueue();
    const training = makeTraining(queue, {
      activePauseEvent: {
        type: 'illness',
        startDate: new Date('2026-04-18T00:00:00Z'),
        penaltySessionsRemaining: 2,
      },
    });

    const { training: out, pauseJustEnded } = applyPostCompletionCounters({
      training,
      completedPartition: 'Lower',
    });

    expect(pauseJustEnded).toBe(false);
    expect(out.activePauseEvent).not.toBeNull();
    expect(out.activePauseEvent?.type).toBe('illness');
    expect(out.activePauseEvent?.penaltySessionsRemaining).toBe(1);
  });

  it('illness pauza završava: penalty 1 → 0, activePauseEvent=null, pauseJustEnded=true', () => {
    const queue = makeQueue();
    const training = makeTraining(queue, {
      activePauseEvent: {
        type: 'illness',
        startDate: new Date('2026-04-18T00:00:00Z'),
        penaltySessionsRemaining: 1,
      },
    });

    const { training: out, pauseJustEnded } = applyPostCompletionCounters({
      training,
      completedPartition: 'Lower',
    });

    expect(pauseJustEnded).toBe(true);
    expect(out.activePauseEvent).toBeNull();
  });

  it('travel pauza (penalty=0): ne decrement-uje, pauseJustEnded=false', () => {
    const queue = makeQueue();
    const training = makeTraining(queue, {
      activePauseEvent: {
        type: 'travel',
        startDate: new Date('2026-04-18T00:00:00Z'),
        penaltySessionsRemaining: 0,
      },
    });

    const { training: out, pauseJustEnded } = applyPostCompletionCounters({
      training,
      completedPartition: 'Lower',
    });

    expect(pauseJustEnded).toBe(false);
    // Travel pauza ostaje aktivna (njeno gašenje je user-triggered, ne auto)
    expect(out.activePauseEvent).not.toBeNull();
    expect(out.activePauseEvent?.type).toBe('travel');
    expect(out.activePauseEvent?.penaltySessionsRemaining).toBe(0);
  });

  it('ne mutira ulaz (immutability)', () => {
    const queue = makeQueue({
      returnFromBreakCountdown: { Lower: 2 },
    });
    const training = makeTraining(queue, {
      activePauseEvent: {
        type: 'illness',
        startDate: new Date('2026-04-18T00:00:00Z'),
        penaltySessionsRemaining: 2,
      },
    });

    const originalCountdownLower = training.queue.returnFromBreakCountdown.Lower;
    const originalPenalty = training.activePauseEvent?.penaltySessionsRemaining;

    applyPostCompletionCounters({ training, completedPartition: 'Lower' });

    expect(training.queue.returnFromBreakCountdown.Lower).toBe(originalCountdownLower);
    expect(training.activePauseEvent?.penaltySessionsRemaining).toBe(originalPenalty);
  });
});
