import { useEffect, useState } from "react";
import { MotionCard } from "@/components/ui/motion-card";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, TAP_SCALE } from "@/lib/motion";
import { Users, AlertTriangle, Activity, Moon, Crown, Sparkles, Zap, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTitle } from "@/components/PageTitle";
import { useLanguage } from "@/contexts/LanguageContext";
import { StatCard } from "@/components/ui/stat-card";
import { SectionLabel } from "@/components/ui/section-label";
import { TabControl } from "@/components/ui/tab-control";
import { useTrainerDashboard } from "@/hooks/useTrainerDashboard";
import { useTrainerClients } from "@/hooks/useTrainerClients";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getFunnelStats, type FunnelStats } from "@/services/autoPilotService";

// TODO: dodaj week-over-week aggregaciju iz workout/meal log audita u IT-27.
// Beta: prikazujemo trenutne agregirane brojeve iz user_status (real),
// per-client trend chart sakriven dok backend ne bude.

const TrainerAnalytics = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [period, setPeriod] = useState<"week" | "month" | "all">("week");
  const { counters } = useTrainerDashboard();
  const { clients } = useTrainerClients();
  const [funnel, setFunnel] = useState<FunnelStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stats = await getFunnelStats();
        if (!cancelled) setFunnel(stats);
      } catch {
        // silent
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalClients = counters?.totalClients ?? 0;
  const atRiskCount = counters?.atRiskCount ?? 0;
  const deloadCount = counters?.deloadCount ?? 0;
  const lutealCount = counters?.cyclePhaseCounts.luteal ?? 0;

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      <PageHeader onBack={() => navigate(-1)} backLabel={t("nav.trainerHome")} />

      <PageTitle title={t("analytics.title")} compact />

      <div className="px-5 space-y-4 pt-2">
        <motion.div {...fadeUp(0.05)}>
          <TabControl
            variant="animated"
            layoutId="analytics-tab-indicator"
            tabs={[
              { key: "week", label: t("analytics.thisWeek") },
              { key: "month", label: t("analytics.thisMonth") },
              { key: "all", label: t("analytics.allTime") },
            ]}
            active={period}
            onChange={setPeriod}
          />
        </motion.div>

        {/* Stats grid — agregirano iz user_status (real) */}
        <motion.div {...fadeUp(0.1)} className="grid grid-cols-2 gap-3">
          <StatCard
            layout="apple-health"
            icon={<Users size={ICON_SIZE.md} />}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            label={t("analytics.totalClients")}
            value={String(totalClients)}
          />
          <StatCard
            layout="apple-health"
            icon={<AlertTriangle size={ICON_SIZE.md} />}
            iconBg="bg-destructive/10"
            iconColor="text-destructive"
            label={t("clients.atRisk")}
            value={String(atRiskCount)}
          />
          <StatCard
            layout="apple-health"
            icon={<Activity size={ICON_SIZE.md} />}
            iconBg="bg-info/10"
            iconColor="text-info"
            label={t("trainer.deload")}
            value={String(deloadCount)}
          />
          <StatCard
            layout="apple-health"
            icon={<Moon size={ICON_SIZE.md} />}
            iconBg="bg-secondary/10"
            iconColor="text-secondary"
            label={t("analytics.lutealPhase")}
            value={String(lutealCount)}
          />
        </motion.div>

        {/* Funnel stats — tier breakdown + 30-day deltas */}
        {funnel && (
          <motion.div {...fadeUp(0.13)}>
            <SectionLabel>{t("funnel.title")}</SectionLabel>
            <MotionCard className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="w-9 h-9 rounded-xl bg-info/10 flex items-center justify-center mx-auto mb-1">
                    <Zap size={14} className="text-info" aria-hidden="true" />
                  </div>
                  <p className="text-title-3 font-bold text-foreground tabular-nums">{funnel.totals.entry}</p>
                  <p className="text-caption-2 text-muted-foreground">{t("tier.entry")}</p>
                </div>
                <div className="text-center border-x border-border">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-1">
                    <Sparkles size={14} className="text-primary" aria-hidden="true" />
                  </div>
                  <p className="text-title-3 font-bold text-foreground tabular-nums">{funnel.totals.mid}</p>
                  <p className="text-caption-2 text-muted-foreground">{t("tier.mid")}</p>
                </div>
                <div className="text-center">
                  <div className="w-9 h-9 rounded-xl bg-warning/15 flex items-center justify-center mx-auto mb-1">
                    <Crown size={14} className="text-warning" aria-hidden="true" />
                  </div>
                  <p className="text-title-3 font-bold text-foreground tabular-nums">{funnel.totals.high}</p>
                  <p className="text-caption-2 text-muted-foreground">{t("tier.high")}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-border grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 text-caption-1 text-muted-foreground">
                    <TrendingUp size={12} aria-hidden="true" />
                    {t("funnel.newClients")}
                  </div>
                  <p className="text-headline font-bold text-foreground tabular-nums mt-0.5">
                    +{funnel.newClientsRecent}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-caption-1 text-muted-foreground">
                    <Crown size={12} aria-hidden="true" />
                    {t("funnel.highRecent")}
                  </div>
                  <p className="text-headline font-bold text-foreground tabular-nums mt-0.5">
                    +{funnel.highRecent}
                  </p>
                </div>
              </div>
            </MotionCard>
          </motion.div>
        )}

        {/* Per-client lista — pravi klijenti iz Supabase */}
        {clients.length > 0 ? (
          <motion.div {...fadeUp(0.16)}>
            <SectionLabel>{t("analytics.clientPerformance")}</SectionLabel>
            <div className="space-y-2">
              {clients.map((client) => {
                const fullName = [client.firstName, client.lastName].filter(Boolean).join(" ").trim()
                  || client.email?.split("@")[0]
                  || "Client";
                return (
                  <motion.button
                    key={client.clientId}
                    whileTap={{ scale: TAP_SCALE.secondary }}
                    onClick={() => navigate(`/trainer/client/${client.clientId}`)}
                    className="w-full bg-card rounded-2xl p-4 card-shadow text-left flex items-center gap-3"
                  >
                    <UserAvatar
                      name={fullName}
                      imageUrl={client.avatarUrl ?? undefined}
                      size="sm"
                      status={client.isAtRisk ? "trial" : "active"}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-foreground truncate">{fullName}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {client.isAtRisk && (
                          <span className="text-caption-2 font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                            {t("clients.atRisk")}
                          </span>
                        )}
                        {client.isInDeload && (
                          <span className="text-caption-2 font-semibold px-2 py-0.5 rounded-full bg-info/10 text-info">
                            {t("trainer.deload")}
                          </span>
                        )}
                        {client.cyclePhase && (
                          <span className="text-caption-2 font-semibold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                            {t(`trainer.cycle.${client.cyclePhase}`)}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <MotionCard {...fadeUp(0.16)} className="p-6 text-center">
            <Users size={28} className="text-muted-foreground/40 mx-auto mb-2" aria-hidden="true" />
            <p className="text-body text-muted-foreground">{t("analytics.noClientsYet")}</p>
          </MotionCard>
        )}
      </div>
    </div>
  );
};

export default TrainerAnalytics;
