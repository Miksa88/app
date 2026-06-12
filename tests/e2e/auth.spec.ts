// ============================================================================
// auth.spec.ts — Login + ProtectedRoute flow
// ============================================================================

import { test, expect } from "@playwright/test";
import { loginAsTestUser, TEST_USER } from "./helpers/auth";

test.describe("Authentication", () => {
  test("unauthenticated user sees Login screen on /", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    // Login CTA visible — dvojezično (tenant default može biti sr ili en)
    await expect(
      page.getByRole("button", { name: /sign in|prijav/i }).first(),
    ).toBeVisible();
  });

  test("protected routes redirect unauthenticated to /", async ({ page }) => {
    await page.goto("/home");
    // Should bounce back to landing
    await page.waitForURL("/", { timeout: 5_000 });
  });

  test("valid credentials log in and redirect to /home (or /trainer)", async ({ page }) => {
    await loginAsTestUser(page);
    // After login, should land on /home or /trainer
    await expect(page).toHaveURL(/\/(home|trainer)/);
  });

  test("invalid credentials show error toast", async ({ page }) => {
    await page.goto("/");
    // Open sign-in sheet — dvojezično
    await page.getByRole("button", { name: /^(sign in|prijava|prijavi se)$/i }).first().click();
    const sheet = page.locator("[class*='z-sheet'], [role='dialog']").first();
    await sheet.getByRole("button", { name: /continue with email|nastavi sa email/i }).click();
    // Fill wrong creds (scoped to sheet)
    await sheet.locator('input[type="email"]').fill(TEST_USER.email);
    await sheet.locator('input[type="password"]').fill("wrong-password-12345");
    // Submit
    await sheet.locator('button[type="submit"]').click();
    // Sonner toast appears (matches Supabase or our fallback messages)
    await expect(
      page.getByText(/pogrešan|invalid|wrong|credentials/i),
    ).toBeVisible({ timeout: 5_000 });
    // Still on login (no redirect)
    await expect(page).toHaveURL("/");
  });
});
