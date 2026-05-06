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

    // Klik na Plus button (data-testid="water-add-glass") tri puta — semantički
    // "+1 čaša" gesture. Dot-ovi su append-only display layer pa klik ispod
    // trenutnog stanja je no-op (vidi setWaterTo u Home.tsx).
    const waterWidget = page.locator('[data-testid="water-widget"]');
    await expect(waterWidget).toBeVisible({ timeout: 10_000 });

    const addButton = waterWidget.locator('[data-testid="water-add-glass"]');
    await expect(addButton).toBeVisible();

    const before = await countRows("water_logs", TEST_USER.id);

    for (let i = 0; i < 3; i++) {
      // Sačekaj da dugme nije disabled (mutation isPending guard)
      await expect(addButton).toBeEnabled({ timeout: 5_000 });
      await addButton.click();
      await page.waitForTimeout(700); // hook mutate + invalidate + refetch
    }

    // Wait for all inserts to propagate
    await page.waitForTimeout(1_500);

    const after = await countRows("water_logs", TEST_USER.id);
    expect(after - before).toBe(3);
  });
});
