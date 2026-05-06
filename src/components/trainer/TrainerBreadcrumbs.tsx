// TrainerBreadcrumbs — orientation za 3+ level deep trainer views
// Spec: design-system/MASTER.md §3.5 (Breadcrumbs — 3+ level rule)

import { useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  items: Crumb[];
  className?: string;
}

/**
 * Render breadcrumb trail. Poslednji item je aria-current="page".
 * Navigacija ide kroz react-router navigate (preservira SPA).
 */
export const TrainerBreadcrumbs = ({ items, className = "" }: Props) => {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <Breadcrumb className={`px-5 py-2 ${className}`}>
      <BreadcrumbList className="text-caption-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={i} className="inline-flex items-center gap-2">
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage className="text-foreground truncate max-w-[140px]">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.href) navigate(item.href);
                    }}
                    className="cursor-pointer truncate max-w-[120px]"
                    href={item.href}
                  >
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
