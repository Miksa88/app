// ActionCard — unified navigation/action row (icon tile + title + desc + chevron)
// Spec: design-system/MASTER.md §3 — Patterns
//
// Primer:
//   <ActionCard
//     icon={Package}
//     title={t("packages.title")}
//     description="3 packages · 27 active"
//     onClick={() => navigate("/trainer/packages")}
//     badge="New"
//   />

import { type ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { ChevronRight } from "lucide-react";

interface Props {
  icon: ComponentType<LucideProps>;
  iconBg?: string;
  iconColor?: string;
  title: string;
  description?: string;
  badge?: string;
  badgeClass?: string;
  onClick?: () => void;
  className?: string;
}

export const ActionCard = ({
  icon: Icon,
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
  title,
  description,
  badge,
  badgeClass = "bg-success/15 text-success",
  onClick,
  className = "",
}: Props) => {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={`w-full bg-card rounded-2xl p-5 card-shadow flex items-center gap-4 text-left min-h-14 active:brightness-95 transition-[filter] ${className}`}
    >
      <div
        className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}
      >
        <Icon size={20} className={iconColor} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-body font-semibold text-foreground truncate">{title}</p>
          {badge && (
            <span
              className={`text-caption-2 font-bold px-2 py-0.5 rounded-full ${badgeClass} shrink-0`}
            >
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-caption-1 text-muted-foreground mt-0.5 truncate">{description}</p>
        )}
      </div>
      {onClick && (
        <ChevronRight
          size={16}
          className="text-muted-foreground/30 shrink-0"
          aria-hidden="true"
        />
      )}
    </Component>
  );
};
