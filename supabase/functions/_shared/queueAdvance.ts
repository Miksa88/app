// ============================================================================
// _shared/queueAdvance.ts — Deno port of advancePointerAfterCompletion
// ============================================================================
//
// Razlog duplikata (isti kao za _shared/movingAverage.ts):
//   Deno Edge Runtime ne može direktno da importuje iz `src/utils/training/...`
//   (različit module resolver + `@/` alias). Standardni Supabase idiom je da
//   shared logika ide u `supabase/functions/_shared/`.
//
//   Source of truth je `src/utils/training/sessionResolver.ts` (pokriven
//   Vitest-om u `sessionResolver.test.ts`). Ovo je verbatim port — SAMO
//   sintaksa je prilagođena (type imports, bez `@/` alias-a, bez path-zavisnih
//   importova). Algoritam je IDENTIČAN.
//
// IT-7 EF poziva `advancePointerAfterCompletion` za queue pointer advance +
// partitionLastSeen update + microcycle detection.
// ============================================================================

// ----------------------------------------------------------------------------
// Tipovi (minimalan subset iz src/types/training.ts potreban za advance)
// ----------------------------------------------------------------------------

export type Partition = 'Lower' | 'Upper' | 'FullBody';
export type DayType = 'Lower' | 'Upper' | 'FullBody' | 'Rest';
export type DayRole = 'Tension' | 'Heavy' | 'Metabolic' | 'Pump' | 'Functional';

export interface QueuedSession {
  sessionId: string;
  label: string;
  dayType: DayType;
  partition: Partition;
  dayRole?: DayRole;
  status: 'completed' | 'next' | 'pending';
  scheduledDate: string | Date;
  shiftedFrom?: string | Date | null;
  completedAt: string | Date | null;
  actualWorkoutSessionId: string | null;
}

export interface MesocycleQueue {
  clientId: string;
  mesocycleIndex: number;
  templateId: string;
  sessions: QueuedSession[];
  sessionPointer: number;
  currentMicrocycleIndex: number;
  swapUsedThisMicrocycle: boolean;
  partitionLastSeen: {
    Lower?: { sessionId: string; date: string | Date };
    Upper?: { sessionId: string; date: string | Date };
    FullBody?: { sessionId: string; date: string | Date };
  };
  returnFromBreakCountdown: {
    Lower?: number;
    Upper?: number;
    FullBody?: number;
  };
  shiftHistory?: unknown[];
  createdAt: string | Date;
  completedAt: string | Date | null;
}

export interface AdvanceResult {
  queue: MesocycleQueue;
  microcycleCompleted: boolean;
}

// ----------------------------------------------------------------------------
// hasMesocycleEnded
// ----------------------------------------------------------------------------

export function hasMesocycleEnded(queue: MesocycleQueue): boolean {
  return queue.sessionPointer >= queue.sessions.length;
}

// ----------------------------------------------------------------------------
// resolveNextSession
// ----------------------------------------------------------------------------

export function resolveNextSession(queue: MesocycleQueue): QueuedSession | null {
  if (queue.sessionPointer >= queue.sessions.length) return null;
  return queue.sessions[queue.sessionPointer];
}

// ----------------------------------------------------------------------------
// inferMicrocycleSize — verbatim port
// ----------------------------------------------------------------------------

function inferMicrocycleSize(sessions: QueuedSession[]): number {
  if (sessions.length < 2) return 1;

  const firstPartition = sessions[0].partition;
  const firstRole = sessions[0].dayRole;

  for (let i = 1; i < sessions.length; i++) {
    if (sessions[i].partition === firstPartition && sessions[i].dayRole === firstRole) {
      return i;
    }
  }
  return 4;
}

// ----------------------------------------------------------------------------
// advancePointerAfterCompletion — verbatim port iz sessionResolver.ts
// ----------------------------------------------------------------------------
//
// Ulaz: queue + today (Date). Izlaz: AdvanceResult sa novim queue-om +
// microcycleCompleted flag-om. NE mutira ulaz.

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
      return { ...s, status: 'completed' as const, completedAt: today };
    }
    if (i === queue.sessionPointer + 1) {
      return { ...s, status: 'next' as const };
    }
    return s;
  });

  const newPointer = queue.sessionPointer + 1;

  const newPartitionLastSeen = {
    ...queue.partitionLastSeen,
    [completedSession.partition]: {
      sessionId: completedSession.sessionId,
      date: today,
    },
  };

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
