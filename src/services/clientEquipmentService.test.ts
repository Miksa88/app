// ============================================================================
// clientEquipmentService — equipment filter helper tests
// V3 §10
// ============================================================================

import { describe, it, expect } from "vitest";
import { hasRequiredEquipment } from "./clientEquipmentService";

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
