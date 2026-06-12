// ============================================================================
// WorkoutSetCard — kartica jedne serije u ActiveWorkout (Task 1.2)
// Prezentaciona — sve mutacije idu kroz callback props ka reduceru.
// ============================================================================

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import GradientButton from "@/components/GradientButton";
import { ICON_SIZE } from "@/lib/design-tokens";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion";
import { useLanguage } from "@/contexts/LanguageContext";
import type { SetLog } from "@/hooks/useWorkoutState";

interface WorkoutSetCardProps {
  set: SetLog;
  setIdx: number;
  isActive: boolean;
  /** Ref na aktivnu karticu — scrollIntoView */
  activeSetRef: React.RefObject<HTMLDivElement>;
  onUpdate: (setIdx: number, field: "weight" | "reps", delta: number) => void;
  onSetValue: (setIdx: number, field: "weight" | "reps", value: number) => void;
  onDone: (setIdx: number) => void;
}

const WorkoutSetCard = ({
  set,
  setIdx,
  isActive,
  activeSetRef,
  onUpdate,
  onSetValue,
  onDone,
}: WorkoutSetCardProps) => {
  const { t } = useLanguage();
  const isDone = set.done;

  return (
    <motion.div
      ref={isActive ? activeSetRef : undefined}
      initial={false}
      animate={{ opacity: 1 }}
      className={`bg-card rounded-xl card-shadow overflow-hidden transition ${
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
                      onClick={() => onUpdate(setIdx, "weight", -2.5)}
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
                      onChange={(e) => onSetValue(setIdx, "weight", Number(e.target.value))}
                      aria-label={`${t("workout.weight")} kg`}
                      className="text-title-2 text-foreground w-16 text-center bg-transparent tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-md"
                    />
                    <button
                      onClick={() => onUpdate(setIdx, "weight", 2.5)}
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
                      onClick={() => onUpdate(setIdx, "reps", -1)}
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
                      onChange={(e) => onSetValue(setIdx, "reps", Number(e.target.value))}
                      aria-label={t("gym.reps")}
                      className="text-title-2 text-foreground w-16 text-center bg-transparent tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-md"
                    />
                    <button
                      onClick={() => onUpdate(setIdx, "reps", 1)}
                      aria-label={`${t("gym.reps")} +1`}
                      className="w-9 h-9 rounded-full bg-muted text-foreground font-semibold text-body min-w-11 min-h-11 flex items-center justify-center"
                    >+</button>
                  </div>
                </div>
              </div>
              <GradientButton onClick={() => onDone(setIdx)} className="w-full" size="md">
                <Check size={ICON_SIZE.md} className="inline mr-2" />
                {t("workout.doneSet")} {setIdx + 1}
              </GradientButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WorkoutSetCard;
