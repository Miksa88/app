// ============================================================================
// WorkoutRestScreen — ekran odmora između serija (Task 1.2)
// ============================================================================

import { motion } from "framer-motion";
import CircularProgress from "@/components/CircularProgress";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatTime } from "@/hooks/useWorkoutTimer";

interface WorkoutRestScreenProps {
  restTime: number;
  maxRest: number;
  onSkip: () => void;
}

const WorkoutRestScreen = ({ restTime, maxRest, onSkip }: WorkoutRestScreenProps) => {
  const { t } = useLanguage();

  return (
    <motion.div
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
          max={maxRest}
          size={200}
          strokeWidth={10}
          color="url(#gradient-pink)"
        >
          <span className="text-large-title text-foreground" aria-hidden="true">{formatTime(restTime)}</span>
        </CircularProgress>
      </div>
      <p className="text-muted-foreground text-subhead mt-8 italic">{t("workout.restMessage")}</p>
      <button
        onClick={onSkip}
        className="mt-6 text-subhead text-primary font-medium min-h-11"
      >
        {t("workout.skipRest")}
      </button>
    </motion.div>
  );
};

export default WorkoutRestScreen;
