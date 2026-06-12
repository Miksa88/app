import { motion } from "framer-motion";
import { Flame, Sparkles, Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { MOTION_DURATION, TAP_SCALE } from "@/lib/motion";

interface GoalStepProps {
  selected: string;
  onSelect: (goal: string) => void;
}

const GoalStep = ({ selected, onSelect }: GoalStepProps) => {
  const { t } = useLanguage();

  const goals = [
    { id: "fat_loss", icon: Flame, label: t("onboarding.goalFatLoss"), desc: t("onboarding.goalFatLossDesc") },
    { id: "figure", icon: Sparkles, label: t("onboarding.goalFigure"), desc: t("onboarding.goalFigureDesc") },
    { id: "health", icon: Heart, label: t("onboarding.goalBetterHealth"), desc: t("onboarding.goalBetterHealthDesc") },
  ];

  return (
    <div className="space-y-3 pt-2">
      {goals.map((goal, i) => {
        const isSelected = selected === goal.id;
        return (
          <motion.button
            key={goal.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: MOTION_DURATION.base }}
            whileTap={{ scale: TAP_SCALE.primary }}
            onClick={() => onSelect(goal.id)}
            className={`w-full rounded-[20px] p-5 text-left transition duration-fast min-h-[100px] flex items-center gap-4 ${
              isSelected
                ? "gradient-primary text-primary-foreground shadow-fab border-2 border-transparent"
                : "bg-card card-shadow border-2 border-transparent hover:border-primary/20"
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
              isSelected ? "bg-white/20" : "bg-primary/8"
            }`}>
              <goal.icon size={28} className={isSelected ? "text-primary-foreground" : "text-primary"} />
            </div>
            <div>
              <p className={`text-headline ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                {goal.label}
              </p>
              <p className={`text-subhead mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {goal.desc}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

export default GoalStep;
