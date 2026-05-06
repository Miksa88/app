import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === "en" ? "sr" : "en")}
      className="flex items-center gap-2 bg-card px-3 py-2 rounded-full card-shadow min-h-11 text-subhead font-medium text-foreground"
    >
      <span className="text-base">{language === "en" ? "🇺🇸" : "🇷🇸"}</span>
      <span className="uppercase">{language === "en" ? "EN" : "SR"}</span>
    </button>
  );
};

export default LanguageSwitcher;
