// ============================================================================
// useDailyCalorieTarget — derive dnevni calorie target + macros
// ============================================================================
//
// Vraca vec sync-irane brojeve iz UserStatus.nutrition. NE racuna sam
// (sve je vec processedan kroz runSyncRules pre persist-a).
//
// Ovaj hook je STAGED za Princip 1 spec-a 02 ("identitet iznad kalorija"):
// klijentkinjski UI komponenti NE prikazuju `currentCalorieTarget` direktno
// — koriste `useFuelingStatus` (Faza 4) koji racuna progress %. Trener UI
// koristi ovaj hook direktno.
// ============================================================================

import { useMemo } from 'react';
import { useUserStatus } from './useUserStatus';
import type { CalorieTargetMode } from '@/types/nutrition';

export interface UseDailyCalorieTargetResult {
  /** Trenutni dnevni target (vec sync-iran sa svim rule-ovima) */
  dailyCalorieTarget: number | null;
  /** Macros izvedeni iz target-a + pathology overrides */
  macros: { proteinG: number; carbsG: number; fatG: number } | null;
  /** Goal mode (deficit / recomposition / lean_bulk / maintenance) */
  targetMode: CalorieTargetMode | null;
  /** TDEE baseline — koristi se za "trenirani dan vs odmor dan" diferencijaciju */
  tdee: number | null;
  /** True ako je neka sync rule aktivna (deload, fatigue, return from break) */
  hasActiveSync: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useDailyCalorieTarget(clientId: string | null): UseDailyCalorieTargetResult {
  const { status, isLoading, error } = useUserStatus(clientId);

  const result = useMemo(() => {
    if (!status) {
      return {
        dailyCalorieTarget: null,
        macros: null,
        targetMode: null,
        tdee: null,
        hasActiveSync: false,
      };
    }

    const hasActiveSync =
      status.training.isInDeload ||
      status.training.isInReturnFromBreak ||
      status.nutrition._fatigueSyncActive === true ||
      status.nutrition._deloadSyncActive === true ||
      status.nutrition._returnSyncActive === true ||
      status.bio.cyclePhase === 'luteal' ||
      status.training.activePauseEvent?.type === 'illness';

    return {
      dailyCalorieTarget: status.nutrition.currentCalorieTarget,
      macros: status.nutrition.macros,
      targetMode: status.nutrition.targetMode,
      tdee: status.nutrition.tdee,
      hasActiveSync,
    };
  }, [status]);

  return { ...result, isLoading, error };
}
