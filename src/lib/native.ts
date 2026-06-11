// native.ts — Capacitor native layer initialization (WS-6)
// Spec: design-system/MASTER.md §7 Capacitor iOS
//
// Pozvan iz main.tsx pre prvog render-a. Konfiguriše:
//   - Status bar style (prati theme)
//   - Splash screen hide (kad React zaraste)
//   - Keyboard behavior (resize layout, hide accessory bar)
//   - App state listeners (za background/foreground tranzicije)

import { logger } from "@/lib/logger";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard } from "@capacitor/keyboard";
import { App } from "@capacitor/app";

const isNative = () => Capacitor.isNativePlatform();

/**
 * Inicijalizacija native layer-a — idempotentno.
 * Ako nismo u Capacitor-u (pretraživač / desktop), sve je no-op.
 */
export const initNative = async () => {
  if (!isNative()) return;

  try {
    // Apple-native: WebView ekstendira ispod status bar-a (overlay mode).
    // Content mora poštovati env(safe-area-inset-top) kroz .safe-top utility ili
    // page-level padding-top. Status bar postaje proziran.
    await StatusBar.setOverlaysWebView({ overlay: true });
    // Initial: Dark style = crni tekst (za svetlu pozadinu). ThemeProvider će
    // menjati kroz syncStatusBarWithTheme() kad korisnica menja theme.
    await StatusBar.setStyle({ style: Style.Dark });

    // Sakrij splash screen čim je prvi render gotov (odloženo 200ms da izbegne FOUC)
    setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 200 });
    }, 200);

    // Keyboard — sakrij accessory bar (Previous/Next/Done) jer Return service-uje
    Keyboard.setAccessoryBarVisible({ isVisible: false });
    // Scroll event na keyboard show
    Keyboard.addListener("keyboardWillShow", () => {
      document.body.classList.add("keyboard-open");
    });
    Keyboard.addListener("keyboardWillHide", () => {
      document.body.classList.remove("keyboard-open");
    });

    // App state — kad se aplikacija vrati u foreground, trigger refresh-a može ići ovde
    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        // Backend će preuzeti refresh logiku kasnije
        document.body.dispatchEvent(new CustomEvent("app:foreground"));
      } else {
        document.body.dispatchEvent(new CustomEvent("app:background"));
      }
    });

    // Deep link handling — za push notifications + universal links
    App.addListener("appUrlOpen", (event) => {
      // Router će preuzeti kad backend zakači
      document.body.dispatchEvent(new CustomEvent("app:urlOpen", { detail: event.url }));
    });
  } catch (err) {
    logger.warn("[native] init failed:", err);
  }
};

/**
 * Theme sync — pozvan iz ThemeContext kad korisnica menja theme.
 * Status bar mora pratiti background da tekst (sati, baterija) bude čitljiv.
 */
export const syncStatusBarWithTheme = async (theme: "light" | "dark") => {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({
      style: theme === "dark" ? Style.Light : Style.Dark, // Light = beli text; Dark = crni text
    });
  } catch {
    // silent
  }
};
