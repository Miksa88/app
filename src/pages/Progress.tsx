// ============================================================================
// Progress.tsx — dva tab-a (Završeni treninzi + Adaptacija)
// Spec: 03_INTEGRATION_LAYER.md Sekcija 6.4
//       + 01_TRAINING_FLOW_MASTER.md Pravilo 5 ("bez krivice" UI)
// ============================================================================
//
// REWRITE (Faza 4.2):
//   - UKLONJEN hardkodovani CALENDAR_DAYS sa "missed" status-ima
//   - UKLONJEN weekly grid (day.mon..sun) jer biologija ne zna ponedeljak
//   - Dva tab-a:
//       Tab 1 "Završeni treninzi" — linearna lista QueuedSession.completed
//       Tab 2 "Adaptacija" — timeline sync events (deload, luteal, ...)
//   - Stats row OSTAJE (motivacijski elementi)
//   - Levels + photos + journey OSTAJE
// ============================================================================

import { useNavigate } from 'react-router-dom';
import { ICON_SIZE } from "@/lib/design-tokens";
import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/motion';
import { EmptyState } from '@/components/ui/empty-state';
import { TabControl } from '@/components/ui/tab-control';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { MotionCard } from '@/components/ui/motion-card';
import { useState, useMemo } from 'react';
import {
  Dumbbell, Trophy, Lock, Plus, Calendar,
  Activity, Sparkles, RotateCcw, Moon, Droplets, Thermometer, RefreshCcw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import CircularProgress from '@/components/CircularProgress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserStatus } from '@/hooks/useUserStatus';
import { useMesocycleQueue } from '@/hooks/useMesocycleQueue';
import { useProfileLevel } from '@/hooks/useProfileLevel';
import type { QueuedSession, Partition } from '@/types/training';

const TOTAL_LEVELS = 8;

type ActiveTab = 'completed' | 'adaptation';

const Progress = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const { status } = useUserStatus(clientId);
  const { queue } = useMesocycleQueue(clientId);
  const { data: profileLevel = 1 } = useProfileLevel(clientId);
  const [activeTab, setActiveTab] = useState<ActiveTab>('completed');

  const currentLevelNumber = Math.max(1, Math.min(TOTAL_LEVELS, profileLevel));
  const LEVELS = useMemo(
    () => Array.from({ length: TOTAL_LEVELS }, (_, i) => {
      const lvl = i + 1;
      return {
        level: lvl,
        name: `Level ${lvl}`,
        unlocked: lvl <= currentLevelNumber,
        current: lvl === currentLevelNumber,
      };
    }),
    [currentLevelNumber],
  );

  // levelProgress = mezociklus napredak unutar trenutnog levela
  // (sessionPointer / sessions.length × 100 dok je u istom mezo)
  const levelProgress = queue && queue.sessions.length > 0
    ? Math.round((queue.sessionPointer / queue.sessions.length) * 100)
    : 0;

  // Completed sessions iz queue-a, sortirane DESC po completedAt
  const completedSessions = useMemo<QueuedSession[]>(() => {
    if (!queue) return [];
    return queue.sessions
      .filter(s => s.status === 'completed' && s.completedAt)
      .sort((a, b) => {
        const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [queue]);

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      <div className="px-5 pt-14 pb-2">
        <h1 className="text-large-title text-foreground">{t('progress.title')}</h1>
      </div>

      <div className="px-5 space-y-3 mt-3">
        {/* Compact level card */}
        <MotionCard {...fadeUp()} className="p-4 flex items-center gap-4">
          <CircularProgress value={levelProgress} max={100} size={56} strokeWidth={5} color="url(#gradient-pink)">
            <Trophy size={20} className="text-warning" aria-hidden="true" />
          </CircularProgress>
          <div className="flex-1">
            <h2 className="text-headline text-foreground">{t('home.level')} {currentLevelNumber}</h2>
            <p className="text-caption-1 text-muted-foreground">
              {levelProgress}% {t('progress.toLevel')} {currentLevelNumber + 1}
            </p>
            <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
              <div className="h-full gradient-primary rounded-full" style={{ width: `${levelProgress}%` }} />
            </div>
          </div>
        </MotionCard>

        {/* Stats row — samo brojevi koje stvarno znamo iz queue-a */}
        <motion.div {...fadeUp(0.1)} className="grid grid-cols-2 gap-2">
          <StatCard
            layout="centered"
            variant="compact"
            icon={<Dumbbell size={16} aria-hidden="true" />}
            iconColor="text-primary"
            value={String(completedSessions.length)}
            label={t('progress.workouts')}
          />
          <StatCard
            layout="centered"
            variant="compact"
            icon={<Activity size={16} aria-hidden="true" />}
            iconColor="text-primary"
            value={String(queue?.sessions.length ?? 0)}
            label={t('progress.totalPlanned') ?? 'Total planned'}
          />
        </motion.div>

        {/* Tabs */}
        <motion.div {...fadeUp(0.15)}>
          <TabControl
            variant="static"
            ariaLabel={t("progress.title")}
            tabs={[
              { key: 'completed', label: t("progress.tabCompleted"), icon: Activity },
              { key: 'adaptation', label: t("progress.tabAdaptation"), icon: Sparkles },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />
        </motion.div>

        {/* Tab 1: Završeni treninzi */}
        {activeTab === 'completed' && (
          <motion.div
            {...fadeUp(0.2)}
            role="tabpanel"
            id="panel-completed"
            aria-labelledby="tab-completed"
            className="space-y-2"
          >
            {completedSessions.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title={t("progress.emptyCompletedTitle")}
                description={t("progress.emptyCompletedDesc")}
                cta={{ label: t("progress.emptyCompletedCta"), onClick: () => navigate("/gym") }}
              />
            ) : (
              completedSessions.map(session => (
                <CompletedSessionRow key={session.sessionId} session={session} />
              ))
            )}
          </motion.div>
        )}

        {/* Tab 2: Adaptacija — timeline sync events */}
        {activeTab === 'adaptation' && (
          <motion.div
            {...fadeUp(0.2)}
            role="tabpanel"
            id="panel-adaptation"
            aria-labelledby="tab-adaptation"
            className="space-y-2"
          >
            <AdaptationTimeline status={status} />
          </motion.div>
        )}

        {/* Progress Photos — empty state dok ne postoji upload feature */}
        <MotionCard {...fadeUp(0.25)} className="p-4">
          <h3 className="text-body font-semibold text-foreground mb-3">{t('progress.photos')}</h3>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
            <button className="w-20 h-20 rounded-2xl bg-muted flex flex-col items-center justify-center shrink-0 min-w-[80px]">
              <Plus size={20} className="text-primary mb-1" />
              <span className="text-caption-2 text-muted-foreground">{t('progress.addPhoto')}</span>
            </button>
            <p className="text-caption-1 text-muted-foreground self-center">
              {t('progress.photosEmpty') ?? 'Još nema fotografija'}
            </p>
          </div>
        </MotionCard>

        {/* Checkpoint journey */}
        <MotionCard {...fadeUp(0.28)} className="p-4">
          <h3 className="text-body font-semibold text-foreground mb-2">{t('progress.yourJourney')}</h3>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full gradient-primary rounded-full transition-all duration-xslow"
                style={{ width: `${((2 + levelProgress / 100) / 10) * 100}%` }}
              />
            </div>
            <span className="text-caption-1 text-muted-foreground whitespace-nowrap">{levelProgress}%</span>
          </div>
          <div className="flex items-center justify-between overflow-x-auto hide-scrollbar gap-2">
            {LEVELS.map(l => (
              <div key={l.level} className="flex flex-col items-center min-w-[60px]">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-subhead font-semibold mb-1
                  ${l.current ? 'gradient-primary text-primary-foreground' : ''}
                  ${l.unlocked && !l.current ? 'bg-primary/10 text-primary' : ''}
                  ${!l.unlocked ? 'bg-muted text-muted-foreground' : ''}
                `}>
                  {l.unlocked ? l.level : <Lock size={ICON_SIZE.xs} />}
                </div>
                <span className={`text-caption-2 ${l.current ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  {t('home.level')} {l.level}
                </span>
              </div>
            ))}
          </div>
        </MotionCard>
      </div>
    </div>
  );
};

// ============================================================================
// CompletedSessionRow — pojedini završen trening
// ============================================================================

const PARTITION_BADGE: Record<Partition, { bg: string; label: string }> = {
  Lower: { bg: 'bg-success/15 text-success', label: 'Lower' },
  Upper: { bg: 'bg-info/15 text-info', label: 'Upper' },
  FullBody: { bg: 'bg-primary/15 text-primary', label: 'Full Body' },
};

const CompletedSessionRow = ({ session }: { session: QueuedSession }) => {
  const partition = PARTITION_BADGE[session.partition];
  const dateStr = session.completedAt
    ? new Date(session.completedAt).toLocaleDateString('sr-RS', {
        day: 'numeric', month: 'short',
      })
    : '';

  return (
    <Card className="p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center shrink-0">
        <Dumbbell size={16} className="text-success" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-subhead font-semibold text-foreground truncate">{session.label}</p>
        <p className="text-caption-1 text-muted-foreground mt-0.5">{session.sessionId}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`text-caption-2 font-medium px-2 py-0.5 rounded-full ${partition.bg}`}>
          {partition.label}
        </span>
        <span className="text-caption-2 text-muted-foreground">{dateStr}</span>
      </div>
    </Card>
  );
};

// ============================================================================
// AdaptationTimeline — sync events log
// ============================================================================
//
// Za Fazu 4.2 placeholder: prikazuje trenutne aktivne adaptacije iz UserStatus.
// Pun timeline (sync events log po datumu) zahteva audit tabelu — Faza 5.

interface AdaptationTimelineProps {
  status: ReturnType<typeof useUserStatus>['status'];
}

const AdaptationTimeline = ({ status }: AdaptationTimelineProps) => {
  const { t } = useLanguage();
  if (!status) {
    return (
      <Card className="p-6 text-center">
        <Sparkles size={28} className="text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-body text-foreground">Nema podataka o adaptaciji</p>
      </Card>
    );
  }

  const events: Array<{ icon: LucideIcon; iconColor: string; title: string; description: string }> = [];

  if (status.training.isInDeload) {
    events.push({
      icon: RefreshCcw,
      iconColor: 'text-info',
      title: 'Deload nedelja aktivna',
      description: 'Telu je potreban oporavak. Kalorije na maintenance, volume na -50%.',
    });
  }
  if (status.training.isInReturnFromBreak) {
    events.push({
      icon: RotateCcw,
      iconColor: 'text-info',
      title: 'Return from Break',
      description: 'Polako se vraćamo u ritam — laganije sledećih nekoliko sesija.',
    });
  }
  if (status.bio.cyclePhase === 'luteal') {
    events.push({
      icon: Moon,
      iconColor: 'text-secondary',
      title: 'Lutealna faza',
      description: 'Algoritam je dodao +150 kcal carbs i smanjio intenzitet treninga 5%.',
    });
  }
  if (status.bio.cyclePhase === 'menstrual') {
    events.push({
      icon: Droplets,
      iconColor: 'text-destructive',
      title: 'Menstrualna faza',
      description: 'Težina danas nije pouzdan signal — adaptaciju prebacujemo za sledeću nedelju.',
    });
  }
  if (status.training.activePauseEvent?.type === 'illness') {
    events.push({
      icon: Thermometer,
      iconColor: 'text-warning',
      title: 'Oporavak od bolesti',
      description: 'Recovery -0.15 i kalorije -5% (ne -20%) dok telo ne stabilizuje.',
    });
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title={t("progress.emptyAdaptationTitle")}
        description={t("progress.emptyAdaptationDesc")}
      />
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event, i) => {
        const Icon = event.icon;
        return (
        <Card key={i} className="p-4 flex gap-3">
          <div className={`w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center shrink-0 ${event.iconColor}`} aria-hidden="true">
            <Icon size={20} />
          </div>
          <div>
            <p className="text-subhead font-semibold text-foreground">{event.title}</p>
            <p className="text-footnote text-muted-foreground mt-0.5 leading-snug">
              {event.description}
            </p>
          </div>
        </Card>
        );
      })}
    </div>
  );
};

export default Progress;
