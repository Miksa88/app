import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config — fitbyivana iOS app (WS-6)
 * Spec: design-system/MASTER.md §7 Capacitor iOS
 *
 * Bundle ID convention: com.fitbyivana.app
 * Update verziju ovde pre svakog App Store submitta.
 */
const config: CapacitorConfig = {
  appId: "com.fitbyivana.app",
  appName: "fitbyivana",
  webDir: "dist",
  bundledWebRuntime: false,
  ios: {
    // WKWebView je već default u novijim verzijama — explicit
    contentInset: "always",
    // Scroll enabled — Apple native pattern
    scrollEnabled: true,
    // App Tracking Transparency kad budemo dodavali analytics
    limitsNavigationsToAppBoundDomains: false,
    // Apple-native: bela pozadina iza WebView-a (safe-area fallback).
    // ThemeProvider bi trebalo da menja ovo kroz native StatusBar API za dark mode.
    backgroundColor: "#FFFFFF",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#FFFFFF",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      iosContentMode: "scaleAspectFill",
      // Apple-native: fade out, ne nagli switch
      fadeOutDuration: 300,
    },
    Keyboard: {
      // iOS: prilagodi layout kad se keyboard pojavi (ne zakrij input)
      resize: "native",
      resizeOnFullScreen: true,
      style: "default",
      // Sakrij accessory bar (Previous/Next/Done) — koristimo Return key
      hideAccessoryBar: true,
    },
    StatusBar: {
      // Apple-native: crni tekst (sat, wifi, baterija) čitljiv na beloj pozadini.
      // ThemeProvider će prebaciti na "light" (beli tekst) kad korisnica uđe u dark mode.
      style: "dark",
      overlaysWebView: true,
    },
  },
  server: {
    // HTTPS u production; u dev-u koristiš localhost preko Xcode simulator-a
    androidScheme: "https",
    iosScheme: "https",
  },
};

export default config;
