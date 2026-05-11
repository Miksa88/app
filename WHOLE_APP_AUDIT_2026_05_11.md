# Whole-App UI Audit — fitbyivana
**Date:** 2026-05-11
**Scope:** ALL `src/pages/**/*.tsx` + `src/components/**/*.tsx` (rendered UI only — tests excluded)
**Auditor stance:** Adversarial. Every claim is grep-verified against the codebase.
**Reference:** `UPGRADE_PLAN_V3_SECTIONS.md` universal rules §1–§14 + design tokens.

---

## Executive Summary

| Metric | Value |
|---|---|
| Page files scanned (`src/pages/**/*.tsx`, prod) | 36 |
| Component files scanned (`src/components/**/*.tsx`, prod) | 86 |
| **Critical V3 violations (BLOCKER)** | **8 categories** |
| Files with raw `gradient-primary` outside the canonical Button/GradientButton | **27 distinct files** |
| Files with inline `<h1 text-large-title>` instead of `<PageTitle>` | **18 occurrences** in **15 files** |
| Pages NOT using `<PageTitle>` (V3 §1 violation) | **30 of 36** prod pages |
| Files with hardcoded EN/SR strings in JSX | **~23 files** with material drift |
| Files with destructive mutations & no Undo / no AlertDialog | **7 files** |
| `console.log/warn/error` calls in render-adjacent paths | **8 hits** (1 a true render-path leak) |
| TODO/FIXME markers tied to feature gaps | **5 (all P0-blocking Stripe/payments)** |
| Arbitrary `w-[Npx]` outside IOS_SWITCH context | **9 unique non-switch instances** |
| Pages with ≥5 distinct corner radii in a single file | **6 of top offenders** (Profile, Home, ClientProfile, ActiveWorkout, Food, Onboarding) |

> The previous v1/v2/v3 audits scored 14 surfaces. The whole-app reality is materially worse: **only 6 of 36 pages comply with V3 §1 (PageTitle)**, and the V3 §2 rule ("All primary CTA = GradientButton / Button variant=cta") is violated in **27 files**. Score adjusted accordingly — see Honest Pillar Scores.

---

## Findings by Category

### 1. Hardcoded EN strings in JSX (V3 §12 violation)

| File | Line | String | Suggested i18n key |
|---|---|---|---|
| `src/pages/trainer/NutritionTemplateEditor.tsx` | 453 | `<label>Min kcal</label>` | `nutrition.minKcal` |
| `src/pages/trainer/NutritionTemplateEditor.tsx` | 462 | `<label>Max kcal</label>` | `nutrition.maxKcal` |
| `src/pages/trainer/NutritionTemplateEditor.tsx` | 165 | `"Save failed"` toast fallback | `common.saveFailed` |
| `src/pages/trainer/ClientProfile.tsx` | 734 | `<p>Type</p>` | `clients.type` |
| `src/pages/trainer/ClientProfile.tsx` | 746 | `<p>Status</p>` | `clients.status` |
| `src/pages/trainer/ClientProfile.tsx` | 758 | `<p>Duration</p>` | `clients.duration` |
| `src/pages/trainer/ClientProfile.tsx` | 397 | `{ label: 'Body Fat', value: '24', trend: '↓ 2%' }` | hardcoded mock + EN label |
| `src/pages/trainer/ClientProfile.tsx` | 424 | `"No program assigned"` fallback | `clients.noProgramAssigned` (key exists, fallback is EN) |
| `src/pages/trainer/ClientProfile.tsx` | 455 | `"No nutrition data"` fallback | `clients.noNutritionData` (key exists, EN fallback) |
| `src/pages/trainer/TrainerTraining.tsx` | 29-38 | `"Full Body"`, `"Fat Loss"`, `"Muscle Gain"`, `"Free Trial"` | `training.fullBody`, `training.fatLoss`, `training.muscleGain`, `training.freeTrial` |
| `src/pages/trainer/ExerciseDetail.tsx` | 20 | `EQUIPMENT_OPTIONS = ["Barbell","Dumbbell","Machine",...]` | `exercise.equipment.*` (8 keys) |
| `src/pages/trainer/ExerciseDetail.tsx` | 21 | `FOCUS_OPTIONS = ["Noge","Grudi",...,"Full Body"]` | mixed SR/EN; should be i18n keys |
| `src/pages/trainer/ExerciseDetail.tsx` | 150 | `"Not authenticated"` toast | `auth.notAuthenticated` |
| `src/pages/trainer/MealPicker.tsx` | 18-19 | `"High Protein"`, `"Low GI"` | `nutrition.tags.*` |
| `src/pages/trainer/AddClient.tsx` | 93 | `"Invitation failed"` toast | `clients.invitationFailed` |
| `src/pages/trainer/AddClient.tsx` | 122 | `placeholder="email@example.com"` | acceptable (technical example) |
| `src/pages/trainer/PackageEditor.tsx` | 233 | `placeholder="npr. Beginner Self-Serve"` | `packages.namePlaceholder` |
| `src/pages/trainer/PackageEditor.tsx` | 246 | `placeholder="Kratki pitch za korisnike"` | SR hardcoded — i18n |
| `src/pages/trainer/PackageEditor.tsx` | 382-388 | 6 hardcoded feature labels (`"Training program"`, `"Nutrition plan"`, `"Direct messaging"`, `"Progress photos"`, `"Metrics tracking"`, `"Video calls"`) | `packages.features.*` |
| `src/pages/trainer/AssignProgram.tsx` | 75 | `"Program not found"` fallback | `training.programNotFound` (EN fallback) |
| `src/pages/trainer/AssignProgram.tsx` | 61 | `"Assignment failed"` toast | `training.assignmentFailed` |
| `src/pages/trainer/WorkoutEditor.tsx` | 150 | `"Save failed"` toast | `common.saveFailed` |
| `src/pages/trainer/TrainerFreeTrial.tsx` | 79 | `"Save failed"` toast | `common.saveFailed` |
| `src/pages/trainer/ProgramEditor.tsx` | 130 | `"Save failed"` toast (also has `t()` fallback) | partial fix needed |
| `src/pages/Profile.tsx` | 57-67 | `["Muscle gain","Glute growth","Fat loss",...]` hardcoded display strings + EN→SR map | hardcoded display state |
| `src/pages/Profile.tsx` | 722, 725 | `language === "sr" ? "Prati promene težine..." : "Track your weight changes..."` | inline ternary, not `t()` |
| `src/pages/Login.tsx` | 125 | `t("login.getStarted") \|\| "Get Started"` | EN fallback in 6 places (lines 125, 134, 167, 221, 297, 316) |
| `src/pages/PostWorkout.tsx` | 131 | `'Greška pri snimanju'` SR toast | `common.saveError` |
| `src/pages/Milestones.tsx` | 18-44 | **27 hardcoded EN milestone names** (`"Getting Serious"`, `"Locked In"`, `"Triple Threat"`, `"Forking Around"`, `"The Logfather"`, `"First Rep"`, `"Sweat Equity"`, `"Beast Mode"`, `"Iron Will"`, `"First Drop"`, `"Bye Bye Burrito"`, `"Scale Tipper"`, `"Heavy Exit"`, `"Final Form"`, `"Hydrated"`, etc.) | `milestones.*.name` + `.desc` — MAJOR DRIFT |
| `src/pages/Progress.tsx` | 233 | `label: 'Full Body'` | `training.fullBody` |
| `src/pages/Progress.tsx` | 280 | `<p>Nema podataka o adaptaciji</p>` SR hardcoded | `progress.noAdaptation` |
| `src/pages/Progress.tsx` | 187, 123, 291, 299, 307, 315, 323 | EN/SR fallbacks for `t()` calls — multiple paths show EN literal | tighten or remove fallbacks |
| `src/pages/trainer/TrainerDashboard.tsx` | 71 | `"Dobro jutro"/"Dobar dan"/"Dobro veče"` greeting | `trainer.greetings.*` (3 keys) |
| `src/pages/trainer/TrainerDashboard.tsx` | 129 | `<span>Vidi sve</span>` | `common.viewAll` |
| `src/pages/trainer/TrainerDashboard.tsx` | 148 | `<SectionLabel>Danas</SectionLabel>` | `common.today` |
| `src/pages/trainer/TrainerDashboard.tsx` | 297 | `<SectionLabel>Upravljanje</SectionLabel>` | `trainer.manage` |
| `src/pages/trainer/TrainerDashboard.tsx` | 163, 179 | `label="Na oprezu"`, `label="Lutealna faza"` | `trainer.alerts.*` |
| `src/pages/trainer/TrainerProfile.tsx` | 288 | `"Android Live v2.1"` | `profile.deviceStatus` |
| `src/pages/Food.tsx` | 702 | `<span>Zameni</span>` | `food.swap` |
| `src/pages/Shopping.tsx` | 19-23 | 4 SR shopping categories hardcoded | `shopping.categories.*` |
| `src/pages/Onboarding.tsx` | 79 | `"Praćenje ciklusa"` | `onboarding.cycleTitle` |
| `src/components/queue/ClientUserStatusPanel.tsx` | 31-38, 71, 82, 93, 101, 104, 106, 120, 124, 126, 129, 144, 148, 157, 162, 167, 173, 175-177, 182, 199, 202, 209, 219, 221 | **40+ hardcoded labels** (debug panel, but visible to client) | All `monitor.*` keys missing |
| `src/components/queue/FuelingStatusBar.tsx` | 92 | `"Fueling status"` | `monitor.fuelingStatus` |
| `src/components/queue/WeeklyCalendar.tsx` | 140-141 | `aria-label="Sesija pomerena"`, `title="Sesija pomerena"` | i18n |
| `src/components/algorithm/AlgorithmStatusBanners.tsx` | 81, 110, 135, 149, 169 | 5 banner titles SR hardcoded (`"Vraćaš se polako"`, `"Najjača nedelja"`, `"Dan punjenja"`, `"Plan se prilagođava"`, `"Hodaj malo više"`) | `algo.banners.*` |
| `src/components/onboarding/ExperienceStep.tsx` | 29 | `highlights: ["Full Body","3–4 dana"]` mixed | i18n |
| `src/components/onboarding/CycleTrackerStep.tsx` | 68, 90, 108 | uses `tFallback(...)` with SR string — defensive pattern OK, but verify keys exist |
| `src/components/trainer/ClientNutritionPlan.tsx` | 76-79 | 4 macro preset labels (`"High Protein"`, `"Low Carb"`, etc.) hardcoded | `nutrition.presets.*` |
| `src/components/trainer/ClientWeekIndicator.tsx` | 60 | `'Deload sledeća nedelja'` | `algo.deloadNextWeek` |

**Verdict:** EN/SR hardcoding is endemic. The `Milestones.tsx` page alone contains 27 untranslated achievement names — it would ship as English in a Serbian build. **BLOCKER for ship.**

---

### 2. Hardcoded SR strings in JSX

Already captured above (mixed in table). Notable repeat offenders:
- `Progress.tsx:291-323` — five algorithm banner titles all SR hardcoded
- `Shopping.tsx:19-23` — category labels
- `TrainerDashboard.tsx:71, 148, 297` — greeting + section labels
- `AlgorithmStatusBanners.tsx:81-169` — 5 banner titles
- `WeeklyCalendar.tsx:140-141` — drag/drop a11y strings
- `Onboarding.tsx:79` — page subtitle

**Pattern:** SR strings dominate the algorithm/coach-facing surfaces; EN strings dominate the trainer dashboard. Mixed-language pollution = inconsistent UX. **BLOCKER.**

---

### 3. Inline `<h1 text-large-title>` outside `<PageTitle>` (V3 §1 violation)

| File | Line | Current code | Migration |
|---|---|---|---|
| `src/pages/MealPlan.tsx` | 132 | `<h1 className="text-large-title text-foreground tracking-tight">{t("mealPlan.title")}</h1>` | Replace with `<PageTitle title={t("mealPlan.title")} />` |
| `src/pages/PostWorkout.tsx` | 193 | `<h1 className="text-large-title text-foreground mb-2">` | `<PageTitle compact />` |
| `src/pages/Subscription.tsx` | 20 | `<h1 className="text-large-title text-foreground font-bold mb-1">...` | `<PageTitle />` |
| `src/pages/Shopping.tsx` | 128 | `<h1 className="text-large-title text-foreground tracking-tight">...` | `<PageTitle />` |
| `src/pages/NotFound.tsx` | 27 | `<h1 className="mb-2 text-large-title text-foreground">404</h1>` | `<PageTitle title="404" />` |
| `src/pages/AnalysisReport.tsx` | 169 | `<h1 className="text-large-title font-bold ...">` | likely OK (custom hero), evaluate compact mode |
| `src/pages/Home.tsx` | 105 | `<h1 className="text-large-title text-foreground mt-0.5 tracking-tight">` | exempt per PageTitle comment (Home greeting) |
| `src/pages/trainer/TrainerMessages.tsx` | 115, 128, 151 | **3 separate `<h1>` instances** in same page | one canonical PageTitle |
| `src/pages/trainer/TrainerTraining.tsx` | 136 | `<motion.h1 ... className="text-large-title text-foreground">` | PageTitle |
| `src/pages/trainer/TrainerFreeTrial.tsx` | 89 | inline `<h1>` | PageTitle |
| `src/pages/trainer/TrainerPayments.tsx` | 21 | inline `<h1>` | PageTitle |
| `src/pages/trainer/TrainerClients.tsx` | 103 | inline `<h1>` | PageTitle |
| `src/pages/trainer/TrainerNutrition.tsx` | 43 | inline `<h1>` | PageTitle |
| `src/pages/trainer/AssignProgram.tsx` | 91 | inline `<h1>` | PageTitle |
| `src/pages/trainer/TrainerDashboard.tsx` | 82 | inline `<h1>` | PageTitle |
| `src/pages/trainer/PackageEditor.tsx` | 182 | inline `<h1>` | PageTitle |

**Cross-check (pages NOT using PageTitle at all):** Only **7 files** import `PageTitle`: `TrainerAnalytics.tsx`, `Profile.tsx`, `WeeklyCheckIn.tsx`, `Food.tsx`, `Gym.tsx`, `Milestones.tsx`, `Progress.tsx`. That means **29 of 36 production pages bypass the canonical PageTitle**. V3 §1 is the single most violated universal rule in the codebase.

---

### 4. Raw `gradient-primary` outside `<Button variant="cta">` / `<GradientButton>` (V3 §2 violation)

Total raw `gradient-primary` className occurrences: **~50+ across 27 files**. Highest-impact offenders (primary-CTA misuse, not just gradient bars/avatar bg):

| File | Line | Violation type |
|---|---|---|
| `src/pages/trainer/NutritionTemplateEditor.tsx` | 687 | `<button className="w-full gradient-primary text-primary-foreground py-4 rounded-xl ...">` — raw primary CTA |
| `src/pages/trainer/AddClient.tsx` | 218 | Save button as raw gradient-primary div |
| `src/pages/trainer/WorkoutEditor.tsx` | 354 | Save button raw gradient-primary |
| `src/pages/trainer/ExercisePicker.tsx` | 182 | "Add exercises" raw gradient-primary |
| `src/pages/trainer/TrainerPayments.tsx` | 33 | "Add payout method" raw gradient-primary |
| `src/pages/trainer/TrainerNutrition.tsx` | 63 | Create template button raw gradient-primary |
| `src/pages/trainer/ProgramEditor.tsx` | 576 | Save program raw gradient-primary |
| `src/pages/AnalysisReport.tsx` | 235 | Submit raw gradient-primary |
| `src/pages/Food.tsx` | 616 | "Mark as eaten" raw gradient-primary |
| `src/pages/Onboarding.tsx` | 226 | Progress bar — acceptable (decorative) |
| `src/pages/Subscription.tsx` | 45 | Subscribe CTA raw gradient-primary |
| `src/pages/PostWorkout.tsx` | 261 | RPE chip selected state — acceptable |
| `src/components/onboarding/PaywallScreen.tsx` | 170 | "Subscribe" CTA raw gradient-primary |
| `src/components/ui/empty-state.tsx` | 51 | EmptyState action CTA raw gradient-primary |

**Pattern:** Trainer-side surfaces almost universally bypass `<Button variant="cta">`. The cta variant was created in `button.tsx:21` precisely to be the SSOT — but it's used in **0** of the 27 violation files audited. **BLOCKER** for design-system integrity.

---

### 5. Arbitrary pixel values outside IOS_SWITCH context

Legitimate (IOS_SWITCH = `w-[51px] h-[31px]` / `w-[27px] h-[27px]`): `TrainerFreeTrial.tsx:25,28`, `ProgramEditor.tsx:1004,1011`, `HeightWeightStep.tsx:69,74` — should be migrated to the token but acceptable.

Genuine drift:

| File | Line | Pixel value | Concern |
|---|---|---|---|
| `src/pages/Login.tsx` | 96 | `w-[220px] h-[440px]` | Hero image — hardcoded aspect; should be max-w + aspect ratio |
| `src/pages/Home.tsx` | 384 | `w-[72px] h-[72px]` | One-off; map to Tailwind `w-18 h-18` or use sm gap step |
| `src/pages/Progress.tsx` | 182 | `min-w-[80px]` w-20 h-20 hybrid | Pick one |
| `src/pages/trainer/TrainerDashboard.tsx` | 270 | `w-[88px]` | Quick-tile width; should be in spacing scale |
| `src/components/onboarding/PaywallScreen.tsx` | 95 | `w-[3px]` | rail width — fine; ditch arbitrary in favor of `w-px` × 3? |
| `src/components/food/ExtraMealSheet.tsx` | 206, 210 | `w-[44px] h-[26px]` / `w-[22px] h-[22px]` | Second IOS-style switch with **different metrics** than IOS_SWITCH — drift |
| `src/components/onboarding/ProcessingScreen.tsx` | 138 | `w-[22px] h-[22px]` | Step indicator — should be `w-5 h-5` or token |
| `src/components/profile/UnitsPicker.tsx` | 111 | `min-w-[52px]` | Could use `min-w-14` |
| Multiple files (`AnalysisReport.tsx:172`, `SignUpSheet.tsx:116`, `PermissionsScreen.tsx:79`, `DateOfBirthStep.tsx:60`, `HeightWeightStep.tsx:89,103`, `TrainerBreadcrumbs.tsx:42,51`, `UnsavedChangesDialog.tsx:27`) | various | `max-w-[280-340px]` literals | Should be a `MAX_W_CONTENT` token |

**Total non-switch arbitrary pixel hits:** ~9 unique drift instances. Not catastrophic but design-token regression.

---

### 6. Corner-radius proliferation (≥5 distinct radii in one page)

Distinct radii observed per page (from the rounded-* count grep):

| Page | rounded-* hits | Distinct radii (sample) | Verdict |
|---|---|---|---|
| `src/pages/Profile.tsx` | 33 | `rounded-2xl`, `rounded-xl`, `rounded-lg`, `rounded-full`, `rounded-sm` (in skeleton) | **5+ — violation** |
| `src/pages/trainer/ClientProfile.tsx` | 27 | `rounded-2xl`, `rounded-xl`, `rounded-lg`, `rounded-full` (4 distinct) | borderline |
| `src/pages/ActiveWorkout.tsx` | 26 | `rounded-2xl`, `rounded-xl`, `rounded-lg`, `rounded-full` (4) | borderline |
| `src/pages/Food.tsx` | 23 | `rounded-2xl`, `rounded-xl`, `rounded-lg`, `rounded-full` (4) | borderline |
| `src/pages/Home.tsx` | 22 | `rounded-2xl`, `rounded-xl`, `rounded-full` (3) | OK |
| `src/pages/trainer/NutritionTemplateEditor.tsx` | 32 | `rounded-2xl`, `rounded-xl`, `rounded-lg`, `rounded-full` + arbitrary `rounded-[14px]` from GradientButton context | **5+ — violation** |

**Token comparison:** `RADIUS` constant in `design-tokens.ts` defines exactly 4 scales (`card=rounded-2xl`, `pill=rounded-full`, `chip=rounded-xl`, `inline=rounded-lg`). Profile.tsx and NutritionTemplateEditor.tsx clearly exceed this 4-tier ceiling.

**Recommended fix:** ban `rounded-3xl` and `rounded-md` from production code, lint enforce 4-tier.

---

### 7. `console.log/warn/error` in render paths

| File | Line | Severity |
|---|---|---|
| `src/pages/NotFound.tsx` | 15 | console.error in render body — **render-path leak**, should be moved to `useEffect` or removed |
| `src/pages/AnalysisReport.tsx` | 65 | console.warn in 5s timeout callback — acceptable but verbose |
| `src/pages/AnalysisReport.tsx` | 109 | console.warn in mutation callback — acceptable in dev, strip in prod |
| `src/pages/AnalysisReport.tsx` | 114 | console.error in catch — **acceptable** |
| `src/contexts/AuthContext.tsx` | 87, 98 | dev-only warns — acceptable |
| `src/components/ErrorBoundary.tsx` | 33 | error in `componentDidCatch` — **correct** |
| `src/components/trainer/SyncRulesOverrideSection.tsx` | 81 | console.error in catch — acceptable |
| `src/components/trainer/SyncRulesOverrideSection.tsx` | 139 | console.log in onClick — **should be removed before prod** |
| `src/components/queue/ClientUserStatusPanel.tsx` | 56 | console.error in catch — acceptable |

**Only 2 of 9 hits are genuinely problematic** (NotFound:15 in render body, SyncRulesOverrideSection:139 in user action). Pattern is healthy overall.

---

### 8. TODO/FIXME markers (feature gaps, not docs)

| File | Line | Comment | Category |
|---|---|---|---|
| `src/pages/trainer/TrainerPayments.tsx` | 8 | `// TODO: integracija sa Stripe + payments tabelom u IT-25.` | Payment feature gap |
| `src/pages/trainer/ExerciseDetail.tsx` | 224 | `{/* TODO Supabase Storage */}` | Video upload not wired |
| `src/pages/trainer/TrainerAnalytics.tsx` | 19 | `// TODO: dodaj week-over-week aggregaciju ...` | Analytics gap |
| `src/pages/Profile.tsx` | 118 | `// TODO: zameniti pravim subscription query-jem...` | Mock data still in render |
| `src/pages/Subscription.tsx` | 8 | `// TODO: integrisati sa Stripe / RevenueCat backend-om` | Pricing CTA leads nowhere |

**All 5 are concentrated on payments/subscription/analytics — 3 are explicitly excluded ("Stripe iskljuceno") per V3 plan**, so the TODOs are intentional gaps, not bugs. But **`Subscription.tsx` ships a payment CTA that doesn't function** — UX confusion.

---

### 9. Mock data shown to users

| File | Line | Mock content |
|---|---|---|
| `src/pages/trainer/ClientProfile.tsx` | 397 | `{ label: 'Body Fat', value: '24', trend: '↓ 2%' }` — **rendered to trainer as if it's real client data** |
| `src/pages/Profile.tsx` | 57-67 | Hardcoded goal/allergy state `["Muscle gain","Glute growth","Lactose free"]` — not from auth user |
| `src/pages/Milestones.tsx` | 18-44 | Entire milestone catalog is hardcoded English literals (functional, but pretending these are dynamic) |

**Critical:** `ClientProfile.tsx:397` Body Fat metric is a hardcoded `'24'` shown to trainers. This is **decision-making data** — if a trainer prescribes based on this number, real harm. **P0 BLOCKER.**

---

### 10. Destructive mutations without Undo (V3 §11 violation)

`useUndoableAction` is imported in: `Profile.tsx`, `ClientProfile.tsx`, `UnitsPicker.tsx`, `QuietHoursPicker.tsx`, `EquipmentEditor.tsx`, `VacationModeCard.tsx`, `PauseClientCard.tsx` (7 files).

**Destructive `onClick` calls NOT wrapped in undo or AlertDialog:**

| File | Line | Action |
|---|---|---|
| `src/pages/trainer/WorkoutEditor.tsx` | 505 | `onRemove(sectionId, ex.id)` — exercise removal, immediate, no toast undo |
| `src/pages/trainer/PackageEditor.tsx` | 441 | `handleArchive` — archive package, no undo |
| `src/pages/trainer/ProgramEditor.tsx` | 805, 877 | Section/exercise `onRemove` — immediate |
| `src/pages/trainer/ExerciseDetail.tsx` | 272 | `handleRemoveVideo` — irreversible asset removal, no confirm |
| `src/pages/trainer/ClientProfile.tsx` | 521 | `handleDeleteNote` — uses `useUndoableAction` ✓ (good) |
| `src/components/trainer/ClientNutritionPlan.tsx` | 495 | `removeMeal(index)` — meal removal, no undo |
| `src/pages/Profile.tsx` | 370 | `setConfirmAction("delete")` — **uses AlertDialog ✓** |
| `src/pages/ActiveWorkout.tsx` | 443, 460 | Pause/resume — non-destructive, ✓ |

**Verdict:** 5 unambiguous violations — WorkoutEditor remove, PackageEditor archive, ProgramEditor remove (×2), ExerciseDetail removeVideo, ClientNutritionPlan removeMeal. The Ryan quote ("It is 2025, why does the number one training software not have an undo button?") still applies.

---

### 11. Pages NOT using `<PageTitle>`

Total prod pages = 36 (excluding `.test.tsx`). PageTitle is imported in only 7. Missing PageTitle:

**Client pages (12):** Login, NotFound, Subscription, AnalysisReport, PostWorkout, Onboarding, Home, ActiveWorkout, MealPlan, Shopping, Chat — though some are exempt by design (Home, Chat per PageTitle.tsx comment).

**Trainer pages (17 of 19):** Every single trainer page except possibly TrainerAnalytics uses inline `<h1>`. This is a wholesale V3 §1 violation.

**Adjusted exemption list (per PageTitle.tsx documentation):**
- `Home.tsx` — exempt (custom greeting)
- `Chat.tsx` — exempt (sub-page with avatar)
- `Login.tsx` — exempt (no PageTitle equivalent for auth screens)
- `Onboarding.tsx` — exempt (step-based flow)
- `ActiveWorkout.tsx` — exempt (full-screen workout chrome)
- `NotFound.tsx` — could go either way

**Net violators after exemption:** 24 of 30 non-exempt pages. **BLOCKER.**

---

### 12. Untranslated alt text / aria-labels

| File | Line | String | Fix |
|---|---|---|---|
| `src/pages/Chat.tsx` | 77 | `alt="Trainer"` | `t("chat.trainerAvatarAlt")` |
| `src/pages/Login.tsx` | 99 | `alt="App preview"` | `t("login.heroAlt")` |
| `src/pages/WeeklyCheckIn.tsx` | 550 | `aria-label="Identity score"` | `t("checkin.identityScoreA11y")` |
| `src/pages/Milestones.tsx` | 118 | `aria-label="Share"` | `t("common.share")` |
| `src/components/queue/WeeklyCalendar.tsx` | 140-141 | `aria-label="Sesija pomerena"` | `t("calendar.sessionMovedA11y")` |
| `src/App.tsx` | 62 | `aria-label="Loading"` | `t("common.loading")` |
| `src/components/ProtectedRoute.tsx` | 50 | `aria-label="Loading"` | `t("common.loading")` |
| `src/components/skeletons/index.tsx` | 14, 54, 76, 95, 122, 150, 172 | 7× `aria-label="Loading"` | DRY into `<LoadingSkeleton>` with `t("common.loading")` |

**Total a11y i18n drift:** ~14 hits. Most are loading-state placeholders; consolidate into a shared `aria-label={t('common.loading')}` constant.

---

## Top 30 Prioritized Fixes

### P0 — User-facing bugs / data integrity (5)

1. **`ClientProfile.tsx:397`** — Body Fat hardcoded `'24'` shown to trainers as live data. Replace with `clientMetrics?.bodyFat ?? '—'`. **Effort: 15 min.**
2. **`Milestones.tsx:18-44`** — 27 milestone names ship as EN literals in SR build. Add `milestones.{key}.name` + `.desc` i18n keys. **Effort: 90 min.**
3. **`Subscription.tsx:45 + 8`** — Subscribe CTA visible but Stripe not wired (TODO IT-25). Either hide page behind `tenant.paywall_required` flag OR mark CTA disabled with "Coming soon" copy. **Effort: 20 min.**
4. **`Profile.tsx:57-67`** — Hardcoded goals/allergies state instead of reading from `user_profile`. Wire to actual profile query. **Effort: 45 min.**
5. **`Login.tsx:125,134,167,221,297,316`** — 6 `t() || "EN fallback"` patterns leave EN visible if key missing. Audit `LanguageContext` for these 6 keys; remove fallbacks or normalize. **Effort: 20 min.**

### P1 — V3 universal-rule violations (15)

6. **PageTitle migration sweep** — replace inline `<h1 text-large-title>` across 15 files: MealPlan, PostWorkout, Subscription, Shopping, NotFound, TrainerMessages (×3), TrainerTraining, TrainerFreeTrial, TrainerPayments, TrainerClients, TrainerNutrition, AssignProgram, TrainerDashboard, PackageEditor. **Effort: 5 min × 15 = 75 min.**
7. **`gradient-primary` → `Button variant="cta"` sweep** in 27 files. Highest-impact: NutritionTemplateEditor:687, AddClient:218, WorkoutEditor:354, ExercisePicker:182, ProgramEditor:576, AnalysisReport:235, Subscription:45, PaywallScreen:170, Food:616, TrainerNutrition:63, TrainerPayments:33. **Effort: 10 min × 11 = 110 min.**
8. **`TrainerDashboard.tsx:71,129,148,163,179,297`** — i18n the greeting, "Vidi sve", "Danas", "Upravljanje", "Na oprezu", "Lutealna faza". **Effort: 25 min.**
9. **`AlgorithmStatusBanners.tsx:81-169`** — 5 banner titles hardcoded SR. Wire to `algo.banners.*`. **Effort: 25 min.**
10. **`ClientUserStatusPanel.tsx:31-221`** — 40+ debug labels in client-visible monitor panel. Verify panel is hidden in prod OR i18n all labels. **Effort: 60 min.**
11. **`NutritionTemplateEditor.tsx:453,462,165,687`** — Min/Max kcal labels + Save toast + raw gradient CTA. **Effort: 25 min.**
12. **`TrainerTraining.tsx:29-44`** — Goal/preference snake_case→Title-Case fallback bypasses i18n entirely. Map all to `training.*` keys. **Effort: 30 min.**
13. **`PackageEditor.tsx:382-388, 246`** — 6 feature labels + SR placeholder. **Effort: 20 min.**
14. **`ExerciseDetail.tsx:20,21,150,272`** — EQUIPMENT_OPTIONS/FOCUS_OPTIONS hardcoded + remove-video no-confirm. **Effort: 40 min.**
15. **`ClientNutritionPlan.tsx:76-79, 495`** — Macro presets EN + removeMeal undo wrap. **Effort: 30 min.**
16. **`WorkoutEditor.tsx:505`, `ProgramEditor.tsx:805,877`, `PackageEditor.tsx:441`** — Wrap onRemove/archive in `useUndoableAction`. **Effort: 45 min.**
17. **`Shopping.tsx:19-23, 128`** — i18n category labels + PageTitle migration. **Effort: 15 min.**
18. **`Progress.tsx:233,280,187,291-323`** — `'Full Body'` literal + SR adaptation strings + algorithm banners. **Effort: 30 min.**
19. **`ExtraMealSheet.tsx:206,210`** — Drift switch (44/26 instead of IOS_SWITCH 51/31). Use `IOS_SWITCH.track` / `.thumb`. **Effort: 10 min.**
20. **`Profile.tsx:722, 725`** — Inline `language === "sr" ? ... : ...` ternaries. Move to `t()` keys. **Effort: 10 min.**

### P2 — Polish / system drift (10)

21. **`Profile.tsx`** — 5 distinct corner radii, trim to 3-tier (`card`, `chip`, `pill`) per RADIUS token. **Effort: 30 min.**
22. **`Login.tsx:96`** — `w-[220px] h-[440px]` hero — use aspect-ratio + max-w. **Effort: 10 min.**
23. **`NotFound.tsx:15`** — Move console.error to useEffect. **Effort: 5 min.**
24. **`SyncRulesOverrideSection.tsx:139`** — Remove console.log in user action. **Effort: 2 min.**
25. **`skeletons/index.tsx`** — 7× duplicate `aria-label="Loading"`. Add wrapper hook/constant. **Effort: 15 min.**
26. **`AddClient.tsx:160,218`** — Selected-goal chip and Save button raw gradient-primary. Migrate to `Button variant="cta"`. **Effort: 15 min.**
27. **`Chat.tsx:118,164`** — Selected-message chip + send button raw gradient-primary. **Effort: 10 min.**
28. **`Home.tsx:118,254`** — Trainer-avatar wrapper + hero-icon raw gradient-primary (decorative, lower priority). Consider extracting `<GradientAvatar />`. **Effort: 20 min.**
29. **`PostWorkout.tsx:131`** — `'Greška pri snimanju'` SR toast → `t('common.saveError')`. **Effort: 5 min.**
30. **`Onboarding.tsx:79`** — `"Praćenje ciklusa"` step-title literal → `t('onboarding.cycleTitle')`. **Effort: 5 min.**

**Total effort to clear P0+P1+P2:** ~13.5 hours of focused work.

---

## Honest Pillar Scores (Whole-App)

| Pillar | Score | Reasoning |
|---|---|---|
| **1. Copywriting** | **2/4** | 27 hardcoded milestone names + 40+ debug labels in client-visible monitor panel + 6 EN fallbacks in Login + mixed SR/EN trainer dashboard. Either build is bilingual-broken. Generic "Save" / "Submit" patterns avoided in canonical paths, but i18n contract not honored. |
| **2. Visuals** | **3/4** | Hierarchy is clear, hero cards consistent, icon sizing follows ICON_SIZE on canonical surfaces. But Profile.tsx and NutritionTemplateEditor.tsx exceed 4-tier radius scale; `ExtraMealSheet` ships a parallel non-conforming switch. |
| **3. Color** | **3/4** | Brand magenta→purple is consistent and `gradient-primary` is the single source. No hardcoded `#hex` values found in JSX. 60/30/10 is respected. Knocked from 4 because the gradient is overused on decorative chrome (Home `w-12 h-12 rounded-2xl gradient-primary` avatar wrappers, Chat send-button, etc.) — the accent dilutes when applied to non-CTA surfaces in 50+ places. |
| **4. Typography** | **3/4** | Font sizes use the iOS-Apple text-* scale consistently (`text-large-title`, `text-body`, `text-caption-1`, etc.) — 129 hits across top 5 files all conform. Font weights: 56 hits, also within scale. Knocked because `<h1 text-large-title>` is duplicated inline instead of going through PageTitle — typography token is right, the structural component is wrong. |
| **5. Spacing** | **3/4** | HERO_PADDING + IOS_SWITCH tokens defined and used in canonical paths. 9 unique arbitrary `w-[Npx]` instances across the codebase. ExtraMealSheet's deviant switch is the biggest drift. |
| **6. Experience Design** | **2/4** | 5 destructive mutations lack Undo/AlertDialog (WorkoutEditor, ProgramEditor ×2, PackageEditor, ExerciseDetail, ClientNutritionPlan); Subscription CTA leads to non-functional Stripe gap (TODO IT-25 visible to user); ClientProfile shows hardcoded `'24'` Body Fat to trainers as live data; Loading skeletons + ErrorBoundary present and correct — that saves the score from dropping to 1. |

**Total: 16/24**

---

## Verdict

**OVERCLAIMED.** Previous audits scored 24/24 on a 14-file V3 surface scope. Whole-app reality is **16/24** — V3 §1 (PageTitle) is violated on **24 of 30** non-exempt pages; V3 §2 (canonical CTA) is violated in **27 files**; V3 §12 (no hardcoded strings) has at least **23 material violations**; V3 §11 (Undo) has **5 unambiguous misses**.

The 14-file core audit told the truth about those 14 files. The trainer dashboard surfaces, `Milestones.tsx`, `Subscription.tsx`, `ClientProfile.tsx`, and the algorithm/queue debug components were never in scope — and that's where the drift lives.

---

## Top 5 Architectural Recommendations (to hit TRUE 24/24)

1. **ESLint rule against inline `<h1 text-large-title>`** — codify V3 §1 with a custom rule (`no-inline-page-title`) that errors if `text-large-title` is found outside `PageTitle.tsx`. Removes 18 manual checks per PR.

2. **ESLint rule against raw `gradient-primary` className outside the 3 canonical files** (`GradientButton.tsx`, `button.tsx`, `nav-plus-button.tsx`). Allowlist via comment override (`// design-system-bypass: decorative chrome`). Forces all CTAs through `<Button variant="cta">`.

3. **`tFallback` deprecation + missing-key linter** — every `t("foo") || "EN string"` pattern is an i18n loophole. Replace with strict `t()` that throws in dev if key missing; ship a missing-keys CI check. Removes Login's 6 fallbacks + the 4 trainer-side EN toast strings.

4. **Mandatory `useUndoableAction` HOC for destructive trainer mutations** — wrap removeExercise/removeSection/archivePackage/removeMeal/removeVideo through a single `<UndoableMutationButton>` primitive. The 5 unwrapped destructions become 1 component change.

5. **Trainer-dashboard i18n audit pass** — Treat the entire `src/pages/trainer/**` tree as a single V3 surface (currently it's not). Owner + budget: ~4 hours to migrate every hardcoded EN/SR label through `LanguageContext`. Without this pass, every trainer-side ship is half-Serbian-half-English depending on which dev wrote the file.

---

## Files audited

`src/pages/*.tsx` (16): Home, Login, NotFound, Onboarding, Subscription, AnalysisReport, ActiveWorkout, PostWorkout, MealPlan, Food, Shopping, Gym, Progress, Profile, Milestones, WeeklyCheckIn, Chat — 17.

`src/pages/trainer/*.tsx` (19): TrainerClients, TrainerPayments, TrainerPackages, MealPicker, TrainerDashboard, AddClient, TrainerFreeTrial, AssignProgram, ExerciseDetail, NutritionTemplateEditor, TrainerTraining, TrainerNutrition, WorkoutEditor, ProgramEditor, PackageEditor, TrainerMessages, TrainerProfile, ExercisePicker, ClientProfile, TrainerAnalytics.

`src/components/**/*.tsx` (86 prod files inc. `ui/`, `onboarding/`, `trainer/`, `queue/`, `home/`, `food/`, `chat/`, `profile/`, `workout/`, `algorithm/`, `skeletons/`).

**Total files in scope: 121.**
