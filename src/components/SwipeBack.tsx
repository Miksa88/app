// SwipeBack — iOS edge swipe-to-go-back gesture za React pages (WS-6)
// Spec: design-system/MASTER.md §7 Capacitor iOS
//
// iOS native ima edge-pan gesture koji vraća nazad. U WebView-u Safari ovo
// blokira da bi browser back radio — moramo custom.
//
// Pattern:
//   1. Korisnik povlači prstom sa leve ivice ekrana desno
//   2. Threshold: mora krenuti u prvih 20px ekrana levo (edge detect)
//   3. Mora preći 40% širine ekrana ILI imati velocity > 0.5 da trigger-uje
//   4. Poziva onSwipeBack() callback (obično navigate(-1))
//
// Respektuje prefers-reduced-motion (no animacije, direktan navigate-back).

import { useRef, useEffect, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { shouldReduceMotion } from "@/lib/motion";

interface Props {
  onSwipeBack: () => void;
  enabled?: boolean;
  children: ReactNode;
  /** Koliko close od leve ivice mora biti touch start (px). Default 24. */
  edgeThreshold?: number;
  /** Koliko % ekrana mora preći da se trigger-uje back. Default 0.4 */
  distanceThreshold?: number;
}

/**
 * Wrap-uj page content u SwipeBack da omogući iOS-style edge swipe.
 *
 * Primer:
 *   <SwipeBack onSwipeBack={() => navigate(-1)}>
 *     <div className="page-content">...</div>
 *   </SwipeBack>
 */
export const SwipeBack = ({
  onSwipeBack,
  enabled = true,
  children,
  edgeThreshold = 24,
  distanceThreshold = 0.4,
}: Props) => {
  const x = useMotionValue(0);
  // Paralel fade za content tokom drag-a (daje osećaj "stari ekran ispod")
  const opacity = useTransform(x, [0, window.innerWidth * 0.6], [1, 0.7]);
  const startX = useRef<number | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = shouldReduceMotion();
  }, []);

  if (!enabled) return <>{children}</>;

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch && touch.clientX <= edgeThreshold) {
      startX.current = touch.clientX;
    } else {
      startX.current = null;
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (startX.current === null) {
      x.set(0);
      return;
    }
    const distance = info.offset.x;
    const velocity = info.velocity.x;
    const screenWidth = window.innerWidth;
    const shouldTrigger = distance > screenWidth * distanceThreshold || velocity > 500;

    if (shouldTrigger) {
      onSwipeBack();
    } else {
      x.set(0); // snap back
    }
    startX.current = null;
  };

  return (
    <motion.div
      style={{ x: reduced.current ? 0 : x, opacity: reduced.current ? 1 : opacity }}
      drag={reduced.current ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      dragDirectionLock
      onTouchStart={handleTouchStart}
      onDragEnd={handleDragEnd}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
};
