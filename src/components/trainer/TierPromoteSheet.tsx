// ============================================================================
// TierPromoteSheet — manual tier change (entry/mid/high) za trener
// ============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Sparkles, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { promoteClientToTier } from "@/services/autoPilotService";
import type { PackageTier } from "@/services/packageService";
import { IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { ICON_SIZE } from "@/lib/design-tokens";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  currentTier: PackageTier | null;
  onPromoted?: (newTier: PackageTier) => void;
}

const TIER_OPTIONS: Array<{
  value: PackageTier;
  icon: typeof Sparkles;
  iconBg: string;
  iconColor: string;
}> = [
  { value: "entry", icon: Zap, iconBg: "bg-info/10", iconColor: "text-info" },
  { value: "mid", icon: Sparkles, iconBg: "bg-primary/10", iconColor: "text-primary" },
  { value: "high", icon: Crown, iconBg: "bg-warning/15", iconColor: "text-warning" },
];

const TierPromoteSheet = ({ open, onOpenChange, clientId, currentTier, onPromoted }: Props) => {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<PackageTier | null>(currentTier);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selected || selected === currentTier) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      await promoteClientToTier(clientId, selected);
      toast.success(t("tier.promoted"));
      onPromoted?.(selected);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
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
            aria-label={t("tier.promote")}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto bg-card rounded-t-3xl p-6 pb-10"
          >
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-title-2 font-bold text-foreground">{t("tier.promote")}</h2>
              <button onClick={() => onOpenChange(false)} aria-label={t("mealPlan.cancel")} className="text-muted-foreground min-w-11 min-h-11 flex items-center justify-center">
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3">
              {TIER_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selected === opt.value;
                const isCurrent = currentTier === opt.value;
                return (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: TAP_SCALE.secondary }}
                    onClick={() => setSelected(opt.value)}
                    aria-pressed={isSelected}
                    className={`w-full rounded-2xl p-4 flex items-center gap-3 text-left border-2 transition-colors min-h-14 ${
                      isSelected ? "border-primary bg-primary/5" : "border-transparent bg-muted/30"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl ${opt.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon size={ICON_SIZE.lg} className={opt.iconColor} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-body font-semibold text-foreground">{t(`tier.${opt.value}`)}</p>
                        {isCurrent && (
                          <span className="text-caption-2 px-2 py-0.5 rounded-full bg-success/10 text-success font-semibold">
                            current
                          </span>
                        )}
                      </div>
                      <p className="text-caption-1 text-muted-foreground mt-0.5">{t(`tier.${opt.value}Desc`)}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-6">
              <Button
                onClick={handleConfirm}
                disabled={!selected || selected === currentTier || saving}
                variant="cta"
                size="xl"
              >
                {saving ? "..." : t("tier.promote")}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TierPromoteSheet;
