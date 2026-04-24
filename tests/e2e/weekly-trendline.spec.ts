// ============================================================================
// weekly-trendline.spec.ts — dve weekly check-in → delta + calorie adaptacija
// ============================================================================
// Spec 02 §10: druga weekly nedelja računa delta vs prethodna (MA5 vs MA5).
// deficit + slab loss (< -0.3kg) → tighten -100kcal
// ============================================================================

import { test, expect } from "@playwright/test";
import { invokeEdgeFunction } from "./helpers/authClient";
import { admin, getUserStatus, resetTestUserData } from "./helpers/supabaseAdmin";
import { TEST_USER } from "./helpers/auth";

test.describe("Weekly trendline adaptacija", () => {
  test.beforeEach(async () => {
    await resetTestUserData(TEST_USER.id);

    // Reset calorie target na deterministic 1800 (iz init-a je 1500; postavimo 1800
    // da vidimo pravi delta posle adapter-a)
    const status = await getUserStatus(TEST_USER.id);
    if (status) {
      const s = status as { nutrition: { currentCalorieTarget: number; targetMode: string } };
      s.nutrition.currentCalorieTarget = 1800;
      s.nutrition.targetMode = "deficit";
      await admin.from("user_status").update({ status_json: status }).eq("client_id", TEST_USER.id);
    }
  });

  test("dve weekly, druga je slab loss (delta -0.1) → deficit tighten -100kcal", async () => {
    const mondayA = new Date();
    mondayA.setDate(mondayA.getDate() - 7);
    const mondayAIso = mondayA.toISOString().slice(0, 10);
    const mondayB = new Date();
    const mondayBIso = mondayB.toISOString().slice(0, 10);

    // Week A: weight 60.0
    const a = await invokeEdgeFunction("process-weekly-check-in", {
      clientId: TEST_USER.id,
      weekStartDate: mondayAIso,
      weightAvgKg: 60.0,
      energyAvg: 7,
      identityScore: 4,
    });
    expect(a.error, `Week A error: ${a.error}`).toBeNull();

    // Week B: weight 59.9 (slab loss — delta -0.1 kg)
    const b = await invokeEdgeFunction<{
      ok: boolean;
      status: { nutrition: { currentCalorieTarget: number } };
      trendline: { action: string; reason: string };
      weeklyWeightDelta: number;
    }>("process-weekly-check-in", {
      clientId: TEST_USER.id,
      weekStartDate: mondayBIso,
      weightAvgKg: 59.9,
      energyAvg: 7,
      identityScore: 4,
    });
    expect(b.error, `Week B error: ${b.error}`).toBeNull();
    expect(b.data?.ok).toBe(true);
    expect(b.data?.trendline.action).toBe("tighten");
    expect(b.data?.weeklyWeightDelta).toBeCloseTo(-0.1, 1);
    expect(b.data?.status.nutrition.currentCalorieTarget).toBe(1700); // 1800 - 100
  });

  test("dve weekly, druga je prebrz loss (-1.5kg) → deficit relax +50kcal", async () => {
    const mondayAIso = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    const mondayBIso = new Date().toISOString().slice(0, 10);

    await invokeEdgeFunction("process-weekly-check-in", {
      clientId: TEST_USER.id,
      weekStartDate: mondayAIso,
      weightAvgKg: 60.0,
      energyAvg: 6,
      identityScore: 3,
    });

    const b = await invokeEdgeFunction<{
      ok: boolean;
      trendline: { action: string };
      status: { nutrition: { currentCalorieTarget: number } };
    }>("process-weekly-check-in", {
      clientId: TEST_USER.id,
      weekStartDate: mondayBIso,
      weightAvgKg: 58.5, // -1.5 kg → premnogo
      energyAvg: 6,
      identityScore: 3,
    });

    expect(b.error).toBeNull();
    expect(b.data?.trendline.action).toBe("relax");
    expect(b.data?.status.nutrition.currentCalorieTarget).toBe(1850); // 1800 + 50
  });
});
