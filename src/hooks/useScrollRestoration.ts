// useScrollRestoration — preserve scroll position across client-side navigations
// Spec: design-system/MASTER.md §3.4 (Scroll restoration)
//
// React Router v6 ne radi auto scroll-restore sa <BrowserRouter> + <Routes>.
// Ovaj hook:
//   1. Snima scrollY u sessionStorage po path-u pre svake POP navigacije
//   2. Vraća ga kad se korisnik vrati na taj path (via back button)
//   3. Na PUSH/NEW navigaciju skroluje na top (standardno)

import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const KEY_PREFIX = "fitbyivana.scroll:";

export const useScrollRestoration = () => {
  const { pathname, key } = useLocation();
  const navigationType = useNavigationType(); // "POP" | "PUSH" | "REPLACE"
  const prevKeyRef = useRef<string | null>(null);

  // Snimi scroll pre napuštanja trenutne lokacije
  useEffect(() => {
    const save = () => {
      if (prevKeyRef.current) {
        sessionStorage.setItem(`${KEY_PREFIX}${prevKeyRef.current}`, String(window.scrollY));
      }
    };
    window.addEventListener("beforeunload", save);
    return () => {
      save();
      window.removeEventListener("beforeunload", save);
    };
  }, [pathname]);

  // Restore ili scroll-to-top po tipu navigacije
  useEffect(() => {
    if (navigationType === "POP") {
      const saved = sessionStorage.getItem(`${KEY_PREFIX}${key}`);
      if (saved) {
        // requestAnimationFrame da DOM stigne da se renderuje
        requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10)));
      }
    } else {
      window.scrollTo(0, 0);
    }
    prevKeyRef.current = key;
  }, [key, navigationType]);
};
