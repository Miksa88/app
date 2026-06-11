// logger.ts — centralni logging util (Faza 0.5, PLAN_RADA_WHITELABEL.md)
//
// Pravilo: u src/ se NIKAD ne zove console.* direktno — uvek kroz logger.
// dev:  sve ide u konzolu.
// prod: debug/info/warn su no-op; error ide u Sentry (ako je inicijalizovan).

import * as Sentry from "@sentry/react";

const isDev = import.meta.env.DEV;

/* eslint-disable no-console */
export const logger = {
  debug(...args: unknown[]) {
    if (isDev) console.debug(...args);
  },
  info(...args: unknown[]) {
    if (isDev) console.info(...args);
  },
  warn(...args: unknown[]) {
    if (isDev) console.warn(...args);
  },
  error(...args: unknown[]) {
    if (isDev) console.error(...args);
    const err = args.find((a) => a instanceof Error);
    Sentry.captureException(err ?? new Error(args.map(String).join(" ")));
  },
};
/* eslint-enable no-console */
