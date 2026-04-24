// ============================================================================
// auth.ts — login helper za Playwright testove
// ============================================================================

import type { Page } from "@playwright/test";

export const TEST_USER = {
  email: process.env.E2E_TEST_USER_EMAIL ?? "mixa37blok+beta@gmail.com",
  password: process.env.E2E_TEST_USER_PASSWORD ?? "BetaFit123!",
  id: process.env.E2E_TEST_USER_ID ?? "",
};

/**
 * Performs login through the real Login.tsx UI.
 * NE koristi mock auth (VITE_DEV_MOCK_AUTH=false).
 *
 * DOM struktura Login.tsx:
 *   Landing:
 *     - "Get Started" CTA (GradientButton)
 *     - "Sign In" text button (otvara sheet)
 *   Sheet (role=dialog):
 *     - Apple, Google, "Continue with email" buttons
 *     - Email form (posle klika "email"):
 *       - input type="email"
 *       - input type="password"
 *       - GradientButton type="submit" ("Sign In")
 *       - "← Back" text button
 *
 * Selector ambiguity: "Sign In" postoji i na landing (tiny text-primary) i
 * u sheet-u (GradientButton submit). Koristimo scoping na sheet (role=dialog)
 * + type=submit na submit button-u.
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  await page.goto("/");

  // Landing → click "Sign In" link to open sheet
  await page
    .getByRole("button", { name: /^sign in$/i })
    .first()
    .click();

  // Sheet opens (role=dialog); within it, click "Continue with email"
  const sheet = page.locator("[class*='z-sheet'], [role='dialog']").first();
  await sheet
    .getByRole("button", { name: /continue with email|nastavi sa email/i })
    .click();

  // Email form visible — fill credentials
  await sheet.locator('input[type="email"]').fill(TEST_USER.email);
  await sheet.locator('input[type="password"]').fill(TEST_USER.password);

  // Submit button within sheet (GradientButton with type=submit)
  await sheet.locator('button[type="submit"]').click();

  // Wait for redirect — home or trainer
  await page.waitForURL(/\/(home|trainer)/, { timeout: 10_000 });
}
