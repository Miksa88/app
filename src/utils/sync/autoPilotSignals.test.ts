import { describe, it, expect } from "vitest";
import {
  detectPlateau,
  checkBeginnerPromoteSignal,
  checkMissingVideos,
  summarizeVolumeDelta,
} from "./autoPilotSignals";

describe("detectPlateau", () => {
  it("returns no_data when target mode is bulk", () => {
    const v = detectPlateau([], "lean_bulk");
    expect(v.kind).toBe("no_data");
  });

  it("returns no_data when fewer than 3 weeks of samples", () => {
    const v = detectPlateau(
      [{ weekStartDate: "2026-04-01", weightAvgKg: 65 }],
      "deficit",
    );
    expect(v.kind).toBe("no_data");
  });

  it("detects plateau when 3 weeks show <0.15kg/week change", () => {
    const v = detectPlateau(
      [
        { weekStartDate: "2026-04-01", weightAvgKg: 65.0 },
        { weekStartDate: "2026-04-08", weightAvgKg: 64.95 },
        { weekStartDate: "2026-04-15", weightAvgKg: 64.92 },
      ],
      "deficit",
    );
    expect(v.kind).toBe("plateau");
  });

  it("returns no_plateau when weight clearly trending down", () => {
    const v = detectPlateau(
      [
        { weekStartDate: "2026-04-01", weightAvgKg: 65 },
        { weekStartDate: "2026-04-08", weightAvgKg: 64.4 },
        { weekStartDate: "2026-04-15", weightAvgKg: 63.8 },
      ],
      "deficit",
    );
    expect(v.kind).toBe("no_plateau");
  });
});

describe("checkBeginnerPromoteSignal", () => {
  it("doesn't promote intermediate clients", () => {
    const v = checkBeginnerPromoteSignal([], "intermediate");
    expect(v.kind).toBe("stay");
  });

  it("doesn't promote with too few sessions", () => {
    const v = checkBeginnerPromoteSignal(
      [
        {
          sessionId: "s1",
          completedAt: "2026-04-20",
          exercises: [{ exerciseId: "e1", repsHit: 12, repRangeTop: 12 }],
        },
      ],
      "beginner",
    );
    expect(v.kind).toBe("stay");
  });

  it("promotes after 8 consecutive top-of-range sessions", () => {
    const sessions = Array.from({ length: 9 }, (_, i) => ({
      sessionId: `s${i}`,
      completedAt: `2026-04-${String(20 - i).padStart(2, "0")}`,
      exercises: [
        { exerciseId: "e1", repsHit: 12, repRangeTop: 12 },
        { exerciseId: "e2", repsHit: 10, repRangeTop: 10 },
      ],
    }));
    const v = checkBeginnerPromoteSignal(sessions, "beginner");
    expect(v.kind).toBe("promote");
  });

  it("breaks streak if any exercise misses top of range", () => {
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      sessionId: `s${i}`,
      completedAt: `2026-04-${String(20 - i).padStart(2, "0")}`,
      exercises: [
        { exerciseId: "e1", repsHit: i === 5 ? 8 : 12, repRangeTop: 12 },  // miss in middle
      ],
    }));
    const v = checkBeginnerPromoteSignal(sessions, "beginner");
    expect(v.kind).toBe("stay");
  });
});

describe("checkMissingVideos", () => {
  it("returns hasMissing=false when all have URLs", () => {
    const v = checkMissingVideos([
      { id: "1", name: "Squat", videoUrl: "https://example.com/v1.mp4" },
      { id: "2", name: "Hip Thrust", videoUrl: "https://example.com/v2.mp4" },
    ]);
    expect(v.hasMissing).toBe(false);
  });

  it("filters out exercises without video", () => {
    const v = checkMissingVideos([
      { id: "1", name: "Squat", videoUrl: "https://example.com/v1.mp4" },
      { id: "2", name: "Hip Thrust", videoUrl: null },
      { id: "3", name: "RDL", videoUrl: null },
    ]);
    expect(v.hasMissing).toBe(true);
    expect(v.exercises.map(e => e.name)).toEqual(["Hip Thrust", "RDL"]);
  });
});

describe("summarizeVolumeDelta", () => {
  it("returns null for insufficient samples", () => {
    expect(summarizeVolumeDelta([])).toBeNull();
    expect(summarizeVolumeDelta([{ date: "2026-04-01", totalVolume: 1000 }])).toBeNull();
  });

  it("detects growth when last is >5% higher than first", () => {
    const v = summarizeVolumeDelta([
      { date: "2026-04-01", totalVolume: 1000 },
      { date: "2026-04-15", totalVolume: 1100 },
    ]);
    expect(v?.kind).toBe("growth");
    expect(v?.deltaPct).toBe(10);
  });

  it("detects decline", () => {
    const v = summarizeVolumeDelta([
      { date: "2026-04-01", totalVolume: 1000 },
      { date: "2026-04-15", totalVolume: 850 },
    ]);
    expect(v?.kind).toBe("decline");
  });

  it("flat when within ±5%", () => {
    const v = summarizeVolumeDelta([
      { date: "2026-04-01", totalVolume: 1000 },
      { date: "2026-04-15", totalVolume: 1020 },
    ]);
    expect(v?.kind).toBe("flat");
  });
});
