import { useState, useCallback, useRef, useEffect } from "react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, ChevronRight, RefreshCw, X, ChevronDown, Pencil } from "lucide-react";
import { TAP_SCALE } from "@/lib/motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import type { FoodItem } from "@/data/foodDatabase";
import {
  generateMealPlan,
  GeneratedMealPlan,
  GeneratedMeal,
  type NutritionTemplate,
  type ClientProfile,
} from "@/utils/mealPlanGenerator";
import { useFoodItems } from "@/hooks/useFoodItems";
import { useNutritionTemplates } from "@/hooks/useNutritionTemplates";
import PlanInsightCard from "@/components/PlanInsightCard";
import { BottomSheet } from "@/components/ui/bottom-sheet";

interface ClientNutritionPlanProps {
  client: {
    id: string | number;
    name: string;
    weight: number | string;
    height: number | string;
    dateOfBirth: string;
    goals: string[];
    allergies: string[] | string;
    foodDislikes: string[] | string;
    jobType: string;
    currentMealPlan?: string | null;
  };
}

// Modification tracking (internal only)
interface ClientMealPlanState {
  templateId: string | null;
  modificationLevel: "auto" | "edited" | "custom";
  overrides: {
    caloriesOverridden: boolean;
    macrosOverridden: boolean;
    mealsSwapped: number;
    mealsAdded: number;
    mealsRemoved: number;
    portionsChanged: number;
  };
  lastModifiedBy: "algorithm" | "trainer";
  lastModifiedAt: string;
}

function getModificationLevel(
  overrides: ClientMealPlanState["overrides"]
): "auto" | "edited" | "custom" {
  const totalChanges =
    overrides.mealsSwapped + overrides.mealsAdded + overrides.mealsRemoved;
  if (
    !overrides.caloriesOverridden &&
    !overrides.macrosOverridden &&
    totalChanges === 0 &&
    overrides.portionsChanged === 0
  )
    return "auto";
  if (
    overrides.caloriesOverridden ||
    overrides.macrosOverridden ||
    totalChanges >= 3
  )
    return "custom";
  return "edited";
}

const MACRO_PRESETS = [
  { id: "balanced", label: "Balanced", p: 30, c: 40, f: 30 },
  { id: "highProtein", label: "High Protein", p: 40, c: 30, f: 30 },
  { id: "lowCarb", label: "Low Carb", p: 40, c: 20, f: 40 },
  { id: "keto", label: "Keto", p: 25, c: 5, f: 70 },
  { id: "lowFat", label: "Low Fat", p: 25, c: 55, f: 20 },
];

const MEAL_SLOT_TYPES = [
  "breakfast",
  "morning_snack",
  "lunch",
  "afternoon_snack",
  "dinner",
  "evening_snack",
  "pre_workout",
  "post_workout",
] as const;

function buildMockClientProfile(client: ClientNutritionPlanProps["client"]): ClientProfile {
  const weightNum = typeof client.weight === 'number' ? client.weight : parseInt(String(client.weight)) || 70;
  const heightNum = typeof client.height === 'number' ? client.height : parseInt(String(client.height)) || 170;
  const dob = new Date(client.dateOfBirth);
  const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const allergiesArr = Array.isArray(client.allergies) ? client.allergies : (client.allergies ? String(client.allergies).split(",").map((a) => a.trim().toLowerCase()) : []);
  const foodDislikesArr = Array.isArray(client.foodDislikes) ? client.foodDislikes : (client.foodDislikes ? String(client.foodDislikes).split(",").map((d) => d.trim()) : []);
  return {
    weight: weightNum,
    height: heightNum,
    age: age || 28,
    gender: "female",
    goal: client.goals[0]?.toLowerCase().includes("fat") ? "fat_loss" : client.goals[0]?.toLowerCase().includes("muscle") ? "muscle_gain" : "health",
    experience: "intermediate",
    frequency: 4,
    allergies: allergiesArr,
    foodDislikes: foodDislikesArr,
    metabolicProfile: ["none"],
    sleepQuality: 7,
    stressLevel: 4,
    jobType: client.jobType?.toLowerCase().includes("sedentary") ? "sedentary" : client.jobType?.toLowerCase().includes("active") ? "active" : "mixed",
  };
}

const ClientNutritionPlan = ({ client }: ClientNutritionPlanProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Real DB-backed pools (W-9)
  const { foods: foodPool, isLoading: foodsLoading } = useFoodItems();
  const { data: templates = [], isLoading: templatesLoading } = useNutritionTemplates();

  // Find template — lazy: prazno dok templates ne stignu, prvi auto-select
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Auto-select prvog template-a kad podaci stignu
  useEffect(() => {
    if (!selectedTemplateId && templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  // Generate plan
  const clientProfile = buildMockClientProfile(client);
  const [plan, setPlan] = useState<GeneratedMealPlan | null>(null);

  // Editable state — defaults dok plan ne generiše
  const [dailyCalories, setDailyCalories] = useState(0);
  const [macroRatio, setMacroRatio] = useState({ protein: 30, carbs: 40, fat: 30 });
  const [meals, setMeals] = useState<GeneratedMeal[]>([]);
  const [editingCalories, setEditingCalories] = useState(false);
  const [calorieInput, setCalorieInput] = useState("0");

  // Generiši plan kad podaci stignu (template + food pool)
  useEffect(() => {
    if (selectedTemplate && foodPool.length > 0) {
      const generated = generateMealPlan(clientProfile, selectedTemplate, foodPool);
      setPlan(generated);
      setDailyCalories(generated.dailyCalories);
      setCalorieInput(String(generated.dailyCalories));
      setMacroRatio(selectedTemplate.macroRatio);
      setMeals(generated.meals);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate?.id, foodPool.length]);

  // Sheets
  const [macroSheetOpen, setMacroSheetOpen] = useState(false);
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [addMealSheetOpen, setAddMealSheetOpen] = useState(false);

  // Undo
  const [undoState, setUndoState] = useState<{ meals: GeneratedMeal[]; calories: number; macros: typeof macroRatio } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modification tracking
  const [overrides, setOverrides] = useState<ClientMealPlanState["overrides"]>({
    caloriesOverridden: false,
    macrosOverridden: false,
    mealsSwapped: 0,
    mealsAdded: 0,
    mealsRemoved: 0,
    portionsChanged: 0,
  });

  const showUndo = useCallback(
    (prevMeals: GeneratedMeal[], prevCal: number, prevMacros: typeof macroRatio) => {
      setUndoState({ meals: prevMeals, calories: prevCal, macros: prevMacros });
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoState(null), 5000);
    },
    [macroRatio]
  );

  const handleUndo = () => {
    if (!undoState) return;
    setMeals(undoState.meals);
    setDailyCalories(undoState.calories);
    setMacroRatio(undoState.macros);
    setCalorieInput(String(undoState.calories));
    setUndoState(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    toast(t("nutrition.undo"));
  };

  // Save calories inline
  const commitCalories = () => {
    const val = parseInt(calorieInput);
    if (!val || val < 800 || val > 6000) {
      setCalorieInput(String(dailyCalories));
      setEditingCalories(false);
      return;
    }
    const prev = { meals: [...meals], calories: dailyCalories, macros: { ...macroRatio } };
    setDailyCalories(val);
    setOverrides((o) => ({ ...o, caloriesOverridden: true }));
    setEditingCalories(false);
    toast(t("nutrition.planUpdated"));
    showUndo(prev.meals, prev.calories, prev.macros);
  };

  // Macro preset select
  const selectMacroPreset = (preset: typeof MACRO_PRESETS[0]) => {
    const prev = { meals: [...meals], calories: dailyCalories, macros: { ...macroRatio } };
    setMacroRatio({ protein: preset.p, carbs: preset.c, fat: preset.f });
    setOverrides((o) => ({ ...o, macrosOverridden: true }));
    setMacroSheetOpen(false);
    toast(t("nutrition.planUpdated"));
    showUndo(prev.meals, prev.calories, prev.macros);
  };

  // Template switch
  const switchTemplate = (tmpl: NutritionTemplate) => {
    setSelectedTemplateId(tmpl.id);
    if (foodPool.length === 0) return;
    const newPlan = generateMealPlan(clientProfile, tmpl, foodPool);
    setPlan(newPlan);
    setDailyCalories(newPlan.dailyCalories);
    setCalorieInput(String(newPlan.dailyCalories));
    setMacroRatio(tmpl.macroRatio);
    setMeals(newPlan.meals);
    setOverrides({
      caloriesOverridden: false,
      macrosOverridden: false,
      mealsSwapped: 0,
      mealsAdded: 0,
      mealsRemoved: 0,
      portionsChanged: 0,
    });
    setTemplateSheetOpen(false);
    toast(t("nutrition.planUpdated"));
  };

  // Reset
  const resetToDefaults = () => {
    if (!window.confirm(t("nutrition.resetConfirm"))) return;
    if (!selectedTemplate || foodPool.length === 0) return;
    const newPlan = generateMealPlan(clientProfile, selectedTemplate, foodPool);
    setPlan(newPlan);
    setDailyCalories(newPlan.dailyCalories);
    setCalorieInput(String(newPlan.dailyCalories));
    setMacroRatio(selectedTemplate.macroRatio);
    setMeals(newPlan.meals);
    setOverrides({
      caloriesOverridden: false,
      macrosOverridden: false,
      mealsSwapped: 0,
      mealsAdded: 0,
      mealsRemoved: 0,
      portionsChanged: 0,
    });
    toast(t("nutrition.planUpdated"));
  };

  // Portion change
  const changePortion = (index: number, delta: number) => {
    const prev = { meals: [...meals], calories: dailyCalories, macros: { ...macroRatio } };
    setMeals((curr) =>
      curr.map((m, i) => {
        if (i !== index) return m;
        const newMult = Math.max(0.25, Math.round((m.portionMultiplier + delta) * 100) / 100);
        const ratio = newMult / m.portionMultiplier;
        return {
          ...m,
          portionMultiplier: newMult,
          calories: Math.round(m.calories * ratio),
          protein: Math.round(m.protein * ratio),
          carbs: Math.round(m.carbs * ratio),
          fat: Math.round(m.fat * ratio),
          fiber: Math.round(m.fiber * ratio),
        };
      })
    );
    setOverrides((o) => ({ ...o, portionsChanged: o.portionsChanged + 1 }));
    toast(t("nutrition.planUpdated"));
    showUndo(prev.meals, prev.calories, prev.macros);
  };

  // Remove meal
  const removeMeal = (index: number) => {
    if (meals.length <= 3) {
      toast(t("nutrition.minMealsWarning"));
      return;
    }
    const prev = { meals: [...meals], calories: dailyCalories, macros: { ...macroRatio } };
    setMeals((curr) => curr.filter((_, i) => i !== index));
    setOverrides((o) => ({ ...o, mealsRemoved: o.mealsRemoved + 1 }));
    toast(t("nutrition.planUpdated"));
    showUndo(prev.meals, prev.calories, prev.macros);
  };

  // Add meal slot
  const addMealSlot = (slotType: string) => {
    setAddMealSheetOpen(false);
    // Navigate to picker with slot info
    navigate(`/trainer/client/${client.id}/meal-picker?slot=${slotType}&calories=${Math.round(dailyCalories * 0.1)}`);
  };

  // Navigate to replace
  const replaceMeal = (index: number) => {
    const meal = meals[index];
    navigate(`/trainer/client/${client.id}/meal-picker?slot=${meal.slot}&calories=${meal.calories}&replace=${index}`);
  };

  // Swipe state per meal — MORA biti pre loading guard-a (Rules of Hooks)
  const [swipedIndex, setSwipedIndex] = useState<number | null>(null);

  // Loading state — čekamo da templates + foods stignu pa da generišemo plan.
  // KRITIČNO: ovaj guard MORA biti pre bilo kakvih `selectedTemplate.x` access-a.
  if (templatesLoading || foodsLoading || !plan || !selectedTemplate) {
    return (
      <div className="space-y-3 py-6 flex flex-col items-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-hidden="true" />
        <p className="text-caption-1 text-muted-foreground">{t("common.loading") ?? "Loading..."}</p>
      </div>
    );
  }

  // Macro display calculations (selectedTemplate je guaranteed non-null posle guard-a)
  const proteinGrams = Math.round((dailyCalories * macroRatio.protein) / 100 / 4);
  const carbsGrams = Math.round((dailyCalories * macroRatio.carbs) / 100 / 4);
  const fatGrams = Math.round((dailyCalories * macroRatio.fat) / 100 / 9);
  const trainingDayCal = dailyCalories + (selectedTemplate.differentOnTrainingDays ? (selectedTemplate.trainingDayModifier || 150) : 0);
  const restDayCal = dailyCalories + (selectedTemplate.differentOnTrainingDays ? (selectedTemplate.restDayModifier || -100) : 0);

  // Is training day (mock)
  const isTrainingDay = new Date().getDay() % 2 === 1; // odd days = training

  return (
    <div className="space-y-3">
      {/* Daily Targets Card */}
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
              onChange={(e) => setCalorieInput(e.target.value)}
              onBlur={commitCalories}
              onKeyDown={(e) => e.key === "Enter" && commitCalories()}
              autoFocus
              className="text-title-2 font-bold text-foreground bg-transparent border-b-2 border-primary outline-none w-32"
            />
          ) : (
            <button
              onClick={() => {
                setEditingCalories(true);
                setCalorieInput(String(dailyCalories));
              }}
              className="text-title-2 font-bold text-foreground flex items-center gap-2"
            >
              {dailyCalories} kcal
              <Pencil size={ICON_SIZE.xs} className="text-muted-foreground" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Macro bars */}
        <button
          onClick={() => setMacroSheetOpen(true)}
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
              Protein {proteinGrams}g ({macroRatio.protein}%)
            </span>
            <span className="flex-1 text-warning-foreground font-semibold">
              Carbs {carbsGrams}g ({macroRatio.carbs}%)
            </span>
            <span className="flex-1 text-destructive font-semibold">
              Fat {fatGrams}g ({macroRatio.fat}%)
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
            onClick={() => setTemplateSheetOpen(true)}
            className="text-caption-1 text-muted-foreground"
          >
            {t("nutrition.template")}: {selectedTemplate.name}
          </button>
          <button
            onClick={resetToDefaults}
            className="text-caption-1 text-primary flex items-center gap-1"
          >
            <RefreshCw size={ICON_SIZE.xs} />
            {t("nutrition.resetToDefaults")}
          </button>
        </div>
      </motion.div>

      {/* Insight Card */}
      <PlanInsightCard
        insights={plan.insights}
        metabolicAdjustments={plan.metabolicAdjustments}
      />

      {/* Today's Meals */}
      <div className="flex items-center justify-between">
        <h3 className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide">
          {t("nutrition.todaysMeals")}
        </h3>
        <span
          className={`text-caption-1 font-semibold px-2.5 py-0.5 rounded-full ${
            isTrainingDay
              ? "bg-success/15 text-success"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isTrainingDay ? t("nutrition.trainingDayLabel") : t("nutrition.restDayLabel")}
        </span>
      </div>

      {meals.map((meal, index) => (
        <motion.div
          key={`${meal.mealId}-${index}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className="relative overflow-hidden rounded-xl"
        >
          {/* Swipe actions behind */}
          <div className="absolute inset-y-0 right-0 flex">
            <button
              onClick={() => replaceMeal(index)}
              className="w-20 flex items-center justify-center text-caption-1 font-semibold"
              style={{ backgroundColor: "hsl(var(--info))" }}
            >
              <span className="text-white">{t("nutrition.replace")}</span>
            </button>
            <button
              onClick={() => removeMeal(index)}
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
                setSwipedIndex(index);
              } else {
                setSwipedIndex(null);
              }
            }}
            animate={{ x: swipedIndex === index ? -160 : 0 }}
            className="bg-card rounded-xl p-4 card-shadow relative z-10"
          >
            <div className="flex items-start justify-between mb-1">
              <span className="text-caption-2 text-muted-foreground uppercase tracking-wide font-semibold">
                {meal.slotLabel}
              </span>
              <span className="text-caption-2 text-muted-foreground">
                {meals.length > 0
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
                  onClick={() => changePortion(index, -0.25)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center min-w-[32px]"
                >
                  <Minus size={ICON_SIZE.xs} className="text-foreground" />
                </motion.button>
                <span className="text-body font-semibold text-foreground w-10 text-center">
                  {meal.portionMultiplier.toFixed(2)}x
                </span>
                <motion.button
                  whileTap={{ scale: TAP_SCALE.iconStrong }}
                  onClick={() => changePortion(index, 0.25)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center min-w-[32px]"
                >
                  <Plus size={ICON_SIZE.xs} className="text-foreground" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ))}

      {/* Add Meal Button */}
      <motion.button
        whileTap={{ scale: TAP_SCALE.secondary }}
        onClick={() => setAddMealSheetOpen(true)}
        className="w-full py-3 border-2 border-dashed border-border rounded-xl text-body text-muted-foreground font-medium min-h-11"
      >
        + {t("nutrition.addMeal")}
      </motion.button>

      {/* Weekly view link */}
      <button
        onClick={() => {}}
        className="w-full flex items-center justify-center gap-1 py-3 text-primary text-footnote font-medium"
      >
        {t("nutrition.viewWeek")} <ChevronRight size={ICON_SIZE.xs} />
      </button>

      {/* Undo Bar */}
      <AnimatePresence>
        {undoState && (
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
              onClick={handleUndo}
              className="text-primary text-caption-1 font-semibold"
            >
              {t("nutrition.undo")}
            </button>
            <button onClick={() => setUndoState(null)}>
              <X size={ICON_SIZE.xs} className="text-background/60" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Macro Preset Sheet */}
      <BottomSheet
        open={macroSheetOpen}
        onOpenChange={setMacroSheetOpen}
        title={t("nutrition.macroPreset")}
      >
        <div className="space-y-2 pt-2 pb-2">
          {MACRO_PRESETS.map((preset) => (
            <motion.button
              key={preset.id}
              whileTap={{ scale: TAP_SCALE.secondary }}
              onClick={() => selectMacroPreset(preset)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border ios-row-h ${
                macroRatio.protein === preset.p &&
                macroRatio.carbs === preset.c &&
                macroRatio.fat === preset.f
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              {/* Mini bar */}
              <div className="flex w-16 h-3 rounded-full overflow-hidden shrink-0">
                <div style={{ width: `${preset.p}%`, backgroundColor: "hsl(var(--info))" }} />
                <div style={{ width: `${preset.c}%`, backgroundColor: "hsl(var(--warning))" }} />
                <div style={{ width: `${preset.f}%`, backgroundColor: "hsl(var(--destructive))" }} />
              </div>
              <div className="text-left flex-1">
                <p className="text-body font-semibold text-foreground">
                  {preset.label}
                </p>
                <p className="text-caption-1 text-muted-foreground">
                  P:{preset.p}% C:{preset.c}% F:{preset.f}%
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </BottomSheet>

      {/* Template Switcher Sheet */}
      <BottomSheet
        open={templateSheetOpen}
        onOpenChange={setTemplateSheetOpen}
        title={t("nutrition.templates")}
      >
        <div className="space-y-2 pt-2 pb-2">
          {templates.map((tmpl) => (
            <motion.button
              key={tmpl.id}
              whileTap={{ scale: TAP_SCALE.secondary }}
              onClick={() => switchTemplate(tmpl)}
              className={`w-full text-left p-3 rounded-xl border ios-row-h ${
                selectedTemplateId === tmpl.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <p className="text-body font-semibold text-foreground">
                {tmpl.name}
              </p>
              <p className="text-caption-1 text-muted-foreground">
                {tmpl.description}
              </p>
            </motion.button>
          ))}
        </div>
      </BottomSheet>

      {/* Add Meal Sheet */}
      <BottomSheet
        open={addMealSheetOpen}
        onOpenChange={setAddMealSheetOpen}
        title={t("nutrition.addMeal")}
      >
        <div className="space-y-1 pt-2 pb-2">
          {MEAL_SLOT_TYPES.map((type) => {
            const labelKey = `nutrition.mealSlot${type
              .split("_")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join("")}`;
            return (
              <motion.button
                key={type}
                whileTap={{ scale: TAP_SCALE.secondary }}
                onClick={() => addMealSlot(type)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-card min-h-11"
              >
                <span className="text-body text-foreground">{t(labelKey)}</span>
                <ChevronRight size={16} className="text-muted-foreground/40" />
              </motion.button>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
};

export default ClientNutritionPlan;
