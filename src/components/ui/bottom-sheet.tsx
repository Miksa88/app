// BottomSheet — unified iOS-native bottom sheet sa handle bar + safe-area bottom
// Spec: design-system/MASTER.md §3 — Patterns
//
// Wrapper oko shadcn Sheet (Radix) sa fixnim iOS patternom:
//   - handle bar (drag affordance)
//   - rounded-t-3xl (24pt)
//   - pb-safe-cta (safe-area-bottom + 24px breathing)
//   - Liquid glass background
//
// Primer:
//   <BottomSheet open={show} onOpenChange={setShow} title="Detalji obroka">
//     {content}
//   </BottomSheet>

import { type ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  /** Da li prikazati handle bar (default true) */
  showHandle?: boolean;
  /** Max visina sheet-a (default 85vh) */
  maxHeight?: string;
  children: ReactNode;
}

export const BottomSheet = ({
  open,
  onOpenChange,
  title,
  description,
  showHandle = true,
  maxHeight = "85vh",
  children,
}: Props) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl p-0 border-t-0 max-w-lg mx-auto pb-safe-cta"
        style={{ maxHeight }}
      >
        {/* Handle bar (iOS drag affordance) */}
        {showHandle && (
          <div className="pt-3 pb-1 flex justify-center" aria-hidden="true">
            <div className="w-10 h-1 rounded-full bg-muted" />
          </div>
        )}

        {/* Header */}
        {(title || description) && (
          <SheetHeader className="px-6 pt-3 pb-4 text-left">
            {title && <SheetTitle className="text-title-3 text-foreground">{title}</SheetTitle>}
            {description && (
              <SheetDescription className="text-subhead text-muted-foreground">
                {description}
              </SheetDescription>
            )}
          </SheetHeader>
        )}

        {/* Content scroll area */}
        <div className="px-6 overflow-y-auto">{children}</div>
      </SheetContent>
    </Sheet>
  );
};
