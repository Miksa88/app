// ============================================================================
// PocetniciAlertsCard — surface §8 Crveni indikatori u trener UI
// ============================================================================
//
// Prikazuje listu aktivnih pocetnici.md §8 alert-a za jednog klijenta:
//   - Severity badge (red/amber)
//   - Title + description
//   - Recommended actions checklist
//
// Trener može da klikne action da je oznaci kao "primenjeno" (TBD: persist
// kroz separate flag — za sad samo prikaz).
// ============================================================================

import { motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, ChevronRight } from 'lucide-react';
import type { PocetniciAlert } from '@/utils/sync/pocetniciAlerts';

interface PocetniciAlertsCardProps {
  alerts: PocetniciAlert[];
  className?: string;
  prefersReducedMotion?: boolean;
}

export default function PocetniciAlertsCard({
  alerts,
  className = '',
  prefersReducedMotion = false,
}: PocetniciAlertsCardProps) {
  if (alerts.length === 0) {
    return (
      <div className={`bg-card rounded-2xl card-shadow p-4 ${className}`}>
        <p className="text-subhead text-muted-foreground text-center py-4">
          ✓ Nema aktivnih §8 alert-a
        </p>
      </div>
    );
  }

  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} motionProps={motionProps} />
      ))}
    </div>
  );
}

// ============================================================================

interface AlertItemProps {
  alert: PocetniciAlert;
  motionProps: object;
}

function AlertItem({ alert, motionProps }: AlertItemProps) {
  const isRed = alert.severity === 'red';
  const Icon = isRed ? AlertCircle : AlertTriangle;
  const tone = isRed
    ? 'bg-destructive/10 border-destructive/30'
    : 'bg-warning/10 border-warning/30';
  const iconBg = isRed ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning';
  const badgeBg = isRed
    ? 'bg-destructive text-destructive-foreground'
    : 'bg-warning text-warning-foreground';

  return (
    <motion.div
      {...motionProps}
      className={`rounded-2xl border p-4 ${tone}`}
      role="region"
      aria-label={alert.title}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-subhead font-semibold text-foreground">
              {alert.title}
            </h3>
            <span className={`text-caption-2 font-bold px-2 py-0.5 rounded-full ${badgeBg}`}>
              {isRed ? 'CRVENO' : 'ŽUTO'}
            </span>
          </div>
          <p className="text-footnote text-muted-foreground mt-1">{alert.description}</p>
        </div>
      </div>

      <ul className="space-y-1.5 pl-1">
        {alert.recommendedActions.map((action, i) => (
          <li
            key={i}
            className="text-footnote text-foreground/90 flex items-start gap-2"
          >
            <ChevronRight size={14} className="text-foreground/60 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{action}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
