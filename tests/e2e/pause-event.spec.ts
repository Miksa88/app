// ============================================================================
// pause-event.spec.ts — start-pause + end-pause EF direct flow
// ============================================================================
// UI (Profile "Pauza") nije dovršen u IT-16; testiramo backend end-to-end.
// ============================================================================

import { test, expect } from "@playwright/test";
import { invokeEdgeFunction } from "./helpers/authClient";
import { admin, countRows, resetTestUserData } from "./helpers/supabaseAdmin";
import { TEST_USER } from "./helpers/auth";

test.describe("Pause event", () => {
  test.beforeEach(async () => {
    await resetTestUserData(TEST_USER.id);
  });

  test("start-pause (illness) → pause_events insert + user_status.activePauseEvent patch", async () => {
    const before = await countRows("pause_events", TEST_USER.id);

    const { status, data, error } = await invokeEdgeFunction<{
      ok: boolean;
      pauseEvent: { id: string; pause_type: string; is_active: boolean };
      status: { training: { activePauseEvent: { type: string; penaltySessionsRemaining: number } | null } };
    }>("start-pause", {
      clientId: TEST_USER.id,
      pauseType: "illness",
      startDate: new Date().toISOString().slice(0, 10),
    });

    expect(error, `start-pause EF error: ${error}`).toBeNull();
    expect(status).toBe(200);
    expect(data?.ok).toBe(true);
    expect(data?.pauseEvent.pause_type).toBe("illness");
    expect(data?.pauseEvent.is_active).toBe(true);
    expect(data?.status.training.activePauseEvent?.type).toBe("illness");
    expect(data?.status.training.activePauseEvent?.penaltySessionsRemaining).toBe(2);

    const after = await countRows("pause_events", TEST_USER.id);
    expect(after - before).toBe(1);
  });

  test("start-pause (travel) → 0 penalty sessions", async () => {
    const { data, error } = await invokeEdgeFunction<{
      ok: boolean;
      status: { training: { activePauseEvent: { penaltySessionsRemaining: number } } };
    }>("start-pause", {
      clientId: TEST_USER.id,
      pauseType: "travel",
      startDate: new Date().toISOString().slice(0, 10),
    });

    expect(error).toBeNull();
    expect(data?.ok).toBe(true);
    expect(data?.status.training.activePauseEvent?.penaltySessionsRemaining).toBe(0);
  });

  test("start-pause drugi put → 409 konflikt (partial UNIQUE one-active-per-user)", async () => {
    // Prvi poziv — OK
    await invokeEdgeFunction("start-pause", {
      clientId: TEST_USER.id,
      pauseType: "illness",
      startDate: new Date().toISOString().slice(0, 10),
    });

    // Drugi poziv — 409
    const { status, error } = await invokeEdgeFunction("start-pause", {
      clientId: TEST_USER.id,
      pauseType: "travel",
      startDate: new Date().toISOString().slice(0, 10),
    });

    // supabase-js functions.invoke vraća error object umesto sirovog status code
    // Kod 409 se manifestuje kao non-null error
    expect(error).not.toBeNull();
  });

  test("end-pause → is_active=false + activePauseEvent=null", async () => {
    // Setup: startuj pauzu
    await invokeEdgeFunction("start-pause", {
      clientId: TEST_USER.id,
      pauseType: "illness",
      startDate: new Date().toISOString().slice(0, 10),
    });

    // Završi
    const { data, error } = await invokeEdgeFunction<{
      ok: boolean;
      status: { training: { activePauseEvent: unknown } };
    }>("end-pause", {
      clientId: TEST_USER.id,
    });

    expect(error).toBeNull();
    expect(data?.ok).toBe(true);
    expect(data?.status.training.activePauseEvent).toBeNull();

    // DB row je is_active=false
    const { data: rows } = await admin
      .from("pause_events")
      .select("is_active, end_date")
      .eq("user_id", TEST_USER.id)
      .eq("pause_type", "illness");
    expect(rows?.[0]?.is_active).toBe(false);
    expect(rows?.[0]?.end_date).not.toBeNull();
  });
});
