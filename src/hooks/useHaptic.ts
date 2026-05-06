// useHaptic — platform-aware haptic feedback
// Spec: design-system/MASTER.md §6.4 + §7 (Capacitor iOS)
//
// Prioritet detekcije:
//   1. Native iOS (Capacitor) — koristi @capacitor/haptics (pravi iOS Haptic Engine)
//   2. Android PWA / Capacitor Android — Vibration API
//   3. Web (desktop / iOS Safari van Capacitor-a) — Vibration API ili no-op
//
// Respektuje prefers-reduced-motion kroz shouldReduceMotion() — korisnice koje
// su isključile vibration/animations dobijaju no-op.

import { useCallback } from "react";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";
import { shouldReduceMotion } from "@/lib/motion";

type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

/** Web Vibration API fallback patterns (ms). */
const WEB_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 30,
  heavy: 50,
  selection: 5,
  success: [50, 30, 50],
  warning: [100, 50, 100],
  error: [100, 50, 100, 50, 100],
};

/**
 * Haptic feedback hook. Pozovi sa pattern tipom:
 *
 *   const haptic = useHaptic();
 *   haptic("success");  // set-complete, meal-eaten
 *   haptic("light");    // tap, card press
 *   haptic("warning");  // validation fail
 *
 * Patterns:
 *   - light       — tap, card press                        (iOS: UIImpactFeedbackStyle.light)
 *   - medium      — toggle, select, water add              (iOS: .medium)
 *   - heavy       — delete, destructive action             (iOS: .heavy)
 *   - selection   — pickers, slider ticks                  (iOS: selection feedback)
 *   - success     — set-complete, save, form submit        (iOS: notification.success)
 *   - warning     — validation error, unsaved alert        (iOS: notification.warning)
 *   - error       — critical error, broken action          (iOS: notification.error)
 */
export const useHaptic = () => {
  return useCallback(async (pattern: HapticPattern = "light") => {
    if (typeof window === "undefined") return;
    if (shouldReduceMotion()) return;

    // Prefer native iOS Haptic Engine kad smo u Capacitor-u (Android isto podržava)
    if (Capacitor.isNativePlatform()) {
      try {
        switch (pattern) {
          case "light":
            await Haptics.impact({ style: ImpactStyle.Light });
            return;
          case "medium":
            await Haptics.impact({ style: ImpactStyle.Medium });
            return;
          case "heavy":
            await Haptics.impact({ style: ImpactStyle.Heavy });
            return;
          case "selection":
            await Haptics.selectionStart();
            await Haptics.selectionEnd();
            return;
          case "success":
            await Haptics.notification({ type: NotificationType.Success });
            return;
          case "warning":
            await Haptics.notification({ type: NotificationType.Warning });
            return;
          case "error":
            await Haptics.notification({ type: NotificationType.Error });
            return;
        }
      } catch {
        // Neki uređaji ne podržavaju haptic — tih fallback
        return;
      }
    }

    // Web fallback — Vibration API (Android Chrome/FF radi, iOS Safari ignoriše)
    const nav = window.navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
    if (typeof nav.vibrate === "function") {
      nav.vibrate(WEB_PATTERNS[pattern]);
    }
  }, []);
};
