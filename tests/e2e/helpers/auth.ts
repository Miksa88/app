// ============================================================================
// auth.ts — login helper za Playwright testove
// ============================================================================

import type { Page } from "@playwright/test";

export const TEST_USER = {
  email: process.env.E2E_TEST_USER_EMAIL ?? "beta@fitbyivana.test",
  password: process.env.E2E_TEST_USER_PASSWORD ?? "BetaFit123!",
  id: process.env.E2E_TEST_USER_ID ?? "",
};

/**
 * Performs login through the real Login.tsx UI (Sign In sheet → email form).
 * Does NOT use mock auth (we assume VITE_DEV_MOCK_AUTH=false in .env).
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  await page.goto("/");
  // Click "Sign In" link (under CTA)
  await page.getByRole("button", { name: /sign in/i }).click();
  // Sheet opens → click "Continue with email"
  await page.getByRole("button", { name: /continue with email|email/i }).click();
  // Email + password
  await page.getByPlaceholder(/email/i).fill(TEST_USER.email);
  await page.getByPlaceholder(/password/i).fill(TEST_USER.password);
  // Submit
  await page.getByRole("button", { name: /^sign in$/i }).click();
  // Wait for redirect — home or trainer
  await page.waitForURL(/\/(home|trainer)/, { timeout: 10_000 });
}
