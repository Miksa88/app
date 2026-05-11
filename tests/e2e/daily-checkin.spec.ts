// ============================================================================
// daily-checkin.spec.ts — Jutarnji check-in flow end-to-end
// ============================================================================

import { test, expect } from "@playwright/test";
import { loginAsTestUser, TEST_USER } from "./helpers/auth";
import {
  admin,
  countRows,
  getLatestRow,
  getUserStatus,
  resetTestUserData,
} from "./helpers/supabaseAdmin";

// SKIP: Daily check-in je uklonjen u Maj 2026 redizajnu — feedback se sad
// prikuplja kroz PreWorkoutFatigueDialog (pre treninga, 2-button) i WeeklyCheckIn
// (1×/nedeljno, sa sleep+stress sliderima). Daily 9-polja sheet više ne postoji.
// Test ostaje za referencu ako se feature ikad reaktivira.
test.describe.skip("Daily Check-in (uklonjen)", () => {
  test.beforeEach(async () => {
    await resetTestUserData(TEST_USER.id);
  });

  test("klik 'Jutarnji check-in' → sheet → submit → DB + UI refresh", async ({ page }) => {
    // DIAGNOSTICS — capture console + network za debug
    const consoleMessages: string[] = [];
    const requests: Array<{ url: string; method: string; status?: number }> = [];
    page.on("console", (msg) => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
    page.on("pageerror", (err) => consoleMessages.push(`[pageerror] ${err.message}`));
    page.on("request", (req) => {
      if (req.url().includes("/functions/v1/") || req.url().includes("/rest/v1/")) {
        requests.push({ url: req.url(), method: req.method() });
      }
    });
    page.on("response", (res) => {
      const req = requests.find((r) => r.url === res.url() && r.status === undefined);
      if (req) req.status = res.status();
    });

    await loginAsTestUser(page);

    // CTA visible (assumes hasCheckInToday=false since we reset).
    const cta = page.getByTestId("daily-checkin-cta");
    await expect(cta).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(500);
    await cta.click({ force: true });

    // Sheet opens
    await expect(page.getByRole("dialog")).toBeVisible();

    // Fill weight — input id="checkin-weight", type="text" (decimal UX sa komom)
    const weightInput = page.locator('#checkin-weight');
    await weightInput.fill("60.5");

    // Submit — type="submit" unutar sheet (sheet je dovoljno visok da treba scroll).
    // Sa novim pump/mood/steps poljima sheet je iznad viewport-a — Enter key
    // unutar weight input-a triggeruje form submit pouzdanije nego klik.
    await weightInput.press('Enter');

    // Wait for success (sheet closes OR toast appears)
    await page.waitForTimeout(3_000);

    // DIAGNOSTICS dump
    // eslint-disable-next-line no-console
    console.log("[TEST DEBUG] Network requests:");
    for (const r of requests) {
      // eslint-disable-next-line no-console
      console.log(`  ${r.method} ${r.status ?? "pending"} ${r.url}`);
    }
    // eslint-disable-next-line no-console
    console.log("[TEST DEBUG] Console messages:");
    for (const m of consoleMessages) {
      // eslint-disable-next-line no-console
      console.log(`  ${m}`);
    }

    // DB verify — weight_logs has row
    const weightCount = await countRows("weight_logs", TEST_USER.id);
    expect(weightCount).toBeGreaterThanOrEqual(1);

    const latestWeight = await getLatestRow<{ weight_kg: number; source: string }>(
      "weight_logs",
      TEST_USER.id,
      "logged_at",
    );
    expect(latestWeight?.weight_kg).toBeCloseTo(60.5, 1);
    expect(latestWeight?.source).toBe("manual");

    // DB verify — daily_check_ins has row
    const checkinCount = await countRows("daily_check_ins", TEST_USER.id);
    expect(checkinCount).toBeGreaterThanOrEqual(1);

    // DB verify — user_status updated
    const status = await getUserStatus(TEST_USER.id);
    expect(status).not.toBeNull();
  });
});
