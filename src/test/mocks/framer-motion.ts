// ============================================================================
// framer-motion mock za component testove
// ============================================================================
//
// jsdom ne implementira layout/animation API-je koje framer-motion očekuje,
// pa animacije mogu da budu izvor nedeterminizma. Ovaj mock zamenjuje
// motion.* elemente običnim DOM tagovima (strip-uje motion props) i
// AnimatePresence renderuje decu odmah — bez enter/exit faza.
//
// Upotreba u test fajlu:
//   vi.mock("framer-motion", () => import("@/test/mocks/framer-motion"));
// ============================================================================

import React from "react";

const passthrough = (tag: string) =>
  React.forwardRef(
    (
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: React.ForwardedRef<HTMLElement>,
    ) => {
      const {
        initial: _initial,
        animate: _animate,
        exit: _exit,
        transition: _transition,
        whileTap: _whileTap,
        whileHover: _whileHover,
        whileInView: _whileInView,
        viewport: _viewport,
        layout: _layout,
        layoutId: _layoutId,
        ...rest
      } = props;
      return React.createElement(tag, { ...rest, ref });
    },
  );

export const motion = new Proxy(
  {},
  {
    get: (_t, key: string | symbol) => passthrough(String(key)),
  },
) as Record<string, ReturnType<typeof passthrough>>;

export const AnimatePresence = ({ children }: { children?: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);
