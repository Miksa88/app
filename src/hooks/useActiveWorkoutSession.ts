// ============================================================================
// useActiveWorkoutSession — orkestrator "sta da prikazemo u ActiveWorkout.tsx"
// Spec: 01_TRAINING_FLOW_MASTER.md §5 Korak 2.5 + §5 Korak 6 (DPO)
// ============================================================================
//
// IT-9: ova kuka skupi sve sto ActiveWorkout.tsx treba da renderuje realan
// trening:
//   1. Sledecu sesiju iz queue-a (useNextSession)
//   2. UserStatus (useUserStatus) — za queue + sync flag-ove
//   3. Profil iz `profiles` tabele — za ClientTrainingProfile derive
//   4. Snapshot-ovani SessionTemplate iz session_templates (skeleton JSONB)
//   5. Exercise library (listSystemExercisesWithUuids) + UUID map
//   6. Per-exercise istoriju setova (loadExerciseHistory) u paralel
//
// Onda poziva `generateSessionSkeleton` da bi popunio targetWeight/targetReps/
// targetRIR po slot-u, i vraca MATERIALIZED slotove za dan = session.dayType.
//
// Sve query-je ide preko @tanstack/react-query tako da je caching i refetch
// deterministicki; promena clientId-a trigger-uje re-fetch.
// ============================================================================

import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { useUserStatus } from './useUserStatus';
import { useNextSession } from './useNextSession';
import { supabase } from '@/integrations/supabase/client';
import { getTemplateById } from '@/utils/db/sessionTemplates';
import { listSystemExercisesWithUuids } from '@/utils/db/exerciseLibrary';
import { loadExerciseHistory } from '@/utils/db/exerciseHistory';
import { generateSessionSkeleton } from '@/utils/training/programGenerator';
import { calcRecoveryMultiplier } from '@/utils/training/recoveryCalibration';
import type {
  ClientTrainingProfile,
  ExerciseSlot,
  MetabolicCondition,
  PrimaryGoal,
  QueuedSession,
  SessionSkeleton,
  GoalOverlay,
  StrengthTier,
  ExperienceLevel,
  InjuryTag,
} from '@/types/training';
import type { ExerciseHistorySample } from '@/utils/training/dpoCalculator';
import type { LoadingMode } from '@/utils/training/dpoCalculator';

// ============================================================================
// Profile row (subset koji nas interesuje za ClientTrainingProfile derive)
// ============================================================================

interface ProfileRow {
  id: string;
  current_weight: number | null;
  height: number | null;
  date_of_birth: string | null;
  experience_level: ExperienceLevel | null;
  training_days: number | null;
  primary_goal: PrimaryGoal | null;
  metabolic_conditions: string[] | null;
  injuries: string[] | null;
  allergies: string[] | null;
  sleep_hours_avg: number | null;
  stress_level: number | null;
  job_physicality: 'sedentary' | 'moderate' | 'active' | null;
  cycle_tracking_enabled: boolean | null;
  last_period_start: string | null;
}

async function loadProfileRow(clientId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, current_weight, height, date_of_birth, experience_level, ' +
      'training_days, primary_goal, metabolic_conditions, injuries, ' +
      'allergies, sleep_hours_avg, stress_level, job_physicality, ' +
      'cycle_tracking_enabled, last_period_start',
    )
    .eq('id', clientId)
    .maybeSingle();

  if (error) throw new Error(`loadProfileRow: ${error.message}`);
  return (data as ProfileRow | null) ?? null;
}

function calcAgeFromDOB(dob: string | null): number {
  if (!dob) return 30; // safe fallback
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

function deriveTrainingProfile(
  clientId: string,
  row: ProfileRow,
): ClientTrainingProfile {
  const weight = row.current_weight ?? 65;
  const height = row.height ?? 165;
  const age = calcAgeFromDOB(row.date_of_birth);
  const experienceLevel = row.experience_level ?? 'beginner';
  const metabolicConditions = (row.metabolic_conditions ?? []) as MetabolicCondition[];
  const sleepHoursAvg = row.sleep_hours_avg ?? 7;
  const stressLevel = (row.stress_level ?? 3) as 1 | 2 | 3 | 4 | 5;

  const recoveryMultiplier = calcRecoveryMultiplier({
    sleepHoursAvg,
    stressLevel,
    age,
    metabolicConditions,
  });

  const strengthTier: StrengthTier =
    experienceLevel === 'beginner' ? 'novice' : 'competent';

  return {
    clientId,
    gender: 'female',
    age,
    weight,
    height,
    bmi: weight / Math.pow(height / 100, 2),
    experienceLevel,
    trainingDays: (row.training_days ?? 3) as 3 | 4 | 5,
    primaryGoal: row.primary_goal ?? 'tone',
    metabolicConditions,
    injuries: (row.injuries ?? []) as InjuryTag[],
    allergies: row.allergies ?? [],
    sleepHoursAvg,
    stressLevel,
    jobPhysicality: row.job_physicality ?? 'sedentary',
    cycleTrackingEnabled: row.cycle_tracking_enabled ?? false,
    cycleStartDate: row.last_period_start ? new Date(row.last_period_start) : undefined,
    recoveryMultiplier,
    strengthTier,
  };
}

function goalToOverlay(goal: PrimaryGoal): GoalOverlay {
  switch (goal) {
    case 'glute_focus': return 'GLUTE_FOCUS';
    case 'tone': return 'TONE';
    case 'fat_loss': return 'FAT_LOSS';
  }
}

// ============================================================================
// ActiveWorkoutSessionData — sto hook vraca
// ============================================================================

export interface ActiveWorkoutSlot extends ExerciseSlot {
  /** DB UUID za exercise — koristi se kod useCompleteSet(exerciseId) */
  exerciseUuid: string | null;
  /** Razresen naziv vezbe (sa fallback-om na muscleGroup ako nije pronadjen) */
  exerciseName: string;
  exerciseNameSr: string;
  /** Rest period (default 60s ako slot ne specificira) */
  resolvedRest: number;
  /** Najveca tezina iz prethodne sesije za istu vezbu — null ako nema istorije */
  previousMaxWeight: number | null;
  /** ISO datum prethodne sesije sa istom vezbom — za "Pre 5 dana" hint */
  previousSessionDate: string | null;
}

export interface ActiveWorkoutSessionData {
  session: QueuedSession;
  slots: ActiveWorkoutSlot[];
  loadingMode: LoadingMode;
  targetRIR: number;
  dayLabel: string;
}

export interface UseActiveWorkoutSessionResult {
  data: ActiveWorkoutSessionData | null;
  isLoading: boolean;
  error: Error | null;
}

// Default rest (u sekundama) po slot prioritet-u. Ako skeleton nema targetRest,
// biramo po ovoj heuristici — kasnije moze da dodje iz loadParameters.
function defaultRest(priority: ExerciseSlot['priority']): number {
  switch (priority) {
    case 'primary': return 120;
    case 'secondary': return 90;
    case 'isolation': return 60;
    case 'finisher': return 45;
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useActiveWorkoutSession(): UseActiveWorkoutSessionResult {
  const { clientId } = useAuth();
  const { status, isLoading: statusLoading, error: statusError } =
    useUserStatus(clientId);
  const { session, isLoading: sessionLoading } = useNextSession(clientId);

  const queryEnabled = Boolean(
    clientId && status && session,
  );

  const query = useQuery<ActiveWorkoutSessionData, Error>({
    queryKey: [
      'activeWorkoutSession',
      clientId,
      status?.training.activeTemplateId,
      session?.sessionId,
    ],
    enabled: queryEnabled,
    queryFn: async () => {
      if (!clientId || !status || !session) {
        throw new Error('useActiveWorkoutSession: missing prerequisites');
      }

      // 1. Load profile + template + exercises paralelno
      const [profileRow, template, libraryResult] = await Promise.all([
        loadProfileRow(clientId),
        getTemplateById(status.training.activeTemplateId),
        listSystemExercisesWithUuids(),
      ]);

      if (!profileRow) {
        throw new Error('useActiveWorkoutSession: profile not found');
      }
      if (!template) {
        throw new Error(
          `useActiveWorkoutSession: template ${status.training.activeTemplateId} not found`,
        );
      }

      const profile = deriveTrainingProfile(clientId, profileRow);
      const skeleton = template.skeleton as SessionSkeleton;
      const { exercises: exerciseLibrary, uuidById } = libraryResult;

      // 2. Skupimo kandidate exercise.id-jeve (po movementPattern match-u za
      //    slotove session.dayType) i load-ujemo njihovu istoriju paralelno.
      //    loadExerciseHistory trazi UUID string, pa koristimo uuidById map.
      const sessionDay = skeleton.days.find((d) => d.dayType === session.dayType);
      const candidateExerciseIds: number[] = [];
      if (sessionDay) {
        for (const slot of sessionDay.exerciseSlots) {
          for (const ex of exerciseLibrary) {
            if (ex.movementPattern === slot.movementPattern) {
              if (!candidateExerciseIds.includes(ex.id)) {
                candidateExerciseIds.push(ex.id);
              }
            }
          }
        }
      }

      const exerciseHistoryMap = new Map<number, ExerciseHistorySample[]>();
      await Promise.all(
        candidateExerciseIds.map(async (id) => {
          const uuid = uuidById.get(id);
          if (!uuid) {
            exerciseHistoryMap.set(id, []);
            return;
          }
          try {
            const history = await loadExerciseHistory(clientId, uuid);
            exerciseHistoryMap.set(id, history);
          } catch {
            // Ako istorija ne moze da se load-uje (RLS, mreza), fallback na
            // first-time estimate — ne blokiramo render.
            exerciseHistoryMap.set(id, []);
          }
        }),
      );

      // 3. Full pipeline
      const result = generateSessionSkeleton({
        templateSkeleton: skeleton,
        session,
        queue: status.training.queue,
        profile,
        exerciseLibrary,
        today: new Date(),
        goalOverlay: goalToOverlay(profile.primaryGoal),
        cyclePhase: status.bio.cyclePhase ?? null,
        exerciseHistoryMap,
      });

      // 4. Filter na dan koji matchuje session.dayType i pripremi UI-friendly slot-ove
      const dayForSession = result.skeleton.days.find(
        (d) => d.dayType === session.dayType,
      ) ?? result.skeleton.days[0];

      const slots: ActiveWorkoutSlot[] = dayForSession.exerciseSlots.map((slot) => {
        const exercise = exerciseLibrary.find((e) => e.id === slot.chosenExerciseId);
        const uuid = slot.chosenExerciseId !== undefined
          ? uuidById.get(slot.chosenExerciseId) ?? null
          : null;

        // Previous-max derivation: najveca weight_kg iz exerciseHistoryMap
        // (već DESC sortiran po completed_at). Filter po istom datumu prethodne
        // sesije — ne želimo da pomešamo istoriju iz više sesija u jedan max.
        let previousMaxWeight: number | null = null;
        let previousSessionDate: string | null = null;
        if (slot.chosenExerciseId !== undefined) {
          const history = exerciseHistoryMap.get(slot.chosenExerciseId) ?? [];
          if (history.length > 0) {
            const latestDate = history[0].completed_at.split("T")[0];
            const lastSessionSets = history.filter(
              (h) => h.completed_at.split("T")[0] === latestDate,
            );
            if (lastSessionSets.length > 0) {
              previousMaxWeight = Math.max(...lastSessionSets.map((s) => s.weight_kg));
              previousSessionDate = latestDate;
            }
          }
        }

        return {
          ...slot,
          exerciseUuid: uuid,
          exerciseName: exercise?.name ?? humanizeMuscleGroup(slot.muscleGroup),
          exerciseNameSr: exercise?.nameSr ?? humanizeMuscleGroup(slot.muscleGroup),
          resolvedRest: slot.targetRest ?? defaultRest(slot.priority),
          previousMaxWeight,
          previousSessionDate,
        };
      });

      return {
        session,
        slots,
        loadingMode: result.loadingMode,
        targetRIR: dayForSession.targetRIR,
        dayLabel: session.label,
      };
    },
  });

  return {
    data: query.data ?? null,
    isLoading: statusLoading || sessionLoading || query.isLoading,
    error: (statusError as Error | null) ?? (query.error as Error | null),
  };
}

function humanizeMuscleGroup(mg: string): string {
  return mg.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
