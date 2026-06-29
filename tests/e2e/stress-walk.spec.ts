// ============================================================================
// stress-walk.spec.ts — deep stress walk of every client route
// ============================================================================
// Goes BEYOND real-user-walk (which only checks for a visible ErrorBoundary):
// for each route it captures
//   - console.error messages
//   - pageerror (unhandled exceptions / unhandled promise rejections)
//   - failed network requests (HTTP >= 400 and outright request failures)
// and fails the test if any route produced a hard error.
//
// This is the "stress" probe for the autonomous fix loop. Run:
//   npx playwright test stress-walk.spec.ts --reporter=list
// ============================================================================

import { test, expect, type Page, type ConsoleMessage, type Request } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";

// Client routes the beta test user (a client) can actually reach.
// Trainer routes are excluded — a client gets redirected away from them.
const CLIENT_ROUTES = [
  "/home",
  "/gym",
  "/food",
  "/chat",
  "/profile",
  "/progress",
  "/weekly-check-in",
  "/meal-plan",
  "/shopping",
  "/subscription",
];

// Console-error substrings that are known third-party / dev-only noise and
// must NOT count as app failures. Keep this list tight and justified.
const CONSOLE_NOISE = [
  /Download the React DevTools/i,
  /\[vite\] connect/i,
  /favicon\.ico/i,
];

// Network failures that are expected/benign and must not fail the walk.
// PostgREST returns 406 for `.single()` with zero rows; that is app-level
// "no data yet", not a broken endpoint.
const NETWORK_NOISE = [
  /favicon\.ico/i,
];

interface RouteFinding {
  route: string;
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
}

function isNoise(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

async function walkRoute(page: Page, route: string): Promise<RouteFinding> {
  const finding: RouteFinding = {
    route,
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
  };

  const onConsole = (msg: ConsoleMessage): void => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isNoise(text, CONSOLE_NOISE)) return;
    finding.consoleErrors.push(text);
  };
  const onPageError = (err: Error): void => {
    finding.pageErrors.push(err.message);
  };
  const onRequestFailed = (req: Request): void => {
    const url = req.url();
    if (isNoise(url, NETWORK_NOISE)) return;
    const errText = req.failure()?.errorText ?? "failed";
    // net::ERR_ABORTED == request cancelled because the SPA navigated away
    // before it settled. That is inherent to fast route-to-route walking,
    // not an app failure. Real server rejections surface via onResponse (>=400).
    if (/ERR_ABORTED/i.test(errText)) return;
    finding.failedRequests.push(`${req.method()} ${url} — ${errText}`);
  };
  const onResponse = (res: { status(): number; url(): string; request(): Request }): void => {
    const status = res.status();
    if (status < 400) return;
    const url = res.url();
    if (isNoise(url, NETWORK_NOISE)) return;
    // 406 from PostgREST `.single()` with no rows is benign "no data yet".
    if (status === 406) return;
    finding.failedRequests.push(`HTTP ${status} ${res.request().method()} ${url}`);
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  await page.goto(route);
  // Let lazy chunks, data fetches, and realtime subscriptions settle.
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1200);

  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  page.off("requestfailed", onRequestFailed);
  page.off("response", onResponse);

  return finding;
}

test("stress walk — every client route is free of console/page/network errors", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAsTestUser(page);
  await page.waitForURL(/\/home/, { timeout: 15_000 });

  const findings: RouteFinding[] = [];
  for (const route of CLIENT_ROUTES) {
    const f = await walkRoute(page, route);
    findings.push(f);
    const total = f.consoleErrors.length + f.pageErrors.length + f.failedRequests.length;
    // eslint-disable-next-line no-console
    console.log(`[stress] ${route}: ${total === 0 ? "clean" : `${total} issue(s)`}`);
    for (const e of f.pageErrors) console.log(`[stress]   pageerror: ${e}`);
    for (const e of f.consoleErrors) console.log(`[stress]   console.error: ${e}`);
    for (const e of f.failedRequests) console.log(`[stress]   network: ${e}`);
  }

  const broken = findings.filter(
    (f) => f.consoleErrors.length + f.pageErrors.length + f.failedRequests.length > 0,
  );
  const summary = broken
    .map((f) => `${f.route} (${f.consoleErrors.length} console, ${f.pageErrors.length} pageerror, ${f.failedRequests.length} network)`)
    .join("; ");

  expect(broken, `Routes with errors: ${summary}`).toHaveLength(0);
});
