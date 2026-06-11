// ============================================================================
// WorkoutExerciseInfo — naslov vežbe, target i delta vs prošli put (Task 1.2)
// ============================================================================

import { motion } from "framer-motion";
import { ArrowRightLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TAP_SCALE } from "@/lib/motion";
import { isFeatureEnabled } from "@/tenant.config";
import type { ActiveWorkoutSlot } from "@/hooks/useActiveWorkoutSession";

interface WorkoutExerciseInfoProps {
  slot: ActiveWorkoutSlot;
  /** Ime swapovane vežbe (override), ako postoji */
  overrideName: string | null;
  setsDone: number;
  setsTotal: number;
  onOpenSwap: () => void;
}

const WorkoutExerciseInfo = ({
  slot,
  overrideName,
  setsDone,
  setsTotal,
  onOpenSwap,
}: WorkoutExerciseInfoProps) => {
  const { t } = useLanguage();

  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-caption-1 bg-primary/10 px-2.5 py-1 rounded-lg text-primary font-medium">
          {slot.muscleGroup.replace(/_/g, " ")}
        </span>
        {/* White-label: swap dugme samo ako tenant ima exerciseSubstitution */}
        {isFeatureEnabled("exerciseSubstitution") && (
          <motion.button
            whileTap={{ scale: TAP_SCALE.icon }}
            onClick={onOpenSwap}
            className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-caption-1 text-foreground font-medium min-h-9"
            aria-label={t("workout.swapExercise")}
          >
            <ArrowRightLeft size={14} aria-hidden="true" />
            {t("workout.swapExercise")}
          </motion.button>
        )}
      </div>
      <h1 className="text-title-1 text-foreground mb-1">
        {overrideName ?? slot.exerciseName}
      </h1>
      <p className="text-subhead text-muted-foreground mb-2">
        {setsDone}/{setsTotal} {t("gym.sets")} · {t("workout.target")}{" "}
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
    </>
  );
};

export default WorkoutExerciseInfo;
