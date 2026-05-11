# UI Review v2 — V3 Surfaces (Adversarial Re-Audit)

**Audited:** 2026-05-11 (re-audit)
**Baseline:** Abstract 6-pillar standards + `UPGRADE_PLAN_V3_SECTIONS.md` universal rules (sekcije 1–14)
**Screenshots:** not captured (no dev server detected, code-only audit)
**Auditor stance:** adversarial — assume claims of 24/24 are overstated until code proves the fix.
**Previous score:** 16/24 (Copywriting 2/4, ExpDesign 2/4 blockers).

---

## Pillar Scores

| Pillar | Score | Δ vs prev | Key Finding |
|--------|-------|-----------|-------------|
| 1. Copywriting | 3/4 | +1 | WeeklyCheckIn fully migrated to i18n keys; ClientProfile note actions wired to `common.save/cancel`; section labels `clients.sections.physical/dietary/lifestyle` exist. BUT `FlexFemme Fit` (TrainerProfile:77,272) and `#E91E8C` (:279) remain hardcoded, ExercisePicker `FILTER_CHIPS` array still contains hardcoded SR labels (`Noge`, `Grudi`, `Leđa`, etc) at `:11`, Chat header has hardcoded `"Trainer 💜"` literal at `Chat.tsx:79`. |
| 2. Visuals | 3/4 | 0 | Banner icon containers now matched (both `rounded-xl`), Vacation banner spacing corrected to `mx-5 mb-3`. BUT ClientProfile hero still mixes `rounded-2xl` hero (line :253) with `rounded-xl` sub-pills (:296) and `rounded-lg` activity icons (:456) — three radii within one screen. Token `RADIUS` exists in `design-tokens.ts:99` but `ClientProfile.tsx` never imports it. |
| 3. Color | 3/4 | 0 | Quick Pause card on `Profile.tsx:316` now `bg-warning/10 text-warning` (matches `PausedClientBanner`). Status/tier semantic mapping clean. BUT ClientProfile hero (`:253-343`) still stacks gradient bg + gradient `TierBadge` + white-on-gradient progress bar + nested gradient progress bar at training tab (`:608`) — accent overused in single viewport. |
| 4. Typography | 3/4 | 0 | WeeklyCheckIn now uses `<PageTitle>` (line 258); Profile + TrainerProfile all on canonical type ramp. BUT `Home.tsx:105` STILL renders inline `<h1 className="text-large-title">` instead of `<PageTitle>` — universal rule §1 "Jedan PageTitle po stranici" still violated on the most-trafficked screen. (Other pages: `MealPlan`, `Shopping`, `TrainerDashboard`, `TrainerClients`, `TrainerMessages` etc. also do raw `<h1 className="text-large-title">` — confirms drift is system-wide, not isolated to Home.) |
| 5. Spacing | 3/4 | 0 | `IOS_SWITCH` token added (`design-tokens.ts:117`) and consumed in `Profile.tsx:539,541,609,610`. `HERO_PADDING` token defined (`:127`) but neither `Home.tsx:100` (`pt-14`) nor `TrainerProfile.tsx:114` (`pt-3`) consumes it — token is dead code. `TrainerProfile.tsx:99,102,105` STILL inlines raw `w-[51px] h-[31px]` / `w-[27px] h-[27px]` instead of `IOS_SWITCH` — inconsistent across the codebase. |
| 6. Experience Design | 3/4 | +1 | `useUndoableAction` wired on PauseClientCard, VacationModeCard (both activate + deactivate), EquipmentEditor, Profile notif toggle. BUT critical gaps remain: (a) `ClientProfile.tsx:500` `deleteNoteMutation.mutate(n.id)` still fires on first tap with NO Undo and NO confirm — the original blocker for note delete is unresolved; (b) `QuietHoursPicker.tsx:41` `setMutation.mutate(...)` writes server prefs with NO Undo; (c) `UnitsPicker.tsx:31,36` weight/length toggle commits immediately with NO Undo, NO toast; (d) Chat `send` error swallowed silently (`Chat.tsx:48-53`) — restore-on-failure but no user-visible toast/error indicator. |

**Overall: 18/24**

---

## Verdict: **OVERCLAIMED** (developer claimed 24/24, actual is 18/24)

Net improvement vs previous audit: **+2 points** (Copywriting 2→3, Experience Design 2→3). The two failing pillars from v1 were promoted from blocker to warning. None of the 4 previously-passing pillars improved. None of the 6 pillars reach 4/4.

---

## Top 3 Remaining Issues (Blocker / High Priority)

### 1. **BLOCKER — Note delete still has no Undo and no confirm**
`src/pages/trainer/ClientProfile.tsx:500`
```tsx
onClick={() => deleteNoteMutation.mutate(n.id)}
```
This was called out by name in the v1 Top 5 (Fix #1) and is the most user-impactful unresolved destructive action. V3 §11 verbatim citation: *"why does the number one training software not have an undo button?"*. **Fix:** wrap in `useUndoableAction` with `apply` calling `deleteNoteMutation` and `revert` calling `createClientNote` to restore the note body. Or insert `AlertDialog` confirm first.

### 2. **BLOCKER — QuietHoursPicker + UnitsPicker fire mutations without Undo**
- `src/components/profile/QuietHoursPicker.tsx:41` — quiet hours save committed directly, no undo handle.
- `src/components/profile/UnitsPicker.tsx:31,36` — switching kg↔lb or cm↔in commits instantly; a thumb mis-tap rewrites every weight/length display across the app silently.

Developer fix list claimed undo coverage on these surfaces but neither file imports `useUndoableAction`. **Fix:** mirror the pattern from `VacationModeCard.tsx:30,53` (already implemented correctly there).

### 3. **WARNING — `<PageTitle>` rule still broken on Home + hardcoded brand on TrainerProfile**
- `src/pages/Home.tsx:105` raw `<h1 className="text-large-title text-foreground mt-0.5 tracking-tight">`. The v1 fix listed this explicitly; fix never landed.
- `src/pages/trainer/TrainerProfile.tsx:77,272` `"FlexFemme Fit"` hardcoded; `:279` `#E91E8C` hex rendered as user-visible body text. V3 §12 explicit i18n rule. Developer claimed "moved to i18n" but the grep confirms strings are still inline literals.

Additional WARNING-level deltas (not in Top 3 but evidenced):
- `ExercisePicker.tsx:11` filter chip array `["All", "Noge", "Grudi", "Leđa", "Ramena", "Ruke", "Core", "Kardio"]` is hardcoded SR — EN users see Serbian filter labels.
- `Chat.tsx:79` `<h1>Trainer 💜</h1>` — hardcoded English with emoji rendered without `text-headline` semantic wrap (and `"Trainer"` not from i18n; emoji not from `text-title-3` like flag fix).
- `design-tokens.ts:127` `HERO_PADDING` is defined but not consumed anywhere (dead code; verifies the claim was tokenized-on-paper but not wired-on-screen).
- `TrainerProfile.tsx:99,102,105` still inlines `w-[51px] h-[31px]` / `w-[27px] h-[27px]` instead of `IOS_SWITCH.track/thumb` — same iOS switch metric used twice with two different sources of truth.
- `PauseClientCard.tsx:170` submit button uses bespoke `bg-warning/15 border ...` styling, not `GradientButton`. The cancel-button on the same form (`:155`) is also raw. V3 §2 (primary CTA = GradientButton) is half-applied: resume button at `:114` uses `GradientButton`, submit button does not.

---

## Verified Strengths (per pillar)

### Copywriting
- `WeeklyCheckIn.tsx:380,404,427` — sleep/stress/identity slider labels now via `t('weeklyCheckIn.fields.sleepAvg')` etc.
- `ClientProfile.tsx:486,487,517,541,563` — note save/cancel + Physical/Dietary/Lifestyle section labels through `t('common.save')`, `t('common.cancel')`, `t('clients.sections.physical|dietary|lifestyle')`.

### Visuals
- `PausedClientBanner.tsx:24` and `TrainerVacationBanner.tsx:32` both now use `rounded-xl` icon containers.
- `TrainerVacationBanner.tsx:30` corrected `mx-3 my-2` → `mx-5 mb-3` (aligns to Chat px-5 column).

### Color
- `Profile.tsx:316` Quick Pause card normalized to `bg-warning/10` with `text-warning` (matches `PausedClientBanner.tsx:22`).
- `ClientProfile.tsx:210-213` status pill semantic mapping (trial=primary, active=success, paused=warning, finished=muted) unchanged and clean.

### Typography
- `WeeklyCheckIn.tsx:258` migrated to `<PageTitle title={t('weeklyCheckIn.title')} subtitle={...} compact />`.
- `Profile.tsx:281` uses `<PageTitle title={t('profile.title')} />` correctly.

### Spacing
- `Profile.tsx:539,541,609,610` consume `IOS_SWITCH.track / IOS_SWITCH.thumb` from `design-tokens.ts`.
- Page-level `px-5 + pb-32 + space-y-3/4` rhythm consistent across audited surfaces.

### Experience Design
- `Profile.tsx:79-94` `toggleNotif` properly wrapped in `useUndoableAction` with apply/revert symmetric mutation calls.
- `EquipmentEditor.tsx:56-66` `onSave` uses `useUndoableAction` and stores previous list correctly.
- `VacationModeCard.tsx:49-92` both `onActivate` and `onDeactivate` correctly wrap in `useUndoableAction` with `previousVacation` capture for revert.
- `PauseClientCard.tsx:38-73` `onSubmitPause` wired to `useUndoableAction` with `resumeMutation` as revert path.
- `AlertDialog` for logout + delete account preserved in `Profile.tsx:737-775`.

---

## Files Audited

- `src/pages/Home.tsx` (476 lines)
- `src/pages/Chat.tsx` (175 lines)
- `src/pages/Profile.tsx` (781 lines)
- `src/pages/WeeklyCheckIn.tsx` (580 lines)
- `src/pages/trainer/ClientProfile.tsx` (793 lines)
- `src/pages/trainer/TrainerProfile.tsx` (399 lines)
- `src/pages/trainer/ExercisePicker.tsx` (183 lines)
- `src/components/home/PausedClientBanner.tsx` (47 lines)
- `src/components/chat/TrainerVacationBanner.tsx` (55 lines)
- `src/components/profile/QuietHoursPicker.tsx` (107 lines)
- `src/components/profile/UnitsPicker.tsx` (106 lines)
- `src/components/trainer/EquipmentEditor.tsx` (126 lines)
- `src/components/trainer/PauseClientCard.tsx` (196 lines)
- `src/components/trainer/VacationModeCard.tsx` (181 lines)
- `src/lib/design-tokens.ts` (132 lines)

---

## Summary

**18/24 — OVERCLAIMED.** Real improvement vs v1 is +2 (Copywriting 2→3, ExpDesign 2→3), driven by genuine Undo wiring on 4 of 6 destructive actions (Pause/Vacation/Equipment/Notif) and i18n migration on WeeklyCheckIn + ClientProfile sections. But the developer's claimed 24/24 is not supported by evidence: ClientProfile note delete still no-undo (named in v1 fix #1, unfixed), QuietHoursPicker + UnitsPicker have zero Undo coverage (regression vs claimed fix list), `<PageTitle>` rule still broken on Home, `FlexFemme Fit` + `#E91E8C` still inline strings on TrainerProfile despite being explicitly named in the v1 fix list, `HERO_PADDING` token is dead code, ExercisePicker filter chips hardcoded SR. Net: solid mid-band improvement, not the perfect score claimed.
