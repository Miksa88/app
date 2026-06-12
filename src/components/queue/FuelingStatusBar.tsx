// ============================================================================
// FuelingStatusBar — Princip 1 spec-a 02 (Identitet iznad kalorija)
// Spec: 02_NUTRITION_FLOW_MASTER.md Sekcija 1 + 03_INTEGRATION_LAYER.md 6.5
// ============================================================================
//
// Klijentkinjski UI NIKAD ne prikazuje raw kcal brojeve. Umesto toga vidi
// "Fueling status" — kružni Apple Health-style ring koji prikazuje PROCENAT
// ispunjenosti dnevnog plana obroka (ne kalorija).
//
// Trener UI (ClientNutritionPlan.tsx) prikazuje sve makroe i kcal direktno.
//
// Dizajn (Faza 4-Iter 2):
//   - Veliki ring (120px) sa gradient stroke, animated fill
//   - Centralni tekst "3 / 5" (obroci)
//   - Desno: 5 status dots (logged ● / skipped ◐ / remaining ○)
//   - Warning banner kad tečne kcal > 10% budžeta
// ============================================================================

import { useEffect, useState } from 'react';
import { ICON_SIZE } from "@/lib/design-tokens";
import { motion } from 'framer-motion';
import { MOTION_DURATION, MOTION_EASE, IOS_SPRING } from '@/lib/motion';
import { Sparkles, Coffee, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserStatus } from '@/hooks/useUserStatus';
import { getDailyTotals, type DailyTotals } from '@/services/mealLogService';
import { AlertBanner } from '@/components/ui/alert-banner';

const TOTAL_MEAL_SLOTS = 5;        // Spec 02 Sekcija 6.1 — fiksno za MVP

interface FuelingStatusBarProps {
  className?: string;
  /** Kompaktan prikaz za Home dashboard preview */
  compact?: boolean;
}

export const FuelingStatusBar = ({ className = '', compact = false }: FuelingStatusBarProps) => {
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const { status, isLoading } = useUserStatus(clientId);
  const [totals, setTotals] = useState<DailyTotals | null>(null);
  const [loadingTotals, setLoadingTotals] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setTotals(null);
      setLoadingTotals(false);
      return;
    }
    let mounted = true;
    setLoadingTotals(true);
    getDailyTotals(clientId)
      .then(t => { if (mounted) setTotals(t); })
      .catch(() => { if (mounted) setTotals(null); })
      .finally(() => { if (mounted) setLoadingTotals(false); });
    return () => { mounted = false; };
  }, [clientId, status?.lastUpdatedAt]);   // refresh kad se status update

  if (isLoading || loadingTotals) {
    return <div className={`h-32 bg-muted/40 rounded-2xl animate-pulse ${className}`} />;
  }

  if (!status || !totals) return null;

  const mealsLogged = totals.mealsLogged;
  const mealsSkipped = totals.mealsSkipped;
  const mealsRemaining = Math.max(0, TOTAL_MEAL_SLOTS - mealsLogged - mealsSkipped);
  const progressPct = Math.min(100, (mealsLogged / TOTAL_MEAL_SLOTS) * 100);

  const allDone = mealsLogged >= TOTAL_MEAL_SLOTS;
  const hasNoise = totals.liquidCalories > status.nutrition.currentCalorieTarget * 0.10;

  // Lokalizovan aria opis za dots (item 4: bez hardkodovanog sr teksta)
  const dotsAria = t('food.fueling.dotsAria')
    .replace('{logged}', String(mealsLogged))
    .replace('{skipped}', String(mealsSkipped))
    .replace('{remaining}', String(mealsRemaining));

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <FuelingDots
          logged={mealsLogged}
          skipped={mealsSkipped}
          remaining={mealsRemaining}
          ariaLabel={dotsAria}
        />
        <span className="text-caption-1 text-muted-foreground">
          {mealsLogged}/{TOTAL_MEAL_SLOTS}
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-2xl card-shadow p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" aria-hidden="true" />
          <span className="text-subhead font-semibold text-foreground">{t('food.fueling.title')}</span>
        </div>
        {allDone && (
          <motion.span
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={IOS_SPRING.precise}
            className="text-caption-1 text-success font-semibold inline-flex items-center gap-1"
          >
            <Check size={ICON_SIZE.xs} strokeWidth={3} aria-hidden="true" />
            {t('food.fueling.allDone')}
          </motion.span>
        )}
      </div>

      <div className="flex items-center gap-5">
        <FuelingRing
          progress={progressPct}
          logged={mealsLogged}
          total={TOTAL_MEAL_SLOTS}
          allDone={allDone}
          unitLabel={t('food.fueling.mealsUnit')}
        />
        <div className="flex-1 flex flex-col gap-3">
          <FuelingDots logged={mealsLogged} skipped={mealsSkipped} remaining={mealsRemaining} size="lg" ariaLabel={dotsAria} />
          <div className="space-y-1 text-caption-1">
            {mealsLogged > 0 && (
              <p className="text-muted-foreground">
                <span className="text-success font-semibold">●</span>{' '}
                {t('food.fueling.loggedCount').replace('{n}', String(mealsLogged))}
              </p>
            )}
            {mealsSkipped > 0 && (
              <p className="text-muted-foreground">
                <span className="text-muted-foreground/60">◐</span>{' '}
                {t('food.fueling.skippedCount').replace('{n}', String(mealsSkipped))}
              </p>
            )}
            {mealsRemaining > 0 && (
              <p className="text-muted-foreground">
                <span className="text-muted-foreground/40">○</span>{' '}
                {t('food.fueling.remainingCount').replace('{n}', String(mealsRemaining))}
              </p>
            )}
          </div>
        </div>
      </div>

      {hasNoise && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <AlertBanner tone="warning" icon={Coffee}>
            {t('food.fueling.liquidWarning')}
          </AlertBanner>
        </motion.div>
      )}
    </div>
  );
};

// ============================================================================
// FuelingRing — Apple Health style ring (SVG)
// ============================================================================

interface FuelingRingProps {
  progress: number;      // 0-100
  logged: number;
  total: number;
  allDone: boolean;
  /** Lokalizovana jedinica ispod brojača ("obroka" / "meals") */
  unitLabel: string;
}

const RING_SIZE = 104;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const FuelingRing = ({ progress, logged, total, allDone, unitLabel }: FuelingRingProps) => {
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="fueling-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={RING_STROKE}
        />
        {/* Animated progress */}
        <motion.circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke={allDone ? 'hsl(var(--success))' : 'url(#fueling-ring-gradient)'}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: MOTION_DURATION.xSlow, ease: MOTION_EASE.outQuart }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-title-2 font-bold text-foreground tabular-nums">
          {logged}
          <span className="text-muted-foreground">/{total}</span>
        </span>
        <span className="text-caption-2 text-muted-foreground uppercase tracking-wider mt-0.5">
          {unitLabel}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// FuelingDots — vizuelni progress kao niz krugova
// ============================================================================

interface FuelingDotsProps {
  logged: number;
  skipped: number;
  remaining: number;
  size?: 'sm' | 'lg';
  /** Lokalizovan aria opis stanja obroka */
  ariaLabel: string;
}

const FuelingDots = ({ logged, skipped, remaining, size = 'sm', ariaLabel }: FuelingDotsProps) => {
  const dotSize = size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3';
  return (
    <div className="flex items-center gap-2" role="img" aria-label={ariaLabel}>
      {Array.from({ length: logged }).map((_, i) => (
        <motion.div
          key={`l${i}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.05, ...IOS_SPRING.precise }}
          className={`${dotSize} rounded-full bg-success`}
        />
      ))}
      {Array.from({ length: skipped }).map((_, i) => (
        <div key={`s${i}`} className={`${dotSize} rounded-full bg-muted-foreground/30`} />
      ))}
      {Array.from({ length: remaining }).map((_, i) => (
        <div key={`r${i}`} className={`${dotSize} rounded-full border-2 border-muted-foreground/25`} />
      ))}
    </div>
  );
};

export default FuelingStatusBar;
