// EmptyState — unified 4th-state "no data" component
// Spec: design-system/MASTER.md §3.3 (4th-state doctrine)

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  cta?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

/**
 * Unified empty state za liste, search, tabs, itd.
 * Zamenjuje ad-hoc "Nema podataka" tekst blokove po app-u.
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  cta,
  className = "",
  children,
}: EmptyStateProps) => (
  <motion.div
    {...fadeUp(0.05)}
    role="status"
    className={`bg-card rounded-2xl card-shadow p-6 text-center flex flex-col items-center ${className}`}
  >
    {Icon && (
      <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
        <Icon size={24} className="text-muted-foreground/60" aria-hidden="true" />
      </div>
    )}
    <p className="text-body font-semibold text-foreground">{title}</p>
    {description && (
      <p className="text-footnote text-muted-foreground mt-1 max-w-xs">{description}</p>
    )}
    {children}
    {cta && (
      <button
        onClick={cta.onClick}
        className="mt-4 gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-subhead font-semibold min-h-11 shadow-fab"
      >
        {cta.label}
      </button>
    )}
  </motion.div>
);
