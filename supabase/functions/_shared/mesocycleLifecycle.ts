// ============================================================================
// _shared/mesocycleLifecycle.ts — Deno port za `mesocycle-tick` Edge Function
// ============================================================================
//
// Razlog duplikata (isti kao za _shared/movingAverage.ts i _shared/queueAdvance.ts):
//   Deno Edge Runtime ne može direktno da importuje iz `src/utils/training/...`
//   (`@/` alias + React tip zavisnosti). Standardni Supabase idiom: shared
//   logika ide u `supabase/functions/_shared/`.
//
//   Source of truth: `src/utils/training/mesocycleLifecycle.ts` (pokriveno
//   Vitest-om — mesocycleLifecycle.test.ts). Ovo je verbatim port: algoritam
//   je IDENTIČAN, samo su import-i inline-ovani i zavisnosti (buildMesocycleQueue)
//   takođe portovani u ovaj fajl.
// ============================================================================

// ----------------------------------------------------------------------------
// Tipovi (minimalan subset potreban za lifecycle rollover)
// ----------------------------------------------------------------------------

export type Partition = 'Lower' | 'Upper' | 'FullBody';
export type DayType =
  | 'FullBody' | 'Upper' | 'Lower' | 'Push' | 'Pull' | 'Legs' | 'Rest';
export type DayRole = 'Heavy' | 'Light' | 'Tension' | 'Stretch' | 'Pump';
export type ExperienceLevel = 'beginner' | 'intermediate';
export type CalorieTargetMode =
  | 'deficit' | 'recomposition' | 'lean_bulk' | 'maintenance';
export type RepRangeZone = 'strength' | 'hypertrophy' | 'metabolic';

export interface SkeletonDay {
  dayIndex: number;
  dayType: DayType;
  dayRole?: DayRole;
  defaultRepRangeZone: RepRangeZone;
  targetRIR: number;
  exerciseSlots: unknown[];
}

export interface SessionSkeleton {
  id: string;
  level: ExperienceLevel;
  daysPerWeek: 3 | 4 | 5;
  name: string;
  periodizationType: 'linear' | 'undulating' | 'mixed';
  days: SkeletonDay[];
}

export interface QueuedSession {
  sessionId: string;
  label: string;
  dayType: DayType;
  partition: Partition;
  dayRole?: DayRole;
  status: 'completed' | 'next' | 'pending';
  scheduledDate: string | Date;
  shiftedFrom?: string | Date | null;
  isDeloadWeek?: boolean;
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

const DEFAULT_MESOCYCLE_WEEKS = 4;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ----------------------------------------------------------------------------
// derivePartition — verbatim port iz queueBuilder.ts
// ----------------------------------------------------------------------------

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
      throw new Error('derivePartition: Rest day ne moze biti queued session.');
  }
}

function displayPartition(dayType: DayType): string {
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

function buildSessionLabel(day: SkeletonDay): string {
  const partitionName = displayPartition(day.dayType);
  return day.dayRole ? `${partitionName} — ${day.dayRole}` : partitionName;
}

// ----------------------------------------------------------------------------
// buildMesocycleQueue — verbatim port iz queueBuilder.ts
// ----------------------------------------------------------------------------

interface BuildQueueInputs {
  clientId: string;
  templateId: string;
  skeleton: SessionSkeleton;
  mesocycleIndex: number;
  startDate: Date;
  weeksInMesocycle?: number;
}

function buildMesocycleQueue(input: BuildQueueInputs): MesocycleQueue {
  const weeks = input.weeksInMesocycle ?? DEFAULT_MESOCYCLE_WEEKS;
  const trainingDays = input.skeleton.days.filter((d) => d.dayType !== 'Rest');

  if (trainingDays.length === 0) {
    throw new Error(
      `buildMesocycleQueue: skeleton "${input.skeleton.id}" nema training dana ` +
        `(svih ${input.skeleton.days.length} dana je tipa Rest).`,
    );
  }

  const sessions: QueuedSession[] = [];
  const cycleLetter = (idx: number) => String.fromCharCode(65 + idx);

  for (let week = 1; week <= weeks; week++) {
    trainingDays.forEach((day, dayIdx) => {
      const partition = derivePartition(day);
      const sessionLabel = `${cycleLetter(dayIdx)}${week}`;
      const scheduledDate = new Date(
        input.startDate.getTime() + ((week - 1) * 7 + day.dayIndex - 1) * MS_PER_DAY,
      );

      sessions.push({
        sessionId: sessionLabel,
        label: buildSessionLabel(day),
        dayType: day.dayType,
        partition,
        dayRole: day.dayRole,
        status: sessions.length === 0 ? 'next' : 'pending',
        scheduledDate,
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

// ----------------------------------------------------------------------------
// shouldStartDeload — verbatim port
// ----------------------------------------------------------------------------

export type DeloadReason =
  | 'week_4_of_mesocycle'
  | 'not_yet'
  | 'lean_bulk_no_deload';

export interface ShouldStartDeloadResult {
  shouldStart: boolean;
  reason: DeloadReason;
}

export function shouldStartDeload(
  currentMicrocycleIndex: number,
  mesocycleWeeks: number = DEFAULT_MESOCYCLE_WEEKS,
  targetMode: CalorieTargetMode = 'deficit',
): ShouldStartDeloadResult {
  if (targetMode === 'lean_bulk') {
    return { shouldStart: false, reason: 'lean_bulk_no_deload' };
  }

  if (currentMicrocycleIndex === mesocycleWeeks - 1) {
    return { shouldStart: true, reason: 'week_4_of_mesocycle' };
  }

  return { shouldStart: false, reason: 'not_yet' };
}

// ----------------------------------------------------------------------------
// handleMesocycleEnd — verbatim port
// ----------------------------------------------------------------------------

export interface MesocycleEndProfile {
  experienceLevel: ExperienceLevel;
  daysPerWeek: 3 | 4 | 5;
  activeTemplateId: string;
}

export interface HandleMesocycleEndResult {
  newQueue: MesocycleQueue;
  mesocycleJustEnded: boolean;
}

export function handleMesocycleEnd(
  queue: MesocycleQueue,
  profile: MesocycleEndProfile,
  skeleton: SessionSkeleton,
  mesocycleWeeks: number = DEFAULT_MESOCYCLE_WEEKS,
): HandleMesocycleEndResult {
  if (queue.sessionPointer < queue.sessions.length) {
    return { newQueue: queue, mesocycleJustEnded: false };
  }

  const startDate = new Date();

  const rawQueue = buildMesocycleQueue({
    clientId: queue.clientId,
    templateId: profile.activeTemplateId,
    skeleton,
    mesocycleIndex: queue.mesocycleIndex + 1,
    startDate,
    weeksInMesocycle: mesocycleWeeks,
  });

  const sessionsPerWeek = rawQueue.sessions.length / mesocycleWeeks;
  const deloadStartIndex = rawQueue.sessions.length - sessionsPerWeek;

  const sessionsWithDeload: QueuedSession[] = rawQueue.sessions.map((s, i) => {
    if (i >= deloadStartIndex) {
      return { ...s, isDeloadWeek: true };
    }
    return s;
  });

  const newQueue: MesocycleQueue = {
    ...rawQueue,
    sessions: sessionsWithDeload,
  };

  return { newQueue, mesocycleJustEnded: true };
}

// ----------------------------------------------------------------------------
// hasMesocycleEnded — convenience helper
// ----------------------------------------------------------------------------

export function hasMesocycleEnded(queue: MesocycleQueue): boolean {
  return queue.sessionPointer >= queue.sessions.length;
}
