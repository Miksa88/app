// ============================================================================
// UserStatus — Single Source of Truth
// Spec: 03_INTEGRATION_LAYER.md Sekcija 2 (Centralni UserStatus objekat)
// ============================================================================
//
// Ovo je tipska reprezentacija status_json kolone u Supabase user_status tabeli.
// Sav read/write ide kroz Sync Engine — nikad direktno mimo `runSyncRules()`.
//
// Persistencija: jedan red po klijentkinji, JSONB. Tri GENERATED kolone u DB
// (is_in_deload, is_at_risk, cycle_phase) su denormalizovan view za upite —
// ne menjati ih ručno, automatski se rekomputuju iz status_json.
// ============================================================================

import type {
  Partition,
  TemplatePosition,
  PauseType,
  MesocycleQueue,
  MetabolicCondition,
} from './training';

import type {
  CalorieTargetMode,
  NutritionCyclePhase,
} from './nutrition';

// ============================================================================
// Sync rule names — string literali za clientOverrides polje
// (trener može da isključi konkretno pravilo za 1-na-1 klijentkinju)
// ============================================================================

export type SyncRuleName =
  | 'hormonal_sync'         // Rule 1 — luteal phase carb bonus
  | 'fatigue_sync'          // Rule 2 — sleep/stress → maintenance
  | 'deload_sync'           // Rule 3 — training deload → nutrition maintenance
  | 'return_from_break_sync' // Rule 4 — soft deficit on return
  | 'hydration_first'       // Rule 5 — block macro changes if dehydrated
  | 'metabolic_noise_block' // Rule 6 — block progression on noise
  | 'illness_penalty'       // Rule 7 — soft deficit during illness
  | 'cycle_menstrual_ignore'; // Rule 8 — weight unreliable in menstrual phase

// ============================================================================
// Bio sekcija — šta telo trenutno radi
// ============================================================================

export interface UserStatusBio {
  age: number;                          // years; ulazi u recoveryMultiplier (Sloj 3)
  currentWeightMA5: number;             // 5-day moving average
  weightTrend: 'losing' | 'maintaining' | 'gaining' | 'insufficient_data';
  weeklyWeightDelta: number;            // kg/nedelja na osnovu MA5

  cycleDay: number | null;              // null ako tracker nije aktivan
  cyclePhase: NutritionCyclePhase | null;
  weightDataReliable: boolean;          // false tokom menstrualne faze

  recoveryMultiplier: number;           // 0.7 – 1.1
  sleepLast7DaysAvg: number;            // sati
  stressLast7DaysAvg: number;           // 1–5
  hydrationLast7DaysAvgMl: number;      // ml

  /**
   * Pre-workout fatigue signal (klijent je pritisla "Umorna" pre treninga).
   * Postavlja se preko PreWorkoutFatigueDialog; čita ga programGenerator/DPO
   * i forsira MAINTAIN mode (bez progressive overload). Briše se u
   * process-workout-completion EF posle završene sesije.
   */
  preWorkoutFatigue?: boolean;
  preWorkoutFatigueAnsweredAt?: Date | null;

  /**
   * Latest pump_score iz post-workout 3-button feedbacka (pocetnici.md §4.3 +
   * §5.1). Mapuje "Lako/Taman/Teško" na 8/5/2. Konsumuje ga
   * applyBiofeedbackReactiveRules: pump<5 → +so+voda pre treninga, +ovas
   * Obrok 5; pump<5 + DOMS<3 = under-recovery refeed kandidat.
   */
  latestPumpScore?: number | null;

  /**
   * Counter uzastopnih "Teško" feedback-ova posle treninga (pump_score == 2).
   * pocetnici.md §4.4 + SREDNJE_NAPREDNE_V2 §4.4: DOMS > 8 dva treninga
   * zaredom → smanji volumen za 1 seriju po vežbi (chronic underrecovery).
   * Resetuje se na 0 kad klijent prijavi "Lako" ili "Taman".
   */
  consecutiveHardWorkouts?: number;

  /**
   * Najnoviji libido score (1-10) iz WeeklyCheckIn. pocetnici.md §4.3:
   * pad libida (<4/10) je crveni signal preagresivnog deficita → pauseSmartCut.
   */
  latestLibidoScore?: number | null;

  /**
   * Najnoviji subjektivni water-retention score (1-10) iz WeeklyCheckIn.
   * pocetnici.md §4.3: >7 → waterRetentionAlert (pregled soli/alkohola/sna,
   * NE smanjivati hidrate — kortizol driven).
   */
  latestWaterRetentionScore?: number | null;
}

// ============================================================================
// Training sekcija — pozicija u programu + queue + pauze
// ============================================================================

export interface UserStatusTraining {
  activeTemplateId: string;             // koji template je snapshot-ovan
  position: TemplatePosition;

  // Frekvencija sesija u nedelji (3/4/5). Denormalizovano iz skeleton-a zarad
  // čistog pure-mapper API-ja (WeeklyCalendar). Piše se pri initUserStatus
  // i ne menja se osim promene template-a (novi mezociklus).
  daysPerWeek: 3 | 4 | 5;

  // Queue živi UNUTAR ovog objekta (Sekcija 2.2 spec-a 03 + arhitektonska
  // odluka: JSONB persistencija, NE zasebna tabela)
  queue: MesocycleQueue;

  // Brzi accessor-i (denormalizovani iz queue-a, ali korisni za UI)
  sessionPointer: number;
  nextSessionId: string;                // npr. "A3"
  nextSessionPartition: Partition;

  partitionLastSeen: {
    Lower?: { date: Date; sessionId: string };
    Upper?: { date: Date; sessionId: string };
    FullBody?: { date: Date; sessionId: string };
  };

  isInDeload: boolean;                  // KRITIČAN flag za nutrition sync
  isInReturnFromBreak: boolean;
  currentMesocycleIndex: number;
  currentMicrocycleIndex: number;

  // SREDNJE_NAPREDNE_V2 §5.4: OBAVEZAN Diet Break posle 4 mezociklusa.
  // 2 nedelje na maintenance kalorijama; resetuje T3/leptin, ginekološki "reset".
  // Auto-trigger u mesocycle-tick kad mesocyclesSinceDietBreak >= 4.
  dietBreakActive: boolean;
  dietBreakStartedAt: Date | null;
  mesocyclesSinceDietBreak: number;     // 0..4 — counter

  activePauseEvent: {
    type: PauseType | null;
    startDate: Date | null;
    penaltySessionsRemaining: number;
  } | null;
}

// ============================================================================
// Nutrition sekcija — sinhronizovan target + makro + filteri
// ============================================================================

export interface UserStatusNutrition {
  bmr: number;
  tdee: number;
  currentCalorieTarget: number;         // dnevni target (već prilagođen sync-om)
  targetMode: CalorieTargetMode;

  macros: {
    proteinG: number;
    carbsG: number;
    fatG: number;
  };

  metabolicFilter: MetabolicCondition[];
  isMetabolicNoiseTriggered: boolean;   // tečne kalorije > 10%
  hydrationTargetMl: number;
  hydrationTodayMl: number;

  measurementWeekActive: boolean;
  measurementWeekDay: number;           // 1–7 ili 0 ako nije aktivna
  daysSincePlanChange: number;          // za 10-day stagnation override

  // Smart Cut progresivni step:
  //   pocetnici.md §3.8 (beginner): 0=baseline, 1=fats, 2=+off-window, 3=+peri-workout
  //   SREDNJE_NAPREDNE_V2 §3.9 (intermediate): 0..4 — adds Step 3 mid-meals.
  // Trener ili weekly evaluation handler advancuje korak.
  currentSmartCutStep: 0 | 1 | 2 | 3 | 4;

  activeRefeedDay: boolean;

  // Interni flag-ovi koje setuju sync rules (za UI banner state)
  // _ prefix = "ne čitaj direktno iz UI-a, samo Sync Engine ih piše"
  _fatigueSyncActive?: boolean;
  _deloadSyncActive?: boolean;
  _returnSyncActive?: boolean;
}

// ============================================================================
// Red Flags sekcija — za trener dashboard
// ============================================================================

export interface UserStatusRedFlags {
  skipCount7d: number;                  // preskočeni obroci u 7 dana
  metabolicNoiseDays7d: number;
  energyBelowThreshold7d: number;       // dana energija < 5/10
  consecutiveFailedWorkouts: number;
  daysSinceLastWeeklyCheckIn: number;
  isAtRisk: boolean;                    // computed: any of above triggers attention
}

// ============================================================================
// UserStatus — kompozicija svih sekcija
// ============================================================================

export interface UserStatus {
  clientId: string;
  lastUpdatedAt: Date;

  bio: UserStatusBio;
  training: UserStatusTraining;
  nutrition: UserStatusNutrition;
  redFlags: UserStatusRedFlags;

  // Trener override (arhitektonska odluka): trener može da isključi
  // konkretne sync rule-ove za 1-na-1 premium klijentkinje. Svako pravilo
  // u runSyncRules proverava `if (status.clientOverrides.includes(ruleName)) return;`
  clientOverrides: SyncRuleName[];

  // Interni Sync Engine flag-ovi (privremeni blok-ovi)
  _blockMacroChangesUntil?: Date;       // Rule 5 hydration first → 24h
  _blockProgressionUntil?: Date;        // Rule 6 metabolic noise → 3 dana
}

// ============================================================================
// DB row shape — kako Supabase vraća red iz user_status tabele
// ============================================================================
//
// status_json je full UserStatus serijalizovan kao JSON. Datumi se serijalizuju
// kao ISO strings — load helper ih konvertuje nazad u Date instance pre nego
// što vrati TS tip.

export interface UserStatusRow {
  client_id: string;
  status_json: UserStatus;              // posle deserialization-a
  last_updated_at: string;              // ISO string iz DB-a
  created_at: string;
  // GENERATED kolone (read-only, DB ih derive-uje)
  is_in_deload: boolean;
  is_at_risk: boolean;
  cycle_phase: NutritionCyclePhase | null;
}
