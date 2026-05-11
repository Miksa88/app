// ============================================================================
// biofeedbackReactiveRules — pocetnici.md §4.3 Reaktivna pravila
// ============================================================================
//
// Pravila iz pocetnici.md §4.3 koja se aktiviraju iz biofeedback metrika:
//
//   Pumpa < 5/10        → +1g soli + 500ml vode pre treninga
//   Kvalitet sna < 5/10 → +1 šaka ovsa u Obrok 5 (triptofan→serotonin)
//   Lutealna faza       → +1 supena kašika ulja (kontrola žudnje)
//   Pad libida          → STOP Smart Cut (deficit preagresivan)
//   Zadržavanje vode >7 → pregled soli + alkohola + sna (NE smanjivati hidrate)
//
// Vraća listu actionable adjustment-a koji se primenjuju TODAY (single-day,
// ne perzistentno). Sync Engine ih kompoziciono primenjuje preko macros.
// ============================================================================

export interface BiofeedbackReactiveInput {
  pumpScore?: number | null;          // 1-10
  sleepQualityScore?: number | null;  // 1-10 (NE sleep_hours — već postoji)
  cyclePhase?: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | null;
  libidoScore?: number | null;        // 1-10
  waterRetentionScore?: number | null;// 1-10 (subjektivno)
  currentSmartCutStep?: 0 | 1 | 2 | 3 | 4;
}

export interface BiofeedbackReactiveResult {
  preworkoutSaltGramsBonus: number;    // 0 ili 1
  preworkoutWaterMlBonus: number;      // 0 ili 500
  obrok5OatsHandfulBonus: number;      // 0 ili 1
  lutealFatTablespoonBonus: number;    // 0 ili 1 (≈10g ulja)
  pauseSmartCut: boolean;              // true → stop daljeg cut-a
  waterRetentionAlert: boolean;        // ne smanjivati hidrate, pregled soli/alkohola
  notes: string[];
}

// ============================================================================
// applyBiofeedbackReactiveRules
// ============================================================================

export function applyBiofeedbackReactiveRules(
  input: BiofeedbackReactiveInput,
): BiofeedbackReactiveResult {
  const notes: string[] = [];
  const result: BiofeedbackReactiveResult = {
    preworkoutSaltGramsBonus: 0,
    preworkoutWaterMlBonus: 0,
    obrok5OatsHandfulBonus: 0,
    lutealFatTablespoonBonus: 0,
    pauseSmartCut: false,
    waterRetentionAlert: false,
    notes,
  };

  // Pumpa <5 → so + voda pre treninga
  if (input.pumpScore !== null && input.pumpScore !== undefined && input.pumpScore < 5) {
    result.preworkoutSaltGramsBonus = 1;
    result.preworkoutWaterMlBonus = 500;
    notes.push(
      `Pumpa ${input.pumpScore}/10 — pre treninga: +1g soli + 500ml vode (vazomotorni efekat).`,
    );
  }

  // San <5 → +1 šaka ovsa u Obrok 5
  if (
    input.sleepQualityScore !== null &&
    input.sleepQualityScore !== undefined &&
    input.sleepQualityScore < 5
  ) {
    result.obrok5OatsHandfulBonus = 1;
    notes.push(
      `Kvalitet sna ${input.sleepQualityScore}/10 — +1 šaka ovsa u Obrok 5 ` +
      `(triptofan → serotonin → melatonin).`,
    );
  }

  // Lutealna faza → +1 supena ulja (kontrola žudnje)
  if (input.cyclePhase === 'luteal') {
    result.lutealFatTablespoonBonus = 1;
    notes.push('Lutealna faza — +1 supena kašika ulja (kontrola žudnje za slatkim).');
  }

  // Pad libida → STOP Smart Cut
  if (input.libidoScore !== null && input.libidoScore !== undefined && input.libidoScore < 4) {
    if ((input.currentSmartCutStep ?? 0) > 0) {
      result.pauseSmartCut = true;
      notes.push(
        `Libido ${input.libidoScore}/10 — signal preagresivnog deficita. STOP Smart Cut, povratak na maintenance.`,
      );
    }
  }

  // Zadržavanje vode >7 → alert
  if (
    input.waterRetentionScore !== null &&
    input.waterRetentionScore !== undefined &&
    input.waterRetentionScore > 7
  ) {
    result.waterRetentionAlert = true;
    notes.push(
      `Zadržavanje vode ${input.waterRetentionScore}/10 — pregled soli, alkohola, sna. ` +
      `NE smanjivati hidrate (kortizol-driven).`,
    );
  }

  return result;
}
