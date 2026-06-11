// ============================================================================
// programEditorSchedule — pure helper za inicijalni raspored ProgramEditor-a
// (odvojen od ProgramEditorParts.tsx zbog react-refresh/only-export-components)
// ============================================================================

import { type ProgramDay } from "@/data/trainingMockData";

export function defaultSchedule(): ProgramDay[] {
  // 1 mezociklus, 1 mikrociklus = 7 dana (svi rest po default-u). Trener dodaje workout-e.
  // Dan 1 nosi mesocycleStart marker + default mesocycleConfig (6 nedelja, linear).
  const base = Date.now();
  return Array.from({ length: 7 }, (_, i) => ({
    id: `pd-${base}-${i}`,
    dayNumber: 0,
    workoutId: null,
    workoutName: "Rest",
    isRest: true,
    ...(i === 0
      ? {
          mesocycleStart: true,
          mesocycleConfig: {
            weeks: 6 as const,
            progression: "linear" as const,
            periodization: "linear" as const,
            deload: "auto" as const,
          },
        }
      : {}),
  }));
}
