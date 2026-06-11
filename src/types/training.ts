// ============================================================================
// Training types
// Spec: 01_TRAINING_FLOW_MASTER.md Sekcija 4 (Data modeli)
// ============================================================================

// ============================================================================
// Pozicije i osnovni enum-i
// ============================================================================

export type TemplatePosition =
  | 'beginner_3'
  | 'beginner_4'
  | 'intermediate_4'
  | 'intermediate_5';

export type ExperienceLevel = 'beginner' | 'intermediate';

export type PrimaryGoal = 'glute_focus' | 'tone' | 'fat_loss';

export type GoalOverlay = 'GLUTE_FOCUS' | 'TONE' | 'FAT_LOSS';

export type Partition = 'Lower' | 'Upper' | 'FullBody';

export type DayType = 'FullBody' | 'Upper' | 'Lower' | 'Push' | 'Pull' | 'Legs' | 'Rest';

export type DayRole = 'Heavy' | 'Light' | 'Tension' | 'Stretch' | 'Pump';

export type RepRangeZone = 'strength' | 'hypertrophy' | 'metabolic';

export type SlotPriority = 'primary' | 'secondary' | 'isolation' | 'finisher';

export type LoadingMode = 'PROGRESS' | 'MAINTAIN' | 'MINI_DELOAD';

export type PauseType = 'illness' | 'travel' | 'other';

// ============================================================================
// Movement patterns (Sekcija 4.2)
// Pretagovano u exercise library — algoritam matchuje slot.movementPattern
// sa exercise.movementPattern
// ============================================================================

export type MovementPattern =
  | 'knee_dominant'        // squat, leg press, lunge
  | 'hip_dominant'         // RDL, deadlift
  | 'hip_extension'        // hip thrust, donkey kick, reverse hyper (glute fokus)
  | 'horizontal_push'      // bench, push-up, chest press
  | 'vertical_push'        // OHP, shoulder press
  | 'horizontal_pull'      // row
  | 'vertical_pull'        // pulldown, pullup
  | 'abduction'            // hip abduction, side-lying abduction
  | 'adduction'
  | 'core_antirotation'    // plank, pallof press
  | 'core_flexion'         // crunch, hanging leg raise
  | 'calf_raise'
  | 'isolation_biceps'
  | 'isolation_triceps'
  | 'isolation_rear_delt'
  | 'isolation_lateral_delt'
  | 'carry'
  | 'cardio_liss'
  | 'cardio_hiit';

export type MuscleGroup =
  | 'quads' | 'hamstrings' | 'glutes' | 'glutes_med' | 'calves'
  | 'chest' | 'back_lats' | 'back_upper' | 'back_lower'
  | 'shoulders_front' | 'shoulders_side' | 'shoulders_rear'
  | 'biceps' | 'triceps' | 'forearms'
  | 'core' | 'obliques'
  | 'full_body';

export type Equipment =
  | 'barbell' | 'dumbbell' | 'kettlebell' | 'machine' | 'cable' | 'bench'
  | 'rack' | 'bodyweight' | 'band' | 'smith';

// Kontraindikacije i povrede (Sekcija 4.1)
export type InjuryTag =
  | 'lower_back'
  | 'knee_general'
  | 'knee_acl'
  | 'knee_meniscus'
  | 'shoulder_impingement'
  | 'shoulder_rotator'
  | 'wrist'
  | 'hip'
  | 'ankle'
  | 'neck'
  | 'none';

export type MetabolicCondition =
  | 'none'
  | 'insulin_resistance'
  | 'hashimoto'
  | 'hypertension'
  | 'pcos'
  | 'anemia'         // pocetnici.md §1.1 — Fe deficit (E-2, 2026-05-08)
  | 'other';

export type StrengthTier = 'novice' | 'learner' | 'competent' | 'proficient' | 'advanced';

// Cycle phase (Sekcija 5 + integration)
// Spec 01 Sekcija 5 koristi finije faze za volume calibration; spec 03
// koristi 4-phase enum za sync rules. Držimo 4-phase kao primarni i
// dodajemo `late_follicular`/`late_luteal` kada nam treba precizniji
// volume bonus/penalty (Tabela u Sekciji 5).
export type CyclePhase =
  | 'menstrual'         // 1–5
  | 'follicular'        // 6–13 (early i late zajedno)
  | 'ovulation'         // 14
  | 'luteal';           // 15–28 (early i late zajedno)

// ============================================================================
// ClientTrainingProfile (Sekcija 4.1)
// ============================================================================

export interface ClientTrainingProfile {
  clientId: string;
  gender: 'female';     // hardcoded za MVP
  age: number;
  weight: number;       // kg
  height: number;       // cm
  bmi: number;          // izvedeno

  // Sloj 1
  experienceLevel: ExperienceLevel;
  trainingDays: 3 | 4 | 5;
  primaryGoal: PrimaryGoal;

  // Sloj 2
  metabolicConditions: MetabolicCondition[];
  injuries: InjuryTag[];
  allergies: string[];  // koristi nutrition modul

  // Sloj 3
  sleepHoursAvg: number;
  stressLevel: number;  // 1–5
  jobPhysicality: 'sedentary' | 'moderate' | 'active';
  cycleTrackingEnabled: boolean;
  cycleStartDate?: Date;

  // Izvedeni
  recoveryMultiplier: number;  // 0.7 – 1.1
  strengthTier: StrengthTier;

  /**
   * Pre-workout fatigue signal (klijent je rekla "Umorna" pre treninga).
   * Kad je true, DPO forsira MAINTAIN — bez progressive overload.
   * Briše se posle završetka treninga (process-workout-completion EF).
   */
  preWorkoutFatigue?: boolean;

  /**
   * Counter uzastopnih "Teško" post-workout feedback-ova. Kad >= 2,
   * calibrateVolume smanjuje serije za 1 (chronic DOMS protection,
   * pocetnici.md §4.4).
   */
  consecutiveHardWorkouts?: number;
}

// ============================================================================
// SessionSkeleton + ExerciseSlot (Sekcija 4.2)
// ============================================================================

export interface ExerciseSlot {
  slotIndex: number;
  movementPattern: MovementPattern;
  muscleGroup: MuscleGroup;
  setsRange: [min: number, max: number];
  repRange: [min: number, max: number];
  priority: SlotPriority;

  // pocetnici.md §2.2.C — Tempo string "ekc-pause_dno-konc-pause_vrh"
  // Default 2-0-2-0 za compound, 2-1-2-1 za Hip Thrust pause variant,
  // 3-0-1-0 za RDL stretch emphasis, 2-0-2-2 za abdukcija sustained tension.
  tempo?: string;

  // pocetnici.md §2.2.B — Ramp-up serije (50%×10-12, 75%×4-6) pre prve radne.
  // Generišu se runtime u programGenerator-u za compound vežbe.
  rampUpSets?: Array<{
    weightPct: number;        // 0.50 ili 0.75 — % radne težine
    reps: number;             // ciljani broj ponavljanja
    targetRest: number;       // pauza posle, u sekundama
  }>;

  // Popunjava se runtime u algoritmu (nije deo template-a)
  chosenExerciseId?: number;
  finalSets?: number;
  targetReps?: string;
  targetWeight?: number | null;
  targetRIR?: number;
  targetRest?: number;
  targetTempo?: string;
  loadingNote?: string;
}

export interface SkeletonDay {
  dayIndex: number;
  dayType: DayType;
  dayRole?: DayRole;
  defaultRepRangeZone: RepRangeZone;
  targetRIR: number;
  exerciseSlots: ExerciseSlot[];
}

export interface SessionSkeleton {
  id: string;            // 'BEG_FB_3', 'INT_LULUL_5'
  level: ExperienceLevel;
  daysPerWeek: 3 | 4 | 5;
  name: string;
  periodizationType: 'linear' | 'undulating' | 'mixed';
  days: SkeletonDay[];
}

// ============================================================================
// SessionTemplate (Sekcija 4.3) — wrapper oko Skeleton-a sa metadatima
// ============================================================================

export interface SessionTemplate {
  id: string;
  name: string;
  position: TemplatePosition;
  status: 'active' | 'inactive';
  isSystemDefault: boolean;
  trainerId: string | null;
  skeleton: SessionSkeleton;
  compatibleOverlays: GoalOverlay[];
  createdAt: Date;
  activatedAt: Date | null;
  deactivatedAt: Date | null;
}

export interface ClientTemplateAssignment {
  clientId: string;
  assignedTemplateId: string;
  assignedAt: Date;
  position: TemplatePosition;
  macrocycleEndsAt: Date | null;
}

// ============================================================================
// Exercise Library (Sekcija 4.4)
// ============================================================================

export type TensionProfile = 'stretch' | 'shortened' | 'mid_range' | 'full_rom';

export interface Exercise {
  id: number;
  name: string;
  nameSr: string;

  isSystemExercise: boolean;
  createdByTrainerId: string | null;

  movementPattern: MovementPattern;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];

  tensionProfile: TensionProfile;
  cnsLoad: 1 | 2 | 3 | 4 | 5;
  fatigueIndex: 1 | 2 | 3 | 4 | 5;

  equipment: Equipment[];
  difficulty: 'beginner_safe' | 'intermediate' | 'advanced';
  requiresStabilization: boolean;

  contraindications: InjuryTag[];
  gentleOn: InjuryTag[];

  weightIncrement: number;
  isBilateral: boolean;

  videoUrl: string | null;
  instructions: string;

  isGluteBuilder: boolean;
  isCompound: boolean;
  isFinisherEligible: boolean;
}

// ============================================================================
// Mesocycle (Sekcija 4.5)
// ============================================================================

export interface Mesocycle {
  index: number;
  durationWeeks: number;
  focus: 'hypertrophy_accumulation' | 'hypertrophy_intensification' | 'strength_base';
  volumeProgression: 'linear_up' | 'undulating' | 'plateau';
  intensityProgression: 'linear_up' | 'undulating';
  deloadAtEnd: boolean;
}

// ============================================================================
// MesocycleQueue (Sekcija 4.7) — srce Queue sistema
// Persistencija: živi unutar UserStatus.training.queue (JSONB), NE u zasebnoj
// tabeli. Sva mutacija je atomic kroz Sync Engine.
// ============================================================================

export interface QueuedSession {
  sessionId: string;     // 'A1', 'B1', 'A2'... unikatno u queue-u
  label: string;         // 'Lower — Tension', 'Upper — Heavy'
  dayType: DayType;
  partition: Partition;
  dayRole?: DayRole;
  status: 'completed' | 'next' | 'pending';

  // Kalendarski slot u trenutnoj nedelji — UI koristi za WeeklyCalendar mapper.
  // Hibridni model (Faza 4.3): queue pointer je biologija, scheduledDate je
  // kalendar. Shift logika pomera scheduledDate kad sesija bude preskočena.
  scheduledDate: Date;

  // Set kad je sesija shift-ovana iz prošlog datuma (missed / pauseEvent).
  // UI prikazuje diskretan orange dot ako je != null.
  shiftedFrom?: Date | null;

  // IT-15: deload week flag. Set na sesije iz poslednje nedelje mezociklusa
  // kad `handleMesocycleEnd` rolluje novi queue. UI / programGenerator
  // mogu da koriste ovo za volume (-50%) i intensity (-10%) redukciju.
  // Spec 01 §6.1 — 4. nedelja u 4-nedeljnom ciklusu postaje deload.
  isDeloadWeek?: boolean;

  // Posle završetka
  completedAt: Date | null;
  actualWorkoutSessionId: string | null;
}

// Audit trail shift-ova (Faza 4.3 hibridni model). Trener dashboard koristi
// ovo za timeline; klijentkinja ne vidi direktno.
export type ShiftReason = 'missed' | 'illness_pause' | 'travel_pause' | 'manual_trainer';

export interface ShiftHistoryEntry {
  sessionId: string;
  originalDate: Date;
  newDate: Date;
  reason: ShiftReason;
  shiftedAt: Date;
}

export interface MesocycleQueue {
  clientId: string;
  mesocycleIndex: number;
  templateId: string;     // snapshot

  sessions: QueuedSession[];
  sessionPointer: number; // 0-based index trenutno aktivne sesije

  // Swap tracking (Sekcija 5 — Korak 2.5)
  currentMicrocycleIndex: number;
  swapUsedThisMicrocycle: boolean;

  // Partition tracking — KLJUČNO za partition-specific Decay
  partitionLastSeen: {
    Lower?: { sessionId: string; date: Date };
    Upper?: { sessionId: string; date: Date };
    FullBody?: { sessionId: string; date: Date };
  };

  // Return from Break tracking (Sekcija 7.5)
  returnFromBreakCountdown: {
    Lower?: number;       // 0–2
    Upper?: number;
    FullBody?: number;
  };

  // Audit trail svih shift-ova sesija (trener timeline)
  shiftHistory?: ShiftHistoryEntry[];

  createdAt: Date;
  completedAt: Date | null;
}

// ============================================================================
// PauseEvent (Sekcija 4.8) — bolest vs putovanje
// ============================================================================

export interface PauseEvent {
  id: string;
  clientId: string;
  pauseType: PauseType;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  recoveryPenalty: number;          // 0 za travel, -0.15 za illness
  penaltySessionsRemaining: number; // 2 za illness, 0 za travel
  notes?: string;
}

// ============================================================================
// WorkoutSession (Sekcija 4.6) — šta korisnik vidi tokom treninga
// ============================================================================

export interface SetLog {
  setNumber: number;
  weight: number;
  reps: number;
  rir?: number;
  done: boolean;
  completedAt?: Date;
}

export interface ExerciseInstance {
  exerciseId: number;
  name: string;
  slotIndex: number;
  targetSets: number;
  targetReps: string;
  targetWeight: number | null;
  targetRIR: number;
  targetRest: number;
  targetTempo: string;
  notes: string;
  substitutionNote?: string;
  loggedSets: SetLog[];
}

export interface WorkoutSectionInstance {
  name: string;        // 'Warmup', 'Main', 'Finisher'
  exercises: ExerciseInstance[];
}

export interface WorkoutSession {
  id: string;
  programId: string;
  scheduledDate: Date;
  microcycleIndex: number;
  dayInMicrocycle: number;
  dayType: DayType;
  sections: WorkoutSectionInstance[];
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: Date;
}
