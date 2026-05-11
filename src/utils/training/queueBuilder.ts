// ============================================================================
// queueBuilder — kreira MesocycleQueue iz Skeleton-a
// Spec: 01_TRAINING_FLOW_MASTER.md Sekcija 4.7 (MesocycleQueue)
//       + Sekcija 6 (Programiranje kroz cikluse)
// ============================================================================
//
// Skeleton definise SHAPE jedne nedelje. Mezociklus je 7 nedelja (pocetnici.md
// §2.1, 2026-05-08: 6 load + 1 deload) x dnevna frekvencija sesija. Queue
// builder linearizuje to u uredjen niz:
//   skeleton 3 dana × 7 nedelje = 21 QueuedSession instanci [A1, B1, A1,
//   A2, B2, A2, ...] gde se A/B izmenjuju u redosledu skeleton dana.
//   Poslednja nedelja (sessions[18..20] u 3×7 primeru) je deload.
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

// pocetnici.md §2.1 (2026-05-08): 6 load + 1 deload = 7 nedelja
const DEFAULT_MESOCYCLE_WEEKS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export interface BuildQueueInputs {
  clientId: string;
  templateId: string;
  skeleton: SessionSkeleton;
  mesocycleIndex: number;            // 1 za prvi mezociklus
  startDate: Date;                    // referenca za scheduledDate (ne za prikaz)
  weeksInMesocycle?: number;          // default 7 (pocetnici.md: 6 load + 1 deload)
}

// ============================================================================
// buildMesocycleQueue — glavni entry point
// ============================================================================

export function buildMesocycleQueue(input: BuildQueueInputs): MesocycleQueue {
  const weeks = input.weeksInMesocycle ?? DEFAULT_MESOCYCLE_WEEKS;
  validateSkeleton(input.skeleton);
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
    // pocetnici.md §2.2.A — BAB weekly rotacija (A-4, 2026-05-08).
    // Za 3-day FullBody beginner protokol (ABA shape: [A, B, A]):
    //   Neparne nedelje (1, 3, 5, 7) → ABA (originalna)
    //   Parne nedelje (2, 4, 6)      → BAB (swap content of [0]/[2] sa [1])
    // Volume balance — svaki obrazac pokreta se uvežbava ~1.5x nedeljno.
    const orderedDays = applyBabRotation(trainingDays, week);

    orderedDays.forEach((day, dayIdx) => {
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
// validateSkeleton — guardrail za skeleton struktura (P2-8, 2026-05-08)
// ============================================================================
//
// Bug u session_template skeletonu može da silently producira pogrešan queue
// (npr. 4 dana × 7 nedelja = 28 sesija ali skeleton ima samo 6 dana). Ovaj
// validator hvata greške early sa jasnom porukom umesto da onboarding tiho
// uspeh-u sa polomljenim queue-om.

// ============================================================================
// applyBabRotation — pocetnici.md §2.2.A (A-4, 2026-05-08)
// ============================================================================
//
// Za 3-day FullBody skeleton sa [A, B, A] redom:
//   Neparne nedelje (week % 2 === 1)  → ABA (originalno)
//   Parne nedelje   (week % 2 === 0)  → BAB (Day 1 dobija B content, Day 3 A,
//                                            Day 5 B)
//
// Swap se radi samo na `exerciseSlots` i `dayRole` da bi `dayIndex` (kalendar)
// ostao stabilan. Ne radi nista za 4+ dnevne skeletons (BAB je beginner_3
// pattern, intermediate koristi U/L split koji nema rotaciju).

function applyBabRotation(
  trainingDays: SkeletonDay[],
  weekNumber1Based: number,
): SkeletonDay[] {
  if (trainingDays.length !== 3) return trainingDays;
  const isBabWeek = weekNumber1Based % 2 === 0;
  if (!isBabWeek) return trainingDays;

  const a = trainingDays[0];
  const b = trainingDays[1];
  // Day 1 → B content, Day 3 → A content, Day 5 → B content
  return [
    { ...a, exerciseSlots: b.exerciseSlots, dayRole: b.dayRole },
    { ...b, exerciseSlots: a.exerciseSlots, dayRole: a.dayRole },
    { ...trainingDays[2], exerciseSlots: b.exerciseSlots, dayRole: b.dayRole },
  ];
}

function validateSkeleton(skeleton: SessionSkeleton): void {
  if (skeleton.days.length !== 7) {
    throw new Error(
      `validateSkeleton: skeleton "${skeleton.id}" mora imati tačno 7 dana ` +
      `(jedna nedelja), ima ${skeleton.days.length}.`,
    );
  }
  const trainingCount = skeleton.days.filter(d => d.dayType !== 'Rest').length;
  if (trainingCount !== skeleton.daysPerWeek) {
    throw new Error(
      `validateSkeleton: skeleton "${skeleton.id}" daysPerWeek=${skeleton.daysPerWeek} ` +
      `ne odgovara broju non-Rest dana (${trainingCount}).`,
    );
  }
  const dayIndices = skeleton.days.map(d => d.dayIndex).sort((a, b) => a - b);
  for (let i = 0; i < 7; i++) {
    if (dayIndices[i] !== i + 1) {
      throw new Error(
        `validateSkeleton: skeleton "${skeleton.id}" dayIndex mora biti 1..7 ` +
        `unique, dobijeno: [${dayIndices.join(',')}].`,
      );
    }
  }
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
