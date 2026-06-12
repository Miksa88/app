// Izdvojeni delovi ClientNutritionPlan komponente — daily targets kartica, meal swipe kartica
// i undo bar. Verbatim JSX premešten iz ClientNutritionPlan.tsx, bez izmena logike.
// Bottom sheet-ovi su u ClientNutritionPlanSheets.tsx.
import { ICON_SIZE } from "@/lib/design-tokens";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, RefreshCw, X, Pencil } from "lucide-react";
import { TAP_SCALE } from "@/lib/motion";
import { useLanguage } from "@/contexts/LanguageContext";
import type {
  GeneratedMeal,
  NutritionTemplate,
} from "@/utils/mealPlanGenerator";
import type { MacroRatio } from "./ClientNutritionPlanSheets";

// Daily Targets Card — kalorije (inline edit), macro bar-ovi, training/rest day, template + reset
export const DailyTargetsCard = ({
  dailyCalories,
  editingCalories,
  calorieInput,
  onCalorieInputChange,
  onCommitCalories,
  onStartEditing,
  macroRatio,
  selectedTemplate,
  onOpenMacroSheet,
  onOpenTemplateSheet,
  onReset,
}: {
  dailyCalories: number;
  editingCalories: boolean;
  calorieInput: string;
  onCalorieInputChange: (v: string) => void;
  onCommitCalories: () => void;
  onStartEditing: () => void;
  macroRatio: MacroRatio;
  selectedTemplate: NutritionTemplate;
  onOpenMacroSheet: () => void;
  onOpenTemplateSheet: () => void;
  onReset: () => void;
}) => {
  const { t } = useLanguage();

  // Macro display calculations (selectedTemplate je guaranteed non-null posle guard-a)
  const proteinGrams = Math.round((dailyCalories * macroRatio.protein) / 100 / 4);
  const carbsGrams = Math.round((dailyCalories * macroRatio.carbs) / 100 / 4);
  const fatGrams = Math.round((dailyCalories * macroRatio.fat) / 100 / 9);
  const trainingDayCal = dailyCalories + (selectedTemplate.differentOnTrainingDays ? (selectedTemplate.trainingDayModifier || 150) : 0);
  const restDayCal = dailyCalories + (selectedTemplate.differentOnTrainingDays ? (selectedTemplate.restDayModifier || -100) : 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-card rounded-xl p-4 card-shadow"
    >
      {/* Calories header */}
      <div className="flex items-center justify-between mb-3">
        {editingCalories ? (
          <input
            type="number"
            value={calorieInput}
            onChange={(e) => onCalorieInputChange(e.target.value)}
            onBlur={onCommitCalories}
            onKeyDown={(e) => e.key === "Enter" && onCommitCalories()}
            autoFocus
            className="text-title-2 font-bold text-foreground bg-transparent border-b-2 border-primary outline-none w-32"
          />
        ) : (
          <button
            onClick={onStartEditing}
            className="text-title-2 font-bold text-foreground flex items-center gap-2"
          >
            {dailyCalories} kcal
            <Pencil size={ICON_SIZE.xs} className="text-muted-foreground" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Macro bars */}
      <button
        onClick={onOpenMacroSheet}
        className="w-full text-left"
      >
        <div className="flex gap-2 mb-2">
          <div className="flex-1">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${macroRatio.protein}%`,
                  backgroundColor: "hsl(var(--info))",
                }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${macroRatio.carbs}%`,
                  backgroundColor: "hsl(var(--warning))",
                }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${macroRatio.fat}%`,
                  backgroundColor: "hsl(var(--destructive))",
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 text-caption-1">
          <span className="flex-1 text-info font-semibold">
            {t("nutrition.protein")} {proteinGrams}g ({macroRatio.protein}%)
          </span>
          <span className="flex-1 text-warning-foreground font-semibold">
            {t("nutrition.carbs")} {carbsGrams}g ({macroRatio.carbs}%)
          </span>
          <span className="flex-1 text-destructive font-semibold">
            {t("nutrition.fat")} {fatGrams}g ({macroRatio.fat}%)
          </span>
        </div>
      </button>

      {/* Training/Rest day */}
      {selectedTemplate.differentOnTrainingDays && (
        <div className="flex gap-4 mt-3 text-caption-1 text-muted-foreground">
          <span>{t("nutrition.trainingDayLabel")}: {trainingDayCal} kcal</span>
          <span>{t("nutrition.restDayLabel")}: {restDayCal} kcal</span>
        </div>
      )}

      {/* Template & Reset */}
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={onOpenTemplateSheet}
          className="text-caption-1 text-muted-foreground"
        >
          {t("nutrition.template")}: {selectedTemplate.name}
        </button>
        <button
          onClick={onReset}
          className="text-caption-1 text-primary flex items-center gap-1"
        >
          <RefreshCw size={ICON_SIZE.xs} />
          {t("nutrition.resetToDefaults")}
        </button>
      </div>
    </motion.div>
  );
};

// Meal kartica sa swipe akcijama (replace/remove) i portion adjuster-om
export const MealSwipeCard = ({
  meal,
  index,
  dailyCalories,
  mealsCount,
  isSwiped,
  onSwipeChange,
  onReplace,
  onRemove,
  onChangePortion,
}: {
  meal: GeneratedMeal;
  index: number;
  dailyCalories: number;
  mealsCount: number;
  isSwiped: boolean;
  onSwipeChange: (index: number | null) => void;
  onReplace: (index: number) => void;
  onRemove: (index: number) => void;
  onChangePortion: (index: number, delta: number) => void;
}) => {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="relative overflow-hidden rounded-xl"
    >
      {/* Swipe actions behind */}
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={() => onReplace(index)}
          className="w-20 flex items-center justify-center text-caption-1 font-semibold"
          style={{ backgroundColor: "hsl(var(--info))" }}
        >
          <span className="text-white">{t("nutrition.replace")}</span>
        </button>
        <button
          onClick={() => onRemove(index)}
          className="w-20 flex items-center justify-center text-caption-1 font-semibold"
          style={{ backgroundColor: "hsl(var(--destructive))" }}
        >
          <span className="text-white">{t("nutrition.remove")}</span>
        </button>
      </div>

      {/* Main card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -160, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (info.offset.x < -80) {
            onSwipeChange(index);
          } else {
            onSwipeChange(null);
          }
        }}
        animate={{ x: isSwiped ? -160 : 0 }}
        className="bg-card rounded-xl p-4 card-shadow relative z-10"
      >
        <div className="flex items-start justify-between mb-1">
          <span className="text-caption-2 text-muted-foreground uppercase tracking-wide font-semibold">
            {meal.slotLabel}
          </span>
          <span className="text-caption-2 text-muted-foreground">
            {mealsCount > 0
              ? `${Math.round(
                  (meal.calories / (dailyCalories || 1)) * 100
                )}%`
              : ""}
          </span>
        </div>
        <p className="text-body font-semibold text-foreground mb-1">
          {meal.name}
        </p>
        <p className="text-caption-1 text-muted-foreground mb-2">
          {meal.calories} kcal ·{" "}
          <span style={{ color: "hsl(var(--info))" }}>{meal.protein}g P</span> ·{" "}
          <span style={{ color: "hsl(var(--warning))" }}>{meal.carbs}g C</span> ·{" "}
          <span style={{ color: "hsl(var(--destructive))" }}>{meal.fat}g F</span>
        </p>

        {/* Portion adjuster */}
        <div className="flex items-center gap-3">
          <span className="text-caption-1 text-muted-foreground">
            {t("nutrition.serving")}:
          </span>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: TAP_SCALE.iconStrong }}
              onClick={() => onChangePortion(index, -0.25)}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center min-w-[32px]"
            >
              <Minus size={ICON_SIZE.xs} className="text-foreground" />
            </motion.button>
            <span className="text-body font-semibold text-foreground w-10 text-center">
              {meal.portionMultiplier.toFixed(2)}x
            </span>
            <motion.button
              whileTap={{ scale: TAP_SCALE.iconStrong }}
              onClick={() => onChangePortion(index, 0.25)}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center min-w-[32px]"
            >
              <Plus size={ICON_SIZE.xs} className="text-foreground" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Undo snackbar — fiksiran iznad bottom nav-a
export const NutritionUndoBar = ({
  visible,
  onUndo,
  onDismiss,
}: {
  visible: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}) => {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-snackbar bg-foreground text-background px-4 py-3 rounded-xl flex items-center gap-3 card-shadow"
        >
          <span className="text-caption-1">
            {t("nutrition.planUpdated")}
          </span>
          <button
            onClick={onUndo}
            className="text-primary text-caption-1 font-semibold"
          >
            {t("nutrition.undo")}
          </button>
          <button onClick={onDismiss}>
            <X size={ICON_SIZE.xs} className="text-background/60" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
