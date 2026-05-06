// ============================================================================
// QueueStrip — vizuelni prikaz mezociklus queue-a (NE kalendar)
// Spec: 03_INTEGRATION_LAYER.md Sekcija 6.4 +
//       01_TRAINING_FLOW_MASTER.md Sekcija 4.7 + Pravilo 5
// ============================================================================
//
// Vizuelni jezik: [A1 ✓] [B1 ✓] [A2 ←] [B2] [A3] — sliding strip horizontalno.
//
// "Bez krivice" UI (Pravilo 5 spec-a 01):
//   - NE prikazujemo datume (biologija ne zna za ponedeljak)
//   - NE prikazujemo "missed" / "skipped" za pending sesije
//   - Klik na completed sesiju = read-only history view
//   - Klik na current = "Start workout" (navigate /workout/active)
//   - Klik na pending = tooltip "Tvoj sledeci trening posle..."
// ============================================================================

import { useNavigate } from 'react-router-dom';
import { ICON_SIZE } from "@/lib/design-tokens";
import { motion } from 'framer-motion';
import { Check, Play, Lock } from 'lucide-react';
import { useMesocycleQueue } from '@/hooks/useMesocycleQueue';
import { shouldReduceMotion, MOTION_EASE } from '@/lib/motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { EmptyState } from '@/components/ui/empty-state';
import type { QueuedSession, Partition } from '@/types/training';

interface QueueStripProps {
  className?: string;
  /** Show samo prvih N sesija — za inline preview u Home cards */
  maxItems?: number;
}

export const QueueStrip = ({ className = '', maxItems }: QueueStripProps) => {
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const { queue, isLoading } = useMesocycleQueue(clientId);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className={`flex gap-2 overflow-x-auto pb-2 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-16 h-20 rounded-2xl bg-muted/40 animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  if (!queue || queue.sessions.length === 0) {
    return (
      <EmptyState
        title={t("gym.emptyQueueTitle")}
        description={t("gym.emptyQueueDesc")}
        className={className}
      />
    );
  }

  const sessions = maxItems ? queue.sessions.slice(0, maxItems) : queue.sessions;
  const pointer = queue.sessionPointer;

  return (
    <div className={`flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 ${className}`}
         style={{ scrollbarWidth: 'none' }}>
      {sessions.map((session, idx) => {
        const isCompleted = idx < pointer;
        const isNext = idx === pointer;
        const isPending = idx > pointer;

        return (
          <SessionCell
            key={session.sessionId}
            session={session}
            isCompleted={isCompleted}
            isNext={isNext}
            isPending={isPending}
            onClick={() => {
              if (isNext) navigate('/workout/active');
              else if (isCompleted) navigate(`/progress?session=${session.sessionId}`);
              // pending = no-op (tooltip-only)
            }}
          />
        );
      })}
    </div>
  );
};

// ============================================================================
// SessionCell — pojedinacan box za sesiju
// ============================================================================

interface SessionCellProps {
  session: QueuedSession;
  isCompleted: boolean;
  isNext: boolean;
  isPending: boolean;
  onClick: () => void;
}

const PARTITION_COLOR: Record<Partition, string> = {
  Lower: 'bg-success/15 text-success',
  Upper: 'bg-info/15 text-info',
  FullBody: 'bg-primary/15 text-primary',
};

const SessionCell = ({ session, isCompleted, isNext, isPending, onClick }: SessionCellProps) => {
  const isInteractive = !isPending;
  const baseClass = 'shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all min-h-11';

  if (isNext) {
    const reduce = shouldReduceMotion();
    return (
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.94 }}
        animate={reduce ? {} : { scale: [1, 1.04, 1] }}
        transition={reduce ? { duration: 0.01 } : { duration: 1.6, repeat: Infinity, ease: MOTION_EASE.easeInOut }}
        className={`${baseClass} gradient-primary text-primary-foreground shadow-fab`}
        aria-label={`Start ${session.label}`}
      >
        <Play size={ICON_SIZE.md} fill="currentColor" />
        <span className="text-caption-1 font-bold">{session.sessionId}</span>
      </motion.button>
    );
  }

  if (isCompleted) {
    return (
      <button
        onClick={onClick}
        className={`${baseClass} ${PARTITION_COLOR[session.partition]} opacity-80`}
        aria-label={`Završen ${session.label}`}
      >
        <Check size={ICON_SIZE.md} strokeWidth={3} />
        <span className="text-caption-1 font-semibold">{session.sessionId}</span>
      </button>
    );
  }

  // pending
  return (
    <div
      onClick={isInteractive ? onClick : undefined}
      className={`${baseClass} bg-muted/50 text-muted-foreground border border-dashed border-muted-foreground/20`}
      aria-label={`Sledeci ${session.label}`}
    >
      <Lock size={ICON_SIZE.xs} />
      <span className="text-caption-1">{session.sessionId}</span>
    </div>
  );
};

export default QueueStrip;
