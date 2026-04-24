// ============================================================================
// SyncEventBanner — globalni banner za aktivne sync events
// Spec: 03_INTEGRATION_LAYER.md Sekcija 6.6
// ============================================================================
//
// Prikazuje banner-e iz `useSyncEvents` hook-a:
//   🌙 Lutealna faza, 🔄 Deload, 💧 Hidratacija, 🤒 Bolest, ⚠️ Metabolic noise...
//
// Dismissal je 24h per banner type — cuvano u localStorage. Posle 24h, ako je
// banner i dalje aktivan u UserStatus-u, vraca se.
// ============================================================================

import { useState, useEffect } from 'react';
import { ICON_SIZE } from "@/lib/design-tokens";
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useSyncEvents, type SyncBanner, type SyncBannerType } from '@/hooks/useSyncEvents';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { MOTION_DURATION } from "@/lib/motion";

type TranslateFn = (key: string) => string;

const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;
const DISMISS_STORAGE_KEY = 'fitbyivana.dismissedBanners';

interface DismissedBanner {
  type: SyncBannerType;
  dismissedAt: number;       // ms timestamp
}

interface SyncEventBannerProps {
  /** Inline u stranici, default je floating top */
  variant?: 'floating' | 'inline';
  className?: string;
}

export const SyncEventBanner = ({ variant = 'inline', className = '' }: SyncEventBannerProps) => {
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const { banners, isLoading } = useSyncEvents(clientId);
  const [dismissedTypes, setDismissedTypes] = useState<Set<SyncBannerType>>(new Set());

  useEffect(() => {
    const dismissed = loadDismissedBanners();
    const now = Date.now();
    const active = dismissed.filter(d => now - d.dismissedAt < DISMISS_DURATION_MS);
    setDismissedTypes(new Set(active.map(d => d.type)));

    // Cleanup expired iz localStorage-a
    if (active.length !== dismissed.length) {
      saveDismissedBanners(active);
    }
  }, [banners.length]);   // re-evaluate kad se dodaju novi banner-i

  const handleDismiss = (type: SyncBannerType) => {
    const dismissed = loadDismissedBanners();
    const updated = [
      ...dismissed.filter(d => d.type !== type),
      { type, dismissedAt: Date.now() },
    ];
    saveDismissedBanners(updated);
    setDismissedTypes(new Set(updated.map(d => d.type)));
  };

  if (isLoading || !clientId) return null;

  const visibleBanners = banners.filter(b => !dismissedTypes.has(b.type));
  if (visibleBanners.length === 0) return null;

  const containerClass = variant === 'floating'
    ? `fixed top-2 left-0 right-0 z-40 px-3 max-w-lg mx-auto space-y-2 ${className}`
    : `space-y-2 ${className}`;

  return (
    <div className={containerClass}>
      <AnimatePresence initial={false}>
        {visibleBanners.map(banner => (
          <BannerCard
            key={banner.type}
            banner={banner}
            onDismiss={() => handleDismiss(banner.type)}
            t={t}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// BannerCard — pojedinacan banner
// ============================================================================

const SEVERITY_STYLE: Record<SyncBanner['severity'], string> = {
  info: 'bg-info/8 border-info/25 text-foreground',
  warning: 'bg-warning/12 border-warning/30 text-foreground',
  critical: 'bg-destructive/12 border-destructive/35 text-foreground',
};

interface BannerCardProps {
  banner: SyncBanner;
  onDismiss: () => void;
  t: TranslateFn;
}

const BannerCard = ({ banner, onDismiss, t }: BannerCardProps) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: -10, height: 0 }}
    animate={{ opacity: 1, y: 0, height: 'auto' }}
    exit={{ opacity: 0, y: -10, height: 0 }}
    transition={{ duration: MOTION_DURATION.fast, ease: 'easeOut' }}
    className={`relative rounded-2xl border p-3 pr-10 backdrop-blur-sm card-shadow ${SEVERITY_STYLE[banner.severity]}`}
    role="alert"
  >
    <p className="text-subhead font-semibold leading-snug">{t(banner.titleKey)}</p>
    <p className="text-footnote text-foreground/75 mt-0.5 leading-snug">{t(banner.descKey)}</p>
    <button
      onClick={onDismiss}
      aria-label={t("a11y.hideBanner24h")}
      className="absolute top-2 right-2 min-w-11 min-h-11 flex items-center justify-center rounded-full hover:bg-foreground/5 transition-colors focus-ring-default"
    >
      <X size={ICON_SIZE.xs} className="text-foreground/50" />
    </button>
  </motion.div>
);

// ============================================================================
// localStorage helpers
// ============================================================================

function loadDismissedBanners(): DismissedBanner[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as DismissedBanner[];
  } catch {
    return [];
  }
}

function saveDismissedBanners(items: DismissedBanner[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage quota / SSR fallback — ignore
  }
}

export default SyncEventBanner;
