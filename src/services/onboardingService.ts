// ============================================================================
// onboardingService — orkestrator zavrsnog onboarding flow-a
// Spec: 03_INTEGRATION_LAYER.md Sekcija 7.4 (Onboarding pipeline)
// ============================================================================
//
// Kad klijentkinja zavrsi 12-step quiz + signup:
//   1. handle_new_user trigger je vec kreirao profile red (auth.uid())
//   2. Update profile sa onboarding podacima (experience, goal, metabolic, ...)
//   3. initUserStatus — kreira default UserStatus
//   4. Snapshot template za poziciju → buildMesocycleQueue → save u status
//   5. runSyncRules — primeni sva pravila (cycle phase, fatigue, ...)
//   6. Save UserStatus
//
// Zavisi od auth.uid() postoji (klijentkinja je ulogovana). Ako nije,
// throw greska sa jasnom porukom za UI.
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { UserStatus } from '@/types/userStatus';
import type { TemplatePosition, ExperienceLevel, PrimaryGoal, MetabolicCondition } from '@/types/training';
import { initUserStatus, saveUserStatus } from '@/utils/db/userStatus';
import { getActiveTemplate, assignTemplateToClient } from '@/utils/db/sessionTemplates';
import { buildMesocycleQueue } from '@/utils/training/queueBuilder';
import { calcRecoveryMultiplier } from '@/utils/training/recoveryCalibration';
import { calcBmrTdeeFromProfile } from '@/utils/nutrition/bmrTdee';
import { resolveTargetMode } from '@/utils/nutrition/calorieTarget';
import { calcCycleDay, getCyclePhase } from '@/utils/nutrition/cyclePhase';
import { runSyncRules, EventBus } from '@/utils/sync/syncEngine';

// ============================================================================
// CompleteOnboardingInput — sve sto onboarding skuplja
// ============================================================================

export interface CompleteOnboardingInput {
  clientId: string;                       // auth.uid() iz Supabase Auth
  firstName: string;
  lastName?: string;

  // Bio
  dateOfBirth: string;                    // YYYY-MM-DD
  weightKg: number;
  heightCm: number;

  // Sloj 1 (Training)
  experienceLevel: ExperienceLevel;
  trainingDays: 3 | 4 | 5;
  primaryGoal: PrimaryGoal;

  // Sloj 2 (Bio filter)
  metabolicConditions: MetabolicCondition[];
  injuries: string[];
  allergies: string[];
  foodDislikes?: string[];

  // Sloj 3 (Recovery)
  sleepHoursAvg: number;                  // 0–14
  stressLevel: 1 | 2 | 3 | 4 | 5;
  jobPhysicality?: 'sedentary' | 'moderate' | 'active';

  // Cycle Tracker (Spec 02 Sekcija 2.2 — POSLEDNJI korak, opcioni)
  cycleTrackingEnabled: boolean;
  lastPeriodStart?: string;               // YYYY-MM-DD ako enabled
}

export interface CompleteOnboardingResult {
  status: UserStatus;
  templateAssigned: boolean;
  warnings: string[];
}

// ============================================================================
// completeOnboarding — glavni orkestrator
// ============================================================================

export async function completeOnboarding(
  input: CompleteOnboardingInput,
): Promise<CompleteOnboardingResult> {
  const warnings: string[] = [];
  const age = calcAgeFromDOB(input.dateOfBirth);

  // 1. Update profile sa onboarding podacima
  // (handle_new_user trigger je vec napravio osnovni red sa email-om)
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({
      first_name: input.firstName,
      last_name: input.lastName ?? null,
      date_of_birth: input.dateOfBirth,
      current_weight: input.weightKg,
      height: input.heightCm,
      experience_level: input.experienceLevel,
      training_days: input.trainingDays,
      primary_goal: input.primaryGoal,
      metabolic_conditions: input.metabolicConditions,
      injuries: input.injuries,
      allergies: input.allergies,
      food_dislikes: input.foodDislikes ?? [],
      sleep_hours_avg: input.sleepHoursAvg,
      stress_level: input.stressLevel,
      job_physicality: input.jobPhysicality ?? 'sedentary',
      cycle_tracking_enabled: input.cycleTrackingEnabled,
      last_period_start: input.cycleTrackingEnabled ? input.lastPeriodStart ?? null : null,
    })
    .eq('id', input.clientId);

  if (profileErr) {
    throw new Error(`completeOnboarding: profile update failed: ${profileErr.message}`);
  }

  // 2. Init UserStatus
  let status = await initUserStatus({
    clientId: input.clientId,
    weight: input.weightKg,
    height: input.heightCm,
    age,
  });

  // 3. Popuni bio sa pravim onboarding vrednostima (initUserStatus je default-i)
  status.bio.sleepLast7DaysAvg = input.sleepHoursAvg;
  status.bio.stressLast7DaysAvg = input.stressLevel;
  status.bio.recoveryMultiplier = calcRecoveryMultiplier({
    sleepHoursAvg: input.sleepHoursAvg,
    stressLevel: input.stressLevel,
    age,
    metabolicConditions: input.metabolicConditions,
  });

  // Cycle phase ako je tracker aktivan
  if (input.cycleTrackingEnabled && input.lastPeriodStart) {
    const cycleDay = calcCycleDay(new Date(input.lastPeriodStart), new Date());
    if (cycleDay !== null) {
      status.bio.cycleDay = cycleDay;
      status.bio.cyclePhase = getCyclePhase(cycleDay);
    }
  }

  // 4. Bmr/Tdee + target mode
  const { bmr, tdee } = calcBmrTdeeFromProfile({
    clientId: input.clientId,
    gender: 'female',
    age,
    weight: input.weightKg,
    height: input.heightCm,
    bmi: input.weightKg / Math.pow(input.heightCm / 100, 2),
    experienceLevel: input.experienceLevel,
    trainingDays: input.trainingDays,
    primaryGoal: input.primaryGoal,
    metabolicConditions: input.metabolicConditions,
    injuries: [],
    allergies: input.allergies,
    sleepHoursAvg: input.sleepHoursAvg,
    stressLevel: input.stressLevel,
    jobPhysicality: input.jobPhysicality ?? 'sedentary',
    cycleTrackingEnabled: input.cycleTrackingEnabled,
    recoveryMultiplier: status.bio.recoveryMultiplier,
    strengthTier: input.experienceLevel === 'beginner' ? 'novice' : 'competent',
  });
  status.nutrition.bmr = bmr;
  status.nutrition.tdee = tdee;
  status.nutrition.targetMode = resolveTargetMode(input.primaryGoal);
  status.nutrition.metabolicFilter = input.metabolicConditions;

  // 5. Snapshot template za poziciju + buildMesocycleQueue
  const position: TemplatePosition = `${input.experienceLevel}_${input.trainingDays}` as TemplatePosition;
  status.training.position = position;
  status.training.daysPerWeek = input.trainingDays;

  try {
    const template = await getActiveTemplate(position);
    await assignTemplateToClient(input.clientId, template);
    status.training.activeTemplateId = template.id;
    status.training.queue = buildMesocycleQueue({
      clientId: input.clientId,
      templateId: template.id,
      // skeleton je JSONB; cast jer Faza 2 kompozicija ima TS skeleton tip
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      skeleton: template.skeleton as any,
      mesocycleIndex: 1,
      startDate: new Date(),
    });
    if (status.training.queue.sessions.length > 0) {
      status.training.nextSessionId = status.training.queue.sessions[0].sessionId;
      status.training.nextSessionPartition = status.training.queue.sessions[0].partition;
    }
  } catch (err) {
    // Sistemski default-i jos nisu seedovani u bazu (Faza 2.4 followup).
    // Klijentkinja moze da nastavi onboarding — trener ce assign-ovati template
    // kasnije iz dashboard-a.
    warnings.push(
      `Nema active template-a za poziciju ${position}. ` +
      `Trener mora da assign-uje pre prvog treninga. ` +
      `(${err instanceof Error ? err.message : String(err)})`,
    );
  }

  // 6. Run sync rules — postavi sve sync flag-ove iz inicijalnog stanja
  status = await runSyncRules(status);

  // 7. Save
  await saveUserStatus(status);

  // 8. Auto-assign tier package (Faza D)
  // Bira najbolji entry/mid paket za korisnikove parametre.
  // High tier zahteva trainer manual approval — klijent ne ulazi automatski.
  // Failure ovde je SILENT — sistem radi i bez tier-a (algoritam je fallback).
  try {
    const { findAutoAssignmentPackage, assignPackageToClient } = await import(
      '@/services/packageService'
    );
    const matched = await findAutoAssignmentPackage({
      experienceLevel: input.experienceLevel,
      workoutFrequency: input.trainingDays,
    });
    if (matched) {
      await assignPackageToClient(input.clientId, matched.id, matched.tier);
    } else {
      await assignPackageToClient(input.clientId, null, 'entry');
    }
  } catch {
    // Silent — auto-assignment je nice-to-have. Algoritam fallback i dalje radi.
  }

  // 9. Emit ONBOARDING_COMPLETED event
  await EventBus.emit({
    type: 'ONBOARDING_COMPLETED',
    clientId: input.clientId,
  });

  return {
    status,
    templateAssigned: warnings.length === 0,
    warnings,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function calcAgeFromDOB(dob: string): number {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 30;     // sane default
  const ageMs = Date.now() - birth.getTime();
  return Math.max(16, Math.floor(ageMs / 31_557_600_000));
}
