import { useEffect } from "react";
import { IOS_SPRING } from "@/lib/motion";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface WelcomeScreenProps {
  firstName: string;
  onComplete: () => void;
}

const WelcomeScreen = ({ firstName, onComplete }: WelcomeScreenProps) => {
  const { t } = useLanguage();
  const displayName = firstName || t("welcome.defaultName");

  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, ...IOS_SPRING.bouncy }}
        className="bg-card rounded-[20px] card-shadow p-8 max-w-sm w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, ...IOS_SPRING.bouncy }}
          className="text-display-lg mb-4"
          aria-hidden="true"
        >
          👋
        </motion.div>
        <h1 className="text-title-2 font-bold text-foreground mb-2">
          {t("welcome.hello").replace("{name}", displayName)}
        </h1>
        <p className="text-subhead text-muted-foreground leading-relaxed">
          {t("welcome.message")}
        </p>
      </motion.div>
    </div>
  );
};

export default WelcomeScreen;
