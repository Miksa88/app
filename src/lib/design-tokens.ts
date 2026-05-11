// ============================================================================
// design-tokens.ts — type-safe design system constants
// Spec: WS-1 Foundation Closeout (design-system/MASTER.md §1.7)
// ============================================================================
//
// Koristi ove konstante umesto magic number-a za sizing ikona, Z-indeksa itd.
// Lucide React `size` prop prima broj → ovo garantuje 3 token-a preko app-a.
//
// Primer:
//   <Home size={ICON_SIZE.md} />   umesto <Home size={20} />
// ============================================================================

/**
 * Lucide icon size tokens. Tri veličine:
 * - sm (16px) — inline u text/caption, sidebar linkovi
 * - md (20px) — body tekst, buttons, default
 * - lg (24px) — headings, large actions, hero CTAs
 */
export const ICON_SIZE = {
  /** 14px — inline u caption text, badge */
  xs: 14,
  /** 16px — inline u body text, button tekst */
  sm: 16,
  /** 20px — default za buttons, cards, menu rows */
  md: 20,
  /** 24px — headings, large actions, back button */
  lg: 24,
  /** 28px — nav bar active icon (iOS 26 Liquid Glass spec) */
  xl: 28,
} as const;

export type IconSize = typeof ICON_SIZE[keyof typeof ICON_SIZE];

/**
 * Z-index scale. Kreiraj layer-e, ne proizvoljne vrednosti.
 * Redosled (niže → više): base → sticky → dropdown → sheet → modal → toast.
 */
export const Z_INDEX = {
  base: 0,
  sticky: 10,
  dropdown: 20,
  sheet: 40,
  modal: 100,
  toast: 1000,
} as const;

export type ZIndex = typeof Z_INDEX[keyof typeof Z_INDEX];

// ============================================================================
// MACRO_COLORS — DESIGN_AUDIT v2 L1
// Single source of truth za protein/carb/fat color tokene (WS-8 D14 rotation:
// BLUE / ORANGE / YELLOW industry standard). Ne dupliciraj lokalno po fajlu.
// ============================================================================

export const MACRO_COLORS = {
  protein: {
    bg: "bg-macro-protein",
    text: "text-macro-protein",
    fg: "text-white",
    border: "border-macro-protein",
  },
  carb: {
    bg: "bg-macro-carb",
    text: "text-macro-carb",
    fg: "text-white",
    border: "border-macro-carb",
  },
  fat: {
    bg: "bg-macro-fat",
    text: "text-macro-fat",
    fg: "text-white",
    border: "border-macro-fat",
  },
} as const;

export type MacroColorKey = keyof typeof MACRO_COLORS;

// ============================================================================
// STATUS_SOFT — DESIGN_AUDIT v2 L1
// "Soft" status style: tinted background (opacity 12%) + colored text.
// Koristi se za chip-ove, banner-e, badge-ove gde žeimo blagu semantic notu.
// ============================================================================

export const STATUS_SOFT = {
  info:    "bg-info/12 text-info",
  warning: "bg-warning/12 text-warning-foreground",
  success: "bg-success/12 text-success",
  danger:  "bg-destructive/12 text-destructive",
} as const;

export type StatusSoftKey = keyof typeof STATUS_SOFT;

// ============================================================================
// RADIUS — 3-tier scale (UI audit 2026-05-11 Pillar 2)
// Card-level surfaces, pill controls, chip/icon containers.
// Koristi ove utility-je umesto inline rounded-* da bi svuda imao istu skalu.
// ============================================================================

export const RADIUS = {
  /** Hero surfaces, signature paywall/analysis cards — rounded-3xl. */
  hero: "rounded-3xl",
  /** Cards, modals, large sheets — rounded-2xl. */
  card: "rounded-2xl",
  /** Pills, status badges — rounded-full. */
  pill: "rounded-full",
  /** Chips, icon containers, sub-buttons — rounded-xl. */
  chip: "rounded-xl",
  /** Inline tags, small icons — rounded-lg. */
  inline: "rounded-lg",
} as const;

export type RadiusKey = keyof typeof RADIUS;

// ============================================================================
// IOS_SWITCH — track + thumb sizing (UI audit 2026-05-11 Pillar 5)
// Apple iOS HIG metrics; jedan source-of-truth za sve switch toggle UI.
// ============================================================================

export const IOS_SWITCH = {
  track: "w-[51px] h-[31px]",
  thumb: "w-[27px] h-[27px]",
} as const;

// ============================================================================
// HERO_PADDING — top-of-page hero block padding (UI audit 2026-05-11 Pillar 5)
// Uniformno koristi `pt-3` posle PageHeader, `pt-14` kad nema PageHeader-a.
// ============================================================================

export const HERO_PADDING = {
  /** Kad ekran ima PageHeader iznad — vec ima safe-area + sticky chrome. */
  afterHeader: "pt-2",
  /** Kad ekran nema PageHeader (Home) — treba safe-area inset. */
  standalone: "pt-14",
} as const;
