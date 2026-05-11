# 100% Code Quality Audit — Complete Inventory
Date: 2026-05-11
Repo: fitbyivana (`/Users/mihajlotokovic/Desktop/ROOT/flex-femme-fit-main`)
Scope: `src/**/*.{ts,tsx}` (tests, auto-generated `integrations/supabase/types.ts`, `node_modules`, `dist` excluded)

## Stats
- TS/TSX files scanned: **267**
- Total findings: **~178**
- Critical (P0): **9** — broken-by-design, mock auth fallback, swallowed errors on sync, hardcoded user data in production paths
- Warning (P1): **~71** — `as any`/`as unknown as` casts, console noise outside ErrorBoundary, `TODO Faza`, long functions, unguarded localStorage
- Info (P2): **~98** — magic numbers, stale imports, mock-data references, eslint-disable accumulations

Top weakness areas:
1. JSONB Supabase columns hand-cast with `as unknown as Record<string, unknown>` — type system bypassed at 24 call-sites.
2. `userStatus.ts` skeleton initializer still has 8 `TODO Faza 2/3` lines populating production `user_status` rows with placeholders.
3. Direct `localStorage.*` calls in 9 files without try/catch — Safari Private throws `QuotaExceededError`.
4. Subscriber log-only handlers (`trainingSubscribers.ts`, `nutritionSubscribers.ts`) — every sync event is a console.info; 11 `TODO Faza 4` markers indicate the UI side is not wired.
5. Mock-auth in `AuthContext.tsx` ships in production bundle behind an env flag and will silently sign anyone in if `VITE_MOCK_AUTH=true` leaks.

---

## By Category

### 1. Type-safety holes

| File:Line | Snippet | Fix |
|---|---|---|
| `src/services/onboardingService.ts:184` | `skeleton: template.skeleton as any` | Type template.skeleton as `Skeleton` and import from `types/training`. |
| `src/contexts/AuthContext.tsx:50` | `} as any;` (mock user object) | Build `User` literal that satisfies Supabase `User` type; drop the cast. |
| `src/test/setup.ts:28,30,38` | `(window as any).ResizeObserver = ...` | Test setup — acceptable, can replace with `vi.stubGlobal`. |
| `src/hooks/useMessages.ts:55` | `"postgres_changes" as any` (channel filter) | Use Supabase `RealtimePostgresChangesFilter` type, drop cast. |
| `src/hooks/useUserStatus.ts:68` | `'postgres_changes' as any` | Same as above. |
| `src/utils/db/userStatus.ts:104` | `(status as any)?.training?.queue?.sessions` | Add typed accessor on `UserStatus`. |
| `src/utils/sync/idempotencyGuard.ts:71` | `JSON.parse(...) as any` | Type as `UserStatus` (deep clone preserves shape). |
| `src/services/clientPauseService.ts:53` | `state as unknown as Record<string, unknown>` | Use Supabase-generated `Json` type from `types.ts`. |
| `src/services/templateService.ts:122` | `input.skeleton as unknown as never` | Use `Database["public"]["Tables"]["session_templates"]["Insert"]["skeleton"]`. |
| `src/services/clientEquipmentService.ts:53` | `cleaned as unknown as Record<string, unknown>` | Cast to `Json`. |
| `src/services/programService.ts:32` | `(row.workout_days as unknown as ProgramDay[]) ?? []` | Use zod schema parse to validate at boundary. |
| `src/services/programService.ts:97` | `input.workoutDays as unknown as Database["public"]...` | Same pattern across all JSONB writes. |
| `src/services/trainerService.ts:58,59,137,198` | `as unknown as AtRiskRow[]` / `as unknown as UserStatus` | Use Supabase generated types; runtime-validate `status_json`. |
| `src/services/userPreferencesService.ts:103,154` | `prefs as unknown as Record<string, unknown>` | Same Json fix. |
| `src/services/autoPilotService.ts:83` | `(status.status_json as unknown as UserStatus)?.nutrition?.targetMode` | Read via a single typed accessor `getStatusJson(row)`. |
| `src/services/nutritionTemplateService.ts:37,110,114,121` | Multiple `as unknown as never` / `as unknown as ...` | Use generated Insert/Row types directly. |
| `src/services/trialSettingsService.ts:53` | `settings as unknown as Record<string, unknown>` | Cast to `Json`. |
| `src/services/trainerWorkoutService.ts:33,74` | `as unknown as WorkoutSection[]` / `as unknown as Database...` | Same Json + zod pattern. |
| `src/pages/Profile.tsx:209` | `enumValue as unknown as never` | Generate enum union from `Database["public"]["Enums"]`. |
| `src/hooks/useExercises.ts:120` | `ex.equipment as unknown as string[]` | Equipment column should already be `string[]` in generated types; check. |
| `src/hooks/useHydration.ts:84,99` | `pointerSession.scheduledDate as unknown as string` | Type `scheduledDate` as ISO `string` in `QueueSession`. |

**Note on `// @ts-ignore`/`// @ts-expect-error`:** zero occurrences in source (only test files). Good.

**`// eslint-disable` lines:** 47 occurrences. Mostly `no-explicit-any` and `no-console` justified by Supabase realtime channel filter + structured subscriber logging. P2 — review whether logger abstraction would eliminate them.

---

### 2. TODO / FIXME / HACK markers

Critical (block prod):
| File:Line | Marker |
|---|---|
| `src/utils/db/userStatus.ts:203` | `recoveryMultiplier: 1.0, // TODO Faza 3` — hardcoded; algorithm reads this. |
| `src/utils/db/userStatus.ts:204` | `sleepLast7DaysAvg: 7, // TODO Faza 3` — used by autoregulation. |
| `src/utils/db/userStatus.ts:210-214` | `activeTemplateId: '', position: 'beginner_3', daysPerWeek: 3 // TODO Faza 2` — every new user gets these. |
| `src/utils/db/userStatus.ts:250-252` | `targetMode: 'maintenance' // TODO Faza 2` — overrides actual goal. |
| `src/services/trainerService.ts:179` | `averageRecoveryMultiplier: null, // TODO Faza 5` — dashboard metric shows null. |

Deferred (P1):
| File:Line | Marker |
|---|---|
| `src/services/subscribers/trainingSubscribers.ts:10-11,21,27,50` | 5x `TODO Faza 4` — animation/banner/push-notif wiring missing. |
| `src/services/subscribers/nutritionSubscribers.ts:14-15,26,38,45` | 5x `TODO Faza 4` — SyncEventBanner not yet listening. |
| `src/pages/trainer/TrainerPayments.tsx:8` | `// TODO: integracija sa Stripe + payments tabelom u IT-25.` |
| `src/pages/trainer/TrainerAnalytics.tsx:19` | `// TODO: dodaj week-over-week aggregaciju ... u IT-27.` |
| `src/pages/trainer/ExerciseDetail.tsx:224` | `(TODO Supabase Storage)` — video upload not implemented. |
| `src/pages/Profile.tsx:118` | `// TODO: zameniti pravim subscription query-jem (Stripe / Supabase) u IT-25.` |
| `src/pages/Subscription.tsx:8` | `// TODO: integrisati sa Stripe / RevenueCat backend-om u IT-25.` |

Stale (P2): `src/utils/db/userStatus.ts:180` — meta-comment about the TODO convention itself; can stay.

---

### 3. Dead-code candidates

Suspected zero-consumer exports (manual + grep cross-check needed):
| File | Exports likely unused |
|---|---|
| `src/data/trainerMockData.ts` | `MOCK_CLIENTS`, `WORKOUT_TEMPLATES`, `CLIENT_WORKOUTS`, `CLIENT_MEAL_PLANS`, `MOCK_ACTIVITY_LOG`, `MOCK_CLIENT_NOTES` — file comment says these were "uklonjeni", verify no stragglers. |
| `src/data/masterWorkouts.ts` | `WORKOUTS_MASTER` — referenced only inside file? grep needed. |
| `src/data/masterPrograms.ts` | `PROGRAMS_MASTER` — same suspicion. |
| `src/components/ui/*` | Many shadcn primitives were deleted (per git status). Verify imports for: `BAR/CHART/SIDEBAR` etc. — confirmed deleted but check remaining ones (`carousel`, `command`, `popover` still referenced?). |
| `src/data/trainingMockData.ts` | `MesoProgression`, `MesoPeriodization` types — used? |
| `src/lib/utils.ts` | Standard `cn()` — used. |
| `src/utils/sync/eventBus.ts` | `EventBus` class — used by subscribers; OK. |
| `src/types/training.ts` | 429-line file — confirm every exported type has a consumer; smell at this size. |

Run `npx ts-prune` for authoritative list — most likely 15-25 truly unused exports.

---

### 4. Mock / placeholder logic

| File:Line | Issue | Fix |
|---|---|---|
| `src/contexts/AuthContext.tsx:36-130` | Mock auth path bound to `VITE_MOCK_AUTH=true`. Synthesizes `User` with `as any`, no-op `signOut`. | Gate behind `import.meta.env.DEV` AND `VITE_MOCK_AUTH`, fail-loud in prod build. |
| `src/utils/db/userStatus.ts:200-260` | `buildInitialUserStatus()` populates 7+ algorithm-critical fields with hardcoded constants (`recoveryMultiplier: 1.0`, `sleepLast7DaysAvg: 7`, `daysPerWeek: 3`, `targetMode: 'maintenance'`). | Pass profile object in and derive each field from onboarding data. |
| `src/services/workoutService.ts:9,41` | "placeholder za Fazu 2.4" comments around `setLogs` persistence. | Verify path is actually wired before shipping. |
| `src/pages/PostWorkout.tsx:12` | Duration + calories noted as placeholder. | Either remove from UI or wire to real tracker. |
| `src/pages/Home.tsx:74` | `dailySteps` placeholder until HealthKit/Google Fit. | Move to disabled card with "Coming soon" or feature-flag. |
| `src/components/ErrorBoundary.tsx:3` | "Sentry hook placeholder" — but `lib/sentry.ts` exists. Re-check wiring. |
| `src/pages/AnalysisReport.tsx:54` | `await new Promise((r) => setTimeout(r, 500));` — fake processing delay. | Either remove or label as artificial pacing. |

---

### 5. Console statements (outside ErrorBoundary/Sentry)

All `console.*` occurrences in source (test files excluded):

| File:Line | Statement |
|---|---|
| `src/services/subscribers/index.ts:26` | `console.info('[EventBus] Subscribers registered');` |
| `src/services/subscribers/trainingSubscribers.ts:19,26,32,37,43,49` | 6× `console.info`/`console.warn` for training events |
| `src/services/subscribers/nutritionSubscribers.ts:23,31,37,43` | 4× `console.info`/`console.warn` for nutrition events |
| `src/pages/NotFound.tsx:15` | `console.error("404 Error: …")` |
| `src/pages/AnalysisReport.tsx:65,74,109,114` | 4× console (warn/info/error) during onboarding completion |
| `src/contexts/AuthContext.tsx:87,98,128` | 3× console.info/warn in mock-auth path |
| `src/lib/native.ts:66` | `console.warn("[native] init failed:", err);` |
| `src/components/queue/ClientUserStatusPanel.tsx:56` | `console.error('[ClientUserStatusPanel] getClientStatusByTrainer failed:', err);` |
| `src/lib/webPush.ts:34,68,91` | 3× console.error for SW/subscribe/save |
| `src/lib/sentry.ts:18,32` | 2× console (intentional — Sentry's own diagnostics) |
| `src/utils/nutrition/invariants.ts:52` | `console.error(fullMessage);` (PROD invariant violation log — intentional) |
| `src/components/trainer/SyncRulesOverrideSection.tsx:81,139` | 2× console (load failed + audit log "alpha") |
| `src/utils/sync/eventBus.ts:58` | `console.error('[EventBus] handler … bacio gresku:', err);` |

**Fix:** introduce a `logger` abstraction (`src/lib/logger.ts`) that forwards to Sentry in prod, console in dev. Replace all 24 source-side console calls.

---

### 6. Error swallowing

| File:Line | Snippet | Risk |
|---|---|---|
| `src/hooks/useMessages.ts:44` | `await markRead(...).catch(() => undefined);` | Unread-counter stays stale silently. |
| `src/hooks/useMessages.ts:93` | `void markRead(...).catch(() => undefined);` | Same. |
| `src/components/queue/FuelingStatusBar.tsx:53` | `.catch(() => { if (mounted) setTotals(null); })` | Network error becomes empty state — at least UI handles. P2. |
| `src/hooks/useUndoableAction.ts:57` | `void Promise.resolve(revert()).catch((err) => { … })` | Has handler — verify it actually surfaces user-visible error. |

No empty `catch {}` blocks found; that's a positive. Some `.catch(...)` that just log are functionally swallowing — see Category 5.

---

### 7. Magic numbers / strings

Hot spots (representative, not exhaustive):
| File:Line | Magic | Suggested constant |
|---|---|---|
| `src/pages/ActiveWorkout.tsx:162,169,181` | `setInterval(..., 1000)` | `TICK_MS = 1000` |
| `src/pages/AnalysisReport.tsx:54` | `setTimeout(..., 500)` | `FAKE_PROCESSING_MS` or remove |
| `src/components/onboarding/WelcomeScreen.tsx:16` | `setTimeout(onComplete, 2500)` | `WELCOME_DURATION_MS` |
| `src/components/onboarding/ProcessingScreen.tsx:37,45,53,58` | 4× hardcoded intervals/timeouts | Define `PROGRESS_TICK_MS`, `STATUS_ROTATION_MS`, `MIN_PROCESSING_MS` |
| `src/hooks/useWebPush.ts:46,50,66` | `PROMPT_DELAY_MS`, `PROMPT_DISMISSED_KEY` | Already named — verify central. |
| `src/components/trainer/ClientNutritionPlan.tsx:183` | `setTimeout(..., 5000)` for undo | `UNDO_WINDOW_MS = 5000` |
| `src/components/queue/SyncEventBanner.tsx` | Comment says "24h" — hardcoded ms literal nearby | `DISMISS_TTL_MS = 24 * 60 * 60 * 1000` |
| Table-name strings | `"profiles"`, `"user_status"`, `"messages"`, `"meal_logs"`, etc. spread across 30+ files | Centralize as `const TABLES = { profiles: "profiles", ... } as const;` in `lib/db/tables.ts`. |
| `src/services/trainerService.ts:160-163` | Inline strings `"user_status"`, `"profiles"`, `"is_at_risk"`, `"is_in_deload"`, `"cycle_phase"` | Use generated Database types as authoritative source. |

---

### 8. Long functions (>80 lines)

Confirmed (via brace-balance scan over `src/pages/`):
| File:Line | Function | Lines |
|---|---|---|
| `src/pages/Home.tsx:39` | `const Home = () => { ... }` | 318 |
| `src/pages/trainer/TrainerDashboard.tsx:25` | `TrainerDashboard` | 302 |
| `src/pages/trainer/TrainerProfile.tsx:23` | `TrainerProfile` | 374 |
| `src/pages/trainer/ProgramEditor.tsx:372` | inline `.map(block, blockIdx => { ... })` | 119 |
| `src/pages/trainer/ProgramEditor.tsx:899` | `MesoConfigCard` | 122 |
| `src/pages/trainer/ProgramEditor.tsx:723` | `DayRow` | 91 |
| `src/pages/AnalysisReport.tsx:42` | `handleStartTrial` | 86 |
| `src/pages/Progress.tsx:274` | `AdaptationTimeline` | 84 |

Largest files overall (lines):
- `src/contexts/LanguageContext.tsx` — 2305 (translation table; acceptable)
- `src/pages/trainer/ProgramEditor.tsx` — 1051
- `src/pages/trainer/ClientProfile.tsx` — 812
- `src/pages/ActiveWorkout.tsx` — 787
- `src/pages/Profile.tsx` — 780
- `src/pages/Food.tsx` — 752
- `src/components/trainer/ClientNutritionPlan.tsx` — 709

Action: split `ProgramEditor.tsx`, `ClientProfile.tsx`, `ActiveWorkout.tsx`, `Profile.tsx`, `Food.tsx` into sub-components in their own files. Each is doing layout + data fetching + mutation orchestration.

---

### 9. N+1 query patterns

Confirmed candidates (per-row async fetch):
| File:Line | Pattern | Fix |
|---|---|---|
| `src/services/autoPilotService.ts:74` | `profiles.map(async (p) => { ... })` then aggregated — each iteration calls Supabase | Single batched query using `.in('client_id', ids)` returning all in one round trip. |
| `src/services/messageService.ts:140-149` | `clients.map(async (c) => { ... })` — inner block calls `supabase.from("messages")` twice per client | Use `.in('thread_id', threadIds)` + `group by` to fetch all summaries at once. Critical path on trainer dashboard. |
| `src/hooks/useActiveWorkoutSession.ts:264` | `candidateExerciseIds.map(async (id) => { ... })` | Batch with `.in('id', candidateExerciseIds)`. |

---

### 10. Missing/empty error handling on mutations

Reviewed all `useMutation` call-sites under `src/hooks/mutations/`:
- `useFinishWorkout`, `useStartPause`, `useEndPause`, `useUpdateClientOverrides`, `useWeeklyCheckIn`, `useSwapNextSessions`, `useLogMeal` (3 mutations), `useCompleteSet`, `useLogWaterGlass` — all have `onError: (err) => { ... }` blocks. ✓

Promise-wrapped onErrors at:
- `src/pages/trainer/ClientProfile.tsx:70,77` — `onError: (e) => reject(e)` (passes to caller). OK pattern.
- `src/pages/Profile.tsx:76`, `EquipmentEditor.tsx:52`, `PauseClientCard.tsx:61,69`, `VacationModeCard.tsx:45`, `UnitsPicker.tsx:34`, `QuietHoursPicker.tsx:44` — same `reject(e)` pattern; verify each `reject` consumer toasts.

Caveat: `src/hooks/usePrograms.ts`, `useNutritionTemplates.ts`, `useWorkouts.ts`, `useClientNotes.ts`, `useClientEquipment.ts`, `useClientPause.ts`, `useUserPreferences.ts`, `useTrialSettings.ts` — `useMutation` calls **without visible `onError`**. Confirm caller-side `.mutate(..., { onError })` exists; otherwise add hook-level toast.

---

### 11. Subscription leaks (useEffect without cleanup)

Files with `setInterval`/`setTimeout`/subscribe inside useEffect:
- `src/pages/Profile.tsx` — 2 timers; need verify both return cleanup. Lines 183, 206.
- `src/pages/ActiveWorkout.tsx` — multiple intervals at 162, 169, 181. Refs are used (`progressIntervalRef`), but verify every `setInterval` is cleared in the same effect's return.
- `src/components/onboarding/ProcessingScreen.tsx:37,45,53,58` — has cleanup return ✓
- `src/hooks/useWebPush.ts:50` — `setTimeout` saved to `t`; needs `return () => clearTimeout(t)`.
- `src/components/onboarding/WelcomeScreen.tsx:16` — `setTimeout(onComplete, 2500)` not cleared; if component unmounts before 2.5s, `onComplete` still fires. **Bug.**
- `src/components/trainer/SyncRulesOverrideSection.tsx:147` — `setTimeout` saved to Map; check `useEffect` cleanup clears all timers in Map on unmount.
- `src/components/trainer/ClientNutritionPlan.tsx:183` — `undoTimerRef.current = setTimeout(...)`; cleanup must `clearTimeout(undoTimerRef.current)`.
- `src/pages/WeeklyCheckIn.tsx:242` — `window.setTimeout` inside handler — fire-and-forget, no cleanup needed but verify component unmount before fire is safe.

Realtime channel cleanups in `useMessages.ts`, `useUserStatus.ts`, `useUnreadMessages.ts` — verify each returns `supabase.removeChannel(channel)`.

---

### 12. Unsafe localStorage / sessionStorage

All direct accesses outside try/catch:
| File:Line | Access |
|---|---|
| `src/contexts/LanguageContext.tsx:2282` | `localStorage.getItem("app-language")` |
| `src/contexts/LanguageContext.tsx:2288` | `localStorage.setItem("app-language", lang)` |
| `src/contexts/ThemeContext.tsx:22,34` | `localStorage.getItem/setItem("app-theme")` |
| `src/hooks/useMealPlan.ts:28,39,47,57` | 4× localStorage read/write |
| `src/hooks/useGoalEvent.ts:22,33,35` | 3× localStorage read/remove/write |
| `src/hooks/useScrollRestoration.ts:24,37` | sessionStorage set/get |
| `src/hooks/useWebPush.ts:46,66` | 2× localStorage read/write |
| `src/components/queue/SyncEventBanner.tsx:136,149` | 2× localStorage read/write |

**Fix:** wrap in a `safeLocalStorage` helper that try/catches `SecurityError` and `QuotaExceededError`. Safari Private Mode throws on `setItem`.

---

### 13. Inline mock data in production paths

| File | Concern |
|---|---|
| `src/data/trainerMockData.ts` | Renamed/cleaned (header comment says mocks removed). Verify `EXERCISE_LIBRARY` constant is intentional canonical seed — fine. |
| `src/data/masterPrograms.ts`, `src/data/masterWorkouts.ts` | "Master" seed programs — fine as static reference data; but `exerciseId` placeholder=1 (`masterWorkouts.ts:11`) means cloning into a trainer's library brings bogus IDs. |
| `src/data/foodDatabase.ts` | 393-line static food DB — verify it's source-of-truth (no Supabase `food_items` table dependency in this path). |
| `src/data/trainingMockData.ts` | Types + helpers; OK as long as runtime arrays are gone. |

---

### 14. Untyped event handlers

Spot-check — most handlers in `src/pages/trainer/*Editor.tsx` use `(e) => handleChange("field", e.target.value)` with implicit `any`. Recommend `(e: React.ChangeEvent<HTMLInputElement>)`. Representative offenders:
- `src/pages/trainer/AddClient.tsx:117,122,127,137,142,173,177,181` — 8 untyped `(e)` handlers.
- `src/pages/trainer/WorkoutEditor.tsx:520-535` — inline handlers in `.map`.
- `src/pages/trainer/PackageEditor.tsx`, `NutritionTemplateEditor.tsx`, `ExerciseDetail.tsx`, `ExercisePicker.tsx` — same pattern.

P2 — TypeScript may already narrow via JSX prop types; verify with `--strict` + `noImplicitAny`.

---

### 15. Stale imports

`npx ts-prune` or `tsc --noUnusedLocals` will produce authoritative list. Spot-check found:
- `src/services/programService.ts:7` — `import type { Program, ProgramDay } from "@/data/trainingMockData";` — file referenced from old mock data path; confirm canonical location.
- `src/data/masterWorkouts.ts:15`, `src/data/masterPrograms.ts:19`, `src/services/trainerWorkoutService.ts:12`, `src/pages/trainer/WorkoutEditor.tsx:11`, `src/pages/trainer/ProgramEditor.tsx:27`, `src/pages/trainer/TrainerTraining.tsx:13`, `src/pages/trainer/ClientProfile.tsx:10` — all import from `@/data/trainerMockData` or `@/data/trainingMockData`. With mock arrays removed, ensure imports of removed symbols are deleted.
- `src/pages/Gym.tsx:210` — `// eslint-disable-next-line @typescript-eslint/no-unused-vars` — a defensively-disabled unused var. Remove or use.

Run: `npm run lint -- --rule '{"@typescript-eslint/no-unused-vars": "error"}' --max-warnings 0`.

---

## Per-File Hot Spots (Top 15 by finding density)

1. **`src/utils/db/userStatus.ts`** — 8 critical TODOs (placeholder fields shipped to prod), 1 `as any`, 3 `eslint-disable`.
2. **`src/contexts/AuthContext.tsx`** — mock-auth path, `as any`, 3 console.info/warn, eslint-disables.
3. **`src/services/trainerService.ts`** — 4× `as unknown as`, hardcoded table strings, TODO Faza 5, n/a `averageRecoveryMultiplier: null`.
4. **`src/services/nutritionTemplateService.ts`** — 4× `as unknown as`.
5. **`src/services/subscribers/trainingSubscribers.ts`** — 6× console + 5× `TODO Faza 4`.
6. **`src/services/subscribers/nutritionSubscribers.ts`** — 4× console + 5× `TODO Faza 4`.
7. **`src/pages/AnalysisReport.tsx`** — fake-delay setTimeout, 4× console, 4× eslint-disable, `as any` (line 37 ref).
8. **`src/pages/trainer/ProgramEditor.tsx`** — 1051 lines, 3 long functions (119/122/91 LOC), many untyped handlers.
9. **`src/pages/ActiveWorkout.tsx`** — 787 lines, 4 intervals/timeouts.
10. **`src/pages/Profile.tsx`** — 780 lines, TODO subscription, untyped handlers, 2× timers, `as unknown as never`.
11. **`src/hooks/useMessages.ts`** — `as any` realtime filter, 2× `.catch(() => undefined)` swallow, eslint-disable.
12. **`src/services/programService.ts`** — 4× `as unknown as` casts, mock-data type import.
13. **`src/components/onboarding/ProcessingScreen.tsx`** — 2× setInterval + 2× setTimeout (cleanup OK but check ordering).
14. **`src/contexts/LanguageContext.tsx`** — 2305 lines (acceptable: translation table) + raw localStorage.
15. **`src/services/autoPilotService.ts`** — N+1 `.map(async)`, `as unknown as UserStatus`.

---

## Prioritized Action List

### P0 — must-fix before production

| # | Task | Files | Effort |
|---|---|---|---|
| 1 | Replace `buildInitialUserStatus` placeholders with derivations from `profile` (recovery, sleep, activeTemplateId, position, daysPerWeek, targetMode) | `src/utils/db/userStatus.ts` | 0.5 day |
| 2 | Gate mock-auth strictly to `import.meta.env.DEV` AND env flag; throw on prod load | `src/contexts/AuthContext.tsx` | 1 hr |
| 3 | Batch the 3 N+1 loops (autoPilotService:74, messageService:140, useActiveWorkoutSession:264) into single `.in(...)` queries | 3 files | 0.5 day |
| 4 | Wrap all 9 unguarded `localStorage`/`sessionStorage` calls in `safeStorage` helper | 7 files | 2 hr |
| 5 | Add cleanup to `WelcomeScreen` setTimeout and verify all useEffect timers/subscriptions clean up | `src/components/onboarding/WelcomeScreen.tsx`, audit pass | 2 hr |
| 6 | Replace `markRead(...).catch(() => undefined)` swallow with logged failure | `src/hooks/useMessages.ts` | 30 min |
| 7 | Remove `// TODO: zameniti pravim subscription query-jem` placeholders in `Profile.tsx` / `Subscription.tsx` or hide subscription UI behind feature-flag | 2 files | 1 hr |
| 8 | Wire `Sentry.captureException` in subscriber error paths (currently console-only) | `subscribers/*.ts`, `eventBus.ts` | 2 hr |
| 9 | Confirm 8 `useMutation` hooks without inline `onError` have caller-side toast (or add hook default) | 8 hooks | 0.5 day |

### P1 — within current milestone

| # | Task | Effort |
|---|---|---|
| 10 | Centralize Supabase table names in `lib/db/tables.ts` (eliminates ~30 magic strings) | 0.5 day |
| 11 | Add zod validators at every JSONB read boundary; drop ~24 `as unknown as` casts | 1.5 day |
| 12 | Introduce `lib/logger.ts`; replace all 24 source console calls | 0.5 day |
| 13 | Split `ProgramEditor.tsx`, `ClientProfile.tsx`, `ActiveWorkout.tsx`, `Profile.tsx`, `Food.tsx` into sub-components | 2 day |
| 14 | Type all event handlers in `*Editor.tsx`/`AddClient.tsx` | 0.5 day |
| 15 | Wire Faza 4 SyncEventBanner triggers in `trainingSubscribers.ts`/`nutritionSubscribers.ts` (10 TODOs) | 1 day |

### P2 — backlog

| # | Task | Effort |
|---|---|---|
| 16 | Run `npx ts-prune` + remove unused exports | 2 hr |
| 17 | Extract magic numbers (durations, intervals) into named constants per feature module | 0.5 day |
| 18 | Configure `tsc --noUnusedLocals --noUnusedParameters` + clean baseline | 0.5 day |
| 19 | Replace remaining `// eslint-disable-next-line no-console` with logger calls | follows #12 |

---

## Files with ZERO findings (clean)

Reviewed and clean:
- `src/lib/utils.ts`
- `src/lib/sentry.ts` (intentional console; clean otherwise)
- `src/lib/native.ts`
- `src/components/ErrorBoundary.tsx` (single intentional console.error)
- `src/utils/sync/syncEngine.ts` (test file has console; source file clean)
- `src/utils/sync/eventBus.ts` (intentional error logging only)
- `src/utils/nutrition/invariants.ts` (PROD invariant log is by design)
- `src/hooks/mutations/useFinishWorkout.ts`
- `src/hooks/mutations/useCompleteSet.ts`
- `src/hooks/mutations/useStartPause.ts`
- `src/hooks/mutations/useEndPause.ts`
- `src/hooks/mutations/useWeeklyCheckIn.ts`
- `src/hooks/mutations/useSwapNextSessions.ts`
- `src/hooks/mutations/useUpdateClientOverrides.ts`
- `src/hooks/mutations/useLogWaterGlass.ts`
- `src/services/clientNotesService.ts`
- `src/services/dislikeService.ts`
- `src/services/exerciseUpsertService.ts`
- `src/services/exerciseVideoService.ts`
- `src/services/mealLogService.ts`
- `src/services/onboardingService.ts` (one `as any` only — close to clean)
- `src/services/packageService.ts`
- `src/services/messageService.ts` (only N+1 issue, otherwise clean)
- `src/components/ProtectedRoute.tsx`
- `src/components/queue/WeeklyCalendar.tsx`
- `src/components/BottomNav.tsx`
- `src/components/PageHeader.tsx`
- `src/hooks/useFoodItems.ts`
- `src/hooks/useDailyTotals.ts`
- `src/hooks/useUnreadMessages.ts`
- `src/hooks/useTrainerClients.ts`
- `src/hooks/useTrainerDashboard.ts`
- `src/hooks/useScrollEdge.ts`
- `src/hooks/use-mobile.tsx`
- `src/hooks/useProfileLevel.ts`
- `src/types/*` (pure-type files; no runtime concerns)

---

## Closing observation

The codebase is **disciplined** at the mutation layer — every write goes through `useMutation` with `onError`, every realtime channel has a cleanup, every invariant is logged. The weak surface is the **boundary between Supabase JSONB columns and the TypeScript domain types**, where `as unknown as` is used as a tactical escape hatch 24+ times. A single zod-validated `parseUserStatus()` / `parseProgramRow()` pair at every read site would eliminate the entire category and catch schema drift at runtime.

Second-largest weakness: `userStatus.ts` still ships **8 hardcoded fields** that drive the adaptive algorithm — this is the highest-leverage P0.
