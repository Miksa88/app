// ============================================================================
// ActiveWorkout — realan trening wired to queue + DPO
// Spec: 01_TRAINING_FLOW_MASTER.md §5 Korak 2.5, §5 Korak 6, §5 Korak 7
//
// Task 1.2 dekompozicija: session stanje → useWorkoutState (useReducer),
// tajmeri → useWorkoutTimer, prezentacija → components/workout/*.
// Flow: "Done set" → useCompleteSet.mutate (haptic medium); poslednja serija
// poslednje vežbe → useFinishWorkout.mutate (5s Undo toast, haptic success)
// → navigate("/workout/complete").
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GradientButton from "@/components/GradientButton";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHaptic } from "@/hooks/useHaptic";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveWorkoutSession } from "@/hooks/useActiveWorkoutSession";
import type { ActiveWorkoutSlot } from "@/hooks/useActiveWorkoutSession";
import { useCompleteSet } from "@/hooks/mutations/useCompleteSet";
import { useFinishWorkout } from "@/hooks/mutations/useFinishWorkout";
import { useWorkoutState } from "@/hooks/useWorkoutState";
import { useWorkoutTimer, formatTime } from "@/hooks/useWorkoutTimer";
import { MOTION_DURATION } from "@/lib/motion";
import SwapExerciseSheet from "@/components/workout/SwapExerciseSheet";
import PreWorkoutFatigueDialog from "@/components/workout/PreWorkoutFatigueDialog";
import { ExerciseNotesField } from "@/components/workout/ExerciseNotesField";
import WorkoutVideoPlayer from "@/components/workout/WorkoutVideoPlayer";
import WorkoutSetCard from "@/components/workout/WorkoutSetCard";
import WorkoutRestScreen from "@/components/workout/WorkoutRestScreen";
import WorkoutExerciseInfo from "@/components/workout/WorkoutExerciseInfo";
import WorkoutExitDialog from "@/components/workout/WorkoutExitDialog";
import WorkoutTopBar from "@/components/workout/WorkoutTopBar";
import { toast } from "sonner";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useProfileInjuries } from "@/hooks/useProfile";
import { isFeatureEnabled } from "@/tenant.config";

const ActiveWorkout = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const haptic = useHaptic();

  const { data: session, isLoading, error } = useActiveWorkoutSession();
  const completeSet = useCompleteSet({ silent: true });
  const finishWorkout = useFinishWorkout();
  const { status } = useUserStatus(clientId);

  const slots = useMemo<ActiveWorkoutSlot[]>(() => session?.slots ?? [], [session]);

  // Konsolidovano session stanje — useReducer (Task 1.2)
  const { state, dispatch } = useWorkoutState(slots);
  const {
    exerciseIdx,
    allSets,
    exerciseOverrides,
    paused,
    resting,
    restTime,
    fatigueDialogOpen,
    showExitConfirm,
    showSwapSheet,
  } = state;

  // Tajmeri — elapsed + rest countdown, garantovan cleanup
  const { elapsed } = useWorkoutTimer({
    paused,
    resting,
    onRestTick: () => dispatch({ type: "REST_TICK" }),
  });

  // Ephemeralno video UI stanje — ostaje useState (reducer ne dodaje vrednost)
  const [videoFullscreen, setVideoFullscreen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  // Pre-workout fatigue dialog — pokazuje se jednom dnevno pri ulasku.
  // Ako je već odgovorila danas, dialog se ne otvara (signal važi do sledeceg
  // process-workout-completion-a koji čisti preWorkoutFatigue flag).
  useEffect(() => {
    if (!status?.bio || fatigueDialogOpen) return;
    const answeredAt = status.bio.preWorkoutFatigueAnsweredAt;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const answeredToday = answeredAt
      ? new Date(answeredAt) >= startOfToday
      : false;
    if (!answeredToday) dispatch({ type: "SET_FATIGUE_DIALOG", open: true });
  }, [status?.bio, fatigueDialogOpen, dispatch]);

  // Povrede iz profila — surgical swap (useProfileInjuries hook, Task 1.1)
  const { data: profileInjuries = [] } = useProfileInjuries(clientId);
  const activeSetRef = useRef<HTMLDivElement>(null);
  // Undo prozor za finish — cleanup na unmount
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  }, []);

  const slot = slots[exerciseIdx];
  const sets = allSets[exerciseIdx] ?? [];
  const activeSetIdx = sets.findIndex((s) => !s.done);

  useEffect(() => {
    if (activeSetRef.current && !resting) {
      activeSetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeSetIdx, resting, exerciseIdx]);

  // Simulirani video progres — cleanup u effect-u, nema duplog intervala
  useEffect(() => {
    if (!videoPlaying) return;
    const i = setInterval(() => {
      setVideoProgress((prev) => {
        if (prev >= 100) {
          setVideoPlaying(false);
          return 0;
        }
        return prev + 0.5;
      });
    }, 100);
    return () => clearInterval(i);
  }, [videoPlaying]);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  // V3 audit §9 P0 #7 — "no way to resume a workout if you accidentally hit End".
  // Pattern: prikazi Sonner toast sa "Vrati" akcijom; nakon 5s tek fire mutation.
  // To resava 99% slucajeva accidental Finish tap-a (citat real users docs).
  const handleFinishWorkout = useCallback(() => {
    if (!session || !clientId) return;
    haptic("success");
    const sessionId = session.session.sessionId;

    let cancelled = false;
    const FINISH_DELAY_MS = 5000;

    const toastId = toast(t("workout.finishingToast"), {
      description: t("workout.finishingToastHint"),
      duration: FINISH_DELAY_MS,
      action: {
        label: t("common.undo"),
        onClick: () => {
          cancelled = true;
          toast.dismiss(toastId);
          haptic("light");
        },
      },
    });

    finishTimerRef.current = window.setTimeout(() => {
      finishTimerRef.current = null;
      if (cancelled) return;
      finishWorkout.mutate(
        {
          clientId,
          sessionId,
          completedAt: new Date().toISOString(),
        },
        {
          onSuccess: () => {
            navigate("/workout/complete");
          },
        },
      );
    }, FINISH_DELAY_MS);
  }, [session, clientId, haptic, finishWorkout, navigate, t]);

  const handleDoneSet = useCallback(
    (setIdx: number) => {
      if (!slot || !sets[setIdx] || !clientId) return;
      haptic("medium");

      const setValue = sets[setIdx];

      // Fire-and-forget insert u exercise_progress — ne blokiramo UI.
      // Ako nema exerciseUuid (slot nije matched), preskacemo insert ali
      // nastavljamo flow (degraded mode — test/dev seed).
      if (slot.exerciseUuid) {
        completeSet.mutate({
          userId: clientId,
          exerciseId: slot.exerciseUuid,
          setNumber: setIdx + 1,
          weightKg: setValue.weight,
          reps: setValue.reps,
          rir: setValue.rir,
        });
      }

      // Reducer markira seriju done + rest + advance na sledeću vežbu
      dispatch({ type: "COMPLETE_SET", setIdx, restSeconds: slot.resolvedRest });

      // Poslednja serija poslednje vežbe → finish workout
      const remainingSets = sets.filter((s, i) => i !== setIdx && !s.done).length;
      if (remainingSets === 0 && exerciseIdx >= slots.length - 1) {
        handleFinishWorkout();
      }
    },
    [slot, sets, exerciseIdx, slots.length, clientId, haptic, completeSet, handleFinishWorkout, dispatch],
  );

  const allExerciseDone = sets.length > 0 && sets.every((s) => s.done);

  // ------------------------------------------------------------------
  // Early states
  // ------------------------------------------------------------------

  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-background-secondary flex items-center justify-center"
        role="status"
        aria-busy="true"
      >
        <p className="text-muted-foreground text-body">{t("workout.loading")}</p>
      </div>
    );
  }

  if (error || !session || !slot || sets.length === 0) {
    return (
      <div className="min-h-screen bg-background-secondary flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-muted-foreground text-body text-center">
          {t("workout.noSession")}
        </p>
        <GradientButton onClick={() => navigate("/gym")} size="md">
          {t("workout.stay")}
        </GradientButton>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const videoPlayer = (isFullscreen: boolean) => (
    <WorkoutVideoPlayer
      exerciseName={slot.exerciseName}
      isFullscreen={isFullscreen}
      playing={videoPlaying}
      progress={videoProgress}
      onTogglePlay={() => setVideoPlaying((p) => !p)}
      onSeek={setVideoProgress}
      onToggleFullscreen={() => setVideoFullscreen(!isFullscreen)}
    />
  );

  return (
    <div className="min-h-screen bg-background-secondary pb-8">
      <WorkoutTopBar
        dayLabel={session.dayLabel}
        slotsCount={slots.length}
        exerciseIdx={exerciseIdx}
        allExerciseDone={allExerciseDone}
        paused={paused}
        elapsed={elapsed}
        onExit={() => dispatch({ type: "SET_EXIT_CONFIRM", open: true })}
        onTogglePause={() => { dispatch({ type: "TOGGLE_PAUSED" }); haptic("light"); }}
        onResume={() => { dispatch({ type: "SET_PAUSED", paused: false }); haptic("medium"); }}
      />

      <AnimatePresence mode="wait">
        {resting ? (
          <WorkoutRestScreen
            key="rest"
            restTime={restTime}
            maxRest={slot.resolvedRest}
            onSkip={() => dispatch({ type: "SKIP_REST" })}
          />
        ) : (
          <motion.div
            key={`exercise-${exerciseIdx}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: MOTION_DURATION.slow }}
            className="px-5 pt-4"
          >
            <div className="mb-5 card-shadow rounded-2xl overflow-hidden">
              {videoPlayer(false)}
            </div>

            <WorkoutExerciseInfo
              slot={slot}
              overrideName={exerciseOverrides[exerciseIdx]?.name ?? null}
              setsDone={sets.filter((s) => s.done).length}
              setsTotal={sets.length}
              onOpenSwap={() => dispatch({ type: "SET_SWAP_SHEET", open: true })}
            />

            <ExerciseNotesField
              exerciseId={
                exerciseOverrides[exerciseIdx]?.id
                  ?? slot.exerciseUuid
                  ?? null
              }
            />

            <div className="space-y-3">
              {sets.map((set, setIdx) => (
                <WorkoutSetCard
                  key={setIdx}
                  set={set}
                  setIdx={setIdx}
                  isActive={setIdx === activeSetIdx}
                  activeSetRef={activeSetRef}
                  onUpdate={(i, field, delta) => dispatch({ type: "UPDATE_SET", setIdx: i, field, delta })}
                  onSetValue={(i, field, value) => dispatch({ type: "SET_SET_VALUE", setIdx: i, field, value })}
                  onDone={handleDoneSet}
                />
              ))}
            </div>

            {/* Finish workout dugme — vidljivo kad su sve serije gotove i ima jos vezbi
                iza nas, ili kad je poslednja vezba na redu. */}
            {allExerciseDone && exerciseIdx >= slots.length - 1 && (
              <div className="mt-6">
                <GradientButton
                  onClick={handleFinishWorkout}
                  className="w-full"
                  size="lg"
                  disabled={finishWorkout.isPending}
                  loading={finishWorkout.isPending}
                >
                  {finishWorkout.isPending ? t("workout.finishing") : t("workout.finish")}
                </GradientButton>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {videoFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-modal bg-black flex items-center justify-center"
          >
            <button
              onClick={() => setVideoFullscreen(false)}
              className="absolute top-14 left-5 z-10 text-white min-w-11 min-h-11 flex items-center justify-center"
              aria-label={t("workout.leave")}
            >
              <X size={24} />
            </button>
            <div className="w-full h-full flex items-center justify-center p-0">
              {videoPlayer(true)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <WorkoutExitDialog
        open={showExitConfirm}
        onOpenChange={(open) => dispatch({ type: "SET_EXIT_CONFIRM", open })}
        onLeave={() => navigate("/gym")}
      />

      {slot && (
        <SwapExerciseSheet
          open={showSwapSheet}
          onOpenChange={(open) => dispatch({ type: "SET_SWAP_SHEET", open })}
          movementPattern={slot.movementPattern}
          muscleGroup={slot.muscleGroup}
          currentExerciseId={
            exerciseOverrides[exerciseIdx]?.id ?? slot.chosenExerciseId ?? null
          }
          injuries={profileInjuries}
          onPick={(ex) => {
            dispatch({ type: "SWAP_EXERCISE", exercise: ex });
            haptic("medium");
          }}
        />
      )}

      {/* White-label (Faza 3.2): pre-workout fatigue dialog samo ako tenant
          koristi biofeedback pravila */}
      {clientId && isFeatureEnabled("biofeedbackRules") && (
        <PreWorkoutFatigueDialog
          open={fatigueDialogOpen}
          onOpenChange={(open) => dispatch({ type: "SET_FATIGUE_DIALOG", open })}
          clientId={clientId}
          onAnswered={() => {
            // signal je sačuvan — programGenerator/DPO će ga primeniti pri
            // sledećoj sesiji rebuild-a (queueAdvance / refresh).
          }}
        />
      )}
    </div>
  );
};

export default ActiveWorkout;
