// ============================================================================
// sessionResolver — operacije nad MesocycleQueue-om
// Spec: 01_TRAINING_FLOW_MASTER.md Sekcija 5 Korak 2.5 (Queue Lookup)
//       + Sekcija 4.7 (MesocycleQueue) + Sekcija 7 (Auto-regulacija)
// ============================================================================
//
// Pure funkcije nad queue-om. NE koristi DB — sve mutacije vraćaju NOVI
// queue object (immutable pattern). Sync Engine pozove ove funkcije pa
// persistira rezultat kroz updateUserStatus.
//
// Tri glavne operacije:
//   1. resolveNextSession — vraća sesiju na koju pointer pokazuje
//   2. advancePointerAfterCompletion — posle završenog treninga
//   3. swapNextTwoSessions — klijentkinja zamenila sesije (1× po mikrociklusu)
// ============================================================================

import type {
  MesocycleQueue,
  QueuedSession,
  Partition,
  ShiftHistoryEntry,
  ShiftReason,
} from '@/types/training';

// ============================================================================
// resolveNextSession — vraca trenutno aktivnu sesiju
// ============================================================================
//
// Vraca null ako je mezociklus zavrsen (pointer >= sessions.length).
// Sync Engine onda pokrece handleMesocycleEnd() (Sekcija 6.1 spec-a 01).

export function resolveNextSession(queue: MesocycleQueue): QueuedSession | null {
  if (queue.sessionPointer >= queue.sessions.length) return null;
  return queue.sessions[queue.sessionPointer];
}

// ============================================================================
// hasMesocycleEnded — kraj queue-a
// ============================================================================

export function hasMesocycleEnded(queue: MesocycleQueue): boolean {
  return queue.sessionPointer >= queue.sessions.length;
}

// ============================================================================
// advancePointerAfterCompletion — sta se desava posle zavrsene sesije
// Spec: 01 Sekcija 5 Korak 2.5 (onSessionCompleted)
// ============================================================================
//
// Vraca NOVI queue (immutable). Sync Engine ga onda persistira.
//
// Operacije:
//   1. Trenutna sesija → status='completed', completedAt=today
//   2. Pointer += 1
//   3. Sledeca sesija (ako postoji) → status='next'
//   4. partitionLastSeen[partition] update
//   5. Ako je zavrsen pun mikrociklus → currentMicrocycleIndex++,
//      swapUsedThisMicrocycle = false (reset swap)

export interface AdvanceResult {
  queue: MesocycleQueue;
  microcycleCompleted: boolean;
}

export function advancePointerAfterCompletion(
  queue: MesocycleQueue,
  today: Date,
): AdvanceResult {
  if (hasMesocycleEnded(queue)) {
    throw new Error('advancePointerAfterCompletion: queue je vec zavrsen');
  }

  const completedSession = queue.sessions[queue.sessionPointer];

  // Klone sessions — NE mutiramo ulaz
  const newSessions: QueuedSession[] = queue.sessions.map((s, i) => {
    if (i === queue.sessionPointer) {
      return { ...s, status: 'completed', completedAt: today };
    }
    if (i === queue.sessionPointer + 1) {
      return { ...s, status: 'next' };
    }
    return s;
  });

  const newPointer = queue.sessionPointer + 1;

  // Update partitionLastSeen za zavrsenu particiju
  const newPartitionLastSeen = {
    ...queue.partitionLastSeen,
    [completedSession.partition]: {
      sessionId: completedSession.sessionId,
      date: today,
    },
  };

  // Da li je ovaj completion zavrsio pun mikrociklus?
  // Definicija: nove sve particije iz template-a su istrenirane od poslednjeg
  // microcycle reset-a. Najjednostavnija aproksimacija: svaki put kad pointer
  // dosegne multiple of (sessions per microcycle), reset swap. Posto skeleton
  // zna `daysPerWeek`, mikrociklus je tacno toliko sesija u redu.
  // Bez direktnog acccess-a do skeleton-a ovde, koristimo heuristiku: izvucemo
  // velicinu ciklusa iz partition pattern-a sessions array-a.
  const microcycleSize = inferMicrocycleSize(queue.sessions);
  const microcycleCompleted = newPointer > 0 && newPointer % microcycleSize === 0;

  const newQueue: MesocycleQueue = {
    ...queue,
    sessions: newSessions,
    sessionPointer: newPointer,
    partitionLastSeen: newPartitionLastSeen,
    currentMicrocycleIndex: microcycleCompleted
      ? queue.currentMicrocycleIndex + 1
      : queue.currentMicrocycleIndex,
    swapUsedThisMicrocycle: microcycleCompleted ? false : queue.swapUsedThisMicrocycle,
  };

  return { queue: newQueue, microcycleCompleted };
}

// ============================================================================
// inferMicrocycleSize — koliko sesija ima u jednom punom krugu
// ============================================================================
//
// Iz partition redosleda zakljuci ciklus. Npr. [Lower, Upper, Lower, Upper, ...]
// = 2-sesijski mikrociklus. [Lower, Upper, Lower, Upper, Lower, Lower, Upper, ...]
// bi bio 5-sesijski.
//
// Strategija: pronadji prvo ponavljanje pocetne particije + dayRole kombinacije.
// Ako ne nađemo, fallback na 4 (najcesci slucaj 4× nedeljno U/L split).

function inferMicrocycleSize(sessions: readonly QueuedSession[]): number {
  if (sessions.length < 2) return 1;

  const firstPartition = sessions[0].partition;
  const firstRole = sessions[0].dayRole;

  for (let i = 1; i < sessions.length; i++) {
    if (sessions[i].partition === firstPartition && sessions[i].dayRole === firstRole) {
      return i;
    }
  }
  return 4;  // safe fallback
}

// ============================================================================
// canSwapNextTwoSessions — proverava da li je swap dozvoljen
// Spec: 01 Sekcija 5 Korak 2.5 (Swap request)
// ============================================================================
//
// Pravila:
//   1. Mora postojati sledeca sesija (pointer+1 < length)
//   2. Swap nije iskoristen u ovom mikrociklusu
//   3. Trenutna i sledeca moraju biti razlicite particije
//      (Lower↔Upper OK, Lower↔Lower NE — full body se ionako ne swap-uje)

export interface SwapEligibility {
  allowed: boolean;
  reason?: string;
}

export function canSwapNextTwoSessions(queue: MesocycleQueue): SwapEligibility {
  if (queue.swapUsedThisMicrocycle) {
    return { allowed: false, reason: 'Vec si iskoristila swap u ovom krugu sesija.' };
  }
  if (queue.sessionPointer + 1 >= queue.sessions.length) {
    return { allowed: false, reason: 'Nema sledece sesije za swap.' };
  }
  const current = queue.sessions[queue.sessionPointer];
  const next = queue.sessions[queue.sessionPointer + 1];

  if (current.partition === next.partition) {
    return { allowed: false, reason: 'Dve sesije iste particije ne mogu da se zamene.' };
  }

  // Full body splitovi nemaju swap (sve sesije su FullBody)
  if (current.partition === 'FullBody') {
    return { allowed: false, reason: 'Swap nije dostupan za Full Body splitove.' };
  }

  return { allowed: true };
}

// ============================================================================
// swapNextTwoSessions — izvrši swap, vrati novi queue
// ============================================================================

export function swapNextTwoSessions(queue: MesocycleQueue): MesocycleQueue {
  const eligibility = canSwapNextTwoSessions(queue);
  if (!eligibility.allowed) {
    throw new Error(`swapNextTwoSessions: ${eligibility.reason}`);
  }

  const newSessions = [...queue.sessions];
  const i = queue.sessionPointer;
  const a = newSessions[i];
  const b = newSessions[i + 1];

  // Swap biologije (A ↔ B) ali zadrzi kalendarske slotove — klijentkinja je
  // kliknula swap zato sto zeli da ZAMENI redosled, ne datume. scheduledDate
  // ostaje vezan za kalendarski slot, ne za sessionId.
  newSessions[i] = { ...b, scheduledDate: a.scheduledDate };
  newSessions[i + 1] = { ...a, scheduledDate: b.scheduledDate };

  return {
    ...queue,
    sessions: newSessions,
    swapUsedThisMicrocycle: true,
  };
}

// ============================================================================
// detectAndShiftMissedSessions — shift scheduledDate za missed sesije
// Spec: Faza 4.3 (Korekcija Faze 4 — Hibridni model)
// ============================================================================
//
// Pure funkcija. Ulaz: queue + today + daysPerWeek. Izlaz: novi queue sa
// rebildovanim scheduledDate-om za sve non-completed sesije počev od prvog
// trening dana >= today. Sesije koje su već na ispravnom datumu → NO-OP
// (ne beleže se u shiftHistory → idempotentno).
//
// KLJUČNO: queue.sessionPointer se NE menja. Biološki redosled (A→B→A→B)
// ostaje linearan; menjaju se samo kalendarski slotovi.
//
// Distribucija trening dana (0=Pon..6=Ned):
//   3x → [0, 2, 4]       (Pon/Sre/Pet)
//   4x → [0, 1, 3, 4]    (Pon/Uto/Čet/Pet)
//   5x → [0, 1, 2, 4, 5] (Pon/Uto/Sre/Pet/Sub)

export interface ShiftResult {
  updatedQueue: MesocycleQueue;
  shiftedSessionIds: string[];
}

const TRAINING_DAY_SLOTS: Record<3 | 4 | 5, number[]> = {
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
};

function dayOfWeekPonZero(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function nextTrainingDayOnOrAfter(from: Date, trainingDays: number[]): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {  // safety bound 2 nedelje
    if (trainingDays.includes(dayOfWeekPonZero(d))) return d;
    d.setDate(d.getDate() + 1);
  }
  throw new Error('nextTrainingDayOnOrAfter: no training day found in 14 days');
}

function nextTrainingDayAfter(from: Date, trainingDays: number[]): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return nextTrainingDayOnOrAfter(d, trainingDays);
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function detectAndShiftMissedSessions(
  queue: MesocycleQueue,
  today: Date,
  daysPerWeek: 3 | 4 | 5,
  reason: ShiftReason = 'missed',
): ShiftResult {
  const todayNormalized = new Date(today);
  todayNormalized.setHours(0, 0, 0, 0);

  const trainingDays = TRAINING_DAY_SLOTS[daysPerWeek];

  // Detektuj da li ima missed sesija (non-completed sa scheduledDate < today).
  // Ako nema → NO-OP (idempotentnost).
  const hasMissed = queue.sessions.some(s => {
    if (s.status === 'completed') return false;
    const d = new Date(s.scheduledDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < todayNormalized.getTime();
  });

  if (!hasMissed) {
    return { updatedQueue: queue, shiftedSessionIds: [] };
  }

  // Rebuildaj scheduledDate za sve non-completed sesije počevši od prvog
  // trening dana >= today. Completed sesije zadržavaju svoje datume.
  let nextSlot = nextTrainingDayOnOrAfter(todayNormalized, trainingDays);
  const shiftedSessionIds: string[] = [];
  const shiftEntries: ShiftHistoryEntry[] = [];
  const shiftedAt = new Date(today);

  const newSessions: QueuedSession[] = queue.sessions.map(session => {
    if (session.status === 'completed') return session;

    const oldDate = new Date(session.scheduledDate);
    oldDate.setHours(0, 0, 0, 0);
    const newDate = new Date(nextSlot);

    // Napreduj slot za sledeću non-completed sesiju
    nextSlot = nextTrainingDayAfter(nextSlot, trainingDays);

    if (sameCalendarDay(oldDate, newDate)) {
      // Već na ispravnom slotu — ne beleži shift
      return session;
    }

    shiftedSessionIds.push(session.sessionId);
    shiftEntries.push({
      sessionId: session.sessionId,
      originalDate: oldDate,
      newDate,
      reason,
      shiftedAt,
    });

    return {
      ...session,
      scheduledDate: newDate,
      shiftedFrom: oldDate,
    };
  });

  const updatedQueue: MesocycleQueue = {
    ...queue,
    sessions: newSessions,
    shiftHistory: [...(queue.shiftHistory ?? []), ...shiftEntries],
  };

  return { updatedQueue, shiftedSessionIds };
}
