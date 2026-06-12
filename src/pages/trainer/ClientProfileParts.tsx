// Izdvojeni delovi ClientProfile stranice — hero kartica + training/checkins/settings tabovi.
// Verbatim JSX premešten iz ClientProfile.tsx (dekompozicija <600 linija), bez izmena logike.
import { motion } from "framer-motion";
import { fadeUp, MOTION_DURATION, MOTION_EASE } from "@/lib/motion";
import { ICON_SIZE } from "@/lib/design-tokens";
import { Flame, Dumbbell, Camera, Activity, Target, Ruler, Cake, Scale as ScaleIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ClientData } from "@/data/trainerMockData";
import type { ProgramRecord } from "@/services/programService";
import { UserAvatar } from "@/components/ui/user-avatar";
import TierBadge from "@/components/profile/TierBadge";
import type { PackageTier } from "@/services/packageService";
import { MotionCard } from "@/components/ui/motion-card";
import { SyncRulesOverrideSection } from "@/components/trainer/SyncRulesOverrideSection";
import EquipmentEditor from "@/components/trainer/EquipmentEditor";
import PauseClientCard from "@/components/trainer/PauseClientCard";

export const TABS = ['overview', 'training', 'nutrition', 'checkins', 'settings'] as const;
export type Tab = typeof TABS[number];

// Premium Client Header — gradient hero (content area, ne shell)
export const ClientProfileHero = ({
  client,
  clientTier,
  onOpenTierSheet,
}: {
  client: ClientData;
  clientTier: PackageTier | null;
  onOpenTierSheet: () => void;
}) => {
  const { t } = useLanguage();
  const age = new Date().getFullYear() - new Date(client.dateOfBirth).getFullYear();

  const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    trial: { label: t("clients.trial"), color: 'bg-primary/10 text-primary', dot: 'bg-primary' },
    active: { label: t("clients.active"), color: 'bg-success/10 text-success', dot: 'bg-success' },
    paused: { label: t("clients.paused"), color: 'bg-warning/10 text-warning', dot: 'bg-warning' },
    finished: { label: t("clients.finished"), color: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
  };

  const sc = statusConfig[client.status];
  const typeLabel = client.type === 'online' ? t("clients.online") : client.type === 'in_person' ? t("clients.inPerson") : t("clients.hybrid");

  return (
    <motion.div {...fadeUp()} className="px-5 pt-4 pb-5">
      <div
        className="relative overflow-hidden rounded-2xl p-5 text-primary-foreground shadow-fab"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)" }}
      >
        <div className="relative">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={client.name}
              size="lg"
              showRing="subtle"
              backgroundClass="bg-white/20 backdrop-blur-sm"
              status={
                client.status === 'active'
                  ? 'active'
                  : client.status === 'trial'
                  ? 'trial'
                  : 'offline'
              }
              layoutId={`client-avatar-${client.id}`}
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-title-2 font-bold">{client.name}</h1>
              <p className="text-caption-1 opacity-85 truncate">{client.email}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-caption-2 font-bold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                  {sc.label}
                </span>
                <span className="text-caption-1 opacity-85">{typeLabel}</span>
                <button
                  onClick={onOpenTierSheet}
                  aria-label={t("tier.promote")}
                  className="ml-auto"
                >
                  {clientTier ? (
                    <TierBadge tier={clientTier} />
                  ) : (
                    <span className="text-caption-2 font-bold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                      + tier
                    </span>
                  )}
                </button>
              </div>
            </div>
            {client.streak > 0 && (
              <div className="text-center shrink-0 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2">
                <div className="flex items-center gap-1 justify-center">
                  <Flame size={ICON_SIZE.xs} aria-hidden="true" />
                  <span className="text-body font-bold tabular-nums">{client.streak}</span>
                </div>
                <p className="text-caption-2 opacity-80 uppercase tracking-wider mt-0.5">streak</p>
              </div>
            )}
          </div>

          {/* Program progress */}
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-caption-1 opacity-85">
                {t("clients.weekOf")} {client.programWeek} {t("clients.of")} {client.programTotalWeeks}
              </span>
              <span className="text-caption-1 font-semibold tabular-nums">
                {Math.round((client.programWeek / client.programTotalWeeks) * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.round((client.programWeek / client.programTotalWeeks) * 100)}%` }}
                transition={{ duration: MOTION_DURATION.xSlow, delay: 0.2, ease: MOTION_EASE.outQuart }}
                className="h-full rounded-full bg-white"
              />
            </div>
          </div>

          {/* Stat cells */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { icon: Target, label: t("clients.statGoal"), value: client.goals[0] || '—' },
              { icon: Ruler, label: t("clients.statHeight"), value: `${client.height}cm` },
              { icon: ScaleIcon, label: t("clients.statWeight"), value: `${client.weight}kg` },
              { icon: Cake, label: t("clients.statAge"), value: String(age) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl py-2 px-1 text-center">
                <Icon size={ICON_SIZE.xs} className="mx-auto mb-1 opacity-80" aria-hidden="true" />
                <p className="text-caption-2 opacity-80 uppercase tracking-wider">{label}</p>
                <p className="text-caption-1 font-semibold mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Training tab — program progres + nedeljni raspored + istorija treninga
export const ClientProfileTrainingTab = ({
  client,
  assignedProgram,
}: {
  client: ClientData;
  assignedProgram: ProgramRecord | null | undefined;
}) => {
  const { t } = useLanguage();
  return (
    <div role="tabpanel" id="client-panel-training" aria-labelledby="client-tab-training" className="space-y-3">
      <MotionCard {...fadeUp(0.05)} className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <Dumbbell size={ICON_SIZE.md} className="text-warning" />
          </div>
          <div className="flex-1">
            <h3 className="text-body font-semibold text-foreground">
              {assignedProgram?.name ?? t("clients.noProgramAssigned")}
            </h3>
            <p className="text-caption-1 text-muted-foreground">{t("clients.weekOf")} {client.programWeek} {t("clients.of")} {client.programTotalWeeks}</p>
          </div>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.round((client.programWeek / client.programTotalWeeks) * 100)}%` }}
            transition={{ duration: MOTION_DURATION.xSlow }}
            className="h-full rounded-full gradient-primary"
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-caption-2 text-muted-foreground tabular-nums">{Math.round((client.programWeek / client.programTotalWeeks) * 100)}% {t("clients.complete")}</p>
          <button className="text-primary text-caption-1 font-semibold">{t("clients.changeProgram")}</button>
        </div>
      </MotionCard>

      <MotionCard {...fadeUp(0.1)} className="p-4">
        <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("clients.thisWeek")}</h3>
        <p className="text-caption-1 text-muted-foreground py-3">
          {t("clients.weekScheduleEmpty")}
        </p>
      </MotionCard>

      <MotionCard {...fadeUp(0.15)} className="p-4">
        <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("clients.workoutHistory")}</h3>
        <p className="text-caption-1 text-muted-foreground py-3">
          {t("clients.workoutHistoryEmpty")}
        </p>
      </MotionCard>
    </div>
  );
};

// Check-ins tab — istorija, progress fotke, metrika
export const ClientProfileCheckinsTab = ({ client }: { client: ClientData }) => {
  const { t } = useLanguage();
  return (
    <div role="tabpanel" id="client-panel-checkins" aria-labelledby="client-tab-checkins" className="space-y-3">
      {/* History — empty state until weekly_check_ins integration */}
      <MotionCard {...fadeUp(0.05)} className="p-4">
        <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("clients.history")}</h3>
        <p className="text-caption-1 text-muted-foreground py-3">
          {t("clients.checkInsEmpty")}
        </p>
      </MotionCard>

      {/* Progress photos */}
      <MotionCard {...fadeUp(0.15)} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider">{t("clients.progressPhotos")}</h3>
          <button className="text-primary text-caption-1 font-semibold">{t("clients.viewAll")}</button>
        </div>
        <p className="text-caption-1 text-muted-foreground py-3">
          {t("clients.photosEmpty")}
        </p>
        <button className="text-primary text-caption-1 font-semibold mt-3 flex items-center gap-1 min-h-11 px-1">
          <Camera size={16} /> {t("clients.uploadPhoto")}
        </button>
      </MotionCard>

      {/* Metrics */}
      <MotionCard {...fadeUp(0.2)} className="p-4">
        <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("clients.metrics")}</h3>
        {[
          client.weight > 0 ? { label: t("clientDetail.weight"), value: `${client.weight} kg`, color: 'text-foreground' } : null,
        ].filter(Boolean).map((m, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
            <div>
              <p className="text-footnote font-medium text-foreground">{m!.label}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-caption-1 font-bold ${m!.color}`}>{m!.value}</span>
              </div>
            </div>
            <button className="text-primary text-caption-1 font-semibold min-h-11 px-2">{t("clients.viewGraph")}</button>
          </div>
        ))}
        <button className="text-primary text-caption-1 font-semibold mt-3 flex items-center gap-1 min-h-11 px-1">
          <Activity size={16} /> {t("clients.logMetric")}
        </button>
      </MotionCard>
    </div>
  );
};

// Settings tab — profil info, program settings, sync override, oprema, pauza, danger zone
export const ClientProfileSettingsTab = ({
  id,
  client,
}: {
  id: string | undefined;
  client: ClientData;
}) => {
  const { t } = useLanguage();
  return (
    <div role="tabpanel" id="client-panel-settings" aria-labelledby="client-tab-settings" className="space-y-3">
      {/* Profile info */}
      <MotionCard {...fadeUp(0.05)} className="p-4">
        <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("clients.profileInfo")}</h3>
        {[
          { label: t("addClient.name"), value: client.name },
          { label: t("addClient.email"), value: client.email },
          { label: t("clientDetail.goals"), value: client.goals.join(', ') },
          { label: t("clientDetail.injuries"), value: client.injuries },
          { label: t("clientDetail.allergies"), value: client.allergies.join(', ') || 'None' },
          { label: t("clientDetail.foodDislikes"), value: client.foodDislikes.join(', ') || 'None' },
          { label: t("clientDetail.jobType"), value: client.jobType },
          { label: t("clientDetail.workSchedule"), value: client.workSchedule },
        ].map((f, i) => (
          <div key={i} className="py-2.5 border-b border-border/50 last:border-0">
            <p className="text-caption-2 text-muted-foreground/60">{f.label}</p>
            <p className="text-footnote font-medium text-foreground mt-0.5">{f.value}</p>
          </div>
        ))}
      </MotionCard>

      {/* Program settings */}
      <MotionCard {...fadeUp(0.1)} className="p-4">
        <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("clients.programSettings")}</h3>
        <div className="space-y-4">
          <div>
            <p className="text-caption-2 text-muted-foreground/60 mb-1.5">{t("clients.fieldType")}</p>
            <div className="flex gap-2">
              {(['online', 'in_person', 'hybrid'] as const).map(tp => (
                <span key={tp} className={`px-3.5 py-2 rounded-xl text-caption-1 font-semibold transition ${
                  client.type === tp ? 'gradient-primary text-primary-foreground shadow-fab' : 'bg-muted/50 text-muted-foreground border border-border'
                }`}>
                  {tp === 'online' ? t("clients.online") : tp === 'in_person' ? t("clients.inPerson") : t("clients.hybrid")}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-caption-2 text-muted-foreground/60 mb-1.5">{t("clients.fieldStatus")}</p>
            <div className="flex gap-2">
              {(['active', 'paused', 'finished'] as const).map(st => (
                <span key={st} className={`px-3.5 py-2 rounded-xl text-caption-1 font-semibold transition ${
                  client.status === st ? 'gradient-primary text-primary-foreground shadow-fab' : 'bg-muted/50 text-muted-foreground border border-border'
                }`}>
                  {st === 'active' ? t("clients.active") : st === 'paused' ? t("clients.paused") : t("clients.finished")}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-caption-2 text-muted-foreground/60">{t("clients.fieldDuration")}</p>
            <p className="text-footnote font-medium text-foreground mt-0.5">
              {t("clients.weeks").replace("{n}", String(client.programTotalWeeks))}
            </p>
          </div>
        </div>
      </MotionCard>

      {/* Sync Rules Override — IT-18 */}
      {id && (
        <motion.div {...fadeUp(0.12)}>
          <SyncRulesOverrideSection clientId={id} />
        </motion.div>
      )}

      {/* Equipment — V3 §10 */}
      {id && (
        <MotionCard {...fadeUp(0.13)} className="p-4">
          <EquipmentEditor clientId={id} />
        </MotionCard>
      )}

      {/* Pause client — V3 §10 (Saved client = saved revenue) */}
      {id && (
        <MotionCard {...fadeUp(0.16)} className="p-4">
          <PauseClientCard clientId={id} />
        </MotionCard>
      )}

      {/* Danger zone */}
      <motion.div {...fadeUp(0.2)} className="mt-6 space-y-3">
        <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider">{t("clients.dangerZone")}</h3>
        <button className="w-full bg-card rounded-2xl p-4 card-shadow text-left border border-warning/20">
          <p className="text-body text-warning font-semibold">{t("clients.archive")}</p>
        </button>
        <button className="w-full bg-card rounded-2xl p-4 card-shadow text-left border border-destructive/20">
          <p className="text-body text-destructive font-semibold">{t("clients.deleteClient")}</p>
          <p className="text-caption-1 text-muted-foreground mt-0.5">{t("clients.deleteConfirm")}</p>
        </button>
      </motion.div>
    </div>
  );
};
