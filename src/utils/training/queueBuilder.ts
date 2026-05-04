// ============================================================================
// queueBuilder — kreira MesocycleQueue iz Skeleton-a
// Spec: 01_TRAINING_FLOW_MASTER.md Sekcija 4.7 (MesocycleQueue)
//       + Sekcija 6 (Programiranje kroz cikluse)
// ============================================================================
//
// Skeleton definise SHAPE jedne nedelje. Mezociklus je 5 nedelja (Model B,
// spec §6.1: 4 load + 1 deload) x dnevna frekvencija sesija. Queue builder
// linearizuje to u uredjen niz:
//   skeleton 4 dana × 5 nedelje = 20 QueuedSession instanci [A1, B1, ...,
//   A5, B5, C5, D5] gde se A/B/C/D izmenjuju u redosledu skeleton dana.
//   Poslednja nedelja (sessions[16..19] u 4×5 primeru) je deload.
//
// Pure funkcija — uzima skeleton + metadata, vraca novi MesocycleQueue.
// ============================================================================

import type {
  SessionSkeleton,
  MesocycleQueue,
  QueuedSession,
  Partition,
  SkeletonDay,
} from '@/types/training';

const DEFAULT_MESOCYCLE_WEEKS = 5;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export interface BuildQueueInputs {
  clientId: string;
  templateId: string;
  skeleton: SessionSkeleton;
  mesocycleIndex: number;            // 1 za prvi mezociklus
  startDate: Date;                    // referenca za scheduledDate (ne za prikaz)
  weeksInMesocycle?: number;          // default 5 (Model B: 4 load + 1 deload)
}

// ============================================================================
// buildMesocycleQueue — glavni entry point
// ============================================================================

export function buildMesocycleQueue(input: BuildQueueInputs): MesocycleQueue {
  const weeks = input.weeksInMesocycle ?? DEFAULT_MESOCYCLE_WEEKS;
  const trainingDays = input.skeleton.days.filter(d => d.dayType !== 'Rest');

  if (trainingDays.length === 0) {
    throw new Error(
      `buildMesocycleQueue: skeleton "${input.skeleton.id}" nema training dana ` +
      `(svih ${input.skeleton.days.length} dana je tipa Rest).`,
    );
  }

  const sessions: QueuedSession[] = [];
  const cycleLetter = (idx: number) => String.fromCharCode(65 + idx);  // 0→A, 1→B, ...

  // Spread sesije kroz `weeks` mikrociklusa
  for (let week = 1; week <= weeks; week++) {
    trainingDays.forEach((day, dayIdx) => {
      const partition = derivePartition(day);
      const sessionLabel = `${cycleLetter(dayIdx)}${week}`;
      const scheduledDate = new Date(
        input.startDate.getTime() + ((week - 1) * 7 + day.dayIndex - 1) * MS_PER_DAY,
      );

      sessions.push({
        sessionId: sessionLabel,                  // npr. "A1", "B1", "A2", ...
        label: buildSessionLabel(day),
        dayType: day.dayType,
        partition,
        dayRole: day.dayRole,
        status: sessions.length === 0 ? 'next' : 'pending',
        scheduledDate,                            // INTERNO za analytics, ne za UI
        completedAt: null,
        actualWorkoutSessionId: null,
      });
    });
  }

  return {
    clientId: input.clientId,
    mesocycleIndex: input.mesocycleIndex,
    templateId: input.templateId,
    sessions,
    sessionPointer: 0,
    currentMicrocycleIndex: 0,
    swapUsedThisMicrocycle: false,
    partitionLastSeen: {},
    returnFromBreakCountdown: {},
    createdAt: input.startDate,
    completedAt: null,
  };
}

// ============================================================================
// derivePartition — iz dayType izvuci Partition kategoriju za Decay tracking
// ============================================================================

function derivePartition(day: SkeletonDay): Partition {
  switch (day.dayType) {
    case 'FullBody':
      return 'FullBody';
    case 'Lower':
    case 'Legs':
      return 'Lower';
    case 'Upper':
    case 'Push':
    case 'Pull':
      return 'Upper';
    case 'Rest':
      throw new Error(`derivePartition: Rest day ne moze biti queued session.`);
  }
}

// ============================================================================
// buildSessionLabel — human-readable za UI
// ============================================================================
//
// Primeri: "Lower — Tension", "Upper — Heavy", "Full Body"

function buildSessionLabel(day: SkeletonDay): string {
  const partitionName = displayPartition(day.dayType);
  return day.dayRole ? `${partitionName} — ${day.dayRole}` : partitionName;
}

function displayPartition(dayType: SkeletonDay['dayType']): string {
  switch (dayType) {
    case 'FullBody': return 'Full Body';
    case 'Lower': return 'Lower';
    case 'Upper': return 'Upper';
    case 'Push': return 'Push';
    case 'Pull': return 'Pull';
    case 'Legs': return 'Legs';
    case 'Rest': return 'Rest';
  }
}
