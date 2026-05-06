// NavSearchBar — unified iOS 26 search field za trainer/client nav screens
// Spec: Apple HIG Search field u list headeru (Messages, Contacts, Mail, Settings)
//
// Karakteristike:
//   - Rounded-full pill shape (iOS 17+ pattern)
//   - bg-card + card-shadow (premium feel, kontrast na bg-background-secondary)
//   - Search icon 20px u muted-foreground
//   - Large placeholder + body text
//   - Min 44pt touch height
//   - focus ring: primary/30

import { type InputHTMLAttributes, forwardRef } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ICON_SIZE } from "@/lib/design-tokens";

interface NavSearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Dodatne klase za container wrapper */
  containerClassName?: string;
}

export const NavSearchBar = forwardRef<HTMLInputElement, NavSearchBarProps>(
  ({ className, containerClassName, ...props }, ref) => {
    return (
      <div className={cn("relative", containerClassName)}>
        <Search
          size={ICON_SIZE.md}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={ref}
          type="search"
          className={cn(
            "w-full h-11 min-h-[44px] bg-card text-foreground placeholder:text-muted-foreground/50 rounded-full pl-11 pr-4 text-body card-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0 transition-shadow duration-fast",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
NavSearchBar.displayName = "NavSearchBar";
