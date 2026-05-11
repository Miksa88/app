// ============================================================================
// userStatus DB helpers — load / save / init / update
// Spec: 03_INTEGRATION_LAYER.md Sekcija 2 (UserStatus lifecycle)
// ============================================================================
//
// PRINCIPI:
//
// 1. SAV WRITE U user_status IDE KROZ OVE FUNKCIJE.
//    Direktan supabase.from('user_status').update(...) je bug — zaobilazi
//    Sync Engine i krši Pravilo 1 iz spec-a 03 (jedan writer po podatku).
//
// 2. updateUserStatus pattern: load → mutate → runSyncRules → save.
//    Mutator funkcija je čist data transform; orchestracija oko nje (load,
//    sync rules, save) je deo helper-a. Time se sprečava da pozivajuća
//    strana zaboravi da pokrene sync rules.
//
// 3. Datumi se serijalizuju u/iz JSONB-a kao ISO string-ovi automatski.
//    JS `JSON.stringify(date)` daje ISO; `JSON.parse` ga vraća kao string —
//    deserializeStatus rekurzivno konvertuje označene Date polja nazad.
// ============================================================================

import type {
  UserStatus,
  UserStatusBio,
  UserStatusTraining,
  UserStatusNutrition,
  UserStatusRedFlags,
} from '@/types/userStatus';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// ============================================================================
// Serialize / Deserialize — Date ↔ ISO konverzija
// ============================================================================
//
// Polja koja sadrže Date instance (puna lista ovde da bi parser znao gde da
// konvertuje). Ako dodaješ novo Date polje u UserStatus, dodaj ga ovde takođe.

const DATE_PATHS: ReadonlyArray<string[]> = [
  ['lastUpdatedAt'],
  ['training', 'partitionLastSeen', 'Lower', 'date'],
  ['training', 'partitionLastSeen', 'Upper', 'date'],
  ['training', 'partitionLastSeen', 'FullBody', 'date'],
  ['training', 'activePauseEvent', 'startDate'],
  ['training', 'queue', 'createdAt'],
  ['training', 'queue', 'completedAt'],
  ['training', 'queue', 'partitionLastSeen', 'Lower', 'date'],
  ['training', 'queue', 'partitionLastSeen', 'Upper', 'date'],
  ['training', 'queue', 'partitionLastSeen', 'FullBody', 'date'],
  ['_blockMacroChangesUntil'],
  ['_blockProgressionUntil'],
];

// Queue.sessions[*].scheduledDate i completedAt se obrađuju posebno
// (varijabilni indeks kroz array).

// Generic path traversal — `unknown` na ulazu i postupna provera tipa kroz
// path-ove je čistije nego `any`, ali za ovu specifičnu in-place mutaciju
// preko različitih shape-ova `any` je opravdano. Lokalizovano u 2 funkcije.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNested(obj: any, path: string[]): unknown {
  let cur = obj;
  for (const key of path) {
    if (cur == null) return undefined;
    cur = cur[key];
  }
  return cur;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setNested(obj: any, path: string[], value: unknown): void {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (cur[path[i]] == null) return; // ne pravi nove path-ove
    cur = cur[path[i]];
  }
  cur[path[path.length - 1]] = value;
}

// Eksportovano sa `_` prefix-om — interno koriste load/save, ali eksposujem
// radi unit testova roundtrip-a (Date ↔ ISO konverzija je glavni rizik baga)
export function _deserializeStatus(raw: unknown): UserStatus {
  return deserializeStatusInternal(raw);
}

export function _serializeStatus(status: UserStatus): unknown {
  return serializeStatusInternal(status);
}

function deserializeStatusInternal(raw: unknown): UserStatus {
  // Plitka kopija — radimo in-place mutate-ove
  const status = JSON.parse(JSON.stringify(raw)) as UserStatus;

  for (const path of DATE_PATHS) {
    const val = getNested(status, path);
    if (typeof val === 'string') {
      setNested(status, path, new Date(val));
    }
  }

  // Queue.sessions array — varijabilna dužina, konvertujemo Date polja kroz cast
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queueSessions = (status as any)?.training?.queue?.sessions;
  if (Array.isArray(queueSessions)) {
    for (const session of queueSessions) {
      if (typeof session.scheduledDate === 'string') {
        session.scheduledDate = new Date(session.scheduledDate);
      }
      if (typeof session.completedAt === 'string') {
        session.completedAt = new Date(session.completedAt);
      }
    }
  }

  return status;
}

// JSON.stringify već konvertuje Date u ISO string automatski, pa serialize
// je čista pass-through. Eksplicitno označeno radi simetrije sa deserialize.
function serializeStatusInternal(status: UserStatus): unknown {
  return JSON.parse(JSON.stringify(status));
}

// ============================================================================
// loadUserStatus — pročitaj iz DB-a
// ============================================================================

export async function loadUserStatus(clientId: string): Promise<UserStatus | null> {
  const { data, error } = await supabase
    .from('user_status')
    .select('client_id, status_json, last_updated_at')
    .eq('client_id', clientId)
    .maybeSingle();

  if (error) {
    throw new Error(`loadUserStatus(${clientId}) failed: ${error.message}`);
  }

  if (!data) return null;

  const status = deserializeStatusInternal(data.status_json);
  // last_updated_at iz top-level kolone overrides JSONB verziju
  // (DB trigger garantuje da je top-level kolona uvek tačna)
  status.lastUpdatedAt = new Date(data.last_updated_at);

  return status;
}

// ============================================================================
// saveUserStatus — upsert (atomic write)
// ============================================================================

export async function saveUserStatus(status: UserStatus): Promise<void> {
  // Postavi lastUpdatedAt na current time (DB trigger će ga ipak postaviti,
  // ali ovo garantuje konzistentnost između JSONB i top-level kolone)
  status.lastUpdatedAt = new Date();

  const { error } = await supabase
    .from('user_status')
    .upsert({
      client_id: status.clientId,
      status_json: serializeStatusInternal(status) as Json,
      last_updated_at: status.lastUpdatedAt.toISOString(),
    }, { onConflict: 'client_id' });

  if (error) {
    throw new Error(`saveUserStatus(${status.clientId}) failed: ${error.message}`);
  }
}

// ============================================================================
// initUserStatus — kreiraj default status posle završetka onboarding-a
// ============================================================================
//
// Ova funkcija STAVLJA klijentkinju u "valid empty" stanje. Pozivalac
// (`onboardingService.completeOnboarding`) popunjava prave vrednosti odmah
// posle ovog poziva — recoveryMultiplier preko `calcRecoveryMultiplier`,
// BMR/TDEE preko `calcBmrTdeeFromProfile`, queue preko `buildMesocycleQueue`,
// position/targetMode iz onboarding input-a. Ne menjati default-e ovde bez
// odgovarajuce promene u onboardingService.

export interface InitUserStatusInput {
  clientId: string;
  // Minimalan profile podaci potrebni za inicijalan UserStatus
  // (popunjava se iz profiles tabele kroz onboarding pipeline)
  weight: number;
  height: number;
  age: number;
}

export async function initUserStatus(input: InitUserStatusInput): Promise<UserStatus> {
  const now = new Date();

  const bio: UserStatusBio = {
    age: input.age,                  // ulazi u recoveryMultiplier formulu
    currentWeightMA5: input.weight,  // jedan datapoint = MA5 = current
    weightTrend: 'insufficient_data',
    weeklyWeightDelta: 0,
    cycleDay: null,
    cyclePhase: null,
    weightDataReliable: true,
    recoveryMultiplier: 1.0, // overwritten by onboardingService.calcRecoveryMultiplier
    sleepLast7DaysAvg: 7,    // overwritten by onboardingService from input.sleepHoursAvg
    stressLast7DaysAvg: 3,   // overwritten by onboardingService from input.stressLevel
    hydrationLast7DaysAvgMl: input.weight * 35, // 35ml/kg approximation
  };

  const training: UserStatusTraining = {
    activeTemplateId: '',     // overwritten by onboardingService.getActiveTemplate
    position: 'beginner_3',   // overwritten by onboardingService from experienceLevel + trainingDays
    daysPerWeek: 3,           // overwritten by onboardingService from input.trainingDays
    queue: {
      // overwritten by onboardingService.buildMesocycleQueue
      clientId: input.clientId,
      mesocycleIndex: 1,
      templateId: '',
      sessions: [],
      sessionPointer: 0,
      currentMicrocycleIndex: 0,
      swapUsedThisMicrocycle: false,
      partitionLastSeen: {},
      returnFromBreakCountdown: {},
      createdAt: now,
      completedAt: null,
    },
    sessionPointer: 0,
    nextSessionId: '',
    nextSessionPartition: 'FullBody',
    partitionLastSeen: {},
    isInDeload: false,
    isInReturnFromBreak: false,
    currentMesocycleIndex: 1,
    currentMicrocycleIndex: 0,
    activePauseEvent: null,
    dietBreakActive: false,
    dietBreakStartedAt: null,
    mesocyclesSinceDietBreak: 0,
  };

  // Mifflin-St Jeor BMR placeholder — pravi calcBMR ide u Fazu 2
  const bmrPlaceholder = Math.round(
    (10 * input.weight) + (6.25 * input.height) - (5 * input.age) - 161
  );

  const nutrition: UserStatusNutrition = {
    bmr: bmrPlaceholder,
    tdee: Math.round(bmrPlaceholder * 1.375), // sedentary baseline
    currentCalorieTarget: Math.max(Math.round(bmrPlaceholder * 1.375), 1400),
    targetMode: 'maintenance', // overwritten by onboardingService.resolveTargetMode
    macros: {
      // overwritten by onboardingService with full split via calcBmrTdee
      proteinG: Math.round(input.weight * 2.0),
      carbsG: 0,
      fatG: Math.round(input.weight * 0.9),
    },
    metabolicFilter: [],
    isMetabolicNoiseTriggered: false,
    hydrationTargetMl: input.weight * 35,
    hydrationTodayMl: 0,
    measurementWeekActive: true, // prva nedelja je uvek measurement week
    measurementWeekDay: 1,
    daysSincePlanChange: 0,
    currentSmartCutStep: 0,            // pocetnici.md §3.8: baseline maintenance
    activeRefeedDay: false,
  };

  const redFlags: UserStatusRedFlags = {
    skipCount7d: 0,
    metabolicNoiseDays7d: 0,
    energyBelowThreshold7d: 0,
    consecutiveFailedWorkouts: 0,
    daysSinceLastWeeklyCheckIn: 0,
    isAtRisk: false,
  };

  const status: UserStatus = {
    clientId: input.clientId,
    lastUpdatedAt: now,
    bio,
    training,
    nutrition,
    redFlags,
    clientOverrides: [],
  };

  await saveUserStatus(status);
  return status;
}

// ============================================================================
// updateUserStatus — load + mutate + save pattern
// ============================================================================
//
// Mutator je čist sync transformer. Pre save-a, OPCIONO se pokreće runSyncRules
// (ako je impl prosleđen). U Fazi 1 sync engine ne postoji, pa parameter ostaje
// opcionalan; u Fazi 2 helper poziva se OBAVEZNO sa runSyncRules.

export type StatusMutator = (status: UserStatus) => void | Promise<void>;
// SyncRulesRunner: vraca novi UserStatus (immutable pattern — Sync Engine
// klone-ira pa modifikuje, NE mutira ulaz)
export type SyncRulesRunner = (status: UserStatus) => Promise<UserStatus>;

export async function updateUserStatus(
  clientId: string,
  mutator: StatusMutator,
  runSyncRules?: SyncRulesRunner,
): Promise<UserStatus> {
  const status = await loadUserStatus(clientId);

  if (!status) {
    throw new Error(`updateUserStatus(${clientId}) failed: status ne postoji. Pozovi initUserStatus prvo.`);
  }

  await mutator(status);

  // Sync rules vraca NOVI status (immutable). Ako je runner prosledjen,
  // koristimo njegov izlaz; inace cuvamo direktno mutated status.
  const finalStatus = runSyncRules ? await runSyncRules(status) : status;

  await saveUserStatus(finalStatus);
  return finalStatus;
}
