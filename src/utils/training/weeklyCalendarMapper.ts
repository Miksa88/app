// ============================================================================
// weeklyCalendarMapper — pure funkcija za hibridni kalendar/queue UI
// Spec: Faza 4.3 (Korekcija Faze 4 — Hibridni model)
// ============================================================================
//
// Hibridni model:
//   - Queue (pointer A1→B1→A2→...) je BIOLOŠKI izvor istine za redosled sesija
//   - scheduledDate na QueuedSession je KALENDARSKI sloj (koji dan u nedelji)
//   - WeeklyCalendar UI rekonstruiše 7-dnevni prozor (Pon-Ned) iz queue-a,
//     sa Rest danima na praznim slotovima
//
// Pure funkcija: ulaz su queue + datumi, izlaz je WeeklyCalendarView.
// NE piše u DB. Shift detekcija je odvojena (sessionResolver.ts).
// ============================================================================

import type { MesocycleQueue, QueuedSession } from '@/types/training';

// ----------------------------------------------------------------------------
// Tipovi
// ----------------------------------------------------------------------------

export type WeekDayLabel = 'Pon' | 'Uto' | 'Sre' | 'Čet' | 'Pet' | 'Sub' | 'Ned';

export const WEEK_DAY_LABELS: WeekDayLabel[] = [
  'Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned',
];

export type WeekDayKind =
  | { type: 'training'; session: QueuedSession }
  | { type: 'rest' };

export interface WeekDayView {
  /** Kalendarski datum (lokalna TZ, 00:00). */
  date: Date;
  /** Srpska skraćenica (Pon-Ned). */
  dayLabel: WeekDayLabel;
  /** Dan u mesecu (1-31). */
  dayNumber: number;
  /** Da li je ovo današnji dan. */
  isToday: boolean;
  /** Da li je ovaj dan u prošlosti (< today). */
  isPast: boolean;
  /** Trening sesija ako postoji slot za ovaj dan, inače Rest. */
  kind: WeekDayKind;
  /** Diskretan orange dot indikator kad je sesija shift-ovana iz prošlog datuma. */
  isShifted: boolean;
}

export interface WeeklyCalendarView {
  /** Ponedeljak 00:00 lokalne TZ. */
  weekStartDate: Date;
  /** Tačno 7 ćelija (Pon-Ned). */
  days: WeekDayView[];
  /** Sledeća sesija koju treba odraditi (status !== 'completed', date >= today).
   *  Može biti izvan trenutne nedelje. */
  nextUp: { session: QueuedSession; dayIndex: number | null } | null;
}

// ----------------------------------------------------------------------------
// Helper: getWeekStartDate — vraća ponedeljak te nedelje u 00:00 lokalne TZ
// ----------------------------------------------------------------------------
//
// JS `getDay()` vraća 0=Ned, 1=Pon, ..., 6=Sub. Treba nam 0=Pon, 6=Ned.
// Pomeraj: (getDay() + 6) % 7 → 0 za Pon, 6 za Ned.

export function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayIdx = (d.getDay() + 6) % 7;   // 0=Pon..6=Ned
  d.setDate(d.getDate() - dayIdx);
  return d;
}

// ----------------------------------------------------------------------------
// Helper: sameCalendarDay — poredi dva datuma po kalendarskom danu
// ----------------------------------------------------------------------------

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ----------------------------------------------------------------------------
// mapQueueToWeek — glavni entry point
// ----------------------------------------------------------------------------

export function mapQueueToWeek(
  queue: MesocycleQueue,
  weekStartDate: Date,
  today: Date,
): WeeklyCalendarView {
  const weekStart = new Date(weekStartDate);
  weekStart.setHours(0, 0, 0, 0);

  const todayNormalized = new Date(today);
  todayNormalized.setHours(0, 0, 0, 0);

  const days: WeekDayView[] = [];

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const cellDate = new Date(weekStart);
    cellDate.setDate(weekStart.getDate() + dayIdx);

    // Pronađi sesiju čiji scheduledDate pada na ovaj kalendarski dan
    const matchedSession = queue.sessions.find(s =>
      sameCalendarDay(new Date(s.scheduledDate), cellDate),
    );

    const isToday = sameCalendarDay(cellDate, todayNormalized);
    const isPast = cellDate < todayNormalized;

    days.push({
      date: cellDate,
      dayLabel: WEEK_DAY_LABELS[dayIdx],
      dayNumber: cellDate.getDate(),
      isToday,
      isPast,
      kind: matchedSession
        ? { type: 'training', session: matchedSession }
        : { type: 'rest' },
      isShifted: matchedSession?.shiftedFrom != null,
    });
  }

  // nextUp: prva non-completed sesija čiji scheduledDate >= today
  // (može biti izvan trenutne nedelje, npr. u sledećoj nedelji)
  const nextSession = queue.sessions.find(s => {
    if (s.status === 'completed') return false;
    const d = new Date(s.scheduledDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() >= todayNormalized.getTime();
  });

  let nextUp: WeeklyCalendarView['nextUp'] = null;
  if (nextSession) {
    const nextDate = new Date(nextSession.scheduledDate);
    nextDate.setHours(0, 0, 0, 0);

    // dayIndex u trenutnoj nedelji (0-6) ili null ako je izvan
    const diffDays = Math.floor(
      (nextDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const dayIndex = diffDays >= 0 && diffDays < 7 ? diffDays : null;

    nextUp = { session: nextSession, dayIndex };
  }

  return {
    weekStartDate: weekStart,
    days,
    nextUp,
  };
}
