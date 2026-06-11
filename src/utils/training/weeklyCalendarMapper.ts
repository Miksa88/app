// ============================================================================
// weeklyCalendarMapper — pure funkcija za iskreni kalendar/queue UI
// Spec: 01_TRAINING_FLOW_MASTER.md Pravilo 5 ("bez krivice" UI)
// ============================================================================
//
// Queue model je POINTER-BASED — nema zakazanih dana u nedelji. Stari hibridni
// model je crtao "Rest" na svim danima čiji scheduledDate nije pogođen, što je
// bila kontradikcija (NEXT SESSION postoji, a strip kaže da je cela nedelja
// odmor). scheduledDate iz queueBuilder-a je interna analytics vrednost, ne
// kalendarska istina.
//
// Iskreni model (redizajn 2026-06-11):
//   - 'completed' — sesija je STVARNO odrađena tog dana (match po completedAt)
//   - 'next'      — sledeća sesija iz queue-a, prikazana na DANAS (jedini dan
//                   za koji možemo iskreno reći "ovo je sledeće")
//   - 'empty'     — bez tvrdnje; ne znamo da li je Rest jer queue nema fiksne
//                   dane. Anti-anxiety: NEMA "missed", NEMA lažnog "Rest".
//
// Pure funkcija: ulaz su queue + datumi, izlaz je WeeklyCalendarView.
// NE piše u DB.
// ============================================================================

import type { MesocycleQueue, QueuedSession } from '@/types/training';

// ----------------------------------------------------------------------------
// Tipovi
// ----------------------------------------------------------------------------

export type WeekDayKind =
  | { type: 'completed'; session: QueuedSession }
  | { type: 'next'; session: QueuedSession }
  | { type: 'empty' };

export interface WeekDayView {
  /** Kalendarski datum (lokalna TZ, 00:00). UI formira day label iz locale-a. */
  date: Date;
  /** Dan u mesecu (1-31). */
  dayNumber: number;
  /** Da li je ovo današnji dan. */
  isToday: boolean;
  /** Da li je ovaj dan u prošlosti (< today). */
  isPast: boolean;
  /** Završena sesija / sledeća sesija (samo danas) / bez tvrdnje. */
  kind: WeekDayKind;
}

export interface WeeklyCalendarView {
  /** Ponedeljak 00:00 lokalne TZ. */
  weekStartDate: Date;
  /** Tačno 7 ćelija (Pon-Ned). */
  days: WeekDayView[];
  /** Sledeća sesija iz queue-a (prva non-completed po queue redosledu).
   *  dayIndex je indeks današnjeg dana ako je sesija prikazana u strip-u,
   *  inače null (npr. današnja sesija je već završena). */
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

  // Sledeća sesija = prva non-completed po QUEUE redosledu (pointer istina),
  // ne po datumima — queue nema zakazane dane.
  const nextSession = queue.sessions.find(s => s.status !== 'completed') ?? null;

  const days: WeekDayView[] = [];
  let nextShownDayIndex: number | null = null;

  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const cellDate = new Date(weekStart);
    cellDate.setDate(weekStart.getDate() + dayIdx);

    const isToday = sameCalendarDay(cellDate, todayNormalized);
    const isPast = cellDate < todayNormalized;

    // Završena sesija tog kalendarskog dana — jedina kalendarska ISTINA
    // koju queue nosi (completedAt je fakt iz istorije).
    const completedSession = queue.sessions.find(s =>
      s.status === 'completed' &&
      s.completedAt != null &&
      sameCalendarDay(new Date(s.completedAt), cellDate),
    );

    let kind: WeekDayKind;
    if (completedSession) {
      kind = { type: 'completed', session: completedSession };
    } else if (isToday && nextSession) {
      // Sledeća sesija se prikazuje samo na DANAS — ne izmišljamo budući raspored.
      kind = { type: 'next', session: nextSession };
      nextShownDayIndex = dayIdx;
    } else {
      kind = { type: 'empty' };
    }

    days.push({
      date: cellDate,
      dayNumber: cellDate.getDate(),
      isToday,
      isPast,
      kind,
    });
  }

  return {
    weekStartDate: weekStart,
    days,
    nextUp: nextSession ? { session: nextSession, dayIndex: nextShownDayIndex } : null,
  };
}
