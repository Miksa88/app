// ============================================================================
// trainer-flow.spec.ts — trainer login + route access + clientOverrides
// ============================================================================
//
// Supabase email rate-limit sprečava kreiranje drugog test user-a. Umesto
// toga, postojeći beta user (TEST_USER) privremeno dobija role='trainer'
// u beforeAll. Login.tsx `routeByRole` čita svežu role iz DB-a, tako da se
// redirect menja na /trainer. afterAll vraća role='client' za ostale testove.
// ============================================================================

import { test, expect } from "@playwright/test";
import { loginAsTestUser, TEST_USER } from "./helpers/auth";
import { invokeEdgeFunction, resetAuthClient } from "./helpers/authClient";
import { admin, getUserStatus } from "./helpers/supabaseAdmin";

test.describe("Trainer flow", () => {
  test.beforeAll(async () => {
    // Promote test user to trainer
    await admin.from("profiles").update({ role: "trainer" }).eq("id", TEST_USER.id);
    resetAuthClient();
  });

  test.afterAll(async () => {
    // Restore client role for downstream tests
    await admin.from("profiles").update({ role: "client" }).eq("id", TEST_USER.id);
    resetAuthClient();
  });

  test("login → redirect na /trainer (ne /home)", async ({ page }) => {
    await loginAsTestUser(page);
    await expect(page).toHaveURL(/\/trainer/);
  });

  test("trainer routes ne crash-uju", async ({ page }) => {
    await loginAsTestUser(page);

    const TRAINER_ROUTES = [
      "/trainer",
      "/trainer/clients",
      "/trainer/training",
      "/trainer/nutrition",
      "/trainer/messages",
      "/trainer/analytics",
      "/trainer/payments",
      "/trainer/profile",
      "/trainer/packages",
    ];

    const failed: Array<{ route: string; reason: string }> = [];
    for (const route of TRAINER_ROUTES) {
      try {
        await page.goto(route, { waitUntil: "networkidle", timeout: 10_000 });
        const errVis = await page
          .getByText(/something went wrong|greška|retry|pokušaj ponovo/i)
          .isVisible()
          .catch(() => false);
        if (errVis) failed.push({ route, reason: "ErrorBoundary rendered" });
      } catch (e) {
        failed.push({ route, reason: e instanceof Error ? e.message : String(e) });
      }
    }

    expect(failed, `Crashed: ${failed.map((f) => f.route).join(", ")}`).toHaveLength(0);
  });

  test("update-client-overrides EF — disable rule", async () => {
    const { data, error } = await invokeEdgeFunction<{
      ok: boolean;
      status: { clientOverrides: string[] };
    }>("update-client-overrides", {
      clientId: TEST_USER.id, // trainer mutira sopstveni clientOverrides (edge case: OK za test)
      overrides: { hormonal_sync: "disabled" },
    });

    expect(error, `EF error: ${error}`).toBeNull();
    expect(data?.ok).toBe(true);
    expect(data?.status.clientOverrides).toContain("hormonal_sync");

    // DB verify
    const status = await getUserStatus(TEST_USER.id);
    const s = status as { clientOverrides: string[] };
    expect(s.clientOverrides).toContain("hormonal_sync");
  });

  test("update-client-overrides EF — re-enable rule (active)", async () => {
    // Prvo disable
    await invokeEdgeFunction("update-client-overrides", {
      clientId: TEST_USER.id,
      overrides: { deload_sync: "disabled" },
    });

    // Onda enable
    const { data, error } = await invokeEdgeFunction<{
      ok: boolean;
      status: { clientOverrides: string[] };
    }>("update-client-overrides", {
      clientId: TEST_USER.id,
      overrides: { deload_sync: "active" },
    });

    expect(error).toBeNull();
    expect(data?.ok).toBe(true);
    expect(data?.status.clientOverrides).not.toContain("deload_sync");
  });
});
