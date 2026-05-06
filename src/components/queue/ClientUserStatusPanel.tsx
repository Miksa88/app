// ============================================================================
// ClientUserStatusPanel — pun UserStatus prikaz za trener
// Spec: 03_INTEGRATION_LAYER.md Sekcija 6.3 (Client Profile)
// ============================================================================
//
// Trener vidi:
//   - Bio: weight trend, recovery multiplier, sleep avg, cycle phase
//   - Training: queue progress, isInDeload, return-from-break, pause
//   - Nutrition: calorie target, macros (PUN PRIKAZ — trener sme kcal),
//     metabolic filter, hydration
//   - Red flags: sve metrike sa numericim vrednostima
//   - Sync events timeline (aktivne adaptacije)
//   - clientOverrides toggle (Faza 4.3 placeholder; full toggle UI Faza 5)
// ============================================================================

import { useEffect, useState } from 'react';
import {
  Activity, Moon, Heart, Droplet, AlertTriangle, Sparkles, Lock, Zap, AlertCircle,
} from 'lucide-react';
import { getClientStatusByTrainer } from '@/services/trainerService';
import type { UserStatus, SyncRuleName } from '@/types/userStatus';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from "@/components/ui/card";

interface ClientUserStatusPanelProps {
  clientId: string;
  className?: string;
}

const SYNC_RULE_LABELS: Record<SyncRuleName, string> = {
  hormonal_sync: 'Lutealna faza bonus',
  fatigue_sync: 'Fatigue safeguard',
  deload_sync: 'Deload sync',
  return_from_break_sync: 'Return from Break',
  hydration_first: 'Hydration first',
  metabolic_noise_block: 'Metabolic noise block',
  illness_penalty: 'Illness penalty',
  cycle_menstrual_ignore: 'Cycle menstrual ignore',
};

export const ClientUserStatusPanel = ({ clientId, className = '' }: ClientUserStatusPanelProps) => {
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getClientStatusByTrainer(clientId)
      .then(s => { if (mounted) setStatus(s); })
      .catch(e => {
        const err = e instanceof Error ? e : new Error(String(e));
        // Log pun error interno (dev console / Sentry); UI prikazuje friendly fallback
        // WS-8.5 D24 — fix raw Postgres UUID leakage u UI-ju.
        // eslint-disable-next-line no-console
        console.error('[ClientUserStatusPanel] getClientStatusByTrainer failed:', err);
        if (mounted) setError(err);
      })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [clientId]);

  if (isLoading) {
    return <div className={`h-48 bg-muted/40 rounded-2xl animate-pulse ${className}`} />;
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Podaci nisu dostupni"
        description="Došlo je do problema pri učitavanju statusa klijentkinje. Pokušaj ponovo ili proveri konekciju."
        className={className}
      />
    );
  }

  if (!status) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Onboarding nije završen"
        description="Klijentkinja još uvek nije popunila onboarding — status će se pojaviti kada završi."
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-headline text-foreground">UserStatus snapshot</h3>
        <span className="text-caption-2 text-muted-foreground">
          ({new Date(status.lastUpdatedAt).toLocaleString('sr-RS')})
        </span>
      </div>

      {/* Bio */}
      <Section title="Bio" icon={Heart}>
        <DataRow label="Recovery multiplier" value={status.bio.recoveryMultiplier.toFixed(2)} />
        <DataRow label="Sleep avg (7 dana)" value={`${status.bio.sleepLast7DaysAvg.toFixed(1)}h`} />
        <DataRow label="Stress avg (7 dana)" value={`${status.bio.stressLast7DaysAvg.toFixed(1)}/5`} />
        <DataRow label="Hydration avg" value={`${status.bio.hydrationLast7DaysAvgMl}ml`} />
        <DataRow label="Weight MA5" value={`${status.bio.currentWeightMA5}kg`} />
        <DataRow label="Weight trend" value={status.bio.weightTrend} />
        {status.bio.cycleDay && (
          <DataRow
            label="Ciklus"
            value={`Dan ${status.bio.cycleDay} · ${status.bio.cyclePhase}`}
            highlight
          />
        )}
      </Section>

      {/* Training */}
      <Section title="Training" icon={Activity}>
        <DataRow label="Pozicija" value={status.training.position} />
        <DataRow
          label="Queue progress"
          value={`${status.training.sessionPointer} / ${status.training.queue.sessions.length} sesija`}
        />
        <DataRow label="Mezociklus" value={String(status.training.currentMesocycleIndex)} />
        <DataRow label="Sledeća sesija" value={`${status.training.nextSessionId} · ${status.training.nextSessionPartition}`} />
        {status.training.isInDeload && (
          <FlagBadge label="Deload aktivan" tone="info" />
        )}
        {status.training.isInReturnFromBreak && (
          <FlagBadge label="Return from Break" tone="info" />
        )}
        {status.training.activePauseEvent && (
          <FlagBadge
            label={`Pauza: ${status.training.activePauseEvent.type} (${status.training.activePauseEvent.penaltySessionsRemaining} sesija ostalo)`}
            tone="warning"
          />
        )}
      </Section>

      {/* Nutrition (trener sme kcal — Princip 1 spec-a 02 — kalorije skrivene SAMO klijentkinji) */}
      <Section title="Nutrition" icon={Droplet}>
        <DataRow label="BMR" value={`${status.nutrition.bmr} kcal`} />
        <DataRow label="TDEE" value={`${status.nutrition.tdee} kcal`} />
        <DataRow label="Calorie target (synced)" value={`${status.nutrition.currentCalorieTarget} kcal`} highlight />
        <DataRow label="Target mode" value={status.nutrition.targetMode} />
        <DataRow label="Protein" value={`${status.nutrition.macros.proteinG}g`} />
        <DataRow label="Carbs" value={`${status.nutrition.macros.carbsG}g`} />
        <DataRow label="Fat" value={`${status.nutrition.macros.fatG}g`} />
        <DataRow label="Hidration danas" value={`${status.nutrition.hydrationTodayMl} / ${status.nutrition.hydrationTargetMl} ml`} />
        {status.nutrition.metabolicFilter.length > 0 && (
          <DataRow
            label="Patologije"
            value={status.nutrition.metabolicFilter.join(', ')}
            highlight
          />
        )}
        {status.nutrition.isMetabolicNoiseTriggered && (
          <FlagBadge label="Metabolic noise triggered" tone="warning" />
        )}
      </Section>

      {/* Red Flags */}
      <Section title="Red flags" icon={AlertTriangle}>
        <DataRow label="At risk" value={status.redFlags.isAtRisk ? 'DA' : 'NE'} highlight={status.redFlags.isAtRisk} />
        <DataRow label="Skip count (7d)" value={String(status.redFlags.skipCount7d)} />
        <DataRow label="Metabolic noise (dana)" value={String(status.redFlags.metabolicNoiseDays7d)} />
        <DataRow label="Energy below 5 (dana)" value={String(status.redFlags.energyBelowThreshold7d)} />
        <DataRow label="Failed workouts" value={String(status.redFlags.consecutiveFailedWorkouts)} />
        <DataRow label="Dani od weekly check-in" value={String(status.redFlags.daysSinceLastWeeklyCheckIn)} />
      </Section>

      {/* Active sync flags */}
      {(status.bio.cyclePhase === 'luteal' || status.training.isInDeload || status.training.isInReturnFromBreak) && (
        <Section title="Aktivne adaptacije" icon={Sparkles}>
          {status.bio.cyclePhase === 'luteal' && <FlagBadge label="Lutealna faza (+150 kcal)" tone="info" />}
          {status.training.isInDeload && <FlagBadge label="Deload nedelja" tone="info" />}
          {status.training.isInReturnFromBreak && <FlagBadge label="Return from Break" tone="info" />}
          {status.nutrition._fatigueSyncActive && <FlagBadge label="Fatigue safeguard" tone="warning" />}
        </Section>
      )}

      {/* Client overrides (1-na-1 trener kontrola) */}
      <Section title="Client overrides" icon={Lock}>
        {status.clientOverrides.length === 0 ? (
          <p className="text-footnote text-muted-foreground italic">
            Nijedna sync rule nije isključena (full algoritam aktivan).
          </p>
        ) : (
          status.clientOverrides.map(rule => (
            <FlagBadge key={rule} label={`✗ ${SYNC_RULE_LABELS[rule]}`} tone="warning" />
          ))
        )}
        <p className="text-caption-2 text-muted-foreground mt-2 italic">
          Toggle UI dolazi u Fazi 5 (premium 1-na-1 funkcionalnost).
        </p>
      </Section>

      {/* Block timers */}
      {(status._blockMacroChangesUntil || status._blockProgressionUntil) && (
        <Section title="Aktivni blokovi" icon={Zap}>
          {status._blockMacroChangesUntil && (
            <DataRow
              label="Macro changes blocked do"
              value={new Date(status._blockMacroChangesUntil).toLocaleString('sr-RS')}
              highlight
            />
          )}
          {status._blockProgressionUntil && (
            <DataRow
              label="Progression blocked do"
              value={new Date(status._blockProgressionUntil).toLocaleString('sr-RS')}
              highlight
            />
          )}
        </Section>
      )}

      {/* Cycle counter za UI sigurnost */}
      <Section title="Moon" icon={Moon}>
        <DataRow label="Cycle phase" value={status.bio.cyclePhase ?? 'tracker neaktivan'} />
        <DataRow
          label="Weight pouzdana"
          value={status.bio.weightDataReliable ? 'da' : 'NE (menstrualna faza)'}
          highlight={!status.bio.weightDataReliable}
        />
      </Section>
    </div>
  );
};

// ============================================================================
// Helpers
// ============================================================================

interface SectionProps {
  title: string;
  icon: typeof Activity;
  children: React.ReactNode;
}

const Section = ({ title, icon: Icon, children }: SectionProps) => (
  <Card className="p-4">
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
      <Icon size={16} className="text-primary" />
      <h4 className="text-subhead font-semibold text-foreground">{title}</h4>
    </div>
    <div className="space-y-1.5">{children}</div>
  </Card>
);

const DataRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between text-footnote">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-medium ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</span>
  </div>
);

const FlagBadge = ({ label, tone }: { label: string; tone: 'info' | 'warning' | 'success' }) => {
  const colors = {
    info: 'bg-info/12 text-info',
    warning: 'bg-warning/12 text-warning-foreground',
    success: 'bg-success/12 text-success',
  };
  return (
    <span className={`inline-block text-caption-1 px-2 py-1 rounded-md font-medium ${colors[tone]} mt-1`}>
      {label}
    </span>
  );
};

export default ClientUserStatusPanel;
