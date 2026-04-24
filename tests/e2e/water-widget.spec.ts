// ============================================================================
// water-widget.spec.ts — klik "+1 čaša" tri puta → 3 reda u water_logs
// ============================================================================

import { test, expect } from "@playwright/test";
import { loginAsTestUser, TEST_USER } from "./helpers/auth";
import { admin, countRows, resetTestUserData } from "./helpers/supabaseAdmin";

test.describe("Water widget", () => {
  test.beforeEach(async () => {
    await resetTestUserData(TEST_USER.id);
  });

  test("3× '+1 čaša' → 3 reda u water_logs", async ({ page }) => {
    await loginAsTestUser(page);

    // Find water widget "+" button (icon-only or labeled)
    const waterPlusBtn = page
      .getByRole("button", { name: /\+1|dodaj čašu|add glass|voda|water/i })
      .first();
    await expect(waterPlusBtn).toBeVisible({ timeout: 5_000 });

    const before = await countRows("water_logs", TEST_USER.id);

    for (let i = 0; i < 3; i++) {
      await waterPlusBtn.click();
      await page.waitForTimeout(500);
    }

    // Wait for all inserts to propagate
    await page.waitForTimeout(1_500);

    const after = await countRows("water_logs", TEST_USER.id);
    expect(after - before).toBe(3);
  });
});
