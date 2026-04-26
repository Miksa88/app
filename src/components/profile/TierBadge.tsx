// ============================================================================
// TierBadge — vizuelni indikator klijentskog paketa (entry/mid/high)
// ============================================================================

import { Sparkles, Crown, Zap } from "lucide-react";
import type { PackageTier } from "@/services/packageService";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  tier: PackageTier | null;
  size?: "sm" | "md";
}

const CONFIG: Record<PackageTier, {
  icon: typeof Sparkles;
  bgClass: string;
  textClass: string;
  labelKey: string;
}> = {
  entry: {
    icon: Zap,
    bgClass: "bg-info/10",
    textClass: "text-info",
    labelKey: "tier.entry",
  },
  mid: {
    icon: Sparkles,
    bgClass: "bg-primary/10",
    textClass: "text-primary",
    labelKey: "tier.mid",
  },
  high: {
    icon: Crown,
    bgClass: "bg-warning/15",
    textClass: "text-warning",
    labelKey: "tier.high",
  },
};

export const TierBadge = ({ tier, size = "sm" }: Props) => {
  const { t } = useLanguage();
  if (!tier) return null;
  const cfg = CONFIG[tier];
  const Icon = cfg.icon;
  const padding = size === "sm" ? "px-2 py-0.5" : "px-3 py-1";
  const iconSize = size === "sm" ? 12 : 14;
  const textClass = size === "sm" ? "text-caption-2" : "text-caption-1";

  return (
    <span
      className={`inline-flex items-center gap-1 ${padding} rounded-full ${cfg.bgClass} ${cfg.textClass} ${textClass} font-semibold`}
      aria-label={t(cfg.labelKey)}
    >
      <Icon size={iconSize} aria-hidden="true" />
      {t(cfg.labelKey)}
    </span>
  );
};

export default TierBadge;
