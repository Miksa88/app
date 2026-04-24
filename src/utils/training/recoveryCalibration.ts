// ============================================================================
// recoveryCalibration — Sloj 3 Training Pipeline
// Spec: 01_TRAINING_FLOW_MASTER.md Sekcija 5 Korak 1 (Recovery Multiplier)
// ============================================================================
//
// Recovery Multiplier ∈ [0.7, 1.1] je centralna brojka koja diktira gde u
// MEV/MAV/MRV zoni klijentkinja radi. Računa se iz san+stres+godine+
// metabolicki profil. Cista pure funkcija — isti ulaz uvek daje isti izlaz.
//
// IMPORTANT: NEMA cycle bonus-a ovde. Cycle volume modifier dodaje
// `volumeCalibrator` u Sloju 5 (Sekcija 5 Korak 5 spec-a 01) na osnovu
// `cycleBonus` koji je odvojen od baseline recovery-ja. Razlog: cycle phase
// može da menja iz dana u dan; baseline recovery je trend-based.
// ============================================================================

import type { MetabolicCondition } from '@/types/training';
import { assertRecoveryMultiplierInRange } from '@/utils/nutrition/invariants';

export interface RecoveryInputs {
  sleepHoursAvg: number;       // 0–14, prosek poslednjih 7 dana
  stressLevel: number;         // 1–5
  age: number;
  metabolicConditions: MetabolicCondition[];
  /**
   * Additivni penalty od aktivne pauze (npr. illness = -0.15).
   * Opciono; default 0 (no-op). Primenjuje se PRE clamp-a na [0.7, 1.1], pa
   * klijentkinja nikad ne ide ispod floor-a bez obzira na penalty.
   * Spec 01 §4.8: illness pauza oduzima 0.15 od baseline recovery-ja narednih
   * 2 sesije nakon povratka.
   */
  illnessPenalty?: number;
}

const RECOVERY_FLOOR = 0.7;
const RECOVERY_CEIL = 1.1;

export function calcRecoveryMultiplier(input: RecoveryInputs): number {
  let base = 1.0;

  // San (Sekcija 5 spec-a 01)
  if (input.sleepHoursAvg >= 8) base += 0.05;
  else if (input.sleepHoursAvg >= 7) base += 0.02;
  else if (input.sleepHoursAvg >= 6) base += 0;
  else if (input.sleepHoursAvg >= 5) base -= 0.10;
  else base -= 0.20;            // <5h spavanja = crveni alarm

  // Stres (1–5 skala — 1 najbolje, 5 najgore)
  if (input.stressLevel === 1) base += 0.05;
  else if (input.stressLevel === 2) base += 0.02;
  else if (input.stressLevel === 3) base += 0;
  else if (input.stressLevel === 4) base -= 0.10;
  else base -= 0.15;            // visok hronicni stres (5)

  // Metabolicke patologije
  if (input.metabolicConditions.includes('hashimoto')) base -= 0.10;
  if (input.metabolicConditions.includes('insulin_resistance')) base -= 0.05;
  if (input.metabolicConditions.includes('hypertension')) base -= 0.05;
  if (input.metabolicConditions.includes('pcos')) base -= 0.03;

  // Godine (kumulativno: 45+ uzme -0.05, 55+ jos -0.05 = ukupno -0.10)
  if (input.age >= 45) base -= 0.05;
  if (input.age >= 55) base -= 0.05;

  // Illness/pause penalty (aplicira se PRE clamp-a; default 0 = backward compat).
  // IT-16 spec 01 §4.8: aktivna illness pauza oduzima 0.15 narednih 2 sesije.
  base += input.illnessPenalty ?? 0;

  const result = clamp(base, RECOVERY_FLOOR, RECOVERY_CEIL);

  // Invariant assert (Plan Faza 2 princip)
  assertRecoveryMultiplierInRange(result, 'calcRecoveryMultiplier');

  return result;
}

// ============================================================================
// Mapiranje recoveryMultiplier → volume zona (za UI prikaz i programGenerator)
// Spec 01 Sekcija 5: tabela
// ============================================================================

export type VolumeZone = 'MEV' | 'MEV_MAV' | 'MAV' | 'MAV_MRV';

export function mapMultiplierToZone(multiplier: number): VolumeZone {
  if (multiplier <= 0.80) return 'MEV';
  if (multiplier <= 0.95) return 'MEV_MAV';
  if (multiplier <= 1.05) return 'MAV';
  return 'MAV_MRV';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
