import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// DESIGN_AUDIT Iter 2f hotfix — custom typography tokeni (text-body, text-title-*, text-nav-*,
// text-display-*, text-caption-*, text-headline, text-callout, text-subhead, text-footnote, text-large-title)
// moraju biti u 'font-size' bucket-u da NE konfliktuju sa color klasama (text-primary-foreground itd).
// Default twMerge klasifikuje SVE `text-*` klase u isti bucket → brisao je color kad je iOS typography bio drugi.
const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: [
          "large-title",
          "title-1", "title-2", "title-3",
          "headline",
          "body",
          "callout",
          "subhead",
          "footnote",
          "caption-1", "caption-2", "caption-micro",
          "nav-title", "nav-action",
          "display-lg", "display-xl", "display-2xl",
        ] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}
