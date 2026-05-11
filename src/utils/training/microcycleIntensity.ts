// ============================================================================
// microcycleIntensity — RPE/RIR progresija po nedelji u mezociklusu
// Spec: pocetnici.md §2.1 (Linear ramp, beginner)
//       SREDNJE_NAPREDNE_V2.md §2.1 (Mixed/Undulating, intermediate)
//       pocetnici.md §1.1 (Hashimoto Overreach blok)
// ============================================================================
//
// BEGINNER (pocetnici.md §2.1) — Linear ramp, 7 nedelja:
//   W1: RPE 6   (RIR 4) — kalibracija
//   W2: RPE 7   (RIR 3) — linearna progresija
//   W3-W5: RPE 7-8 (RIR 2-3) — akumulacija
//   W6: RPE 9-10 (RIR 0-1) — OVERREACH
//   W7: RPE 5-6 (RIR 5) — DELOAD
//
// INTERMEDIATE (SREDNJE_NAPREDNE_V2 §2.1) — Mixed/Undulating, 6 nedelja:
//   W1: RPE 6-7 (RIR 3) — Intro / Kalibracija — 100% volumena
//   W2: RPE 7-8 (RIR 2) — Akumulacija (volumen) — 110% volumena
//   W3: RPE 8-9 (RIR 1) — Akumulacija (intenzitet) — 100% volumena
//   W4: RPE 7-8 (RIR 2) — Akumulacija (volumen peak) — 115% volumena
//   W5: RPE 9   (RIR 1) — Overreach — 90% volumena (CNS preserve)
//   W6: RPE 5-6 (RIR 5) — Deload — 40% volumena
//
// Mešovita logika (intermediate): nedelje 2/4 = volumen-fokus,
// nedelje 3/5 = intenzitet-fokus. Šalter izmedju volumena i intenziteta
// daje veći stimulus bez akumulacije CNS zamora kao kod čistog linear-a.
//
// HASHIMOTO BLOK (§1.1): cap RIR ≥ 2 / RPE ≤ 8 u Overreach nedelji.
// ============================================================================

import type { ExperienceLevel, MetabolicCondition } from '@/types/training';

export interface MicrocycleIntensityInput {
  microcycleIndex: number;          // 0-based: 0=W1, 1=W2, ...
  totalWeeksInMesocycle: number;    // 7 beginner, 6 intermediate
  metabolicConditions?: MetabolicCondition[];
  experienceLevel?: ExperienceLevel;  // default 'beginner' (backward compat)
}

export interface MicrocycleIntensity {
  targetRIR: number;
  targetRPE: number;
  phase: 'kalibracija' | 'akumulacija' | 'overreach' | 'deload';
  /**
   * Volumen multiplikator za ovu nedelju (1.0 = baseline iz skeleton-a).
   * Intermediate undulating talasanje — beginner uvek 1.0.
   */
  volumeMultiplier: number;
  notes: string[];
}

// ============================================================================
// getMicrocycleIntensity — vraca RIR/RPE/volumen i fazu za datu nedelju
// ============================================================================

export function getMicrocycleIntensity(
  input: MicrocycleIntensityInput,
): MicrocycleIntensity {
  const {
    microcycleIndex,
    totalWeeksInMesocycle,
    metabolicConditions = [],
    experienceLevel = 'beginner',
  } = input;
  const hasHashimoto = metabolicConditions.includes('hashimoto');
  const notes: string[] = [];

  // Deload nedelja = poslednja
  if (microcycleIndex === totalWeeksInMesocycle - 1) {
    return {
      targetRIR: 5,
      targetRPE: 5,
      phase: 'deload',
      volumeMultiplier: experienceLevel === 'intermediate' ? 0.4 : 0.5,
      notes: ['Deload nedelja — RPE 5-6, sistemski zamor se čisti.'],
    };
  }

  // Overreach = pretposlednja nedelja
  if (microcycleIndex === totalWeeksInMesocycle - 2) {
    if (experienceLevel === 'intermediate') {
      if (hasHashimoto) {
        notes.push(
          'Hashimoto cap: Overreach RPE 8 (umesto 9), volumen 90%.',
        );
        return {
          targetRIR: 2, targetRPE: 8, phase: 'overreach',
          volumeMultiplier: 0.9, notes,
        };
      }
      return {
        targetRIR: 1,
        targetRPE: 9,
        phase: 'overreach',
        volumeMultiplier: 0.9,
        notes: ['Overreach (intermediate) — RPE 9, volumen 90%, CNS preserve.'],
      };
    }
    // Beginner overreach
    if (hasHashimoto) {
      notes.push(
        'Hashimoto cap (pocetnici.md §1.1): Overreach RPE 8, ne 9-10.',
      );
      return {
        targetRIR: 2, targetRPE: 8, phase: 'overreach',
        volumeMultiplier: 1.0, notes,
      };
    }
    return {
      targetRIR: 0,
      targetRPE: 10,
      phase: 'overreach',
      volumeMultiplier: 1.0,
      notes: ['Overreach — peak intenzitet, RPE 9-10, blizu otkaza.'],
    };
  }

  // Kalibracija: prva nedelja (W1)
  if (microcycleIndex === 0) {
    if (experienceLevel === 'intermediate') {
      return {
        targetRIR: 3,
        targetRPE: 7,
        phase: 'kalibracija',
        volumeMultiplier: 1.0,
        notes: ['Intro — RPE 6-7, NS upoznaje split, težine se postavljaju.'],
      };
    }
    return {
      targetRIR: 4,
      targetRPE: 6,
      phase: 'kalibracija',
      volumeMultiplier: 1.0,
      notes: ['Kalibracija — RPE 6, učenje tehnike, određivanje radne težine.'],
    };
  }

  // INTERMEDIATE Mixed/Undulating — W2 (vol) / W3 (int) / W4 (vol peak)
  if (experienceLevel === 'intermediate') {
    if (microcycleIndex === 1) {
      // W2 — Akumulacija (volumen)
      return {
        targetRIR: 2, targetRPE: 8, phase: 'akumulacija',
        volumeMultiplier: 1.1,
        notes: ['W2 — volumen-fokus (+10%), RPE 7-8.'],
      };
    }
    if (microcycleIndex === 2) {
      // W3 — Akumulacija (intenzitet)
      return {
        targetRIR: 1, targetRPE: 9, phase: 'akumulacija',
        volumeMultiplier: 1.0,
        notes: ['W3 — intenzitet-fokus, RPE 8-9, težine rastu, volumen baseline.'],
      };
    }
    if (microcycleIndex === 3) {
      // W4 — Akumulacija (volumen peak)
      return {
        targetRIR: 2, targetRPE: 8, phase: 'akumulacija',
        volumeMultiplier: 1.15,
        notes: ['W4 — volumen peak (+15%), RPE 7-8, najveći broj serija.'],
      };
    }
    // fallback (ne bi trebalo da se desi za 6-week mezo)
    return {
      targetRIR: 2, targetRPE: 8, phase: 'akumulacija',
      volumeMultiplier: 1.0, notes,
    };
  }

  // BEGINNER linear akumulacija
  if (microcycleIndex === 1) {
    return {
      targetRIR: 3, targetRPE: 7, phase: 'akumulacija',
      volumeMultiplier: 1.0, notes,
    };
  }
  return {
    targetRIR: 2, targetRPE: 8, phase: 'akumulacija',
    volumeMultiplier: 1.0, notes,
  };
}
