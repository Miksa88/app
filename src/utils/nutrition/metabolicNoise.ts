// ============================================================================
// Metabolic Noise detector (Sync Rule 6 input)
// Spec: 02_NUTRITION_FLOW_MASTER.md §5.5 (Sync Rule 6 — Metabolic Noise),
//       03_INTEGRATION_LAYER.md §3.2 (Sync Rules)
// ============================================================================
//
// Čista funkcija — data-in / bool-out, bez side-efekata. Koristi je:
//   1. Edge Function `process-meal-log` — posle INSERT-a liquid kalorija,
//      proverava sumu zadnjih 24h i setuje `nutrition.isMetabolicNoiseTriggered`.
//   2. Sync Rule 6 (u `src/utils/sync/syncEngine.ts`) — ako je flag true,
//      postavlja `_blockProgressionUntil = now + 3 dana`.
//
// Pravilo: metaboličkim šumom smatramo scenariо gde tečne kalorije (sokovi,
// alkohol, kafe sa šećerom, smoothies) prelaze 10% dnevnog kalorijskog cilja.
// Strogo STRIKTNO veći od 10% — tačno 10.0% ne triggeruje (granica je 10.001%+).
//
// Razlog: 10% daje 200kcal prostora na 2000kcal — primer "sok od naranće"
// scenario gde klijentkinja ne shvata koliko "prazne" energije konzumira.
// ============================================================================

/**
 * Vraća `true` ako unete tečne kalorije prelaze 10% dnevnog kalorijskog cilja.
 *
 * Tačno 10% vraća `false` (granica je striktna `>`), radi stabilnosti — ne
 * želimo da floating-point nesigurnost pretvori "tačno 10%" u triger.
 *
 * Ako je `calorieTarget <= 0`, vraća `false` (guard protiv divide-by-zero i
 * nekompletnih profila — tek dok TDEE/BMR nisu izračunati).
 *
 * @param liquidKcal Suma kalorija iz tečnih obroka u prozoru (obično 24h)
 * @param calorieTarget Dnevni kalorijski target klijentkinje (nutrition.currentCalorieTarget)
 * @returns `true` ako tečne > 10% target-a, `false` inače
 */
export function isMetabolicNoise(
  liquidKcal: number,
  calorieTarget: number,
): boolean {
  // Guard: nekompletan profil ili nulti target — ne možemo da izračunamo %,
  // radije vraćamo false nego da triggeruje false-pozitive banner.
  if (calorieTarget <= 0) return false;

  // Negativne tečne kalorije su nemoguce (INSERT u meal_logs ima CHECK >= 0);
  // radi safety, < 0 tretiramo kao 0 (nikad noise).
  if (liquidKcal <= 0) return false;

  // Striktno veće — tačno 10% nije noise (granica, daje se "benefit of doubt").
  return liquidKcal / calorieTarget > 0.10;
}
