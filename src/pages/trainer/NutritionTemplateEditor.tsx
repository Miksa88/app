import { useEffect, useState } from "react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp , MOTION_DURATION, IOS_SPRING} from "@/lib/motion";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useHaptic } from "@/hooks/useHaptic";
import { type NutritionTemplate, type TemplateMealSlot, MEAL_PRESETS, DEFAULT_5_MEAL_SLOTS } from "@/utils/mealPlanGenerator";
import { MASTER_NUTRITION } from "@/data/masterNutrition";
import { type DefaultLevel, DEFAULT_LEVELS, getDefaultLevel, setDefaultLevel } from "@/utils/defaultAssignment";
import { useNutritionTemplate, useUpsertNutritionTemplate } from "@/hooks/useNutritionTemplates";

const MACRO_PRESETS = [
  { id: "highProtein", labelKey: "nutrition.highProtein", p: 40, c: 35, f: 25, descKey: "nutrition.highProteinDesc" },
  { id: "balanced", labelKey: "nutrition.balanced", p: 30, c: 40, f: 30, descKey: "nutrition.balancedDesc" },
  { id: "highCarb", labelKey: "nutrition.highCarb", p: 25, c: 50, f: 25, descKey: "nutrition.highCarbDesc" },
  { id: "custom", labelKey: "nutrition.custom", p: 30, c: 40, f: 30, descKey: "" },
];

const GOAL_TYPES: { id: NutritionTemplate['goalType']; labelKey: string; descKey: string }[] = [
  { id: "cut", labelKey: "nutrition.cut", descKey: "nutrition.cutDesc" },
  { id: "bulk", labelKey: "nutrition.bulk", descKey: "nutrition.bulkDesc" },
  { id: "maintain", labelKey: "nutrition.maintain", descKey: "nutrition.maintainDesc" },
  { id: "health", labelKey: "nutrition.health", descKey: "nutrition.healthDesc" },
];

const RESTRICTION_OPTIONS = [
  { id: "lactose", labelKey: "nutrition.restLactose" },
  { id: "gluten", labelKey: "nutrition.restGluten" },
  { id: "vegetarian", labelKey: "nutrition.restVegetarian" },
  { id: "vegan", labelKey: "nutrition.restVegan" },
  { id: "no_pork", labelKey: "nutrition.restNoPork" },
  { id: "no_seafood", labelKey: "nutrition.restNoSeafood" },
  { id: "low_sugar", labelKey: "nutrition.restLowSugar" },
  { id: "low_sodium", labelKey: "nutrition.restLowSodium" },
];

const SLOT_TYPE_LABELS: Record<string, string> = {
  breakfast: "nutrition.mealSlotBreakfast",
  morning_snack: "nutrition.mealSlotMorningSnack",
  lunch: "nutrition.mealSlotLunch",
  afternoon_snack: "nutrition.mealSlotAfternoonSnack",
  dinner: "nutrition.mealSlotDinner",
  evening_snack: "nutrition.mealSlotEveningSnack",
  pre_workout: "nutrition.mealSlotPreWorkout",
  post_workout: "nutrition.mealSlotPostWorkout",
};

const ALL_SLOT_TYPES: TemplateMealSlot['type'][] = [
  'breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack', 'pre_workout', 'post_workout',
];

const MEAL_COUNT_OPTIONS = [3, 4, 5, 6];

const MEAL_STRUCTURE_CAPTIONS: Record<number, string> = {
  3: "nutrition.mealStructure3Info",
  4: "nutrition.mealStructure4Info",
  5: "nutrition.mealStructure5Info",
  6: "nutrition.mealStructure6Info",
};

const NutritionTemplateEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const haptic = useHaptic();
  // `default-master-*` ID = master template iz hardkodirane liste. Save uvek pravi NOVI red.
  const isDefault = !!id?.startsWith("default-");
  const defaultSourceId = isDefault ? id!.replace(/^default-/, "") : null;
  const isNew = !id || id === "new" || isDefault;

  const { data: existing } = useNutritionTemplate(isNew ? null : id);
  const masterTemplate = isDefault ? MASTER_NUTRITION.find((tmpl) => tmpl.id === defaultSourceId) : null;
  const upsertMutation = useUpsertNutritionTemplate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goalType, setGoalType] = useState<NutritionTemplate['goalType']>("cut");
  const [macroPreset, setMacroPreset] = useState("highProtein");
  const [macros, setMacros] = useState({ protein: 40, carbs: 35, fat: 25 });
  const [calorieStrategy, setCalorieStrategy] = useState<'auto' | 'fixed' | 'range'>("auto");
  const [fixedCalories, setFixedCalories] = useState(2000);
  const [calorieRange, setCalorieRange] = useState({ min: 1600, max: 2200 });
  const [differentOnTrainingDays, setDifferentOnTrainingDays] = useState(false);
  const [trainingDayMod, setTrainingDayMod] = useState(200);
  const [restDayMod, setRestDayMod] = useState(-100);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [mealCount, setMealCount] = useState(5);
  const [mealSlots, setMealSlots] = useState<TemplateMealSlot[]>([...DEFAULT_5_MEAL_SLOTS]);
  const [defaultLevel, setDefaultLevelState] = useState<DefaultLevel | null>(null);

  useEffect(() => {
    const src = existing ?? masterTemplate;
    if (!src) return;
    setName(src.name);
    setDescription(src.description ?? "");
    setGoalType(src.goalType);
    setMacroPreset(src.macroPreset);
    setMacros(src.macroRatio);
    setCalorieStrategy(src.calorieStrategy);
    if (src.fixedCalories) setFixedCalories(src.fixedCalories);
    if (src.calorieRange) setCalorieRange(src.calorieRange);
    setDifferentOnTrainingDays(src.differentOnTrainingDays);
    if (src.trainingDayModifier !== undefined) setTrainingDayMod(src.trainingDayModifier);
    if (src.restDayModifier !== undefined) setRestDayMod(src.restDayModifier);
    setRestrictions(src.restrictions);
    setMealCount(src.mealCount);
    setMealSlots(src.mealSlots);
    setDefaultLevelState(getDefaultLevel(src.tags));
  }, [existing, masterTemplate]);

  const toggle = (section: string) => setOpenSection(prev => prev === section ? null : section);

  const toggleRestriction = (r: string) => {
    setRestrictions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  };

  const selectMacroPreset = (presetId: string) => {
    setMacroPreset(presetId);
    const preset = MACRO_PRESETS.find(p => p.id === presetId);
    if (preset && presetId !== "custom") {
      setMacros({ protein: preset.p, carbs: preset.c, fat: preset.f });
    }
  };

  const adjustMacro = (key: 'protein' | 'carbs' | 'fat', val: number) => {
    const newMacros = { ...macros, [key]: val };
    const sum = newMacros.protein + newMacros.carbs + newMacros.fat;
    if (sum <= 100) setMacros(newMacros);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: t("training.nameRequired"), variant: "destructive" });
      return;
    }
    try {
      await upsertMutation.mutateAsync({
        id: isNew ? undefined : id,
        name,
        description: description || undefined,
        goalType,
        macroRatio: macros,
        macroPreset,
        calorieStrategy,
        fixedCalories: calorieStrategy === "fixed" ? fixedCalories : undefined,
        calorieRange: calorieStrategy === "range" ? calorieRange : undefined,
        trainingDayModifier: differentOnTrainingDays ? trainingDayMod : undefined,
        restDayModifier: differentOnTrainingDays ? restDayMod : undefined,
        differentOnTrainingDays,
        restrictions,
        tags: setDefaultLevel(existing?.tags ?? masterTemplate?.tags ?? [], defaultLevel),
        mealCount,
        mealSlots,
      });
      toast({ title: isNew ? t("nutrition.templateCreated") : t("nutrition.templateSaved") });
      navigate("/trainer/nutrition");
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Save failed",
        variant: "destructive",
      });
    }
  };

  const SectionHeader = ({ id: sectionId, title, summary }: { id: string; title: string; summary: string }) => (
    <button
      onClick={() => toggle(sectionId)}
      className="w-full flex items-center justify-between px-4 py-4 min-h-11"
    >
      <span className="text-body font-medium text-foreground">{title}</span>
      <div className="flex items-center gap-2">
        <span className="text-caption-1 text-muted-foreground max-w-[140px] truncate">{summary}</span>
        <motion.div animate={{ rotate: openSection === sectionId ? 180 : 0 }} transition={{ duration: MOTION_DURATION.fast }}>
          <ChevronDown size={16} className="text-muted-foreground" />
        </motion.div>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-background-secondary pb-24">
      {/* Editor: samo sticky back + Save. Naziv template-a je FIXED H1 ispod. */}
      <PageHeader
        onBack={() => navigate("/trainer/nutrition")}
        backLabel={t("nutrition.title")}
        rightAction={
          <button
            onClick={handleSave}
            className="text-primary font-semibold text-body px-3 py-2 min-h-11 flex items-center active:opacity-60"
          >
            {t("training.save")}
          </button>
        }
      />

      <div className="px-5 pt-3 space-y-4">
        {/* Section 1: Basics — naziv + opis u istoj Card-ici, bez Large Title-a iznad */}
        <motion.div {...fadeUp(0.05)} className="bg-card rounded-xl p-4 card-shadow space-y-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t("nutrition.templateNamePlaceholder")}
            className="w-full text-title-2 font-bold text-foreground bg-transparent placeholder:text-muted-foreground/50 focus:outline-none"
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t("nutrition.templateDescPlaceholder")}
            rows={2}
            className="w-full text-body text-foreground bg-transparent placeholder:text-muted-foreground/50 focus:outline-none resize-none"
          />
        </motion.div>

        {/* Default-for picker — auto-assignment po onboarding nivou */}
        <motion.div {...fadeUp(0.07)}>
          <label className="text-caption-1 text-muted-foreground font-medium mb-1.5 block px-1">
            {t("training.defaultForLevel")}
          </label>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setDefaultLevelState(null)}
              className={`min-h-12 rounded-xl text-footnote font-semibold transition-colors border-2 px-2 ${
                defaultLevel === null ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-card card-shadow text-foreground"
              }`}
            >
              {t("training.defaultManual")}
            </button>
            {DEFAULT_LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setDefaultLevelState(lvl)}
                className={`min-h-12 rounded-xl text-footnote font-semibold transition-colors border-2 px-2 ${
                  defaultLevel === lvl ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-card card-shadow text-foreground"
                }`}
              >
                {t(`training.level_${lvl}`)}
              </button>
            ))}
          </div>
          <p className="text-caption-2 text-muted-foreground/80 mt-1.5 px-1 leading-snug">
            {defaultLevel === null
              ? t("training.defaultManualHint")
              : t("training.defaultAutoHint").replace("{level}", t(`training.level_${defaultLevel}`))}
          </p>
        </motion.div>

        {/* Section 2: Goal Type */}
        <motion.div {...fadeUp(0.1)} className="bg-card rounded-xl card-shadow overflow-hidden">
          <SectionHeader id="goal" title={t("nutrition.goalType")} summary={t(GOAL_TYPES.find(g => g.id === goalType)?.labelKey || "")} />
          <AnimatePresence>
            {openSection === "goal" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: MOTION_DURATION.base }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2">
                  {GOAL_TYPES.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setGoalType(g.id)}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all min-h-11 ${
                        goalType === g.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-body font-medium text-foreground">{t(g.labelKey)}</p>
                          <p className="text-caption-1 text-muted-foreground">{t(g.descKey)}</p>
                        </div>
                        {goalType === g.id && (
                          <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center shrink-0">
                            <Check size={ICON_SIZE.xs} className="text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Section 3: Macro Distribution */}
        <motion.div {...fadeUp(0.15)} className="bg-card rounded-xl card-shadow overflow-hidden">
          <SectionHeader
            id="macros"
            title={t("nutrition.macroRatio")}
            summary={`P:${macros.protein}% C:${macros.carbs}% F:${macros.fat}%`}
          />
          <AnimatePresence>
            {openSection === "macros" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: MOTION_DURATION.base }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  {MACRO_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => selectMacroPreset(preset.id)}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all min-h-11 ${
                        macroPreset === preset.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-body font-medium text-foreground">
                            {t(preset.labelKey)}
                            {preset.id !== "custom" && (
                              <span className="text-caption-1 text-muted-foreground ml-2">
                                P:{preset.p}% C:{preset.c}% F:{preset.f}%
                              </span>
                            )}
                          </p>
                          {preset.descKey && <p className="text-caption-1 text-muted-foreground">{t(preset.descKey)}</p>}
                        </div>
                        {macroPreset === preset.id && (
                          <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center shrink-0">
                            <Check size={ICON_SIZE.xs} className="text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}

                  {macroPreset === "custom" && (
                    <div className="space-y-3 pt-2">
                      {(["protein", "carbs", "fat"] as const).map(key => {
                        const colors = { protein: "bg-info", carbs: "bg-warning", fat: "bg-destructive" };
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-caption-1">
                              <span className="text-muted-foreground capitalize">{key}</span>
                              <span className="font-semibold text-foreground">{macros[key]}%</span>
                            </div>
                            <input
                              type="range"
                              min={10}
                              max={60}
                              value={macros[key]}
                              onChange={e => adjustMacro(key, parseInt(e.target.value))}
                              className="w-full accent-primary"
                            />
                          </div>
                        );
                      })}
                      <p className="text-caption-2 text-muted-foreground text-center">
                        Total: {macros.protein + macros.carbs + macros.fat}%
                        {macros.protein + macros.carbs + macros.fat !== 100 && " ⚠️ Must equal 100%"}
                      </p>
                    </div>
                  )}

                  {/* Visual bar */}
                  <div className="flex h-3 rounded-full overflow-hidden mt-2">
                    <div className="bg-info" style={{ width: `${macros.protein}%` }} />
                    <div className="bg-warning" style={{ width: `${macros.carbs}%` }} />
                    <div className="bg-destructive" style={{ width: `${macros.fat}%` }} />
                  </div>
                  <div className="flex justify-between text-caption-2 text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-info" aria-hidden="true" />
                      {t("nutrition.protein")} {macros.protein}%
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-warning" aria-hidden="true" />
                      {t("nutrition.carbs")} {macros.carbs}%
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-destructive" aria-hidden="true" />
                      {t("nutrition.fat")} {macros.fat}%
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Section 4: Calorie Strategy */}
        <motion.div {...fadeUp(0.2)} className="bg-card rounded-xl card-shadow overflow-hidden">
          <SectionHeader
            id="calories"
            title={t("nutrition.calorieStrategy")}
            summary={calorieStrategy === "auto" ? t("nutrition.autoByProfile") : calorieStrategy === "fixed" ? `${fixedCalories} kcal` : `${calorieRange.min}-${calorieRange.max} kcal`}
          />
          <AnimatePresence>
            {openSection === "calories" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: MOTION_DURATION.base }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2">
                  {([
                    { id: "auto" as const, label: t("nutrition.autoByProfile"), desc: t("nutrition.autoByProfileDesc") },
                    { id: "fixed" as const, label: t("nutrition.fixedTarget"), desc: t("nutrition.fixedTargetDesc") },
                    { id: "range" as const, label: t("nutrition.calorieRange"), desc: t("nutrition.calorieRangeDesc") },
                  ]).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setCalorieStrategy(opt.id)}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all min-h-11 ${
                        calorieStrategy === opt.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-body font-medium text-foreground">{opt.label}</p>
                          <p className="text-caption-1 text-muted-foreground">{opt.desc}</p>
                        </div>
                        {calorieStrategy === opt.id && (
                          <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center shrink-0">
                            <Check size={ICON_SIZE.xs} className="text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}

                  {calorieStrategy === "fixed" && (
                    <div className="pt-2">
                      <label className="text-caption-1 text-muted-foreground">kcal</label>
                      <input
                        type="number"
                        value={fixedCalories}
                        onChange={e => setFixedCalories(parseInt(e.target.value) || 0)}
                        className="w-full bg-muted/50 rounded-xl px-4 py-3 text-body text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 mt-1"
                      />
                    </div>
                  )}

                  {calorieStrategy === "range" && (
                    <div className="pt-2 grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-caption-1 text-muted-foreground">Min kcal</label>
                        <input
                          type="number"
                          value={calorieRange.min}
                          onChange={e => setCalorieRange(prev => ({ ...prev, min: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-muted/50 rounded-xl px-4 py-3 text-body text-foreground focus:outline-none mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-caption-1 text-muted-foreground">Max kcal</label>
                        <input
                          type="number"
                          value={calorieRange.max}
                          onChange={e => setCalorieRange(prev => ({ ...prev, max: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-muted/50 rounded-xl px-4 py-3 text-body text-foreground focus:outline-none mt-1"
                        />
                      </div>
                    </div>
                  )}

                  <div className="separator-ios mt-3" />

                  {/* Training vs rest day toggle */}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-body text-foreground">{t("nutrition.differentTrainingRest")}</p>
                    <button
                      onClick={() => setDifferentOnTrainingDays(!differentOnTrainingDays)}
                      className={`w-12 h-7 rounded-full transition-colors flex items-center px-0.5 ${
                        differentOnTrainingDays ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <motion.div
                        animate={{ x: differentOnTrainingDays ? 20 : 0 }}
                        transition={IOS_SPRING.precise}
                        className="w-6 h-6 rounded-full bg-background shadow-md"
                      />
                    </button>
                  </div>

                  {differentOnTrainingDays && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-caption-1 text-muted-foreground">{t("nutrition.trainingDay")} modifier</label>
                        <input
                          type="number"
                          value={trainingDayMod}
                          onChange={e => setTrainingDayMod(parseInt(e.target.value) || 0)}
                          className="w-full bg-muted/50 rounded-xl px-4 py-3 text-body text-foreground focus:outline-none mt-1"
                          placeholder="+200"
                        />
                      </div>
                      <div>
                        <label className="text-caption-1 text-muted-foreground">{t("nutrition.restDay")} modifier</label>
                        <input
                          type="number"
                          value={restDayMod}
                          onChange={e => setRestDayMod(parseInt(e.target.value) || 0)}
                          className="w-full bg-muted/50 rounded-xl px-4 py-3 text-body text-foreground focus:outline-none mt-1"
                          placeholder="-100"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Section 5: Dietary Restrictions */}
        <motion.div {...fadeUp(0.25)} className="bg-card rounded-xl card-shadow overflow-hidden">
          <SectionHeader
            id="restrictions"
            title={t("nutrition.restrictions")}
            summary={restrictions.length > 0 ? `${restrictions.length} ${t("program.selected")}` : t("program.noneSelected")}
          />
          <AnimatePresence>
            {openSection === "restrictions" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: MOTION_DURATION.base }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-1">
                  {RESTRICTION_OPTIONS.map(r => (
                    <button
                      key={r.id}
                      onClick={() => toggleRestriction(r.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all min-h-11 ${
                        restrictions.includes(r.id) ? "bg-primary/5 border-2 border-primary" : "bg-muted/50 border-2 border-transparent"
                      }`}
                    >
                      <span className="text-body text-foreground">{t(r.labelKey)}</span>
                      {restrictions.includes(r.id) && (
                        <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                          <Check size={ICON_SIZE.xs} className="text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                  <p className="text-caption-2 text-muted-foreground pt-2">
                    {t("nutrition.restrictionsCaption")}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Section 6: Meal Structure — interactive (targeting accordion uklonjen;
            algoritam čita nivo/cilj/frekvenciju/restrikcije iz client onboarding-a). */}
        <motion.div {...fadeUp(0.35)} className="bg-card rounded-xl card-shadow overflow-hidden">
          <SectionHeader
            id="meals"
            title={t("nutrition.mealStructure")}
            summary={`${mealCount} ${t("nutrition.mealsPerDay")}`}
          />
          <AnimatePresence>
            {openSection === "meals" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: MOTION_DURATION.base }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-4">
                  {/* Meal count selector */}
                  <div className="pt-1">
                    <p className="text-caption-1 text-muted-foreground mb-3 text-center">{t("nutrition.mealCount")}</p>
                    <div className="flex items-center justify-center gap-3">
                      {MEAL_COUNT_OPTIONS.map(num => {
                        const isSelected = mealCount === num;
                        return (
                          <motion.button
                            key={num}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              setMealCount(num);
                              setMealSlots([...(MEAL_PRESETS[num] || DEFAULT_5_MEAL_SLOTS)]);
                              haptic("light");
                            }}
                            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center text-headline font-bold transition-colors min-h-11 ${
                              isSelected
                                ? "gradient-primary text-primary-foreground shadow-fab"
                                : "bg-background-secondary card-shadow text-foreground"
                            }`}
                          >
                            {num}
                          </motion.button>
                        );
                      })}
                    </div>
                    <p className="text-center text-caption-1 text-muted-foreground mt-2">
                      {t("nutrition.mealsPerDay")}
                      {mealCount === 5 && <span className="text-primary ml-1">· {t("nutrition.recommended")}</span>}
                    </p>
                  </div>

                  <div className="separator-ios" />

                  {/* Meal slots list */}
                  <div className="space-y-2">
                    {mealSlots.map((slot, index) => {
                      const totalPct = mealSlots.reduce((sum, s) => sum + s.caloriePercentage, 0);
                      return (
                        <div key={slot.id} className="bg-muted/40 rounded-xl px-3 py-3 flex items-center gap-2">
                          <span className="text-caption-1 text-muted-foreground font-mono w-5 shrink-0">{index + 1}</span>
                          <select
                            value={slot.type}
                            onChange={e => {
                              const newSlots = [...mealSlots];
                              newSlots[index] = { ...newSlots[index], type: e.target.value as TemplateMealSlot['type'] };
                              setMealSlots(newSlots);
                            }}
                            className="flex-1 bg-transparent text-body text-foreground focus:outline-none min-w-0 appearance-none"
                          >
                            {ALL_SLOT_TYPES.map(type => (
                              <option key={type} value={type}>{t(SLOT_TYPE_LABELS[type])}</option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              value={slot.caloriePercentage}
                              onChange={e => {
                                const newSlots = [...mealSlots];
                                newSlots[index] = { ...newSlots[index], caloriePercentage: parseInt(e.target.value) || 0 };
                                setMealSlots(newSlots);
                              }}
                              className="w-[42px] bg-background rounded-lg px-1.5 py-1 text-caption-1 text-center text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                            <span className="text-caption-2 text-muted-foreground">%</span>
                          </div>
                          <span className="text-caption-2 text-muted-foreground shrink-0 w-[36px] text-right">
                            {slot.minProteinGrams}g P
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total percentage warning */}
                  {(() => {
                    const total = mealSlots.reduce((sum, s) => sum + s.caloriePercentage, 0);
                    if (total !== 100) {
                      return (
                        <div className="flex items-center gap-2 bg-warning/10 rounded-lg px-3 py-2">
                          <AlertTriangle size={ICON_SIZE.xs} className="text-warning shrink-0" />
                          <p className="text-caption-1 text-warning">
                            Total: {total}% — {t("nutrition.totalWarning")}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Info caption */}
                  <p className="text-caption-2 text-muted-foreground pt-1">
                    {t(MEAL_STRUCTURE_CAPTIONS[mealCount] || "nutrition.mealStructure5Info")}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Save button */}
        <motion.div {...fadeUp(0.4)} className="pt-2 pb-8">
          <Button onClick={handleSave} variant="cta" size="xl">
            {isNew ? t("nutrition.saveTemplate") : t("nutrition.saveTemplate")}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default NutritionTemplateEditor;
