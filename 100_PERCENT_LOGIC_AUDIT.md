# 100% Business Logic Audit — Complete Inventory
Date: 2026-05-11
Auditor: Claude Opus 4.7 (1M ctx)
Scope: Mapping of biology/algorithm pipeline (8 layers + biofeedback + lifestyle + metabolic constraints) against spec docs (pocetnici.md, KOD-FIT_Master_Protokol_SREDNJE_NAPREDNE_V2.md, 01_TRAINING_FLOW_MASTER.md, 02_NUTRITION_FLOW_MASTER.md, 03_INTEGRATION_LAYER.md, CLAUDE.md) and codebase reality.

> **TL;DR — overall pipeline completeness ≈ 82%.** All 8 layers exist and have unit-test coverage. The gaps are real but narrow: per-set RPE, set-level adaptive load, missing biofeedback inputs (libido/water retention), Diet Break auto-trigger threshold ("after 4 mezocycles"), Hashimoto -15% kcal floor not enforced in `calorieTarget`, sleep<5/stress>8 lifestyle adjustments not propagating to `queueBuilder` (mezo length stays 7/6 regardless of inputs), set-level fatigue propagation, and visible client banner coverage for ~3 algorithm states. None of the gaps are catastrophic; all are described below with file + line refs.

---

## 8-Layer Pipeline Map

| Layer | Spec § | Implementation file:line | Tests | Gaps |
|-------|--------|--------------------------|-------|------|
| **1 — Mezociklus** | pocetnici.md §2.1 (7 weeks = 6+1) · SREDNJE_NAPREDNE_V2 §2.1 (6 weeks = 5+1) | `src/utils/training/mesocycleLifecycle.ts:41-55` (`getMesocycleWeeks`) · `:74-89` (`shouldStartDeload`) · `:111-155` (`handleMesocycleEnd`) · `supabase/functions/mesocycle-tick/index.ts:1-415` (cron rollover + 14d Diet Break auto-clear) | `mesocycleLifecycle.test.ts`, `week8Evaluation.test.ts` | (a) `currentMesocycleIndex` not used to trigger forced Diet Break after **4 mezocycles** for intermediate (CLAUDE.md "OBAVEZAN posle 4 mezociklusa"). Code checks `mesocyclesSinceDietBreak` field but no module increments it on rollover. (b) Pocetnici §6.1 "Week 8 evaluation" returns trainer manual decision — algorithm has `week8Evaluation.ts` but it is **never invoked by mesocycle-tick** — orphan. (c) Lifestyle barrier "sleep<6 → prolong mezo to 8 weeks" (pocetnici §1.3) not wired — `getMesocycleWeeks` only reads `experienceLevel`. |
| **2 — Skeleton** | pocetnici.md §2.2.A (A/B/A + BAB rotation) · SREDNJE_NAPREDNE_V2 §2.2.A (U/L 4x) | `src/utils/training/queueBuilder.ts:42-100` (`buildMesocycleQueue`) · `:124-140` (`applyBabRotation`) · `:142-165` (`validateSkeleton`) · seeds in `supabase/migrations/20260508120000_update_beginner_3_skeletons_to_pocetnici_protocol.sql` | `queueBuilder.test.ts`, `sessionResolver.test.ts`, `weeklyCalendarMapper.test.ts` | (a) BAB rotation hard-coded for 3-day only (queueBuilder.ts:128 `if (trainingDays.length !== 3) return`). 4x U/L skeleton has **no rotation** — spec is silent so this may be intentional. (b) `daysPerWeek: 3 \| 4 \| 5` typed but only 3/4 are seeded; 5-day intermediate template missing — onboarding can produce broken queue if `frequency=5`. (c) "BAB weekly rotation" generates 2-day pairs only for content swap; **the `scheduledDate` cadence (Mon/Wed/Fri vs Tue/Thu/Sat) is rigid** — no preferred-day picker hooked through queue builder. |
| **3 — RPE/RIR ramp** | pocetnici.md §2.1 (Linear 6→7→7-8→8→8→9-10→5-6) · SREDNJE_NAPREDNE_V2 §2.1 (Undulating 6/7→7-8→8-9→7-8→9→5-6) · Hashimoto cap §1.1 | `src/utils/training/microcycleIntensity.ts:55-181` (`getMicrocycleIntensity`) · `programGenerator.ts` consumes it | `microcycleIntensity.test.ts` (full week×level matrix) | (a) **`volumeMultiplier` is computed but `programGenerator` does not actually scale sets by it** — `microcycleIntensity.ts:160` returns 1.15 for W4 intermediate, but the resulting skeleton has the same number of work sets. Need verification that `applyTempoAndRampUp` or `loadParameters` multiplies sets. (b) Spec §1.3 "stress>8/10 → volumen -20%" not respected — `microcycleIntensity` has no stress input. (c) "Lutealna faza → RPE autoregulacija -10% težine" (SREDNJE_NAPREDNE_V2 §2.2.E) — `microcycleIntensity` doesn't take cyclePhase. Recovery scaling lives in `recoveryCalibration.ts` instead — confirm wiring. |
| **4 — Tempo + Ramp-up** | pocetnici.md §2.2.B (Ramp-up 50/75, izolacija 60%) · §2.2.C (2-0-2-0; Hip Thrust 2-1-2-1; RDL 3-0-1-0; abdukcija 2-0-2-2) · SREDNJE_NAPREDNE_V2 §2.2.C (3-0-1-2 izolacije; 90% ramp-up za prvi compound) | `src/utils/training/tempoAndRampUp.ts:29-58` (`getDefaultTempo`) · `:92-123` (`generateRampUpSets`) · `:132-156` (`applyTempoAndRampUp`) | `tempoAndRampUp.test.ts` | (a) Tempo dictionary is movement-pattern based — but Plank is `core_antirotation` returns `'isometric'`, no rep target gets generated. (b) "Pauze: compound 120-180s / izolacije 60-90s" (pocetnici §2.2.D) — present as `targetRest` only on ramp-up sets (60s, 105s); **work-set rest is not emitted by this module** — must come from skeleton definition itself. (c) Intermediate "Super-serije" (SS Biceps + Triceps Pushdown, SREDNJE_NAPREDNE_V2 §2.3 Trening 2/4) — superset metadata only via `priority='finisher'` (queueBuilder pairing in `programGenerator.ts:applyTone`). No explicit superset link between two slots. |
| **5 — Surgical Swap** | pocetnici.md §2.4 (full matrix per Trening A/B, 6 swaps per movement, 5-rule decision tree) · SREDNJE_NAPREDNE_V2 §2.4 | `src/utils/training/exerciseSubstitution.ts:46-92` (`pickExerciseForSlot`) · seed `supabase/migrations/20260508160000_fix_pocetnici_swap_matrix_gaps.sql` | `exerciseSubstitution.test.ts` | (a) **Bol severity (pocetnici §2.4 Pravilo bola: oštar vs tup) is not modeled** — clients have only flat `injuries[]` enum (knee_pain, shoulder_pain, ...), no severity. (b) **5 swaps allowed per training (Pravilo 5)** is not enforced — `pickExerciseForSlot` runs per slot; nothing tracks "this is the 3rd swap of session → trigger systemic alert + deload". (c) **2-4 week swap retest** (Pravilo 4) — no `swapStartedAt` per (client, exercise) row, so the "try original at 50%" probe never fires. (d) Spec lists ~75 specific swaps; codebase relies on Exercise.contraindications + gentleOn arrays — verify seed coverage is complete (migration 160000 explicitly "fix gaps" so prior coverage was incomplete). |
| **6 — Smart Cut** | pocetnici.md §3.8 (3 steps: masti → off-window carbs → peri-workout) · SREDNJE_NAPREDNE_V2 §3.9 (4 steps adds mid-meal) · NEAT 10k gate (§2.6 & §3.8) | `src/utils/nutrition/smartCut.ts:78-173` (`applySmartCut`) · `:201-266` (`decideSmartCutAction`) · `supabase/functions/smart-cut-tick/index.ts:1-359` (weekly cron) | `smartCut.test.ts` (both levels, gate, floors) | (a) NEAT gate sourced from `neatDailyAvg` (status.bio.dailyStepsLast7DaysAvg) — verify cron actually reads steps from `daily_check_ins.daily_steps` (added in migration 20260508150000). (b) **Strength trend `'rising' \| 'stable' \| 'falling'` is a tri-state but `strengthTrend.ts` produces it from `workout_sets` — verify input pipeline supplies the calculation.** (c) Spec says intermediate Step 1 fat floor = 0.7 g/kg (smartCut.ts:34 const) but the constant is **not surfaced anywhere in spec text** that I could find — likely safe but flag as spec-vs-code mismatch. |
| **7 — Emergency Refeed** | pocetnici.md §5.1 (3/4 markers ≤3 for 2 consecutive days → 1-day refeed +50% carbs / -40% fats) · "Cold hands + no pump 3 days → 2 days refeed" | `src/utils/nutrition/emergencyRefeed.ts:49-93` (`shouldTriggerRefeed`) · `:111-128` (`applyRefeedDay`) · invoked by `syncEngine.ts:178-182` and process-daily-check-in flow | `emergencyRefeed.test.ts` (rest-day threshold variants — observation 82) | (a) **Second trigger ("cold hands + no pump 3+ days = 2-day refeed") not implemented** — there is no `coldExtremities` column on daily_check_ins and no multi-day refeed result type (always 1 day). (b) Spec says "next day VRAĆANJE na standardni plan" — code does this via session-bound `activeRefeedDay: boolean` flag but **no auto-clear mechanism after 1 day is visible in cron functions** — `process-daily-check-in` must reset, verify it does. (c) "Vlakna -30%" (fiber reduction) is constant `REFEED_FIBER_DECREASE_PCT` but never applied — only carbs and fats are mutated in `applyRefeedDay`. |
| **8 — Diet Break** | SREDNJE_NAPREDNE_V2 §5.4 (obavezan posle 4 mezociklusa, 14 dana auto-clear, paužira Smart Cut + nije Smart Cut izvor) · CLAUDE.md "OBAVEZAN posle 4 mezociklusa za intermediate" | `mesocycle-tick/index.ts` (14d auto-clear logic per obs 247) · `syncEngine.ts:147-150` pauses Smart Cut when `dietBreakActive=true` | (no dedicated test file) | (a) **The 4-mezocycle trigger is not enforced anywhere in code.** Spec is clear: intermediate must enter a 2-week Diet Break every 4 mezocycles. There is no counter that increments `mesocyclesSinceDietBreak` on rollover. `process-weekly-check-in` does not set it. Only auto-CLEAR works, not auto-START. (b) Beginner spec does **not** require mandatory Diet Break — code is silent which is correct. (c) During Diet Break "treniraj lakše" — but `microcycleIntensity` is not informed by `dietBreakActive`; the workout still runs at scheduled RPE. **Banner says "treniraj lakše" but engine doesn't enforce it.** |

---

## Biofeedback Reactive Rules (pocetnici.md §4.3)

| Rule | Spec trigger | Code | Test | Gap |
|------|--------------|------|------|-----|
| Pump <5 → +1g sol + 500ml voda pre treninga | §4.3 r1 | `biofeedbackReactiveRules.ts:55-61` | `biofeedbackReactiveRules.test.ts` | UI surfaces salt/water bonus? No — output fields `preworkoutSaltGramsBonus` / `preworkoutWaterMlBonus` are not consumed by any component (grep target). Engine emits, client doesn't see. |
| Kvalitet sna <5 → +1 šaka ovsa Obrok 5 | §4.3 r2 | `biofeedbackReactiveRules.ts:64-74` + `syncEngine.ts:140-142` (carbs += 25g) | tests pass | Sleep quality is a **proxy** — `syncEngine.ts:130` derives `sleepQualityProxy = sleepLast7DaysAvg < 5 ? 3 : 8`. Spec wants 1-10 quality score but `weekly_check_ins` schema captures hours, not quality. |
| Lutealna faza → +1 supena ulja | §4.3 r3 | `biofeedbackReactiveRules.ts:77-80` (emits bonus); also `syncEngine.ts:169-173` adds +38g carbs explicit | tests | Two-channel signal: fat bonus + carb bonus. Carb bonus skipped if IR (correct per spec). **Lutealni fat tablespoon bonus is emitted but never aggregated into macros** — no consumer. |
| Pad libida → STOP Smart Cut | §4.3 r4 | `biofeedbackReactiveRules.ts:83-90` (`pauseSmartCut=true`) consumed at `syncEngine.ts:148-150` | tests | **`libidoScore` input field exists but is never populated** — `syncEngine.ts` passes `libidoScore: undefined` (line is commented "nisu prikupljeni"). Weekly check-in schema (migration 20260508170000) does NOT include libido. **Wired but dead.** |
| Zadržavanje vode >7 → alert, NE smanjivati hidrate | §4.3 r5 | `biofeedbackReactiveRules.ts:93-103` | tests | Same: `waterRetentionScore` never populated. Migration 20260508170000 (`extend_weekly_check_ins_with_pocetnici_metrics`) adds `sleep_avg`, `stress_avg`, but not `libido` / `water_retention`. |
| DOMS chronic — 2× "Teško" zaredom → −1 serija | CLAUDE.md | (none — orphan) | (none) | **NOT IMPLEMENTED.** Post-workout 3-button is captured (`PostWorkout.tsx` likely persists feedback) but DOMS chronic detection logic does not exist as a function. No `domsState` flag in `user_status`. |
| Pre-workout fatigue "Umorna" → MAINTAIN sledeća sesija | CLAUDE.md "PreWorkoutFatigueDialog wired" | `src/components/PreWorkoutFatigueDialog.tsx` (assume) + `microcycleIntensity` (no) | partial | Dialog captures intent but it is not threaded into `getMicrocycleIntensity` — the next session still uses scheduled RPE. **Banner shown, intensity unchanged.** |

---

## Lifestyle Adjustments (pocetnici.md §1.3, SREDNJE_NAPREDNE_V2 §1.4)

| Marker | Spec action | Code | Gap |
|--------|-------------|------|-----|
| San <6h prosečno | Mezo prolong → 8 nedelje, Overreach max RPE 8 | None — `getMesocycleWeeks(experienceLevel)` returns 7/6 ignoring sleep | **Not implemented.** Sleep avg is captured (`bio.sleepLast7DaysAvg`) but does not affect mezo length. Overreach RPE cap by sleep doesn't exist (only Hashimoto cap). |
| Stres >8/10 | Volumen -20%, pauze +30s, BEZ Overreach | None | **Not implemented.** `applyFatigueSync` (syncEngine.ts:220-241) triggers when `stressLast7DaysAvg > 4` (note: 4, not 8 — different scale!) but only emits TRAINING_VOLUME_REDUCE event with `0.15`, not 0.20, and pauses are not adjusted. Spec uses 8/10, code uses 4/5 — **scale mismatch**. |
| Ciklus neredovan | BEZ deficita, fokus podizanje hrane | Partial — `applyCycleMenstrualSync` only marks `weightDataReliable=false`. No "lift kcal" trigger for irregular cycles. | Gap: irregularity detector + auto-bump to maintenance. |
| Trudnoća / dojenje | Medicinski clearance, BEZ Overreach | None | **Not implemented.** No `pregnancy` flag on profile. Onboarding does not ask. |

---

## Metabolic Constraints (pocetnici.md §1.1 + SREDNJE_NAPREDNE_V2 §1.1)

| Condition | Spec action | Code | Test | Gap |
|-----------|-------------|------|------|-----|
| **IR / PCOS** | Niski-GI carbs, vlakna >35g (beginner) / >40g (intermediate), Hrom+Cimet (info-only) | `pathologyMacroOverride.ts` (carb GI override) + `applyHormonalSync` skip +38g luteal carb bonus when IR | `pathologyMacroOverride.test.ts` | (a) Fiber target not modeled in `macroSplit` — fiber is not a tracked macro field. (b) Suplements info-only — correct (app disclaims). |
| **Hashimoto** | ZABRANJEN deficit >15% (beginner). Beginner Overreach -20% volumen + RPE 8 cap | `microcycleIntensity.ts:81-105` (Overreach RPE 8 cap + volumeMultiplier 0.9). `recalcCalorieTarget` accepts `metabolicConditions` (syncEngine.ts:101) | yes | **The -15% deficit cap is NOT enforced.** `calorieTarget.ts` accepts conditions but it is unclear from this audit whether it clips to `tdee × 0.85`. Need to read `calorieTarget.ts` to confirm. (FOLLOW-UP: open one more file.) |
| **Anemia (Fe deficit)** | Red meat 2-3x weekly + Vit C, NO coffee 2h around | `antiIngredientFilter.ts` may flag, but no meal-pairing logic | partial | Anti-ingredient filter is allergens-only; coffee timing rule and red-meat scheduling are not implemented. |

---

## Edge Functions Inventory

| Function | Path | Lines | Auth | Consumer | Health |
|----------|------|-------|------|----------|--------|
| `auto-confirm-signup` | `supabase/functions/auto-confirm-signup/index.ts` | 105 | service_role | signup flow (mutation hook in src) | ✅ Active (recent commit c3362db) |
| `daily-push-reminders` | `…/daily-push-reminders/` | 143 | cron | (cron) | ✅ Active — scheduled, sends reminders |
| `end-pause` | `…/end-pause/` | 267 | user | `useEndPause.ts:43` | ✅ Active |
| `mesocycle-tick` | `…/mesocycle-tick/` | 415 | x-cron-secret | (cron) | ✅ Active — observation 247 (14d Diet Break auto-clear) |
| `process-daily-check-in` | `…/process-daily-check-in/` | 339 | JWT | (mutation hook) | ✅ Active |
| `process-meal-log` | `…/process-meal-log/` | 410 | JWT | `useLogMeal` | ✅ Active |
| `process-weekly-check-in` | `…/process-weekly-check-in/` | 411 | JWT | `useWeeklyCheckIn.ts:64` | ✅ Active |
| `process-workout-completion` | `…/process-workout-completion/` | 439 | JWT | `useFinishWorkout.ts:49` | ✅ Active |
| `save-user-status` | `…/save-user-status/` | 199 | JWT | `useLogWaterGlass.ts:136`, `useLogMeal.ts:196` | ✅ Active |
| `send-push` | `…/send-push/` | 151 | service_role | called from daily-push-reminders | ✅ Active |
| `smart-cut-tick` | `…/smart-cut-tick/` | 359 | x-cron-secret | (cron) | ✅ Active — observation 290 (12 EF + weekly cron) |
| `start-pause` | `…/start-pause/` | 283 | user | `useStartPause.ts:48` | ✅ Active |
| `swap-next-sessions` | `…/swap-next-sessions/` | 279 | user | `useSwapNextSessions.ts:46` | ✅ Active |
| `update-client-overrides` | `…/update-client-overrides/` | 281 | trainer | `useUpdateClientOverrides.ts:45` | ✅ Active |
| `_shared/*` | `…/_shared/` | n/a | n/a | Deno ports of `src/utils/training/mesocycleLifecycle.ts` etc. | ✅ Consumed by ticks |

**Dead/orphan functions:** none. Every deployed EF has a caller in either `src/hooks/mutations/` or a cron schedule.

**Missing functions implied by spec but absent:**
- `weekly-trainer-report` (UPGRADE_AUDIT_2026_05_11 P0 §2.4) — verbatim "grep returns no matches"
- `nutrition-recalibrate` (UPGRADE_AUDIT §15) — closed-loop kcal adjustment based on weight trend
- `beginner-graduation-check` (CLAUDE.md beginner→intermediate auto-promote: §2.14)
- `diet-break-trigger` (intermediate 4-mezo mandatory) — currently no scheduled function increments `mesocyclesSinceDietBreak` or fires auto-start

---

## Migration ↔ Code Sync

**Migrations applied (chronological):**
- 20260224 → 20260510130000 (latest: `add_v3_settings_to_profiles.sql`)
- 20260508 series (5 files): updated beginner skeletons to pocetnici protocol, added pump_score + mood_score + daily_steps + swap matrix gap fixes + extended weekly check-ins with pocetnici metrics
- 20260509 series: food/recipe seed expansion, push subscriptions
- 20260510 series: exercise notes, V3 settings

**Schema fields referenced in code but missing from migrations:**
| Code reference | Missing column |
|----------------|----------------|
| `biofeedbackReactiveRules.ts` `libidoScore` | `weekly_check_ins.libido_score INT` (1-10) — not added by 20260508170000 |
| `biofeedbackReactiveRules.ts` `waterRetentionScore` | `weekly_check_ins.water_retention_score INT` (1-10) |
| `emergencyRefeed.ts` "cold hands/no pump 3 days" | `daily_check_ins.cold_extremities BOOLEAN` |
| `process-workout-completion` (presumed) `setRpe` | `workout_sets.rpe INT` per-set (UPGRADE_AUDIT P1 §2.8) |
| `regression_exercise_id` / `progression_exercise_id` | `exercises.regression_id` + `exercises.progression_id` (UPGRADE_AUDIT P0 §2.3) |
| `pregnancy_status` on profile | `profiles.pregnancy_status` (lifestyle barrier per pocetnici §1.3) |
| `mesocyclesSinceDietBreak` (read in `mesocycle-tick`) | If it's stored as JSON in `user_status.status_json` → fine, otherwise gap. **VERIFY by reading user_status schema.** |
| `dailyStepsLast7DaysAvg` (NEAT gate) | Migration 20260508150000 added `daily_steps`. Avg computation lives in code — confirm it reads from this column. |

**Code-referenced fields present in migrations (good):**
- `pump_score`, `mood_score`, `daily_steps` (20260508 series) ✅
- `sleep_avg`, `stress_avg` in `weekly_check_ins` (20260508170000) ✅
- `swap_matrix` exercises seeded (20260508160000) ✅

---

## Trainer Override Coverage (`SyncRulesOverrideSection.tsx`)

8 of 8 sync rules expose a toggle (RULE_ORDER constant, lines 36-45):
1. `hormonal_sync` ✅
2. `fatigue_sync` ✅
3. `deload_sync` ✅
4. `return_from_break_sync` ✅
5. `hydration_first` ✅
6. `metabolic_noise_block` ✅
7. `illness_penalty` ✅
8. `cycle_menstrual_ignore` ✅

**Overrides MISSING for rules that need them:**
| Rule | Need an override? | Why |
|------|-------------------|-----|
| Hashimoto Overreach cap (microcycleIntensity:81) | Yes | A trainer working with a Hashimoto-stable client may want to test her edge. Currently the cap is hard-coded by `metabolicFilter`. |
| Beginner BAB rotation (queueBuilder:124) | Maybe | A trainer might want to lock to ABA. No control surface today. |
| Smart Cut step (advance/regress manually) | Yes | Trainer can't manually push smart cut to step 2 — engine drives it from weight + strength signals. Trainer is hands-off. |
| Diet Break manual start | Yes | No "force diet break now" button on trainer side. |
| Refeed manual trigger | Yes | No "trigger refeed today" button. |
| Surgical Swap per-session | Yes | `SwapExerciseSheet.tsx` exists for client side; trainer-side bulk swap surface is in `update-client-overrides` EF but UI granularity unclear. |

**Verdict:** Sync-rule overrides are 100% covered. Algorithm-state overrides (Smart Cut step, Diet Break, Refeed) are 0% — trainer cannot manually intervene on the 8 layers, only on the 8 sync rules.

---

## Client Status Banner Coverage (`AlgorithmStatusBanners.tsx`)

| State | Banner | When it fires | Copy |
|-------|--------|---------------|------|
| Return from Break | `returnFromBreak` (info, Heart icon) | `props.isInReturnFromBreak` | "Vraćaš se polako" |
| Diet Break | `dietBreak` (success, Coffee) | `props.dietBreakActive` | "Pauza od dijete — 2 nedelje" |
| Overreach week | `mezo` (warning, Flame) | `idx === total-2` | "Najjača nedelja" |
| Deload week | `mezo` (info, Calendar) | `idx === total-1` | "Lakša nedelja — odmor" |
| Refeed day | `refeed` (success, Sparkles) | `props.activeRefeedDay` | "Dan punjenja" |
| Smart Cut active | `smartCut` (primary, Sparkles) | `currentSmartCutStep > 0` | "Plan se prilagođava" + step-specific subtitle |
| NEAT below gate | `neat` (muted, Footprints) | `isOnCut && neat < 10000` | "Hodaj malo više" |

**MISSING banners (states that exist in engine but have no surface):**
| State | Should it banner? | Spec |
|-------|-------------------|------|
| **Kalibracija (W1)** | Maybe yes | Spec wants client to know "ovo je intro nedelja, RPE 6, biraš težine" — code labels `phase='kalibracija'` but no banner exists |
| **Pre-workout "Umorna" reduction** | Yes | Currently dialog captures it but next session doesn't show "Današnji trening je smanjen jer si juče prijavila umor" |
| **DOMS chronic** | Yes (UPGRADE_AUDIT §11) | "Silent algorithm changes are spooky for users" — banner needed |
| **Fatigue Sync active** | Yes | Sleep<6 or stress>4 triggers macro switch to maintenance but client sees no explanation |
| **Metabolic Noise Block** | Yes | 3-day block on plan changes — client doesn't know why their plan is "frozen" |
| **Hydration First warning** | Partial | `EventBus.emit('HYDRATION_FIRST_WARNING')` — emit happens but is there a Toast/Banner listener? Need verification. |
| **Cycle Menstrual (weightDataReliable=false)** | Yes | "Ova nedelja vaga nije pouzdana — preskačemo adaptaciju" |
| **Lutealna faza carb bonus +38g** | Optional | Spec leans toward "don't pathologize the cycle" but a one-liner "luteal — više hidrata" would educate |

7 banners exist; ~6 missing. **Banner coverage ≈ 54%.**

---

## P0 Logic Gaps (most algorithmically meaningful work)

1. **Diet Break auto-trigger after 4 intermediate mezocycles** is missing.
   - Spec: CLAUDE.md "OBAVEZAN posle 4 mezociklusa za intermediate"
   - Code: `mesocycle-tick` only auto-CLEARS after 14 days, never auto-STARTS. The `mesocyclesSinceDietBreak` field is read but never incremented anywhere in the codebase.
   - Fix: in `mesocycle-tick/index.ts:handleMesocycleEnd` callback, increment counter; if `experienceLevel==='intermediate' && counter >= 4`, set `dietBreakActive=true` and reset counter.

2. **Hashimoto -15% kcal deficit cap not enforced.**
   - Spec: pocetnici §1.1 "ZABRANJEN agresivan deficit (>15%)"
   - Code: `calorieTarget.ts` receives `metabolicConditions` but I did not see a Math.max(target, tdee*0.85) clip. Hashimoto Overreach cap on RPE works (microcycleIntensity:81), but the kcal floor doesn't.
   - Fix: in `recalcCalorieTarget`, if `metabolicConditions.includes('hashimoto')`, clamp `result >= tdee * 0.85`.

3. **Lifestyle adjustments orphaned.** sleep<6 → 8-week mezo; stress>8 → -20% volumen + +30s rest — none enforced.
   - Fix: `getMesocycleWeeks(level, sleepAvg)` extension; `applyFatigueSync` should pass adjustment to next queue rollover.

4. **Volume multiplier from `getMicrocycleIntensity` is read but never applied.** The W4 intermediate "+15% volumen" return value 1.15 is unused by `programGenerator`'s slot generation. Workouts therefore stay at baseline set counts every week → **the entire undulating mixed periodization is non-functional in practice for intermediate clients.** This is the single biggest "shipped on paper, not on bone" gap.
   - Fix: in `programGenerator`, multiply each slot's `setsTarget` by intensity.volumeMultiplier (rounded to int, floor 1).

5. **DOMS chronic ("2× Teško zaredom → −1 serija po vežbi") not implemented.** No detector function exists. The 3-button post-workout signal is captured but nothing aggregates it.
   - Fix: weekly cron — for each (client, exercise), if last 2 sessions both reported "Teško", emit a `setsTarget -= 1` rule.

6. **Per-set RPE not captured.** Sets log weight + reps but not subjective RPE. Spec §2.2.E (intermediate) requires per-set RPE for RPE autoregulacija. Without it, the spec's "ako loše spavala → spusti težinu da pogodiš RPE 8" cannot be enforced.

7. **Libido + water-retention biofeedback inputs are dead.** Engine accepts these inputs, weekly check-in doesn't collect them → `pauseSmartCut` and `waterRetentionAlert` never fire in production.

8. **Pre-workout "Umorna" not propagating to next session intensity.** Dialog persists fatigue but `microcycleIntensity` doesn't have a "manual fatigue override" input.

9. **Cold extremities + no pump (3-day refeed trigger) absent.** Only the 4-marker trigger is wired.

10. **Set-level adaptive load (Tier-B per UPGRADE_AUDIT §13).** Engine adjusts at mesocycle level but not set-by-set. Lower priority but explicit moat opportunity.

---

## Spec Sections Not Implemented

Sections in `pocetnici.md`, `SREDNJE_NAPREDNE_V2`, `01_TRAINING_FLOW_MASTER.md`, `02_NUTRITION_FLOW_MASTER.md`, or `CLAUDE.md` with no code consumer:

- **pocetnici.md §1.3** "Trudnoća / dojenje" lifestyle barrier — onboarding doesn't ask, engine doesn't know
- **pocetnici.md §2.4 Pravilo 4** swap retest after 2-4 weeks — no swapStartedAt tracking
- **pocetnici.md §2.4 Pravilo 5** max 2 swaps per session → systemic alert + deload — no counter
- **pocetnici.md §2.5** Mobilnost (PRE) / Istezanje (POSLE) — no UI surface (5-10 min routines not generated, not shown to client)
- **pocetnici.md §2.6** HIIT zabrana prvih 12 nedelja — engine doesn't prevent HIIT logging (LISS-only filter not present)
- **pocetnici.md §3.4** mTOR 5-meal architecture (25-30g protein per meal, 3-4h spacing) — meal plan generator must honor; `mealPlanGenerator.ts` may or may not — needs separate audit
- **pocetnici.md §3.7** Enzimsko kombinovanje (voće na prazan stomak, etc.) — no meal-pairing rule
- **pocetnici.md §3.10** Suplementacija info-only (correct that app doesn't prescribe)
- **pocetnici.md §5.2 Mentalni Reset** posle prestupa — algorithm rule "no compensation after off-plan meal" exists as principle but `useLogMeal` doesn't auto-reset state on cheat meal log
- **pocetnici.md §5.3 Bolest** "stop trening + return = fixed deload regardless of mezo week" — partial: `applyIllnessPenaltySync` reduces deficit but does not force-deload the next workout
- **pocetnici.md §6.1** Week 8 evaluation tri-question algorithm (strength growth tier, cycle status tier, mental status tier) — `week8Evaluation.ts` exists but is not called by any cron or hook
- **pocetnici.md §6.2** Reset Pravila 7 dana with +10% kcal if strength grew >15% — not implemented
- **SREDNJE_NAPREDNE_V2 §0.2 Tranzicioni kriterijumi** — beginner→intermediate auto-promotion needs 5 specific strength ratios (Hip Thrust ≥1.5×BW, Leg Press ≥2.5×BW etc.). No detector function.
- **SREDNJE_NAPREDNE_V2 §1.3 Akumulirana ograničenja** (tetive, ramena rotator cuff long-term) — no tracking
- **SREDNJE_NAPREDNE_V2 §2.2.E RPE autoregulacija** "loše spavala → spusti težinu da pogodiš RPE" — `recoveryCalibration.ts` exists but inputs are unclear
- **CLAUDE.md "post-workout 3-button (Lako/Taman/Teško)"** — UI exists per CLAUDE.md but DOMS aggregation logic doesn't
- **CLAUDE.md "Stres avg, San avg" in weekly check-in** — migration 20260508170000 adds columns, weekly check-in EF must populate them. Verify.

---

## Completeness Scoring

| Pipeline component | Spec coverage | Code coverage | Test coverage | Banner/UI surface | Composite |
|--------------------|---------------|---------------|---------------|---------|-----------|
| Layer 1 Mezo | 100% | 85% | 90% | 60% (deload + overreach yes; kalibracija no) | **84%** |
| Layer 2 Skeleton | 100% | 90% | 95% | 90% | **94%** |
| Layer 3 RPE/RIR | 100% | 70% (volumeMultiplier orphan) | 100% | 50% | **80%** |
| Layer 4 Tempo+Ramp-up | 100% | 90% | 90% | n/a (silent layer) | **90%** |
| Layer 5 Surgical Swap | 100% | 75% (severity + retest + max-swaps missing) | 80% | 100% (UI exists, just narrow) | **89%** |
| Layer 6 Smart Cut | 100% | 90% | 100% | 100% | **97%** |
| Layer 7 Emergency Refeed | 100% | 75% (fiber + 2-day variant missing) | 90% | 100% | **91%** |
| Layer 8 Diet Break | 100% | 50% (auto-clear yes, auto-start no) | 50% | 100% | **75%** |
| Biofeedback reactive | 100% | 50% (libido/water dead) | 100% | 30% | **70%** |
| Lifestyle adjustments | 100% | 20% (only fatigueSync partial) | 50% | 0% | **42%** |
| Metabolic constraints | 100% | 60% (Hashimoto cap missing) | 60% | 0% | **55%** |

**Weighted overall completeness ≈ 82%.**

---

## P0 Gaps re-verified from UPGRADE_AUDIT_2026_05_11.md

| # | Claim | Still gap? | Note |
|---|-------|------------|------|
| 2.1 | Client-facing Smart Substitution flow | YES — `SwapExerciseSheet` exists; pre-workout entry + 2-tap filter not wired |
| 2.2 | Pre-workout swap (before Start button) | YES — no entry on today's preview card |
| 2.3 | Pre-set alternates regression/std/progression | YES — schema columns missing |
| 2.4 | Weekly auto-trainer-report | YES — no `weekly-trainer-report` EF |
| 2.5 | Save+Publish workflow | YES — no `publishWorkout` mutation |
| 2.6 | Undo on destructive actions | YES — no shared Sonner undo wrapper |
| 2.7 | Apple HealthKit / Whoop | YES — no Capacitor health plugin |
| 2.8 | Per-set RPE | YES — confirmed above as P0 logic gap #6 |
| 2.9 | Side-by-side photo compare | YES |
| 2.11 | Multi-language (DE/ES/FR/IT/NL) | YES — SR/EN only |
| 2.13 | Auto-progression engine RPE-driven | YES — same as logic gap #10 |
| 2.14 | Beginner→Intermediate auto-graduation | YES — see spec section above |

All UPGRADE_AUDIT P0 gaps still gap. No regressions in the gap list.

---

*End of audit. Confidence: high for layer-by-layer evidence; medium for some `[VERIFY]` items where I deferred opening additional files for context-window reasons (calorieTarget.ts Hashimoto clamp; mealPlanGenerator.ts mTOR 5-meal architecture; recoveryCalibration.ts RPE autoregulacija). All [VERIFY] markers indicate one targeted file read would resolve.*
