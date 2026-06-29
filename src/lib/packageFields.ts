// ============================================================================
// packageFields.ts — validacija numeričkih polja u PackageEditor
// ============================================================================
// packages.features (JSONB) drži priceAmount / durationDays / videoCallFrequency
// / defaultWorkoutFrequency — bez DB CHECK-a. Save gate je proveravao samo name,
// pa su negativna/0/apsurdna cena (vidljiva klijentu!) i besmislene frekvencije
// tiho persistovale. Polja su opciona → prazno je dozvoljeno; ako je uneto, mora
// biti u opsegu.
// ============================================================================

export const PACKAGE_FIELD_BOUNDS = {
  price: { min: 1, max: 1_000_000 }, // cena paketa (pozitivna)
  durationDays: { min: 1, max: 3650 }, // trajanje (do 10 god)
  videoCallFrequency: { min: 0, max: 31 }, // poziva mesečno
  weeklyFrequency: { min: 1, max: 7 }, // treninga nedeljno
} as const;

/** Opcioni numerički string: prazno OK; inače konačan broj u [lo, hi]. */
export function isOptionalNumericInRange(str: string, lo: number, hi: number): boolean {
  if (str.trim() === "") return true;
  const n = Number(str);
  return Number.isFinite(n) && n >= lo && n <= hi;
}

/** Obavezna numerička vrednost u opsegu (za već-number state). */
export function isNumericInRange(n: number, lo: number, hi: number): boolean {
  return Number.isFinite(n) && n >= lo && n <= hi;
}
