// ============================================================================
// useDailyCheckIn — mutation hook za dnevni check-in
// Spec: 02_NUTRITION_FLOW_MASTER.md §10, §13
//       03_INTEGRATION_LAYER.md §3.1 (DailyCheckIn flow)
// ============================================================================
//
// Orkestracija (opcija A'' iz IT-4 arhitektonske odluke):
//
//   1. POST na Edge Function `process-daily-check-in` → DB writes
//      (daily_check_ins + weight_logs) + compute MA5 i 7-day avg-ove.
//   2. loadUserStatus(clientId) — učitaj trenutni UserStatus iz DB-a.
//   3. applyDailyCheckIn(status, checkIn) — pure transformer iz Sync Engine-a
//      (vraća newStatus sa mock MA5/avg vrednostima).
//   4. PATCH newStatus sa realnim vrednostima iz koraka 1. Ako je EF vratio
//      null (nedovoljno istorije za MA5), čuvamo mock vrednosti iz koraka 3.
//   5. Rekompjutuj recoveryMultiplier sa patched sleep/stress vrednostima
//      — formulu zavisi od 7-day avg-ova, ne od jedne dnevne vrednosti.
//   6. POST na `save-user-status` Edge Function → DB upsert + Realtime push.
//
// Zašto se zovu DVA Edge Function-a:
// - `process-daily-check-in` je compute-only (IT-4 decision) jer syncEngine
//   živi u src/ stack-u (Node/Vite) i ne može se direktno importovati iz
//   Deno Edge Runtime-a.
// - `save-user-status` je separated writer jer user_status tabela nema
//   INSERT/UPDATE policy za authenticated role; samo service_role iz Edge
//   Function-a sme da piše (Princip 1 iz spec-a 03: "jedan writer po podatku").
//
// Error handling:
// - Ako koji god EF failuje → throw; useMutation.error state + toast.error.
// - Ako process-daily-check-in uspe ali save-user-status failuje → weight_logs
//   i daily_check_ins su već zapisani (append-only tabele). Ne rollback-ujemo
//   ih — sledeći run hook-a će učitati te podatke i pokušati ponovo compute +
//   save. Sync Engine je idempotentan pa duplicate run daje isti finalni
//   UserStatus.
// ============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { loadUserStatus } from "@/utils/db/userStatus";
import { applyDailyCheckIn } from "@/utils/sync/syncEngine";
import { calcRecoveryMultiplier } from "@/utils/training/recoveryCalibration";

import type { DailyCheckIn } from "@/types/nutrition";
import type { UserStatus } from "@/types/userStatus";

// ============================================================================
// Types
// ============================================================================

/**
 * Compute response koji vraća Edge Function `process-daily-check-in`.
 *
 * `ma5` i 7-day avg-ovi mogu biti `null` kad je istorija kraća od praga
 * (5 pouzdanih uzoraka za MA5, ili 0 non-menstrual dana za sleep/stress).
 * U tom slučaju hook koristi mock vrednosti iz `applyDailyCheckIn` transformera.
 */
export interface ProcessDailyCheckInResponse {
  ok: true;
  ma5: number | null;
  reliableSampleCount: number;
  sleepLast7DaysAvg: number | null;
  stressLast7DaysAvg: number | null;
  hydrationLast7DaysAvgMl: number | null;
}

/**
 * Dependency injection interface za testabilnost — omotava sve side-effect
 * pozive. Test prosleđuje mockovanu verziju; production hook default-a na
 * realne implementacije kroz `defaultDeps()`.
 */
export interface DailyCheckInDeps {
  invokeProcess: (
    checkIn: DailyCheckIn,
  ) => Promise<ProcessDailyCheckInResponse>;
  invokeSave: (status: UserStatus) => Promise<void>;
  loadStatus: (clientId: string) => Promise<UserStatus | null>;
  applyCheckIn: (
    status: UserStatus,
    checkIn: DailyCheckIn,
  ) => Promise<UserStatus>;
}

// ============================================================================
// Pure orchestrator — testable bez React konteksta
// ============================================================================

/**
 * Centralna orchestracija IT-5 flow-a. Razdvojeno od useMutation wrappera da
 * bi se lakse testirala (bez QueryClientProvider-a u vitest-u).
 *
 * Koraci 1–6 iz file-level komentara.
 */
export async function runDailyCheckIn(
  clientId: string,
  checkIn: DailyCheckIn,
  deps: DailyCheckInDeps,
): Promise<UserStatus> {
  // 1. Compute Edge Function — DB writes + MA5/avg compute
  const computed = await deps.invokeProcess(checkIn);

  // 2. Load trenutni UserStatus (za pure transformer input)
  const currentStatus = await deps.loadStatus(clientId);
  if (!currentStatus) {
    throw new Error(
      `useDailyCheckIn: UserStatus ne postoji za clientId=${clientId}. ` +
      `Pozovi initUserStatus prvo.`,
    );
  }

  // 3. Pure transformer (applyDailyCheckIn — ne dira DB, samo data transform +
  //    runSyncRules unutra). Vraća newStatus sa mock MA5 (= checkIn.weightKg)
  //    i mock 7-day avg-ovima (= trenutne dnevne vrednosti).
  const transformed = await deps.applyCheckIn(currentStatus, checkIn);

  // 4. Patch newStatus realnim MA5/avg vrednostima iz EF compute-a.
  //    Fallback: ako je EF vratio null (nedovoljno istorije), zadrži mock
  //    vrednost iz transformer-a (npr. MA5 = checkIn.weightKg za prvi unos).
  const patched: UserStatus = {
    ...transformed,
    bio: {
      ...transformed.bio,
      currentWeightMA5: computed.ma5 ?? transformed.bio.currentWeightMA5,
      sleepLast7DaysAvg:
        computed.sleepLast7DaysAvg ?? transformed.bio.sleepLast7DaysAvg,
      stressLast7DaysAvg:
        computed.stressLast7DaysAvg ?? transformed.bio.stressLast7DaysAvg,
      hydrationLast7DaysAvgMl:
        computed.hydrationLast7DaysAvgMl ??
        transformed.bio.hydrationLast7DaysAvgMl,
    },
  };

  // 5. Rekompjutuj recoveryMultiplier sa patched 7-day avg-ovima.
  //    Formula zavisi od avg-ova (ne od dnevne tacke) — patch bez ovog koraka
  //    bi ostavio stale recovery iz transformer-a koji je radio sa mock
  //    jednodnevnim vrednostima.
  //
  //    IT-16: ako je aktivna illness pauza, prosledi -0.15 penalty u recovery
  //    formulu. syncEngine je no-touch zona pa se penalty aplicira ovde, posle
  //    applyDailyCheckIn transformera. Penalty je additivan PRE clamp-a u
  //    calcRecoveryMultiplier (videti recoveryCalibration.ts).
  const illnessPenalty =
    patched.training.activePauseEvent?.type === 'illness' ? -0.15 : 0;

  patched.bio.recoveryMultiplier = calcRecoveryMultiplier({
    sleepHoursAvg: patched.bio.sleepLast7DaysAvg,
    stressLevel: patched.bio.stressLast7DaysAvg,
    age: patched.bio.age,
    metabolicConditions: patched.nutrition.metabolicFilter,
    illnessPenalty,
  });

  // 6. Perzistuj kroz save-user-status Edge Function
  await deps.invokeSave(patched);

  return patched;
}

// ============================================================================
// Production deps — realni Supabase pozivi
// ============================================================================

function defaultDeps(): DailyCheckInDeps {
  return {
    invokeProcess: async (checkIn) => {
      const { data, error } = await supabase.functions.invoke(
        "process-daily-check-in",
        {
          body: {
            // Edge Function očekuje `date` kao YYYY-MM-DD string
            date: toIsoDate(checkIn.date),
            weightKg: checkIn.weightKg,
            sleepHours: checkIn.sleepHours,
            stressLevel: checkIn.stressLevel,
            energyLevel: checkIn.energyLevel,
            waterIntakeMl: checkIn.waterIntakeMl,
            cycleDay: checkIn.cycleDay ?? null,
          },
        },
      );
      if (error) {
        throw new Error(
          `process-daily-check-in failed: ${error.message ?? String(error)}`,
        );
      }
      if (!data || !(data as ProcessDailyCheckInResponse).ok) {
        throw new Error("process-daily-check-in returned invalid response");
      }
      return data as ProcessDailyCheckInResponse;
    },

    invokeSave: async (status) => {
      const { error } = await supabase.functions.invoke("save-user-status", {
        body: { status },
      });
      if (error) {
        throw new Error(
          `save-user-status failed: ${error.message ?? String(error)}`,
        );
      }
    },

    loadStatus: loadUserStatus,
    applyCheckIn: applyDailyCheckIn,
  };
}

function toIsoDate(d: Date): string {
  // YYYY-MM-DD u lokalnoj vremenskoj zoni (Edge Function očekuje datum
  // kalendarskog dana, ne UTC instant — inace bi klijentkinja u +2h zoni
  // u 00:30 lokalno videla juče umesto danas).
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ============================================================================
// React Query hook — tanak wrapper oko runDailyCheckIn
// ============================================================================

export interface UseDailyCheckInOptions {
  /** Dependency override — za testove. Production ostavi undefined. */
  deps?: DailyCheckInDeps;
  /**
   * Skip-uj toast (za nested scenarije gde pozivalac sam prikazuje feedback).
   * Default false → mutation throw-a toast.error pri grešci.
   */
  silent?: boolean;
}

export function useDailyCheckIn(
  clientId: string,
  options: UseDailyCheckInOptions = {},
) {
  const queryClient = useQueryClient();
  const deps = options.deps ?? defaultDeps();

  return useMutation<UserStatus, Error, DailyCheckIn>({
    mutationFn: (checkIn) => runDailyCheckIn(clientId, checkIn, deps),
    onSuccess: () => {
      // Realtime push već osvežava useUserStatus subscription; invalidation
      // je defensive za slučaj da je subscription pao (mobile backgrounding).
      queryClient.invalidateQueries({ queryKey: ["userStatus", clientId] });
    },
    onError: (err) => {
      if (!options.silent) {
        toast.error("Check-in nije sačuvan", {
          description: err.message,
        });
      }
    },
  });
}
