// ============================================================================
// SwapExerciseSheet — bottom sheet sa alternativama iste movement_pattern
// MVP_PRESET gap #2 — klijent-facing exercise substitution
// ============================================================================
//
// Korisnik klikne "Zameni vežbu" na ActiveWorkout slot. Sheet učitava
// vežbe iz exercises tabele filtrirane po movementPattern (i muscleGroup
// ako je dostupan), filtrira out:
//   - trenutnu (currentExerciseUuid)
//   - kontraindikovane za injury (Sloj 2 safety filter)
//   - vežbe za koje klijentkinja NEMA opremu (profiles.equipment_list);
//     bodyweight / bez zahteva uvek prolaze, prazan equipment profil = bez filtera
// Pokazuje top-5 alternativa rangirane istom scoring logikom kao automatski
// surgical swap (rankExerciseCandidates: tension profile / CNS / variety).
//
// Pick = update local state u ActiveWorkout (per-session override; ne
// menja queue u DB-u). Toggle "Zameni trajno" → ActiveWorkout dodatno
// upiše mapiranje u client_exercise_swaps (važi za sve buduće treninge).
// ============================================================================

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightLeft, Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useClientEquipment } from "@/hooks/useClientEquipment";
import { listExercisesByPattern } from "@/utils/db/exerciseLibrary";
import { filterExercisesByEquipment } from "@/services/clientEquipmentService";
import { rankExerciseCandidates } from "@/utils/training/exerciseSubstitution";
import type { Exercise, MovementPattern, MuscleGroup } from "@/types/training";
import { IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { ICON_SIZE } from "@/lib/design-tokens";
import { Switch } from "@/components/ui/switch";

interface SwapExerciseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movementPattern: MovementPattern;
  muscleGroup?: MuscleGroup;
  /** Trenutna vežba — exclude iz alternatives */
  currentExerciseId: number | null;
  /** Profile injuries za safety filter (exclude contraindicated) */
  injuries: string[];
  /** Callback kad korisnik izabere alternativu; permanent = "Zameni trajno" */
  onPick: (exercise: Exercise, opts: { permanent: boolean }) => void;
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
  const { clientId } = useAuth();
  // Equipment profil se učitava samo dok je sheet otvoren (open → enabled).
  const { data: clientEquipment = [] } = useClientEquipment(open ? clientId : null);
  const [alternatives, setAlternatives] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [permanent, setPermanent] = useState(false);

  // Reset toggle-a pri svakom otvaranju — trajna zamena je svesna odluka.
  useEffect(() => {
    if (open) setPermanent(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const all = await listExercisesByPattern(movementPattern, muscleGroup);
        if (cancelled) return;
        const safeInjuries = injuries.filter((i) => i !== "none");
        const candidates = all
          .filter((ex) => ex.id !== currentExerciseId)
          .filter((ex) =>
            // Safety: exclude exercises contraindicated for any of user's injuries
            safeInjuries.length === 0 ||
            !safeInjuries.some((inj) =>
              ex.contraindications.includes(inj as typeof ex.contraindications[number]),
            ),
          );
        // Equipment filter: prazan profil → bez filtera (ne prazan spisak!)
        const available = filterExercisesByEquipment(candidates, clientEquipment);
        // Ranking istom scoring logikom kao automatski surgical swap
        const ranked = rankExerciseCandidates(available).slice(0, 5);
        setAlternatives(ranked);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, movementPattern, muscleGroup, currentExerciseId, injuries, clientEquipment]);

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

            {/* "Zameni trajno" — toggle: zamena važi za sve buduće treninge */}
            <div className="mt-4 flex items-center justify-between gap-3 bg-background-secondary border border-border rounded-2xl p-4">
              <div className="flex-1 min-w-0">
                <p className="text-body font-semibold text-foreground">
                  {t("workout.swapPermanent")}
                </p>
                <p className="text-caption-1 text-muted-foreground mt-0.5">
                  {t("workout.swapPermanentHint")}
                </p>
              </div>
              <Switch
                checked={permanent}
                onCheckedChange={setPermanent}
                aria-label={t("workout.swapPermanent")}
              />
            </div>

            <div className="mt-3 space-y-2">
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
                    onPick(ex, { permanent });
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
