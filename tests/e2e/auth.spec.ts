// ============================================================================
// auth.spec.ts — Login + ProtectedRoute flow
// ============================================================================

import { test, expect } from "@playwright/test";
import { loginAsTestUser, TEST_USER } from "./helpers/auth";

test.describe("Authentication", () => {
  test("unauthenticated user sees Login screen on /", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    // Login CTA visible
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
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
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.getByRole("button", { name: /continue with email|email/i }).click();
    await page.getByPlaceholder(/email/i).fill(TEST_USER.email);
    await page.getByPlaceholder(/password/i).fill("wrong-password-12345");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    // Sonner toast appears
    await expect(page.getByText(/pogrešan|invalid|wrong/i)).toBeVisible({ timeout: 5_000 });
    // Still on login (no redirect)
    await expect(page).toHaveURL("/");
  });
});
