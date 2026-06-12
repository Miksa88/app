// ============================================================================
// WorkoutVideoPlayer — prezentacioni video player za ActiveWorkout (Task 1.2)
// Stanje (playing/progress/fullscreen) drži stranica jer se deli između
// inline i fullscreen instance.
// ============================================================================

import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Maximize, Minimize } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface WorkoutVideoPlayerProps {
  exerciseName: string;
  isFullscreen: boolean;
  playing: boolean;
  /** Progres u procentima 0–100 */
  progress: number;
  onTogglePlay: () => void;
  onSeek: (progressPct: number) => void;
  onToggleFullscreen: () => void;
}

/** Format vremena videa iz procenta (simulirani 45s klip) */
function formatVideoTime(progress: number): string {
  const totalSec = Math.floor((progress / 100) * 45);
  return `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, "0")}`;
}

const WorkoutVideoPlayer = ({
  exerciseName,
  isFullscreen,
  playing,
  progress,
  onTogglePlay,
  onSeek,
  onToggleFullscreen,
}: WorkoutVideoPlayerProps) => {
  const { t } = useLanguage();

  return (
    <div className={`relative ${isFullscreen ? "w-full h-full" : "w-full aspect-video"} bg-black/90 rounded-2xl overflow-hidden flex items-center justify-center`}>
      <div className="text-center">
        <span className={`${isFullscreen ? "text-7xl" : "text-4xl"}`}>
          {exerciseName.charAt(0)}
        </span>
        {!playing && (
          <p className={`text-white/60 ${isFullscreen ? "text-body mt-4" : "text-footnote mt-2"}`}>
            {t("workout.videoTutorial")}
          </p>
        )}
      </div>

      <div className="absolute inset-0 flex flex-col justify-end">
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <AnimatePresence mode="wait">
            {!playing && (
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
              onSeek((x / rect.width) * 100);
            }}
          >
            <div
              className="h-full bg-white rounded-full relative transition-[width]"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
                className="text-white min-w-11 min-h-11 flex items-center justify-center"
              >
                {playing ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-0.5" />}
              </button>
              <span className="text-white/80 text-caption-1 font-mono">
                {formatVideoTime(progress)} / 0:45
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFullscreen(); }}
              className="text-white min-w-11 min-h-11 flex items-center justify-center"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutVideoPlayer;
