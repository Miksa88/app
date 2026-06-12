import * as React from "react";

import { cn } from "@/lib/utils";

// iOS-native Input — DESIGN_AUDIT v2 Iter 2g refactor.
// Default je FILLED style (bg-muted/60) — radi izvan Card-a (standalone filled input)
// i unutar Card-a (inline filled field) bez "polje u polju" double-card anti-pattern-a.
//
// Za inline edit u grouped-list (Settings-style) override sa className:
//   <Input className="bg-transparent px-0" />
//
// Za standalone card-style (npr. search bar sa sopstvenim shadow), override:
//   <Input className="bg-card card-shadow rounded-2xl" />
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 min-h-11 w-full rounded-xl bg-muted/60 px-4 py-2 text-body text-foreground placeholder:text-muted-foreground/60 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-fast",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
