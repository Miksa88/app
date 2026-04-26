// ============================================================================
// trainer-editors-walk.spec.ts — TEMP audit spec (Phase 1 capture)
// ============================================================================
//
// Captures the trainer editor + picker routes that the existing render.spec
// does NOT cover (program/workout/exercise/package editors, meal-picker,
// nutrition-template editor, AssignProgram, AddClient).
//
// Login pattern follows trainer-flow.spec.ts: promote TEST_USER to trainer in
// beforeAll, restore to client in afterAll.
// ============================================================================

import { test, expect } from "@playwright/test";
import { loginAsTestUser, TEST_USER } from "./helpers/auth";
import { resetAuthClient } from "./helpers/authClient";
import { admin } from "./helpers/supabaseAdmin";
import * as path from "path";

const SCREENSHOT_DIR = "test-results/screenshots";

// Routes to capture. For dynamic :id routes, /new is safest (creates blank
// editor without DB seeding requirements). For client-scoped routes, we use
// the test user's own ID as fallback.
const TRAINER_EDITOR_ROUTES: Array<{ path: string; name: string; note: string }> = [
  { path: "/trainer/program/new", name: "trainer-editor-01-program-new", note: "Program editor (blank)" },
  { path: "/trainer/workout/new", name: "trainer-editor-02-workout-new", note: "Workout editor (blank)" },
  { path: "/trainer/exercise/new", name: "trainer-editor-03-exercise-new", note: "Exercise detail/editor (blank)" },
  { path: "/trainer/package/new", name: "trainer-editor-04-package-new", note: "Package editor (blank)" },
  { path: "/trainer/nutrition-template/new", name: "trainer-editor-05-nutrition-template-new", note: "Nutrition template editor (blank)" },
  { path: "/trainer/client/add", name: "trainer-editor-06-add-client", note: "Add client form" },
  // Client-scoped routes — uses TEST_USER.id (works because trainer == self)
  { path: `/trainer/client/${process.env.E2E_TEST_USER_ID}/meal-picker`, name: "trainer-editor-07-meal-picker", note: "Meal picker (client-scoped)" },
];

test.describe("Trainer editors walk — capture editor + picker screens", () => {
  test.setTimeout(180_000);

  test.beforeAll(async () => {
    await admin.from("profiles").update({ role: "trainer" }).eq("id", TEST_USER.id);
    resetAuthClient();
  });

  test.afterAll(async () => {
    await admin.from("profiles").update({ role: "client" }).eq("id", TEST_USER.id);
    resetAuthClient();
  });

  test("capture trainer editor + picker screens", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(`[${page.url()}] ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`[console][${page.url()}] ${msg.text()}`);
    });

    await loginAsTestUser(page);

    const failed: Array<{ route: string; reason: string }> = [];

    for (const r of TRAINER_EDITOR_ROUTES) {
      try {
        await page.goto(r.path, { waitUntil: "networkidle", timeout: 15_000 });
        await page.waitForTimeout(900);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${r.name}.png`),
          fullPage: true,
        });
        const crashed = await page
          .getByText(/something went wrong|greška|retry|pokušaj ponovo/i)
          .isVisible()
          .catch(() => false);
        if (crashed) failed.push({ route: r.path, reason: "ErrorBoundary rendered" });
      } catch (e) {
        failed.push({
          route: r.path,
          reason: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Try to capture AssignProgram via trainer/program/:id/assign — first need
    // to find an existing program ID. Try fetching via admin client.
    try {
      const { data: programs } = await admin
        .from("programs")
        .select("id")
        .limit(1);
      if (programs && programs.length > 0) {
        const programId = programs[0].id;
        await page.goto(`/trainer/program/${programId}/assign`, { waitUntil: "networkidle", timeout: 15_000 });
        await page.waitForTimeout(900);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, "trainer-editor-08-assign-program.png"),
          fullPage: true,
        });
      } else {
        // No program — capture empty fallback at /trainer/program/new/assign would 404
        // Just skip with a marker screenshot of /trainer/training listing
        await page.goto("/trainer/training", { waitUntil: "networkidle", timeout: 15_000 });
        await page.waitForTimeout(700);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, "trainer-editor-08-assign-program-FALLBACK-training-list.png"),
          fullPage: true,
        });
        failed.push({ route: "/trainer/program/:id/assign", reason: "No programs in DB to assign" });
      }
    } catch (e) {
      failed.push({
        route: "/trainer/program/:id/assign",
        reason: e instanceof Error ? e.message : String(e),
      });
    }

    if (errors.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`[trainer-editors-walk] ${errors.length} errors:`, errors.slice(0, 15));
    }
    if (failed.length > 0) {
      // eslint-disable-next-line no-console
      console.log("[trainer-editors-walk] failed routes:", failed);
    }

    // Smoke pass — failures logged but don't block (Phase 1 is capture, not validate)
    expect(true).toBe(true);
  });
});
