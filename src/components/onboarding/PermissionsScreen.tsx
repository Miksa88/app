import { useState } from "react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { motion } from "framer-motion";
import { Bell, Heart, ArrowRight } from "lucide-react";
import GradientButton from "@/components/GradientButton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHealth } from "@/contexts/HealthContext";
import { MOTION_DURATION , IOS_SPRING} from "@/lib/motion";

interface PermissionsScreenProps {
  onComplete: () => void;
}

const PermissionsScreen = ({ onComplete }: PermissionsScreenProps) => {
  const { t } = useLanguage();
  const { setHealthConnected } = useHealth();
  const [notificationsGranted, setNotificationsGranted] = useState<boolean | null>(null);
  const [healthGranted, setHealthGranted] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState(0); // 0 = notifications, 1 = health

  const handleNotifications = (allow: boolean) => {
    setNotificationsGranted(allow);
    setCurrentStep(1);
  };

  const handleHealth = (allow: boolean) => {
    setHealthGranted(allow);
    setHealthConnected(allow);
    onComplete();
  };

  const permissions = [
    {
      icon: Bell,
      color: "bg-primary",
      title: t("permissions.notifTitle"),
      description: t("permissions.notifDesc"),
      onAllow: () => handleNotifications(true),
      onSkip: () => handleNotifications(false),
    },
    {
      icon: Heart,
      color: "bg-destructive",
      title: t("permissions.healthTitle"),
      description: t("permissions.healthDesc"),
      onAllow: () => handleHealth(true),
      onSkip: () => handleHealth(false),
    },
  ];

  const current = permissions[currentStep];
  const Icon = current.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: MOTION_DURATION.base }}
        className="w-full max-w-sm flex flex-col items-center text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, ...IOS_SPRING.bouncy }}
          className={`w-20 h-20 rounded-[22px] ${current.color} flex items-center justify-center mb-8 shadow-lg`}
        >
          <Icon size={36} className="text-primary-foreground" />
        </motion.div>

        {/* Title */}
        <h1 className="text-title-2 font-bold text-foreground mb-3">
          {current.title}
        </h1>

        {/* Description */}
        <p className="text-body text-muted-foreground mb-10 leading-relaxed max-w-[300px]">
          {current.description}
        </p>

        {/* Buttons */}
        <div className="w-full space-y-3">
          <GradientButton onClick={current.onAllow} className="w-full" size="lg">
            <span className="flex items-center justify-center gap-2">
              {t("permissions.allow")}
              <ArrowRight size={ICON_SIZE.md} />
            </span>
          </GradientButton>

          <button
            onClick={current.onSkip}
            className="w-full text-center text-subhead text-muted-foreground py-3 min-h-11"
          >
            {t("permissions.notNow")}
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mt-8">
          {permissions.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentStep ? "bg-primary w-6" : i < currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default PermissionsScreen;
