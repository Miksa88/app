import { describe, it, expect } from 'vitest';
import {
  mapQueueToWeek,
  getWeekStartDate,
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
// Iskreni model: completed po completedAt, next na danas, ostalo empty
// ----------------------------------------------------------------------------

describe('mapQueueToWeek — iskreni model (pointer queue, bez lažnog Rest-a)', () => {
  const weekStart = new Date(2026, 3, 20);  // Pon 2026-04-20

  it('completed sesije se mapiraju po completedAt kalendarskom danu', () => {
    const sessions = [
      makeSession('A1', daysFromMonday(weekStart, 0), {
        status: 'completed',
        completedAt: daysFromMonday(weekStart, 0),   // Pon
      }),
      makeSession('B1', daysFromMonday(weekStart, 2), {
        status: 'completed',
        completedAt: daysFromMonday(weekStart, 2),   // Sre
      }),
      makeSession('A2', daysFromMonday(weekStart, 4), { status: 'next' }),
    ];
    const friday = daysFromMonday(weekStart, 4);
    const view = mapQueueToWeek(makeQueue(sessions), weekStart, friday);

    expect(view.days[0].kind.type).toBe('completed');  // Pon
    expect(view.days[1].kind.type).toBe('empty');      // Uto — bez tvrdnje
    expect(view.days[2].kind.type).toBe('completed');  // Sre
    expect(view.days[3].kind.type).toBe('empty');      // Čet
    expect(view.days[4].kind.type).toBe('next');       // Pet (danas)
    expect(view.days[5].kind.type).toBe('empty');
    expect(view.days[6].kind.type).toBe('empty');
  });

  it('sledeća sesija se prikazuje na DANAS čak i kad je scheduledDate stale (u prošlosti)', () => {
    // Regresija za bug "svih 7 dana Rest dok NEXT SESSION postoji":
    // scheduledDate iz queueBuilder-a je u prošloj nedelji, ali queue pointer
    // kaže da je A1 sledeća — strip mora da je prikaže na danas.
    const staleDate = daysFromMonday(weekStart, -10);
    const sessions = [makeSession('A1', staleDate, { status: 'next' })];
    const wednesday = daysFromMonday(weekStart, 2);
    const view = mapQueueToWeek(makeQueue(sessions), weekStart, wednesday);

    expect(view.days[2].kind.type).toBe('next');
    if (view.days[2].kind.type === 'next') {
      expect(view.days[2].kind.session.sessionId).toBe('A1');
    }
    // Nijedan dan nije lažno markiran kao trening osim danas
    expect(view.days.filter(d => d.kind.type !== 'empty')).toHaveLength(1);
  });

  it('kad je današnja sesija završena, danas prikazuje completed (ne next)', () => {
    const wednesday = daysFromMonday(weekStart, 2);
    const sessions = [
      makeSession('A1', wednesday, { status: 'completed', completedAt: wednesday }),
      makeSession('B1', daysFromMonday(weekStart, 4), { status: 'pending' }),
    ];
    const view = mapQueueToWeek(makeQueue(sessions), weekStart, wednesday);

    expect(view.days[2].kind.type).toBe('completed');
    // nextUp i dalje postoji (B1), ali nije prikazan u strip-u
    expect(view.nextUp?.session.sessionId).toBe('B1');
    expect(view.nextUp?.dayIndex).toBeNull();
  });

  it('completed sesija bez completedAt se ne mapira ni na jedan dan', () => {
    const sessions = [
      makeSession('A1', daysFromMonday(weekStart, 0), { status: 'completed', completedAt: null }),
    ];
    const view = mapQueueToWeek(makeQueue(sessions), weekStart, weekStart);
    expect(view.days.every(d => d.kind.type !== 'completed')).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// nextUp — sledeća sesija po queue redosledu
// ----------------------------------------------------------------------------

describe('mapQueueToWeek — nextUp', () => {
  const weekStart = new Date(2026, 3, 20);

  it('vraca prvu non-completed sesiju po queue redosledu', () => {
    const sessions = [
      makeSession('A1', daysFromMonday(weekStart, 0), { status: 'completed', completedAt: daysFromMonday(weekStart, 0) }),
      makeSession('B1', daysFromMonday(weekStart, 2), { status: 'next' }),
      makeSession('C1', daysFromMonday(weekStart, 4), { status: 'pending' }),
    ];
    const tuesday = daysFromMonday(weekStart, 1);
    const view = mapQueueToWeek(makeQueue(sessions), weekStart, tuesday);

    expect(view.nextUp?.session.sessionId).toBe('B1');
    expect(view.nextUp?.dayIndex).toBe(1);  // prikazana na danas (Uto)
  });

  it('vraca null ako su sve sesije completed', () => {
    const sessions = [
      makeSession('A1', daysFromMonday(weekStart, 0), { status: 'completed', completedAt: daysFromMonday(weekStart, 0) }),
      makeSession('B1', daysFromMonday(weekStart, 2), { status: 'completed', completedAt: daysFromMonday(weekStart, 2) }),
    ];
    const sunday = daysFromMonday(weekStart, 6);
    const view = mapQueueToWeek(makeQueue(sessions), weekStart, sunday);
    expect(view.nextUp).toBeNull();
  });

  it('dayIndex je null kad today nije u prikazanoj nedelji', () => {
    const sessions = [makeSession('A1', daysFromMonday(weekStart, 0), { status: 'next' })];
    const nextWeekDay = daysFromMonday(weekStart, 9);
    const view = mapQueueToWeek(makeQueue(sessions), weekStart, nextWeekDay);
    expect(view.nextUp?.session.sessionId).toBe('A1');
    expect(view.nextUp?.dayIndex).toBeNull();
    // I nijedan dan u strip-u ne tvrdi trening
    expect(view.days.every(d => d.kind.type === 'empty')).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// Day flags i dayNumber
// ----------------------------------------------------------------------------

describe('mapQueueToWeek — day flags i dayNumber', () => {
  const weekStart = new Date(2026, 3, 20);

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
