// ============================================================================
// nutritionConstants — imenovane konstante za meal plan generator
// ============================================================================
//
// Task 1.6 (PLAN_RADA_WHITELABEL.md): eliminacija magic numbera iz
// src/utils/mealPlanGenerator.ts. Spec reference: pocetnici.md +
// files_extracted/KOD-FIT_Master_Protokol_SREDNJE_NAPREDNE_V2.md.
//
// NAPOMENA: konstante koje vec postoje u src/utils/nutrition/* se NE
// dupliraju ovde (CALORIE_FLOOR, HASHIMOTO_MAX_DEFICIT, IR distribucije...)
// — mealPlanGenerator ih importuje direktno iz tih modula.

// ── Energetska gustina makronutrijenata (Atwater faktori) ──
// Koriste se za IR mini-meal konverziju carbs kcal → fat kcal
// (Spec 02 Sekcija 6.4 / IT-19).
export const CARBS_KCAL_PER_G = 4;
export const FAT_KCAL_PER_G = 9;

// ── Trening frekvencija (pocetnici.md §2 — protokol radi sa 3-5 treninga) ──
export const MIN_WORKOUT_FREQUENCY = 3;
export const MAX_WORKOUT_FREQUENCY = 5;
// Fallback ako profil ima frekvenciju van opsega 3-5
export const DEFAULT_WORKOUT_FREQUENCY = 4;

// ── Fatigue safeguard pragovi (Spec 03 Rule 2 + pocetnici.md §1.2 lifestyle) ──
// Stres >= 7 ili san <= 4 → fatigue sync aktivan (kalorijski safeguard)
export const HIGH_STRESS_THRESHOLD = 7;
export const LOW_SLEEP_QUALITY_THRESHOLD = 4;

// ── Training/rest day kalorijski modifikatori (default ako template ne zada) ──
// Trening dan: +150 kcal (peri-workout carbs), odmor: -100 kcal
export const DEFAULT_TRAINING_DAY_CALORIE_BONUS = 150;
export const DEFAULT_REST_DAY_CALORIE_REDUCTION = -100;

// ── Per-meal protein (pocetnici.md §3.4 mTOR Protokol) ──
// Standardni obrok mora imati 25-30g proteina za kontinuiranu mTOR aktivaciju
export const PROTEIN_FLOOR_PER_MEAL_G = 25;
// Gornja granica protein opsega po slotu = minProtein + raspon
export const PROTEIN_RANGE_PER_SLOT_G = 20;

// ── Meal matching heuristika (scoring — nije spec, interna heuristika) ──
// Penal ako porcija ne dostize minimalni protein slota
export const PROTEIN_SHORTFALL_PENALTY = 50;
// Tezine score komponenti: protein delta vredi 2x vise od kcal delte
export const CALORIE_DIFF_WEIGHT = 1;
export const PROTEIN_DIFF_WEIGHT = 2;

// ── A/B/C rotacija (7-dnevni plan, iste makroe — razlicita jela) ──
export const MEAL_ROTATION_VARIANTS = 3;   // A/B/C
export const DAYS_PER_WEEK = 7;
// Broj top kandidata iz kojih rotacija bira (= broj varijanti)
export const TOP_MATCHES_FOR_ROTATION = 3;

// ── IR mini-meal (Spec 02 Sekcija 6.4 / IT-19, pocetnici.md §3.4) ──
// IR transformacija (slotovi 2 i 4 → P+F) vazi samo za 5+ obroka raspored
export const IR_MINI_MEAL_MIN_SLOT_COUNT = 5;

// ── findSimilarMeals defaults (auto-swap kandidati) ──
// ±10% tolerancija kalorija/proteina za macro-similar zamenu
export const SIMILAR_MEAL_TOLERANCE = 0.10;
export const SIMILAR_MEAL_TOP_N = 5;

// ── Template matching score tezine (interna heuristika, nije spec) ──
export const TEMPLATE_SCORE_GOAL_MATCH = 3;
export const TEMPLATE_SCORE_EXPERIENCE_MATCH = 2;
export const TEMPLATE_SCORE_FREQUENCY_MATCH = 2;
export const TEMPLATE_SCORE_LIMITATION_SAFE = 1;
export const TEMPLATE_SCORE_FREE_TRIAL = 1;
