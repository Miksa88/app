// ============================================================================
// onboarding-walk.spec.ts — TEMP audit spec (Phase 1 capture)
// ============================================================================
//
// Walks through Onboarding.tsx 12-step quiz + ProcessingScreen + SignUpSheet.
// Screenshots BEFORE clicking Continue at each step, so we capture the empty
// + filled state per step. STOPS at SignUpSheet — never submits real signup.
// ============================================================================

import { test, expect } from "@playwright/test";
import * as path from "path";

const SCREENSHOT_DIR = "test-results/screenshots";

test.describe("Onboarding walk — capture every step", () => {
  test.setTimeout(180_000);

  test("walk through 12 steps + processing + signup", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`[console] ${msg.text()}`);
    });

    await page.goto("/onboarding", { waitUntil: "networkidle", timeout: 15_000 });
    await page.waitForTimeout(800);

    // ─── Step 0: Name ────────────────────────────────────────────────────────
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "onboarding-step-00-name.png"),
      fullPage: true,
    });
    await page.locator("input#onboarding-firstname").fill("Test");
    await page.locator("input#onboarding-lastname").fill("User");
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "onboarding-step-00-name-filled.png"),
      fullPage: true,
    });
    await clickContinue(page);

    // ─── Step 1: DOB (ScrollWheelPicker — click an item to trigger onSelect) ─
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "onboarding-step-01-dob.png"),
      fullPage: true,
    });
    // ScrollWheelPicker has clickable items inside snap-y container. Default
    // values are set visually but onSelect isn't called on mount, so dob is "".
    // Click an adjacent year to trigger onSelect.
    const currentYear = new Date().getFullYear();
    const targetYear = String(currentYear - 30); // ~30y old
    await page.locator(`text="${targetYear}"`).first().click({ timeout: 5_000 }).catch(async () => {
      // Fallback: any visible year
      await page.locator(`text=/^(19[6-9]\\d|20[01]\\d)$/`).first().click();
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "onboarding-step-01-dob-filled.png"),
      fullPage: true,
    });
    await clickContinue(page);

    // ─── Step 2: Height & Weight ─────────────────────────────────────────────
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "onboarding-step-02-height-weight.png"),
      fullPage: true,
    });
    // Click an item in each picker (cm + kg) to trigger onSelect
    await page.locator('text="170 cm"').first().click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.locator('text="65 kg"').first().click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "onboarding-step-02-height-weight-filled.png"),
      fullPage: true,
    });
    await clickContinue(page);

    // ─── Step 3: Goal ────────────────────────────────────────────────────────
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "onboarding-step-03-goal.png"),
      fullPage: true,
    });
    // Click first goal card (motion.button)
    await page.locator("button").filter({ hasText: /fat loss|mršav|gubitak|figure|fitness|figure/i }).first().click();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "onboarding-step-03-goal-selected.png"),
      fullPage: true,
    });
    await clickContinue(page);

    // ─── Step 4: Metabolic (optional — Skip) ─────────────────────────────────
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "onboarding-step-04-metabolic.png"),
      fullPage: true,
    });
    await clickSkip(page);

    // ─── Step 5: Allergies (optional — Skip) ─────────────────────────────────
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "onboarding-step-05-allergies.png"),
      fullPage: true,
    });
    await clickSkip(page);

    // ─── Step 6: Limitations (required, but "no pain" default works) ────────
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "onboarding-step-06-limitations.png"),
      fullPage: true,
    });
    // No pain is selected by default (visual). Continue should already work.
    await clickContinue(page);

    // ─── Step 7: Sleep (optional — Skip) ─────────────────────────────────────
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "onboarding-step-07-sleep.png"),
      fullPage: true,
    });
    await clickSkip(page);

    // ─── Step 8: Stress (optional — Skip) ────────────────────────────────────
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "onboarding-step-08-stress.png"),
      fullPage: true,
    });
    await clickSkip(page);

    // ─── Adaptivni walker za preostale korake ────────────────────────────────
    // Broj i redosled koraka zavisi od tenant feature flagova (npr. healthKit
    // gasi Permissions korak), pa fiksni indeksi lome spec pri svakoj promeni.
    // Petlja: ako korak ima selection kartice (aria-pressed) klikni prvu,
    // zatim Continue/Skip; izlaz kad se pojavi "Završi/Finish" dugme.
    for (let step = 9; step <= 16; step++) {
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `onboarding-step-${String(step).padStart(2, "0")}.png`),
        fullPage: true,
      });

      const finishBtn = page.getByRole("button", { name: /završ|finish|gotovo/i }).first();
      if (await finishBtn.isVisible().catch(() => false)) {
        await finishBtn.click();
        break;
      }

      const selectionCard = page.locator("button[aria-pressed]").first();
      if (await selectionCard.isVisible().catch(() => false)) {
        await selectionCard.click();
        await page.waitForTimeout(300);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `onboarding-step-${String(step).padStart(2, "0")}-selected.png`),
          fullPage: true,
        });
      }
      await clickContinue(page);
    }

    // ─── Phase: Processing Screen ────────────────────────────────────────────
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "onboarding-phase-12-processing.png"),
      fullPage: true,
    });

    // Wait for processing to complete (it transitions automatically). The
    // duration depends on ProcessingScreen.tsx — likely ~3-5s. We poll for
    // SignUpSheet's distinctive content.
    await page.waitForSelector('text=/plan|spreman|ready|continue with/i', {
      timeout: 15_000,
    }).catch(() => {});
    await page.waitForTimeout(800);

    // ─── Phase: SignUpSheet ──────────────────────────────────────────────────
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "onboarding-phase-13-signup.png"),
      fullPage: true,
    });

    // Optional: capture the email-form view of SignUpSheet too
    const emailBtn = page.getByRole("button", { name: /continue with email|nastavi sa email/i });
    if (await emailBtn.isVisible().catch(() => false)) {
      await emailBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "onboarding-phase-13-signup-email-form.png"),
        fullPage: true,
      });
    }

    // STOP HERE — do NOT submit signup (would create real Supabase user).

    if (errors.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`[onboarding-walk] ${errors.length} errors:`, errors.slice(0, 10));
    }

    expect(true).toBe(true); // smoke pass
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function clickContinue(page: import("@playwright/test").Page): Promise<void> {
  await page
    .getByRole("button", { name: /nastavi|continue|završ|finish|gotovo/i })
    .first()
    .click();
}

async function clickSkip(page: import("@playwright/test").Page): Promise<void> {
  // "Skip" appears top-right on optional steps
  const skip = page.getByRole("button", { name: /^preskoči|^skip/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.first().click();
  } else {
    // fallback to continue if skip is missing
    await clickContinue(page);
  }
}

/**
 * Simulate a scroll on a ScrollWheelPicker column to trigger onSelect.
 * Picker uses snap-scroll list of items in a fixed-height container.
 * We grab nth picker container and dispatch scroll event.
 */
async function scrollWheel(page: import("@playwright/test").Page, columnIdx: number): Promise<void> {
  // ScrollWheelPicker renders a div with overflow-y-auto + items. Find by class
  // pattern. If we can't, just rely on default values which Onboarding.tsx
  // initial state captures via updateDob() defaults.
  const wheels = page.locator('[role="listbox"], div.overflow-y-auto, div.overflow-y-scroll');
  const count = await wheels.count();
  if (count > columnIdx) {
    const wheel = wheels.nth(columnIdx);
    await wheel.evaluate((el) => {
      el.scrollTop = el.scrollTop + 40;
      el.dispatchEvent(new Event("scroll"));
    });
    await page.waitForTimeout(400);
  }
}
