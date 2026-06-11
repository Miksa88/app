// ============================================================================
// invariants — runtime asserts za bioloske granicnike
// Spec: 02_NUTRITION_FLOW_MASTER.md Princip 2 (Metabolicka odbrana)
//       + 03_INTEGRATION_LAYER.md Sekcija 3.3 (Idempotentnost)
// ============================================================================
//
// "Floor i invariante kao asserts" — plan Faza 2 princip pisanja.
// Bolje crash u dev-u nego silent breach bioloskog minimuma.
//
// Ponasanje:
//   - DEV mode: throw Error (force surface bug)
//   - PROD mode: console.error + continue (ne ruse korisnicku sesiju)
//
// Primena: posle bilo koje funkcije koja moze generisati neispravan target
// (recalcCalorieTarget, macroSplit, etc.), pozvati assertCalorieFloor sa
// rezultatom.
// ============================================================================

const isDevEnvironment =
  typeof process !== 'undefined' &&
  process.env.NODE_ENV !== 'production';

function isTestEnvironment(): boolean {
  return typeof process !== 'undefined' && (
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true' ||
    typeof globalThis !== 'undefined' && 'vi' in globalThis
  );
}

/**
 * Throw u DEV mode-u, log u PROD-u. Test environment se tretira kao DEV
 * (asserti moraju da pucaju u testovima da bi se bug uhvatio).
 */
export function assertInvariant(
  condition: boolean,
  message: string,
  context?: Record<string, unknown>,
): void {
  if (condition) return;

  const fullMessage = context
    ? `[Invariant violated] ${message} | context: ${JSON.stringify(context)}`
    : `[Invariant violated] ${message}`;

  if (isDevEnvironment || isTestEnvironment()) {
    throw new Error(fullMessage);
  }

  // PROD: log + continue (nikad rusiti korisnicku sesiju zbog edge case-a)
  logger.error(fullMessage);
}

// ============================================================================
// Konkretne invariant funkcije
// ============================================================================

const CALORIE_FLOOR = 1400;
const CALORIE_CEILING_REASONABLE = 5000;  // sanity ceiling — preko ovoga je sigurno bug

export function assertCalorieFloor(value: number, source: string): void {
  assertInvariant(
    Number.isFinite(value),
    `Calorie target nije konačan broj`,
    { value, source },
  );
  assertInvariant(
    value >= CALORIE_FLOOR,
    `Calorie target ${value} ispod floor-a ${CALORIE_FLOOR}`,
    { value, source },
  );
  assertInvariant(
    value <= CALORIE_CEILING_REASONABLE,
    `Calorie target ${value} iznad razumne granice ${CALORIE_CEILING_REASONABLE}`,
    { value, source },
  );
}

export function assertMacroNonNegative(
  macros: { proteinG: number; carbsG: number; fatG: number },
  source: string,
): void {
  assertInvariant(
    macros.proteinG >= 0 && macros.carbsG >= 0 && macros.fatG >= 0,
    `Macro vrednost je negativna`,
    { ...macros, source },
  );
}

export function assertRecoveryMultiplierInRange(value: number, source: string): void {
  assertInvariant(
    Number.isFinite(value) && value >= 0.7 && value <= 1.1,
    `Recovery multiplier ${value} izvan [0.7, 1.1]`,
    { value, source },
  );
}
