// ============================================================================
// meal-log.spec.ts — eat / skip / replace kroz UI click-through
// ============================================================================

import { test, expect } from "@playwright/test";
import { loginAsTestUser, TEST_USER } from "./helpers/auth";
import { countRows, getLatestRow, resetTestUserData } from "./helpers/supabaseAdmin";

test.describe("Meal log — UI", () => {
  test.beforeEach(async () => {
    await resetTestUserData(TEST_USER.id);
  });

  async function openMealSheet(page: import("@playwright/test").Page): Promise<void> {
    await page.goto("/food");
    await page.waitForLoadState("networkidle");
    const mealCards = page.locator("main button").filter({ hasText: /kcal|protein/i });
    await expect(mealCards.first()).toBeVisible({ timeout: 10_000 });
    await mealCards.first().click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
  }

  test("klik meal card → 'Označi kao pojedeno' → meal_logs status=logged", async ({ page }) => {
    await loginAsTestUser(page);
    await openMealSheet(page);

    const sheet = page.getByRole("dialog");
    const markEatenBtn = sheet.getByRole("button", { name: /označi kao pojedeno|mark as eaten/i });
    await expect(markEatenBtn).toBeVisible();

    const before = await countRows("meal_logs", TEST_USER.id);
    await markEatenBtn.click();
    await page.waitForTimeout(3_000);

    expect((await countRows("meal_logs", TEST_USER.id)) - before).toBeGreaterThanOrEqual(1);
    const latest = await getLatestRow<{ status: string }>("meal_logs", TEST_USER.id, "logged_at");
    expect(latest?.status).toBe("logged");
  });

  test("klik meal card → skip dugme (aria-label Preskoči obrok) → status=skipped", async ({ page }) => {
    await loginAsTestUser(page);
    await openMealSheet(page);

    const sheet = page.getByRole("dialog");
    const skipBtn = sheet.getByRole("button", { name: /preskoči obrok|skip meal/i });
    await expect(skipBtn).toBeVisible();

    const before = await countRows("meal_logs", TEST_USER.id);
    await skipBtn.click();
    await page.waitForTimeout(3_000);

    expect((await countRows("meal_logs", TEST_USER.id)) - before).toBeGreaterThanOrEqual(1);
    const latest = await getLatestRow<{ status: string }>("meal_logs", TEST_USER.id, "logged_at");
    expect(latest?.status).toBe("skipped");
  });

  test("klik meal card → Zameni → izaberi → status=replaced", async ({ page }) => {
    await loginAsTestUser(page);
    await openMealSheet(page);

    // Prvo sheet — klik na "Zameni" (aria-label Replace)
    const mealDetailSheet = page.getByRole("dialog").first();
    const replaceBtn = mealDetailSheet.getByRole("button", { name: /^zameni$|^replace$/i });
    await expect(replaceBtn).toBeVisible();
    await replaceBtn.click();

    // Drugi sheet se otvara — "Šta si pojeo umesto toga?" sa search + lista opcija
    // Čekam da vidim neku opciju sa "Potvrdi zamenu"
    const replaceOption = page.getByRole("button", { name: /potvrdi zamenu|confirm replacement/i });
    await expect(replaceOption.first()).toBeVisible({ timeout: 5_000 });

    const before = await countRows("meal_logs", TEST_USER.id);
    await replaceOption.first().click();
    await page.waitForTimeout(3_000);

    expect((await countRows("meal_logs", TEST_USER.id)) - before).toBeGreaterThanOrEqual(1);
    const latest = await getLatestRow<{ status: string; replacement_meal_id: string | null }>(
      "meal_logs",
      TEST_USER.id,
      "logged_at",
    );
    expect(latest?.status).toBe("replaced");
    expect(latest?.replacement_meal_id).not.toBeNull();
  });
});
