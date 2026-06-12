import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { MOTION_DURATION, MOTION_EASE, TAP_SCALE } from "@/lib/motion";

interface FrequencyStepProps {
  selected: number;
  onSelect: (freq: number) => void;
  /**
   * Spec 01 Sekcija 3 (Conditional branching):
   *   beginner    → 3 dana (FIKSNO, frequency step se preskace)
   *   intermediate → 4 ili 5 dana (Upper/Lower split)
   * Beginner ne dolazi do ovog ekrana (Onboarding.next preskace).
   */
  experienceLevel?: 'beginner' | 'intermediate';
}

const FrequencyStep = ({ selected, onSelect, experienceLevel }: FrequencyStepProps) => {
  const { t } = useLanguage();
  // Pocetnice: 3 dana fiksno (ne biraju). Intermediate: 4 ili 5 dana.
  // Default fallback (ako experienceLevel undefined) prikazuje sve 3 opcije.
  const options =
    experienceLevel === 'beginner' ? [3]
    : experienceLevel === 'intermediate' ? [4, 5]
    : [3, 4, 5];

  const getSubtitle = (n: number): string => {
    switch (n) {
      case 3: return t("onboarding.freq3Sub");
      case 4: return t("onboarding.freq4Sub");
      case 5: return t("onboarding.freq5Sub");
      default: return "";
    }
  };

  return (
    <div className="space-y-3 pt-2">
      {options.map((value, i) => {
        const isSelected = selected === value;
        return (
          <motion.button
            key={value}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: MOTION_DURATION.base, ease: MOTION_EASE.outQuart }}
            whileTap={{ scale: TAP_SCALE.primary }}
            onClick={() => onSelect(value)}
            aria-pressed={isSelected}
            className={`w-full rounded-[20px] p-5 text-left transition duration-fast min-h-[88px] flex items-center gap-4 ${
              isSelected
                ? "gradient-primary text-primary-foreground shadow-fab border-2 border-transparent"
                : "bg-card card-shadow border-2 border-transparent hover:border-primary/20"
            }`}
          >
            {/* Veliki broj — beli na gradient-u kad je selektovan, primary inace */}
            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${
              isSelected ? "bg-white/20" : "bg-primary/8"
            }`}>
              <span className={`text-title-2 font-bold leading-none ${
                isSelected ? "text-primary-foreground" : "text-primary"
              }`}>
                {value}
              </span>
              <span className={`text-caption-micro uppercase tracking-wider mt-0.5 ${
                isSelected ? "text-primary-foreground/80" : "text-primary/70"
              }`}>
                {t("training.daysLabel")}
              </span>
            </div>

            {/* Info — naslov + suptilan opis. Bez weekday tackica (uklonjeno
                2026-05-06 — Mihajlo: konfuzno UX, ostaje samo "X dana nedeljno"). */}
            <div className="flex-1 min-w-0">
              <p className={`text-headline ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                {value} {t("onboarding.freqDaysWeekly")}
              </p>
              <p className={`text-subhead mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {getSubtitle(value)}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

export default FrequencyStep;
