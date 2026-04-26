// ============================================================================
// real-user-walk.spec.ts — comprehensive real-user walkthrough QA
// ============================================================================
// Walks every flow on client + trainer side, narrates via console.log.
// Run: npx playwright test real-user-walk.spec.ts --reporter=list
// ============================================================================

import { test, expect, type Page } from "@playwright/test";
import { loginAsTestUser, TEST_USER } from "./helpers/auth";
import { resetAuthClient } from "./helpers/authClient";
import { admin } from "./helpers/supabaseAdmin";
import * as path from "path";

const SCREENSHOT_DIR = "test-results/walk-screenshots";

// ----- helpers -----
function log(msg: string): void {
  // eslint-disable-next-line no-console
  console.log(`[walk] ${msg}`);
}

async function shoot(page: Page, name: string): Promise<void> {
  await page
    .screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true })
    .catch(() => undefined);
}

async function assertNoErrorBoundary(page: Page, label: string): Promise<void> {
  const crashed = await page
    .getByText(/something went wrong|greška|retry|pokušaj ponovo/i)
    .isVisible()
    .catch(() => false);
  if (crashed) {
    log(`FAIL ${label}: ErrorBoundary visible`);
  }
  expect(crashed, `${label}: ErrorBoundary visible`).toBeFalsy();
}

// ============================================================================
// CLIENT walk
// ============================================================================

test.describe.serial("Real-user walk — CLIENT", () => {
  const consoleErrors: string[] = [];

  test.beforeAll(async () => {
    // Ensure user is client (not trainer leftover)
    await admin.from("profiles").update({ role: "client" }).eq("id", TEST_USER.id);
    resetAuthClient();
  });

  test("Auth: landing → login → /home", async ({ page }) => {
    page.on("pageerror", (err) => {
      consoleErrors.push(`[pageerror] ${err.message}`);
      log(`PAGEERROR ${err.message}`);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const txt = msg.text();
        // ignore known noise (HMR, ResizeObserver, fonts)
        if (/ResizeObserver|net::ERR_|favicon|HMR/i.test(txt)) return;
        consoleErrors.push(`[console] ${txt}`);
      }
    });

    log("Visiting landing /");
    await page.goto("/");
    await shoot(page, "01-landing");

    // Landing should have CTA visible
    const hasGetStarted = await page
      .getByRole("button", { name: /get started|započni|krenimo|start/i })
      .first()
      .isVisible()
      .catch(() => false);
    log(`Landing CTA visible: ${hasGetStarted}`);

    log("Clicking 'Sign In'");
    await loginAsTestUser(page);

    log(`After login URL: ${page.url()}`);
    await expect(page).toHaveURL(/\/home/);
    await shoot(page, "02-after-login-home");
  });

  test("Home tab: greeting, water widget, daily check-in sheet", async ({ page }) => {
    await loginAsTestUser(page);
    await page.waitForURL(/\/home/);
    await page.waitForTimeout(1000);

    // 1) Greeting
    const greetingArea = await page.locator("body").innerText().catch(() => "");
    const hasSarah = /Sarah/i.test(greetingArea);
    log(`Hardcoded "Sarah" present: ${hasSarah}`);
    expect(hasSarah, "Hardcoded 'Sarah' should NOT appear").toBeFalsy();

    // 2) Streak chip — should be hidden if 0 (no hardcoded 14)
    const streak14 = await page
      .getByText(/^14$/)
      .first()
      .isVisible()
      .catch(() => false);
    log(`Hardcoded "14" streak visible: ${streak14}`);

    // 3) Sleep / stress should not show "7.5h Dobro" hardcoded combo
    const sleepHardcoded = await page
      .getByText(/7\.5h\s*Dobro/i)
      .isVisible()
      .catch(() => false);
    log(`Hardcoded "7.5h Dobro" visible: ${sleepHardcoded}`);
    expect(sleepHardcoded, "Hardcoded sleep combo present").toBeFalsy();

    // 4) Fueling — should not be hardcoded "1302/2100"
    const fuelingHardcoded = await page
      .getByText(/1302\s*\/\s*2100/i)
      .isVisible()
      .catch(() => false);
    log(`Hardcoded "1302/2100" fueling: ${fuelingHardcoded}`);
    expect(fuelingHardcoded, "Hardcoded fueling present").toBeFalsy();

    await shoot(page, "03-home-rendered");

    // 5) Water widget — find +/- glass buttons
    log("Looking for water widget +/- buttons");
    const plusBtn = page
      .locator("button")
      .filter({ has: page.locator("svg") })
      .filter({ hasText: "" })
      .nth(0);
    // Try a more robust selector via aria
    const plus = page.getByRole("button", { name: /\+|add|dodaj/i }).first();
    const minus = page.getByRole("button", { name: /−|-|minus|remove/i }).first();

    const plusVisible = await plus.isVisible().catch(() => false);
    log(`Water + button visible: ${plusVisible}`);
    if (plusVisible) {
      try {
        await plus.click();
        await page.waitForTimeout(500);
        log("Clicked water +");
        const minusVisible = await minus.isVisible().catch(() => false);
        if (minusVisible) {
          await minus.click();
          await page.waitForTimeout(500);
          log("Clicked water -");
        }
      } catch (e) {
        log(`Water widget click failed: ${(e as Error).message}`);
      }
    }

    // 6) Daily check-in sheet
    const checkInBtn = page.getByText(/daily check-?in|dnevn[ai] (provera|check)/i).first();
    const ciVisible = await checkInBtn.isVisible().catch(() => false);
    log(`Daily check-in trigger visible: ${ciVisible}`);
    if (ciVisible) {
      try {
        await checkInBtn.click();
        await page.waitForTimeout(800);
        const sheet = page.locator('[role="dialog"]').first();
        const sheetOpen = await sheet.isVisible().catch(() => false);
        log(`Daily check-in sheet opened: ${sheetOpen}`);
        await shoot(page, "04-daily-checkin-open");
        // Close — press Escape (don't submit, would mutate state)
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
      } catch (e) {
        log(`Daily check-in failed: ${(e as Error).message}`);
      }
    }
  });

  test("Bottom nav: Home/Gym/Food/Progress/Profile", async ({ page }) => {
    await loginAsTestUser(page);
    await page.waitForURL(/\/home/);

    const tabs = [
      { route: "/home", label: "home" },
      { route: "/gym", label: "gym" },
      { route: "/food", label: "food" },
      { route: "/progress", label: "progress" },
      { route: "/profile", label: "profile" },
    ];

    for (const tab of tabs) {
      log(`Navigating to ${tab.route}`);
      await page.goto(tab.route, { waitUntil: "networkidle", timeout: 15_000 });
      await page.waitForTimeout(800);
      await assertNoErrorBoundary(page, tab.route);
      await shoot(page, `05-tab-${tab.label}`);
      log(`OK ${tab.route} rendered`);
    }
  });

  test("Gym tab: render, optional 'Start session'", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/gym");
    await page.waitForTimeout(1200);
    await assertNoErrorBoundary(page, "/gym");

    const startBtn = page.getByText(/start session|započni|start workout/i).first();
    const visible = await startBtn.isVisible().catch(() => false);
    log(`Gym 'Start session' visible: ${visible}`);
    await shoot(page, "06-gym");

    if (visible) {
      try {
        await startBtn.click();
        await page.waitForURL(/\/workout\/active|\/gym/, { timeout: 5000 }).catch(() => undefined);
        log(`After start: ${page.url()}`);
        await shoot(page, "06-gym-active");
        await page.goBack().catch(() => undefined);
      } catch (e) {
        log(`Gym start failed: ${(e as Error).message}`);
      }
    }
  });

  test("Food tab: meal card → open modal", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/food");
    await page.waitForTimeout(1200);
    await assertNoErrorBoundary(page, "/food");
    await shoot(page, "07-food");

    // Find first card-like element — look for any clickable element with meal-like content
    const mealCard = page
      .locator('[class*="card"]')
      .filter({ hasText: /breakfast|lunch|dinner|snack|doručak|ručak|večera|užina/i })
      .first();
    const cardVisible = await mealCard.isVisible().catch(() => false);
    log(`Meal card visible: ${cardVisible}`);
    if (cardVisible) {
      try {
        await mealCard.click();
        await page.waitForTimeout(800);
        const sheet = page.locator('[role="dialog"]').first();
        const sheetOpen = await sheet.isVisible().catch(() => false);
        log(`Meal modal opened: ${sheetOpen}`);
        await shoot(page, "07-food-modal");
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
      } catch (e) {
        log(`Food modal failed: ${(e as Error).message}`);
      }
    }
  });

  test("Progress tab: tabs Completed/Adaptation, hardcoded checks", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/progress");
    await page.waitForTimeout(1200);
    await assertNoErrorBoundary(page, "/progress");
    await shoot(page, "08-progress");

    // Hardcoded value sniff
    const body = await page.locator("body").innerText();
    const hits: string[] = [];
    for (const tok of ["12.4t", "12,4t", "Mar '26", "Mar 2026"]) {
      if (body.includes(tok)) hits.push(tok);
    }
    log(`Progress hardcoded suspect tokens: ${hits.join(", ") || "none"}`);

    // Try toggling Adaptation tab
    const adaptTab = page.getByText(/adaptation|adaptacij[ae]/i).first();
    if (await adaptTab.isVisible().catch(() => false)) {
      await adaptTab.click();
      await page.waitForTimeout(500);
      log("Clicked Adaptation tab");
      await shoot(page, "08-progress-adapt");
    }
    const completedTab = page.getByText(/completed|završen[oi]/i).first();
    if (await completedTab.isVisible().catch(() => false)) {
      await completedTab.click();
      await page.waitForTimeout(500);
      log("Clicked Completed tab");
    }
  });

  test("Milestones subroute renders", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/milestones");
    await page.waitForTimeout(1000);
    await assertNoErrorBoundary(page, "/milestones");
    await shoot(page, "09-milestones");
    log("/milestones rendered OK");
  });

  test("Profile: real name, Subscription beta, Personal details edit", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/profile");
    await page.waitForTimeout(1200);
    await assertNoErrorBoundary(page, "/profile");
    await shoot(page, "10-profile");

    const body = await page.locator("body").innerText();
    const hasSarahJohnson = /Sarah Johnson/i.test(body);
    log(`'Sarah Johnson' present: ${hasSarahJohnson}`);
    expect(hasSarahJohnson, "Hardcoded Sarah Johnson on profile").toBeFalsy();

    // Subscription row → click → assert no €49.99 / €79
    const subRow = page.getByText(/subscription|pretplata/i).first();
    if (await subRow.isVisible().catch(() => false)) {
      try {
        await subRow.click();
        await page.waitForTimeout(900);
        await shoot(page, "10-profile-subscription");
        const subBody = await page.locator("body").innerText();
        const hasOldPrice = /€49\.99|€79|€299/i.test(subBody);
        log(`Old prices on Subscription page: ${hasOldPrice}`);
        expect(hasOldPrice, "Old €49.99/€79/€299 prices visible").toBeFalsy();
        await page.goBack().catch(() => undefined);
        await page.waitForTimeout(500);
      } catch (e) {
        log(`Subscription nav failed: ${(e as Error).message}`);
      }
    }

    // Personal details / Lični podaci
    const pdRow = page.getByText(/personal details|lični podaci/i).first();
    if (await pdRow.isVisible().catch(() => false)) {
      try {
        await pdRow.click();
        await page.waitForTimeout(900);
        await shoot(page, "10-profile-personal");
        const pdBody = await page.locator("body").innerText();
        // hardcoded 62kg/168cm sniff (only suspicious if user data is different)
        log(`PersonalDetails contents (first 200 chars): ${pdBody.slice(0, 200)}`);
        await page.goBack().catch(() => undefined);
        await page.waitForTimeout(500);
      } catch (e) {
        log(`Personal details nav failed: ${(e as Error).message}`);
      }
    }

    // Verify Logout button exists (don't click)
    const logoutBtn = page.getByText(/log\s*out|odjavi|sign\s*out/i).first();
    const logoutVisible = await logoutBtn.isVisible().catch(() => false);
    log(`Logout button present: ${logoutVisible}`);
  });

  test("Subscription page direct: beta-access UI", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/subscription");
    await page.waitForTimeout(1000);
    await assertNoErrorBoundary(page, "/subscription");
    await shoot(page, "11-subscription");

    const body = await page.locator("body").innerText();
    const hasBeta = /beta\s*access|free during beta|besplat/i.test(body);
    const hasOldPrices = /€49\.99|€79|€299/i.test(body);
    const hasDurationToggle = /1\s*mo|3\s*mo|6\s*mo/i.test(body);

    log(`Subscription has beta tagline: ${hasBeta}`);
    log(`Subscription has old prices: ${hasOldPrices}`);
    log(`Subscription has duration toggle (1mo/3mo/6mo): ${hasDurationToggle}`);

    expect(hasOldPrices, "Old prices on /subscription").toBeFalsy();

    // CTA: Contact your trainer
    const ctaBtn = page.getByText(/contact your trainer|kontaktiraj/i).first();
    if (await ctaBtn.isVisible().catch(() => false)) {
      try {
        await ctaBtn.click();
        await page.waitForTimeout(800);
        const url = page.url();
        log(`After 'Contact trainer' click: ${url}`);
        expect(url).toMatch(/\/chat/);
      } catch (e) {
        log(`Contact trainer click failed: ${(e as Error).message}`);
      }
    }
  });

  test("Chat: empty state, send message", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/chat");
    await page.waitForTimeout(1000);
    await assertNoErrorBoundary(page, "/chat");
    await shoot(page, "12-chat-empty");

    const body = await page.locator("body").innerText();
    log(`Chat body (first 300): ${body.slice(0, 300)}`);

    // Try input + send
    const input = page.locator('input[type="text"], textarea').first();
    if (await input.isVisible().catch(() => false)) {
      try {
        await input.fill("test message from QA walkthrough");
        await page.waitForTimeout(300);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(800);
        const after = await page.locator("body").innerText();
        const seenMsg = after.includes("test message from QA walkthrough");
        log(`Sent message visible in chat: ${seenMsg}`);
        await shoot(page, "12-chat-after-send");
      } catch (e) {
        log(`Chat send failed: ${(e as Error).message}`);
      }
    } else {
      log("No chat input visible — empty state only");
    }
  });

  test("Console errors summary (CLIENT)", async () => {
    log(`CLIENT console errors collected: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      log(`First 10: ${consoleErrors.slice(0, 10).join(" | ")}`);
    }
  });
});

// ============================================================================
// TRAINER walk
// ============================================================================

test.describe.serial("Real-user walk — TRAINER", () => {
  const consoleErrors: string[] = [];

  test.beforeAll(async () => {
    await admin.from("profiles").update({ role: "trainer" }).eq("id", TEST_USER.id);
    resetAuthClient();
    log("Promoted test user to trainer");
  });

  test.afterAll(async () => {
    await admin.from("profiles").update({ role: "client" }).eq("id", TEST_USER.id);
    resetAuthClient();
    log("Restored test user to client");
  });

  test("Trainer login → /trainer dashboard", async ({ page }) => {
    page.on("pageerror", (err) => {
      consoleErrors.push(`[pageerror] ${err.message}`);
      log(`TRAINER PAGEERROR ${err.message}`);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const txt = msg.text();
        if (/ResizeObserver|net::ERR_|favicon|HMR/i.test(txt)) return;
        consoleErrors.push(`[console] ${txt}`);
      }
    });

    await loginAsTestUser(page);
    await page.waitForURL(/\/trainer/, { timeout: 10_000 });
    log(`Trainer landed on: ${page.url()}`);
    await expect(page).toHaveURL(/\/trainer/);
    await page.waitForTimeout(1500);
    await shoot(page, "20-trainer-dashboard");

    const body = await page.locator("body").innerText();
    log(`Trainer dashboard body (first 300): ${body.slice(0, 300)}`);

    // Check for stat keywords
    const hasKlijentkinje = /klijentkinj|clients/i.test(body);
    const hasOprez = /oprez|risk/i.test(body);
    const hasDeload = /deload/i.test(body);
    const hasLuteal = /luteal/i.test(body);
    log(
      `StatCards: clients=${hasKlijentkinje} risk=${hasOprez} deload=${hasDeload} luteal=${hasLuteal}`,
    );
  });

  test("Trainer clients list", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/trainer/clients");
    await page.waitForTimeout(1500);
    await assertNoErrorBoundary(page, "/trainer/clients");
    await shoot(page, "21-trainer-clients");

    const body = await page.locator("body").innerText();
    const hasEmpty = /no clients yet|nemate klijent|add your first/i.test(body);
    log(`Clients empty state visible: ${hasEmpty}`);

    // Try search input
    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("xyz_no_match");
      await page.waitForTimeout(500);
      log("Filled search");
      await shoot(page, "21-trainer-clients-filtered");
      await searchInput.clear();
    }

    // Try filter chips
    const allChip = page.getByRole("button", { name: /^all$|^sve$/i }).first();
    const riskChip = page.getByRole("button", { name: /at risk|na oprez/i }).first();
    log(`'All' chip visible: ${await allChip.isVisible().catch(() => false)}`);
    log(`'At risk' chip visible: ${await riskChip.isVisible().catch(() => false)}`);
  });

  test("Trainer client detail (self) — 5 tabs", async ({ page }) => {
    await loginAsTestUser(page);
    // Use own ID since we only have one user
    await page.goto(`/trainer/client/${TEST_USER.id}`);
    await page.waitForTimeout(1500);
    await assertNoErrorBoundary(page, `/trainer/client/${TEST_USER.id}`);
    await shoot(page, "22-trainer-client-detail");

    const tabLabels = [
      /overview|pregled/i,
      /training|trening/i,
      /nutrition|ishrana/i,
      /check-?ins|provere/i,
      /settings|podešavanja|opciji/i,
    ];

    for (let i = 0; i < tabLabels.length; i++) {
      const tab = page.getByRole("tab", { name: tabLabels[i] }).first();
      const visible = await tab.isVisible().catch(() => false);
      log(`Tab ${i} (${tabLabels[i]}) visible: ${visible}`);
      if (visible) {
        try {
          await tab.click();
          await page.waitForTimeout(700);
          await assertNoErrorBoundary(page, `client tab ${i}`);
          await shoot(page, `22-tab-${i}`);
        } catch (e) {
          log(`Tab ${i} click failed: ${(e as Error).message}`);
        }
      }
    }

    // Settings tab — verify SyncRulesOverrideSection
    const settingsBody = await page.locator("body").innerText();
    const hasSyncRules = /sync|hormon|deload|luteal/i.test(settingsBody);
    log(`Settings tab content has sync-rules keywords: ${hasSyncRules}`);
  });

  test("Trainer messages: empty state + CTA", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/trainer/messages");
    await page.waitForTimeout(1200);
    await assertNoErrorBoundary(page, "/trainer/messages");
    await shoot(page, "23-trainer-messages");

    const body = await page.locator("body").innerText();
    const hasEmpty = /no conversations|nema razgovora|nemate poruka/i.test(body);
    log(`Messages empty state visible: ${hasEmpty}`);

    const viewClientsBtn = page.getByText(/view clients|vidi klijent/i).first();
    if (await viewClientsBtn.isVisible().catch(() => false)) {
      try {
        await viewClientsBtn.click();
        await page.waitForTimeout(700);
        log(`After 'View clients' click: ${page.url()}`);
      } catch (e) {
        log(`View clients click failed: ${(e as Error).message}`);
      }
    }
  });

  test("Trainer analytics", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/trainer/analytics");
    await page.waitForTimeout(1500);
    await assertNoErrorBoundary(page, "/trainer/analytics");
    await shoot(page, "24-trainer-analytics");

    const body = await page.locator("body").innerText();
    log(`Analytics body (first 300): ${body.slice(0, 300)}`);
  });

  test("Trainer payments: empty state + CTA", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/trainer/payments");
    await page.waitForTimeout(1200);
    await assertNoErrorBoundary(page, "/trainer/payments");
    await shoot(page, "25-trainer-payments");

    const body = await page.locator("body").innerText();
    const hasEmpty = /coming soon|uskoro|payments/i.test(body);
    log(`Payments empty state visible: ${hasEmpty}`);

    const contactBtn = page.getByText(/contact clients|kontaktiraj/i).first();
    if (await contactBtn.isVisible().catch(() => false)) {
      try {
        await contactBtn.click();
        await page.waitForTimeout(700);
        log(`After 'Contact clients' click: ${page.url()}`);
      } catch (e) {
        log(`Contact clients failed: ${(e as Error).message}`);
      }
    }
  });

  test("Trainer training: program library", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/trainer/training");
    await page.waitForTimeout(1500);
    await assertNoErrorBoundary(page, "/trainer/training");
    await shoot(page, "26-trainer-training");

    const body = await page.locator("body").innerText();
    log(`Training body (first 200): ${body.slice(0, 200)}`);

    // Try clicking a program card if any
    const card = page.locator('[class*="card"], [role="button"]').first();
    if (await card.isVisible().catch(() => false)) {
      log("Program card-like element found, NOT clicking (could nav)");
    }
  });

  test("Exercise editor — video upload UI", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/trainer/exercise/new");
    await page.waitForTimeout(1500);
    await assertNoErrorBoundary(page, "/trainer/exercise/new");
    await shoot(page, "27-exercise-new");

    // Form fields
    const nameInput = page
      .locator('input[type="text"], input[name*="name" i], input[placeholder*="name" i]')
      .first();
    log(`Name input visible: ${await nameInput.isVisible().catch(() => false)}`);

    const fileInput = page.locator('input[type="file"]').first();
    const fileInputCount = await fileInput.count().catch(() => 0);
    log(`File input count (hidden video upload): ${fileInputCount}`);

    const uploadText = await page
      .getByText(/upload video|upload|otpremi/i)
      .first()
      .isVisible()
      .catch(() => false);
    log(`'Upload Video' text visible: ${uploadText}`);

    // Note: actual file upload skipped — no test fixture available
    log("Video upload actual file attach: SKIPPED (no fixture). UI presence only.");
  });

  test("Other trainer routes: nutrition, profile, packages, free-trial", async ({ page }) => {
    await loginAsTestUser(page);

    const routes = [
      "/trainer/nutrition",
      "/trainer/profile",
      "/trainer/packages",
      "/trainer/free-trial",
    ];

    for (const r of routes) {
      log(`Visiting ${r}`);
      await page.goto(r, { waitUntil: "domcontentloaded", timeout: 15_000 });
      await page.waitForTimeout(1000);
      await assertNoErrorBoundary(page, r);
      await shoot(page, `28-trainer-${r.replace(/\//g, "_")}`);
      log(`OK ${r}`);
    }
  });

  test("Console errors summary (TRAINER)", async () => {
    log(`TRAINER console errors collected: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      log(`First 10: ${consoleErrors.slice(0, 10).join(" | ")}`);
    }
  });
});
