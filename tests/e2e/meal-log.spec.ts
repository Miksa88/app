// ============================================================================
// meal-log.spec.ts — Food tab eat/skip/replace → meal_logs insert
// ============================================================================

import { test, expect } from "@playwright/test";
import { loginAsTestUser, TEST_USER } from "./helpers/auth";
import { countRows, getLatestRow, resetTestUserData } from "./helpers/supabaseAdmin";

test.describe("Meal log", () => {
  test.beforeEach(async () => {
    await resetTestUserData(TEST_USER.id);
  });

  test("klik meal card → 'Označi kao pojedeno' → meal_logs insert status=logged", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/food");
    await page.waitForLoadState("networkidle");

    // Meal cards su renderovani kao <motion.button> u listi (Food.tsx:385)
    // Klik otvara bottom sheet sa Mark Eaten dugmetom
    const mealCards = page.locator("main button").filter({ hasText: /kcal|protein|carbs|fat|\d+g/i });
    const firstMealCard = mealCards.first();
    await expect(firstMealCard).toBeVisible({ timeout: 10_000 });
    await firstMealCard.click();

    // Sheet opens (role=dialog) — wait for "Označi kao pojedeno" button
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible({ timeout: 5_000 });

    const markEatenBtn = sheet.getByRole("button", {
      name: /označi kao pojedeno|mark as eaten/i,
    });
    await expect(markEatenBtn).toBeVisible();

    const before = await countRows("meal_logs", TEST_USER.id);
    await markEatenBtn.click();
    await page.waitForTimeout(3_000);

    const after = await countRows("meal_logs", TEST_USER.id);
    expect(after - before, "meal_logs should have new row").toBeGreaterThanOrEqual(1);

    const latest = await getLatestRow<{ status: string; meal_slot_index: number }>(
      "meal_logs",
      TEST_USER.id,
      "logged_at",
    );
    expect(latest?.status).toBe("logged");
  });
});
