import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { MOTION_DURATION, TAP_SCALE } from "@/lib/motion";
import { ICON_SIZE } from "@/lib/design-tokens";

interface AllergiesStepProps {
  selected: string[];
  onToggle: (item: string) => void;
}

const AllergiesStep = ({ selected, onToggle }: AllergiesStepProps) => {
  const { t } = useLanguage();

  const allergies = [
    { id: "none", emoji: "✅", label: t("onboarding.allergyNone") },
    { id: "milk", emoji: "🥛", label: t("onboarding.allergyMilk") },
    { id: "gluten", emoji: "🌾", label: t("onboarding.allergyGluten") },
    { id: "nuts", emoji: "🥜", label: t("onboarding.allergyNuts") },
    { id: "eggs", emoji: "🥚", label: t("onboarding.allergyEggs") },
    { id: "seafood", emoji: "🦐", label: t("onboarding.allergySeafood") },
    { id: "soy", emoji: "🫘", label: t("onboarding.allergySoy") },
    { id: "lactose", emoji: "🧀", label: t("onboarding.allergyLactose") },
  ];

  const handleToggle = (id: string) => {
    if (id === "none") {
      onToggle("none");
    } else {
      onToggle(id);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 pt-2">
      {allergies.map((allergy, i) => {
        const isNone = allergy.id === "none";
        const isSelected = isNone
          ? selected.includes("none") || selected.length === 0
          : selected.includes(allergy.id);

        return (
          <motion.button
            key={allergy.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: MOTION_DURATION.base }}
            whileTap={{ scale: TAP_SCALE.secondary }}
            onClick={() => handleToggle(allergy.id)}
            aria-pressed={isSelected}
            className={`rounded-2xl p-4 text-center transition-all min-h-[80px] flex flex-col items-center justify-center gap-2 ${
              isSelected
                ? "bg-card border-2 border-primary shadow-fab"
                : "bg-card card-shadow border-2 border-transparent"
            }`}
          >
            <span className="text-title-1" aria-hidden="true">{allergy.emoji}</span>
            <span className={`text-subhead font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
              {allergy.label}
            </span>
            {isSelected && !isNone && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-5 h-5 rounded-full gradient-primary flex items-center justify-center"
              >
                <Check size={ICON_SIZE.xs} className="text-primary-foreground" strokeWidth={3} />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default AllergiesStep;
