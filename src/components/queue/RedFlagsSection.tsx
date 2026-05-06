// ============================================================================
// RedFlagsSection — trener dashboard pregled at-risk klijentkinja
// Spec: 03_INTEGRATION_LAYER.md Sekcija 6.2
// ============================================================================
//
// Trener vidi:
//   - Total clients counter (kontekst)
//   - At-risk count (alarm)
//   - Deload counter (info za sledece 1-na-1 razgovore)
//   - Luteal phase counter (znaj sa kim ce biti emocionalniji razgovor)
//   - Lista at-risk klijentkinja sa primaryRedFlag opisom — klik vodi na ClientProfile
// ============================================================================

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Activity, Moon, ChevronRight, Users } from 'lucide-react';
import { ICON_SIZE } from '@/lib/design-tokens';
import { useTrainerDashboard } from '@/hooks/useTrainerDashboard';
import type { AtRiskClientSummary } from '@/services/trainerService';
import { MOTION_DURATION, TAP_SCALE } from "@/lib/motion";
import { Card } from "@/components/ui/card";

interface RedFlagsSectionProps {
  className?: string;
}

export const RedFlagsSection = ({ className = '' }: RedFlagsSectionProps) => {
  const { counters, atRiskClients, isLoading } = useTrainerDashboard();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className={`h-32 bg-muted/40 rounded-2xl animate-pulse ${className}`} />;
  }

  if (!counters) return null;

  const lutealCount = counters.cyclePhaseCounts.luteal;

  return (
    <div className={className}>
      {/* Counter row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <CounterCard
          icon={Users}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          value={counters.totalClients}
          label="Klijentkinje"
        />
        <CounterCard
          icon={AlertTriangle}
          iconColor="text-destructive"
          iconBg="bg-destructive/10"
          value={counters.atRiskCount}
          label="At risk"
          highlight={counters.atRiskCount > 0}
        />
        <CounterCard
          icon={Activity}
          iconColor="text-info"
          iconBg="bg-info/10"
          value={counters.deloadCount}
          label="Deload"
        />
      </div>

      {/* Luteal counter (ako ima) */}
      {lutealCount > 0 && (
        <Card className="p-3 flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
            <Moon size={ICON_SIZE.md} className="text-info" />
          </div>
          <div className="flex-1">
            <p className="text-subhead font-semibold text-foreground">
              {lutealCount} {lutealCount === 1 ? 'klijentkinja' : 'klijentkinje'} u Lutealnoj fazi
            </p>
            <p className="text-footnote text-muted-foreground mt-0.5">
              Očekuj symptom check-in-ove (PMS, voda, niska energija).
            </p>
          </div>
        </Card>
      )}

      {/* At-risk lista */}
      {atRiskClients.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-footnote font-semibold text-muted-foreground uppercase tracking-wider mt-2">
            Treba pažnju
          </h3>
          {atRiskClients.map((client, i) => (
            <RedFlagCard
              key={client.clientId}
              client={client}
              index={i}
              onClick={() => navigate(`/trainer/client/${client.clientId}`)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {atRiskClients.length === 0 && counters.totalClients > 0 && (
        <div className="bg-success/8 border border-success/20 rounded-2xl p-3 flex items-center gap-3">
          <div className="text-2xl">✓</div>
          <p className="text-subhead text-foreground">
            Nijedna klijentkinja nije at risk trenutno.
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CounterCard
// ============================================================================

interface CounterCardProps {
  icon: typeof Users;
  iconColor: string;
  iconBg: string;
  value: number;
  label: string;
  highlight?: boolean;
}

const CounterCard = ({ icon: Icon, iconColor, iconBg, value, label, highlight }: CounterCardProps) => (
  <div className={`bg-card rounded-2xl p-3 card-shadow ${highlight ? 'ring-2 ring-destructive/30' : ''}`}>
    <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center mb-2`}>
      <Icon size={16} className={iconColor} />
    </div>
    <p className="text-title-2 font-bold text-foreground tracking-tight">{value}</p>
    <p className="text-caption-2 text-muted-foreground mt-0.5">{label}</p>
  </div>
);

// ============================================================================
// RedFlagCard — pojedinacna klijentkinja
// ============================================================================

interface RedFlagCardProps {
  client: AtRiskClientSummary;
  index: number;
  onClick: () => void;
}

const RedFlagCard = ({ client, index, onClick }: RedFlagCardProps) => {
  const displayName = [client.firstName, client.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Klijentkinja';
  const initial = (displayName[0] ?? 'K').toUpperCase();

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_DURATION.base, delay: index * 0.04 }}
      whileTap={{ scale: TAP_SCALE.secondary }}
      onClick={onClick}
      className="w-full bg-card rounded-2xl card-shadow p-3 flex items-center gap-3 text-left"
    >
      {client.avatarUrl ? (
        <img
          src={client.avatarUrl}
          alt={displayName}
          className="w-11 h-11 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-11 h-11 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
          <span className="text-body font-semibold text-warning">{initial}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-subhead font-semibold text-foreground truncate">{displayName}</p>
        <p className="text-caption-1 text-warning mt-0.5 inline-flex items-center gap-1">
          <AlertTriangle size={ICON_SIZE.xs} aria-hidden="true" /> {client.primaryRedFlag}
        </p>
      </div>
      <ChevronRight size={16} className="text-muted-foreground/40 shrink-0" />
    </motion.button>
  );
};

export default RedFlagsSection;
