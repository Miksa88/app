# Screen catalog — 2026-04-26

Captured via Playwright in `test-results/screenshots/`. Phase 1 = capture only,
no design analysis.

Total screens captured: **50**

Legend:
- Screenshots are full-page PNGs from Chromium @ Desktop Chrome viewport.
- "—" in screenshot column = not captured (modal/overlay, see Modals section).
- Source specs:
  - `tests/e2e/render.spec.ts` (existing, 22 baseline routes)
  - `tests/e2e/onboarding-walk.spec.ts` (TEMP, 18 onboarding states)
  - `tests/e2e/trainer-editors-walk.spec.ts` (TEMP, 8 editor/picker routes)

---

## Public routes (landing + onboarding)

| #  | Route                        | Screenshot                                  | 1-line summary |
|----|------------------------------|---------------------------------------------|----------------|
| 00 | /                            | 00-landing.png                              | Landing — hero + Get Started + Sign In CTA |
| 01 | /onboarding (initial)        | 21-onboarding-quiz.png                      | Onboarding entry (step 0 fresh, no fill) |

### Onboarding flow — 12 steps + 4 phases (phases 14–18 not reached)

Walk-through screens (each step captured BEFORE clicking Continue, plus
filled state where data fill is required):

| #  | Route + step                                                        | Screenshot                                          | 1-line summary |
|----|---------------------------------------------------------------------|-----------------------------------------------------|----------------|
| 02 | /onboarding step 0 (Name)                                           | onboarding-step-00-name.png                         | First/last name inputs (empty) |
| 03 | /onboarding step 0 (Name) — filled                                  | onboarding-step-00-name-filled.png                  | Name inputs after typing "Test User" |
| 04 | /onboarding step 1 (DOB)                                            | onboarding-step-01-dob.png                          | 3-column scroll wheel: month / day / year |
| 05 | /onboarding step 1 (DOB) — filled                                   | onboarding-step-01-dob-filled.png                   | DOB after selecting year ~1996 |
| 06 | /onboarding step 2 (Height & Weight)                                | onboarding-step-02-height-weight.png                | Imperial/Metric toggle + height/weight wheels |
| 07 | /onboarding step 2 (Height & Weight) — filled                       | onboarding-step-02-height-weight-filled.png         | Height 170 cm + weight 65 kg selected |
| 08 | /onboarding step 3 (Goal)                                           | onboarding-step-03-goal.png                         | 3 goal cards: fat loss / figure / health |
| 09 | /onboarding step 3 (Goal) — selected                                | onboarding-step-03-goal-selected.png                | First goal selected (gradient highlight) |
| 10 | /onboarding step 4 (Metabolic — optional)                           | onboarding-step-04-metabolic.png                    | Metabolic profile multi-select tags |
| 11 | /onboarding step 5 (Allergies — optional)                           | onboarding-step-05-allergies.png                    | Food allergies multi-select tags |
| 12 | /onboarding step 6 (Limitations — required, "no pain" default)      | onboarding-step-06-limitations.png                  | Pain area chips with emoji icons |
| 13 | /onboarding step 7 (Sleep — optional)                               | onboarding-step-07-sleep.png                        | Sleep quality 5-star rating |
| 14 | /onboarding step 8 (Stress — optional)                              | onboarding-step-08-stress.png                       | Stress level slider/scale |
| 15 | /onboarding step 9 (Experience)                                     | onboarding-step-09-experience.png                   | 2 cards: beginner / intermediate |
| 16 | /onboarding step 9 (Experience) — selected                          | onboarding-step-09-experience-selected.png          | Beginner card selected |
| 17 | /onboarding step 10 (Frequency)                                     | onboarding-step-10-frequency.png                    | Days/week cards (3/4 for beginner branch) |
| 18 | /onboarding step 10 (Frequency) — selected                          | onboarding-step-10-frequency-selected.png           | First frequency option selected |
| 19 | /onboarding step 11 (Cycle Tracker — last, optional)                | onboarding-step-11-cycle.png                        | Activate Cycle Tracker prompt + skip footer |
| 20 | /onboarding phase=processing                                        | onboarding-phase-12-processing.png                  | Loading/analysis screen post-quiz |
| 21 | /onboarding phase=signup                                            | onboarding-phase-13-signup.png                      | SignUpSheet — Apple/Google/Email buttons |

**Not captured (would require real signup):**
- /onboarding phase=paywall — PaywallScreen
- /onboarding phase=permissions — PermissionsScreen
- /onboarding phase=welcome — WelcomeScreen
- /analysis — AnalysisReport (post-signup transition target)
- /login — login sheet on landing (overlay; see Modals)

---

## Client routes (5 main tabs + sub-pages)

| #  | Route               | Screenshot                  | 1-line summary |
|----|---------------------|-----------------------------|----------------|
| 22 | /home               | 01-home.png                 | Home tab — daily check-in, today schedule, milestones |
| 23 | /gym                | 02-gym.png                  | Gym tab — today's workout + program overview |
| 24 | /food               | 03-food.png                 | Food tab — meals, calories, water widget |
| 25 | /progress           | 04-progress.png             | Progress tab — weekly trendlines + charts |
| 26 | /milestones         | 05-milestones.png           | Milestones tab — achievements + streaks |
| 27 | /profile            | 06-profile.png              | Profile — settings, language, logout |
| 28 | /chat               | 07-chat.png                 | Chat — trainer ↔ client messaging |
| 29 | /weekly-check-in    | 08-weekly-check-in.png      | Weekly check-in form (energy/mood/sleep) |
| 30 | /subscription       | 09-subscription.png         | Subscription / billing screen |

**Routes not captured (require setup or destination flows):**
- /active-workout — ActiveWorkout (requires active program assignment)
- /post-workout — PostWorkout (requires completed workout)
- /analysis — AnalysisReport (post-onboarding only)

---

## Trainer routes (10 main + 7 editors/pickers)

### Main trainer tabs

| #  | Route                                | Screenshot                                  | 1-line summary |
|----|--------------------------------------|---------------------------------------------|----------------|
| 31 | /trainer                             | 10-trainer-dashboard.png                    | Trainer dashboard — KPIs + quick actions |
| 32 | /trainer/clients                     | 11-trainer-clients.png                      | Client list with status pills |
| 33 | /trainer/client/:id                  | 19-trainer-client-detail.png                | Client profile — tabs (overview/training/nutrition/settings) |
| 34 | /trainer/training                    | 12-trainer-training.png                     | Training programs library |
| 35 | /trainer/nutrition                   | 13-trainer-nutrition.png                    | Nutrition templates library |
| 36 | /trainer/messages                    | 14-trainer-messages.png                     | Trainer messages inbox |
| 37 | /trainer/analytics                   | 15-trainer-analytics.png                    | Trainer analytics — adherence + revenue |
| 38 | /trainer/payments                    | 16-trainer-payments.png                     | Trainer payments overview |
| 39 | /trainer/packages                    | 18-trainer-packages.png                     | Package list (subscription tiers) |
| 40 | /trainer/profile                     | 17-trainer-profile.png                      | Trainer profile + settings |
| 41 | /trainer/free-trial                  | 20-trainer-free-trial.png                   | Free trial settings/clients |

### Editors + pickers

| #  | Route                                          | Screenshot                                                | 1-line summary |
|----|------------------------------------------------|-----------------------------------------------------------|----------------|
| 42 | /trainer/program/new                           | trainer-editor-01-program-new.png                         | Program editor — blank canvas |
| 43 | /trainer/workout/new                           | trainer-editor-02-workout-new.png                         | Workout editor — exercises + sets |
| 44 | /trainer/exercise/new                          | trainer-editor-03-exercise-new.png                        | Exercise detail/editor — name, video, cues |
| 45 | /trainer/package/new                           | trainer-editor-04-package-new.png                         | Package editor — pricing + features |
| 46 | /trainer/nutrition-template/new                | trainer-editor-05-nutrition-template-new.png              | Nutrition template editor — meal slots + macros |
| 47 | /trainer/client/add                            | trainer-editor-06-add-client.png                          | Add client form (invite/email) |
| 48 | /trainer/client/:id/meal-picker                | trainer-editor-07-meal-picker.png                         | Meal picker — assigns template meals to client |
| 49 | /trainer/program/:id/assign                    | trainer-editor-08-assign-program-FALLBACK-training-list.png | FAILED TO CAPTURE — no programs in DB to assign; fallback shows /trainer/training list |

**Routes not captured (no DB seed):**
- /trainer/exercise/:id — ExerciseDetail edit existing (no fixture)
- /trainer/workout/:id — WorkoutEditor edit existing (no fixture)
- /trainer/program/:id — ProgramEditor edit existing (no fixture)
- /trainer/package/:id — PackageEditor edit existing (no fixture)
- /trainer/nutrition-template/:id — NutritionTemplateEditor edit existing (no fixture)
- ExercisePicker — likely embedded inside WorkoutEditor (modal/sheet, not a route); needs interactive trigger

---

## Modals / overlays (not captured — requires interaction triggers)

These are in-app sheets/dialogs that don't have dedicated routes. Phase 1 did
not capture them because they require trigger-state setup; flagged here for
Phase 2 follow-up if needed.

| #  | Trigger                                                     | Screenshot | Notes |
|----|-------------------------------------------------------------|------------|-------|
| M1 | Landing → Sign In button                                    | —          | Login bottom sheet (Apple/Google/Email options) |
| M2 | Landing → Sign In → Continue with email                     | —          | Login email form (inside same sheet) |
| M3 | Onboarding step → Info icon (top right)                     | —          | "Why we ask" bottom sheet — context per step |
| M4 | /home → daily check-in CTA                                  | —          | Daily check-in bottom sheet (energy/mood/water/steps) |
| M5 | /food → log meal                                            | —          | Meal log sheet/picker |
| M6 | /food → water widget +                                       | —          | Water increment toast/animation |
| M7 | /weekly-check-in → submit                                   | —          | Confirmation toast |
| M8 | /subscription → manage / cancel                             | —          | Cancellation alert dialog |
| M9 | /trainer/program/:id/assign — client picker                 | —          | Assign-to-client picker sheet |
| M10| /trainer/workout/* → "Add exercise"                         | —          | ExercisePicker sheet (route /trainer/exercise-picker is not in App.tsx; embedded) |
| M11| /trainer/nutrition-template/* → "Add meal"                  | —          | MealPicker sheet (route /trainer/client/:id/meal-picker is the only mounted form) |
| M12| Onboarding/SignUpSheet → email-form variant                 | —          | Spec attempted to capture; selector did not match active locale at runtime — re-run with locale check or use #signup-email |
| M13| ProcessingScreen → SignUp transition                        | —          | Auto-transition; current capture grabs a single moment of processing |

---

## Failed / partial captures

| Screen                                | Status                                       | Reason |
|---------------------------------------|----------------------------------------------|--------|
| /trainer/program/:id/assign           | FAILED TO CAPTURE — no programs in DB        | Fallback PNG shows /trainer/training list instead. Re-seed `programs` table to capture. |
| onboarding-phase-13-signup-email-form | Not saved (selector miss)                    | Email button selector didn't match in active locale during run; SignUpSheet base view IS captured. |
| ExercisePicker                        | Not captured                                 | Not a top-level route — embedded as sheet inside WorkoutEditor. Requires interactive trigger. |
| /trainer/exercise/:id (existing)      | Not captured                                 | No fixture; /new captured instead. |

---

## Spec file paths (for re-run / cleanup)

- `tests/e2e/render.spec.ts` — pre-existing, keep
- `tests/e2e/onboarding-walk.spec.ts` — TEMP, created 2026-04-26 for Phase 1
- `tests/e2e/trainer-editors-walk.spec.ts` — TEMP, created 2026-04-26 for Phase 1

Re-run all three together:
```bash
npx playwright test tests/e2e/render.spec.ts tests/e2e/onboarding-walk.spec.ts tests/e2e/trainer-editors-walk.spec.ts --reporter=list
```
