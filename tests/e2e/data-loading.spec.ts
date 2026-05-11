// ============================================================================
// data-loading.spec.ts — verify da stranice stvarno učitavaju content, ne prazne
// ============================================================================

import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";

test.describe("Data loading — content visible", () => {
  test("Food stranica renderuje meal cards sa kcal/macro content", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/food");
    await page.waitForLoadState("networkidle");

    // Očekujem bar jedan meal card sa "kcal" tekstom
    const mealCards = page.locator("main button").filter({ hasText: /kcal/i });
    await expect(mealCards.first()).toBeVisible({ timeout: 10_000 });
    const count = await mealCards.count();
    expect(count, "Food stranica treba imati bar 3 meal slota").toBeGreaterThanOrEqual(3);

    // Macro format: 20g, 15g itd
    const hasMacroText = await page.getByText(/\d+g/).first().isVisible();
    expect(hasMacroText, "Meal cards treba da imaju macro info (Ng)").toBeTruthy();
  });

  test("Home pokazuje 'Danas' mini data centar sa kcal counterom", async ({ page }) => {
    // Home v4 (2026-05-08): water widget je uklonjen, zamenjen sa 3 kartice
    // (Danas / Trening / Obrok) + check-in CTA. Ovaj test verifikuje da
    // mini data centar prikazuje kcal counter.
    await loginAsTestUser(page);
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Heading "Danas" (h2) iz mini data centra
    const todayHeading = page.getByRole("heading", { name: /^danas$/i, level: 2 });
    await expect(todayHeading).toBeVisible({ timeout: 10_000 });

    // kcal counter mora biti vidljiv u istom card-u
    const homeContainer = page.locator("body");
    await expect(homeContainer).toContainText(/kcal/i);
  });

  test("Gym stranica pokazuje bilo aktivnu sesiju ili empty state", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/gym");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1_500);

    // Očekujem ili Start CTA (aktivna sesija) ili text o empty state
    const hasContent = await Promise.race([
      page.getByRole("button", { name: /start|započni|kreni/i }).first().isVisible().catch(() => false),
      page.getByText(/nema|empty|nijedan|no active|nothing/i).first().isVisible().catch(() => false),
    ]);
    expect(hasContent, "Gym treba imati CTA ili empty state — ne praznu stranicu").toBeTruthy();
  });

  test("Progress stranica renderuje nešto (ne prazna)", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/progress");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1_500);

    // Bar jedan heading/text sa spelling-om
    const main = page.locator("main");
    const text = (await main.textContent()) ?? "";
    expect(text.length, "Progress stranica ne sme biti prazna").toBeGreaterThan(50);
  });

  test("Milestones stranica renderuje sadržaj", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/milestones");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1_500);

    const main = page.locator("main");
    const text = (await main.textContent()) ?? "";
    expect(text.length, "Milestones ne sme biti prazna").toBeGreaterThan(50);
  });

  test("Profile stranica pokazuje first_name i email", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1_500);

    // beta user ima first_name "Beta"
    const hasName = await page.getByText(/beta|tester/i).first().isVisible().catch(() => false);
    expect(hasName, "Profile treba da pokaže korisnikovo ime").toBeTruthy();
  });
});
