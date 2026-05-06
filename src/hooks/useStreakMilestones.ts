// useStreakMilestones — detektuje prelaz streak-a preko milestone thresholds
// Spec: WS-8 G10 — Habit Tracker achievement-unlock pattern iz ui-ux-pro-max row 94
//
// Trigger logic: kad se streak promeni i pređe sledeći threshold, vraća objekat sa
// podacima za AchievementOverlay. Storage ključ u localStorage sprečava duplikate.

import { useEffect, useRef, useState } from "react";
import { Flame, Trophy, Zap, Crown, Dumbbell } from "lucide-react";
import type { AchievementMilestone } from "@/components/AchievementOverlay";

const MILESTONE_THRESHOLDS: {
  threshold: number;
  build: () => AchievementMilestone;
}[] = [
  {
    threshold: 3,
    build: () => ({
      id: "streak-3",
      title: "Rookie",
      description: "3 dana zaredom — početak je najteži.",
      icon: Flame,
    }),
  },
  {
    threshold: 10,
    build: () => ({
      id: "streak-10",
      title: "Getting Serious",
      description: "10 dana zaredom — sad vidiš razliku.",
      icon: Flame,
    }),
  },
  {
    threshold: 50,
    build: () => ({
      id: "streak-50",
      title: "Locked In",
      description: "50 dana zaredom — režim je u DNK.",
      icon: Dumbbell,
    }),
  },
  {
    threshold: 100,
    build: () => ({
      id: "streak-100",
      title: "Triple Threat",
      description: "100 dana zaredom — legendarno.",
      icon: Trophy,
    }),
  },
  {
    threshold: 365,
    build: () => ({
      id: "streak-365",
      title: "No Days Off",
      description: "365 dana — cela godina posvećenosti.",
      icon: Zap,
    }),
  },
  {
    threshold: 1000,
    build: () => ({
      id: "streak-1000",
      title: "Immortal",
      description: "1000 dana — izvan statistike.",
      icon: Crown,
    }),
  },
];

const STORAGE_KEY = "fitbyivana:streak-milestones-earned";

function loadEarned(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function persistEarned(earned: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(earned)));
  } catch {
    // storage full / denied — tih fallback, nema retry-ja
  }
}

/**
 * Prati streak i, kada on pređe novi milestone threshold (koji korisnik
 * još nije dobio), vraća `milestone` objekat za overlay.
 *
 * Korisnik poziva `dismissMilestone()` da ga zatvori (ili se automatski
 * zatvori posle autoDismissMs iz overlay-a).
 */
export const useStreakMilestones = (streak: number) => {
  const [milestone, setMilestone] = useState<AchievementMilestone | null>(null);
  const earnedRef = useRef<Set<string>>(loadEarned());
  const prevStreakRef = useRef<number>(streak);

  useEffect(() => {
    const prev = prevStreakRef.current;
    prevStreakRef.current = streak;

    // Samo kad je streak PORASTAO
    if (streak <= prev) return;

    // Pronađi NAJVEĆI threshold koji smo upravo prešli (da ne pikamo sve)
    const crossed = [...MILESTONE_THRESHOLDS]
      .reverse()
      .find((m) => streak >= m.threshold && !earnedRef.current.has(m.build().id));

    if (!crossed) return;

    const m = crossed.build();
    earnedRef.current.add(m.id);
    persistEarned(earnedRef.current);
    setMilestone(m);
  }, [streak]);

  return {
    milestone,
    dismissMilestone: () => setMilestone(null),
  };
};
