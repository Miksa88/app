// ============================================================================
// workout-completion.spec.ts — Done set × N + Finish → queue advance
// ============================================================================
//
// Direktno kroz Supabase kao authenticated klijent:
//   1. INSERT u exercise_progress (RLS dozvoljava klijentu CRUD svoje)
//   2. POST na process-workout-completion EF sa sessionId iz queue-a
//   3. Verify: sessionPointer advance, queue[0].status='completed'
// ============================================================================

import { test, expect } from "@playwright/test";
import { getAuthenticatedClient, invokeEdgeFunction } from "./helpers/authClient";
import { admin, getUserStatus, countRows, resetTestUserData } from "./helpers/supabaseAdmin";
import { TEST_USER } from "./helpers/auth";

test.describe("Workout completion flow", () => {
  let exerciseId: string;

  test.beforeAll(async () => {
    // Pick any system exercise za exercise_progress insert
    const { data } = await admin
      .from("exercises")
      .select("id")
      .eq("is_system_exercise", true)
      .limit(1)
      .maybeSingle();
    exerciseId = data?.id as string;
    if (!exerciseId) throw new Error("[setup] no system exercises in DB");
  });

  test.beforeEach(async () => {
    await resetTestUserData(TEST_USER.id);

    // Reset user_status queue na čistu startnu tačku (A1 next)
    const status = await getUserStatus(TEST_USER.id);
    if (!status) throw new Error("user_status missing");
    const s = status as {
      training: {
        queue: {
          sessions: Array<{ sessionId: string; status: string; completedAt: unknown }>;
          sessionPointer: number;
        };
      };
    };
    s.training.queue.sessionPointer = 0;
    for (const sess of s.training.queue.sessions) {
      sess.status = "pending";
      sess.completedAt = null;
    }
    if (s.training.queue.sessions.length > 0) {
      s.training.queue.sessions[0].status = "next";
    }
    await admin
      .from("user_status")
      .update({ status_json: status })
      .eq("client_id", TEST_USER.id);
  });

  test("completeSet × 3 → exercise_progress insert (client direct RLS)", async () => {
    const client = await getAuthenticatedClient();

    const before = await countRows("exercise_progress", TEST_USER.id);

    for (let i = 1; i <= 3; i++) {
      const { error } = await client.from("exercise_progress").insert({
        user_id: TEST_USER.id,
        exercise_id: exerciseId,
        set_number: i,
        weight_kg: 50,
        reps: 8,
        rir: 2,
      });
      expect(error, `set #${i} insert error: ${JSON.stringify(error)}`).toBeNull();
    }

    const after = await countRows("exercise_progress", TEST_USER.id);
    expect(after - before).toBe(3);
  });

  test("finishWorkout → queue.sessionPointer advance + session status=completed", async () => {
    // Load queue state
    const statusBefore = await getUserStatus(TEST_USER.id);
    const sBefore = statusBefore as {
      training: { queue: { sessions: Array<{ sessionId: string }>; sessionPointer: number } };
    };
    const pointerBefore = sBefore.training.queue.sessionPointer;
    const activeSessionId = sBefore.training.queue.sessions[pointerBefore]?.sessionId;
    expect(activeSessionId, "queue has active session").toBeTruthy();

    const { data, error } = await invokeEdgeFunction<{
      ok: boolean;
      queueAdvanced: boolean;
      status: { training: { queue: { sessionPointer: number } } };
    }>("process-workout-completion", {
      clientId: TEST_USER.id,
      sessionId: activeSessionId,
      completedAt: new Date().toISOString(),
    });

    expect(error, `EF error: ${error}`).toBeNull();
    expect(data?.ok).toBe(true);
    expect(data?.queueAdvanced).toBe(true);
    expect(data?.status.training.queue.sessionPointer).toBe(pointerBefore + 1);

    // DB verify — first session is now completed
    const statusAfter = await getUserStatus(TEST_USER.id);
    const sAfter = statusAfter as {
      training: {
        queue: {
          sessions: Array<{ sessionId: string; status: string; completedAt: unknown }>;
          sessionPointer: number;
        };
      };
    };
    expect(sAfter.training.queue.sessions[pointerBefore].status).toBe("completed");
    expect(sAfter.training.queue.sessions[pointerBefore].completedAt).not.toBeNull();
  });

  test("finishWorkout sa pogrešnim sessionId → 400 (retry-safe guard)", async () => {
    const { error } = await invokeEdgeFunction("process-workout-completion", {
      clientId: TEST_USER.id,
      sessionId: "NONEXISTENT-SESSION-ID",
      completedAt: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
  });
});
