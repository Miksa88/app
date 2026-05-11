// ============================================================================
// ActiveWorkout — realan trening wired to queue + DPO
// Spec: 01_TRAINING_FLOW_MASTER.md §5 Korak 2.5, §5 Korak 6, §5 Korak 7
// ============================================================================
//
// IT-9: zamena hardkodovanih EXERCISES sa realnim slotovima iz
// useActiveWorkoutSession (queue → template → skeleton → DPO).
//
// Flow:
//   1. useActiveWorkoutSession skupi sesiju, slotove, targetWeight/Reps/RIR
//   2. Svaki "Done set" → useCompleteSet.mutate (insert u exercise_progress)
//      sa haptic("medium") na tap
//   3. Posle poslednje serije poslednje vezbe → useFinishWorkout.mutate
//      (process-workout-completion EF advances queue pointer) sa
//      haptic("success") i navigate("/workout/complete")
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GradientButton from "@/components/GradientButton";
import CircularProgress from "@/components/CircularProgress";
import { ArrowLeft, Check, Play, Pause, Maximize, Minimize, X, ArrowRightLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHaptic } from "@/hooks/useHaptic";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveWorkoutSession } from "@/hooks/useActiveWorkoutSession";
import type { ActiveWorkoutSlot } from "@/hooks/useActiveWorkoutSession";
import { useCompleteSet } from "@/hooks/mutations/useCompleteSet";
import { useFinishWorkout } from "@/hooks/mutations/useFinishWorkout";
import { MOTION_DURATION, MOTION_EASE, TAP_SCALE } from "@/lib/motion";
import SwapExerciseSheet from "@/components/workout/SwapExerciseSheet";
import PreWorkoutFatigueDialog from "@/components/workout/PreWorkoutFatigueDialog";
import { ExerciseNotesField } from "@/components/workout/ExerciseNotesField";
import { toast } from "sonner";
import { useUserStatus } from "@/hooks/useUserStatus";
import type { Exercise } from "@/types/training";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SetLog {
  weight: number;
  reps: number;
  rir: number | null;
  done: boolean;
}

/** Parse targetReps "8-12" → top of range (broji se kao cilj) */
function parseRepTarget(targetReps: string | undefined): number {
  if (!targetReps) return 10;
  const parts = targetReps.split("-").map((s) => Number(s.trim()));
  if (parts.length === 2 && !Number.isNaN(parts[1])) return parts[1];
  if (!Number.isNaN(parts[0])) return parts[0];
  return 10;
}

/** Broj serija iz slot.finalSets, pa setsRange.min, pa fallback 3 */
function resolveSetsCount(slot: ActiveWorkoutSlot): number {
  if (slot.finalSets && slot.finalSets > 0) return slot.finalSets;
  if (slot.setsRange && slot.setsRange[0] > 0) return slot.setsRange[0];
  return 3;
}

const ActiveWorkout = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const haptic = useHaptic();

  const { data: session, isLoading, error } = useActiveWorkoutSession();
  const completeSet = useCompleteSet({ silent: true });
  const finishWorkout = useFinishWorkout();
  const { status } = useUserStatus(clientId);

  // Pre-workout fatigue dialog — pokazuje se jednom dnevno pri ulasku.
  // Ako je već odgovorila danas, dialog se ne otvara (signal važi do sledeceg
  // process-workout-completion-a koji čisti preWorkoutFatigue flag).
  const [fatigueDialogOpen, setFatigueDialogOpen] = useState(false);
  useEffect(() => {
    if (!status?.bio || fatigueDialogOpen) return;
    const answeredAt = status.bio.preWorkoutFatigueAnsweredAt;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const answeredToday = answeredAt
      ? new Date(answeredAt) >= startOfToday
      : false;
    if (!answeredToday) setFatigueDialogOpen(true);
  }, [status?.bio, fatigueDialogOpen]);

  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resting, setResting] = useState(false);
  const [restTime, setRestTime] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [videoFullscreen, setVideoFullscreen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [showSwapSheet, setShowSwapSheet] = useState(false);
  /** Per-session exercise overrides (slot-index → swapped Exercise). Ne persistira se u DB queue. */
  const [exerciseOverrides, setExerciseOverrides] = useState<Record<number, Exercise>>({});
  const [profileInjuries, setProfileInjuries] = useState<string[]>([]);
  const activeSetRef = useRef<HTMLDivElement>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("injuries")
        .eq("id", clientId)
        .maybeSingle();
      if (!cancelled && data?.injuries) {
        setProfileInjuries(data.injuries);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const slots = useMemo<ActiveWorkoutSlot[]>(() => session?.slots ?? [], [session]);

  // Inicijalizuj allSets kad podaci stignu. useMemo na slotove.length + targetWeight
  // cela map je stabilna jer slots dolazi iz React Query cache-a.
  const [allSets, setAllSets] = useState<SetLog[][]>([]);

  useEffect(() => {
    if (slots.length === 0) return;
    setAllSets(
      slots.map((slot) => {
        const count = resolveSetsCount(slot);
        const reps = parseRepTarget(slot.targetReps);
        const weight = slot.targetWeight ?? 0;
        return Array.from({ length: count }, () => ({
          weight,
          reps,
          rir: slot.targetRIR ?? null,
          done: false,
        }));
      }),
    );
    setExerciseIdx(0);
  }, [slots]);

  const slot = slots[exerciseIdx];
  const sets = allSets[exerciseIdx] ?? [];
  const activeSetIdx = sets.findIndex((s) => !s.done);

  useEffect(() => {
    if (paused) return;
    const i = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(i);
  }, [paused]);

  useEffect(() => {
    if (!resting || paused) return;
    if (restTime <= 0) { setResting(false); return; }
    const i = setInterval(() => setRestTime((r) => r - 1), 1000);
    return () => clearInterval(i);
  }, [resting, restTime, paused]);

  useEffect(() => {
    if (activeSetRef.current && !resting) {
      activeSetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeSetIdx, resting, exerciseIdx]);

  useEffect(() => {
    if (videoPlaying) {
      progressIntervalRef.current = setInterval(() => {
        setVideoProgress((prev) => {
          if (prev >= 100) {
            setVideoPlaying(false);
            return 0;
          }
          return prev + 0.5;
        });
      }, 100);
    } else if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
  }, [videoPlaying]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const updateSet = (setIdx: number, field: "weight" | "reps", delta: number) => {
    setAllSets((prev) => {
      const copy = prev.map((ex) => ex.map((s) => ({ ...s })));
      if (!copy[exerciseIdx] || !copy[exerciseIdx][setIdx]) return prev;
      const val = copy[exerciseIdx][setIdx][field] + delta;
      copy[exerciseIdx][setIdx][field] = Math.max(0, val);
      return copy;
    });
  };

  const setSetValue = (setIdx: number, field: "weight" | "reps", value: number) => {
    setAllSets((prev) => {
      const copy = prev.map((ex) => ex.map((s) => ({ ...s })));
      if (!copy[exerciseIdx] || !copy[exerciseIdx][setIdx]) return prev;
      copy[exerciseIdx][setIdx][field] = Math.max(0, value);
      return copy;
    });
  };

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

      setAllSets((prev) => {
        const copy = prev.map((ex) => ex.map((s) => ({ ...s })));
        if (!copy[exerciseIdx] || !copy[exerciseIdx][setIdx]) return prev;
        copy[exerciseIdx][setIdx].done = true;
        return copy;
      });

      const remainingSets = sets.filter((s, i) => i !== setIdx && !s.done).length;
      const restSeconds = slot.resolvedRest;

      if (remainingSets === 0) {
        // Poslednja serija ove vezbe
        if (exerciseIdx >= slots.length - 1) {
          // Poslednja vezba u treningu → finish workout
          handleFinishWorkout();
          return;
        }
        setRestTime(restSeconds);
        setResting(true);
        setTimeout(() => setExerciseIdx((i) => i + 1), 0);
      } else {
        setRestTime(restSeconds);
        setResting(true);
      }
    },
    [slot, sets, exerciseIdx, slots.length, clientId, haptic, completeSet, handleFinishWorkout],
  );

  const allExerciseDone = sets.length > 0 && sets.every((s) => s.done);

  const formatVideoTime = (progress: number) => {
    const totalSec = Math.floor((progress / 100) * 45);
    return `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, "0")}`;
  };

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

  const VideoPlayer = ({ isFullscreen }: { isFullscreen: boolean }) => (
    <div className={`relative ${isFullscreen ? "w-full h-full" : "w-full aspect-video"} bg-black/90 rounded-2xl overflow-hidden flex items-center justify-center`}>
      <div className="text-center">
        <span className={`${isFullscreen ? "text-7xl" : "text-4xl"}`}>
          {slot.exerciseName.charAt(0)}
        </span>
        {!videoPlaying && (
          <p className={`text-white/60 ${isFullscreen ? "text-body mt-4" : "text-footnote mt-2"}`}>
            {t("workout.videoTutorial")}
          </p>
        )}
      </div>

      <div className="absolute inset-0 flex flex-col justify-end">
        <button
          onClick={(e) => { e.stopPropagation(); setVideoPlaying(!videoPlaying); }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <AnimatePresence mode="wait">
            {!videoPlaying && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                <Play size={28} className="text-white ml-1" fill="white" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        <div className={`bg-gradient-to-t from-black/80 to-transparent ${isFullscreen ? "px-6 pb-10 pt-16" : "px-3 pb-3 pt-8"}`}>
          <div
            className="w-full h-1 bg-white/30 rounded-full mb-3 cursor-pointer group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              setVideoProgress((x / rect.width) * 100);
            }}
          >
            <div
              className="h-full bg-white rounded-full relative transition-all"
              style={{ width: `${videoProgress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); setVideoPlaying(!videoPlaying); }}
                className="text-white min-w-11 min-h-11 flex items-center justify-center"
              >
                {videoPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-0.5" />}
              </button>
              <span className="text-white/80 text-caption-1 font-mono">
                {formatVideoTime(videoProgress)} / 0:45
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setVideoFullscreen(!isFullscreen); }}
              className="text-white min-w-11 min-h-11 flex items-center justify-center"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background-secondary pb-8">
      <div className="px-5 pt-14 pb-3 flex items-center justify-between frosted-glass sticky top-0 z-30">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="text-primary min-w-11 min-h-11 flex items-center"
          aria-label={t("workout.leave")}
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex gap-2" role="progressbar" aria-label={session.dayLabel}>
          {slots.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${
              i < exerciseIdx || (i === exerciseIdx && allExerciseDone) ? "gradient-primary" : i === exerciseIdx ? "bg-primary" : "bg-border"
            }`} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPaused((p) => !p); haptic("light"); }}
            className="min-w-11 min-h-11 flex items-center justify-center rounded-full bg-card/70 backdrop-blur-md border border-border/30"
            aria-label={paused ? t("workout.resume") : t("workout.pause")}
          >
            {paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
          </button>
          <span className="text-subhead font-mono text-muted-foreground min-w-11 text-right tabular-nums">{formatTime(elapsed)}</span>
        </div>
      </div>

      {paused && (
        <div className="fixed inset-0 z-modal bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-card card-shadow flex items-center justify-center mb-4">
            <Pause size={32} className="text-primary" aria-hidden="true" />
          </div>
          <h2 className="text-title-2 text-foreground mb-1">{t("workout.paused")}</h2>
          <p className="text-body text-muted-foreground mb-6">{t("workout.pausedHint")}</p>
          <GradientButton onClick={() => { setPaused(false); haptic("medium"); }} size="lg">
            <Play size={ICON_SIZE.md} className="inline mr-1.5" aria-hidden="true" />
            {t("workout.resume")}
          </GradientButton>
        </div>
      )}

      <AnimatePresence mode="wait">
        {resting ? (
          <motion.div
            key="rest"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            role="timer"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`${t("workout.rest")}: ${formatTime(restTime)}`}
            className="flex flex-col items-center justify-center px-5 pt-16"
          >
            <p className="text-muted-foreground text-subhead mb-6 tracking-wider uppercase">{t("workout.rest")}</p>
            <div className="breathe">
              <CircularProgress
                value={restTime}
                max={slot.resolvedRest}
                size={200}
                strokeWidth={10}
                color="url(#gradient-pink)"
              >
                <span className="text-large-title text-foreground" aria-hidden="true">{formatTime(restTime)}</span>
              </CircularProgress>
            </div>
            <p className="text-muted-foreground text-subhead mt-8 italic">{t("workout.restMessage")}</p>
            <button
              onClick={() => { setResting(false); setRestTime(0); }}
              className="mt-6 text-subhead text-primary font-medium min-h-11"
            >
              {t("workout.skipRest")}
            </button>
          </motion.div>
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
              <VideoPlayer isFullscreen={false} />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-caption-1 bg-primary/10 px-2.5 py-1 rounded-lg text-primary font-medium">
                {slot.muscleGroup.replace(/_/g, " ")}
              </span>
              <motion.button
                whileTap={{ scale: TAP_SCALE.icon }}
                onClick={() => setShowSwapSheet(true)}
                className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-caption-1 text-foreground font-medium min-h-9"
                aria-label={t("workout.swapExercise")}
              >
                <ArrowRightLeft size={14} aria-hidden="true" />
                {t("workout.swapExercise")}
              </motion.button>
            </div>
            <h1 className="text-title-1 text-foreground mb-1">
              {exerciseOverrides[exerciseIdx]
                ? (exerciseOverrides[exerciseIdx].name)
                : slot.exerciseName}
            </h1>
            <p className="text-subhead text-muted-foreground mb-2">
              {sets.filter((s) => s.done).length}/{sets.length} {t("gym.sets")} · {t("workout.target")}{" "}
              {slot.targetReps ?? `${slot.repRange[0]}-${slot.repRange[1]}`} {t("workout.reps")}
              {slot.targetRIR !== undefined ? ` · ${t("workout.rir")} ${slot.targetRIR}` : ""}
            </p>
            {slot.targetWeight !== undefined && slot.targetWeight !== null && (
              <div className="mb-5 flex items-center flex-wrap gap-2">
                <p className="text-footnote text-muted-foreground">
                  {t("workout.target")}: {slot.targetWeight}kg
                </p>
                {slot.previousMaxWeight !== null && (() => {
                  const delta = slot.targetWeight - slot.previousMaxWeight;
                  if (delta > 0) {
                    return (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success text-caption-2 font-bold tabular-nums"
                        aria-label={`+${delta}kg ${t("workout.vsPrevious")}`}
                      >
                        ↑ +{delta}kg {t("workout.vsPrevious")}
                      </span>
                    );
                  }
                  if (delta < 0) {
                    return (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info/15 text-info text-caption-2 font-bold tabular-nums"
                        aria-label={`${delta}kg ${t("workout.vsPrevious")}`}
                      >
                        ↓ {delta}kg {t("workout.vsPrevious")}
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-caption-2 font-medium">
                      = {t("workout.matchPrevious")}
                    </span>
                  );
                })()}
              </div>
            )}

            <ExerciseNotesField
              exerciseId={
                exerciseOverrides[exerciseIdx]?.id
                  ?? slot.exerciseUuid
                  ?? null
              }
            />

            <div className="space-y-3">
              {sets.map((set, setIdx) => {
                const isActive = setIdx === activeSetIdx;
                const isDone = set.done;
                return (
                  <motion.div
                    key={setIdx}
                    ref={isActive ? activeSetRef : undefined}
                    initial={false}
                    animate={{ opacity: 1 }}
                    className={`bg-card rounded-xl card-shadow overflow-hidden transition-all ${
                      isDone ? "border-2 border-success/40" : isActive ? "border-2 border-primary/30" : "opacity-50"
                    }`}
                  >
                    <div className={`px-4 py-3 flex items-center justify-between ${isDone ? "bg-success/5" : ""}`}>
                      <div className="flex items-center gap-2">
                        {isDone ? (
                          <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                            <Check size={ICON_SIZE.xs} className="text-white" />
                          </div>
                        ) : (
                          <div className={`w-6 h-6 rounded-full border-2 ${isActive ? "border-primary" : "border-border"}`} />
                        )}
                        <span className={`text-body font-semibold ${isDone ? "text-success" : "text-foreground"}`}>
                          {t("workout.set")} {setIdx + 1}
                        </span>
                      </div>
                      {isDone && <span className="text-caption-1 text-muted-foreground">{set.weight}kg × {set.reps}</span>}
                    </div>

                    <AnimatePresence>
                      {isActive && !isDone && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.easeOut }}
                        >
                          <div className="px-4 pb-4 pt-1">
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="bg-background-secondary rounded-xl p-3 text-center">
                                <label htmlFor={`set-${setIdx}-weight`} className="block text-footnote text-muted-foreground mb-2">
                                  {t("workout.weight")}
                                </label>
                                <div className="flex items-center justify-center gap-3">
                                  <button
                                    onClick={() => updateSet(setIdx, "weight", -2.5)}
                                    aria-label={`${t("workout.weight")} -2.5`}
                                    className="w-9 h-9 rounded-full bg-muted text-foreground font-semibold text-body min-w-11 min-h-11 flex items-center justify-center"
                                  >−</button>
                                  <input
                                    id={`set-${setIdx}-weight`}
                                    type="number"
                                    inputMode="decimal"
                                    step="0.5"
                                    min="0"
                                    value={set.weight}
                                    onChange={(e) => setSetValue(setIdx, "weight", Number(e.target.value))}
                                    aria-label={`${t("workout.weight")} kg`}
                                    className="text-title-2 text-foreground w-16 text-center bg-transparent tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-md"
                                  />
                                  <button
                                    onClick={() => updateSet(setIdx, "weight", 2.5)}
                                    aria-label={`${t("workout.weight")} +2.5`}
                                    className="w-9 h-9 rounded-full bg-muted text-foreground font-semibold text-body min-w-11 min-h-11 flex items-center justify-center"
                                  >+</button>
                                </div>
                              </div>
                              <div className="bg-background-secondary rounded-xl p-3 text-center">
                                <label htmlFor={`set-${setIdx}-reps`} className="block text-footnote text-muted-foreground mb-2">
                                  {t("gym.reps")}
                                </label>
                                <div className="flex items-center justify-center gap-3">
                                  <button
                                    onClick={() => updateSet(setIdx, "reps", -1)}
                                    aria-label={`${t("gym.reps")} -1`}
                                    className="w-9 h-9 rounded-full bg-muted text-foreground font-semibold text-body min-w-11 min-h-11 flex items-center justify-center"
                                  >−</button>
                                  <input
                                    id={`set-${setIdx}-reps`}
                                    type="number"
                                    inputMode="numeric"
                                    step="1"
                                    min="0"
                                    value={set.reps}
                                    onChange={(e) => setSetValue(setIdx, "reps", Number(e.target.value))}
                                    aria-label={t("gym.reps")}
                                    className="text-title-2 text-foreground w-16 text-center bg-transparent tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-md"
                                  />
                                  <button
                                    onClick={() => updateSet(setIdx, "reps", 1)}
                                    aria-label={`${t("gym.reps")} +1`}
                                    className="w-9 h-9 rounded-full bg-muted text-foreground font-semibold text-body min-w-11 min-h-11 flex items-center justify-center"
                                  >+</button>
                                </div>
                              </div>
                            </div>
                            <GradientButton onClick={() => handleDoneSet(setIdx)} className="w-full" size="md">
                              <Check size={ICON_SIZE.md} className="inline mr-2" />
                              {t("workout.doneSet")} {setIdx + 1}
                            </GradientButton>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
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
              <VideoPlayer isFullscreen={true} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workout.leaveTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("workout.leaveDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-3">
            <AlertDialogCancel
              onClick={() => setShowExitConfirm(false)}
              className="flex-1 min-h-11 rounded-[14px]"
            >
              {t("workout.stay")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => navigate("/gym")}
              className="flex-1 min-h-11 rounded-[14px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("workout.leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {slot && (
        <SwapExerciseSheet
          open={showSwapSheet}
          onOpenChange={setShowSwapSheet}
          movementPattern={slot.movementPattern}
          muscleGroup={slot.muscleGroup}
          currentExerciseId={
            exerciseOverrides[exerciseIdx]?.id ?? slot.chosenExerciseId ?? null
          }
          injuries={profileInjuries}
          onPick={(ex) => {
            setExerciseOverrides((prev) => ({ ...prev, [exerciseIdx]: ex }));
            haptic("medium");
          }}
        />
      )}

      {clientId && (
        <PreWorkoutFatigueDialog
          open={fatigueDialogOpen}
          onOpenChange={setFatigueDialogOpen}
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
