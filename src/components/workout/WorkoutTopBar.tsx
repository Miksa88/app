// ============================================================================
// WorkoutTopBar — sticky header (exit, progres tačkice, pauza, elapsed)
// + fullscreen pause overlay (Task 1.2)
// ============================================================================

import { ArrowLeft, Play, Pause } from "lucide-react";
import GradientButton from "@/components/GradientButton";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatTime } from "@/hooks/useWorkoutTimer";

interface WorkoutTopBarProps {
  dayLabel: string;
  slotsCount: number;
  exerciseIdx: number;
  allExerciseDone: boolean;
  paused: boolean;
  elapsed: number;
  onExit: () => void;
  onTogglePause: () => void;
  onResume: () => void;
}

const WorkoutTopBar = ({
  dayLabel,
  slotsCount,
  exerciseIdx,
  allExerciseDone,
  paused,
  elapsed,
  onExit,
  onTogglePause,
  onResume,
}: WorkoutTopBarProps) => {
  const { t } = useLanguage();

  return (
    <>
      <div className="px-5 pt-14 pb-3 flex items-center justify-between frosted-glass sticky top-0 z-30">
        <button
          onClick={onExit}
          className="text-primary min-w-11 min-h-11 flex items-center"
          aria-label={t("workout.leave")}
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex gap-2" role="progressbar" aria-label={dayLabel}>
          {Array.from({ length: slotsCount }, (_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${
              i < exerciseIdx || (i === exerciseIdx && allExerciseDone) ? "gradient-primary" : i === exerciseIdx ? "bg-primary" : "bg-border"
            }`} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePause}
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
          <GradientButton onClick={onResume} size="lg">
            <Play size={ICON_SIZE.md} className="inline mr-1.5" aria-hidden="true" />
            {t("workout.resume")}
          </GradientButton>
        </div>
      )}
    </>
  );
};

export default WorkoutTopBar;
