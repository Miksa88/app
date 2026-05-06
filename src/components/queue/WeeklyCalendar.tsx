// ============================================================================
// WeeklyCalendar — hibridni 7-dnevni prozor (Faza 4.3)
// Spec: Faza 4.3 (Korekcija Faze 4 — Hibridni kalendar/queue model)
//       + 01_TRAINING_FLOW_MASTER.md Pravilo 5 ("bez krivice" UI)
// ============================================================================
//
// Vizuelni jezik: 7 ćelija horizontalno (Pon-Ned) — klijentkinja vidi svoju
// nedelju, dok queue (biologija) ostaje izvor istine za redosled sesija.
//
// "Bez krivice" za klijentkinju:
//   - NE prikazujemo "missed" / "skipped" / "propušten" za bilo koju ćeliju
//   - Shifted sesija ima DISKRETAN orange dot u uglu (eksplicitno odobreno)
//   - Klik na today-training = Start workout
//   - Klik na completed = read-only history
//   - Rest dan = tih, ne-interaktivan
// ============================================================================

import { useNavigate } from 'react-router-dom';
import { ICON_SIZE } from "@/lib/design-tokens";
import { motion } from 'framer-motion';
import { Check, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWeeklyCalendar } from '@/hooks/useWeeklyCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { pulsingBorderAnimation, shouldReduceMotion, MOTION_DURATION, MOTION_EASE } from '@/lib/motion';
import type { Partition, QueuedSession } from '@/types/training';
import type { WeekDayView } from '@/utils/training/weeklyCalendarMapper';
import { useHaptic } from '@/hooks/useHaptic';

interface WeeklyCalendarProps {
  className?: string;
  /** 'client' skriva shift audit info; 'trainer' eksponuje ga (Faza 5). */
  variant?: 'client' | 'trainer';
}

export const WeeklyCalendar = ({ className = '', variant = 'client' }: WeeklyCalendarProps) => {
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const { view, isLoading } = useWeeklyCalendar(clientId);
  const navigate = useNavigate();
  const haptic = useHaptic();

  if (isLoading) {
    return (
      <div className={`grid grid-cols-7 gap-2 ${className}`}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!view || view.days.length === 0) {
    return (
      <div className={`bg-card rounded-2xl card-shadow p-4 text-center ${className}`}>
        <p className="text-subhead text-muted-foreground">
          Kalendar još nije generisan. Završi onboarding da kreneš.
        </p>
      </div>
    );
  }

  const handleClick = (day: WeekDayView) => {
    if (day.kind.type !== 'training') return;
    haptic("selection");
    const session = day.kind.session;
    if (session.status === 'completed') {
      navigate(`/progress?session=${session.sessionId}`);
      return;
    }
    if (day.isToday) {
      navigate('/workout/active');
    }
  };

  const reduce = shouldReduceMotion();

  return (
    <div
      className={`grid grid-cols-7 gap-2 ${className}`}
      role="list"
      aria-label={t("a11y.weeklyCalendar")}
    >
      {view.days.map((day, i) => (
        <motion.div
          key={day.date.toISOString()}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0.01 } : { duration: MOTION_DURATION.base, delay: i * 0.03, ease: MOTION_EASE.outQuart }}
        >
          <DayCell
            day={day}
            variant={variant}
            onClick={() => handleClick(day)}
          />
        </motion.div>
      ))}
    </div>
  );
};

// ============================================================================
// DayCell — jedna ćelija u kalendaru
// ============================================================================

const PARTITION_COLOR: Record<Partition, string> = {
  Lower: 'bg-success/15 text-success',
  Upper: 'bg-info/15 text-info',
  FullBody: 'bg-primary/15 text-primary',
};

const PARTITION_LABEL: Record<Partition, string> = {
  Lower: 'Lower',
  Upper: 'Upper',
  FullBody: 'Full',
};

interface DayCellProps {
  day: WeekDayView;
  variant: 'client' | 'trainer';
  onClick: () => void;
}

const DayCell = ({ day, variant, onClick }: DayCellProps) => {
  const base =
    'relative aspect-[3/4] rounded-2xl flex flex-col items-center justify-between py-2 px-1 transition-all duration-base min-h-[72px] w-full text-center';

  // Header (Pon/Uto/... + dayNumber)
  const header = (
    <div className="flex flex-col items-center gap-0.5 leading-none">
      <span className="text-caption-2 uppercase tracking-wider opacity-70">{day.dayLabel}</span>
      <span className="text-footnote font-bold">{day.dayNumber}</span>
    </div>
  );

  const shiftDot = day.isShifted && (
    <span
      role="img"
      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-warning ring-2 ring-card"
      aria-label="Sesija pomerena"
      title="Sesija pomerena"
    />
  );

  // Rest dan — suptilan dot pattern umesto plain gray
  if (day.kind.type === 'rest') {
    const isTodayRest = day.isToday;
    return (
      <div
        role="listitem"
        className={`${base} ${
          isTodayRest
            ? 'bg-muted/70 text-muted-foreground ring-2 ring-primary/30'
            : 'bg-muted/30 text-muted-foreground/70'
        }`}
        aria-label={`${day.dayLabel} ${day.dayNumber} — ${isTodayRest ? 'Rest (danas)' : 'Rest'}`}
      >
        {header}
        <div className="flex gap-0.5">
          <span className="w-1 h-1 rounded-full bg-current opacity-40" />
          <span className="w-1 h-1 rounded-full bg-current opacity-40" />
          <span className="w-1 h-1 rounded-full bg-current opacity-40" />
        </div>
        <span className="text-caption-2 opacity-70 font-medium">Rest</span>
      </div>
    );
  }

  const session: QueuedSession = day.kind.session;
  const isCompleted = session.status === 'completed';
  const isTodayTraining = day.isToday && !isCompleted;

  // Today + trening = pulsing CTA sa glow
  if (isTodayTraining) {
    const pulseProps = pulsingBorderAnimation();
    return (
      <motion.button
        role="listitem"
        onClick={onClick}
        whileTap={{ scale: 0.94 }}
        {...pulseProps}
        className={`${base} gradient-primary text-primary-foreground shadow-fab ring-2 ring-primary/30 ring-offset-2 ring-offset-background-secondary`}
        aria-label={`Danas ${session.label} — Start workout`}
      >
        {shiftDot}
        {header}
        <div className="w-7 h-7 rounded-full bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm">
          <Play size={ICON_SIZE.xs} fill="currentColor" className="ml-0.5" aria-hidden="true" />
        </div>
        <span className="text-caption-2 font-bold tracking-tight">{session.sessionId}</span>
      </motion.button>
    );
  }

  // Completed — soft with check
  if (isCompleted) {
    return (
      <button
        role="listitem"
        onClick={onClick}
        className={`${base} ${PARTITION_COLOR[session.partition]} opacity-85 hover:opacity-100`}
        aria-label={`Završen ${session.label}`}
      >
        {shiftDot}
        {header}
        <div className="w-6 h-6 rounded-full bg-current/10 flex items-center justify-center">
          <Check size={ICON_SIZE.xs} strokeWidth={3} aria-hidden="true" />
        </div>
        <span className="text-caption-2 font-semibold opacity-80">{session.sessionId}</span>
      </button>
    );
  }

  // Future trening — partition badge, ne-interaktivno
  return (
    <div
      role="listitem"
      className={`${base} ${PARTITION_COLOR[session.partition]} bg-opacity-60`}
      aria-label={`${day.dayLabel} ${day.dayNumber} — ${session.label}`}
    >
      {shiftDot}
      {header}
      <span className="text-caption-2 font-semibold">{PARTITION_LABEL[session.partition]}</span>
      <span className="text-caption-2 opacity-60 font-medium">{session.sessionId}</span>
    </div>
  );
};

export default WeeklyCalendar;
