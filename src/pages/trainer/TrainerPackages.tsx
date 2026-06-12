// ============================================================================
// TrainerPackages — real Supabase tier package management
// Spec: roadmap Faza D
// ============================================================================

import { useEffect, useState } from "react";
import { MotionCard } from "@/components/ui/motion-card";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, TAP_SCALE } from "@/lib/motion";
import { Plus, Crown, Sparkles, Zap, ChevronRight, Pencil, Layers } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { listTrainerPackages, type PackageRecord, type PackageTier } from "@/services/packageService";

const TIER_ORDER: Record<PackageTier, number> = { entry: 0, mid: 1, high: 2 };

const TIER_VISUAL: Record<PackageTier, {
  icon: typeof Sparkles;
  iconBg: string;
  iconColor: string;
  cardBorder: string;
}> = {
  entry: {
    icon: Zap,
    iconBg: "bg-info/10",
    iconColor: "text-info",
    cardBorder: "",
  },
  mid: {
    icon: Sparkles,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    cardBorder: "border-2 border-primary/30",
  },
  high: {
    icon: Crown,
    iconBg: "bg-gradient-to-br from-amber-500 to-amber-600",
    iconColor: "text-white",
    cardBorder: "border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-amber-600/10",
  },
};

const TrainerPackages = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await listTrainerPackages(clientId);
        if (!cancelled) {
          list.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
          setPackages(list);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  const tierCount = (tier: PackageTier) => packages.filter(p => p.tier === tier).length;

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      <PageHeader
        title={t("packages.title")}
        onBack={() => navigate(-1)}
        backLabel={t("nav.trainerHome")}
        rightAction={
          <button
            onClick={() => navigate("/trainer/package/new")}
            aria-label={t("trainerPackages.create")}
            className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center mr-2"
          >
            <Plus size={ICON_SIZE.md} className="text-primary-foreground" aria-hidden="true" />
          </button>
        }
      />

      <div className="px-5 pt-3 space-y-4">
        {/* Tier breakdown stats */}
        <MotionCard {...fadeUp(0.04)} className="p-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center mx-auto mb-1">
                <Zap size={ICON_SIZE.md} className="text-info" aria-hidden="true" />
              </div>
              <p className="text-title-2 font-bold text-foreground tabular-nums">{tierCount("entry")}</p>
              <p className="text-caption-2 text-muted-foreground mt-0.5">{t("tier.entry")}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-1">
                <Sparkles size={ICON_SIZE.md} className="text-primary" aria-hidden="true" />
              </div>
              <p className="text-title-2 font-bold text-foreground tabular-nums">{tierCount("mid")}</p>
              <p className="text-caption-2 text-muted-foreground mt-0.5">{t("tier.mid")}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mx-auto mb-1">
                <Crown size={ICON_SIZE.md} className="text-white" aria-hidden="true" />
              </div>
              <p className="text-title-2 font-bold text-foreground tabular-nums">{tierCount("high")}</p>
              <p className="text-caption-2 text-muted-foreground mt-0.5">{t("tier.high")}</p>
            </div>
          </div>
        </MotionCard>

        {/* Empty / loading / list */}
        {loading ? (
          <div className="flex flex-col items-center pt-12">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-hidden="true" />
          </div>
        ) : packages.length === 0 ? (
          <motion.div {...fadeUp(0.08)} className="flex flex-col items-center text-center pt-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Layers size={ICON_SIZE.xl} className="text-primary" aria-hidden="true" />
            </div>
            <p className="text-body text-foreground font-semibold mb-2">{t("trainerPackages.empty")}</p>
            <Button
              onClick={() => navigate("/trainer/package/new")}
              variant="cta"
              size="xl"
              className="mt-4"
            >
              <Plus size={ICON_SIZE.sm} className="mr-2" />
              {t("trainerPackages.create")}
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {packages.map((pkg, i) => {
              const tv = TIER_VISUAL[pkg.tier];
              const Icon = tv.icon;
              const tierLabel = t(`tier.${pkg.tier}`);
              return (
                <motion.button
                  key={pkg.id}
                  {...fadeUp(0.08 + i * 0.03)}
                  whileTap={{ scale: TAP_SCALE.secondary }}
                  onClick={() => navigate(`/trainer/package/${pkg.id}`)}
                  className={`w-full text-left rounded-2xl p-5 card-shadow ${
                    pkg.tier === "high" ? tv.cardBorder : `bg-card ${tv.cardBorder}`
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-11 h-11 rounded-xl ${tv.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon size={20} className={tv.iconColor} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-body font-semibold text-foreground truncate">{pkg.name}</p>
                        <span className="text-caption-2 px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                          {tierLabel}
                        </span>
                      </div>
                      <p className="text-caption-1 text-muted-foreground mt-0.5">
                        {t(`tier.${pkg.tier}Desc`)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground/30 shrink-0" />
                  </div>

                  {pkg.description && (
                    <p className="text-footnote text-muted-foreground mb-3">{pkg.description}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {pkg.defaultWorkoutFrequency && (
                      <span className="text-caption-2 px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {t("trainer.timesPerWeek").replace("{n}", String(pkg.defaultWorkoutFrequency))}
                      </span>
                    )}
                    {pkg.targetExperience !== "any" && (
                      <span className="text-caption-2 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                        {t(`training.level_${pkg.targetExperience}`)}
                      </span>
                    )}
                    {pkg.programTemplateId && (
                      <span className="text-caption-2 px-2 py-0.5 rounded-full bg-success/10 text-success">
                        {t("trainer.programTemplateBadge")}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerPackages;
