// ============================================================================
// mesocycleLifecycle — kraj mezociklusa + deload week automatizacija
// Spec: 01_TRAINING_FLOW_MASTER.md §6.1 (Makrociklus default), §6.2 (Deload)
//       03_INTEGRATION_LAYER.md §3.2 Rule 3 (deload sync)
// ============================================================================
//
// Dva glavna zadatka:
//
//   1. `shouldStartDeload` — "Da li trenutna mikrociklus treba da bude deload?"
//      4-nedeljni mezociklus: poslednja (4.) nedelja = deload.
//      Lean bulk režim PRESKAĆE deload (kontinuirani rast u bulk fazi).
//
//   2. `handleMesocycleEnd` — "Queue je iscrpljen (pointer >= sessions.length),
//      kreiraj novi queue za sledeći mezo sa deload flag-om na poslednjoj
//      nedelji."
//
// Minimalno intruzivno: reuse `buildMesocycleQueue` iz queueBuilder.ts bez
// modifikacije; posle kreiranja new queue-a, dekorišemo sessions iz poslednje
// nedelje sa `isDeloadWeek: true`.
//
// Pure funkcije. Bez side-effect-a. Koristi ih Edge Function `mesocycle-tick`
// za cron-driven lifecycle rollover.
// ============================================================================

import type {
  MesocycleQueue,
  QueuedSession,
  SessionSkeleton,
  ExperienceLevel,
} from '@/types/training';
import type { CalorieTargetMode } from '@/types/nutrition';
import { buildMesocycleQueue } from './queueBuilder';

const DEFAULT_MESOCYCLE_WEEKS = 4;

// ============================================================================
// shouldStartDeload
// ============================================================================
//
// Vraća `shouldStart: true` kada je trenutni mikrociklus poslednji u
// mezociklusu (0-based: week 4 u 4-nedeljnom ciklusu => index 3).
// Lean bulk preskače deload — spec kaže "klijentkinja na bulk-u treba kalorije
// i u deloadu ostaje kalorijski isto".

export type DeloadReason =
  | 'week_4_of_mesocycle'
  | 'not_yet'
  | 'lean_bulk_no_deload';

export interface ShouldStartDeloadResult {
  shouldStart: boolean;
  reason: DeloadReason;
}

export function shouldStartDeload(
  currentMicrocycleIndex: number,   // 0-based (0, 1, 2, 3)
  mesocycleWeeks: number = DEFAULT_MESOCYCLE_WEEKS,
  targetMode: CalorieTargetMode = 'deficit',
): ShouldStartDeloadResult {
  if (targetMode === 'lean_bulk') {
    return { shouldStart: false, reason: 'lean_bulk_no_deload' };
  }

  // Poslednji mikrociklus (0-based): index === weeks-1
  if (currentMicrocycleIndex === mesocycleWeeks - 1) {
    return { shouldStart: true, reason: 'week_4_of_mesocycle' };
  }

  return { shouldStart: false, reason: 'not_yet' };
}

// ============================================================================
// handleMesocycleEnd
// ============================================================================
//
// Ulaz: `queue` čiji pointer je potencijalno na kraju (pointer >= length).
// Ako jeste — kreira novi queue preko `buildMesocycleQueue` i markira sessions
// iz poslednje nedelje kao `isDeloadWeek: true`.
// Ako nije (mid-cycle call) — vraća isti queue + `mesocycleJustEnded: false`.

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
  // Mid-cycle: ništa za uraditi
  if (queue.sessionPointer < queue.sessions.length) {
    return { newQueue: queue, mesocycleJustEnded: false };
  }

  // Kraj mezociklusa — rolluj novi queue
  // Startni datum: ili `completedAt` + 1 dan ili `now`.
  // Koristi `now` kao bezbedan default — precizan kalendarski rolling datum
  // je briga ili Edge Function-a (koji zna današnji dan) ili kasnijih shift-ova.
  const startDate = new Date();

  const rawQueue = buildMesocycleQueue({
    clientId: queue.clientId,
    templateId: profile.activeTemplateId,
    skeleton,
    mesocycleIndex: queue.mesocycleIndex + 1,
    startDate,
    weeksInMesocycle: mesocycleWeeks,
  });

  // Broj sesija po nedelji = sesije / nedelje (Rest dani su filtrirani u
  // builder-u, tako da je total sessions = trainingDaysPerWeek × weeks).
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

// ============================================================================
// hasMesocycleEnded — convenience helper
// ============================================================================
//
// Mali pure boolean koji EF (mesocycle-tick) i bilo koji UI consumer mogu da
// koriste umesto da rucno porede `pointer` i `length`. Mirror onoga sto stoji
// u `supabase/functions/_shared/mesocycleLifecycle.ts` (Deno port) tako da
// _shared file zaista ostane verbatim port `src/`-a.

export function hasMesocycleEnded(queue: MesocycleQueue): boolean {
  return queue.sessionPointer >= queue.sessions.length;
}
