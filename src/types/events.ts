// ============================================================================
// SystemEvent — discriminated union za EventBus
// Spec: 03_INTEGRATION_LAYER.md Sekcija 5.1
// ============================================================================
//
// EventBus radi pub/sub između modula. Training emituje WORKOUT_COMPLETED,
// Nutrition subscribe-uje da updatuje partitionLastSeen. Ovo je TIPSKA POVRŠINA
// — subscriberi importuju ovde i diskriminiraju po `type` polju.
//
// Princip: events.ts ne importuje iz training.ts ili nutrition.ts da ne bi
// stvorio cikličnu zavisnost. Koristimo string literal tipove direktno.
// ============================================================================

// === Training events ===

export interface WorkoutCompletedEvent {
  type: 'WORKOUT_COMPLETED';
  clientId: string;
  sessionId: string;
  partition: 'Lower' | 'Upper' | 'FullBody';
  completedAt: Date;
}

export interface DeloadActivatedEvent {
  type: 'DELOAD_ACTIVATED';
  clientId: string;
  reason: 'planned' | 'auto_triggered';
  mesocycleIndex: number;
}

export interface DeloadEndedEvent {
  type: 'DELOAD_ENDED';
  clientId: string;
}

export interface ReturnFromBreakStartedEvent {
  type: 'RETURN_FROM_BREAK_STARTED';
  clientId: string;
  partition: 'Lower' | 'Upper' | 'FullBody';
}

export interface ReturnFromBreakEndedEvent {
  type: 'RETURN_FROM_BREAK_ENDED';
  clientId: string;
  partition: 'Lower' | 'Upper' | 'FullBody';
}

export interface LevelUpAchievedEvent {
  type: 'LEVEL_UP_ACHIEVED';
  clientId: string;
  newLevel: 'intermediate';
}

export interface LevelDownTriggeredEvent {
  type: 'LEVEL_DOWN_TRIGGERED';
  clientId: string;
}

// === Nutrition events ===

export interface MealLoggedEvent {
  type: 'MEAL_LOGGED';
  clientId: string;
  mealId: string;
  status: 'logged' | 'skipped' | 'replaced';
  loggedAt: Date;
}

export interface MealSkippedEvent {
  type: 'MEAL_SKIPPED';
  clientId: string;
  mealId: string;
  isProtein: boolean;  // za red flag — preskočeni proteinski obroci više boli
}

export interface MetabolicNoiseTriggeredEvent {
  type: 'METABOLIC_NOISE_TRIGGERED';
  clientId: string;
  percentage: number;  // % dnevnog budžeta od tečnih kalorija
}

export interface WeeklyCheckInCompletedEvent {
  type: 'WEEKLY_CHECKIN_COMPLETED';
  clientId: string;
  weekIndex: number;
  weightKg: number;
}

export interface PlanAdjustmentAppliedEvent {
  type: 'PLAN_ADJUSTMENT_APPLIED';
  clientId: string;
  delta: number;     // promena dnevnog kcal target-a
  reason: string;    // 'weekly_checkin' | 'fatigue_sync' | 'cycle_modifier' | ...
}

// === Lifecycle events ===

export interface OnboardingCompletedEvent {
  type: 'ONBOARDING_COMPLETED';
  clientId: string;
}

export interface TrialDayRemainingEvent {
  type: 'TRIAL_DAY_REMAINING';
  clientId: string;
  daysLeft: number;
}

export interface PauseStartedEvent {
  type: 'PAUSE_STARTED';
  clientId: string;
  pauseType: 'illness' | 'travel' | 'other';
  startDate: Date;
}

export interface PauseEndedEvent {
  type: 'PAUSE_ENDED';
  clientId: string;
}

// === Sync events (interno, emit-uju se iz runSyncRules) ===

export interface TrainingIntensityReduceEvent {
  type: 'TRAINING_INTENSITY_REDUCE';
  clientId: string;
  reason: 'luteal_phase' | 'low_recovery' | 'illness';
  reduction: number;  // npr. 0.05 za -5%
}

export interface TrainingVolumeReduceEvent {
  type: 'TRAINING_VOLUME_REDUCE';
  clientId: string;
  reason: 'low_recovery' | 'metabolic_noise' | string;
  reduction: number;  // npr. 0.15 za -15%
}

export interface HydrationFirstWarningEvent {
  type: 'HYDRATION_FIRST_WARNING';
  clientId: string;
  message: string;
}

// ============================================================================
// Diskriminirana unija — ovo je tip koji EventBus prima i emituje
// ============================================================================

export type SystemEvent =
  // Training
  | WorkoutCompletedEvent
  | DeloadActivatedEvent
  | DeloadEndedEvent
  | ReturnFromBreakStartedEvent
  | ReturnFromBreakEndedEvent
  | LevelUpAchievedEvent
  | LevelDownTriggeredEvent
  // Nutrition
  | MealLoggedEvent
  | MealSkippedEvent
  | MetabolicNoiseTriggeredEvent
  | WeeklyCheckInCompletedEvent
  | PlanAdjustmentAppliedEvent
  // Lifecycle
  | OnboardingCompletedEvent
  | TrialDayRemainingEvent
  | PauseStartedEvent
  | PauseEndedEvent
  // Sync (interno)
  | TrainingIntensityReduceEvent
  | TrainingVolumeReduceEvent
  | HydrationFirstWarningEvent;

export type SystemEventType = SystemEvent['type'];

// Type helper — extract konkretan event tip iz tagovane unije
export type EventOfType<T extends SystemEventType> = Extract<SystemEvent, { type: T }>;

// Handler signature — koristi se u EventBus.subscribe<T>(...)
export type EventHandler<T extends SystemEventType> = (event: EventOfType<T>) => Promise<void>;
