import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// Ciljevi — sub-page izdvojen iz Profile.tsx (verbatim JSX, state ostaje u Profile)
interface GoalsPageProps {
  goals: string[];
  allGoals: string[];
  goalKeys: Record<string, string>;
  toggleGoal: (g: string) => void;
}

const GoalsPage = ({ goals, allGoals, goalKeys, toggleGoal }: GoalsPageProps) => {
  const { t } = useLanguage();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-title-2 text-foreground mb-2">{t("goals.title")}</h2>
      <p className="text-subhead text-muted-foreground mb-6">{t("goals.subtitle")}</p>
      <div className="space-y-2">
        {allGoals.map((g) => {
          const selected = goals.includes(g);
          return (
            <button key={g} onClick={() => toggleGoal(g)}
              className={`w-full flex items-center justify-between px-4 py-4 rounded-xl min-h-11 transition-colors ${selected ? "bg-primary/10 border-2 border-primary" : "bg-card card-shadow border-2 border-transparent"}`}>
              <span className={`text-body ${selected ? "text-primary font-semibold" : "text-foreground"}`}>{t(goalKeys[g] || g)}</span>
              {selected && <Check size={20} className="text-primary" />}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default GoalsPage;
