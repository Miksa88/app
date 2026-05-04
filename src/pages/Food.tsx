// ============================================================================
// Food.tsx — klijentkinja meal plan page (IT-13 rewire)
// Spec: 02_NUTRITION_FLOW_MASTER.md §6, §13; 03_INTEGRATION_LAYER.md §3.1
// ============================================================================
//
// IT-13: Zamena mock podataka sa real-time UserStatus + DB food_items.
//   - `useAuth()` → clientId
//   - `useUserStatus(clientId)` → calorie target, metabolic filter, cycle phase
//   - `useFoodItems()` → pool iz food_items tabele (zamena za FOOD_DATABASE)
//   - `generateMealPlan(clientProfile, template, foods, _, cyclePhase)`
//   - `useLogMeal/useSkipMeal/useReplaceMeal` → persistencija obroka + sync
//
// IR meal structure: proverava `status.nutrition.metabolicFilter.includes(
// 'insulin_resistance')`. Za IR klijentkinje slotovi 2 i 4 se markiraju kao
// `mini_meal_ir` (UI label "Mini-obrok (P+F)").
//
// Anti-ingredient filter: već primenjen unutar `generateMealPlan` kroz
// `filterFoodByExclusions` — profil allergija/metabolicFilter ulazi preko
// ClientProfile.allergies/metabolicProfile polja. Dupli filter za "replace"
// modal-e primenjuje isti helper eksplicitno da search pool ne prikazuje
// zabranjena jela.
// ============================================================================

import { useMemo, useState, type ComponentType } from "react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp, IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import {
  Check, X, ArrowRightLeft, Search, Lock,
  Sunrise, Sun, Moon, Apple, Zap, Dumbbell, UtensilsCrossed, GlassWater,
  Drumstick, Wheat, Droplets, ThumbsDown,
  type LucideProps,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useFoodItems } from "@/hooks/useFoodItems";
import { useLogMeal, useSkipMeal, useReplaceMeal } from "@/hooks/mutations/useLogMeal";
import type { FoodItem } from "@/data/foodDatabase";
import {
  generateMealPlan,
  GeneratedMeal,
  GeneratedMealPlan,
  DEFAULT_5_MEAL_SLOTS,
  ClientProfile,
  NutritionTemplate,
} from "@/utils/mealPlanGenerator";
import { buildIngredientExclusionList, filterFoodByExclusions } from "@/utils/nutrition/antiIngredientFilter";
import type { MetabolicCondition } from "@/types/training";
import { FuelingStatusBar } from "@/components/queue/FuelingStatusBar";
import { SyncEventBanner } from "@/components/queue/SyncEventBanner";
import { useHaptic } from "@/hooks/useHaptic";
import { SectionLabel } from "@/components/ui/section-label";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import ExtraMealSheet, { ExtraMealTrigger } from "@/components/food/ExtraMealSheet";
import { addFoodDislike } from "@/services/dislikeService";
import { toast } from "sonner";

// Meal images mapping — fallback mapa za slike lokalno dostupne u assets/meals
import greekYogurt from "@/assets/meals/greek-yogurt.jpg";
import chickenSalad from "@/assets/meals/chicken-salad.jpg";
import salmonBroccoli from "@/assets/meals/salmon-broccoli.jpg";
import overnightOats from "@/assets/meals/overnight-oats.jpg";
import proteinSmoothie from "@/assets/meals/protein-smoothie.jpg";
import proteinBar from "@/assets/meals/protein-bar.jpg";

const MEAL_IMAGES: Record<string, string> = {
  "greek-yogurt.jpg": greekYogurt,
  "chicken-salad.jpg": chickenSalad,
  "salmon-broccoli.jpg": salmonBroccoli,
  "overnight-oats.jpg": overnightOats,
  "protein-smoothie.jpg": proteinSmoothie,
  "protein-bar.jpg": proteinBar,
};

// Meal slot ikone — lucide-react ekvivalenti emoji-ja (fix A9 iz DESIGN_AUDIT.md).
const SLOT_ICON: Record<string, ComponentType<LucideProps>> = {
  breakfast: Sunrise,
  snack_am: GlassWater,
  lunch: Sun,
  snack_pm: Apple,
  dinner: Moon,
  morning_snack: GlassWater,
  afternoon_snack: Apple,
  pre_workout: Zap,
  post_workout: Dumbbell,
  evening_snack: Moon,
};

const SLOT_LABELS: Record<string, string> = {
  breakfast: "nutrition.breakfast",
  snack_am: "nutrition.snackAm",
  lunch: "nutrition.lunch",
  snack_pm: "nutrition.snackPm",
  dinner: "nutrition.dinner",
  morning_snack: "nutrition.snackAm",
  afternoon_snack: "nutrition.snackPm",
  pre_workout: "nutrition.preWorkout",
  post_workout: "nutrition.postWorkout",
  evening_snack: "nutrition.eveningSnack",
};

// Slot indexi koji postaju IR mini-obroci (0-based: 1 = morning_snack,
// 3 = afternoon_snack). Mirror src/utils/nutrition/irMealStructure.ts.
const IR_MINI_MEAL_SLOT_INDEXES = new Set<number>([1, 3]);

function getMealImage(meal: GeneratedMeal, foodPool: FoodItem[]): string | null {
  const dbFood = foodPool.find(f => f.id === meal.mealId);
  if (dbFood?.imageUrl && MEAL_IMAGES[dbFood.imageUrl]) return MEAL_IMAGES[dbFood.imageUrl];
  // Fallback mapping by slot/name
  const name = meal.name.toLowerCase();
  if (name.includes("yogurt") || name.includes("jogurt")) return greekYogurt;
  if (name.includes("chicken") || name.includes("piletina") || name.includes("salad")) return chickenSalad;
  if (name.includes("salmon") || name.includes("losos") || name.includes("fish")) return salmonBroccoli;
  if (name.includes("oat") || name.includes("ovsene")) return overnightOats;
  if (name.includes("smoothie") || name.includes("shake")) return proteinSmoothie;
  if (name.includes("bar") || name.includes("snack")) return proteinBar;
  return null;
}

// ============================================================================
// Default template — koristi se dok nutrition_templates tabela ne bude
// stvarno izložena preko servisa. Makro-split i calorie target ulaze iz
// UserStatus pa ovaj template samo diktira meal slots strukturu.
// ============================================================================

const DEFAULT_TEMPLATE: NutritionTemplate = {
  id: "t-default", name: "Default", description: "", goalType: 'cut',
  macroRatio: { protein: 40, carbs: 35, fat: 25 }, macroPreset: "highProtein",
  calorieStrategy: 'auto', differentOnTrainingDays: true,
  trainingDayModifier: 150, restDayModifier: -100,
  restrictions: [], tags: [], createdAt: "",
  mealCount: 5, mealSlots: [...DEFAULT_5_MEAL_SLOTS],
};

type MealStatus = 'pending' | 'eaten' | 'replaced' | 'skipped';

// ============================================================================
// Derive ClientProfile from UserStatus
// ============================================================================
//
// UserStatus ne nosi sve što ClientProfile zahteva (height, jobType, etc.).
// Za ova polja koristimo bezbedne default-e koji ulaze u calorie/macro
// procene (mealPlanGenerator već ima defensive default-e — npr. frequency
// van [3,5] → 4, jobType !== 'sedentary'|'active' → 'moderate').
//
// Allergies / metabolicProfile izviremo iz UserStatus.nutrition.metabolicFilter
// kako bi anti-ingredient filter radio sa stvarnim profilom klijentkinje.

function deriveClientProfile(params: {
  clientId: string;
  bio: { age: number; currentWeightMA5: number };
  nutrition: { metabolicFilter: MetabolicCondition[] };
}): ClientProfile {
  return {
    weight: params.bio.currentWeightMA5 || 65,
    height: 168,
    age: params.bio.age,
    gender: 'female',
    goal: 'fat_loss',
    experience: 'beginner',
    frequency: 3,
    allergies: [],
    foodDislikes: [],
    metabolicProfile: params.nutrition.metabolicFilter,
    sleepQuality: 3,
    stressLevel: 2,
    jobType: 'sedentary',
  };
}

const Food = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const { status, isLoading: statusLoading, error: statusError } = useUserStatus(clientId);
  const { foods: dbFoods, isLoading: foodsLoading, error: foodsError } = useFoodItems();

  const haptic = useHaptic();
  const logMealMutation = useLogMeal();
  const skipMealMutation = useSkipMeal();
  const replaceMealMutation = useReplaceMeal();

  const [mealStatus, setMealStatus] = useState<Record<string, MealStatus>>({});
  const [selectedMeal, setSelectedMeal] = useState<GeneratedMeal | null>(null);
  const [showReplaceSheet, setShowReplaceSheet] = useState<string | null>(null);
  const [showExtraMealSheet, setShowExtraMealSheet] = useState(false);
  const [replaceSearch, setReplaceSearch] = useState("");
  const [trialExpired] = useState(false);

  // ── Real-time plan generation ────────────────────────────────────────────
  // Derive ClientProfile iz UserStatus + generate plan sa real food pool.
  // Ako je DB pool prazan, plan se preskače (ne lomimo UI).
  const { plan, foodPool, isIRClient } = useMemo(() => {
    if (!status) {
      return { plan: null as GeneratedMealPlan | null, foodPool: [] as FoodItem[], isIRClient: false };
    }

    const profile = deriveClientProfile({
      clientId: status.clientId,
      bio: { age: status.bio.age, currentWeightMA5: status.bio.currentWeightMA5 },
      nutrition: { metabolicFilter: status.nutrition.metabolicFilter },
    });

    const pool = dbFoods;
    const generated = generateMealPlan(
      profile,
      DEFAULT_TEMPLATE,
      pool,
      undefined,
      status.bio.cyclePhase ?? null,
    );

    const isIR = status.nutrition.metabolicFilter.includes('insulin_resistance');

    return { plan: generated, foodPool: pool, isIRClient: isIR };
  }, [status, dbFoods]);

  const getStatus = (slot: string): MealStatus => mealStatus[slot] || 'pending';

  const markEaten = (meal: GeneratedMeal, slotIndex: number) => {
    if (!clientId) return;
    haptic("success");
    setMealStatus(prev => ({ ...prev, [meal.slot]: 'eaten' }));
    setSelectedMeal(null);
    logMealMutation.mutate({
      clientId,
      mealId: meal.mealId,
      slotIndex,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    });
  };

  const markSkipped = (meal: GeneratedMeal, slotIndex: number) => {
    if (!clientId) return;
    haptic("light");
    setMealStatus(prev => ({ ...prev, [meal.slot]: 'skipped' }));
    setSelectedMeal(null);
    skipMealMutation.mutate({
      clientId,
      mealId: meal.mealId,
      slotIndex,
    });
  };

  const handleReplaceOpen = (slot: string) => {
    setSelectedMeal(null);
    setShowReplaceSheet(slot);
  };

  const handleDontShowAgainFood = async (meal: GeneratedMeal) => {
    if (!clientId) return;
    try {
      // Pokušaj da nađeš pravi food item iz pool-a; fallback na meal.name
      const dbFood = dbFoodForMeal(meal);
      const dislike = dbFood?.nameEn ?? meal.name;
      await addFoodDislike(clientId, dislike);
      toast.success(t("food.dislikeAddedFood"));
      setSelectedMeal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleReplaceConfirm = (replacement: FoodItem) => {
    if (!clientId || !plan || !showReplaceSheet) return;
    const slot = showReplaceSheet;
    const slotIndex = plan.meals.findIndex(m => m.slot === slot);
    const original = plan.meals[slotIndex];
    if (!original) return;

    haptic("selection");
    setMealStatus(prev => ({ ...prev, [slot]: 'replaced' }));
    setShowReplaceSheet(null);
    setReplaceSearch("");
    replaceMealMutation.mutate({
      clientId,
      mealId: original.mealId,
      slotIndex,
      replacementMealId: replacement.id,
      calories: replacement.calories,
      protein: replacement.protein,
      carbs: replacement.carbs,
      fat: replacement.fat,
    });
  };

  // ── Early returns: trial, loading, error ─────────────────────────────────
  if (trialExpired) {
    return (
      <div className="min-h-screen bg-background-secondary flex flex-col items-center justify-center px-8 text-center pb-32">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Lock size={28} className="text-muted-foreground/50" />
        </div>
        <h2 className="text-title-2 text-foreground mb-2">{t("trial.locked")}</h2>
        <p className="text-body text-muted-foreground mb-6 max-w-xs">{t("trial.lockedFoodMessage")}</p>
        <Button onClick={() => navigate("/subscription")} variant="cta" className="px-6 min-h-11 rounded-2xl">
          {t("trial.subscribe")}
        </Button>
      </div>
    );
  }

  const isLoading = statusLoading || foodsLoading;
  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-background-secondary pb-32"
        role="status"
        aria-live="polite"
        aria-label={t("food.preparingPlan")}
      >
        <div className="px-5 pt-14 pb-2">
          <div className="h-9 w-40 bg-muted/60 rounded-2xl animate-pulse" />
        </div>
        <div className="px-5 py-3">
          <div className="h-14 bg-muted/40 rounded-2xl animate-pulse" />
        </div>
        <div className="px-5 mt-2 space-y-3">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-muted/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const hasError = statusError || foodsError;
  if (hasError || !status || !plan) {
    return (
      <div className="min-h-screen bg-background-secondary flex flex-col items-center justify-center px-8 text-center pb-32">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <UtensilsCrossed size={28} className="text-muted-foreground/50" aria-hidden="true" />
        </div>
        <h2 className="text-title-2 text-foreground mb-2">{t("food.planError")}</h2>
        <p className="text-body text-muted-foreground mb-6 max-w-xs">{t("food.planErrorDesc")}</p>
      </div>
    );
  }

  // ── Anti-ingredient filter for replace search (re-apply explicitly) ──────
  const profileForFilter = deriveClientProfile({
    clientId: status.clientId,
    bio: { age: status.bio.age, currentWeightMA5: status.bio.currentWeightMA5 },
    nutrition: { metabolicFilter: status.nutrition.metabolicFilter },
  });
  const exclusions = buildIngredientExclusionList(
    profileForFilter.allergies,
    profileForFilter.foodDislikes,
    status.nutrition.metabolicFilter,
  );
  const allowedReplaceFoods = filterFoodByExclusions(foodPool, exclusions);
  const filteredReplaceFoods = allowedReplaceFoods.filter(f =>
    f.name.toLowerCase().includes(replaceSearch.toLowerCase()),
  );

  const dbFoodForMeal = (meal: GeneratedMeal): FoodItem | undefined =>
    foodPool.find(f => f.id === meal.mealId);

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      {/* Header */}
      <div className="px-5 pt-14 pb-2">
        <motion.h1 {...fadeUp()} className="text-large-title text-foreground">{t("food.title")}</motion.h1>
      </div>

      {/* Sync banner — luteal/deload/hydration warning-i */}
      <motion.div {...fadeUp(0.06)} className="px-5 mt-1">
        <SyncEventBanner variant="inline" />
      </motion.div>

      {/* Fueling Status Bar — Princip 1 spec-a 02: ZERO kcal brojeva za klijentkinju */}
      <motion.div {...fadeUp(0.08)} className="px-5 py-3">
        <FuelingStatusBar />
      </motion.div>

      {/* Meals list */}
      <div className="px-5 mt-2">
        <motion.div {...fadeUp(0.12)}>
          <SectionLabel>{t("food.todaysMeals")}</SectionLabel>
        </motion.div>

        {/* Off-plan meal log trigger */}
        <motion.div {...fadeUp(0.13)} className="mb-3">
          <ExtraMealTrigger onClick={() => setShowExtraMealSheet(true)} />
        </motion.div>

        <div className="space-y-3">
          {plan.meals.map((meal, i) => {
            const status = getStatus(meal.slot);
            const image = getMealImage(meal, foodPool);
            const isSkipped = status === 'skipped';
            const isIRMini = isIRClient && IR_MINI_MEAL_SLOT_INDEXES.has(i);

            return (
              <motion.button
                key={meal.slot}
                {...fadeUp(0.15 + i * 0.04)}
                whileTap={{ scale: TAP_SCALE.secondary }}
                onClick={() => status === 'pending' && setSelectedMeal(meal)}
                className={`w-full bg-card rounded-2xl card-shadow overflow-hidden flex items-center text-left transition-all ${
                  status === 'eaten' ? "border-l-4 border-success" :
                  status === 'replaced' ? "border-l-4 border-amber-500" :
                  isSkipped ? "opacity-60" : ""
                }`}
              >
                {/* Image or emoji placeholder — layoutId za shared transition u meal detail */}
                {image ? (
                  <motion.img
                    layoutId={`meal-image-${meal.slot}`}
                    src={image}
                    alt={meal.name}
                    className={`w-28 h-28 object-cover shrink-0 ${isSkipped ? "grayscale" : ""}`}
                  />
                ) : (
                  <div className="w-28 h-28 bg-muted flex items-center justify-center shrink-0">
                    {(() => {
                      const SlotIcon = SLOT_ICON[meal.slot] ?? UtensilsCrossed;
                      return <SlotIcon size={40} className="text-muted-foreground" aria-hidden="true" />;
                    })()}
                  </div>
                )}

                <div className="flex-1 min-w-0 p-3.5">
                  <p className="text-caption-2 text-muted-foreground font-medium uppercase tracking-wider">
                    {isIRMini ? t("food.miniMealIR") : t(SLOT_LABELS[meal.slot] || meal.slotLabel)}
                  </p>
                  <p className={`text-body font-semibold text-foreground truncate mt-0.5 ${isSkipped ? "line-through" : ""}`}>
                    {meal.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-caption-1 text-foreground font-medium">{meal.calories} kcal</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-caption-2 text-macro-protein inline-flex items-center gap-1">
                      <Drumstick size={ICON_SIZE.xs} aria-hidden="true" />
                      <span className="sr-only">{t("food.protein")}: </span>
                      {meal.protein}g
                    </span>
                    <span className="text-caption-2 text-macro-carb inline-flex items-center gap-1">
                      <Wheat size={ICON_SIZE.xs} aria-hidden="true" />
                      <span className="sr-only">{t("food.carbs")}: </span>
                      {meal.carbs}g
                    </span>
                    <span className="text-caption-2 text-macro-fat inline-flex items-center gap-1">
                      <Droplets size={ICON_SIZE.xs} aria-hidden="true" />
                      <span className="sr-only">{t("food.fat")}: </span>
                      {meal.fat}g
                    </span>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="pr-3.5 shrink-0">
                  {status === 'eaten' && (
                    <div className="w-7 h-7 rounded-full bg-success flex items-center justify-center">
                      <Check size={16} className="text-success-foreground" />
                    </div>
                  )}
                  {status === 'replaced' && (
                    <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center">
                      <ArrowRightLeft size={ICON_SIZE.xs} className="text-white" />
                    </div>
                  )}
                  {status === 'skipped' && (
                    <div className="w-7 h-7 rounded-full bg-destructive/15 flex items-center justify-center">
                      <X size={ICON_SIZE.xs} className="text-destructive" />
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Meal detail bottom sheet */}
      <AnimatePresence>
        {selectedMeal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={selectedMeal.name}
            className="fixed inset-0 z-50 bg-black/40 flex items-end"
            onClick={() => setSelectedMeal(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={IOS_SPRING.medium}
              onClick={e => e.stopPropagation()}
              className="w-full bg-card rounded-t-3xl max-h-[85vh] overflow-y-auto"
            >
              {/* Header image — layoutId matches meal card za shared element transition */}
              {getMealImage(selectedMeal, foodPool) ? (
                <div className="relative h-48 overflow-hidden rounded-t-3xl">
                  <motion.img
                    layoutId={`meal-image-${selectedMeal.slot}`}
                    src={getMealImage(selectedMeal, foodPool)!}
                    alt={selectedMeal.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent" />
                  <button onClick={() => setSelectedMeal(null)} aria-label={t("common.close")} className="absolute top-4 right-4 w-11 h-11 min-h-11 min-w-11 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                    <X size={ICON_SIZE.md} className="text-white" />
                  </button>
                </div>
              ) : (
                <div className="pt-5 px-5 flex justify-end">
                  <button onClick={() => setSelectedMeal(null)} aria-label={t("common.close")} className="w-11 h-11 min-h-11 min-w-11 rounded-full bg-muted flex items-center justify-center">
                    <X size={ICON_SIZE.md} className="text-foreground" />
                  </button>
                </div>
              )}

              <div className="px-5 pb-32 pt-4">
                <p className="text-caption-2 text-muted-foreground font-medium uppercase tracking-wider">
                  {t(SLOT_LABELS[selectedMeal.slot] || selectedMeal.slotLabel)}
                </p>
                <h2 className="text-title-2 text-foreground mt-1">{selectedMeal.name}</h2>

                {/* Macros */}
                <div className="flex items-center gap-4 mt-4 bg-muted/40 rounded-2xl p-4">
                  <div className="flex-1 text-center">
                    <p className="text-title-2 font-semibold text-foreground">{selectedMeal.calories}</p>
                    <p className="text-caption-2 text-muted-foreground">kcal</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex-1 text-center">
                    <p className="text-title-2 font-semibold text-macro-protein">{selectedMeal.protein}g</p>
                    <p className="text-caption-2 text-muted-foreground"><span aria-hidden="true">🥩</span> {t("food.protein")}</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex-1 text-center">
                    <p className="text-title-2 font-semibold text-macro-carb">{selectedMeal.carbs}g</p>
                    <p className="text-caption-2 text-muted-foreground"><span aria-hidden="true">🌾</span> {t("food.carbs")}</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex-1 text-center">
                    <p className="text-title-2 font-semibold text-macro-fat">{selectedMeal.fat}g</p>
                    <p className="text-caption-2 text-muted-foreground"><span aria-hidden="true">🥑</span> {t("food.fat")}</p>
                  </div>
                </div>

                {/* Portion */}
                <div className="flex items-center justify-between mt-6">
                  <span className="text-body text-muted-foreground">{t("nutrition.portionSize")}</span>
                  <span className="text-body font-semibold text-foreground">{selectedMeal.portionMultiplier}x</span>
                </div>

                {/* Ingredients */}
                {dbFoodForMeal(selectedMeal) && dbFoodForMeal(selectedMeal)!.ingredients.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-body font-semibold text-foreground mb-3">{t("food.ingredients")}</h3>
                    <div className="space-y-2">
                      {dbFoodForMeal(selectedMeal)!.ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center gap-3 py-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span className="text-body text-foreground">{ing}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preparation */}
                {dbFoodForMeal(selectedMeal)?.preparation && dbFoodForMeal(selectedMeal)!.preparation.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-body font-semibold text-foreground mb-3">{t("food.instructions")}</h3>
                    <div className="space-y-3">
                      {dbFoodForMeal(selectedMeal)!.preparation.map((step, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="text-caption-1 font-bold text-primary mt-0.5 shrink-0">{i + 1}.</span>
                          <span className="text-body text-foreground">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-8">
                  <button
                    onClick={() => {
                      const idx = plan.meals.findIndex(m => m.slot === selectedMeal.slot);
                      markEaten(selectedMeal, idx);
                    }}
                    className="flex-1 gradient-primary text-primary-foreground py-4 rounded-2xl text-body font-semibold ios-row-h flex items-center justify-center gap-2"
                  >
                    <Check size={ICON_SIZE.md} aria-hidden="true" strokeWidth={2.5} />
                    {t("nutrition.markEaten")}
                  </button>
                  <button
                    onClick={() => handleReplaceOpen(selectedMeal.slot)}
                    aria-label={t("nutrition.replace")}
                    className="px-5 py-4 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-body font-semibold ios-row-h min-w-11"
                  >
                    <ArrowRightLeft size={ICON_SIZE.md} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => {
                      const idx = plan.meals.findIndex(m => m.slot === selectedMeal.slot);
                      markSkipped(selectedMeal, idx);
                    }}
                    aria-label={t("nutrition.skipMeal")}
                    className="px-5 py-4 rounded-2xl bg-destructive/10 text-destructive text-body font-semibold ios-row-h min-w-11"
                  >
                    <X size={ICON_SIZE.md} aria-hidden="true" />
                  </button>
                </div>

                {/* "Ne volim ovo" — trajno isključi iz pool-a */}
                <button
                  onClick={() => void handleDontShowAgainFood(selectedMeal)}
                  className="w-full mt-3 px-4 py-3 rounded-2xl bg-muted/40 text-muted-foreground text-callout font-medium flex items-center justify-center gap-2 min-h-12 hover:bg-muted/60 transition-colors"
                  aria-label={t("food.dontShowMealAgain")}
                >
                  <ThumbsDown size={ICON_SIZE.sm} aria-hidden="true" />
                  {t("food.dontShowMealAgain")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replace bottom sheet */}
      <BottomSheet
        open={!!showReplaceSheet}
        onOpenChange={(open) => {
          if (!open) {
            setShowReplaceSheet(null);
            setReplaceSearch("");
          }
        }}
        title={t("food.whatDidYouEat")}
        maxHeight="70vh"
      >
        <div className="pb-2">
          <div className="relative mb-3">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              value={replaceSearch}
              onChange={e => setReplaceSearch(e.target.value)}
              placeholder={t("training.searchExercises")}
              className="w-full bg-muted/50 text-foreground placeholder:text-muted-foreground/50 rounded-2xl pl-11 pr-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            {filteredReplaceFoods.slice(0, 8).map(food => (
              <button
                key={food.id}
                onClick={() => handleReplaceConfirm(food)}
                className="w-full text-left px-4 py-3 rounded-2xl hover:bg-muted/40 transition-colors min-h-12 flex items-center justify-between"
              >
                <div>
                  <p className="text-body text-foreground">{food.name}</p>
                  <p className="text-caption-1 text-muted-foreground">{food.calories} kcal · {food.protein}g P</p>
                </div>
                <span className="text-primary text-caption-1 font-semibold">{t("food.confirmReplace")}</span>
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>

      <ExtraMealSheet
        open={showExtraMealSheet}
        onOpenChange={setShowExtraMealSheet}
      />
    </div>
  );
};

export default Food;
