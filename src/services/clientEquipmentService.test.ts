// ============================================================================
// clientEquipmentService — equipment filter helper tests
// V3 §10
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  hasRequiredEquipment,
  hasTrainingEquipment,
  filterExercisesByEquipment,
  toTrainingEquipmentTokens,
} from "./clientEquipmentService";

describe("hasRequiredEquipment", () => {
  it("returns true when no equipment required", () => {
    expect(hasRequiredEquipment([], ["Barbell"])).toBe(true);
    expect(hasRequiredEquipment(null, [])).toBe(true);
    expect(hasRequiredEquipment(undefined, [])).toBe(true);
  });

  it("returns true when client owns all required", () => {
    expect(hasRequiredEquipment(["Barbell", "Rack"], ["Barbell", "Rack", "Bench"])).toBe(true);
  });

  it("returns false when client missing one required item", () => {
    expect(hasRequiredEquipment(["Barbell", "Rack"], ["Barbell"])).toBe(false);
  });

  it("Bodyweight is always considered available", () => {
    expect(hasRequiredEquipment(["Bodyweight"], [])).toBe(true);
    expect(hasRequiredEquipment(["Bodyweight", "Dumbbell"], ["Dumbbell"])).toBe(true);
    expect(hasRequiredEquipment(["Bodyweight", "Barbell"], [])).toBe(false);
  });
});

// ----------------------------------------------------------------------------
// toTrainingEquipmentTokens — normalizacija Title Case opcija → lowercase tokeni
// ----------------------------------------------------------------------------

describe("toTrainingEquipmentTokens", () => {
  it("mapira 'Cable Machine' na 'cable' i lowercase-uje ostalo", () => {
    const tokens = toTrainingEquipmentTokens(["Cable Machine", "Barbell", "Machine"]);
    expect(tokens.has("cable")).toBe(true);
    expect(tokens.has("barbell")).toBe(true);
    expect(tokens.has("machine")).toBe(true);
    expect(tokens.has("Cable Machine")).toBe(false);
  });
});

// ----------------------------------------------------------------------------
// hasTrainingEquipment — case-insensitive check za Exercise.equipment tokene
// ----------------------------------------------------------------------------

describe("hasTrainingEquipment", () => {
  it("vežba bez equipment zahteva uvek prolazi", () => {
    expect(hasTrainingEquipment([], ["Barbell"])).toBe(true);
    expect(hasTrainingEquipment(null, [])).toBe(true);
    expect(hasTrainingEquipment(undefined, [])).toBe(true);
  });

  it("bodyweight uvek prolazi, bez obzira na profil", () => {
    expect(hasTrainingEquipment(["bodyweight"], [])).toBe(true);
    expect(hasTrainingEquipment(["bodyweight"], ["Dumbbell"])).toBe(true);
  });

  it("matchuje lowercase training tokene protiv Title Case opcija", () => {
    expect(hasTrainingEquipment(["barbell", "rack"], ["Barbell", "Rack"])).toBe(true);
    expect(hasTrainingEquipment(["cable"], ["Cable Machine"])).toBe(true);
    expect(hasTrainingEquipment(["cable"], ["Machine"])).toBe(false);
  });

  it("vraća false kad nedostaje deo opreme", () => {
    expect(hasTrainingEquipment(["barbell", "bench"], ["Barbell"])).toBe(false);
  });

  it("tokeni bez kanonske opcije (band/smith) prolaze samo eksplicitno", () => {
    expect(hasTrainingEquipment(["band"], ["Barbell"])).toBe(false);
    expect(hasTrainingEquipment(["band"], ["band"])).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// filterExercisesByEquipment — SwapExerciseSheet equipment filter
// ----------------------------------------------------------------------------

describe("filterExercisesByEquipment", () => {
  const exercises = [
    { id: 1, equipment: ["barbell", "rack"] },
    { id: 2, equipment: ["dumbbell"] },
    { id: 3, equipment: ["bodyweight"] },
    { id: 4, equipment: [] as string[] },
    { id: 5, equipment: ["cable"] },
  ];

  it("prazan equipment profil → bez filtera (ne prazan spisak!)", () => {
    expect(filterExercisesByEquipment(exercises, [])).toEqual(exercises);
  });

  it("filtrira vežbe za koje klijentkinja nema opremu", () => {
    const result = filterExercisesByEquipment(exercises, ["Dumbbell"]);
    expect(result.map((e) => e.id)).toEqual([2, 3, 4]);
  });

  it("bodyweight i vežbe bez zahteva uvek prolaze", () => {
    const result = filterExercisesByEquipment(exercises, ["Kettlebell"]);
    expect(result.map((e) => e.id)).toEqual([3, 4]);
  });

  it("'Cable Machine' opcija otključava 'cable' vežbe", () => {
    const result = filterExercisesByEquipment(exercises, ["Cable Machine"]);
    expect(result.map((e) => e.id)).toEqual([3, 4, 5]);
  });
});
