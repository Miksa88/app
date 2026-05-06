import { describe, it, expect } from 'vitest';
import {
  mapQueueToWeek,
  getWeekStartDate,
  WEEK_DAY_LABELS,
} from './weeklyCalendarMapper';
import type { MesocycleQueue, QueuedSession } from '@/types/training';

// ----------------------------------------------------------------------------
// Test helpers
// ----------------------------------------------------------------------------

function makeSession(
  sessionId: string,
  scheduledDate: Date,
  overrides: Partial<QueuedSession> = {},
): QueuedSession {
  return {
    sessionId,
    label: 'Test — Day',
    dayType: 'Lower',
    partition: 'Lower',
    dayRole: 'Tension',
    status: 'pending',
    scheduledDate,
    completedAt: null,
    actualWorkoutSessionId: null,
    ...overrides,
  };
}

function makeQueue(sessions: QueuedSession[]): MesocycleQueue {
  return {
    clientId: 'c1',
    mesocycleIndex: 1,
    templateId: 'tpl-1',
    sessions,
    sessionPointer: 0,
    currentMicrocycleIndex: 0,
    swapUsedThisMicrocycle: false,
    partitionLastSeen: {},
    returnFromBreakCountdown: {},
    createdAt: new Date('2026-04-20'),
    completedAt: null,
  };
}

function daysFromMonday(weekStart: Date, dayIdx: number): Date {
  const d = new Date(weekStart);
  d.setDate(weekStart.getDate() + dayIdx);
  return d;
}

// ----------------------------------------------------------------------------
// getWeekStartDate — helper correctness
// ----------------------------------------------------------------------------

describe('getWeekStartDate', () => {
  it('vraca isti datum ako je input Pon', () => {
    // 2026-04-20 je ponedeljak
    const monday = new Date(2026, 3, 20);
    const result = getWeekStartDate(monday);
    expect(result.getDay()).toBe(1);  // 1 = Pon (JS native)
    expect(result.getDate()).toBe(20);
  });

  it('vraca prethodni Pon ako je input Čet', () => {
    // 2026-04-23 je četvrtak
    const thursday = new Date(2026, 3, 23);
    const result = getWeekStartDate(thursday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(20);
  });

  it('vraca Pon iz iste nedelje ako je input Ned', () => {
    // 2026-04-26 je nedelja
    const sunday = new Date(2026, 3, 26);
    const result = getWeekStartDate(sunday);
    expect(result.getDate()).toBe(20);
  });

  it('normalizuje vreme na 00:00', () => {
    const dateWithTime = new Date(2026, 3, 22, 15, 30, 45);
    const result = getWeekStartDate(dateWithTime);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// 3× nedeljno distribucija (Pon/Sre/Pet)
// ----------------------------------------------------------------------------

describe('mapQueueToWeek — 3× nedeljno distribucija', () => {
  const weekStart = new Date(2026, 3, 20);  // Pon 2026-04-20
  const today = weekStart;

  it('prikazuje training dane samo na Pon/Sre/Pet, ostale dane kao Rest', () => {
    const sessions = [
      makeSession('A1', daysFromMonday(weekStart, 0), { status: 'next' }),      // Pon
      makeSession('B1', daysFromMonday(weekStart, 2)),                           // Sre
      makeSession('C1', daysFromMonday(weekStart, 4)),                           // Pet
    ];
    const view = mapQueueToWeek(makeQueue(sessions), weekStart, today);

    expect(view.days).toHaveLength(7);
    expect(view.days[0].kind.type).toBe('training');  // Pon
    expect(view.days[1].kind.type).toBe('rest');       // Uto
    expect(view.days[2].kind.type).toBe('training');   // Sre
    expect(view.days[3].kind.type).toBe('rest');       // Čet
    expect(view.days[4].kind.type).toBe('training');   // Pet
    expect(view.days[5].kind.type).toBe('rest');       // Sub
    expect(view.days[6].kind.type).toBe('rest');       // Ned
  });
});

// ----------------------------------------------------------------------------
// 4× nedeljno distribucija (Pon/Uto/Čet/Pet)
// ----------------------------------------------------------------------------

describe('mapQueueToWeek — 4× nedeljno distribucija', () => {
  const weekStart = new Date(2026, 3, 20);
  const today = weekStart;

  it('prikazuje training dane na Pon/Uto/Čet/Pet', () => {
    const sessions = [
      makeSession('A1', daysFromMonday(weekStart, 0), { status: 'next' }),
      makeSession('B1', daysFromMonday(weekStart, 1)),
      makeSession('C1', daysFromMonday(weekStart, 3)),
      makeSession('D1', daysFromMonday(weekStart, 4)),
    ];
    const view = mapQueueToWeek(makeQueue(sessions), weekStart, today);

    expect(view.days.map(d => d.kind.type)).toEqual([
      'training', 'training', 'rest',
      'training', 'training', 'rest', 'rest',
    ]);
  });
});

// ----------------------------------------------------------------------------
// 5× nedeljno distribucija (Pon/Uto/Sre/Pet/Sub)
// ----------------------------------------------------------------------------

describe('mapQueueToWeek — 5× nedeljno distribucija', () => {
  const weekStart = new Date(2026, 3, 20);
  const today = weekStart;

  it('prikazuje training dane na Pon/Uto/Sre/Pet/Sub', () => {
    const sessions = [
      makeSession('A1', daysFromMonday(weekStart, 0), { status: 'next' }),
      makeSession('B1', daysFromMonday(weekStart, 1)),
      makeSession('C1', daysFromMonday(weekStart, 2)),
      makeSession('D1', daysFromMonday(weekStart, 4)),
      makeSession('E1', daysFromMonday(weekStart, 5)),
    ];
    const view = mapQueueToWeek(makeQueue(sessions), weekStart, today);

    expect(view.days.map(d => d.kind.type)).toEqual([
      'training', 'training', 'training',
      'rest', 'training', 'training', 'rest',
    ]);
  });
});

// ----------------------------------------------------------------------------
// Day labels i dayNumber
// ----------------------------------------------------------------------------

describe('mapQueueToWeek — day labels i dayNumber', () => {
  const weekStart = new Date(2026, 3, 20);

  it('dayLabel redosled: Pon, Uto, Sre, Čet, Pet, Sub, Ned', () => {
    const view = mapQueueToWeek(makeQueue([]), weekStart, weekStart);
    expect(view.days.map(d => d.dayLabel)).toEqual(WEEK_DAY_LABELS);
  });

  it('dayNumber reflektuje dan u mesecu (20-26)', () => {
    const view = mapQueueToWeek(makeQueue([]), weekStart, weekStart);
    expect(view.days.map(d => d.dayNumber)).toEqual([20, 21, 22, 23, 24, 25, 26]);
  });

  it('isToday flag je true samo za trenutni dan', () => {
    const tuesday = daysFromMonday(weekStart, 1);
    const view = mapQueueToWeek(makeQueue([]), weekStart, tuesday);
    expect(view.days[0].isToday).toBe(false);  // Pon
    expect(view.days[1].isToday).toBe(true);    // Uto
    expect(view.days[2].isToday).toBe(false);   // Sre
  });

  it('isPast flag je true za dane pre today', () => {
    const wednesday = daysFromMonday(weekStart, 2);
    const view = mapQueueToWeek(makeQueue([]), weekStart, wednesday);
    expect(view.days[0].isPast).toBe(true);   // Pon
    expect(view.days[1].isPast).toBe(true);   // Uto
    expect(view.days[2].isPast).toBe(false);  // Sre (today)
    expect(view.days[3].isPast).toBe(false);  // Čet
  });
});

// ----------------------------------------------------------------------------
// nextUp — sledeća sesija
// ----------------------------------------------------------------------------

describe('mapQueueToWeek — nextUp', () => {
  const weekStart = new Date(2026, 3, 20);

  it('vraca prvu non-completed sesiju >= today', () => {
    const sessions = [
      makeSession('A1', daysFromMonday(weekStart, 0), { status: 'completed' }),
      makeSession('B1', daysFromMonday(weekStart, 2), { status: 'next' }),
      makeSession('C1', daysFromMonday(weekStart, 4), { status: 'pending' }),
    ];
    const tuesday = daysFromMonday(weekStart, 1);
    const view = mapQueueToWeek(makeQueue(sessions), weekStart, tuesday);

    expect(view.nextUp?.session.sessionId).toBe('B1');
    expect(view.nextUp?.dayIndex).toBe(2);  // Sre
  });

  it('preskace completed sesije i vraca sledecu', () => {
    const sessions = [
      makeSession('A1', daysFromMonday(weekStart, 0), { status: 'completed' }),
      makeSession('B1', daysFromMonday(weekStart, 2), { status: 'completed' }),
      makeSession('C1', daysFromMonday(weekStart, 4), { status: 'next' }),
    ];
    const view = mapQueueToWeek(makeQueue(sessions), weekStart, weekStart);
    expect(view.nextUp?.session.sessionId).toBe('C1');
  });

  it('vraca null ako su sve sesije completed', () => {
    const sessions = [
      makeSession('A1', daysFromMonday(weekStart, 0), { status: 'completed' }),
      makeSession('B1', daysFromMonday(weekStart, 2), { status: 'completed' }),
    ];
    const view = mapQueueToWeek(makeQueue(sessions), weekStart, weekStart);
    expect(view.nextUp).toBeNull();
  });

  it('nextUp.dayIndex je null ako je sesija izvan trenutne nedelje', () => {
    const nextWeek = daysFromMonday(weekStart, 10);  // sledeca nedelja
    const sessions = [
      makeSession('A1', nextWeek, { status: 'next' }),
    ];
    const view = mapQueueToWeek(makeQueue(sessions), weekStart, weekStart);
    expect(view.nextUp?.session.sessionId).toBe('A1');
    expect(view.nextUp?.dayIndex).toBeNull();
  });
});

// ----------------------------------------------------------------------------
// Shift indikator — orange dot
// ----------------------------------------------------------------------------

describe('mapQueueToWeek — shift indikator', () => {
  const weekStart = new Date(2026, 3, 20);

  it('isShifted=true kad session ima shiftedFrom != null', () => {
    const prevWeek = daysFromMonday(weekStart, -3);
    const sessions = [
      makeSession('A1', daysFromMonday(weekStart, 2), {
        status: 'next',
        shiftedFrom: prevWeek,
      }),
    ];
    const view = mapQueueToWeek(makeQueue(sessions), weekStart, weekStart);
    expect(view.days[2].isShifted).toBe(true);
  });

  it('isShifted=false kad session.shiftedFrom je null ili undefined', () => {
    const sessions = [
      makeSession('A1', daysFromMonday(weekStart, 2), { shiftedFrom: null }),
      makeSession('B1', daysFromMonday(weekStart, 4)),
    ];
    const view = mapQueueToWeek(makeQueue(sessions), weekStart, weekStart);
    expect(view.days[2].isShifted).toBe(false);
    expect(view.days[4].isShifted).toBe(false);
  });
});

// ----------------------------------------------------------------------------
// Cross-month / edge boundaries
// ----------------------------------------------------------------------------

describe('mapQueueToWeek — cross-month boundary', () => {
  it('obuhvata dan 31 i prelaz na sledeci mesec', () => {
    // 2026-03-30 je Pon, 31=Uto, 01-apr=Sre...
    const weekStart = new Date(2026, 2, 30);
    const view = mapQueueToWeek(makeQueue([]), weekStart, weekStart);
    expect(view.days.map(d => d.dayNumber)).toEqual([30, 31, 1, 2, 3, 4, 5]);
  });
});

// ----------------------------------------------------------------------------
// weekStartDate normalizacija
// ----------------------------------------------------------------------------

describe('mapQueueToWeek — weekStartDate normalizacija', () => {
  it('postavlja weekStartDate na 00:00 čak i ako input ima vreme', () => {
    const weekStartWithTime = new Date(2026, 3, 20, 15, 30);
    const view = mapQueueToWeek(makeQueue([]), weekStartWithTime, weekStartWithTime);
    expect(view.weekStartDate.getHours()).toBe(0);
    expect(view.weekStartDate.getMinutes()).toBe(0);
  });
});
