import { useState, useCallback, useRef, useEffect } from "react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { TAP_SCALE } from "@/lib/motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
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
// Dekompozicija — UI delovi izdvojeni u ClientNutritionPlanParts.tsx + Sheets fajl
import {
  DailyTargetsCard,
  MealSwipeCard,
  NutritionUndoBar,
} from "./ClientNutritionPlanParts";
import {
  MACRO_PRESETS,
  MacroPresetSheet,
  TemplateSwitcherSheet,
  AddMealSheet,
} from "./ClientNutritionPlanSheets";

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

// Koji bottom sheet je otvoren — konsolidovano iz 3 zasebna boolean useState-a
type OpenSheet = "macro" | "template" | "addMeal" | null;

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

  // Sheets — jedan state atom umesto 3 boolean-a (mehanička konsolidacija)
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);

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
    setOpenSheet(null);
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
    setOpenSheet(null);
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
    setOpenSheet(null);
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

  // Is training day (mock)
  const isTrainingDay = new Date().getDay() % 2 === 1; // odd days = training

  return (
    <div className="space-y-3">
      {/* Daily Targets Card */}
      <DailyTargetsCard
        dailyCalories={dailyCalories}
        editingCalories={editingCalories}
        calorieInput={calorieInput}
        onCalorieInputChange={setCalorieInput}
        onCommitCalories={commitCalories}
        onStartEditing={() => {
          setEditingCalories(true);
          setCalorieInput(String(dailyCalories));
        }}
        macroRatio={macroRatio}
        selectedTemplate={selectedTemplate}
        onOpenMacroSheet={() => setOpenSheet("macro")}
        onOpenTemplateSheet={() => setOpenSheet("template")}
        onReset={resetToDefaults}
      />

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
        <MealSwipeCard
          key={`${meal.mealId}-${index}`}
          meal={meal}
          index={index}
          dailyCalories={dailyCalories}
          mealsCount={meals.length}
          isSwiped={swipedIndex === index}
          onSwipeChange={setSwipedIndex}
          onReplace={replaceMeal}
          onRemove={removeMeal}
          onChangePortion={changePortion}
        />
      ))}

      {/* Add Meal Button */}
      <motion.button
        whileTap={{ scale: TAP_SCALE.secondary }}
        onClick={() => setOpenSheet("addMeal")}
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
      <NutritionUndoBar
        visible={!!undoState}
        onUndo={handleUndo}
        onDismiss={() => setUndoState(null)}
      />

      {/* Macro Preset Sheet */}
      <MacroPresetSheet
        open={openSheet === "macro"}
        onOpenChange={(open) => setOpenSheet(open ? "macro" : null)}
        macroRatio={macroRatio}
        onSelect={selectMacroPreset}
      />

      {/* Template Switcher Sheet */}
      <TemplateSwitcherSheet
        open={openSheet === "template"}
        onOpenChange={(open) => setOpenSheet(open ? "template" : null)}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onSelect={switchTemplate}
      />

      {/* Add Meal Sheet */}
      <AddMealSheet
        open={openSheet === "addMeal"}
        onOpenChange={(open) => setOpenSheet(open ? "addMeal" : null)}
        onSelect={addMealSlot}
      />
    </div>
  );
};

export default ClientNutritionPlan;
