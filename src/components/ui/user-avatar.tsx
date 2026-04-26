// UserAvatar — unified avatar sa optional status dot + ring
// Spec: design-system/MASTER.md §3 — Patterns
//
// Varijante:
//   - initial avatar (first char of name in gradient circle)
//   - image avatar (trainer photo, client photo)
//   - status dot (active/trial/paused/offline)
//   - ring (gradient za prominent, subtle za sidebar)
//
// A11y (WS-8 G2): status dot nije isključivo vizuelan.
//   - Kada postoji status, root dobija aria-label "<name>, <status>"
//     tako da screen reader čita status uz ime.
//   - Status dot i dalje aria-hidden (redundantno za SR).
//   - Rule reference: ui-ux-pro-max `color-not-only` + WCAG SC 1.4.1.

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
type AvatarStatus = "active" | "trial" | "paused" | "offline" | null;

interface Props {
  /** Prikaz inicijala (uzima prvi karakter) */
  name?: string;
  /** URL slike (ako je postavljeno, koristi image umesto inicijala) */
  imageUrl?: string;
  /** Alt text za image */
  alt?: string;
  /** Size preset */
  size?: AvatarSize;
  /** Status dot (ako je postavljen, prikazuje malu tačku dole-desno) */
  status?: AvatarStatus;
  /** Prikaži ring (gradient ili subtle) */
  showRing?: boolean | "subtle";
  /** Custom background (default je gradient-primary) */
  backgroundClass?: string;
  /** Custom content override */
  children?: ReactNode;
  className?: string;
  /** Eksplicitni aria-label override (ako nije zadat, generiše se iz name + status) */
  ariaLabel?: string;
  /** Framer Motion layoutId za shared element transitions (WS-8 D13).
      Napomena: za cross-route transitions treba obaviti <Routes> u <AnimatePresence>
      u App.tsx — intra-page rad iz kutije. */
  layoutId?: string;
}

const SIZE_CLASSES: Record<AvatarSize, { container: string; text: string; dot: string }> = {
  xs: { container: "w-8 h-8", text: "text-caption-1", dot: "w-2 h-2 -bottom-0 -right-0" },
  sm: { container: "w-10 h-10", text: "text-footnote", dot: "w-2.5 h-2.5 -bottom-0 -right-0" },
  md: { container: "w-12 h-12", text: "text-body", dot: "w-3 h-3 -bottom-0.5 -right-0.5" },
  lg: { container: "w-16 h-16", text: "text-title-2", dot: "w-3.5 h-3.5 -bottom-0.5 -right-0.5" },
  xl: { container: "w-20 h-20", text: "text-title-1", dot: "w-4 h-4 -bottom-0.5 -right-0.5" },
};

const STATUS_BG: Record<Exclude<AvatarStatus, null>, string> = {
  active: "bg-success",
  trial: "bg-warning",
  paused: "bg-muted-foreground",
  offline: "bg-muted-foreground/40",
};

export const UserAvatar = ({
  name,
  imageUrl,
  alt,
  size = "md",
  status = null,
  showRing = false,
  backgroundClass,
  children,
  className = "",
  ariaLabel,
  layoutId,
}: Props) => {
  const { t } = useLanguage();
  const s = SIZE_CLASSES[size];
  // iOS HIG: avatari u list/nav kontekstima NE koriste ring (Apple Messages, Contacts,
  // Fitness, itd.). `showRing="subtle"` je jedini dozvoljen — za avatare nad
  // šarenim gradient hero-ima, kada treba kontrast (bela 30% opacity).
  // Default `showRing={true}` je deprecated — koristi `showRing="subtle"` gde je potrebno.
  const ringClass =
    showRing === "subtle"
      ? "ring-2 ring-white/30"
      : showRing === true
      ? "ring-2 ring-white/30"  // fallback na subtle (iOS HIG — no primary/20 ring u standard kontekstu)
      : "";

  const content =
    children ??
    (imageUrl ? (
      <img
        src={imageUrl}
        alt={alt ?? name ?? "Avatar"}
        className="w-full h-full rounded-full object-cover"
      />
    ) : (
      <span className={`${s.text} font-bold text-primary-foreground`} aria-hidden={!!name}>
        {name?.charAt(0).toUpperCase() ?? "?"}
      </span>
    ));

  // Compute accessible label:
  //   - explicit ariaLabel wins
  //   - else (name + status) yields "Sarah, aktivna"
  //   - else name alone
  //   - else fall back to image-alt path (no label needed, <img> handles it)
  const computedLabel =
    ariaLabel ??
    (name && status
      ? `${name}, ${t(`userStatus.${status}`)}`
      : name
      ? name
      : undefined);

  const innerClassName = `${s.container} rounded-full flex items-center justify-center overflow-hidden ${
    imageUrl ? "" : backgroundClass ?? "gradient-primary"
  } ${ringClass}`;

  return (
    <div
      className={`relative shrink-0 ${className}`}
      role={computedLabel ? "img" : undefined}
      aria-label={computedLabel}
    >
      {layoutId ? (
        <motion.div layoutId={layoutId} className={innerClassName}>
          {content}
        </motion.div>
      ) : (
        <div className={innerClassName}>{content}</div>
      )}
      {status && (
        <span
          aria-hidden="true"
          className={`absolute ${s.dot} rounded-full ring-2 ring-card ${STATUS_BG[status]}`}
        />
      )}
    </div>
  );
};
