// ============================================================================
// _shared/movingAverage.ts — port of src/utils/db/movingAverage.ts za Deno
// ============================================================================
//
// Razlog duplikata:
//   Deno Edge Runtime ne može direktno da importuje iz `src/utils/db/...`
//   zbog drugačijeg module resolvera i TS path alias-a (`@/`). Standardni
//   Supabase idiom (https://supabase.com/docs/guides/functions/shared) je
//   da shared logika ide u `supabase/functions/_shared/`.
//
//   Logika je IDENTIČNA pure funkciji iz src/utils/db/movingAverage.ts.
//   Source of truth je src/ (pokriven vitest-om). Ako se logika menja,
//   menja se na oba mesta — buduće iteracije mogu da razmatraju build-step
//   koji radi sync automatski.
//
// Spec: 02_NUTRITION_FLOW_MASTER.md §10 + 03_INTEGRATION_LAYER.md §3.2 Rule 8
// ============================================================================

export interface WeightSample {
  weight_kg: number;
  logged_at: string;
  cycleDayAtTime?: number | null;
}

export interface MA5Result {
  ma5: number | null;
  reliableSampleCount: number;
}

const MA5_WINDOW = 5;
const MENSTRUAL_DAY_START = 1;
const MENSTRUAL_DAY_END = 5;

export function calcMA5(samples: WeightSample[]): MA5Result {
  const reliable: number[] = [];

  for (const sample of samples) {
    if (reliable.length >= MA5_WINDOW) break;

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
  const ma5 = Math.round(avg * 10) / 10;

  return { ma5, reliableSampleCount: reliable.length };
}
