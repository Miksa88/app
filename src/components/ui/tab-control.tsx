// TabControl — unified iOS-native segmented control / tab bar
// Spec: design-system/MASTER.md §3 — Patterns
//
// 2 varijante:
//   - animated → sliding pill indicator (Apple Music stil, layoutId spring)
//   - static   → bg-primary na active tab (iOS standard, za 2-3 tabs)

import { motion } from "framer-motion";
import { type ComponentType } from "react";
import type { LucideProps } from "lucide-react";

export interface Tab<Key extends string> {
  key: Key;
  label: string;
  icon?: ComponentType<LucideProps>;
}

interface Props<Key extends string> {
  tabs: Tab<Key>[];
  active: Key;
  onChange: (key: Key) => void;
  variant?: "animated" | "static";
  /** Unique layoutId za animated varijantu — mora biti unique per TabControl instance */
  layoutId?: string;
  className?: string;
  /** Aria label za tablist */
  ariaLabel?: string;
}

export const TabControl = <Key extends string>({
  tabs,
  active,
  onChange,
  variant = "animated",
  layoutId = "tab-indicator",
  className = "",
  ariaLabel,
}: Props<Key>) => {
  if (variant === "static") {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={`bg-card rounded-2xl card-shadow p-1 flex gap-1 ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-footnote font-semibold transition-colors min-h-11 ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {Icon && <Icon size={14} aria-hidden="true" />}
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Animated (Apple Music pill)
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`bg-muted/50 rounded-xl p-1 flex ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.key)}
            className="relative flex-1 py-2 text-caption-1 font-semibold whitespace-nowrap min-h-11 transition-colors rounded-lg"
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-card rounded-lg card-shadow"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                aria-hidden="true"
              />
            )}
            <span
              className={`relative z-10 ${isActive ? "text-foreground" : "text-muted-foreground"}`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
