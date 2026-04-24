// ============================================================================
// metabolic-noise.spec.ts — 3 liquid meal-a u 24h → blokada progresije
// ============================================================================
// Sync Rule 6 (spec 03 §3.2): ako klijent konzumira > 10% dnevnog cal-target-a
// kroz tečne kalorije (was_liquid_calories=true), process-meal-log EF postavlja
// status.nutrition.isMetabolicNoiseTriggered = true i blokira plan promene
// naredne 3 dana.
// ============================================================================

import { test, expect } from "@playwright/test";
import { invokeEdgeFunction } from "./helpers/authClient";
import { admin, getUserStatus, resetTestUserData } from "./helpers/supabaseAdmin";
import { TEST_USER } from "./helpers/auth";

test.describe("Metabolic noise blokada", () => {
  test.beforeEach(async () => {
    await resetTestUserData(TEST_USER.id);
    // Reset flag-ove iz prethodnog testa (meal_logs je obrisan ali user_status
    // zadržava _blockProgressionUntil i isMetabolicNoiseTriggered)
    const status = await getUserStatus(TEST_USER.id);
    if (status) {
      const s = status as { nutrition: Record<string, unknown> };
      s.nutrition.isMetabolicNoiseTriggered = false;
      s.nutrition._blockProgressionUntil = null;
      await admin.from("user_status").update({ status_json: status }).eq("client_id", TEST_USER.id);
    }
  });

  test("3 tečne kalorije po 500kcal (1500/1500 = 100%) → isMetabolicNoiseTriggered=true", async () => {
    // Test user-ov currentCalorieTarget je 1500 kcal iz init-a
    // 3 × 500 = 1500 kcal liquid = 100% target → triggeruje block

    for (let i = 0; i < 3; i++) {
      await invokeEdgeFunction("process-meal-log", {
        clientId: TEST_USER.id,
        mealId: `test-liquid-${i}`,
        slotIndex: i,
        status: "logged",
        calories: 500,
        protein: 10,
        carbs: 60,
        fat: 20,
        wasLiquidCalories: true,
      });
    }

    // UserStatus refresh
    const status = await getUserStatus(TEST_USER.id);
    expect(status, "user_status postoji").not.toBeNull();
    const nutrition = (status as { nutrition: { isMetabolicNoiseTriggered?: boolean; _blockProgressionUntil?: string | null } }).nutrition;

    expect(nutrition.isMetabolicNoiseTriggered, "Rule 6 trigger flag").toBe(true);
  });

  test("3 solidne kalorije po 500kcal → NE triggeruje (sve hrana)", async () => {
    for (let i = 0; i < 3; i++) {
      await invokeEdgeFunction("process-meal-log", {
        clientId: TEST_USER.id,
        mealId: `test-solid-${i}`,
        slotIndex: i,
        status: "logged",
        calories: 500,
        protein: 40,
        carbs: 50,
        fat: 15,
        wasLiquidCalories: false,
      });
    }

    const status = await getUserStatus(TEST_USER.id);
    const nutrition = (status as { nutrition: { isMetabolicNoiseTriggered?: boolean } }).nutrition;
    expect(nutrition.isMetabolicNoiseTriggered ?? false).toBe(false);
  });
});
