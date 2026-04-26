// ============================================================================
// SwapExerciseSheet — bottom sheet sa alternativama iste movement_pattern
// ============================================================================
//
// Korisnik klikne "Zameni vežbu" na ActiveWorkout slot. Sheet učitava
// vežbe iz exercises tabele filtrirane po movementPattern (i muscleGroup
// ako je dostupan), filtrira out:
//   - trenutnu (currentExerciseUuid)
//   - kontraindikovane za injury (Sloj 2 safety filter)
// Pokazuje top-5 alternativa sortirane po istoj scoring logici.
//
// Pick = update local state u ActiveWorkout (per-session override; ne
// menja queue u DB-u). Korisnik može da završi sesiju sa zamenjenom
// vežbom, sledeći put će biti default.
// ============================================================================

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightLeft, Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { listExercisesByPattern } from "@/utils/db/exerciseLibrary";
import type { Exercise, MovementPattern, MuscleGroup } from "@/types/training";
import { IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { ICON_SIZE } from "@/lib/design-tokens";

interface SwapExerciseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movementPattern: MovementPattern;
  muscleGroup?: MuscleGroup;
  /** Trenutna vežba — exclude iz alternatives */
  currentExerciseId: number | null;
  /** Profile injuries za safety filter (exclude contraindicated) */
  injuries: string[];
  /** Callback kad korisnik izabere alternativu */
  onPick: (exercise: Exercise) => void;
}

const SwapExerciseSheet = ({
  open,
  onOpenChange,
  movementPattern,
  muscleGroup,
  currentExerciseId,
  injuries,
  onPick,
}: SwapExerciseSheetProps) => {
  const { t, language } = useLanguage();
  const [alternatives, setAlternatives] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const all = await listExercisesByPattern(movementPattern, muscleGroup);
        if (cancelled) return;
        const safeInjuries = injuries.filter((i) => i !== "none");
        const filtered = all
          .filter((ex) => ex.id !== currentExerciseId)
          .filter((ex) =>
            // Safety: exclude exercises contraindicated for any of user's injuries
            safeInjuries.length === 0 ||
            !safeInjuries.some((inj) =>
              ex.contraindications.includes(inj as typeof ex.contraindications[number]),
            ),
          )
          .slice(0, 5);
        setAlternatives(filtered);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, movementPattern, muscleGroup, currentExerciseId, injuries]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/40 z-50"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={IOS_SPRING.medium}
            role="dialog"
            aria-modal="true"
            aria-label={t("workout.swapExercise")}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto bg-card rounded-t-3xl p-6 pb-10 max-h-[80vh] overflow-y-auto"
          >
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />

            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-title-2 font-bold text-foreground">{t("workout.swapExercise")}</h2>
                <p className="text-caption-1 text-muted-foreground mt-0.5">{t("workout.swapHint")}</p>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                aria-label={t("mealPlan.cancel")}
                className="text-muted-foreground min-w-11 min-h-11 flex items-center justify-center"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {loading && (
                <div className="flex flex-col items-center py-8">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-hidden="true" />
                </div>
              )}
              {!loading && alternatives.length === 0 && (
                <p className="text-body text-muted-foreground text-center py-6">
                  {t("workout.noAlternatives")}
                </p>
              )}
              {!loading && alternatives.map((ex) => (
                <motion.button
                  key={ex.id}
                  whileTap={{ scale: TAP_SCALE.secondary }}
                  onClick={() => {
                    onPick(ex);
                    onOpenChange(false);
                  }}
                  className="w-full bg-background-secondary border border-border rounded-2xl p-4 text-left flex items-center gap-3 min-h-14"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ArrowRightLeft size={ICON_SIZE.md} className="text-primary" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-foreground truncate">
                      {language === "sr" ? ex.nameSr : ex.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {ex.equipment && ex.equipment.length > 0 && (
                        <span className="text-caption-2 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {ex.equipment[0]}
                        </span>
                      )}
                      {ex.tensionProfile && (
                        <span className="text-caption-2 px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary">
                          {ex.tensionProfile}
                        </span>
                      )}
                      {ex.difficulty === "beginner_safe" && (
                        <span className="text-caption-2 px-1.5 py-0.5 rounded-full bg-success/10 text-success flex items-center gap-0.5">
                          <Check size={10} aria-hidden="true" /> beg
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SwapExerciseSheet;
