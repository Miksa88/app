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

  test("skip obrok — direct EF invoke (UI flow previše za 1 test)", async () => {
    const { invokeEdgeFunction } = await import("./helpers/authClient");

    const before = await countRows("meal_logs", TEST_USER.id);

    const { error } = await invokeEdgeFunction("process-meal-log", {
      clientId: TEST_USER.id,
      mealId: "test-skip-1",
      slotIndex: 1,
      status: "skipped",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });

    expect(error).toBeNull();
    await new Promise((r) => setTimeout(r, 500));

    const after = await countRows("meal_logs", TEST_USER.id);
    expect(after - before).toBe(1);

    const latest = await getLatestRow<{ status: string }>(
      "meal_logs",
      TEST_USER.id,
      "logged_at",
    );
    expect(latest?.status).toBe("skipped");
  });

  test("replace meal — direct EF invoke sa replacement_meal_id", async () => {
    const { invokeEdgeFunction } = await import("./helpers/authClient");

    const before = await countRows("meal_logs", TEST_USER.id);

    const { error } = await invokeEdgeFunction("process-meal-log", {
      clientId: TEST_USER.id,
      mealId: "test-original-2",
      slotIndex: 2,
      status: "replaced",
      calories: 450,
      protein: 30,
      carbs: 40,
      fat: 18,
      replacementMealId: "test-replacement-2",
    });

    expect(error).toBeNull();
    await new Promise((r) => setTimeout(r, 500));

    const after = await countRows("meal_logs", TEST_USER.id);
    expect(after - before).toBe(1);

    const latest = await getLatestRow<{ status: string; replacement_meal_id: string | null }>(
      "meal_logs",
      TEST_USER.id,
      "logged_at",
    );
    expect(latest?.status).toBe("replaced");
    expect(latest?.replacement_meal_id).toBe("test-replacement-2");
  });
});
