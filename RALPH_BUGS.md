## E2E baseline 2026-05-09 (pre Home/Food/Calendar refactor)

**Baseline:** 61 passed / 0 failed / 4 skipped (total 65 tests)
**Duration:** 4.9 min
**Command:** `npm run test:e2e` (chromium only, 1 worker)
**Timestamp:** 2026-05-09T20:37:00Z

### Failed tests by category

#### NONE — suite clean

Zero failures. All 61 executed tests passed.

### Skipped tests (4) — all intentional

- `-` `daily-checkin.spec.ts > klik 'Jutarnji check-in'...` — `test.describe.skip` — daily check-in feature removed May 2026; feedback now via PreWorkoutFatigueDialog + WeeklyCheckIn
- `-` `exploration.spec.ts > trainer routes load (if test user is trainer)` — conditional skip; test user not promoted to trainer at that point in spec order
- `-` `onboarding.spec.ts > novi email na /onboarding signup phase → auth.users ima novi red` — `test.describe.skip` — signup confirm bypass complexity; marked TODO
- `-` `water-widget.spec.ts > 3× '+1 čaša' → 3 reda u water_logs` — `test.describe.skip` — water widget removed Home v4 (2026-05-08)

### Target area coverage (Home / Food / WeeklyCalendar)

All specs touching the three refactor targets passed cleanly:

| Spec | Tests | Target surface | Result |
|---|---|---|---|
| `data-loading.spec.ts` | Home tab (kcal counter), Food meal cards, Gym session | `Home.tsx`, `Food.tsx`, `/gym` | PASS |
| `real-user-walk.spec.ts` | Home tab walk, Food modal, Gym start-session | `Home.tsx`, `Food.tsx`, `WeeklyCalendar.tsx` area | PASS |
| `meal-log.spec.ts` | Meal card → eat / skip / replace | `Food.tsx` | PASS |
| `render.spec.ts` | All client routes including /home /food /gym | all pages | PASS |
| `workout-flow.spec.ts` | Gym → Start session → /workout/active | Gym/Calendar entry point | PASS |

No console errors on CLIENT walk (Home, Food, Gym, Progress, Profile). No console errors on TRAINER walk.

### Suggested priority

Proceed safely with Home / WeeklyCalendar / Food refactor. Suite is green, zero blockers.

---

## E2E Run 2026-06-12T20:45:41Z

**Baseline:** 60 passed / 3 failed / 4 skipped (total 67 tests)
**Duration:** 5.8 min
**Command:** `npm run test:e2e` (chromium only, 1 worker)

### Failed tests by category

#### UI-SELECTOR (1)

- [ ] `data-loading.spec.ts > Home pokazuje 'Danas' mini data centar sa kcal counterom`
  - **Error**: `expect(locator).toBeVisible() failed — getByRole('heading', { name: /^danas$/i, level: 2 }) — element(s) not found — Timeout: 10000ms`
  - **Root cause hypothesis**: The `<h2>Danas</h2>` heading inside the Home "mini data centar" either no longer exists or has been changed to a different heading level / different text. Home.tsx was refactored (talas-2 through talas-5 commits); the heading may have been replaced by a non-semantic element or the text key changed.
  - **Screenshot**: `test-results/data-loading-Data-loading--b6b3d-ta-centar-sa-kcal-counterom-chromium/test-failed-1.png`
  - **Screenshot (retry)**: `test-results/data-loading-Data-loading--b6b3d-ta-centar-sa-kcal-counterom-chromium-retry1/test-failed-1.png`
  - **Fix owner**: UI dev — verify `Home.tsx` still renders `<h2>Danas</h2>` (or equivalent accessible heading) in the kcal counter card; if element was replaced, update semantic markup.

#### UI-SELECTOR (1)

- [ ] `onboarding-walk.spec.ts > walk through 12 steps + processing + signup`
  - **Error**: `TimeoutError: locator.click: Timeout 10000ms exceeded — waiting for locator('button[aria-pressed]').first()` at `onboarding-walk.spec.ts:159` (Step 10 — frequency selection card)
  - **Root cause hypothesis**: Frequency selection step in onboarding no longer renders buttons with `aria-pressed` attribute. Step 10 toggle cards likely use a different pattern (e.g., `data-selected`, `role="radio"`, or a plain `div` with click handler). Regression from white-label pivot / onboarding UI changes.
  - **Screenshot**: `test-results/onboarding-walk-Onboarding-fc600--12-steps-processing-signup-chromium/test-failed-1.png`
  - **Screenshot (retry)**: `test-results/onboarding-walk-Onboarding-fc600--12-steps-processing-signup-chromium-retry1/test-failed-1.png`
  - **Fix owner**: UI dev — inspect onboarding Step 10 frequency cards in DOM; if `aria-pressed` was dropped, add it back to the toggle button component (`ToggleGroup` or equivalent).

#### SPEC-BUG (1) — not a code regression

- [ ] `analysis-report-submit.spec.ts > translations file contains required error keys`
  - **Error**: `expect(content).toContain('"analysis.errorGeneric"')` fails — spec reads `src/contexts/LanguageContext.tsx` and asserts the literal string `"analysis.errorGeneric"` exists in that file. It does not (and never should — keys belong in JSON locale files, not the context).
  - **Root cause**: The translations `analysis.errorGeneric` and `analysis.errorNoSession` ARE present and correct in both `src/locales/sr.json` (line 203) and `src/locales/en.json` (line 203). The spec is checking the wrong file — `LanguageContext.tsx` only imports the JSON, it does not repeat key strings. This is a spec design error, not a missing translation.
  - **Category**: SPEC-BUG — the production code is correct. The test is broken by design.
  - **Fix owner**: test-maintainer — update `analysis-report-submit.spec.ts:43-48` to read `src/locales/sr.json` (or `en.json`) instead of `LanguageContext.tsx`.

### Skipped tests (4) — all pre-existing intentional skips

- `-` `daily-checkin.spec.ts > klik 'Jutarnji check-in'...` — `test.describe.skip` — daily check-in feature removed May 2026
- `-` `exploration.spec.ts > trainer routes load (if test user is trainer)` — conditional skip; test user not trainer at that point in spec order
- `-` `onboarding.spec.ts > novi email na /onboarding signup phase → auth.users ima novi red` — `test.describe.skip` — email confirm bypass complexity; TODO
- `-` `water-widget.spec.ts > 3× '+1 čaša' → 3 reda u water_logs` — `test.describe.skip` — water widget removed Home v4

### Regressions vs baseline (2026-05-09 clean run)

| Spec | May 9 | Jun 12 | Delta |
|---|---|---|---|
| `data-loading.spec.ts > Home 'Danas'` | PASS | FAIL | REGRESSION — Home heading changed |
| `onboarding-walk.spec.ts > 12 steps` | PASS | FAIL | REGRESSION — `aria-pressed` missing on freq step |
| `analysis-report-submit.spec.ts > translations file` | PASS | FAIL | SPEC-BUG — wrong file path in test |

### Suggested priority

1. **HIGH**: `data-loading` — Home kcal heading missing/changed; core data visibility broken for test user
2. **HIGH**: `onboarding-walk` — Step 10 frequency cards lost `aria-pressed`; accessibility regression in onboarding flow
3. **LOW / MAINTENANCE**: `analysis-report-submit` — spec reads wrong file; translations are fine; quick 2-line fix in spec

---

## E2E Run 2026-05-09T01:52:00Z

**Baseline:** 61 passed / 1 failed / 3 skipped (total 65 tests)
**Duration:** 5.4 min
**Command:** `npm run test:e2e --project=chromium`

### Failed tests by category

#### UI-SELECTOR — REMOVED FEATURE (1)

- [ ] `daily-checkin.spec.ts > klik 'Jutarnji check-in' → sheet → submit → DB + UI refresh`
  - **Error**: `Timeout 5000ms — getByTestId('daily-checkin-cta')` — element not found
  - **Category**: Removed feature. `DailyCheckInSheet` + CTA removed from `Home.tsx` intentionally this session.
  - **Root cause**: Test looks for `data-testid="daily-checkin-cta"` which no longer exists in the DOM.
  - **Screenshot**: `test-results/daily-checkin-Daily-Check--b61b7-et-→-submit-→-DB-UI-refresh-chromium/test-failed-1.png`
  - **Action required**: Spec needs `.skip` or full rewrite to target new weekly check-in flow. NOT a code bug.
  - **Fix owner**: test-maintainer — add `test.skip` to `tests/e2e/daily-checkin.spec.ts` until flow is redesigned

### Skipped tests (3)

- `-` `exploration.spec.ts > trainer routes load (if test user is trainer)` — conditional skip (test user not trainer at that point, by design)
- `-` `onboarding.spec.ts > novi email na /onboarding signup phase → auth.users ima novi red` — pre-existing skip (email confirm bypass complexity)
- `-` `water-widget.spec.ts > 3× '+1 čaša' → 3 reda u water_logs` — pre-existing skip (water widget removed earlier)

### New features — no regressions detected

All tests covering new session changes passed:

- `weekly-checkin.spec.ts` — sleep + stress sliders: PASS (new fields wired correctly)
- `real-user-walk.spec.ts` — Home tab walk (water widget + daily check-in trigger both confirmed absent, test passed soft-assert): PASS
- `workout-flow.spec.ts` + `workout-completion.spec.ts` — Gym entry (PreWorkoutFatigueDialog territory): PASS
- `meal-log.spec.ts` — all 3 meal actions including Zameni/Replace (Food.tsx auto-suggest area): PASS
- `render.spec.ts` — all client + trainer routes render without crash: PASS
- `real-user-walk.spec.ts` (21 subtests) — zero console errors CLIENT, zero console errors TRAINER: PASS

### Suggested priority

1. **LOW / MAINTENANCE**: daily-checkin spec — skip it. Feature intentionally removed, test is stale. No code fix needed.
2. **INFO**: water-widget + onboarding signup remain skipped from previous sessions — no change in status.
