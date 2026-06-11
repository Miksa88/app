import { motion } from "framer-motion";
import { Heart, Flame, Footprints, HeartPulse, Bed, Scale, type LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { ICON_SIZE, IOS_SWITCH } from "@/lib/design-tokens";
import { IOS_SPRING } from "@/lib/motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHealth } from "@/contexts/HealthContext";
import { SectionLabel } from "@/components/ui/section-label";
import { Button } from "@/components/ui/button";

// Apple Health — sub-page izdvojen iz Profile.tsx (verbatim JSX, state iz HealthContext)
const HealthPage = () => {
  const { t } = useLanguage();
  const { healthConnected, setHealthConnected } = useHealth();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-title-2 text-foreground mb-2">{t("health.title")}</h2>
      <p className="text-subhead text-muted-foreground mb-6">{t("health.subtitle")}</p>
      <div className="bg-card rounded-xl card-shadow p-4 mb-4">
        <button
          onClick={() => setHealthConnected(!healthConnected)}
          role="switch"
          aria-checked={healthConnected}
          aria-label={t("health.title")}
          className="w-full flex items-center justify-between min-h-14"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${healthConnected ? "bg-success/15" : "bg-muted"}`}>
              <Heart size={20} className={healthConnected ? "text-success" : "text-muted-foreground"} aria-hidden="true" />
            </div>
            <div className="text-left">
              <p className="text-body text-foreground font-medium">{t("health.title")}</p>
              <p className="text-footnote text-muted-foreground">{healthConnected ? t("health.connectedSync") : t("profile.notConnected")}</p>
            </div>
          </div>
          <div className={`${IOS_SWITCH.track} rounded-full p-[2px] transition-colors duration-base shrink-0 ${healthConnected ? "bg-success" : "bg-muted"}`} aria-hidden="true">
            <motion.div layout transition={IOS_SPRING.precise} className={`${IOS_SWITCH.thumb} rounded-full bg-white shadow-sm ${healthConnected ? "ml-auto" : "ml-0"}`} />
          </div>
        </button>
      </div>
      {healthConnected &&
        <div className="bg-card rounded-xl card-shadow overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <SectionLabel className="!px-0 !mb-0">{t("health.syncingData")}</SectionLabel>
          </div>
          {([
            { icon: Flame, iconColor: "text-warning", label: t("health.calories"), desc: t("health.caloriesDesc"), enabled: true },
            { icon: Footprints, iconColor: "text-info", label: t("health.stepsDistance"), desc: t("health.stepsDistanceDesc"), enabled: true },
            { icon: HeartPulse, iconColor: "text-destructive", label: t("health.heartRate"), desc: t("health.heartRateDesc"), enabled: true },
            { icon: Bed, iconColor: "text-primary", label: t("health.sleep"), desc: t("health.sleepDesc"), enabled: false },
            { icon: Scale, iconColor: "text-success", label: t("health.weight"), desc: t("health.weightDesc"), enabled: true },
          ] as Array<{ icon: ComponentType<LucideProps>; iconColor: string; label: string; desc: string; enabled: boolean }>).map((item, i, arr) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`flex items-center gap-3 px-4 py-4 min-h-14 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                <Icon size={ICON_SIZE.lg} className={item.iconColor} aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-body text-foreground">{item.label}</p>
                  <p className="text-footnote text-muted-foreground">{item.desc}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${item.enabled ? "bg-success" : "bg-muted-foreground/30"}`} />
              </div>
            );
          })}
        </div>
      }
      {!healthConnected &&
        <div className="bg-card rounded-xl card-shadow p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Heart size={28} className="text-primary" />
          </div>
          <h3 className="text-title-3 text-foreground mb-2">{t("health.connectTitle")}</h3>
          <p className="text-subhead text-muted-foreground mb-4">{t("health.connectDesc")}</p>
          <Button onClick={() => setHealthConnected(true)} variant="cta" size="xl">
            {t("health.connectNow")}
          </Button>
        </div>
      }
    </motion.div>
  );
};

export default HealthPage;
