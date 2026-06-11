// ============================================================================
// ExtraMealSheet — log obrok van plana ("jedem nešto što nije u planu")
// ============================================================================
//
// Šta korisnik unosi:
//   - Šta je pojeo (free text, npr. "šaka oraha")
//   - kcal + protein + carbs + fat (custom unos)
//   - Da li su kalorije tečne (Spec 02 Sekcija 13 — Sync Rule 6 input)
//   - Notes (opciono)
//
// Šta backend radi:
//   - Insert u meal_logs sa meal_id="off_plan_<timestamp>", status='logged'
//   - Recompute liquid kcal 24h → metabolic noise flag
//   - Update user_status (red flags, hydration ako je liquid)
//   - getDailyTotals automatski uključuje ovaj obrok u dnevni zbir
// ============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { logMeal } from "@/services/mealLogService";
import { trackFeature } from "@/services/usageAnalyticsService";
import { IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { toast } from "sonner";

interface ExtraMealSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const inputClass =
  "w-full bg-muted/50 text-foreground placeholder:text-muted-foreground/50 rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-12";

const ExtraMealSheet = ({ open, onOpenChange, onSaved }: ExtraMealSheetProps) => {
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [wasLiquid, setWasLiquid] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setWasLiquid(false);
    setNotes("");
  };

  const canSave =
    name.trim().length > 0 &&
    Number(calories) > 0 &&
    !saving &&
    Boolean(clientId);

  const handleSave = async () => {
    if (!clientId || !canSave) return;
    setSaving(true);
    try {
      await logMeal({
        clientId,
        mealId: `off_plan_${Date.now()}`,
        mealSlotIndex: 0,
        status: "completed",
        caloriesActual: Number(calories) || 0,
        proteinActual: Number(protein) || 0,
        carbsActual: Number(carbs) || 0,
        fatActual: Number(fat) || 0,
        wasLiquidCalories: wasLiquid,
        notes: notes.trim() ? `${name.trim()} — ${notes.trim()}` : name.trim(),
      });
      toast.success(t("food.savedExtraMeal"));
      // Faza 4.2: usage event na success path — fail-silent
      trackFeature('extra_meal_logged');
      reset();
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

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
            aria-label={t("food.logExtraMeal")}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto bg-card rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto"
          >
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />

            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-title-2 font-bold text-foreground">{t("food.logExtraMeal")}</h2>
                <p className="text-caption-1 text-muted-foreground mt-0.5">{t("food.logExtraHint")}</p>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                aria-label={t("mealPlan.cancel")}
                className="text-muted-foreground min-w-11 min-h-11 flex items-center justify-center"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 mt-4">
              <div>
                <label className="text-caption-1 font-medium text-muted-foreground mb-1.5 block">
                  {t("food.extraMealName")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("food.extraMealNamePlaceholder")}
                  className={inputClass}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-caption-1 font-medium text-muted-foreground mb-1.5 block">
                  {t("food.calories")}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-caption-2 font-medium text-muted-foreground mb-1 block">
                    {t("food.proteinG")}
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-caption-2 font-medium text-muted-foreground mb-1 block">
                    {t("food.carbsG")}
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-caption-2 font-medium text-muted-foreground mb-1 block">
                    {t("food.fatG")}
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                onClick={() => setWasLiquid((v) => !v)}
                role="switch"
                aria-checked={wasLiquid}
                className="w-full flex items-start gap-3 px-4 py-3 rounded-xl bg-muted/30 text-left min-h-14"
              >
                <div className={`w-[44px] h-[26px] rounded-full p-[2px] transition-colors duration-base shrink-0 mt-0.5 ${wasLiquid ? "bg-primary" : "bg-muted"}`} aria-hidden="true">
                  <motion.div
                    layout
                    transition={IOS_SPRING.precise}
                    className={`w-[22px] h-[22px] rounded-full bg-white shadow-sm ${wasLiquid ? "ml-auto" : "ml-0"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body text-foreground">{t("food.wasLiquid")}</p>
                  <p className="text-caption-1 text-muted-foreground">{t("food.wasLiquidHint")}</p>
                </div>
              </button>

              <div>
                <label className="text-caption-1 font-medium text-muted-foreground mb-1.5 block">
                  {t("food.notes")}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>

            <motion.div whileTap={canSave ? { scale: TAP_SCALE.primary } : undefined} className="mt-6">
              <Button
                onClick={handleSave}
                disabled={!canSave}
                variant="cta"
                size="xl"
              >
                {saving ? "..." : t("food.saveExtraMeal")}
              </Button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const ExtraMealTrigger = ({ onClick }: { onClick: () => void }) => {
  const { t } = useLanguage();
  return (
    <motion.button
      whileTap={{ scale: TAP_SCALE.secondary }}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-dashed border-primary/30 text-left min-h-14 hover:border-primary/50 transition-colors"
      aria-label={t("food.logExtraMeal")}
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Plus size={18} className="text-primary" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body font-semibold text-foreground">{t("food.logExtraMeal")}</p>
        <p className="text-caption-1 text-muted-foreground">{t("food.logExtraHint")}</p>
      </div>
    </motion.button>
  );
};

export default ExtraMealSheet;
