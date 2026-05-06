// useScrollEdge — iOS 15+ NavigationBar scroll edge appearance
// Spec: Apple HIG Navigation bars ("scrollEdgeAppearance" vs "standardAppearance")
//
// Returns:
//   - `scrolled`: boolean — over threshold (za discrete state flag)
//   - `scrollProgress`: 0..1 — continuous mapping za smooth fade animacije (iOS 26 premium)
//
// iOS native equivalent:
//   UINavigationBar.scrollEdgeAppearance = transparent (top)
//   UINavigationBar.standardAppearance = blur (scrolled)
//   SwiftUI: .toolbarBackground(.automatic, for: .navigationBar)

import { useEffect, useState } from "react";

interface Options {
  /** Scroll distance u px pre nego header prebaci na "standard" appearance */
  threshold?: number;
  /** Scroll distance preko koga `scrollProgress` dostiže 1 (default 60px — iOS native osećaj) */
  fadeDistance?: number;
  /** Custom scroll container (default: window) */
  container?: HTMLElement | null;
}

interface ScrollEdgeState {
  scrolled: boolean;
  scrollProgress: number;
}

export const useScrollEdge = ({
  threshold = 4,
  fadeDistance = 60,
  container,
}: Options = {}): ScrollEdgeState => {
  const [state, setState] = useState<ScrollEdgeState>({ scrolled: false, scrollProgress: 0 });

  useEffect(() => {
    const target: HTMLElement | Window = container ?? window;

    const getScrollY = (): number => {
      if (target === window) return window.scrollY;
      return (target as HTMLElement).scrollTop;
    };

    const check = () => {
      const y = getScrollY();
      const progress = Math.max(0, Math.min(1, y / fadeDistance));
      setState({ scrolled: y > threshold, scrollProgress: progress });
    };

    check();
    target.addEventListener("scroll", check, { passive: true });
    return () => target.removeEventListener("scroll", check);
  }, [threshold, fadeDistance, container]);

  return state;
};
