// ============================================================================
// mealPlanStorageService — unit tests (refactor 1.5)
// ============================================================================
//
// Fokus: backward compatibility ključeva i formata — stari planovi sačuvani
// pre refactor-a MORAJU da se učitaju identično.
// ============================================================================

import { beforeEach, describe, expect, it } from "vitest";
import {
  STORAGE_KEY_PLAN,
  STORAGE_KEY_PANTRY,
  getMonday,
  loadPlan,
  savePlan,
  loadPantry,
  savePantry,
} from "./mealPlanStorageService";
import type { MealPlanWeek } from "@/utils/nutrition/mealPlanGenerator";

const WEEK = "2026-06-08";

function makePlan(weekStartDate: string = WEEK): MealPlanWeek {
  return {
    weekStartDate,
    mealCount: 4,
    dailyTarget: { calories: 1800, protein: 140, carbs: 160, fat: 60 },
    slots: [
      {
        dayIndex: 0,
        slotIndex: 0,
        slotType: "breakfast",
        foodId: "f-1",
        status: "pending",
        calories: 400,
        protein: 30,
        carbs: 40,
        fat: 12,
      },
    ],
  } as MealPlanWeek;
}

beforeEach(() => {
  localStorage.clear();
});

describe("key backward compatibility", () => {
  it("koristi tačno stare ključeve (fbi:meal_plan / fbi:pantry_keys)", () => {
    expect(STORAGE_KEY_PLAN).toBe("fbi:meal_plan");
    expect(STORAGE_KEY_PANTRY).toBe("fbi:pantry_keys");
  });

  it("savePlan piše pod `fbi:meal_plan:<weekStartDate>`", () => {
    const plan = makePlan();
    savePlan(plan);
    const raw = localStorage.getItem(`fbi:meal_plan:${WEEK}`);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(plan);
  });

  it("loadPlan čita plan sačuvan starim kodom (raw JSON pod istim ključem)", () => {
    const legacy = makePlan();
    // Simulira upis pre refactor-a — direktno u localStorage
    localStorage.setItem(`fbi:meal_plan:${WEEK}`, JSON.stringify(legacy));
    expect(loadPlan(WEEK)).toEqual(legacy);
  });

  it("savePantry serijalizuje Set kao JSON Array (stari format)", () => {
    savePantry(new Set(["jaja", "ovsene pahuljice"]));
    const raw = localStorage.getItem("fbi:pantry_keys");
    expect(JSON.parse(raw!)).toEqual(["jaja", "ovsene pahuljice"]);
  });

  it("loadPantry čita legacy Array format u Set", () => {
    localStorage.setItem("fbi:pantry_keys", JSON.stringify(["piletina"]));
    expect(loadPantry()).toEqual(new Set(["piletina"]));
  });
});

describe("round-trip i edge slučajevi", () => {
  it("savePlan → loadPlan round-trip", () => {
    const plan = makePlan();
    savePlan(plan);
    expect(loadPlan(WEEK)).toEqual(plan);
  });

  it("loadPlan vraća null za nepostojeću nedelju", () => {
    expect(loadPlan("2020-01-06")).toBeNull();
  });

  it("loadPlan vraća null za korumpiran JSON umesto throw-a", () => {
    localStorage.setItem(`fbi:meal_plan:${WEEK}`, "{not-json");
    expect(loadPlan(WEEK)).toBeNull();
  });

  it("loadPantry vraća prazan Set za korumpiran JSON", () => {
    localStorage.setItem("fbi:pantry_keys", "][");
    expect(loadPantry()).toEqual(new Set());
  });

  it("planovi različitih nedelja se ne mešaju", () => {
    const a = makePlan("2026-06-01");
    const b = makePlan("2026-06-08");
    savePlan(a);
    savePlan(b);
    expect(loadPlan("2026-06-01")).toEqual(a);
    expect(loadPlan("2026-06-08")).toEqual(b);
  });
});

describe("getMonday", () => {
  // Napomena: getMonday je TZ-osetljiv (toISOString posle setHours) — testovi
  // su zato relativni, da bi prolazili u svakoj vremenskoj zoni. Ponašanje je
  // namerno identično pre-refactor verziji (storage ključevi ostaju isti).
  it("svi dani iste nedelje vraćaju isti ključ", () => {
    // 2026-06-08 (pon) … 2026-06-14 (ned)
    const monday = getMonday(new Date(2026, 5, 8, 12));
    for (let d = 9; d <= 14; d++) {
      expect(getMonday(new Date(2026, 5, d, 12))).toBe(monday);
    }
  });

  it("vraća YYYY-MM-DD format", () => {
    expect(getMonday(new Date(2026, 5, 10, 12))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("sledeća nedelja daje različit ključ", () => {
    expect(getMonday(new Date(2026, 5, 15, 12))).not.toBe(getMonday(new Date(2026, 5, 14, 12)));
  });
});
