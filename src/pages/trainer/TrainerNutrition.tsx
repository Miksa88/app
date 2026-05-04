import { NavPlusButton } from "@/components/ui/nav-plus-button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, TAP_SCALE } from "@/lib/motion";
import { Plus, UtensilsCrossed, ChevronRight, Leaf, Flame, Heart, Activity } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { NutritionTemplate } from "@/utils/mealPlanGenerator";
import { useNutritionTemplates } from "@/hooks/useNutritionTemplates";

const goalConfig: Record<string, { icon: typeof Flame; color: string; bg: string; labelKey: string }> = {
  cut: { icon: Flame, color: "text-destructive", bg: "bg-destructive/10", labelKey: "nutrition.cut" },
  bulk: { icon: Activity, color: "text-success", bg: "bg-success/10", labelKey: "nutrition.bulk" },
  maintain: { icon: Heart, color: "text-info", bg: "bg-info/10", labelKey: "nutrition.maintain" },
  health: { icon: Leaf, color: "text-success", bg: "bg-success/10", labelKey: "nutrition.health" },
};

const tagColor = (tag: string) => {
  if (tag === "free_trial") return "bg-success/10 text-success";
  if (tag === "beginner") return "bg-info/10 text-info";
  if (tag === "intermediate") return "bg-warning/10 text-warning";
  if (tag === "advanced") return "bg-destructive/10 text-destructive";
  if (tag.includes("fat_loss") || tag.includes("muscle_gain")) return "bg-primary/10 text-primary";
  if (tag.includes("days_week")) return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
};

const tagLabel = (tag: string) => {
  const map: Record<string, string> = {
    free_trial: "Free Trial", beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced",
    fat_loss: "Fat Loss", figure: "Figure", health: "Health", muscle_gain: "Muscle Gain",
    "3_days_week": "3x/wk", "4_days_week": "4x/wk", "5_days_week": "5x/wk",
  };
  if (tag.startsWith("safe_")) return `Safe: ${tag.replace("safe_", "")}`;
  return map[tag] || tag;
};

const TrainerNutrition = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: templatesData = [] } = useNutritionTemplates();
  const templates: NutritionTemplate[] = templatesData;

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      <div className="px-5 pt-14 pb-2 flex items-center justify-between">
        <motion.div {...fadeUp()}>
          <h1 className="text-large-title text-foreground">{t("nutrition.title")}</h1>
          <p className="text-caption-1 text-muted-foreground mt-0.5">{t("nutrition.templates")}</p>
        </motion.div>
        <motion.div {...fadeUp(0.1)}>
          <NavPlusButton
            onClick={() => navigate("/trainer/nutrition-template/new")}
            aria-label={t("nutrition.addTemplate")}
          />
        </motion.div>
      </div>

      <div className="px-5 mt-4">
        {templates.length === 0 ? (
          <motion.div {...fadeUp(0.15)} className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed size={28} className="text-muted-foreground/50" />
            </div>
            <p className="text-body text-muted-foreground mb-4">{t("nutrition.emptyState")}</p>
            <button
              onClick={() => navigate("/trainer/nutrition-template/new")}
              className="gradient-primary text-primary-foreground px-6 py-3 rounded-2xl text-body font-bold min-h-11"
            >
              {t("nutrition.addTemplate")}
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {templates.map((tmpl, i) => {
              const gc = goalConfig[tmpl.goalType] || goalConfig.health;
              const GoalIcon = gc.icon;
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
                      <GoalIcon size={20} className={gc.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-foreground">{tmpl.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-caption-2 font-bold ${gc.color}`}>
                          {t(gc.labelKey)}
                        </span>
                        <span className="text-caption-2 text-muted-foreground/50">·</span>
                        <span className="text-caption-1 text-muted-foreground">
                          {tmpl.calorieStrategy === "fixed" ? `${tmpl.fixedCalories} kcal` : tmpl.calorieStrategy === "auto" ? "Auto kcal" : `${tmpl.calorieRange?.min}-${tmpl.calorieRange?.max} kcal`}
                        </span>
                        <span className="text-caption-2 text-muted-foreground/50">·</span>
                        <span className="text-caption-1 text-muted-foreground">{tmpl.mealCount || 5} meals</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground/30 shrink-0" />
                  </div>
                  {tmpl.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 ml-[3.25rem]">
                      {tmpl.tags.slice(0, 4).map(tag => (
                        <span key={tag} className={`text-caption-2 px-2 py-0.5 rounded-full font-bold ${tagColor(tag)}`}>
                          {tagLabel(tag)}
                        </span>
                      ))}
                      {tmpl.tags.length > 4 && (
                        <span className="text-caption-2 text-muted-foreground">+{tmpl.tags.length - 4}</span>
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerNutrition;
