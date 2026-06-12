// ============================================================================
// WeeklyCalendar — iskreni 7-dnevni prozor (redizajn 2026-06-11)
// Spec: 01_TRAINING_FLOW_MASTER.md Pravilo 5 ("bez krivice" UI)
// ============================================================================
//
// Queue je pointer-based — NEMA zakazanih dana. Strip zato prikazuje samo ono
// što je istina:
//   - completed ćelija — sesija stvarno odrađena tog dana (completedAt fakt)
//   - next ćelija     — sledeća sesija iz queue-a, prikazana na DANAS
//   - empty ćelija    — tiha, bez tvrdnje (NEMA lažnog "Rest", NEMA "missed")
//
// Dani u nedelji se formatiraju iz locale-a (sr-Latn / en), ne hardkodovano.
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

// Locale-aware kratka oznaka dana (Pon/Mon) — item 5: bez hardkodovanih
// PON/UTO stringova; sr-Latn-RS daje latinicu ("pon"), en-GB daje "Mon".
function formatDayLabel(date: Date, language: string): string {
  const locale = language === 'sr' ? 'sr-Latn-RS' : 'en-GB';
  const raw = date.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export const WeeklyCalendar = ({ className = '' }: WeeklyCalendarProps) => {
  const { t, language } = useLanguage();
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
          {t('gym.calendarNotGenerated')}
        </p>
      </div>
    );
  }

  const handleClick = (day: WeekDayView) => {
    if (day.kind.type === 'empty') return;
    haptic("selection");
    if (day.kind.type === 'completed') {
      navigate(`/progress?session=${day.kind.session.sessionId}`);
      return;
    }
    // 'next' — uvek na danas
    navigate('/workout/active');
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
          transition={reduce ? { duration: 0.01 } : { duration: MOTION_DURATION.fast, delay: i * 0.02, ease: MOTION_EASE.outQuart }}
        >
          <DayCell
            day={day}
            dayLabel={formatDayLabel(day.date, language)}
            t={t}
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

interface DayCellProps {
  day: WeekDayView;
  dayLabel: string;
  t: (key: string) => string;
  onClick: () => void;
}

const DayCell = ({ day, dayLabel, t, onClick }: DayCellProps) => {
  const base =
    'relative aspect-[3/4] rounded-2xl flex flex-col items-center justify-between py-2 px-1 transition duration-base min-h-[72px] w-full text-center';

  // Header (lokalizovan dan + dayNumber)
  const header = (
    <div className="flex flex-col items-center gap-0.5 leading-none">
      <span className="text-caption-2 uppercase tracking-wider opacity-70">{dayLabel}</span>
      <span className="text-footnote font-bold">{day.dayNumber}</span>
    </div>
  );

  // Sledeća sesija — prikazana na danas, pulsing CTA sa glow
  if (day.kind.type === 'next') {
    const session: QueuedSession = day.kind.session;
    const pulseProps = pulsingBorderAnimation();
    return (
      <motion.button
        role="listitem"
        onClick={onClick}
        whileTap={{ scale: 0.94 }}
        {...pulseProps}
        className={`${base} gradient-primary text-primary-foreground shadow-fab ring-2 ring-primary/30 ring-offset-2 ring-offset-background-secondary`}
        aria-label={t('gym.dayNextAria').replace('{label}', session.label)}
      >
        {header}
        <div className="w-7 h-7 rounded-full bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm">
          <Play size={ICON_SIZE.xs} fill="currentColor" className="ml-0.5" aria-hidden="true" />
        </div>
        <span className="text-caption-2 font-bold tracking-tight">{session.sessionId}</span>
      </motion.button>
    );
  }

  // Završena sesija tog dana — fakt iz istorije
  if (day.kind.type === 'completed') {
    const session: QueuedSession = day.kind.session;
    return (
      <button
        role="listitem"
        onClick={onClick}
        className={`${base} ${PARTITION_COLOR[session.partition]} opacity-85 hover:opacity-100`}
        aria-label={t('gym.dayCompletedAria').replace('{label}', session.label)}
      >
        {header}
        <div className="w-6 h-6 rounded-full bg-current/10 flex items-center justify-center">
          <Check size={ICON_SIZE.xs} strokeWidth={3} aria-hidden="true" />
        </div>
        <span className="text-caption-2 font-semibold opacity-80">{session.sessionId}</span>
      </button>
    );
  }

  // Empty — tiha ćelija bez tvrdnje (queue nema fiksne dane, pa ne pišemo
  // ni "Rest" ni "missed"). Današnja prazna ćelija dobija diskretni ring.
  return (
    <div
      role="listitem"
      className={`${base} ${
        day.isToday
          ? 'bg-muted/70 text-muted-foreground ring-2 ring-primary/30'
          : 'bg-muted/30 text-muted-foreground/70'
      }`}
      aria-label={`${dayLabel} ${day.dayNumber}`}
    >
      {header}
    </div>
  );
};

export default WeeklyCalendar;
