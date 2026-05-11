// ============================================================================
// masterPrograms — 2 default programa iz master spec dokumenata
// ============================================================================
//
// Source spec:
//   - `pocetnici.md` — 7-week mezo, A/B/A skeleton, 3 dana/nedelji
//   - `files_extracted/KOD-FIT_Master_Protokol_SREDNJE_NAPREDNE_V2.md`
//     — 6-week mezo, U/L 4x split, mixed undulating
//
// Ovi programi se prikazuju kao "Default" kartice u Trainer Training listi.
// Trener ih klonira i uređuje svoju verziju; original ostaje netaknut.
// Algoritam koristi `mesocycleConfig` na prvom danu (mezo 1) za:
//   - RIR/RPE ramp generaciju
//   - exercise substitution po povredama
//   - deload kalkulaciju u poslednjoj nedelji
//   - periodizaciju (linear / undulating / block / DUP)
// ============================================================================

import type { Program } from "./trainingMockData";

export const MASTER_PROGRAMS: Program[] = [
  {
    id: "master-beginner",
    name: "Beginner 7-Week Foundation",
    description: "A/B/A full body skeleton. 3 days/week. Algoritam u pozadini pegla RIR rampu, zamenu vežbi po povredama i deload poslednje nedelje.",
    type: "fixed",
    tags: ["beginner", "foundation", "3_days_week", "default_for_beginner"],
    createdAt: "2026-05-09",
    workoutDays: [
      {
        id: "mb-d1", dayNumber: 1, workoutId: "default-master-fba", workoutName: "Full Body A — Beginner", isRest: false,
        mesocycleStart: true,
        mesocycleConfig: {
          name: "1. Mezociklus — Foundation",
          weeks: 7,
          progression: "linear",
          periodization: "linear",
          deload: "auto",
        },
      },
      { id: "mb-d2", dayNumber: 2, workoutId: null, workoutName: "Rest", isRest: true },
      { id: "mb-d3", dayNumber: 3, workoutId: "default-master-fbb", workoutName: "Full Body B — Beginner", isRest: false },
      { id: "mb-d4", dayNumber: 4, workoutId: null, workoutName: "Rest", isRest: true },
      { id: "mb-d5", dayNumber: 5, workoutId: "default-master-fba", workoutName: "Full Body A — Beginner", isRest: false },
      { id: "mb-d6", dayNumber: 6, workoutId: null, workoutName: "Rest", isRest: true },
      { id: "mb-d7", dayNumber: 7, workoutId: null, workoutName: "Rest", isRest: true },
    ],
  },
  {
    id: "master-intermediate",
    name: "Intermediate 6-Week Upper/Lower",
    description: "U/L 4x split sa mixed undulating periodizacijom. 4 dana/nedelji. 90% ramp set za prvi compound, RPE-based progresija.",
    type: "fixed",
    tags: ["intermediate", "upper_lower", "4_days_week", "default_for_intermediate"],
    createdAt: "2026-05-09",
    workoutDays: [
      {
        id: "mi-d1", dayNumber: 1, workoutId: "default-master-upa", workoutName: "Upper A — Heavy", isRest: false,
        mesocycleStart: true,
        mesocycleConfig: {
          name: "1. Mezociklus — Volume + Intensity",
          weeks: 6,
          progression: "rpe",
          periodization: "undulating",
          deload: "auto",
        },
      },
      { id: "mi-d2", dayNumber: 2, workoutId: "default-master-loa", workoutName: "Lower A — Heavy", isRest: false },
      { id: "mi-d3", dayNumber: 3, workoutId: null, workoutName: "Rest", isRest: true },
      { id: "mi-d4", dayNumber: 4, workoutId: "default-master-upb", workoutName: "Upper B — Volume", isRest: false },
      { id: "mi-d5", dayNumber: 5, workoutId: "default-master-lob", workoutName: "Lower B — Volume", isRest: false },
      { id: "mi-d6", dayNumber: 6, workoutId: null, workoutName: "Rest", isRest: true },
      { id: "mi-d7", dayNumber: 7, workoutId: null, workoutName: "Rest", isRest: true },
    ],
  },
];
