import { useState } from "react";
import { NavPlusButton } from "@/components/ui/nav-plus-button";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/PageTitle";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp, IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { UtensilsCrossed, ChevronRight, Leaf, Flame, Heart, Activity, Lock, FilePlus, Copy } from "lucide-react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useLanguage } from "@/contexts/LanguageContext";
import type { NutritionTemplate } from "@/utils/mealPlanGenerator";
import { MASTER_NUTRITION } from "@/data/masterNutrition";
import { getDefaultLevel } from "@/utils/defaultAssignment";
import { useNutritionTemplates } from "@/hooks/useNutritionTemplates";

// Goal config — semantic icons + colors. Bulk/health razlikujemo (bulk = success/zelena
// zbog rasta; health = info/teal — wellness ton, ne zelenilo da se ne meša sa bulk-om).
const goalConfig: Record<string, { icon: typeof Flame; color: string; bg: string; labelKey: string }> = {
  cut: { icon: Flame, color: "text-destructive", bg: "bg-destructive/10", labelKey: "nutrition.cut" },
  bulk: { icon: Activity, color: "text-success", bg: "bg-success/10", labelKey: "nutrition.bulk" },
  maintain: { icon: Heart, color: "text-info", bg: "bg-info/10", labelKey: "nutrition.maintain" },
  health: { icon: Leaf, color: "text-warning", bg: "bg-warning/10", labelKey: "nutrition.health" },
};

type NutritionWithDefault = NutritionTemplate & { isDefault?: true };

const TrainerNutrition = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: templatesData = [] } = useNutritionTemplates();
  const [addSheetMode, setAddSheetMode] = useState<null | "menu" | "clone">(null);

  // Master-spec default templates — uvek vidljivi sa "Default" badge + Lock.
  const defaultTemplates: NutritionWithDefault[] = MASTER_NUTRITION.map((tmpl) => ({
    ...tmpl,
    id: `default-${tmpl.id}`,
    isDefault: true,
  }));
  const templates: NutritionWithDefault[] = [...templatesData, ...defaultTemplates];

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      <PageTitle
        title={t("nutrition.title")}
        subtitle={t("nutrition.templates")}
        action={
          <NavPlusButton
            onClick={() => setAddSheetMode("menu")}
            aria-label={t("nutrition.addTemplate")}
          />
        }
      />

      <div className="px-5 mt-4">
        {templates.length === 0 ? (
          <motion.div {...fadeUp(0.15)} className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed size={28} className="text-muted-foreground/50" />
            </div>
            <p className="text-body text-muted-foreground mb-4">{t("nutrition.emptyState")}</p>
            <Button
              onClick={() => navigate("/trainer/nutrition-template/new")}
              variant="cta"
              className="rounded-2xl"
            >
              {t("nutrition.addTemplate")}
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {templates.map((tmpl, i) => {
              const gc = goalConfig[tmpl.goalType] || goalConfig.health;
              const GoalIcon = gc.icon;
              const isDefault = !!tmpl.isDefault;
              const autoDefaultLevel = getDefaultLevel(tmpl.tags);
              return (
                <motion.button
                  key={tmpl.id}
                  {...fadeUp(0.1 + i * 0.05)}
                  whileTap={{ scale: TAP_SCALE.secondary }}
                  onClick={() => navigate(`/trainer/nutrition-template/${tmpl.id}`)}
                  className="w-full bg-card rounded-2xl p-4 card-shadow text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl ${gc.bg} flex items-center justify-center shrink-0`}>
                      <GoalIcon size={20} className={gc.color} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-body font-semibold text-foreground truncate">{tmpl.name}</p>
                        {isDefault && (
                          <span className="text-caption-2 font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1 shrink-0">
                            <Lock size={10} aria-hidden="true" />
                            {t("training.defaultBadge")}
                          </span>
                        )}
                        {!isDefault && autoDefaultLevel && (
                          <span className="text-caption-2 font-bold px-2 py-0.5 rounded-full bg-success/10 text-success shrink-0">
                            {t("training.autoDefaultBadge").replace("{level}", t(`training.level_${autoDefaultLevel}`))}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-caption-2 font-bold ${gc.color}`}>
                          {t(gc.labelKey)}
                        </span>
                        <span className="text-caption-2 text-muted-foreground/50">·</span>
                        <span className="text-caption-1 text-muted-foreground">
                          {tmpl.calorieStrategy === "fixed" ? `${tmpl.fixedCalories} kcal` : tmpl.calorieStrategy === "auto" ? t("nutrition.autoKcal") : `${tmpl.calorieRange?.min}-${tmpl.calorieRange?.max} kcal`}
                        </span>
                        <span className="text-caption-2 text-muted-foreground/50">·</span>
                        <span className="text-caption-1 text-muted-foreground">
                          {tmpl.mealCount} {t("nutrition.mealsLabel")}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground/30 shrink-0" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* + Add sheet — Blank vs Clone iz default-a */}
      <AnimatePresence>
        {addSheetMode && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setAddSheetMode(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={IOS_SPRING.medium}
              role="dialog"
              aria-modal="true"
              aria-label={t("nutrition.addTemplate")}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-5 pb-8 max-w-lg mx-auto max-h-[80vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" aria-hidden="true" />
              {addSheetMode === "menu" && (
                <>
                  <h3 className="text-title-3 text-foreground mb-4">{t("nutrition.addTemplate")}</h3>
                  <div className="space-y-2">
                    <motion.button
                      whileTap={{ scale: TAP_SCALE.secondary }}
                      onClick={() => {
                        setAddSheetMode(null);
                        navigate("/trainer/nutrition-template/new");
                      }}
                      className="w-full bg-muted/40 rounded-2xl p-4 text-left border border-border/50 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FilePlus size={ICON_SIZE.md} className="text-primary" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-semibold text-foreground">{t("training.blank")}</p>
                        <p className="text-caption-1 text-muted-foreground mt-0.5">{t("training.blankDesc")}</p>
                      </div>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: TAP_SCALE.secondary }}
                      onClick={() => setAddSheetMode("clone")}
                      className="w-full bg-muted/40 rounded-2xl p-4 text-left border border-border/50 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Copy size={ICON_SIZE.md} className="text-primary" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-semibold text-foreground">{t("training.cloneFromDefault")}</p>
                        <p className="text-caption-1 text-muted-foreground mt-0.5">{t("training.cloneFromDefaultDesc")}</p>
                      </div>
                    </motion.button>
                  </div>
                </>
              )}

              {addSheetMode === "clone" && (
                <>
                  <h3 className="text-title-3 text-foreground mb-1">{t("training.cloneFromDefault")}</h3>
                  <p className="text-caption-1 text-muted-foreground mb-4">{t("training.cloneFromDefaultDesc")}</p>
                  <div className="space-y-2">
                    {MASTER_NUTRITION.map((tmpl) => {
                      const gc = goalConfig[tmpl.goalType] || goalConfig.health;
                      const GoalIcon = gc.icon;
                      return (
                        <motion.button
                          key={tmpl.id}
                          whileTap={{ scale: TAP_SCALE.secondary }}
                          onClick={() => {
                            setAddSheetMode(null);
                            navigate(`/trainer/nutrition-template/default-${tmpl.id}`);
                          }}
                          className="w-full bg-background-secondary rounded-xl p-3.5 text-left flex items-center gap-3 active:opacity-70"
                        >
                          <div className={`w-10 h-10 rounded-xl ${gc.bg} flex items-center justify-center shrink-0`}>
                            <GoalIcon size={ICON_SIZE.sm} className={gc.color} aria-hidden="true" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-body font-semibold text-foreground truncate">{tmpl.name}</p>
                            <p className="text-caption-1 text-muted-foreground truncate">{tmpl.description}</p>
                          </div>
                          <ChevronRight size={16} className="text-muted-foreground/30 shrink-0" aria-hidden="true" />
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => setAddSheetMode(addSheetMode === "menu" ? null : "menu")}
                className="w-full mt-4 py-3 text-body font-medium text-muted-foreground"
              >
                {addSheetMode === "menu" ? t("common.cancel") : t("common.back")}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrainerNutrition;
