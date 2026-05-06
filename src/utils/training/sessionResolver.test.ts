import { describe, it, expect } from 'vitest';
import {
  resolveNextSession,
  hasMesocycleEnded,
  advancePointerAfterCompletion,
  canSwapNextTwoSessions,
  swapNextTwoSessions,
  detectAndShiftMissedSessions,
} from './sessionResolver';
import type { MesocycleQueue, QueuedSession, Partition, DayType } from '@/types/training';

function makeSession(
  id: string,
  partition: Partition,
  dayType: DayType,
  status: QueuedSession['status'] = 'pending',
): QueuedSession {
  return {
    sessionId: id,
    label: `${partition} session`,
    dayType,
    partition,
    status,
    scheduledDate: new Date('2026-04-19T00:00:00Z'),
    completedAt: null,
    actualWorkoutSessionId: null,
  };
}

function makeQueue(sessions: QueuedSession[], pointer = 0): MesocycleQueue {
  return {
    clientId: 'test',
    mesocycleIndex: 1,
    templateId: 'tpl-1',
    sessions: sessions.map((s, i) => ({
      ...s,
      status: i === pointer ? 'next' : (i < pointer ? 'completed' : 'pending'),
    })),
    sessionPointer: pointer,
    currentMicrocycleIndex: 0,
    swapUsedThisMicrocycle: false,
    partitionLastSeen: {},
    returnFromBreakCountdown: {},
    createdAt: new Date(),
    completedAt: null,
  };
}

describe('resolveNextSession', () => {
  it('vraca sesiju na koju pointer pokazuje', () => {
    const queue = makeQueue([
      makeSession('A1', 'Lower', 'Lower'),
      makeSession('B1', 'Upper', 'Upper'),
    ], 1);
    expect(resolveNextSession(queue)?.sessionId).toBe('B1');
  });

  it('vraca null ako je mezociklus zavrsen', () => {
    const queue = makeQueue([makeSession('A1', 'Lower', 'Lower')], 1);
    expect(resolveNextSession(queue)).toBeNull();
  });
});

describe('hasMesocycleEnded', () => {
  it('true kad pointer >= length', () => {
    const queue = makeQueue([makeSession('A1', 'Lower', 'Lower')], 1);
    expect(hasMesocycleEnded(queue)).toBe(true);
  });

  it('false kad ima jos sesija', () => {
    const queue = makeQueue([
      makeSession('A1', 'Lower', 'Lower'),
      makeSession('B1', 'Upper', 'Upper'),
    ], 0);
    expect(hasMesocycleEnded(queue)).toBe(false);
  });
});

describe('advancePointerAfterCompletion', () => {
  const today = new Date('2026-04-19T12:00:00Z');

  it('napreduje pointer i markira sesiju kao completed', () => {
    const queue = makeQueue([
      makeSession('A1', 'Lower', 'Lower'),
      makeSession('B1', 'Upper', 'Upper'),
    ], 0);
    const { queue: newQ } = advancePointerAfterCompletion(queue, today);

    expect(newQ.sessionPointer).toBe(1);
    expect(newQ.sessions[0].status).toBe('completed');
    expect(newQ.sessions[0].completedAt).toEqual(today);
    expect(newQ.sessions[1].status).toBe('next');
  });

  it('updatuje partitionLastSeen za zavrsenu particiju', () => {
    const queue = makeQueue([
      makeSession('A1', 'Lower', 'Lower'),
      makeSession('B1', 'Upper', 'Upper'),
    ], 0);
    const { queue: newQ } = advancePointerAfterCompletion(queue, today);

    expect(newQ.partitionLastSeen.Lower).toEqual({ sessionId: 'A1', date: today });
    expect(newQ.partitionLastSeen.Upper).toBeUndefined();
  });

  it('detektuje microcycle completion (2-sesijski U/L pattern)', () => {
    const queue = makeQueue([
      makeSession('A1', 'Lower', 'Lower'),
      makeSession('B1', 'Upper', 'Upper'),
      makeSession('A2', 'Lower', 'Lower'),
      makeSession('B2', 'Upper', 'Upper'),
    ], 1);  // pointer na B1

    const { queue: newQ, microcycleCompleted } = advancePointerAfterCompletion(queue, today);
    expect(microcycleCompleted).toBe(true);
    expect(newQ.currentMicrocycleIndex).toBe(1);
    expect(newQ.swapUsedThisMicrocycle).toBe(false);  // reset
  });

  it('NE detektuje completion mid-microcycle', () => {
    const queue = makeQueue([
      makeSession('A1', 'Lower', 'Lower'),
      makeSession('B1', 'Upper', 'Upper'),
      makeSession('A2', 'Lower', 'Lower'),
    ], 0);
    const { microcycleCompleted } = advancePointerAfterCompletion(queue, today);
    expect(microcycleCompleted).toBe(false);
  });

  it('throw ako je queue vec zavrsen', () => {
    const queue = makeQueue([makeSession('A1', 'Lower', 'Lower')], 1);
    expect(() => advancePointerAfterCompletion(queue, today)).toThrow();
  });
});

describe('canSwapNextTwoSessions', () => {
  it('dozvoljava U/L swap', () => {
    const queue = makeQueue([
      makeSession('A1', 'Lower', 'Lower'),
      makeSession('B1', 'Upper', 'Upper'),
    ], 0);
    expect(canSwapNextTwoSessions(queue).allowed).toBe(true);
  });

  it('blokira ako je swap vec iskoriscen u mikrociklusu', () => {
    const queue: MesocycleQueue = {
      ...makeQueue([
        makeSession('A1', 'Lower', 'Lower'),
        makeSession('B1', 'Upper', 'Upper'),
      ], 0),
      swapUsedThisMicrocycle: true,
    };
    const r = canSwapNextTwoSessions(queue);
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/iskoristila/i);
  });

  it('blokira ako su dve iste particije', () => {
    const queue = makeQueue([
      makeSession('A1', 'Lower', 'Lower'),
      makeSession('A2', 'Lower', 'Lower'),
    ], 0);
    expect(canSwapNextTwoSessions(queue).allowed).toBe(false);
  });

  it('blokira Full Body splitove', () => {
    const queue = makeQueue([
      makeSession('A1', 'FullBody', 'FullBody'),
      makeSession('B1', 'FullBody', 'FullBody'),
    ], 0);
    expect(canSwapNextTwoSessions(queue).allowed).toBe(false);
  });

  it('blokira ako nema sledece sesije', () => {
    const queue = makeQueue([makeSession('A1', 'Lower', 'Lower')], 0);
    expect(canSwapNextTwoSessions(queue).allowed).toBe(false);
  });
});

describe('swapNextTwoSessions', () => {
  it('zamenjuje pointer i pointer+1', () => {
    const queue = makeQueue([
      makeSession('A1', 'Lower', 'Lower'),
      makeSession('B1', 'Upper', 'Upper'),
    ], 0);
    const newQ = swapNextTwoSessions(queue);
    expect(newQ.sessions[0].sessionId).toBe('B1');
    expect(newQ.sessions[1].sessionId).toBe('A1');
    expect(newQ.swapUsedThisMicrocycle).toBe(true);
  });

  it('throw ako swap nije dozvoljen', () => {
    const queue: MesocycleQueue = {
      ...makeQueue([
        makeSession('A1', 'Lower', 'Lower'),
        makeSession('B1', 'Upper', 'Upper'),
      ], 0),
      swapUsedThisMicrocycle: true,
    };
    expect(() => swapNextTwoSessions(queue)).toThrow();
  });

  it('swap zadrzava kalendarske slotove — sessionId menja red, datum ne', () => {
    const queue = makeQueue([
      { ...makeSession('A1', 'Lower', 'Lower'), scheduledDate: new Date(2026, 3, 20) },
      { ...makeSession('B1', 'Upper', 'Upper'), scheduledDate: new Date(2026, 3, 21) },
    ], 0);
    const newQ = swapNextTwoSessions(queue);
    // Kalendarski redosled ostaje Pon/Uto; SessionId je zamenjen
    expect(newQ.sessions[0].sessionId).toBe('B1');
    expect(newQ.sessions[0].scheduledDate.getDate()).toBe(20);
    expect(newQ.sessions[1].sessionId).toBe('A1');
    expect(newQ.sessions[1].scheduledDate.getDate()).toBe(21);
  });
});

// ============================================================================
// detectAndShiftMissedSessions (Faza 4.3 hibridni model)
// ============================================================================

describe('detectAndShiftMissedSessions', () => {
  // Helper: queue sa explicitnim scheduledDate-ovima
  function makeQueueWithDates(
    entries: Array<{ id: string; partition: Partition; dayType: DayType; date: Date; status?: QueuedSession['status'] }>,
    pointer = 0,
  ): MesocycleQueue {
    return {
      clientId: 'test',
      mesocycleIndex: 1,
      templateId: 'tpl-1',
      sessions: entries.map((e, i) => ({
        sessionId: e.id,
        label: `${e.partition} session`,
        dayType: e.dayType,
        partition: e.partition,
        status: e.status ?? (i === pointer ? 'next' : (i < pointer ? 'completed' : 'pending')),
        scheduledDate: e.date,
        completedAt: e.status === 'completed' ? e.date : null,
        actualWorkoutSessionId: null,
      })),
      sessionPointer: pointer,
      currentMicrocycleIndex: 0,
      swapUsedThisMicrocycle: false,
      partitionLastSeen: {},
      returnFromBreakCountdown: {},
      createdAt: new Date(2026, 3, 20),
      completedAt: null,
    };
  }

  it('NO-OP kad nema missed sesija (svi datumi >= today)', () => {
    // Pon 2026-04-20 = today
    const queue = makeQueueWithDates([
      { id: 'A1', partition: 'Lower', dayType: 'Lower', date: new Date(2026, 3, 20) },
      { id: 'B1', partition: 'Upper', dayType: 'Upper', date: new Date(2026, 3, 22) },
    ]);
    const today = new Date(2026, 3, 20);
    const result = detectAndShiftMissedSessions(queue, today, 3);
    expect(result.shiftedSessionIds).toHaveLength(0);
    expect(result.updatedQueue).toEqual(queue);
  });

  it('1 missed sesija se pomera na sledeci trening dan (3x: Pon/Sre/Pet)', () => {
    // A1 zakazan za Pon 20, danas je Uto 21 → A1 se pomera na Sre 22
    const queue = makeQueueWithDates([
      { id: 'A1', partition: 'Lower', dayType: 'Lower', date: new Date(2026, 3, 20), status: 'next' },
      { id: 'B1', partition: 'Upper', dayType: 'Upper', date: new Date(2026, 3, 22), status: 'pending' },
    ]);
    const today = new Date(2026, 3, 21);  // Uto
    const result = detectAndShiftMissedSessions(queue, today, 3);

    expect(result.shiftedSessionIds).toContain('A1');
    const a1 = result.updatedQueue.sessions[0];
    expect(a1.scheduledDate.getDate()).toBe(22);  // Sre
    expect(a1.shiftedFrom).toBeInstanceOf(Date);
    // B1 se kaskadno pomera na Pet 24
    const b1 = result.updatedQueue.sessions[1];
    expect(b1.scheduledDate.getDate()).toBe(24);  // Pet
  });

  it('2 missed u nizu → obe shift-ovane redom', () => {
    const queue = makeQueueWithDates([
      { id: 'A1', partition: 'Lower', dayType: 'Lower', date: new Date(2026, 3, 20), status: 'next' },    // Pon (missed)
      { id: 'B1', partition: 'Upper', dayType: 'Upper', date: new Date(2026, 3, 22), status: 'pending' }, // Sre (missed)
      { id: 'A2', partition: 'Lower', dayType: 'Lower', date: new Date(2026, 3, 24), status: 'pending' }, // Pet
    ]);
    const today = new Date(2026, 3, 24);  // Pet
    const result = detectAndShiftMissedSessions(queue, today, 3);

    expect(result.shiftedSessionIds).toEqual(['A1', 'B1', 'A2']);
    // A1 → Pet 24, B1 → Pon 27, A2 → Sre 29
    expect(result.updatedQueue.sessions[0].scheduledDate.getDate()).toBe(24);
    expect(result.updatedQueue.sessions[1].scheduledDate.getDate()).toBe(27);
    expect(result.updatedQueue.sessions[2].scheduledDate.getDate()).toBe(29);
  });

  it('queue.sessionPointer se NE menja posle shift-a (biologija ostaje linearna)', () => {
    const queue = makeQueueWithDates([
      { id: 'A1', partition: 'Lower', dayType: 'Lower', date: new Date(2026, 3, 20), status: 'next' },
      { id: 'B1', partition: 'Upper', dayType: 'Upper', date: new Date(2026, 3, 22), status: 'pending' },
    ]);
    const today = new Date(2026, 3, 25);  // Sub
    const result = detectAndShiftMissedSessions(queue, today, 3);
    expect(result.updatedQueue.sessionPointer).toBe(queue.sessionPointer);
  });

  it('completed sesije NE shift-uju (zadrzavaju originalni datum)', () => {
    const completedDate = new Date(2026, 3, 18);  // Sub pre
    const queue = makeQueueWithDates([
      { id: 'A1', partition: 'Lower', dayType: 'Lower', date: completedDate, status: 'completed' },
      { id: 'B1', partition: 'Upper', dayType: 'Upper', date: new Date(2026, 3, 20), status: 'next' },
    ]);
    const today = new Date(2026, 3, 22);
    const result = detectAndShiftMissedSessions(queue, today, 3);

    const a1 = result.updatedQueue.sessions[0];
    expect(a1.status).toBe('completed');
    expect(a1.scheduledDate).toEqual(completedDate);
    expect(a1.shiftedFrom).toBeUndefined();
  });

  it('idempotentnost: drugi poziv ne dodaje nove shift-ove', () => {
    const queue = makeQueueWithDates([
      { id: 'A1', partition: 'Lower', dayType: 'Lower', date: new Date(2026, 3, 20), status: 'next' },
      { id: 'B1', partition: 'Upper', dayType: 'Upper', date: new Date(2026, 3, 22), status: 'pending' },
    ]);
    const today = new Date(2026, 3, 23);  // Čet
    const first = detectAndShiftMissedSessions(queue, today, 3);
    const second = detectAndShiftMissedSessions(first.updatedQueue, today, 3);

    expect(second.shiftedSessionIds).toHaveLength(0);
    expect(second.updatedQueue.sessions).toEqual(first.updatedQueue.sessions);
  });

  it('shiftHistory audit log raste monotono', () => {
    const queue = makeQueueWithDates([
      { id: 'A1', partition: 'Lower', dayType: 'Lower', date: new Date(2026, 3, 20), status: 'next' },
      { id: 'B1', partition: 'Upper', dayType: 'Upper', date: new Date(2026, 3, 22), status: 'pending' },
    ]);
    const today = new Date(2026, 3, 23);
    const result = detectAndShiftMissedSessions(queue, today, 3, 'illness_pause');

    expect(result.updatedQueue.shiftHistory).toBeDefined();
    expect(result.updatedQueue.shiftHistory!.length).toBeGreaterThan(0);
    expect(result.updatedQueue.shiftHistory![0].reason).toBe('illness_pause');
  });

  it('4x distribucija (Pon/Uto/Čet/Pet) pravilno shift-uje', () => {
    // A1 missed Pon, sledeci slot Uto (nije Sre jer Sre je rest u 4x)
    const queue = makeQueueWithDates([
      { id: 'A1', partition: 'Lower', dayType: 'Lower', date: new Date(2026, 3, 20), status: 'next' },
      { id: 'B1', partition: 'Upper', dayType: 'Upper', date: new Date(2026, 3, 21), status: 'pending' },
    ]);
    const today = new Date(2026, 3, 21);  // Uto
    const result = detectAndShiftMissedSessions(queue, today, 4);

    // A1 se pomera na Uto 21, B1 kaskadno na Čet 23
    expect(result.updatedQueue.sessions[0].scheduledDate.getDate()).toBe(21);
    expect(result.updatedQueue.sessions[1].scheduledDate.getDate()).toBe(23);
  });

  it('cross-week preliv: sesije se premaknu u narednu nedelju kad ove nema mesta', () => {
    // 3x, danas Ned 26 → svi slotovi ove nedelje iskorišćeni; A1 ide u Pon 27
    const queue = makeQueueWithDates([
      { id: 'A1', partition: 'Lower', dayType: 'Lower', date: new Date(2026, 3, 20), status: 'next' },
    ]);
    const today = new Date(2026, 3, 26);  // Ned
    const result = detectAndShiftMissedSessions(queue, today, 3);

    const a1 = result.updatedQueue.sessions[0];
    expect(a1.scheduledDate.getDate()).toBe(27);  // Pon sledeca
    expect(a1.shiftedFrom).toBeInstanceOf(Date);
  });
});
