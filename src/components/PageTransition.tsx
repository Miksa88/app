// PageTransition — iOS push/pop slide animacija između ruta
// Spec: design-system/MASTER.md §7 Apple-native HIG (v5.0)
//
// iOS UINavigationController pattern:
//   - PUSH (ideš dublje): novi ekran klizi sa desne (x: 100%), stari blago klizi levo (x: -30%)
//     → daje osećaj "ulazim u sloj"
//   - POP (vraćaš se): novi ekran klizi sa leve (x: -30%), stari klizi desno (x: 100%)
//     → daje osećaj "izlazim iz sloja"
//   - REPLACE: fade (bez pravca)
//
// Trajanje: 350ms sa cubic-bezier(0.32, 0.72, 0, 1) — iOS UIKit default ("easeOutExpo")
// Respektuje prefers-reduced-motion — instant switch.

import { useLocation, useNavigationType } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { type ReactNode } from "react";
import { shouldReduceMotion , MOTION_DURATION} from "@/lib/motion";

interface Props {
  children: ReactNode;
}

/**
 * Wrap Routes (ili unutar Routes) za iOS-style page tranzicije.
 * MORA biti unutar BrowserRouter jer koristi useLocation + useNavigationType.
 */
export const PageTransition = ({ children }: Props) => {
  const location = useLocation();
  const navType = useNavigationType(); // "PUSH" | "POP" | "REPLACE"
  const reduced = shouldReduceMotion();

  // Bez animacije za reduced-motion korisnice
  if (reduced) {
    return <>{children}</>;
  }

  // iOS standard curve — "easeOutExpo"
  const IOS_EASE = [0.32, 0.72, 0, 1] as const;

  const variants = {
    // PUSH: novi ulazi sa desne, stari gura levo
    pushInitial: { x: "100%", opacity: 1 },
    // POP: novi ulazi sa leve (onaj koji je bio "ispod"), stari gura desno
    popInitial: { x: "-30%", opacity: 1 },
    // REPLACE: nema pravca
    replaceInitial: { opacity: 0 },
    center: { x: 0, opacity: 1 },
    // Exit zavisi od smer-a — setuje se dinamički
    pushExit: { x: "-30%", opacity: 1 },
    popExit: { x: "100%", opacity: 1 },
    replaceExit: { opacity: 0 },
  };

  const initial =
    navType === "POP" ? variants.popInitial :
    navType === "REPLACE" ? variants.replaceInitial :
    variants.pushInitial;

  const exit =
    navType === "POP" ? variants.popExit :
    navType === "REPLACE" ? variants.replaceExit :
    variants.pushExit;

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={location.pathname}
        initial={initial}
        animate={variants.center}
        exit={exit}
        transition={{ duration: MOTION_DURATION.slow, ease: IOS_EASE }}
        style={{ position: "absolute", inset: 0, overflowY: "auto" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
