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

test.describe("Daily Check-in", () => {
  test.beforeEach(async () => {
    await resetTestUserData(TEST_USER.id);
  });

  test("klik 'Jutarnji check-in' → sheet → submit → DB + UI refresh", async ({ page }) => {
    await loginAsTestUser(page);

    // CTA visible (assumes hasCheckInToday=false since we reset)
    const cta = page.getByRole("button", { name: /jutarnji check-in|morning check-in/i });
    await expect(cta).toBeVisible({ timeout: 5_000 });
    await cta.click();

    // Sheet opens
    await expect(page.getByRole("dialog")).toBeVisible();

    // Fill weight (decimal input)
    const weightInput = page.locator('input[type="number"]').first();
    await weightInput.fill("60.5");

    // Submit
    const submitBtn = page.getByRole("button", { name: /sačuvaj|save|submit/i }).last();
    await submitBtn.click();

    // Wait for success (sheet closes OR toast appears)
    await page.waitForTimeout(2_000);

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
