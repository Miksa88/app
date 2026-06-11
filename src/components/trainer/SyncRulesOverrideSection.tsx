// ============================================================================
// SyncRulesOverrideSection — trener UI za per-klijent sync rule override
// Spec: 03_INTEGRATION_LAYER.md §3.2 (clientOverrides gate) + IT-18
// ============================================================================
//
// Trener vidi listu od 8 sync rule-ova sa toggle per rule. Toggle state:
//   - 'active'   (default): pravilo se primenjuje
//   - 'disabled': pravilo se preskace za ovu klijentkinju
//
// State izvor:
//   - Izvlacimo iz `status.clientOverrides` (niz SyncRuleName-ova koji su
//     disabled).
//   - Default 'active' ako rule nije u nizu.
//
// Mutacija:
//   - On toggle: debounced (250ms) mutate kroz `useUpdateClientOverrides`.
//   - Audit (alpha): console.log "<trainerId> changed <ruleName> to <state>
//     for <clientId>".
// ============================================================================

import { logger } from "@/lib/logger";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ICON_SIZE } from '@/lib/design-tokens';
import { getClientStatusByTrainer } from '@/services/trainerService';
import type { SyncRuleName, UserStatus } from '@/types/userStatus';
import {
  useUpdateClientOverrides,
  type OverrideState,
} from '@/hooks/mutations/useUpdateClientOverrides';

const RULE_ORDER: readonly SyncRuleName[] = [
  'hormonal_sync',
  'fatigue_sync',
  'deload_sync',
  'return_from_break_sync',
  'hydration_first',
  'metabolic_noise_block',
  'illness_penalty',
  'cycle_menstrual_ignore',
];

const DEBOUNCE_MS = 250;

interface SyncRulesOverrideSectionProps {
  clientId: string;
}

/**
 * Trener-only sekcija koja prikazuje 8 toggle-ova za sync rule override.
 *
 * Fetchuje status interno preko `getClientStatusByTrainer` (ista patern kao
 * `ClientUserStatusPanel`). Prikazuje placeholder ako status jos nije ucitan
 * (onboarding incomplete) — ne skriva sekciju, samo disable-uje toggle-ove.
 */
export const SyncRulesOverrideSection = ({
  clientId,
}: SyncRulesOverrideSectionProps) => {
  const { t } = useLanguage();
  const { clientId: trainerId } = useAuth();
  const mutation = useUpdateClientOverrides();

  // Lokalni status fetch — isti patern kao ClientUserStatusPanel.
  // Posle uspesne mutacije, refetch-ujemo da uhvatimo nove clientOverrides.
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getClientStatusByTrainer(clientId)
      .then((s) => {
        if (mounted) setStatus(s);
      })
      .catch((e) => {
        logger.error('[SyncRulesOverrideSection] load failed:', e);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [clientId, mutation.data]);

  // Lokalno optimistic state — toggle se odmah prikazuje u UI, debounce-uje
  // mutaciju. Sinhronizujemo sa status.clientOverrides kad god se status
  // promeni (Realtime push).
  const serverDisabled = useMemo(() => {
    if (!status) return new Set<SyncRuleName>();
    return new Set<SyncRuleName>(status.clientOverrides ?? []);
  }, [status]);

  const [localDisabled, setLocalDisabled] = useState<Set<SyncRuleName>>(
    () => new Set(serverDisabled),
  );

  // Kada server-side status dodje preko Realtime push-a, resetuj lokalni
  // state (izbegava stale UI ako je neko drugi promenio override).
  useEffect(() => {
    setLocalDisabled(new Set(serverDisabled));
  }, [serverDisabled]);

  // Debounce tajmeri po rule-u — svaki toggle ima svoj timer, posebne
  // rule-ove mozemo da toggle-ujemo nezavisno.
  const timers = useRef<Map<SyncRuleName, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(() => {
    return () => {
      // Cleanup svih tajmera na unmount
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    };
  }, []);

  const handleToggle = useCallback(
    (rule: SyncRuleName, checked: boolean) => {
      // `checked === true` → pravilo je aktivno (default)
      // `checked === false` → pravilo je disabled
      const newState: OverrideState = checked ? 'active' : 'disabled';

      // Optimistic update
      setLocalDisabled((prev) => {
        const next = new Set(prev);
        if (newState === 'disabled') next.add(rule);
        else next.delete(rule);
        return next;
      });

      // Audit trail — gate u dev-u only; prod-u nije korisno (treba real audit table).
      if (import.meta.env.DEV) {
        logger.debug(
          `[trainer-audit] ${trainerId ?? 'unknown'} changed ${rule} to ${newState} for ${clientId}`,
        );
      }

      // Debounce server call
      const existing = timers.current.get(rule);
      if (existing) clearTimeout(existing);

      const handle = setTimeout(() => {
        mutation.mutate({
          clientId,
          overrides: { [rule]: newState },
        });
        timers.current.delete(rule);
      }, DEBOUNCE_MS);

      timers.current.set(rule, handle);
    },
    [clientId, mutation, trainerId],
  );

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Lock size={ICON_SIZE.xs} className="text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider">
            {t('trainer.overrides.title')}
          </h3>
          <p className="text-caption-2 text-muted-foreground/60 mt-0.5">
            {t('trainer.overrides.description')}
          </p>
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {RULE_ORDER.map((rule) => {
          const isDisabled = localDisabled.has(rule);
          const isChecked = !isDisabled;
          const titleKey = `trainer.overrides.${rule}.title`;
          const descKey = `trainer.overrides.${rule}.description`;
          const stateLabel = isChecked
            ? t('trainer.overrides.statusActive')
            : t('trainer.overrides.statusDisabled');

          return (
            <div
              key={rule}
              className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-footnote font-medium text-foreground">
                  {t(titleKey)}
                </p>
                <p className="text-caption-2 text-muted-foreground/60 mt-0.5">
                  {t(descKey)}
                </p>
                <p
                  className={`text-caption-2 font-semibold mt-1 ${
                    isChecked ? 'text-success' : 'text-warning'
                  }`}
                >
                  {stateLabel}
                </p>
              </div>
              <Switch
                checked={isChecked}
                onCheckedChange={(checked) => handleToggle(rule, checked)}
                disabled={isLoading || !status || mutation.isPending}
                aria-label={`${t(titleKey)} · ${stateLabel}`}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
};
