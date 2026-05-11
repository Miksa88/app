# UI Review v3 — V3 Surfaces (Third-Pass Adversarial Re-Audit)

**Audited:** 2026-05-11 (third pass)
**Baseline:** Abstract 6-pillar standards + `UPGRADE_PLAN_V3_SECTIONS.md` universal rules (§1–14)
**Screenshots:** not captured (code-only audit, no dev server detected)
**Auditor stance:** adversarial — assume every claim of "fixed" is overstated until grep proves it; score honestly.
**Previous score:** v2 = 18/24 (Copywriting 3/4, Visuals 3/4, Color 3/4, Typography 3/4, Spacing 3/4, ExpDesign 3/4).

---

## v2 Findings — Verification Matrix

| # | v2 Finding | Location | Fixed? | Evidence |
|---|------------|----------|--------|----------|
| 1 | Note delete no Undo (blocker) | `ClientProfile.tsx:500` | **YES** | `handleDeleteNote` at `:63-81` wraps in `undoNote.run` with `apply=deleteNoteMutation` and `revert=createNoteMutation` for body restore. Wired through onClick at `:521`. |
| 2 | Quiet hours no Undo (blocker) | `QuietHoursPicker.tsx:41` | **YES** | `onSave` at `:48-57` wraps `setMutation` in `undo.run` with apply/revert; previous prefs captured at `:51`. |
| 3 | Units toggle no Undo (blocker) | `UnitsPicker.tsx:31,36` | **YES** | Both `setWeight` (`:38-47`) and `setLength` (`:48-57`) call `undo.run` with apply/revert. |
| 4 | Home raw `<h1>` not PageTitle | `Home.tsx:105` | **YES (whitelisted)** | `PageTitle.tsx:13-14` comment explicitly lists "Home greeting (custom — pozdrav + ime + chat dugme)" as a documented exception. Custom layout has greeting label + wave emoji + chat button — not interchangeable with generic PageTitle. |
| 5 | `"FlexFemme Fit"` literal | `TrainerProfile.tsx:77,272` | **YES** | Line 78: `t("trainerProfile.brandNameDefault")`; line 273: `t("trainerProfile.brandNameDefault")`. Key exists in `LanguageContext.tsx:857`. |
| 6 | `"#E91E8C"` literal | `TrainerProfile.tsx:279` | **YES** | Line 280: `t("trainerProfile.brandColorDefault")`. Key exists in `LanguageContext.tsx:858`. |
| 7 | `HERO_PADDING` dead code | `design-tokens.ts:127` | **YES** | `PageTitle.tsx:20,31` now imports and consumes both `HERO_PADDING.afterHeader` (compact) and `HERO_PADDING.standalone` (default). |
| 8 | Raw switch dims, not `IOS_SWITCH` | `TrainerProfile.tsx:99,102,105` | **YES** | `TrainerProfile.tsx:8` imports `IOS_SWITCH`; lines 103 and 106 consume `IOS_SWITCH.track` / `IOS_SWITCH.thumb`. |

**Result: 8/8 v2 findings closed.**

---

## Pillar Scores

| Pillar | Score | Δ vs v2 | Key Finding |
|--------|-------|---------|-------------|
| 1. Copywriting | 3/4 | 0 | TrainerProfile brand strings + color hex now i18n'd. BUT `ExercisePicker.tsx:11` `FILTER_CHIPS = ["All", "Noge", "Grudi", "Leđa", ...]` hardcoded SR; `Chat.tsx:79` `<h1>Trainer 💜</h1>` literal English; `ClientProfile.tsx:350-353` stat labels `'Goal' / 'Height' / 'Weight' / 'Age'` hardcoded English (NEW v3 finding overlooked in v2). |
| 2. Visuals | 3/4 | 0 | Banner radii harmonized (v2 verified). BUT ClientProfile hero (`:274 rounded-2xl`, `:317 rounded-xl`, `:355 rounded-xl`, `:477 rounded-lg`) still drifts across 3 radii within one screen — `RADIUS` token exists at `design-tokens.ts:99-108` but `ClientProfile.tsx` does not import it. |
| 3. Color | 3/4 | 0 | Status pill mapping clean (v2 verified). BUT ClientProfile hero (`:273-364`) stacks gradient bg + gradient `TierBadge` + white-on-gradient progress bar + nested gradient bar (60/30/10 accent rule violated in single viewport). |
| 4. Typography | 3/4 | 0 | Page-level type ramp consistent. BUT `<PageTitle>` rule still broken on 17 pages: `MealPlan`, `Shopping`, `Subscription`, `PostWorkout`, `AssignProgram`, `TrainerDashboard`, `TrainerClients`, `TrainerNutrition`, `TrainerPayments`, `TrainerAnalytics`, `TrainerMessages` (x3), `TrainerTraining`, `TrainerFreeTrial`, `NotFound`, `AnalysisReport`, `PackageEditor` all render raw `<h1 className="text-large-title">`. Universal rule §1 ("Jedan PageTitle po stranici") is systemically violated; only `Profile.tsx` and `WeeklyCheckIn.tsx` actually comply. Home is whitelisted; everything else is drift. |
| 5. Spacing | 3/4 | 0 | `IOS_SWITCH` now consumed in `Profile.tsx` + `TrainerProfile.tsx`. `HERO_PADDING` now live in `PageTitle.tsx`. BUT only 4 files import design tokens (`Profile.tsx`, `TrainerProfile.tsx`, `PageTitle.tsx`, `design-tokens.ts`) — `RADIUS` token has zero consumers; `ClientProfile.tsx` still hand-rolls radii. |
| 6. Experience Design | 4/4 | +1 | **All three v2 blockers closed.** `useUndoableAction` now correctly wired on: `ClientProfile.tsx` note delete (`:63-81`), `QuietHoursPicker.tsx` save (`:48-57`), `UnitsPicker.tsx` weight + length (`:38-57`), plus previously-verified `Profile.tsx`, `EquipmentEditor.tsx`, `PauseClientCard.tsx`, `VacationModeCard.tsx`. Zero destructive actions without Undo on the audited surface set. |

**Overall: 19/24**

---

## Verdict: **OVERCLAIMED** (≤19)

Score sits exactly on the boundary between OVERCLAIMED (≤19) and ACCEPTABLE (20-21). Going strict: **19/24 — OVERCLAIMED**.

Net improvement vs v2: **+1 point** (Experience Design 3→4). The four destructive-action gaps named by name in v2 are all closed, and ExpDesign now genuinely reaches 4/4 — every audited mutation runs through `useUndoableAction`. All four v2 BLOCKERS are resolved. But the other five pillars are unchanged because none of the systemic drift (PageTitle rule, RADIUS token adoption, ExercisePicker SR labels, Chat header literal) was addressed.

This v3 pass is **honest, not perfect**: the developer fixed exactly what was named in the v2 fix list and nothing more. No new regressions; no new pillar promotions either.

---

## Top 3 Remaining Issues

### 1. **WARNING — `<PageTitle>` rule violated on 17 pages (systemic)**
The universal v3 rule "Jedan PageTitle po stranici" is observed only on `Profile.tsx:281` and `WeeklyCheckIn.tsx:258`. Every other content-area page renders raw `<h1 className="text-large-title">` inline:
- `MealPlan.tsx:132`, `Shopping.tsx:128`, `Subscription.tsx:20`, `PostWorkout.tsx:193`
- `TrainerDashboard.tsx:82`, `TrainerClients.tsx:103`, `TrainerNutrition.tsx:43`, `TrainerAnalytics.tsx:53`, `TrainerPayments.tsx:21`, `TrainerTraining.tsx:136`, `TrainerMessages.tsx:115,128,151`, `TrainerFreeTrial.tsx:89`
- `AssignProgram.tsx:91`, `PackageEditor.tsx:182`, `AnalysisReport.tsx:169`, `NotFound.tsx:27`

**Fix:** mechanical migration — replace each `<h1 className="text-large-title text-foreground tracking-tight">{title}</h1>` block with `<PageTitle title={title} />` or `<PageTitle title={title} compact />` when below PageHeader.

### 2. **WARNING — `ExercisePicker.tsx:11` filter chips hardcoded Serbian**
```ts
const FILTER_CHIPS = ["All", "Noge", "Grudi", "Leđa", "Ramena", "Ruke", "Core", "Kardio"];
```
EN users see Serbian labels; SR users see one English literal ("All"). Universal v3 rule §12 says i18n keys never hardcoded. **Fix:** declare `exercises.filter.legs/chest/back/shoulders/arms/core/cardio` keys, map in chip render.

### 3. **WARNING — Hardcoded English labels + Chat header literal**
- `ClientProfile.tsx:350-353` stat cells `label: 'Goal' / 'Height' / 'Weight' / 'Age'` — render literally on the trainer's client detail view. EN-only.
- `Chat.tsx:79` `<h1>Trainer <span aria-hidden="true">💜</span></h1>` — "Trainer" word is hardcoded English, not via `t()`. Universal rule §12 still violated.

**Fix:** add `clients.stats.goal/height/weight/age` keys + `chat.header.trainer` key, wrap calls.

Additional WARNING-level deltas (not in Top 3 but evidenced):
- `PauseClientCard.tsx:155-178` submit + cancel buttons still bespoke (`bg-warning/15`, raw `bg-card border`) — universal rule §2 ("Primary CTA = GradientButton") half-applied; resume button at `:114` is correct, pause submit is not.
- `RADIUS` token defined in `design-tokens.ts:99` but zero consumers across `src/` — dead code regression (HERO_PADDING was dead in v2, fixed in v3; RADIUS is dead in v3, predicting v4).
- `ClientProfile.tsx:274` hero gradient inline style `style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)" }}` — accent layered against gradient TierBadge + gradient progress fill at `:608`. Single viewport accent overuse persists.

---

## Verified Strengths (per pillar, v3 evidence)

### Copywriting
- `TrainerProfile.tsx:78,273,280` — brand name + color hex now `t("trainerProfile.brandNameDefault")` / `t("trainerProfile.brandColorDefault")`.
- `LanguageContext.tsx:857-858` — keys exist in both `en` + `sr` dictionaries.
- `WeeklyCheckIn.tsx:380,404,427` — sleep/stress/identity slider labels via `t()` (v2 verified, holding).

### Visuals
- `PausedClientBanner.tsx:24` + `TrainerVacationBanner.tsx:32` — banner icon containers both `rounded-xl` (v2 verified).
- `TrainerProfile.tsx:103,106` — `IOS_SWITCH.track` / `IOS_SWITCH.thumb` used directly.

### Color
- `Profile.tsx:316` — Quick Pause card `bg-warning/10 text-warning` (v2 verified, holding).
- `ClientProfile.tsx:210-213` — status pill semantic mapping clean (v2 verified, holding).

### Typography
- `Profile.tsx:281` — `<PageTitle title={t("profile.title")} />`.
- `WeeklyCheckIn.tsx:258` — `<PageTitle title={...} subtitle={...} compact />`.
- `PageTitle.tsx:20,31` — now consumes `HERO_PADDING` constants.

### Spacing
- `Profile.tsx:539,541,609,610` — `IOS_SWITCH.track / IOS_SWITCH.thumb` consumed.
- `TrainerProfile.tsx:8,103,106` — `IOS_SWITCH` imported + consumed.
- `design-tokens.ts:127-132` — `HERO_PADDING` no longer dead code; `PageTitle.tsx` consumes it.

### Experience Design (4/4 — promoted)
- `ClientProfile.tsx:63-81` — `handleDeleteNote` runs `undoNote.run` with apply (delete) + revert (re-create with note body).
- `QuietHoursPicker.tsx:48-57` — `onSave` runs `undo.run` with apply (set new prefs) + revert (restore previous prefs).
- `UnitsPicker.tsx:38-57` — `setWeight` + `setLength` both run `undo.run`.
- `Profile.tsx:79-94` — `toggleNotif` wrapped (v2 verified, holding).
- `EquipmentEditor.tsx:56-66` — `onSave` wrapped (v2 verified, holding).
- `VacationModeCard.tsx:49-92` — both activate + deactivate wrapped (v2 verified, holding).
- `PauseClientCard.tsx:38-73` — `onSubmitPause` wrapped (v2 verified, holding).
- `AlertDialog` preserved for logout + delete account (`Profile.tsx:737-775`).

---

## Files Audited

- `src/pages/Home.tsx` (475 lines)
- `src/pages/Chat.tsx` (175 lines)
- `src/pages/Profile.tsx` (781 lines)
- `src/pages/WeeklyCheckIn.tsx` (580 lines)
- `src/pages/trainer/ClientProfile.tsx` (813 lines)
- `src/pages/trainer/TrainerProfile.tsx` (399 lines)
- `src/pages/trainer/ExercisePicker.tsx` (183 lines)
- `src/components/home/PausedClientBanner.tsx` (47 lines)
- `src/components/chat/TrainerVacationBanner.tsx` (55 lines)
- `src/components/profile/QuietHoursPicker.tsx` (118 lines)
- `src/components/profile/UnitsPicker.tsx` (125 lines)
- `src/components/trainer/EquipmentEditor.tsx` (126 lines)
- `src/components/trainer/PauseClientCard.tsx` (196 lines)
- `src/components/trainer/VacationModeCard.tsx` (181 lines)
- `src/components/PageTitle.tsx` (47 lines, reference)
- `src/lib/design-tokens.ts` (132 lines, reference)
- `src/contexts/LanguageContext.tsx` (verified keys present at :857-858)

---

## Summary

**19/24 — OVERCLAIMED.** All 8 v2 findings closed; +1 net (ExpDesign 3→4). Undo coverage is now genuinely complete on every audited destructive surface — that earns the 4/4. But 5 pillars stuck at 3/4 because the developer fixed only what v2 named by name. Systemic drift remains: 17 pages skip `<PageTitle>`, `ExercisePicker` filter chips are still hardcoded SR, `Chat.tsx` header has literal "Trainer", `ClientProfile` hero has hardcoded English stat labels (`Goal/Height/Weight/Age`) and 3 different radii within one viewport, `RADIUS` token has zero consumers (dead code, same disease as `HERO_PADDING` was in v2). This is honest incremental improvement, not a 24/24 perfect score. Path to 22/24 (ALMOST): mechanical PageTitle migration + ExercisePicker i18n + ClientProfile stat label i18n. Path to 24/24: also migrate `RADIUS` token, drop ClientProfile hero gradient nesting, swap PauseClientCard bespoke buttons to GradientButton.
