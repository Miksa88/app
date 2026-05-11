// ============================================================================
// masterWorkouts — 6 default workout-a iz master spec dokumenata
// ============================================================================
//
// Pripadaju master programima:
//   - Beginner 7-Week Foundation:        FB-A, FB-B
//   - Intermediate 6-Week Upper/Lower:   Upper A, Upper B, Lower A, Lower B
//
// Sets/reps/rest su starting point — algoritam u pozadini pegla RIR/RPE
// rampu, težinu i deload na osnovu mesocycleConfig-a (programGenerator).
// `exerciseId` je placeholder (1) — trener bira pravu vežbu nakon klone-a;
// ime vežbe je vidljivo u listi.
// ============================================================================

import type { Workout } from "./trainingMockData";

const ex = (id: string, name: string, sets: number, reps: string, rest: string, order: number, weight = "0", notes = "") => ({
  id,
  exerciseId: 1,
  name,
  sets,
  reps,
  weight,
  rest,
  notes,
  order,
});

export const MASTER_WORKOUTS: Workout[] = [
  // ── Beginner Full Body A ──
  {
    id: "master-fba",
    name: "Full Body A — Beginner",
    description: "Squat, bench, row pattern. Linear progression svake nedelje.",
    tags: ["beginner", "full_body"],
    createdAt: "2026-05-09",
    sections: [
      {
        id: "fba-warm", name: "Warmup", type: "warmup",
        exercises: [
          ex("fba-w1", "Glute Bridge", 2, "12", "30s", 0),
          ex("fba-w2", "Bodyweight Squat", 1, "10", "30s", 1),
        ],
      },
      {
        id: "fba-main", name: "Main", type: "regular",
        exercises: [
          ex("fba-m1", "Barbell Squat", 3, "8-10", "120s", 0, "20", "Glavna compound"),
          ex("fba-m2", "Bench Press", 3, "8-10", "90s", 1),
          ex("fba-m3", "Cable Row", 3, "10-12", "75s", 2),
          ex("fba-m4", "Romanian Deadlift", 2, "10", "75s", 3),
          ex("fba-m5", "Plank", 2, "30s", "30s", 4),
        ],
      },
    ],
  },

  // ── Beginner Full Body B ──
  {
    id: "master-fbb",
    name: "Full Body B — Beginner",
    description: "Deadlift, overhead press, pull pattern.",
    tags: ["beginner", "full_body"],
    createdAt: "2026-05-09",
    sections: [
      {
        id: "fbb-warm", name: "Warmup", type: "warmup",
        exercises: [
          ex("fbb-w1", "Cat-Cow", 2, "8", "30s", 0),
          ex("fbb-w2", "Band Pull Apart", 2, "12", "30s", 1),
        ],
      },
      {
        id: "fbb-main", name: "Main", type: "regular",
        exercises: [
          ex("fbb-m1", "Romanian Deadlift", 3, "8-10", "120s", 0, "30"),
          ex("fbb-m2", "Overhead Press", 3, "8-10", "90s", 1),
          ex("fbb-m3", "Lat Pulldown", 3, "10-12", "75s", 2),
          ex("fbb-m4", "Goblet Squat", 2, "12", "75s", 3, "10"),
          ex("fbb-m5", "Dead Bug", 2, "10", "30s", 4),
        ],
      },
    ],
  },

  // ── Intermediate Upper A (Heavy) ──
  {
    id: "master-upa",
    name: "Upper A — Heavy",
    description: "Heavy compound focus. RPE 7-8. 90% ramp set za prvi compound.",
    tags: ["intermediate", "upper", "heavy"],
    createdAt: "2026-05-09",
    sections: [
      {
        id: "upa-warm", name: "Warmup + Ramp", type: "warmup",
        exercises: [
          ex("upa-w1", "Band Pull Apart", 2, "15", "30s", 0),
          ex("upa-w2", "Bench Press (90% ramp)", 1, "3", "60s", 1, "—", "Ramp set ka radnoj težini"),
        ],
      },
      {
        id: "upa-main", name: "Main", type: "regular",
        exercises: [
          ex("upa-m1", "Bench Press", 4, "5-7", "150s", 0, "—", "RPE 8"),
          ex("upa-m2", "Bent Over Row", 4, "6-8", "120s", 1, "—", "RPE 8"),
          ex("upa-m3", "Overhead Press", 3, "8-10", "90s", 2),
          ex("upa-m4", "Pull-up", 3, "AMRAP", "90s", 3),
          ex("upa-m5", "Triceps Pushdown", 3, "10-12", "60s", 4),
        ],
      },
    ],
  },

  // ── Intermediate Upper B (Volume) ──
  {
    id: "master-upb",
    name: "Upper B — Volume",
    description: "Volume + isolation. RPE 6-8 sa više ponavljanja.",
    tags: ["intermediate", "upper", "volume"],
    createdAt: "2026-05-09",
    sections: [
      {
        id: "upb-warm", name: "Warmup", type: "warmup",
        exercises: [
          ex("upb-w1", "Face Pull", 2, "15", "30s", 0),
          ex("upb-w2", "Scapular Push-up", 2, "10", "30s", 1),
        ],
      },
      {
        id: "upb-main", name: "Main", type: "regular",
        exercises: [
          ex("upb-m1", "Incline DB Press", 4, "10-12", "90s", 0),
          ex("upb-m2", "Lat Pulldown", 4, "10-12", "90s", 1),
          ex("upb-m3", "DB Lateral Raise", 4, "12-15", "60s", 2),
          ex("upb-m4", "DB Bicep Curl", 3, "10-12", "60s", 3),
          ex("upb-m5", "Cable Triceps Pushdown", 3, "12-15", "60s", 4),
          ex("upb-m6", "Face Pull", 3, "15", "45s", 5),
        ],
      },
    ],
  },

  // ── Intermediate Lower A (Heavy) ──
  {
    id: "master-loa",
    name: "Lower A — Heavy",
    description: "Heavy squat + RDL focus. RPE 7-8. 90% ramp set.",
    tags: ["intermediate", "lower", "heavy"],
    createdAt: "2026-05-09",
    sections: [
      {
        id: "loa-warm", name: "Warmup + Ramp", type: "warmup",
        exercises: [
          ex("loa-w1", "Glute Bridge", 2, "15", "30s", 0),
          ex("loa-w2", "Squat (90% ramp)", 1, "3", "60s", 1, "—", "Ramp set"),
        ],
      },
      {
        id: "loa-main", name: "Main", type: "regular",
        exercises: [
          ex("loa-m1", "Barbell Squat", 4, "5-7", "180s", 0, "—", "RPE 8"),
          ex("loa-m2", "Romanian Deadlift", 4, "6-8", "150s", 1),
          ex("loa-m3", "Bulgarian Split Squat", 3, "8-10", "90s", 2),
          ex("loa-m4", "Standing Calf Raise", 3, "10-12", "60s", 3),
          ex("loa-m5", "Hanging Leg Raise", 3, "10", "60s", 4),
        ],
      },
    ],
  },

  // ── Intermediate Lower B (Volume) ──
  {
    id: "master-lob",
    name: "Lower B — Volume",
    description: "Volume + glute-focus. RPE 6-8 sa hip thrust + više ponavljanja.",
    tags: ["intermediate", "lower", "volume"],
    createdAt: "2026-05-09",
    sections: [
      {
        id: "lob-warm", name: "Activation", type: "warmup",
        exercises: [
          ex("lob-w1", "Glute Bridge", 2, "15", "30s", 0, "0", "Squeeze 2s"),
          ex("lob-w2", "Hip Thrust (no weight)", 2, "10", "30s", 1),
        ],
      },
      {
        id: "lob-main", name: "Main", type: "regular",
        exercises: [
          ex("lob-m1", "Hip Thrust", 4, "10-12", "90s", 0),
          ex("lob-m2", "Front Squat", 3, "8-10", "120s", 1),
          ex("lob-m3", "Leg Press", 3, "12-15", "75s", 2),
          ex("lob-m4", "Leg Curl", 3, "12-15", "60s", 3),
          ex("lob-m5", "Cable Kickback", 3, "12-15", "45s", 4),
          ex("lob-m6", "Seated Calf Raise", 3, "12-15", "45s", 5),
        ],
      },
    ],
  },
];
