// ============================================================================
// InsetGroupedList — iOS Settings-style lista (Faza 4-Iter 2)
// Spec: DESIGN_AUDIT.md H2 (rounded radii konvencija) + iOS HIG
// ============================================================================
//
// Reusable komponenta koja daje "iOS Settings" izgled:
//   - rounded-2xl card sa optional naslov sekcije i footer
//   - Row-ovi su odvojeni internim divider-ima
//   - Primary text + opcional secondary text + opcional trailing (chevron/badge)
//   - Haptic tap feedback (koristi native touch behavior; web tactile je limited)
//   - Accessibility-ready — <ul>/<li> struktura
//
// Primer upotrebe:
//   <InsetGroupedList
//     title="Profile"
//     footer="Your settings are secure."
//     items={[
//       { id: 'name', label: 'Ime', value: 'Sarah', trailing: 'chevron', onClick: () => nav('/profile/name') },
//       { id: 'age', label: 'Godine', value: '30' },
//       { id: 'logout', label: 'Izloguj se', tone: 'destructive', trailing: null, onClick: handleLogout },
//     ]}
//   />
// ============================================================================

import { motion } from 'framer-motion';
import { ICON_SIZE } from "@/lib/design-tokens";
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { shouldReduceMotion , MOTION_DURATION} from '@/lib/motion';

export type InsetListTrailing =
  | 'chevron'          // prikaži > indikator navigacije
  | 'none'             // bez trailing elementa
  | ReactNode;         // custom (badge, toggle, itd.)

export interface InsetListItem {
  id: string;
  /** Glavni label (17pt body style). */
  label: string;
  /** Opcioni secondary subline (15pt subhead, muted). */
  value?: string;
  /** Leading ikona (lucide komponenta, slot pattern). */
  icon?: ReactNode;
  /** Trailing element — default 'chevron' ako postoji onClick, inače 'none'. */
  trailing?: InsetListTrailing;
  /** 'default' | 'destructive' (crveno). */
  tone?: 'default' | 'destructive';
  /** Disabled izgled. */
  disabled?: boolean;
  /** Klik handler; pretvara row u button. */
  onClick?: () => void;
}

interface InsetGroupedListProps {
  className?: string;
  /** Sekcija naslov (caption-1 uppercase tracking-wider, muted). */
  title?: string;
  /** Sekcija footer (caption-1, muted, objašnjenje). */
  footer?: string;
  items: InsetListItem[];
}

export const InsetGroupedList = ({
  className = '',
  title,
  footer,
  items,
}: InsetGroupedListProps) => {
  const reduce = shouldReduceMotion();

  return (
    <section className={className}>
      {title && (
        <h3 className="text-caption-1 text-muted-foreground uppercase tracking-wider font-medium px-4 mb-2">
          {title}
        </h3>
      )}
      <ul className="bg-card rounded-2xl card-shadow overflow-hidden" role="list">
        {items.map((item, idx) => (
          <motion.li
            key={item.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0.01 } : { duration: MOTION_DURATION.fast, delay: idx * 0.02 }}
            className={idx < items.length - 1 ? 'border-b border-border/60' : ''}
          >
            <InsetListRow item={item} />
          </motion.li>
        ))}
      </ul>
      {footer && (
        <p className="text-caption-1 text-muted-foreground px-4 mt-2">
          {footer}
        </p>
      )}
    </section>
  );
};

// ============================================================================
// InsetListRow — pojedinačna stavka
// ============================================================================

const InsetListRow = ({ item }: { item: InsetListItem }) => {
  const toneClass = item.tone === 'destructive' ? 'text-destructive' : 'text-foreground';
  const opacityClass = item.disabled ? 'opacity-50 pointer-events-none' : '';
  const interactiveClass = item.onClick
    ? 'active:bg-muted/40 transition-colors duration-fast cursor-pointer'
    : '';

  // Odredi trailing — default chevron ako ima onClick
  const trailing: InsetListTrailing =
    item.trailing !== undefined ? item.trailing : item.onClick ? 'chevron' : 'none';

  const body = (
    <div
      className={`flex items-center gap-3 px-4 ios-row-h py-3 w-full text-left ${opacityClass} ${interactiveClass}`}
    >
      {item.icon && (
        <div className="shrink-0 w-7 h-7 flex items-center justify-center" aria-hidden="true">
          {item.icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-body ${toneClass}`}>{item.label}</p>
        {item.value && (
          <p className="text-footnote text-muted-foreground mt-0.5 truncate">{item.value}</p>
        )}
      </div>
      <div className="shrink-0">
        <TrailingSlot value={trailing} tone={item.tone} />
      </div>
    </div>
  );

  if (item.onClick && !item.disabled) {
    return (
      <button
        type="button"
        onClick={item.onClick}
        className="w-full text-left"
        aria-label={item.label}
      >
        {body}
      </button>
    );
  }

  return body;
};

// ============================================================================
// TrailingSlot — renderuje chevron/custom/ništa
// ============================================================================

const TrailingSlot = ({
  value,
  tone,
}: {
  value: InsetListTrailing;
  tone?: 'default' | 'destructive';
}) => {
  if (value === 'none') return null;
  if (value === 'chevron') {
    return (
      <ChevronRight
        size={ICON_SIZE.md}
        className={tone === 'destructive' ? 'text-destructive/50' : 'text-muted-foreground/50'}
        aria-hidden="true"
      />
    );
  }
  return <>{value}</>;
};

export default InsetGroupedList;
