import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";

test.describe("Meal plan + Shopping smoke", () => {
  test("/meal-plan renders without crash", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/meal-plan", { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);
    const crashed = await page.getByText(/something went wrong|greška/i).isVisible().catch(() => false);
    expect(crashed).toBeFalsy();
    await page.screenshot({ path: "test-results/walk-screenshots/30-meal-plan.png", fullPage: true });
  });

  test("/shopping renders without crash", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/meal-plan", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.goto("/shopping", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const crashed = await page.getByText(/something went wrong|greška/i).isVisible().catch(() => false);
    expect(crashed).toBeFalsy();
    await page.screenshot({ path: "test-results/walk-screenshots/31-shopping.png", fullPage: true });
  });
});
