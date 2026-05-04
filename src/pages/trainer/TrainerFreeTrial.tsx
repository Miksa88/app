// TrainerFreeTrial — standalone page ekstraktovan iz TrainerProfile
// Spec: design-system/MASTER.md §7 — Apple-native sticky header + no BottomNav on detail pages

import { useNavigate } from "react-router-dom";
import { ICON_SIZE } from "@/lib/design-tokens";
import { motion } from "framer-motion";
import { fadeUp , IOS_SPRING} from "@/lib/motion";
import { ChevronDown, Calendar, Dumbbell, Salad, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useEffect } from "react";
import { usePrograms } from "@/hooks/usePrograms";
import { useNutritionTemplates } from "@/hooks/useNutritionTemplates";
import { useTrialSettings, useSetTrialSettings } from "@/hooks/useTrialSettings";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

const ToggleSwitch = ({ value, onToggle, label }: { value: boolean; onToggle: () => void; label: string }) => (
  <button
    onClick={onToggle}
    role="switch"
    aria-checked={value}
    aria-label={label}
    className={`w-[51px] h-[31px] rounded-full p-[2px] transition-colors duration-base shrink-0 ${value ? "bg-success" : "bg-muted"}`}
  >
    <motion.div layout transition={IOS_SPRING.precise}
      className={`w-[27px] h-[27px] rounded-full bg-white shadow-sm ${value ? "ml-auto" : "ml-0"}`} />
  </button>
);

const TrainerFreeTrial = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: programs = [] } = usePrograms();
  const { data: nutritionTemplates = [] } = useNutritionTemplates();
  const { data: persistedSettings } = useTrialSettings();
  const setTrialMutation = useSetTrialSettings();

  const [trialDuration, setTrialDuration] = useState(7);
  const [trialIncludes, setTrialIncludes] = useState({
    workouts: true, nutrition: true, chat: false, progress: true,
  });
  const [trialProgram, setTrialProgram] = useState("");
  const [trialMealPlan, setTrialMealPlan] = useState("");

  // Hydrate from DB
  useEffect(() => {
    if (persistedSettings) {
      setTrialDuration(persistedSettings.duration);
      setTrialIncludes(persistedSettings.includes);
      setTrialProgram(persistedSettings.programId ?? "");
      setTrialMealPlan(persistedSettings.mealPlanId ?? "");
    }
  }, [persistedSettings]);

  const trialIncludedList = [
    trialIncludes.workouts ? t("trial.workouts") : null,
    trialIncludes.nutrition ? t("trial.nutrition") : null,
    trialIncludes.progress ? t("trial.progressTracking") : null,
  ].filter(Boolean);

  const trialExcludedList = [
    !trialIncludes.chat ? t("trial.chatWithTrainer") : null,
  ].filter(Boolean);

  const handleSave = async () => {
    try {
      await setTrialMutation.mutateAsync({
        duration: trialDuration,
        includes: trialIncludes,
        programId: trialProgram || null,
        mealPlanId: trialMealPlan || null,
      });
      toast.success(t("trial.saved").replace(" ✓", "").replace("!", ""));
      navigate(-1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  return (
    <div className="min-h-screen bg-background-secondary">
      <PageHeader onBack={() => navigate(-1)} backLabel={t("nav.trainerHome")} />

      {/* Static Large Title */}
      <div className="px-5 pt-2 pb-2">
        <h1 className="text-large-title text-foreground tracking-tight">{t("trial.settings")}</h1>
      </div>

      <motion.div {...fadeUp(0.05)} className="px-5 pt-1 pb-32">
        <p className="text-subhead text-muted-foreground mb-6">{t("trial.settingsSubtitle")}</p>

        {/* Duration */}
        <p className="text-caption-1 text-muted-foreground uppercase tracking-wider mb-3">{t("trial.duration")}</p>
        <div className="bg-card rounded-xl card-shadow p-4 mb-5">
          <label htmlFor="trial-duration" className="text-caption-1 text-muted-foreground mb-1 block">{t("trial.durationDays")}</label>
          <div className="relative">
            <select
              id="trial-duration"
              value={trialDuration}
              onChange={(e) => setTrialDuration(Number(e.target.value))}
              className="w-full bg-muted text-foreground rounded-lg px-3 py-3 text-body focus:outline-none appearance-none pr-8 min-h-11"
            >
              <option value={3}>3 {t("trial.daysLabel")}</option>
              <option value={7}>7 {t("trial.daysLabel")}</option>
              <option value={14}>14 {t("trial.daysLabel")}</option>
              <option value={30}>30 {t("trial.daysLabel")}</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        {/* What's included */}
        <p className="text-caption-1 text-muted-foreground uppercase tracking-wider mb-3">{t("trial.whatsIncluded")}</p>
        <div className="bg-card rounded-xl card-shadow overflow-hidden mb-5">
          {([
            { key: "workouts" as const, label: t("trial.workouts") },
            { key: "nutrition" as const, label: t("trial.nutrition") },
            { key: "chat" as const, label: t("trial.chatWithTrainer") },
            { key: "progress" as const, label: t("trial.progressTracking") },
          ]).map(({ key, label }, i, arr) => (
            <div key={key}
              className={`w-full flex items-center justify-between px-4 py-4 min-h-14 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
              <span className="text-body text-foreground">{label}</span>
              <ToggleSwitch
                value={trialIncludes[key]}
                onToggle={() => setTrialIncludes(prev => ({ ...prev, [key]: !prev[key] }))}
                label={label}
              />
            </div>
          ))}
        </div>

        {/* Auto programs */}
        <p className="text-caption-1 text-muted-foreground uppercase tracking-wider mb-3">{t("trial.autoPrograms")}</p>
        <div className="bg-card rounded-xl card-shadow p-4 space-y-4 mb-5">
          <div>
            <label htmlFor="trial-program" className="text-caption-1 text-muted-foreground mb-1 block">{t("trial.trialProgram")}</label>
            <div className="relative">
              <select
                id="trial-program"
                value={trialProgram}
                onChange={(e) => setTrialProgram(e.target.value)}
                className="w-full bg-muted text-foreground rounded-lg px-3 py-3 text-body focus:outline-none appearance-none pr-8 min-h-11"
              >
                <option value="">{t("trial.none")}</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
            </div>
          </div>
          <div className="separator-ios" />
          <div>
            <label htmlFor="trial-meal" className="text-caption-1 text-muted-foreground mb-1 block">{t("trial.trialMealPlan")}</label>
            <div className="relative">
              <select
                id="trial-meal"
                value={trialMealPlan}
                onChange={(e) => setTrialMealPlan(e.target.value)}
                className="w-full bg-muted text-foreground rounded-lg px-3 py-3 text-body focus:outline-none appearance-none pr-8 min-h-11"
              >
                <option value="">{t("trial.none")}</option>
                {nutritionTemplates.map(tmpl => (
                  <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Preview */}
        <p className="text-caption-1 text-muted-foreground uppercase tracking-wider mb-3">{t("trial.preview")}</p>
        <div className="bg-card rounded-xl card-shadow p-4 mb-6">
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <Calendar size={ICON_SIZE.md} className="text-primary" aria-hidden="true" />
              <span className="text-body text-foreground">{trialDuration} {t("trial.daysFree")}</span>
            </div>
            {trialProgram && (
              <div className="flex items-center gap-3">
                <Dumbbell size={ICON_SIZE.md} className="text-warning" aria-hidden="true" />
                <span className="text-body text-foreground">{trialProgram}</span>
              </div>
            )}
            {trialMealPlan && (
              <div className="flex items-center gap-3">
                <Salad size={ICON_SIZE.md} className="text-success" aria-hidden="true" />
                <span className="text-body text-foreground">{trialMealPlan}</span>
              </div>
            )}
            {trialIncludedList.length > 0 && (
              <div className="flex items-center gap-3">
                <CheckCircle2 size={ICON_SIZE.md} className="text-success" aria-hidden="true" />
                <span className="text-body text-foreground">{trialIncludedList.join(", ")}</span>
              </div>
            )}
            {trialExcludedList.length > 0 && (
              <div className="flex items-center gap-3">
                <XCircle size={ICON_SIZE.md} className="text-muted-foreground" aria-hidden="true" />
                <span className="text-body text-muted-foreground">{trialExcludedList.join(", ")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Save */}
        <Button
          onClick={handleSave}
          variant="cta"
          size="xl"
        >
          {t("trial.saved").replace(" ✓", "").replace("!", "")}
        </Button>
      </motion.div>
    </div>
  );
};

export default TrainerFreeTrial;
