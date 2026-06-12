import { motion } from "framer-motion";
import { ICON_SIZE } from "@/lib/design-tokens";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { MOTION_DURATION } from "@/lib/motion";

interface MetabolicStepProps {
  selected: string[];
  onToggle: (item: string) => void;
}

const MetabolicStep = ({ selected, onToggle }: MetabolicStepProps) => {
  const { t } = useLanguage();

  const conditions = [
    { id: "none", label: t("onboarding.metaNone") },
    { id: "insulin_resistance", label: t("onboarding.metaInsulin") },
    { id: "hashimoto", label: t("onboarding.metaHashimoto") },
    { id: "pcos", label: t("onboarding.metaPCOS") },
    { id: "high_bp", label: t("onboarding.metaHighBP") },
    { id: "thyroid", label: t("onboarding.metaThyroid") },
    { id: "diabetes_t2", label: t("onboarding.metaDiabetes") },
    { id: "digestive", label: t("onboarding.metaDigestive") },
    { id: "chronic_fatigue", label: t("onboarding.metaFatigue") },
    { id: "menopause", label: t("onboarding.metaMenopause") },
    { id: "hypermobility", label: t("onboarding.metaHypermobility") },
  ];

  const handleToggle = (id: string) => {
    if (id === "none") {
      onToggle("none");
    } else {
      onToggle(id);
    }
  };

  return (
    <div className="flex flex-wrap gap-3 pt-2">
      {conditions.map((cond, i) => {
        const isNone = cond.id === "none";
        const isSelected = isNone
          ? selected.includes("none") || selected.length === 0
          : selected.includes(cond.id);

        return (
          <motion.button
            key={cond.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, duration: MOTION_DURATION.base }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleToggle(cond.id)}
            className={`px-4 py-3 rounded-2xl text-subhead font-medium transition min-h-11 flex items-center gap-2 ${
              isSelected
                ? "gradient-primary text-primary-foreground shadow-fab"
                : "bg-card card-shadow text-foreground border-2 border-transparent"
            }`}
          >
            {isSelected && <Check size={ICON_SIZE.xs} strokeWidth={3} />}
            {cond.label}
          </motion.button>
        );
      })}
    </div>
  );
};

export default MetabolicStep;
