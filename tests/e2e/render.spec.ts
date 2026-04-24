// ============================================================================
// render.spec.ts — svaka ruta u app-u: screenshot + crash check
// ============================================================================
//
// Produkuje test-results/screenshots/*.png folder za vizuelnu validaciju
// (layout, empty states, tekst "obrezan"). Automatski verify: ErrorBoundary
// ne renderuje + console errors se logguju.
// ============================================================================

import { test, expect } from "@playwright/test";
import { loginAsTestUser, TEST_USER } from "./helpers/auth";
import { resetAuthClient } from "./helpers/authClient";
import { admin } from "./helpers/supabaseAdmin";
import * as path from "path";

const SCREENSHOT_DIR = "test-results/screenshots";

const CLIENT_ROUTES: Array<{ path: string; name: string }> = [
  { path: "/home", name: "01-home" },
  { path: "/gym", name: "02-gym" },
  { path: "/food", name: "03-food" },
  { path: "/progress", name: "04-progress" },
  { path: "/milestones", name: "05-milestones" },
  { path: "/profile", name: "06-profile" },
  { path: "/chat", name: "07-chat" },
  { path: "/weekly-check-in", name: "08-weekly-check-in" },
  { path: "/subscription", name: "09-subscription" },
];

const TRAINER_ROUTES: Array<{ path: string; name: string }> = [
  { path: "/trainer", name: "10-trainer-dashboard" },
  { path: "/trainer/clients", name: "11-trainer-clients" },
  { path: "/trainer/training", name: "12-trainer-training" },
  { path: "/trainer/nutrition", name: "13-trainer-nutrition" },
  { path: "/trainer/messages", name: "14-trainer-messages" },
  { path: "/trainer/analytics", name: "15-trainer-analytics" },
  { path: "/trainer/payments", name: "16-trainer-payments" },
  { path: "/trainer/profile", name: "17-trainer-profile" },
  { path: "/trainer/packages", name: "18-trainer-packages" },
  { path: `/trainer/client/${process.env.E2E_TEST_USER_ID}`, name: "19-trainer-client-detail" },
  { path: "/trainer/free-trial", name: "20-trainer-free-trial" },
];

const PUBLIC_ROUTES: Array<{ path: string; name: string }> = [
  { path: "/", name: "00-landing" },
  { path: "/onboarding", name: "21-onboarding-quiz" },
];

test.describe("Render — sve rute, screenshot, crash check", () => {
  test("public routes (landing + onboarding)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`[console] ${msg.text()}`);
    });

    for (const r of PUBLIC_ROUTES) {
      await page.goto(r.path, { waitUntil: "networkidle", timeout: 10_000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${r.name}.png`), fullPage: true });
      const crashed = await page
        .getByText(/something went wrong|greška|retry/i)
        .isVisible()
        .catch(() => false);
      expect(crashed, `${r.path} — ErrorBoundary rendered`).toBeFalsy();
    }

    if (errors.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`[render public] ${errors.length} errors:`, errors.slice(0, 10));
    }
  });

  test("client routes (logged in kao client)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(`[${page.url()}] ${err.message}`));

    await loginAsTestUser(page);

    for (const r of CLIENT_ROUTES) {
      await page.goto(r.path, { waitUntil: "networkidle", timeout: 15_000 });
      await page.waitForTimeout(800); // data load + animations
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${r.name}.png`), fullPage: true });
      const crashed = await page
        .getByText(/something went wrong|greška|retry/i)
        .isVisible()
        .catch(() => false);
      expect(crashed, `${r.path} — ErrorBoundary rendered`).toBeFalsy();
    }

    if (errors.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`[render client] ${errors.length} errors:`, errors.slice(0, 15));
    }
  });

  test("trainer routes (logged in kao trainer)", async ({ page }) => {
    // Promote test user
    await admin.from("profiles").update({ role: "trainer" }).eq("id", TEST_USER.id);
    resetAuthClient();

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(`[${page.url()}] ${err.message}`));

    try {
      await loginAsTestUser(page);

      for (const r of TRAINER_ROUTES) {
        await page.goto(r.path, { waitUntil: "networkidle", timeout: 15_000 });
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${r.name}.png`), fullPage: true });
        const crashed = await page
          .getByText(/something went wrong|greška|retry/i)
          .isVisible()
          .catch(() => false);
        expect(crashed, `${r.path} — ErrorBoundary rendered`).toBeFalsy();
      }

      if (errors.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`[render trainer] ${errors.length} errors:`, errors.slice(0, 15));
      }
    } finally {
      await admin.from("profiles").update({ role: "client" }).eq("id", TEST_USER.id);
      resetAuthClient();
    }
  });
});
