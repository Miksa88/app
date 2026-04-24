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

    // Water widget ima 8+ čaša dugmad, svaka sa aria-label "<waterGlasses> N"
    // Klik na prazan slot poziva setWaterTo → addWater.
    // Da kliknemo 3 praznih, biramo slots 1, 2, 3 (početno svi prazni).
    const waterWidget = page.locator('[data-testid="water-widget"]');
    await expect(waterWidget).toBeVisible({ timeout: 10_000 });

    const before = await countRows("water_logs", TEST_USER.id);

    // Glass buttons — svaki ima aria-label koja sadrži "glass" ili srpski
    const glassButtons = waterWidget.locator("button[aria-label]");
    const glassCount = await glassButtons.count();
    expect(glassCount, "water widget should have glass buttons").toBeGreaterThanOrEqual(3);

    // Klikni prvu 3 buttonа (pune prazne slots → trigger addWater)
    for (let i = 0; i < 3; i++) {
      await glassButtons.nth(i).click();
      await page.waitForTimeout(700); // hook mutate + optimistic update
    }

    // Wait for all inserts to propagate
    await page.waitForTimeout(1_500);

    const after = await countRows("water_logs", TEST_USER.id);
    expect(after - before).toBe(3);
  });
});
