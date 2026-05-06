// sentry.ts — crash reporting setup (WS-3)
// Spec: design-system/MASTER.md §2.7 (ErrorBoundary + Sentry)
//
// Init u main.tsx pre root render-a. DSN iz env-a (VITE_SENTRY_DSN).
// Ako DSN nije postavljen, Sentry je no-op (safe u developmentu bez DSN-a).

import * as Sentry from "@sentry/react";

let sentryInitialized = false;

export const initSentry = () => {
  try {
    const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
    const env = import.meta.env.MODE;

    if (!dsn) {
      // eslint-disable-next-line no-console
      console.info("[Sentry] DSN nije postavljen — crash reporting isključen.");
      return;
    }

    Sentry.init({
      dsn,
      environment: env,
      tracesSampleRate: env === "production" ? 0.1 : 1.0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
    });
    sentryInitialized = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[Sentry] init failed:", err);
  }
};

export const captureError = (error: Error, context?: Record<string, unknown>) => {
  // Guard — ako Sentry nije inicijalizovan (DSN missing), preskoči.
  // Sprečava crash u ErrorBoundary-u kad se crash-report pokuša bez Sentry setup-a.
  if (!sentryInitialized) return;
  try {
    Sentry.captureException(error, { contexts: context ? { extra: context } : undefined });
  } catch {
    // silent — ne ulaziti u cascade
  }
};
