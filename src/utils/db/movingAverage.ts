// ============================================================================
// movingAverage — MA5 sa menstrualnim skip-om
// Spec: 02_NUTRITION_FLOW_MASTER.md §10 (Weight trendline)
//       03_INTEGRATION_LAYER.md §3.2 Rule 8 (weightDataReliable)
// ============================================================================
//
// RAZLOG POSTOJANJA:
//
// Tokom menstrualne faze (dan 1–5 ciklusa) telo zadržava 1–2 kg vode zbog
// hormonalnog edema. Taj weight NIJE reprezentativan za body composition
// trend — koristeći ga u MA5 dobijamo false-positive "plateau" signale,
// a weekly_check_in bi pokrenuo nepotrebnu adaptaciju kalorija.
//
// Rešenje: pri računanju MA5, preskoči sve weight log-ove čiji je
// `cycleDayAtTime` u opsegu 1–5. Ako posle skip-a ostane manje od 5
// pouzdanih uzoraka → MA5 je `null` (UI prikazuje "nedovoljno podataka"
// umesto lažne brojke).
//
// Ovo je pure funkcija — bez DB accesss-a. Edge Function je zadužen da
// correlate-uje `cycle_day` iz `daily_check_ins` po datumu i ubaci ga kao
// `cycleDayAtTime` field na sample-u pre nego sto pozove `calcMA5`.
// ============================================================================

/**
 * Jedan weight log uzorak sa (opcionim) korelisanim danom ciklusa.
 */
export interface WeightSample {
  weight_kg: number;
  logged_at: string;              // ISO timestamp
  cycleDayAtTime?: number | null; // 1–45 ili null ako tracker nije aktivan
}

/**
 * Rezultat MA5 računanja.
 *
 * `ma5` je `null` ako nema dovoljno pouzdanih uzoraka (< 5 posle skip-a).
 * `reliableSampleCount` je broj non-menstrual uzoraka koji su korišćeni
 *   (0–5); UI može da prikaže "3/5 pouzdanih unosa" kao transparentnost.
 */
export interface MA5Result {
  ma5: number | null;
  reliableSampleCount: number;
}

const MA5_WINDOW = 5;
const MENSTRUAL_DAY_START = 1;
const MENSTRUAL_DAY_END = 5;

/**
 * Moving average posledjih 5 weight unosa, preskačući menstrualne dane.
 *
 * @param samples - weight log-ovi, **očekuje se da su sortirani** descending
 *                  po `logged_at` (najskoriji prvi). Funkcija uzima prvih
 *                  `MA5_WINDOW` pouzdanih (non-menstrual) i računa prosek.
 *                  Ako ima manje od 5 pouzdanih → `ma5 = null`.
 * @returns `{ ma5, reliableSampleCount }`
 */
export function calcMA5(samples: WeightSample[]): MA5Result {
  const reliable: number[] = [];

  for (const sample of samples) {
    if (reliable.length >= MA5_WINDOW) break;

    // Menstrual skip: dan 1–5 ignoriši (hormonalni edem)
    if (
      sample.cycleDayAtTime != null &&
      sample.cycleDayAtTime >= MENSTRUAL_DAY_START &&
      sample.cycleDayAtTime <= MENSTRUAL_DAY_END
    ) {
      continue;
    }

    reliable.push(sample.weight_kg);
  }

  if (reliable.length < MA5_WINDOW) {
    return { ma5: null, reliableSampleCount: reliable.length };
  }

  const sum = reliable.reduce((acc, w) => acc + w, 0);
  const avg = sum / MA5_WINDOW;

  // Zaokruži na 1 decimalu (kg preciznost na 100g je dovoljna za trend;
  // viša preciznost daje lažni osećaj tačnosti).
  const ma5 = Math.round(avg * 10) / 10;

  return { ma5, reliableSampleCount: reliable.length };
}
