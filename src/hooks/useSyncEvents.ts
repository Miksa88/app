// ============================================================================
// useSyncEvents — derive aktivne sync banner-e iz UserStatus
// Spec: 03_INTEGRATION_LAYER.md Sekcija 6.6 (Notifikacije i banner sistem)
// ============================================================================
//
// Vraca listu aktivnih banner-a (luteal phase, deload, hydration warning, ...)
// koje SyncEventBanner komponenta (Faza 4) prikazuje globalno.
//
// Banner je dismissable — klijentkinja moze da ga zatvori, sledecih 24h
// se ne prikazuje za isti trigger. Persistencija dismissal-a je localStorage
// (placeholder; mogla bi biti i `dismissed_banners` JSONB u UserStatus-u).
//
// i18n: title/description ne vracaju se kao hardcoded stringovi — vracamo
// translation keys (`banner.<type>.title`, `banner.<type>.desc`) koje
// SyncEventBanner resava kroz `t()` iz LanguageContext-a. Ovo drzi hook
// cistim (nema React.useContext u njemu) i ELI5 copy na jednom mestu.
// ============================================================================

import { useMemo } from 'react';
import { useUserStatus } from './useUserStatus';

export type SyncBannerType =
  | 'luteal_phase'
  | 'deload_active'
  | 'return_from_break'
  | 'illness_pause'
  | 'hydration_first'
  | 'metabolic_noise_block'
  | 'menstrual_weight_unreliable'
  | 'fatigue_safeguard';

export interface SyncBanner {
  type: SyncBannerType;
  severity: 'info' | 'warning' | 'critical';
  /** i18n key za naslov (npr. `banner.luteal.title`) */
  titleKey: string;
  /** i18n key za opis (npr. `banner.luteal.desc`) */
  descKey: string;
  /** ISO timestamp do kada je banner aktivan (npr. _blockMacroChangesUntil) */
  expiresAt?: string;
}

export interface UseSyncEventsResult {
  banners: SyncBanner[];
  isLoading: boolean;
  error: Error | null;
}

export function useSyncEvents(clientId: string | null): UseSyncEventsResult {
  const { status, isLoading, error } = useUserStatus(clientId);

  const banners = useMemo<SyncBanner[]>(() => {
    if (!status) return [];

    const out: SyncBanner[] = [];

    // Rule 1 — Lutealna faza
    if (status.bio.cyclePhase === 'luteal') {
      out.push({
        type: 'luteal_phase',
        severity: 'info',
        titleKey: 'banner.luteal.title',
        descKey: 'banner.luteal.desc',
      });
    }

    // Rule 8 — Menstrual weight unreliable
    if (status.bio.cyclePhase === 'menstrual') {
      out.push({
        type: 'menstrual_weight_unreliable',
        severity: 'info',
        titleKey: 'banner.menstrualWeight.title',
        descKey: 'banner.menstrualWeight.desc',
      });
    }

    // Rule 3 — Deload
    if (status.training.isInDeload) {
      out.push({
        type: 'deload_active',
        severity: 'info',
        titleKey: 'banner.deload.title',
        descKey: 'banner.deload.desc',
      });
    }

    // Rule 4 — Return from Break
    if (status.training.isInReturnFromBreak) {
      out.push({
        type: 'return_from_break',
        severity: 'info',
        titleKey: 'banner.returnFromBreak.title',
        descKey: 'banner.returnFromBreak.desc',
      });
    }

    // Rule 7 — Illness
    if (status.training.activePauseEvent?.type === 'illness') {
      out.push({
        type: 'illness_pause',
        severity: 'warning',
        titleKey: 'banner.illness.title',
        descKey: 'banner.illness.desc',
      });
    }

    // Rule 5 — Hydration first
    if (status._blockMacroChangesUntil && new Date(status._blockMacroChangesUntil) > new Date()) {
      out.push({
        type: 'hydration_first',
        severity: 'warning',
        titleKey: 'banner.hydrationFirst.title',
        descKey: 'banner.hydrationFirst.desc',
        expiresAt: new Date(status._blockMacroChangesUntil).toISOString(),
      });
    }

    // Rule 6 — Metabolic noise block
    if (status._blockProgressionUntil && new Date(status._blockProgressionUntil) > new Date()) {
      out.push({
        type: 'metabolic_noise_block',
        severity: 'warning',
        titleKey: 'banner.metabolicNoise.title',
        descKey: 'banner.metabolicNoise.desc',
        expiresAt: new Date(status._blockProgressionUntil).toISOString(),
      });
    }

    // Rule 2 — Fatigue safeguard
    if (status.nutrition._fatigueSyncActive) {
      out.push({
        type: 'fatigue_safeguard',
        severity: 'info',
        titleKey: 'banner.fatigue.title',
        descKey: 'banner.fatigue.desc',
      });
    }

    return out;
  }, [status]);

  return { banners, isLoading, error };
}
