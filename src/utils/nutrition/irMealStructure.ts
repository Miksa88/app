// ============================================================================
// irMealStructure — Insulin Resistance specijalna meal arhitektura
// Spec: 02_NUTRITION_FLOW_MASTER.md Sekcija 6.4
// ============================================================================
//
// Za IR klijentkinje, struktura ostaje 5 obroka, ali:
//   slotovi 2 i 4 (morning_snack, afternoon_snack) postaju MINI-OBROCI:
//     - protein + masti, NULA carbs
//     - allowed tags: ir_friendly, high_protein, low_gi
//     - forbidden tags: snack, high_gi, medium_gi, high_sugar
//     - mealGap: 180min (3h) izmedju obroka — drzi insulin-free windows
//
// Razlog (Sekcija 6.4): klasicne uzine (vocce, jogurt) drze insulin hronicno
// povisen i blokiraju lipolizu. IR klijentkinja mora "insulin-free windows".
// 5 obroka sa prilagodjenim makrima je optimum (3 obroka su preduga pauza
// za mTOR distribuciju, aktivira katabolizam).
// ============================================================================

import type { MealSlot, MacroTarget, FoodTag } from '@/types/nutrition';
import type { MetabolicCondition } from '@/types/training';

// ============================================================================
// Konstante za IR mini-meal
// ============================================================================

// Raspodela kalorija po obrocima (Sekcija 6.4, IR-specifična):
//   veci glavni obroci (breakfast 28%, lunch 32%) + male P+F mini-uzine
//   (morning_snack 10%, afternoon_snack 10%) + laksa vecera (20%).
// Razlog: IR klijentkinja mora da drzi veci deo kalorija u ciklicnim
// main meal-ovima kada je insulin vec angazovan, a mini-uzine P+F ne
// pomeraju insulin (otud samo 10% kalorija kroz njih).
export const IR_MEAL_CALORIE_DISTRIBUTION = {
  breakfast: 0.28,
  morning_snack: 0.10,
  lunch: 0.32,
  afternoon_snack: 0.10,
  dinner: 0.20,
} as const;

// Standardna (non-IR) raspodela 5-obroka — sluzi kao default za
// `pickMealCalorieDistribution`. Fallback kada klijentkinja nema
// insulin_resistance. Ukupno = 1.00.
export const DEFAULT_MEAL_CALORIE_DISTRIBUTION = {
  breakfast: 0.25,
  morning_snack: 0.12,
  lunch: 0.30,
  afternoon_snack: 0.13,
  dinner: 0.20,
} as const;

export type MealCalorieDistribution =
  | typeof IR_MEAL_CALORIE_DISTRIBUTION
  | typeof DEFAULT_MEAL_CALORIE_DISTRIBUTION;

const IR_MINI_MEAL_GAP_MIN = 180;             // 3h izmedju obroka

const IR_MINI_MEAL_ALLOWED_TAGS: FoodTag[] = [
  'ir_friendly',
  'high_protein',
  'low_gi',
];

const IR_MINI_MEAL_FORBIDDEN_TAGS: FoodTag[] = [
  'snack',
  'high_gi',
  'medium_gi',
];

const IR_FAT_MULTIPLIER = 1.2;                // mini-obroci dobijaju +20% masti za sitost

// Slot indexi koji postaju mini-meal (0-based: 1 = morning_snack, 3 = afternoon_snack)
const IR_MINI_MEAL_SLOT_INDEXES = [1, 3];

// ============================================================================
// applyIRMealStructure — pretvori slotove 2 i 4 u P+F mini-obroke
// ============================================================================
//
// Pure funkcija — vraca novi niz slot-ova, ne mutira ulaz.
// Pre-condition: slots.length >= 5 (5-meal struktura). Ako je manje (npr. 3
// obroka template), funkcija vraca slots nepromenjene (no-op).

export function applyIRMealStructure(
  slots: MealSlot[],
  macros: MacroTarget,
): MealSlot[] {
  if (slots.length < 5) return slots;        // ne primenjuje se na <5 obroka

  return slots.map((slot, index) => {
    if (!IR_MINI_MEAL_SLOT_INDEXES.includes(index)) return slot;

    return {
      ...slot,
      slotType: 'mini_meal_ir',
      proteinTarget: Math.round(macros.proteinG / 5),  // standardno 1/5 dnevnog proteina
      carbsTarget: 0,                                    // NULA carbs
      fatTarget: Math.round(slot.fatTarget * IR_FAT_MULTIPLIER),
      allowedFoodTags: IR_MINI_MEAL_ALLOWED_TAGS,
      forbiddenFoodTags: IR_MINI_MEAL_FORBIDDEN_TAGS,
      mealGap: IR_MINI_MEAL_GAP_MIN,
      label: 'Mini-obrok (P+F)',
      uiNote: 'Protein i masti — bez hidrata do sledeceg glavnog obroka.',
    };
  });
}

// ============================================================================
// shouldApplyIR — proveri da li IR struktura aktivna za klijentkinju
// ============================================================================

export function shouldApplyIRStructure(
  metabolicConditions: MetabolicCondition[],
): boolean {
  return metabolicConditions.includes('insulin_resistance');
}

// ============================================================================
// isIRMiniMealSlot — convenience za UI / sync rules
// ============================================================================

export function isIRMiniMealSlot(slotIndex: number): boolean {
  return IR_MINI_MEAL_SLOT_INDEXES.includes(slotIndex);
}

// ============================================================================
// pickMealCalorieDistribution — vraca IR ili default raspodelu
// ============================================================================
//
// Koristi se u mealPlanGenerator pre slot-loop-a da bi se per-slot caloriji
// multiplicirali sa pravom raspodelom. IR klijentkinje dobijaju 28/10/32/
// 10/20, ostale 25/12/30/13/20.
//
// Input: lista metabolickih stanja (MetabolicCondition[]).
// Output: const objekat sa kljucevima breakfast/morning_snack/lunch/
//         afternoon_snack/dinner koji sabiraju na 1.0.

export function pickMealCalorieDistribution(
  metabolicConditions: MetabolicCondition[],
): MealCalorieDistribution {
  return metabolicConditions.includes('insulin_resistance')
    ? IR_MEAL_CALORIE_DISTRIBUTION
    : DEFAULT_MEAL_CALORIE_DISTRIBUTION;
}
