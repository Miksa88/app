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
