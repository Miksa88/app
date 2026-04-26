// ============================================================================
// QuickPauseSheet — bottom sheet za pokretanje pauze (travel/illness)
// ============================================================================
//
// Korisnik klikne brzu akciju na Home/Profile, bira tip pauze,
// hook poziva start-pause Edge Function. Engine zatim:
//   - Ne penalizuje za travel (0 penalty sessions)
//   - Aplicira "soft deficit -5%" za illness
//   - Pauzira queue (next workout neće se računati kao "skipped")
// ============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Thermometer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useStartPause, type PauseType } from "@/hooks/mutations/useStartPause";
import { useLanguage } from "@/contexts/LanguageContext";
import { IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { ICON_SIZE } from "@/lib/design-tokens";
import { toast } from "sonner";

interface QuickPauseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QuickPauseSheet = ({ open, onOpenChange }: QuickPauseSheetProps) => {
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const startPause = useStartPause(clientId, { silent: true });
  const [selected, setSelected] = useState<PauseType | null>(null);

  const options: Array<{
    type: PauseType;
    label: string;
    desc: string;
    icon: typeof Plane;
    iconBg: string;
    iconColor: string;
  }> = [
    {
      type: "travel",
      label: t("pause.travelLabel"),
      desc: t("pause.travelDesc"),
      icon: Plane,
      iconBg: "bg-secondary/10",
      iconColor: "text-secondary",
    },
    {
      type: "illness",
      label: t("pause.illnessLabel"),
      desc: t("pause.illnessDesc"),
      icon: Thermometer,
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
  ];

  const handleConfirm = async () => {
    if (!selected || !clientId) return;
    try {
      await startPause.mutateAsync({
        pauseType: selected,
        startDate: new Date().toISOString(),
      });
      toast.success(t("pause.started"));
      setSelected(null);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/40 z-50"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={IOS_SPRING.medium}
            role="dialog"
            aria-modal="true"
            aria-label={t("pause.title")}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto bg-card rounded-t-3xl p-6 pb-10"
          >
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />

            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-title-2 font-bold text-foreground">{t("pause.title")}</h2>
                <p className="text-caption-1 text-muted-foreground mt-0.5">{t("pause.hint")}</p>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                aria-label={t("mealPlan.cancel")}
                className="text-muted-foreground min-w-11 min-h-11 flex items-center justify-center"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {options.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selected === opt.type;
                return (
                  <motion.button
                    key={opt.type}
                    whileTap={{ scale: TAP_SCALE.secondary }}
                    onClick={() => setSelected(opt.type)}
                    aria-pressed={isSelected}
                    className={`w-full rounded-2xl p-4 text-left flex items-center gap-3 border-2 transition-all min-h-14 ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl ${opt.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon size={ICON_SIZE.lg} className={opt.iconColor} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-foreground">{opt.label}</p>
                      <p className="text-caption-1 text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-6">
              <Button
                onClick={handleConfirm}
                disabled={!selected || startPause.isPending}
                variant="cta"
                size="xl"
              >
                {startPause.isPending ? "..." : t("pause.confirmStart")}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QuickPauseSheet;
