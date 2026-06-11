import { motion } from "framer-motion";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { IOS_SPRING } from "@/lib/motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

// Izgled (tema) — sub-page izdvojen iz Profile.tsx (verbatim JSX, state iz ThemeContext)
const AppearancePage = () => {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-title-2 text-foreground mb-2">{t("appearance.title")}</h2>
      <p className="text-subhead text-muted-foreground mb-6">{t("appearance.subtitle")}</p>
      <div className="space-y-2">
        {[
          { value: "light" as const, icon: Sun, label: t("appearance.light"), desc: t("appearance.lightDesc") },
          { value: "dark" as const, icon: Moon, label: t("appearance.dark"), desc: t("appearance.darkDesc") },
          { value: "system" as const, icon: Monitor, label: t("appearance.system"), desc: t("appearance.systemDesc") },
        ].map(({ value, icon: Icon, label, desc }) => {
          const selected = theme === value;
          return (
            <button key={value} onClick={() => setTheme(value)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl min-h-14 transition-all ${selected ? "bg-primary/10 border-2 border-primary" : "bg-card card-shadow border-2 border-transparent"}`}>
              <Icon size={ICON_SIZE.lg} className={selected ? "text-primary" : "text-muted-foreground"} />
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

export default AppearancePage;
