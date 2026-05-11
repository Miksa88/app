# 100% UI Audit — Complete Inventory
**Date:** 2026-05-11
**Project:** fitbyivana (flex-femme-fit-main)
**Auditor:** gsd-ui-auditor (exhaustive mapping pass)

## Stats
- **Total files scanned:** 126 (pages + components, excluding `*.test.tsx` / `*.stories.tsx`)
- **Total violations catalogued:** ~165 unique findings
- **Files with at least one violation:** ~52
- **Files with zero violations (clean):** ~74
- **Hot files (>=10 violations):** 5 — see priority list

---

## By Category

### Category 1 — i18n violations (count: ~58)

Hard-coded English/Serbian literals in JSX text content, `placeholder=`, `aria-label=`, `alt=`, button labels, toast strings, array `label:` fields. The project uses `useLanguage().t()` everywhere else — these are gaps.

| File | Line | Literal | Suggested key |
|------|------|---------|---------------|
| src/pages/trainer/PackageEditor.tsx | 203 | `Tier` (heading) | `packages.tier` |
| src/pages/trainer/PackageEditor.tsx | 240 | `Naziv` | `packages.name` |
| src/pages/trainer/PackageEditor.tsx | 246 | `placeholder="npr. Beginner Self-Serve"` | `packages.namePlaceholder` |
| src/pages/trainer/PackageEditor.tsx | 253 | `Opis` | `packages.description` |
| src/pages/trainer/PackageEditor.tsx | 259 | `placeholder="Kratki pitch za korisnike"` | `packages.descPlaceholder` |
| src/pages/trainer/PackageEditor.tsx | 309-313 | `7 d / 30 d / 3 m / 6 m / 1 g` | `packages.duration.*` |
| src/pages/trainer/PackageEditor.tsx | 340 | `Auto-assignment` | `packages.autoAssignment` |
| src/pages/trainer/PackageEditor.tsx | 345 | `Default workout frequency` | `packages.defaultFreq` |
| src/pages/trainer/PackageEditor.tsx | 359 | `"any"` button | `packages.any` |
| src/pages/trainer/PackageEditor.tsx | 367 | `Target experience` | `packages.targetExperience` |
| src/pages/trainer/PackageEditor.tsx | 381 | `{te}` displays raw `beginner/intermediate/any` | `experience.{te}` |
| src/pages/trainer/PackageEditor.tsx | 392 | `Features` heading | `packages.features` |
| src/pages/trainer/PackageEditor.tsx | 395-401 | All 7 feature labels `Training program / Nutrition plan / ...` | `packages.feat.*` |
| src/pages/trainer/PackageEditor.tsx | 425 | `Sessions/month:` | `packages.sessionsPerMonth` |
| src/pages/trainer/PackageEditor.tsx | 458 | `Archive` button text | `common.archive` |
| src/pages/trainer/PackageEditor.tsx | 449 | `"..."` save state literal | `common.saving` |
| src/pages/trainer/NutritionTemplateEditor.tsx | 440 | `kcal` | `nutrition.kcal` (or token) |
| src/pages/trainer/NutritionTemplateEditor.tsx | 453 | `Min kcal` | `nutrition.minKcal` |
| src/pages/trainer/NutritionTemplateEditor.tsx | 462 | `Max kcal` | `nutrition.maxKcal` |
| src/pages/trainer/TrainerDashboard.tsx | 129 | `Vidi sve` | `common.viewAll` (likely exists) |
| src/pages/trainer/TrainerDashboard.tsx | 148 | `<SectionLabel>Danas</SectionLabel>` | `common.today` |
| src/pages/trainer/TrainerDashboard.tsx | 297 | `<SectionLabel>Upravljanje</SectionLabel>` | `trainerDashboard.management` |
| src/pages/trainer/TrainerProfile.tsx | 288 | `Android ● Live v2.1` | `trainerProfile.androidStatus` |
| src/pages/trainer/ClientProfile.tsx | 540 | `label: 'Metabolic'` | `clients.metabolic` |
| src/pages/trainer/ClientProfile.tsx | 540 | `'None'` fallback | `common.none` |
| src/pages/trainer/ClientProfile.tsx | 541 | `label: 'Sleep'` | `clients.sleep` |
| src/pages/trainer/ClientProfile.tsx | 542 | `label: 'Stress'` | `clients.stress` |
| src/pages/trainer/ClientProfile.tsx | 733 | `>Type<` | `clients.type` |
| src/pages/trainer/ClientProfile.tsx | 745 | `>Status<` | `clients.status` |
| src/pages/trainer/ClientProfile.tsx | 757 | `>Duration<` | `clients.duration` |
| src/pages/trainer/ClientProfile.tsx | 758 | `${client.programTotalWeeks} weeks` | `clients.weeksUnit` |
| src/pages/trainer/MealPicker.tsx | 13-19 | `FILTER_CHIPS` array — `All/Breakfast/Lunch/Dinner/Snack/High Protein/Low GI` | `mealPicker.filter.*` |
| src/pages/trainer/MealPicker.tsx | 141 | `${filteredFoods.length} meals` | `mealPicker.mealsCount` |
| src/pages/trainer/MealPicker.tsx | 180 | `High P` chip | `mealPicker.highProtein` |
| src/pages/trainer/ExerciseDetail.tsx | 150 | `toast({ title: "Not authenticated" })` | `auth.notAuthenticated` |
| src/pages/Food.tsx | 702 | `>Zameni<` | `food.replace` |
| src/pages/PostWorkout.tsx | 246-248 | `label: 'Lako/Taman/Teško'` array | `postWorkout.feedback.*` |
| src/pages/PostWorkout.tsx | 131 | `'Greška pri snimanju'` toast | `postWorkout.saveError` |
| src/pages/PostWorkout.tsx | 258 | `aria-label={...kako je bio trening}` | `postWorkout.aria` |
| src/pages/Progress.tsx | 231-233 | `label: 'Lower' / 'Upper' / 'Full Body'` | `partition.*` |
| src/pages/Progress.tsx | 280 | `'Nema podataka o adaptaciji'` | `progress.noAdaptationData` |
| src/pages/Progress.tsx | 291 | `title: 'Deload nedelja aktivna'` | `progress.deloadActive` |
| src/pages/Progress.tsx | 292 | description literal | `progress.deloadDesc` |
| src/pages/Progress.tsx | 299 | `title: 'Return from Break'` | `progress.returnFromBreak` |
| src/pages/Progress.tsx | 300 | description literal | `progress.returnFromBreakDesc` |
| src/pages/Progress.tsx | 307 | `title: 'Lutealna faza'` | `progress.lutealPhase` |
| src/pages/Progress.tsx | 308 | description literal | `progress.lutealDesc` |
| src/pages/Progress.tsx | 315 | `title: 'Menstrualna faza'` | `progress.menstrualPhase` |
| src/pages/Progress.tsx | 316 | description literal | `progress.menstrualDesc` |
| src/pages/Progress.tsx | 323 | `title: 'Oporavak od bolesti'` | `progress.illnessRecovery` |
| src/pages/Progress.tsx | 324 | description literal | `progress.illnessDesc` |
| src/pages/Home.tsx | 436-438 | `label: 'L' / 'U' / 'FB'` partition badges | `partition.short.*` (acceptable but inventory) |
| src/pages/Home.tsx | 125 | `aria-label={'${unreadCount} novih poruka'}` | `home.unreadAria` |
| src/pages/Home.tsx | 447 | `aria-label={'${partition} particija'}` | `home.partitionAria` |
| src/pages/Gym.tsx | 225-227 | `label: 'L' / 'U' / 'FB'` | same partition keys |
| src/pages/Gym.tsx | 235 | `aria-label={'${partition} particija'}` | `home.partitionAria` |
| src/pages/Chat.tsx | 77 | `alt="Trainer"` on UserAvatar | `chat.trainerAvatarAlt` |
| src/pages/Login.tsx | 99 | `alt="App preview"` | `login.appPreviewAlt` |
| src/pages/WeeklyCheckIn.tsx | 550 | `aria-label="Identity score"` | `weeklyCheckin.identityAria` |
| src/components/ErrorBoundary.tsx | 53 | `>Nešto je krenulo po zlu<` | `errors.somethingWrong` |
| src/components/queue/WeeklyCalendar.tsx | 140 | `aria-label="Sesija pomerena"` | `queue.sessionMovedAria` |
| src/components/queue/WeeklyCalendar.tsx | 156/178/197/214 | Hardcoded SR `Rest (danas) / Danas / Završen / Sledeci` | `queue.aria.*` |
| src/components/queue/WeeklyCalendar.tsx | 159 | `>Rest<` chip | `queue.rest` |
| src/components/queue/QueueStrip.tsx | 121/134/147 | SR aria-labels `Start / Završen / Sledeci ${session.label}` | `queue.aria.*` |
| src/components/queue/FuelingStatusBar.tsx | 92 | `>Fueling status<` | `queue.fuelingStatus` |
| src/components/queue/FuelingStatusBar.tsx | 231 | aria-label literal SR | `queue.fuelingAria` |
| src/components/queue/ClientUserStatusPanel.tsx | 93 | `>UserStatus snapshot<` (debug) | drop or `dev.userStatusSnapshot` |
| src/components/algorithm/AlgorithmStatusBanners.tsx | 170 | `subtitle={'Još ~${stepsToGo} koraka do 10.000 — bolji rezultati bez gladovanja.'}` | `algoBanner.stepsRemaining` |
| src/components/trainer/ClientNutritionPlan.tsx | 75-79 | `MACRO_PRESETS` `label: 'Balanced/High Protein/Low Carb/Keto/Low Fat'` | `nutrition.preset.*` |
| src/hooks/mutations/useLogMeal.ts | 303 | `toast.success("Bez brige.")` | `food.skipMealOk` |
| src/hooks/mutations/useLogMeal.ts | 346 | `toast.success("Sve je u redu.")` | `food.logMealOk` |
| src/pages/trainer/ProgramEditor.tsx | 622 | `?? "No workouts yet — create one first."` (fallback) | already keyed, fine, but remove fallback string |
| src/components/ui/sheet.tsx | 62 | `>Close<` (sr-only) | `common.close` |
| src/components/ui/dialog.tsx | 47 | `>Close<` (sr-only) | `common.close` |
| src/components/ui/breadcrumb.tsx | 77 | `>More<` (sr-only) | `common.more` |

### Category 2 — PageTitle violations (count: 19)

Every `<h1 className="text-large-title …">` outside the canonical `<PageTitle>` component. Spec (Mihajlo 2026-04-23): PageHeader is chrome-only, PageTitle is the single way to render a content `<h1>` with `pt-14`/`pt-2` rules.

| File | Line | Current | Migration |
|------|------|---------|-----------|
| src/pages/MealPlan.tsx | 132 | inline `<h1 className="text-large-title …">` | `<PageTitle title={t("mealPlan.title")} compact />` |
| src/pages/trainer/TrainerDashboard.tsx | 82 | inline `<h1 className="text-large-title …">` | PageTitle |
| src/pages/trainer/TrainerPayments.tsx | 21 | inline h1 | PageTitle |
| src/pages/trainer/TrainerNutrition.tsx | 43 | inline h1 (custom right-action present) | PageTitle + use `subtitle` or compose |
| src/pages/trainer/AssignProgram.tsx | 91 | inline h1 | PageTitle |
| src/pages/trainer/PackageEditor.tsx | 195 | inline h1 (dynamic name) | PageTitle |
| src/pages/trainer/TrainerTraining.tsx | 136 | `motion.h1` w/ text-large-title | PageTitle (already animated) |
| src/pages/trainer/TrainerClients.tsx | 103 | inline h1 | PageTitle |
| src/pages/trainer/TrainerMessages.tsx | 115, 128, 151 | 3 inline h1 across loading/empty/main states | PageTitle |
| src/pages/trainer/TrainerFreeTrial.tsx | 89 | inline h1 | PageTitle |
| src/pages/NotFound.tsx | 27 | `<h1 …text-large-title…>404</h1>` | acceptable error page, but flag (not via PageTitle) |
| src/pages/AnalysisReport.tsx | 169 | inline h1 with `font-bold tracking-tight leading-tight` | bespoke hero — re-evaluate whether PageTitle should expose a `bold` variant |
| src/pages/PostWorkout.tsx | 193 | inline h1 | PageTitle (full-bleed congrats screen — consider variant) |
| src/pages/Shopping.tsx | 128 | inline h1 | PageTitle |
| src/pages/Home.tsx | 105 | inline h1 (greeting layout) | EXEMPT per PageTitle docs (Home greeting) — confirm and document |
| src/pages/Subscription.tsx | 20 | inline h1 with `font-bold mb-1` | PageTitle (with bold variant) |
| src/pages/ActiveWorkout.tsx | 489 | `<span className="text-large-title …">` (timer display) | acceptable (not an h1, decorative) — flag |

**Other `text-large-title` non-h1 uses** (decorative — likely OK but inventory for review): ActiveWorkout.tsx:489 (timer span).

### Category 3 — GradientButton violations (count: ~45)

The `gradient-primary` className appears in 45 sites but `GradientButton`/`Button(variant="cta")` is rarely used as the wrapper. Spec calls for ONE canonical CTA primitive.

| File | Line | Current | Migration |
|------|------|---------|-----------|
| src/pages/trainer/NutritionTemplateEditor.tsx | 687 | full-width gradient `<button>` | `<Button variant="cta" size="xl">` |
| src/pages/trainer/AddClient.tsx | 218 | full-width gradient `<button>` | `<Button variant="cta" size="xl">` |
| src/pages/trainer/WorkoutEditor.tsx | 354 | flex-1 gradient `<button>` | `<Button variant="cta">` |
| src/pages/trainer/ProgramEditor.tsx | 576 | flex-1 gradient `<button>` | `<Button variant="cta">` |
| src/pages/trainer/TrainerPayments.tsx | 33 | inline-flex gradient `<button>` | `<Button variant="cta">` |
| src/pages/trainer/TrainerNutrition.tsx | 63 | gradient `<button>` | `<Button variant="cta">` |
| src/pages/trainer/ExercisePicker.tsx | 182 | full-width gradient `<button>` | `<Button variant="cta">` |
| src/pages/AnalysisReport.tsx | 235 | full-width gradient `<button>` | `<Button variant="cta" size="xl">` |
| src/pages/Food.tsx | 616 | flex-1 gradient `<button>` | `<Button variant="cta">` |
| src/pages/Subscription.tsx | 45 | full-width gradient `<button>` | `<Button variant="cta" size="xl">` |
| src/components/onboarding/PaywallScreen.tsx | 170 | full-width gradient `<button>` | `<Button variant="cta">` or `<GradientButton size="lg">` |
| src/components/ErrorBoundary.tsx | 67 | gradient `<button>` | `<GradientButton>` |
| **Decorative gradient uses (NOT violations — acceptable):** | | | |
| Home.tsx:118, 254 | profile/icon backgrounds | OK |
| MealPlan.tsx:165 | progress fill | OK |
| Onboarding.tsx:226 | progress bar | OK |
| AnalysisReport.tsx:181 | hero stripe | OK |
| Gym.tsx:136, Home.tsx:249 | card top stripe | OK |
| Profile.tsx:572, NutritionTemplate*:282/333/430/549 | check-mark badges | OK |
| **Selected-state chips (subjective):** | | | |
| MealPlan.tsx:274, NutritionTemplate*:599, AddClient:160, ExercisePicker:99, MealPicker:128, PackageEditor:217/322/355/377, ClientProfile:737/749, TrainerClients:125, ExerciseDetail:357, Chat:118/281, Profile:504, PostWorkout:261, WeeklyCalendar:177, QueueStrip:120, FrequencyStep:50, ExperienceStep:57, GoalStep:34, MetabolicStep:55 | These use gradient as `selected` indicator — high count but pattern-consistent. Consider extracting into `<SelectablePill selected>` primitive. |

**Action:** ~12 actual CTA-button violations need migration to `<Button variant="cta">`. The remaining ~33 are either decorative gradients (OK) or selected-state chips (extract into one shared primitive).

### Category 4 — Undo / Destructive-action violations (count: 6)

Destructive `.mutate()` calls that DON'T go through `useUndoableAction` or `AlertDialog`:

| File | Line | Mutation | Risk |
|------|------|----------|------|
| src/pages/Gym.tsx | 78 | `swapMutation.mutate({ clientId })` | Swaps exercise — no confirm, no undo |
| src/pages/Food.tsx | 287 | `replaceMealMutation.mutate(...)` | Replaces meal — irreversible without undo |
| src/pages/Food.tsx | 250 | `skipMealMutation.mutate(...)` | Acceptable (low-stakes), but check for undo |
| src/pages/trainer/ClientProfile.tsx | 68 | `deleteNoteMutation.mutate(note.id, ...)` | DELETE without confirm/undo |
| src/pages/ActiveWorkout.tsx | 247 | `finishWorkout.mutate(...)` | Finishes session — final, confirm advised |
| src/components/trainer/SyncRulesOverrideSection.tsx | 148 | `mutation.mutate(...)` overriding sync rule | sync rule override — needs confirm |

**Good examples (use as templates):**
- PauseClientCard.tsx:48 (uses `useUndoableAction` with revert) ✅
- VacationModeCard.tsx, UnitsPicker.tsx, QuietHoursPicker.tsx, EquipmentEditor.tsx, Profile.tsx:74 all use undo pattern ✅

### Category 5 — Token violations (count: ~30)

#### 5a. Arbitrary `w-[Npx]` / `h-[Npx]` outside IOS_SWITCH (count: ~22)

IOS_SWITCH is the only sanctioned use of `w-[51px]/h-[31px]/w-[27px]/h-[27px]`. Any other arbitrary px-sized class is a token violation.

| File | Line | Class | Note |
|------|------|-------|------|
| src/pages/trainer/NutritionTemplateEditor.tsx | 645 | `w-[42px]` | input width — use `w-12` (48px) or w-10 |
| src/pages/trainer/NutritionTemplateEditor.tsx | 649 | `w-[36px]` | use `w-9` |
| src/pages/trainer/TrainerFreeTrial.tsx | 25, 28 | inline 51/31/27 switch | replace with `IOS_SWITCH.track` / `IOS_SWITCH.thumb` |
| src/pages/trainer/ProgramEditor.tsx | 1004, 1011 | inline 51/31/27 switch | use IOS_SWITCH |
| src/components/onboarding/HeightWeightStep.tsx | 69, 74 | inline 51/31/27 switch | use IOS_SWITCH |
| src/components/food/ExtraMealSheet.tsx | 206, 210 | `w-[44px] h-[26px] / w-[22px] h-[22px]` — non-standard smaller switch | use IOS_SWITCH or document new size |
| src/pages/trainer/PackageEditor.tsx | 413-418 | inline 48/28/24 switch | use IOS_SWITCH |
| src/pages/Home.tsx | 124 | `min-w-[20px]` | replace with `min-w-5` |
| src/pages/Home.tsx | 384 | `w-[72px] h-[72px]` | use `w-18` (Tailwind v4) or `size-18` token |
| src/pages/AnalysisReport.tsx | 181 | `h-[3px]` | OK if HIG hairline; document as token `h-stripe` |
| src/pages/AnalysisReport.tsx | 235 | `h-[56px]` | already minHeight token: use `min-h-14` |
| src/pages/AnalysisReport.tsx | 172 | `max-w-[300px]` | extract to `max-w-prose` or token |
| src/pages/Login.tsx | 96 | `w-[220px] h-[440px]` | hero image — OK but flag for asset |
| src/pages/Onboarding.tsx | 224 | `h-[2px]` | progress hairline — token candidate |
| src/pages/Onboarding.tsx | 241 | `min-w-[36px]` | use `min-w-9` |
| src/pages/Profile.tsx | 453, 461 | `min-w-[32px] min-h-[32px]` | use `size-8` |
| src/pages/Progress.tsx | 182, 206 | `min-w-[60px]` / `min-w-[80px]` | use `min-w-{14/20}` |
| src/components/onboarding/PaywallScreen.tsx | 95 | `w-[3px]` | hairline token |
| src/components/onboarding/PermissionsScreen.tsx | 79 | `max-w-[300px]` | token `max-w-readable` |
| src/components/onboarding/SignUpSheet.tsx | 116 | `max-w-[280px]` | token |
| src/components/onboarding/AllergiesStep.tsx | 51 | `min-h-[80px]` | use `min-h-20` |
| src/components/onboarding/FrequencyStep.tsx | 48 | `rounded-[20px] min-h-[88px]` | use `rounded-2xl min-h-22` |
| src/components/onboarding/GoalStep.tsx | 32 | `rounded-[20px] min-h-[100px]` | use RADIUS.card and `min-h-24` |
| src/components/onboarding/ExperienceStep.tsx | 55 | `rounded-[20px] min-h-[100px]` | same |
| src/components/onboarding/CycleTrackerStep.tsx | 104 | `min-h-[64px]` | use `min-h-16` |
| src/components/onboarding/ProcessingScreen.tsx | 88 | `h-[6px]` | hairline / use `h-1.5` |
| src/components/onboarding/ProcessingScreen.tsx | 138 | `w-[22px] h-[22px]` | use `size-5` (20px) or `size-6` (24px) |
| src/components/onboarding/DateOfBirthStep.tsx | 60 | `max-w-[340px]` | token |
| src/components/onboarding/HeightWeightStep.tsx | 89, 103 | `max-w-[340px]` | token |
| src/components/profile/UnitsPicker.tsx | 111 | `min-w-[52px]` | use `min-w-13` |
| src/components/queue/WeeklyCalendar.tsx | 126 | `min-h-[72px]` | use `min-h-18` |
| src/components/workout/PreWorkoutFatigueDialog.tsx | 102, 118 | `min-h-[120px]` | use `min-h-30` |
| src/components/trainer/TrainerBreadcrumbs.tsx | 42, 51 | `max-w-[140px] / max-w-[120px]` | use `max-w-36 / max-w-30` |
| src/components/trainer/ClientNutritionPlan.tsx | 549, 559 | `min-w-[32px]` | use `min-w-8` |
| src/components/UnsavedChangesDialog.tsx | 27 | `max-w-[320px]` | use `max-w-80` |
| src/components/BottomNav.tsx | 31 | `max-w-[420px] w-[calc(100%-32px)]` | document or extract |
| src/components/TrainerBottomNav.tsx | 35 | same as above | same |
| src/pages/PostWorkout.tsx | 259 | `min-h-[88px]` | use `min-h-22` |
| src/pages/trainer/WorkoutEditor.tsx | 240 | `min-h-[44px]` (acceptable a11y target) | flag for token use |
| src/pages/trainer/ProgramEditor.tsx | 681 | `min-h-[100px]` | use `min-h-25` |
| src/pages/trainer/TrainerDashboard.tsx | 270 | `w-[88px]` | use `w-22` |
| src/pages/trainer/ExerciseDetail.tsx | 240 | `h-[220px]` | use `h-55` or `aspect-[16/9]` |
| src/pages/trainer/ExerciseDetail.tsx | 285 | `h-[200px]` | use `h-50` |
| src/pages/trainer/ClientProfile.tsx | 502 | `min-h-[60px]` | use `min-h-15` |

#### 5b. Inline radius outside RADIUS scale (count: ~15)

`RADIUS = {card: rounded-2xl, pill: rounded-full, chip: rounded-xl, inline: rounded-lg}`. Anything else is a violation.

| File | Line | Class | Migration |
|------|------|-------|-----------|
| src/pages/trainer/TrainerDashboard.tsx | 102 | `rounded-3xl` hero card | should be `rounded-2xl` (RADIUS.card) |
| src/pages/AnalysisReport.tsx | 179 | `rounded-3xl` overflow-hidden card | `rounded-2xl` |
| src/pages/trainer/WorkoutEditor.tsx | 494 | `rounded-md` drag handle | `rounded-lg` (RADIUS.inline) |
| src/pages/trainer/ProgramEditor.tsx | 756 | `rounded-md` drag handle | same |
| src/pages/trainer/MealPicker.tsx | 167, 179 | `rounded-md` chips | `rounded-xl` (RADIUS.chip) — but chips here are mini-pills, consider `rounded-md` if doc'd |
| src/pages/ActiveWorkout.tsx | 640, 668 | `rounded-md` weight/reps inputs | `rounded-lg` |
| src/components/queue/ClientUserStatusPanel.tsx | 264 | `rounded-md` debug chip | `rounded-lg` |
| src/components/ConfettiCelebration.tsx | 57 | `rounded-sm` particles | decorative — OK |
| src/components/skeletons/index.tsx | 30, 67, 155 | 3× `rounded-3xl` skeleton cards | `rounded-2xl` |
| src/components/ui/skeleton.tsx | 4 | `rounded-md` base skeleton | acceptable for shadcn primitive, but flag |
| src/components/ui/dialog.tsx | 45 | `rounded-sm` close button | shadcn primitive — leave as-is |
| src/components/ui/sheet.tsx | 60 | `rounded-sm` close button | same |
| src/components/ui/toggle.tsx | 8 | `rounded-md` toggle base | flag — `rounded-lg`? |
| src/components/ui/button.tsx | 10, 30, 31 | `rounded-md` default/sm/lg | shadcn primitive — leave (CTA uses `rounded-2xl` via `xl` size) |
| src/components/ui/toast.tsx | 70 | `rounded-md` close X | shadcn primitive |
| src/components/ui/tooltip.tsx | 20 | `rounded-md` | shadcn primitive |

#### 5c. Inline `pt-14` outside HERO_PADDING (count: 12)

`HERO_PADDING.standalone = "pt-14"`. Inline `pt-14` is a missed migration.

| File | Line | Current | Migration |
|------|------|---------|-----------|
| src/pages/trainer/TrainerDashboard.tsx | 76 | `px-5 pt-14 pb-4` | `${HERO_PADDING.standalone}` |
| src/pages/trainer/TrainerNutrition.tsx | 41 | `px-5 pt-14 pb-2` | same |
| src/pages/trainer/TrainerTraining.tsx | 135 | same | same |
| src/pages/trainer/TrainerClients.tsx | 101 | same | same |
| src/pages/trainer/TrainerMessages.tsx | 114, 127, 150 | 3 instances | same |
| src/pages/AnalysisReport.tsx | 161 | `px-5 pt-14 pb-6` | same |
| src/pages/ActiveWorkout.tsx | 426 | `px-5 pt-14 pb-3 …` | same |
| src/pages/Food.tsx | 324 | `px-5 pt-14 pb-2` | same |
| src/pages/Onboarding.tsx | 206 | `px-5 pt-14 pb-0` | same |
| src/pages/Home.tsx | 100 | `relative px-5 pt-14 pb-5` | same |
| src/components/onboarding/PaywallScreen.tsx | 58 | `…px-5 pt-14 pb-8` | same |
| src/components/skeletons/index.tsx | 15, 55, 77, 96, 123 | 5 skeleton scaffolds | same |

### Category 6 — Mock data rendered (count: 0)

No hardcoded mock arrays of fake user data found in production render paths. All mocks confined to `*.test.tsx` or guarded by `MOCK_AUTH_ENABLED` env flag in `src/contexts/AuthContext.tsx`. ✅

### Category 7 — `console.*` statements (count: 8)

| File | Line | Statement | Note |
|------|------|-----------|------|
| src/pages/NotFound.tsx | 15 | `console.error("404 Error: …")` | acceptable in error route; consider Sentry |
| src/pages/AnalysisReport.tsx | 65 | `console.warn("[AnalysisReport] Sesija …")` | dev-only telemetry — strip in prod or guard with `import.meta.env.DEV` |
| src/pages/AnalysisReport.tsx | 109 | `console.warn("[Onboarding] Warnings:")` | guard with DEV |
| src/pages/AnalysisReport.tsx | 114 | `console.error("[Onboarding] completeOnboarding failed:")` | route to logger |
| src/contexts/AuthContext.tsx | 87 | `console.warn(...)` | acceptable but flag |
| src/components/ErrorBoundary.tsx | 33 | `console.error("[ErrorBoundary]", error, errorInfo)` | acceptable (boundary) |
| src/components/queue/ClientUserStatusPanel.tsx | 56 | `console.error(...)` | route to logger |
| src/components/trainer/SyncRulesOverrideSection.tsx | 81 | `console.error(...)` | route to logger |
| src/components/trainer/SyncRulesOverrideSection.tsx | 139 | `console.log(...)` | **REMOVE** — appears to be debug log |

### Category 8 — Stale TODO/FIXME markers (count: 5)

All current; none older than ~30 days (IT-25/IT-27 tracker IDs referenced):

| File | Line | Marker | Tracker | Action |
|------|------|--------|---------|--------|
| src/pages/trainer/TrainerPayments.tsx | 8 | `TODO: integracija sa Stripe + payments tabelom u IT-25` | IT-25 | keep, valid |
| src/pages/trainer/ExerciseDetail.tsx | 224 | `TODO Supabase Storage` | no tracker | **add tracker ID** |
| src/pages/trainer/TrainerAnalytics.tsx | 19 | `TODO: dodaj week-over-week aggregaciju … IT-27` | IT-27 | keep |
| src/pages/Profile.tsx | 118 | `TODO: zameniti pravim subscription query … IT-25` | IT-25 | keep |
| src/pages/Subscription.tsx | 8 | `TODO: integrisati sa Stripe / RevenueCat … IT-25` | IT-25 | keep |

### Category 9 — Untranslated alt / aria-labels (count: 13)

Already covered in Category 1 but here as a focused subset:

| File | Line | Type | Literal | Translation |
|------|------|------|---------|-------------|
| src/pages/Chat.tsx | 77 | `alt` | `"Trainer"` | needed |
| src/pages/Login.tsx | 99 | `alt` | `"App preview"` | needed |
| src/pages/WeeklyCheckIn.tsx | 550 | `aria-label` | `"Identity score"` | needed |
| src/components/skeletons/index.tsx | 14/54/76/95/122/150/172 | `aria-label` | `"Loading"` (×7) | needed — `t("common.loading")` |
| src/App.tsx | 61 | `aria-label` | `"Loading"` | needed |
| src/components/ProtectedRoute.tsx | 50 | `aria-label` | `"Loading"` | needed |
| src/components/queue/WeeklyCalendar.tsx | 140 | `aria-label` | `"Sesija pomerena"` SR-only | needed (bilingual) |
| src/components/queue/WeeklyCalendar.tsx | 156/178/197/214 | `aria-label` | mixed SR/EN templates | normalize |
| src/components/queue/QueueStrip.tsx | 121/134/147 | `aria-label` | SR template strings | normalize |
| src/components/queue/FuelingStatusBar.tsx | 231 | `aria-label` | SR sentence | needed |
| src/pages/Home.tsx | 125 | `aria-label` | `${unreadCount} novih poruka` (SR) | needed |
| src/pages/Home.tsx | 447, Gym.tsx:235 | `aria-label` | `${partition} particija` (SR) | needed |
| src/pages/Food.tsx | 494 | `aria-label={selectedMeal.name}` | dynamic — OK |

### Category 10 — shadcn-ui component violations (count: ~12)

Places using raw HTML where shadcn primitives exist.

| File | Line | Raw | Should be |
|------|------|-----|-----------|
| src/pages/trainer/ExercisePicker.tsx | 114 | `<input type="checkbox">` | `<Checkbox>` (note: `@/components/ui/checkbox` was deleted in current branch — needs re-install) |
| src/pages/trainer/AddClient.tsx | 191, 202 | `<select>` raw | `<Select>` from `@/components/ui/select` (DELETED in branch — re-install needed) |
| src/pages/trainer/TrainerProfile.tsx | 333, 342 | `<select>` raw | same |
| src/pages/trainer/PackageEditor.tsx | 291-299 | `<select>` raw (currency) | same |
| src/pages/trainer/PackageEditor.tsx | 242-248 | raw `<input type="text">` | use `<Input>` from `@/components/ui/input` |
| src/pages/trainer/PackageEditor.tsx | 255-261 | raw `<textarea>` | use `<Textarea>` from `@/components/ui/textarea` |
| src/pages/trainer/PackageEditor.tsx | 276-285, 426-435 | raw `<input type="number">` | `<Input type="number">` |
| src/pages/trainer/ClientProfile.tsx | 502 | raw `<textarea>` for notes | `<Textarea>` |
| src/pages/trainer/NutritionTemplateEditor.tsx | 645 | raw `<input>` inline | `<Input>` |
| src/pages/trainer/MealPicker.tsx | 426-435 | raw `<input>` for video calls | `<Input>` |
| **Bigger architectural issue:** | | | shadcn primitives `accordion / alert / avatar / badge / calendar / checkbox / drawer / dropdown-menu / form / popover / progress / radio-group / select / tabs / toggle-group / etc.` all **DELETED** from `src/components/ui/` (per git status). Re-installation needed before raw-HTML migrations can land. |

---

## Per-File Inventory

### Hot files (>= 5 violations)

#### `src/pages/trainer/PackageEditor.tsx` — 20 violations
- Lines 203, 240, 246, 253, 259, 340, 345, 359, 367, 381, 392, 395-401 (7×), 425, 458 — i18n
- Line 195 — PageTitle violation
- Lines 242, 255, 276, 291, 426 — raw HTML form elements (5)
- Lines 296-298 — currency option labels are codes (acceptable but flag)

#### `src/pages/trainer/ClientProfile.tsx` — 9 violations
- Lines 540-542 (3×), 733, 745, 757, 758 — i18n
- Line 68 — destructive `deleteNoteMutation.mutate` without confirm/undo
- Line 502 — raw `<textarea>`

#### `src/pages/Progress.tsx` — 11 violations
- Lines 231-233 (3×), 280, 291-292, 299-300, 307-308, 315-316, 323-324 — i18n
- Lines 182, 206 — arbitrary widths

#### `src/pages/trainer/TrainerMessages.tsx` — 6 violations
- Lines 115, 128, 151 — PageTitle violations (3×)
- Lines 114, 127, 150 — inline `pt-14`

#### `src/components/skeletons/index.tsx` — 14 violations
- Lines 15, 55, 77, 96, 123 — inline `pt-14` (5×)
- Lines 14, 54, 76, 95, 122, 150, 172 — untranslated `"Loading"` aria-labels (7×)
- Lines 30, 67, 155 — `rounded-3xl` (3×)

### Files with 1-4 violations

NutritionTemplateEditor.tsx (5: i18n 440/453/462 + arbitrary widths 645/649)
TrainerDashboard.tsx (4: 76 pt-14, 82 PageTitle, 102 rounded-3xl, 129/148/297 i18n)
TrainerProfile.tsx (3: 288 i18n, 333/342 select raw)
MealPicker.tsx (10: 13-19 i18n, 141 mealsCount, 167/179 rounded-md, 180 chip)
ProgramEditor.tsx (5: 622 fallback string, 681/756/1004/1011 tokens)
WorkoutEditor.tsx (3: 240/494 tokens, 354 CTA migration)
TrainerNutrition.tsx (3: 41 pt-14, 43 PageTitle, 63 CTA)
TrainerTraining.tsx (2: 135 pt-14, 136 PageTitle)
TrainerClients.tsx (2: 101 pt-14, 103 PageTitle)
TrainerPayments.tsx (3: 8 TODO, 21 PageTitle, 33 CTA)
TrainerFreeTrial.tsx (3: 25/28 IOS_SWITCH inline, 89 PageTitle)
AssignProgram.tsx (1: 91 PageTitle)
NotFound.tsx (2: 15 console.error, 27 h1)
AddClient.tsx (3: 160 selected-chip, 191/202 select-raw, 218 CTA)
ExercisePicker.tsx (3: 99 chip, 114 raw checkbox, 182 CTA)
ExerciseDetail.tsx (4: 150 toast literal, 224 stale TODO, 240/285 arbitrary heights)
ActiveWorkout.tsx (3: 247 finishWorkout no-confirm, 426 pt-14, 489 text-large-title span, 640/668 rounded-md)
AnalysisReport.tsx (7: 65/109/114 console, 161 pt-14, 169 h1, 172/181/235 arbitrary)
Food.tsx (4: 250/287 mutate no-undo, 324 pt-14, 616 CTA, 702 i18n)
PostWorkout.tsx (4: 131 toast, 193 h1, 246-248 labels, 258/259 arbitrary)
Subscription.tsx (3: 8 TODO, 20 h1, 45 CTA)
Onboarding.tsx (3: 206 pt-14, 224/241 arbitrary)
Home.tsx (5: 100 pt-14, 105 h1 exempt, 124 min-w, 125 aria SR, 384 w/h, 436-438 labels)
Gym.tsx (3: 78 swapMutation, 225-227 labels, 235 aria SR)
Chat.tsx (1: 77 alt="Trainer")
Login.tsx (2: 96 hero image arbitrary, 99 alt="App preview")
WeeklyCheckIn.tsx (1: 550 aria literal)
Shopping.tsx (1: 128 PageTitle)
MealPlan.tsx (1: 132 PageTitle)
Profile.tsx (4: 118 TODO, 453/461 arbitrary, 504 selected chip)

#### Onboarding components — 11 files, ~15 violations
- AllergiesStep.tsx: 51 arbitrary
- FrequencyStep.tsx: 48 rounded-[20px] + min-h
- GoalStep.tsx: 32 same
- ExperienceStep.tsx: 55 same
- CycleTrackerStep.tsx: 104 min-h
- DateOfBirthStep.tsx: 60 max-w arbitrary
- HeightWeightStep.tsx: 69/74 inline switch, 89/103 max-w
- PaywallScreen.tsx: 58 pt-14, 95 w-[3px], 170 CTA
- PermissionsScreen.tsx: 79 max-w arbitrary
- ProcessingScreen.tsx: 88/138 arbitrary
- SignUpSheet.tsx: 116 max-w arbitrary
- (StressStep, MetabolicStep, SleepStep, LimitationsStep, ScrollWheelPicker, WelcomeScreen — clean)

#### Queue components — 6 files, ~10 violations
- WeeklyCalendar.tsx: 126 min-h, 140/156/178/197/214 aria SR (5×), 159 i18n
- QueueStrip.tsx: 121/134/147 aria SR (3×)
- FuelingStatusBar.tsx: 92 i18n, 231 aria SR
- ClientUserStatusPanel.tsx: 56 console, 93 debug heading, 264 rounded-md
- SyncEventBanner, RedFlagsSection — clean

#### Trainer components — 11 files, ~10 violations
- ClientNutritionPlan.tsx: 75-79 labels en-only, 549/559 arbitrary
- PauseClientCard.tsx — clean (gold-standard undo pattern)
- VacationModeCard.tsx — clean
- EquipmentEditor.tsx — clean
- SyncRulesOverrideSection.tsx: 81 console.error, 139 console.log (debug), 148 mutate no-confirm
- PocetniciAlertsCard.tsx, AutoPilotFeed.tsx, SavedRepliesSheet.tsx, TierPromoteSheet.tsx, TrainerBreadcrumbs.tsx (42/51 arbitrary), ClientWeekIndicator.tsx — mostly clean

---

## Prioritized P0/P1/P2 Action List

### P0 — Blocks 100/100 (must fix)
1. **PageEditor.tsx — 20 unkeyed strings + raw form HTML** (effort: 2-3h)
   - Add `packages.*` translation keys (en/sr), migrate to `<Input>/<Textarea>/<Select>` once shadcn primitives are re-installed.
2. **Migrate 12 inline gradient CTAs to `<Button variant="cta">`** (effort: 1h)
   - Files: NutritionTemplateEditor:687, AddClient:218, WorkoutEditor:354, ProgramEditor:576, TrainerPayments:33, TrainerNutrition:63, ExercisePicker:182, AnalysisReport:235, Food:616, Subscription:45, PaywallScreen:170, ErrorBoundary:67.
3. **PageTitle migration — 16 inline `<h1 className="text-large-title">`** (effort: 1.5h)
   - 12 trainer pages + Shopping + MealPlan + Subscription + AnalysisReport.
4. **Pt-14 hero padding migration — 17 sites** (effort: 30min)
   - Sed replacement of inline `pt-14` → `${HERO_PADDING.standalone}` import.
5. **Re-install deleted shadcn primitives or rewrite UIs that depended on them** (effort: 1h)
   - Per git status: accordion, alert, avatar, badge, calendar, checkbox, drawer, dropdown-menu, form, popover, progress, radio-group, select, tabs, toggle-group, etc. all deleted. AddClient/PackageEditor/TrainerProfile depend on `<select>`/`<input>` raw — would benefit from `<Select>`.

### P1 — Quality (should fix)
6. **Replace inline IOS_SWITCH duplications — 5 files** (effort: 30min)
   - TrainerFreeTrial:25/28, ProgramEditor:1004/1011, HeightWeightStep:69/74, ExtraMealSheet:206/210, PackageEditor:413-418 → use `IOS_SWITCH.track/thumb` constants.
7. **Translate i18n stragglers** (effort: 2h)
   - Progress.tsx (11 strings), Home/Gym aria-labels (4), skeletons "Loading" aria (8), MealPicker FILTER_CHIPS (7), ClientProfile (3 EN labels), TrainerDashboard SectionLabels (2), ClientNutritionPlan MACRO_PRESETS (5), useLogMeal toast (2).
8. **Add undo/confirm to 4 destructive mutations** (effort: 1h)
   - Gym:78 swap, Food:287 replaceMeal, ClientProfile:68 deleteNote, SyncRulesOverrideSection:148.
9. **Replace `rounded-3xl` / `rounded-md` outliers — 13 sites** (effort: 30min)
   - Use `RADIUS.card` / `RADIUS.chip` / `RADIUS.inline`.
10. **Replace arbitrary px sizings with Tailwind scale** (effort: 1.5h)
    - ~25 sites; use `size-*`, `min-w-*`, `max-w-*` from default scale or document new tokens.

### P2 — Hygiene
11. Strip `console.log` at SyncRulesOverrideSection:139 (debug leak).
12. Guard remaining `console.warn`/`console.error` with `import.meta.env.DEV` or route to a logger.
13. Add tracker ID to `ExerciseDetail.tsx:224` TODO.
14. Decide on `<span className="text-large-title">` (ActiveWorkout:489 timer) — either accept as decorative or move to dedicated `text-timer-display` token.
15. Decide on Home greeting h1 (Home.tsx:105) — currently exempt per `PageTitle.tsx` docs; document this exemption in spec.
16. Decorative `gradient-primary` selected-chip pattern (~21 sites): extract to `<SelectableChip selected>` component for DRY.

---

## Files with ZERO violations (clean — replicate these patterns)

**Shared UI primitives (well-designed):**
- src/components/PageTitle.tsx — single source of h1
- src/components/GradientButton.tsx — canonical CTA
- src/components/PageHeader.tsx — chrome only
- src/components/ProtectedRoute.tsx (modulo Loading aria)
- src/components/SkipToContent.tsx
- src/components/PageTransition.tsx
- src/components/PlanInsightCard.tsx
- src/components/LanguageSwitcher.tsx
- src/components/CircularProgress.tsx
- src/components/UnsavedChangesDialog.tsx (one max-w arbitrary, otherwise clean)

**Onboarding (mostly disciplined):**
- WelcomeScreen, StressStep, SleepStep, MetabolicStep, LimitationsStep, ScrollWheelPicker

**Trainer surface (good undo discipline):**
- PauseClientCard.tsx — **template for destructive-action UX**
- VacationModeCard.tsx
- EquipmentEditor.tsx
- AutoPilotFeed.tsx
- SavedRepliesSheet.tsx
- TierPromoteSheet.tsx
- PocetniciAlertsCard.tsx
- ClientWeekIndicator.tsx

**Profile pickers (good undo):**
- UnitsPicker.tsx (modulo one min-w arbitrary)
- QuietHoursPicker.tsx
- TierBadge.tsx

**UI primitives:**
- action-card.tsx, alert-banner.tsx, alert-dialog.tsx, bottom-sheet.tsx, card.tsx, empty-state.tsx, label.tsx, motion-card.tsx, nav-back-button.tsx, nav-plus-button.tsx, nav-search-bar.tsx, privacy-badge.tsx, section-label.tsx, separator.tsx, slider.tsx, stat-card.tsx, switch.tsx, tab-control.tsx, user-avatar.tsx

**Workout / Food / Chat:**
- ExerciseNotesField.tsx, SwapExerciseSheet.tsx, RecipeVideoSheet.tsx, TrainerVacationBanner.tsx, PausedClientBanner.tsx, QuickPauseSheet.tsx

---

## Closing notes

Architectural strength: the project already has `PageTitle`, `GradientButton`/`Button(cta)`, `RADIUS`, `IOS_SWITCH`, `HERO_PADDING`, `MACRO_COLORS`, `STATUS_SOFT`, `useUndoableAction`, `useLanguage` — **all the right primitives exist**. The 100/100 gap is consistent application, not invention.

Top bottleneck: deletions of shadcn primitives (`select`, `checkbox`, etc.) in current branch mean form-heavy trainer pages have regressed to raw HTML. Re-install or commit to the deletion and write replacements before closing i18n / a11y work on those pages.

