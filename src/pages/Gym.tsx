// ============================================================================
// Gym.tsx — Queue-based training screen
// Spec: 03_INTEGRATION_LAYER.md Sekcija 6.4 + 01_TRAINING_FLOW_MASTER.md Sekcija 5
// ============================================================================
//
// REWRITE (Faza 4.2): zamena starog kalendarskog SESSIONS[day_index] pristupa
// sa queue-based modelom. NEMA dana u nedelji, NEMA "missed" indikatora —
// samo redosled sesija (Pravilo 5 spec-a 01).
//
// Layout:
//   1. Header (title + mesocycle progres "X od N")
//   2. SyncEventBanner (luteal/deload/illness)
//   3. QueueStrip (full width) + Swap dugme
//   4. Next Session card sa Start CTA
//   5. Slot preview (movement patterns iz skeleton-a)
// ============================================================================

import { useState } from 'react';
import { ICON_SIZE } from "@/lib/design-tokens";
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { ChevronRight, Lock, ArrowRightLeft, PartyPopper, Flame, Zap, Timer } from 'lucide-react';
import type { Partition } from '@/types/training';
import GradientButton from '@/components/GradientButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserStatus } from '@/hooks/useUserStatus';
import { useNextSession } from '@/hooks/useNextSession';
import { useMesocycleQueue } from '@/hooks/useMesocycleQueue';
import { useSwapNextSessions } from '@/hooks/mutations/useSwapNextSessions';
import { useClientPause } from '@/hooks/useClientPause';
import { isPauseExpired } from '@/services/clientPauseService';
import { WeeklyCalendar } from '@/components/queue/WeeklyCalendar';
import { SyncEventBanner } from '@/components/queue/SyncEventBanner';
import { canSwapNextTwoSessions } from '@/utils/training/sessionResolver';
import { fadeUp } from '@/lib/motion';
import { AlertBanner } from '@/components/ui/alert-banner';
import { MotionCard } from '@/components/ui/motion-card';
import { PageTitle } from '@/components/PageTitle';

const Gym = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const { status } = useUserStatus(clientId);
  const { session: nextSession, isMesocycleComplete } = useNextSession(clientId);
  const { queue } = useMesocycleQueue(clientId);
  const swapMutation = useSwapNextSessions(clientId, { t });
  const [trialExpired] = useState(false);

  // Pause/Freeze (MVP_PRESET gap #1): tokom aktivne pauze start treninga je
  // blokiran — queue je zamrznut, sesija čeka da se pauza završi.
  const { data: pauseState } = useClientPause(clientId);
  const isPaused = !!pauseState && !isPauseExpired(pauseState);

  if (trialExpired) {
    return (
      <div className="min-h-screen bg-background-secondary flex flex-col items-center justify-center px-8 text-center pb-32">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Lock size={28} className="text-muted-foreground/50" />
        </div>
        <h2 className="text-title-2 text-foreground mb-2">{t('trial.locked')}</h2>
        <p className="text-body text-muted-foreground mb-6 max-w-xs">
          {t('trial.lockedGymMessage')}
        </p>
        <Button
          onClick={() => navigate('/chat')}
          variant="cta"
          className="px-6 min-h-11 rounded-2xl"
        >
          {t('subscription.contactTrainer')}
        </Button>
      </div>
    );
  }

  // Mezociklus progres
  const totalSessions = queue?.sessions.length ?? 0;
  const completedSessions = queue?.sessionPointer ?? 0;
  const swapAvailable = queue ? canSwapNextTwoSessions(queue).allowed : false;

  const handleSwap = () => {
    if (!clientId || swapMutation.isPending) return;
    swapMutation.mutate({ clientId });
    // Realtime push kroz useUserStatus ce osveziti UI; toast + Undo je u hook-u.
  };

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      <PageTitle
        title={t('gym.title')}
        subtitle={
          totalSessions > 0
            ? t('gym.mesocycleProgress')
                .replace('{m}', String(queue?.mesocycleIndex ?? 1))
                .replace('{x}', String(completedSessions))
                .replace('{y}', String(totalSessions))
            : undefined
        }
      />

      <div className="px-5 space-y-3">
        {/* Sync banner (luteal/deload/illness/...) */}
        <motion.div {...fadeUp(0.08)}>
          <SyncEventBanner variant="inline" />
        </motion.div>

        {/* Weekly Calendar — hibridni model (Faza 4.3) */}
        <MotionCard {...fadeUp(0.1)} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-caption-1 text-muted-foreground uppercase tracking-wider">
              {t('gym.weeklyLabel')}
            </p>
            {swapAvailable && (
              <button
                onClick={handleSwap}
                disabled={swapMutation.isPending}
                className="flex items-center gap-2 text-caption-1 text-primary font-semibold min-h-11 disabled:opacity-50"
                aria-label={t("a11y.swapNextSessions")}
              >
                <ArrowRightLeft size={16} />
                {t('gym.swapButton')}
              </button>
            )}
          </div>
          <WeeklyCalendar />
        </MotionCard>

        {/* Mesocycle complete state */}
        {isMesocycleComplete && (
          <motion.div {...fadeUp(0.12)}>
            <AlertBanner tone="success" icon={PartyPopper} title="Mezociklus završen!">
              Sledeći mezociklus se generiše automatski sa novim ciljevima.
            </AlertBanner>
          </motion.div>
        )}

        {/* Next session card — premium gradient hero */}
        {nextSession && !isMesocycleComplete && (
          <MotionCard {...fadeUp(0.15)} className="relative overflow-hidden p-5">
            {/* Gradient top accent strip */}
            <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" aria-hidden="true" />

            {/* Header row: label + partition icon */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-caption-1 text-muted-foreground uppercase tracking-wider">
                  {t('gym.nextSessionLabel')}
                </p>
                <h2 className="text-title-2 text-foreground mt-0.5">{nextSession.label}</h2>
              </div>
              <PartitionBadge partition={nextSession.partition} />
            </div>

            {/* Meta tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/8 text-primary text-caption-1 font-semibold">
                {nextSession.sessionId}
              </span>
              {status?.training.isInDeload && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-info/10 text-info text-caption-1 font-medium">
                  <Timer size={ICON_SIZE.xs} aria-hidden="true" />
                  Deload
                </span>
              )}
              {status?.training.isInReturnFromBreak && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-warning/10 text-warning-foreground text-caption-1 font-medium">
                  <Zap size={ICON_SIZE.xs} aria-hidden="true" />
                  Return from Break
                </span>
              )}
            </div>

            {/* Slot preview iz skeleton-a */}
            <SlotPreview clientId={clientId} sessionDayType={nextSession.dayType} />

            <GradientButton
              onClick={() => navigate('/workout/active')}
              className="w-full mt-4"
              size="lg"
              disabled={isPaused}
            >
              <Flame size={ICON_SIZE.md} className="inline mr-1.5" aria-hidden="true" />
              {t('gym.startWorkout')}
              <ChevronRight size={ICON_SIZE.md} className="inline ml-1" aria-hidden="true" />
            </GradientButton>

            {/* Poruka tokom aktivne pauze — zašto je start blokiran */}
            {isPaused && (
              <p className="text-footnote text-muted-foreground text-center mt-2" role="status">
                {pauseState?.pause_until
                  ? t('gym.pausedUntil').replace('{date}', pauseState.pause_until)
                  : t('gym.pausedIndefinite')}
              </p>
            )}
          </MotionCard>
        )}

        {/* Empty state */}
        {!nextSession && !isMesocycleComplete && (
          <EmptyState
            title={t("gym.emptyQueueTitle")}
            description={t("gym.emptyQueueDesc")}
            cta={{ label: t("gym.emptyQueueCta"), onClick: () => navigate("/home") }}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SlotPreview — pregled exercise slotova za sledeću sesiju
// ============================================================================
//
// Cita iz status.training.queue (skeleton je u session_templates JSONB-u, ali
// queue ne nosi exercise slots — samo session metadata). Za sad: prikaz
// movement patterns iz skeleton-a kroz sessionTemplates lookup ide u Fazu 4.3
// kad refaktorisemo ActiveWorkout. Sada placeholder.

interface SlotPreviewProps {
  clientId: string | null;
  sessionDayType: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SlotPreview = ({ clientId: _clientId, sessionDayType: _sessionDayType }: SlotPreviewProps) => {
  const { t } = useLanguage();
  return (
    <p className="text-footnote text-muted-foreground/70 italic">
      {t('gym.exercisesShownAfterStart')}
    </p>
  );
};

// ============================================================================
// PartitionBadge — vizuelna ikona za particiju (Lower/Upper/FullBody)
// ============================================================================

const PARTITION_ICON_CONFIG: Record<Partition, { bg: string; text: string; label: string }> = {
  Lower: { bg: 'bg-success/15', text: 'text-success', label: 'L' },
  Upper: { bg: 'bg-info/15', text: 'text-info', label: 'U' },
  FullBody: { bg: 'bg-primary/15', text: 'text-primary', label: 'FB' },
};

const PartitionBadge = ({ partition }: { partition: Partition }) => {
  const config = PARTITION_ICON_CONFIG[partition];
  return (
    <div
      className={`shrink-0 w-10 h-10 rounded-xl ${config.bg} ${config.text} flex items-center justify-center text-footnote font-bold`}
      aria-label={`${partition} particija`}
    >
      {config.label}
    </div>
  );
};

export default Gym;
