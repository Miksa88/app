import { motion } from "framer-motion";
import { Scale } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// Istorija težine — sub-page izdvojen iz Profile.tsx (verbatim JSX)
const WeightHistoryPage = () => {
  const { language, t } = useLanguage();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-title-2 text-foreground mb-2">{t("profile.weightHistory")}</h2>
      <p className="text-subhead text-muted-foreground mb-6">{language === "sr" ? "Prati promene težine tokom vremena" : "Track your weight changes over time"}</p>
      <div className="bg-card rounded-xl card-shadow p-5 text-center">
        <Scale size={32} className="text-muted-foreground mx-auto mb-3" />
        <p className="text-body text-muted-foreground">{language === "sr" ? "Istorija težine će se pojaviti ovde" : "Weight history will appear here"}</p>
      </div>
    </motion.div>
  );
};

export default WeightHistoryPage;
