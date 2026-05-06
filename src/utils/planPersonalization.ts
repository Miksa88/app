// ============================================================================
// LEGACY PATH SHIM — re-export iz nove kanonske lokacije
// ============================================================================
//
// Pravi modul je premeshten u src/utils/nutrition/planPersonalization.ts
// (Faza 2 plan: "REFACTOR planPersonalization.ts — premestiti u src/utils/nutrition/").
//
// Ovaj shim postoji samo zbog backward compat sa postojecim import-ima u UI
// komponentama (AnalysisReport.tsx, ClientNutritionPlan.tsx, itd.). Pri sledecem
// touch-u tih komponenti, prebaci import path direktno na nutrition/.
// ============================================================================

export * from './nutrition/planPersonalization';
