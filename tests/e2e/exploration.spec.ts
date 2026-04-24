// ============================================================================
// exploration.spec.ts — smoke test svih rute, uhvati crash-ove
// ============================================================================
//
// Nije precizan assertion — samo pokušaj da se rute otvore bez:
//   - ErrorBoundary fallback rendera
//   - Console error-a kritičnih
//   - Page crash
//
// Ovo je "canary" za basic health check — pokriva što Ralph QA nije proveravao.
// ============================================================================

import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";

const CLIENT_ROUTES = [
  "/home",
  "/gym",
  "/food",
  "/progress",
  "/milestones",
  "/profile",
  "/chat",
  "/weekly-check-in",
];

const TRAINER_ROUTES = [
  "/trainer",
  "/trainer/clients",
  "/trainer/training",
  "/trainer/nutrition",
  "/trainer/messages",
  "/trainer/analytics",
  "/trainer/payments",
  "/trainer/profile",
  "/trainer/packages",
];

test.describe("Route exploration (smoke)", () => {
  test("client routes load without ErrorBoundary crash", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await loginAsTestUser(page);

    const results: Array<{ route: string; ok: boolean; error?: string }> = [];

    for (const route of CLIENT_ROUTES) {
      try {
        await page.goto(route, { waitUntil: "networkidle", timeout: 10_000 });
        // Check for ErrorBoundary fallback (retry/home button visible = crashed)
        const errorBoundaryVisible = await page
          .getByText(/something went wrong|greška|retry|pokušaj ponovo/i)
          .isVisible()
          .catch(() => false);
        results.push({
          route,
          ok: !errorBoundaryVisible,
          error: errorBoundaryVisible ? "ErrorBoundary rendered" : undefined,
        });
      } catch (e) {
        results.push({
          route,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      // eslint-disable-next-line no-console
      console.error("[exploration] Failed routes:", failed);
      // eslint-disable-next-line no-console
      console.error("[exploration] Console errors:", consoleErrors);
    }

    expect(failed, `Crashed routes: ${failed.map((f) => f.route).join(", ")}`).toHaveLength(0);
  });

  test("trainer routes load (if test user is trainer)", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await loginAsTestUser(page);

    // If not trainer, skip
    const url = page.url();
    if (!url.includes("/trainer")) {
      test.skip(true, "Test user is not a trainer");
      return;
    }

    const results: Array<{ route: string; ok: boolean; error?: string }> = [];
    for (const route of TRAINER_ROUTES) {
      try {
        await page.goto(route, { waitUntil: "networkidle", timeout: 10_000 });
        const errorBoundaryVisible = await page
          .getByText(/something went wrong|greška/i)
          .isVisible()
          .catch(() => false);
        results.push({ route, ok: !errorBoundaryVisible });
      } catch (e) {
        results.push({
          route,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const failed = results.filter((r) => !r.ok);
    expect(failed, `Crashed trainer routes: ${failed.map((f) => f.route).join(", ")}`).toHaveLength(0);
  });
});
