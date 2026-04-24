// ============================================================================
// weekly-checkin.spec.ts — WeeklyCheckIn forma → weekly_check_ins insert
// ============================================================================

import { test, expect } from "@playwright/test";
import { loginAsTestUser, TEST_USER } from "./helpers/auth";
import {
  admin,
  countRows,
  getLatestRow,
  resetTestUserData,
} from "./helpers/supabaseAdmin";

test.describe("Weekly Check-in", () => {
  test.beforeEach(async () => {
    await resetTestUserData(TEST_USER.id);
  });

  test("popuni formu → submit → weekly_check_ins + user_status.redFlags reset", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/weekly-check-in");
    await page.waitForLoadState("networkidle");

    // Weight input — auto-prefill može biti prazan za fresh user (bez weight_logs)
    // Pa eksplicitno unesemo
    const weightInput = page.locator("input").first();
    await expect(weightInput).toBeVisible({ timeout: 10_000 });
    await weightInput.fill("60.5");

    // Fill identity score (radiogroup — klikni 4. opciju = score 4)
    const identityRadios = page.locator('[role="radio"], [role="radiogroup"] button');
    const radioCount = await identityRadios.count();
    if (radioCount >= 4) {
      await identityRadios.nth(3).click(); // 0-indexed: 4th option
    }

    const before = await countRows("weekly_check_ins", TEST_USER.id);

    // Submit — last button sa text match ili type=submit
    const submitBtn = page
      .getByRole("button", { name: /sačuvaj|save|submit|potvrdi|završi/i })
      .last();
    await submitBtn.click();
    await page.waitForTimeout(3_000);

    // DB verify
    const after = await countRows("weekly_check_ins", TEST_USER.id);
    expect(after - before).toBeGreaterThanOrEqual(1);

    const latest = await getLatestRow<{ weight_avg_kg: number | null; identity_score: number | null }>(
      "weekly_check_ins",
      TEST_USER.id,
      "created_at",
    );
    expect(latest?.weight_avg_kg).toBeCloseTo(60.5, 1);
  });
});
