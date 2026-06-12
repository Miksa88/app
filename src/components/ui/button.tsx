import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Touch target min-h 44px (iOS HIG) — fix H4 iz DESIGN_AUDIT.md
// Transition-colors respektuje prefers-reduced-motion globalno preko src/index.css
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // iOS-native CTA — magenta→purple gradient + FAB shadow (Iter 2c-5)
        cta: "gradient-primary text-primary-foreground font-semibold shadow-fab active:opacity-90",
        ctaGhost: "gradient-primary text-primary-foreground font-semibold active:opacity-80",
        // iOS 26 Liquid Glass — translucent blur + subtle border (Iter 3a)
        // Za nav action buttons (back, menu, camera, +) u stilu WhatsApp/TikTok iOS 26.
        glass: "bg-card/60 backdrop-blur-xl backdrop-saturate-150 border border-border/40 text-foreground active:bg-card/80 shadow-hairline",
      },
      size: {
        // 44px min-h-a (iOS HIG 44pt touch target) — min-h-11 = 44px, Tailwind notacija
        default: "min-h-11 px-4 py-2",
        sm: "min-h-11 rounded-md px-3",
        lg: "min-h-12 rounded-md px-8",
        // Full-width bottom CTA (iOS HIG 56pt) — font-size 17px bez font-weight collision sa variants
        xl: "min-h-14 w-full rounded-2xl text-[1.0625rem]",
        icon: "min-h-11 min-w-11 h-11 w-11",
        "icon-round": "min-h-11 min-w-11 h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
