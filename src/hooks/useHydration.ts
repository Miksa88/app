// ============================================================================
// useHydration — derive hydration state iz UserStatus (IT-14)
// Spec: 02_NUTRITION_FLOW_MASTER.md §8.1 (Hydration baseline + training bonus)
// ============================================================================
//
// Derivacija:
//   hydrationMl       = status.nutrition.hydrationTodayMl ?? 0
//   weightForTarget   = status.bio.currentWeightMA5
//                       ?? (status.bio as any).currentWeight  -- not present on type
//                       ?? DEFAULT_WEIGHT_KG
//   isTrainingDay     = today matches scheduledDate of session at queue.sessionPointer
//                       (alpha-simple derive; post-beta će koristiti tačniji cron
//                       baziran flag — N-X)
//   targetMl          = calcHydrationTarget(weightForTarget, isTrainingDay)
//   glasses           = floor(hydrationMl / GLASS_ML)
//   targetGlasses     = ceil(targetMl / GLASS_ML)
//
// Napomena o isTrainingDay:
//   Spec 02 §8.1 zahteva +500ml bonus na dan treninga. Najjednostavnija i
//   dovoljno tačna derivacija za alpha:
//     const pointerSession = queue.sessions[queue.sessionPointer];
//     if (pointerSession.scheduledDate === today) → trening dan (sesija pending/next).
//   Ako je sesija za danas već završena (completedAt set), queue.sessionPointer
//   je već napredovao; tada proveravamo partitionLastSeen u bilo kojoj particiji
//   — ako postoji unos sa današnjim datumom, danas je bio trening dan.
// ============================================================================

import { DEFAULT_GLASS_ML } from "@/hooks/mutations/useLogWaterGlass";
import { useUserStatus } from "@/hooks/useUserStatus";
import { calcHydrationTarget } from "@/utils/nutrition/hydration";

import type { UserStatus } from "@/types/userStatus";

/** Fallback weight ako status nema currentWeightMA5 (edge: fresh user, bez weight loga). */
const DEFAULT_WEIGHT_KG = 60;

export interface UseHydrationResult {
  hydrationMl: number;
  targetMl: number;
  glasses: number;
  targetGlasses: number;
  isTrainingDay: boolean;
  isLoading: boolean;
}

// ============================================================================
// Pure helpers (testable bez React-a)
// ============================================================================

/**
 * Vraca ISO YYYY-MM-DD string iz Date objekta (local calendar day).
 * Ne koristimo toISOString jer to vraca UTC; hydration je dnevni koncept i
 * user očekuje lokalni dan (ako klijentkinja ima workout zakazan u 7AM lokalno,
 * to je trening dan po njenoj percepciji).
 */
function toLocalDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Da li je today trening dan za klijentkinju — derive iz queue state-a.
 * Pure funkcija (izvučena radi test-ability).
 */
export function deriveIsTrainingDayFromStatus(
  status: UserStatus,
  now: Date = new Date(),
): boolean {
  const todayKey = toLocalDateKey(now);

  // Primary signal: sesija na pointer-u ima scheduledDate == danas
  const queue = status.training.queue;
  if (queue && Array.isArray(queue.sessions)) {
    const pointer = queue.sessionPointer ?? status.training.sessionPointer ?? 0;
    const pointerSession = queue.sessions[pointer];
    if (pointerSession?.scheduledDate instanceof Date) {
      if (toLocalDateKey(pointerSession.scheduledDate) === todayKey) {
        return true;
      }
    } else if (pointerSession?.scheduledDate) {
      // Defensive: ako je scheduledDate došao kao ISO string (deserializer miss)
      const d = new Date(pointerSession.scheduledDate as unknown as string);
      if (!isNaN(d.getTime()) && toLocalDateKey(d) === todayKey) {
        return true;
      }
    }
  }

  // Fallback: ako je trening već završen danas, partitionLastSeen[x].date === danas
  const seen = status.training.partitionLastSeen;
  if (seen) {
    for (const key of Object.keys(seen) as Array<keyof typeof seen>) {
      const entry = seen[key];
      if (entry?.date instanceof Date) {
        if (toLocalDateKey(entry.date) === todayKey) return true;
      } else if (entry?.date) {
        const d = new Date(entry.date as unknown as string);
        if (!isNaN(d.getTime()) && toLocalDateKey(d) === todayKey) return true;
      }
    }
  }

  return false;
}

/**
 * Derive hydration view-model iz UserStatus-a. Pure — ekstra test-able.
 */
export function deriveHydrationView(
  status: UserStatus,
  now: Date = new Date(),
): Omit<UseHydrationResult, "isLoading"> {
  const isTrainingDay = deriveIsTrainingDayFromStatus(status, now);
  const weightKg =
    status.bio.currentWeightMA5 && status.bio.currentWeightMA5 > 0
      ? status.bio.currentWeightMA5
      : DEFAULT_WEIGHT_KG;

  const targetMl = calcHydrationTarget(weightKg, isTrainingDay);
  const hydrationMl = Math.max(0, status.nutrition.hydrationTodayMl ?? 0);

  return {
    hydrationMl,
    targetMl,
    glasses: Math.floor(hydrationMl / DEFAULT_GLASS_ML),
    targetGlasses: Math.ceil(targetMl / DEFAULT_GLASS_ML),
    isTrainingDay,
  };
}

// ============================================================================
// React hook
// ============================================================================

export function useHydration(clientId: string | null): UseHydrationResult {
  const { status, isLoading } = useUserStatus(clientId);

  if (!status) {
    return {
      hydrationMl: 0,
      targetMl: calcHydrationTarget(DEFAULT_WEIGHT_KG, false),
      glasses: 0,
      targetGlasses: Math.ceil(
        calcHydrationTarget(DEFAULT_WEIGHT_KG, false) / DEFAULT_GLASS_ML,
      ),
      isTrainingDay: false,
      isLoading,
    };
  }

  return {
    ...deriveHydrationView(status),
    isLoading,
  };
}
