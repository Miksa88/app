import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Dumbbell, TrendingUp, Gift, CreditCard,
  ChevronRight, Package, Activity, AlertTriangle, Sparkles, ArrowUpRight,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTrainerDashboard } from "@/hooks/useTrainerDashboard";
import { useTrainerClients } from "@/hooks/useTrainerClients";
import { usePackages } from "@/hooks/usePackages";
import AutoPilotFeed from "@/components/trainer/AutoPilotFeed";
import { fadeUp, MOTION_DURATION, MOTION_EASE, TAP_SCALE } from "@/lib/motion";
import { ICON_SIZE } from "@/lib/design-tokens";
import { StatCard } from "@/components/ui/stat-card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { SectionLabel } from "@/components/ui/section-label";
import { ActionCard } from "@/components/ui/action-card";
import { useHaptic } from "@/hooks/useHaptic";
import trainerAvatar from "@/assets/trainer-avatar.jpg";

const TrainerDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { counters, atRiskClients } = useTrainerDashboard();
  const { clients } = useTrainerClients();
  const { data: packages = [] } = usePackages();
  const haptic = useHaptic();

  const trainerFirstName = String(
    user?.user_metadata?.first_name
      ?? user?.email?.split("@")[0].split("+")[0]
      ?? "",
  );

  // TODO: učitati iz trener-config tabele kad backend bude (IT-28).
  // Beta: default vrednosti, dropdown editable na /trainer/free-trial.
  const [trialSettings] = useState({
    duration: 7,
    includesWorkouts: true,
    includesNutrition: true,
  });

  const activeCount = counters?.totalClients ?? 0;
  const redFlagCount = counters?.atRiskCount ?? 0;
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const visibleClients = focusMode
    ? clients.filter(c => c.isAtRisk || c.isInDeload)
    : clients;
  const recentClients = visibleClients.slice(0, 6);
  const atRiskNames = atRiskClients
    .slice(0, 3)
    .map(c => c.firstName ?? c.lastName ?? "—")
    .join(" · ");

  const trialIncludesSummary = [
    trialSettings.includesWorkouts ? t("nav.gym") : "",
    trialSettings.includesNutrition ? t("nav.food") : "",
  ].filter(Boolean).join(" + ");

  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  const hour = today.getHours();
  const greeting = hour < 12 ? "Dobro jutro" : hour < 18 ? "Dobar dan" : "Dobro veče";

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      {/* ============ Header sa velikim naslov-om ============ */}
      <div className="px-5 pt-14 pb-4">
        <motion.div {...fadeUp()} className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-caption-1 text-muted-foreground uppercase tracking-wider font-medium">
              {dayName}
            </p>
            <h1 className="text-large-title text-foreground mt-1">
              {greeting}{trainerFirstName ? <>, <span className="gradient-text">{trainerFirstName}</span></> : null}
            </h1>
          </div>
          <motion.button
            {...fadeUp(0.08)}
            whileTap={{ scale: 0.92 }}
            onClick={() => { haptic("selection"); navigate("/trainer/profile"); }}
            className="shrink-0 min-h-11 min-w-11 flex items-center justify-center rounded-full"
            aria-label={t("a11y.yourProfile")}
          >
            <UserAvatar imageUrl={trainerAvatar} alt={trainerFirstName || t("a11y.yourProfile")} size="sm" />
          </motion.button>
        </motion.div>
      </div>

      <div className="px-5 space-y-4">
        {/* ============ Hero Card — gradient premium (Apple Fitness style) ============ */}
        <motion.div
          {...fadeUp(0.12)}
          className="relative overflow-hidden rounded-3xl p-6 text-primary-foreground shadow-fab"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)",
          }}
        >
          {/* Decorative background shapes */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="absolute -bottom-12 -left-6 w-36 h-36 rounded-full bg-white/5 blur-2xl" aria-hidden="true" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={ICON_SIZE.xs} className="opacity-80" aria-hidden="true" />
              <span className="text-caption-1 font-medium opacity-90 uppercase tracking-wider">
                Tvoj dan
              </span>
            </div>
            <div className="flex items-end gap-2 mb-1">
              <p className="text-display-xl tabular-nums">{activeCount}</p>
              <p className="text-body opacity-90 mb-2">klijentkinja aktivno</p>
            </div>
            <div className="flex items-center gap-4 mt-5">
              <button
                onClick={() => navigate("/trainer/clients")}
                className="flex-1 inline-flex items-center justify-between bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 hover:bg-white/20 transition-colors duration-base"
              >
                <div className="flex items-center gap-2">
                  <Users size={16} aria-hidden="true" />
                  <span className="text-footnote font-semibold">Vidi sve</span>
                </div>
                <ArrowUpRight size={16} className="opacity-80" aria-hidden="true" />
              </button>
              {redFlagCount > 0 && (
                <button
                  onClick={() => navigate("/trainer/clients?filter=at-risk")}
                  className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-3"
                >
                  <AlertTriangle size={16} aria-hidden="true" />
                  <span className="text-footnote font-bold tabular-nums">{redFlagCount}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ============ Today's KPIs — agregirani brojevi iz user_status ============ */}
        <motion.div {...fadeUp(0.18)}>
          <SectionLabel>Danas</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              layout="apple-health"
              icon={<Users size={ICON_SIZE.md} />}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              label="Klijentkinje"
              value={String(activeCount)}
            />
            <StatCard
              layout="apple-health"
              icon={<AlertTriangle size={ICON_SIZE.md} />}
              iconBg="bg-destructive/10"
              iconColor="text-destructive"
              label="Na oprezu"
              value={String(redFlagCount)}
            />
            <StatCard
              layout="apple-health"
              icon={<Activity size={ICON_SIZE.md} />}
              iconBg="bg-info/10"
              iconColor="text-info"
              label="Deload"
              value={String(counters?.deloadCount ?? 0)}
            />
            <StatCard
              layout="apple-health"
              icon={<Dumbbell size={ICON_SIZE.md} />}
              iconBg="bg-warning/10"
              iconColor="text-warning"
              label="Lutealna faza"
              value={String(counters?.cyclePhaseCounts.luteal ?? 0)}
            />
          </div>
        </motion.div>

        {/* ============ Red Flags — prikazuje stvarna imena iz atRiskClients ============ */}
        {redFlagCount > 0 && (
          <motion.div {...fadeUp(0.22)}>
            <button
              onClick={() => navigate("/trainer/clients?filter=at-risk")}
              className="w-full bg-card rounded-2xl card-shadow p-4 flex items-center gap-3 text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 ring-1 ring-destructive/20">
                <AlertTriangle size={20} className="text-destructive" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-semibold text-foreground">
                  {redFlagCount} klijentkinja na oprezu
                </p>
                {atRiskNames && (
                  <p className="text-footnote text-muted-foreground mt-0.5 truncate">
                    {atRiskNames} — potrebna je intervencija
                  </p>
                )}
              </div>
              <ChevronRight size={ICON_SIZE.md} className="text-muted-foreground/50 shrink-0" aria-hidden="true" />
            </button>
          </motion.div>
        )}

        {/* ============ Auto-pilot feed — plateau alerts + missing videos ============ */}
        <AutoPilotFeed delay={0.21} />

        {/* ============ Focus mode toggle — pokaži samo at-risk/deload klijentkinje ============ */}
        {clients.length > 0 && (
          <motion.div {...fadeUp(0.25)}>
            <button
              onClick={() => setFocusMode(v => !v)}
              role="switch"
              aria-checked={focusMode}
              className="w-full bg-card rounded-2xl card-shadow p-4 flex items-center gap-3 text-left min-h-14"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                focusMode ? "bg-primary/15" : "bg-muted"
              }`}>
                <Sparkles size={18} className={focusMode ? "text-primary" : "text-muted-foreground"} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-semibold text-foreground">
                  {focusMode ? t("trainer.focusOn") : t("trainer.focusOff")}
                </p>
                <p className="text-caption-1 text-muted-foreground mt-0.5">
                  {focusMode ? t("trainer.focusOnDesc") : t("trainer.focusOffDesc")}
                </p>
              </div>
              <div className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-base shrink-0 ${focusMode ? "bg-primary" : "bg-muted"}`} aria-hidden="true">
                <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${focusMode ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </button>
          </motion.div>
        )}

        {/* ============ Recent Clients — horizontalni carousel ============ */}
        {recentClients.length > 0 && (
          <motion.div {...fadeUp(0.28)}>
            <SectionLabel
              action={
                <button
                  onClick={() => navigate("/trainer/clients")}
                  className="text-caption-1 text-primary font-semibold"
                >
                  Sve →
                </button>
              }
            >
              {focusMode ? t("trainer.priorityClients") : t("trainer.allClients")}
            </SectionLabel>
            <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
              {recentClients.map((client, i) => {
                const fullName = [client.firstName, client.lastName].filter(Boolean).join(" ").trim()
                  || client.email?.split("@")[0]
                  || "Client";
                return (
                  <motion.button
                    key={client.clientId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: MOTION_DURATION.base, delay: 0.3 + i * 0.04, ease: MOTION_EASE.outQuart }}
                    whileTap={{ scale: TAP_SCALE.secondary }}
                    onClick={() => navigate(`/trainer/client/${client.clientId}`)}
                    className="shrink-0 w-[88px] bg-card rounded-2xl card-shadow p-3 flex flex-col items-center gap-2"
                  >
                    <UserAvatar
                      name={fullName}
                      imageUrl={client.avatarUrl ?? undefined}
                      size="md"
                      status={client.isAtRisk ? "trial" : "active"}
                    />
                    <div className="text-center min-w-0 w-full">
                      <p className="text-caption-1 font-semibold text-foreground truncate">
                        {fullName.split(" ")[0]}
                      </p>
                      {client.cyclePhase && (
                        <p className="text-caption-2 text-muted-foreground mt-0.5 truncate">
                          {client.cyclePhase}
                        </p>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ============ Manage sekcija — glavne navigacione kartice ============ */}
        <motion.div {...fadeUp(0.34)}>
          <SectionLabel>Upravljanje</SectionLabel>
          <div className="space-y-2">
            {[
              { icon: Package, iconBg: "bg-info/10", iconColor: "text-info", title: t("packages.title"), desc: `${packages.filter(p => p.tier !== 'high').length} ${t("packages.title").toLowerCase()} · ${counters?.totalClients ?? 0} ${t("packages.subscribers")}`, path: "/trainer/packages" },
              { icon: Gift, iconBg: "bg-primary/10", iconColor: "text-primary", title: t("trial.quickTitle"), desc: `${trialSettings.duration} ${t("trial.daysLabel")} · ${trialIncludesSummary}`, path: "/trainer/free-trial", badge: t("trial.active") },
              { icon: TrendingUp, iconBg: "bg-secondary/10", iconColor: "text-secondary", title: t("nav.analytics"), desc: t("trainer.viewProgress"), path: "/trainer/analytics" },
              { icon: CreditCard, iconBg: "bg-accent/30", iconColor: "text-primary", title: t("nav.payments"), desc: t("payments.subtitle"), path: "/trainer/payments" },
            ].map(({ icon: Icon, iconBg, iconColor, title, desc, path, badge }, i) => (
              <motion.div
                key={path}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: MOTION_DURATION.base, delay: 0.36 + i * 0.04, ease: MOTION_EASE.outQuart }}
              >
                <ActionCard
                  icon={Icon}
                  iconBg={iconBg}
                  iconColor={iconColor}
                  title={title}
                  description={desc}
                  badge={badge}
                  onClick={() => navigate(path)}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TrainerDashboard;
