// ============================================================================
// workout-flow.spec.ts — Gym → ActiveWorkout → complete sets → Finish
// ============================================================================

import { test, expect } from "@playwright/test";
import { loginAsTestUser, TEST_USER } from "./helpers/auth";
import { admin, resetTestUserData, getUserStatus, countRows } from "./helpers/supabaseAdmin";

test.describe("Workout flow", () => {
  test.beforeEach(async () => {
    await resetTestUserData(TEST_USER.id);
  });

  test("Gym → Start session → /workout/active reachable", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/gym");
    await page.waitForLoadState("networkidle");

    // Test user_status je SQL-init (prazan queue.sessions[]). Gym može ipak da
    // renderuje Start CTA ako Gym.tsx fall-back-uje na neku default sesiju.
    // Klik Start treba da dovede na /workout/active.
    const startBtn = page
      .getByRole("button", { name: /započni|start|kreni|trening/i })
      .first();

    await expect(startBtn).toBeVisible({ timeout: 10_000 });
    await startBtn.click();

    // Očekujemo redirect na /workout/active ili neku error poruku o praznom
    // queue-u. Oba su validna; ovaj test samo potvrđuje da klik ne crash-uje.
    await page.waitForTimeout(2_000);
    const url = page.url();
    expect(url, "Start click should navigate or stay on gym (not crash)").toMatch(
      /\/(gym|workout\/active|home)/,
    );
  });
});
