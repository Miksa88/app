// SectionLabel — unified section header (caption-1 uppercase tracking-wider)
// Spec: design-system/MASTER.md §3 — Patterns (Section Label)
//
// Koristi se za ALL uppercase section labels kroz app:
//   "UPRAVLJANJE", "NEDAVNO AKTIVNE", "DURATION", "PHYSICAL", "NOTES", ...
//
// Primer:
//   <SectionLabel>Upravljanje</SectionLabel>
//   <SectionLabel action={<button>Sve →</button>}>Nedavno aktivne</SectionLabel>

import { type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Right-aligned action (e.g., "View all" link) */
  action?: ReactNode;
  /** Extra classes za custom margin/padding */
  className?: string;
}

export const SectionLabel = ({ children, action, className = "" }: Props) => {
  if (action) {
    return (
      <div className={`flex items-center justify-between mb-3 px-1 ${className}`}>
        <h2 className="text-caption-1 text-muted-foreground uppercase tracking-wider font-semibold">
          {children}
        </h2>
        {action}
      </div>
    );
  }

  return (
    <h2
      className={`text-caption-1 text-muted-foreground uppercase tracking-wider font-semibold mb-3 px-1 ${className}`}
    >
      {children}
    </h2>
  );
};
