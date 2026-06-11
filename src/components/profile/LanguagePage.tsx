import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { IOS_SPRING } from "@/lib/motion";
import { useLanguage } from "@/contexts/LanguageContext";

// Jezik — sub-page izdvojen iz Profile.tsx (verbatim JSX, state iz LanguageContext)
const LanguagePage = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-title-2 text-foreground mb-2">{t("language.title")}</h2>
      <p className="text-subhead text-muted-foreground mb-6">{t("language.subtitle")}</p>
      <div className="space-y-2">
        {[
          { value: "en" as const, flag: "🇬🇧", label: t("language.english"), desc: t("language.englishDesc") },
          { value: "sr" as const, flag: "🇷🇸", label: t("language.serbian"), desc: t("language.serbianDesc") },
        ].map(({ value, flag, label, desc }) => {
          const selected = language === value;
          return (
            <button key={value} onClick={() => setLanguage(value)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl min-h-14 transition-all ${selected ? "bg-primary/10 border-2 border-primary" : "bg-card card-shadow border-2 border-transparent"}`}>
              <span className="text-title-3" aria-hidden="true">{flag}</span>
              <div className="flex-1 text-left">
                <p className={`text-body ${selected ? "text-primary font-semibold" : "text-foreground"}`}>{label}</p>
                <p className="text-footnote text-muted-foreground">{desc}</p>
              </div>
              {selected &&
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={IOS_SPRING.precise}>
                  <Check size={20} className="text-primary" />
                </motion.div>
              }
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default LanguagePage;
