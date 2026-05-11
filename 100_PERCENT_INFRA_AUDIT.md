# 100% Infrastructure Audit — Complete Inventory

**Date:** 2026-05-11
**Project ID:** `zrjqateswwyeoyfdjswv`
**Region:** Supabase Cloud (remote)
**Auditor:** Claude Opus 4.7 (1M ctx)

---

## Executive Summary

| Metric | Count |
|---|---|
| Public tables | 21 |
| Tables with RLS enabled | 21 (100%) |
| Tables with RLS FORCED | 0 (0%) |
| Total RLS policies (public schema) | 78 |
| Storage buckets | 3 (1 public, 2 private) |
| Storage policies | 10 |
| Edge functions deployed | 13 |
| Edge functions in repo | 15 |
| Edge function deploy gap | **2 missing remotely** |
| DB migrations on remote | 31 |
| Local SQL migration files | 29 |
| Security advisor warnings | 4 |
| Performance advisor warnings | 112,373 char payload (large) |
| Capacitor plugins installed | 8 |
| pg_cron / pg_net extensions enabled | **0 (neither)** |

---

## 1. DB Schema

### Public tables (21)

| Table | Cols | Rows | RLS | RLS Forced | Policy count | Comment present |
|---|---|---|---|---|---|---|
| `client_notes` | 6 | 0 | ✅ | ❌ | 4 | ✅ |
| `client_template_assignments` | 8 | 1 | ✅ | ❌ | 2 | ✅ |
| `daily_check_ins` | 14 | 0 | ✅ | ❌ | 2 | — |
| `exercise_notes` | 6 | 0 | ✅ | ❌ | 5 | ✅ |
| `exercise_progress` | 10 | 0 | ✅ | ❌ | 4 | — |
| `exercises` | 25 | 115 | ✅ | ❌ | 5 | ✅ |
| `food_items` | 17 | 30 | ✅ | ❌ | 4 | — |
| `meal_logs` | 15 | 2 | ✅ | ❌ | 5 | ✅ |
| `messages` | 9 | 0 | ✅ | ❌ | 2 | ✅ |
| `nutrition_templates` | 20 | 0 | ✅ | ❌ | 5 | ✅ |
| `packages` | 14 | 0 | ✅ | ❌ | 2 | — |
| `pause_events` | 11 | 1 | ✅ | ❌ | 2 | — |
| `profiles` | 35 | 7 | ✅ | ❌ | 4 | — |
| `programs` | 10 | 0 | ✅ | ❌ | 5 | ✅ |
| `progress_photos` | 9 | 0 | ✅ | ❌ | 3 | ✅ |
| `session_templates` | 12 | 7 | ✅ | ❌ | 5 | ✅ |
| `user_status` | 7 | 4 | ✅ | ❌ | 5 | ✅ |
| `water_logs` | 5 | 2 | ✅ | ❌ | 4 | — |
| `weekly_check_ins` | 17 | 0 | ✅ | ❌ | 2 | — |
| `weight_logs` | 7 | 0 | ✅ | ❌ | 2 | — |
| `workouts` | 8 | 0 | ✅ | ❌ | 5 | ✅ |

**Total: 21 tables, 269 columns, 78 RLS policies.**

### Missing table: `push_subscriptions`

- Local migration `20260509040000_create_push_subscriptions.sql` defines it with RLS + 4 policies
- Code `src/lib/webPush.ts` references `supabase.from('push_subscriptions')` (lines 79, 104)
- **NOT PRESENT on remote** — verified via `pg_class` check (empty result)
- **Impact: web push subscribe/unsubscribe will fail at runtime → PWA notifications broken on prod**

---

## 2. RLS Gaps & Risks

### 2.1 `profiles` table — overly permissive

```sql
"Public profiles are viewable by everyone": SELECT, role=public, qual=true
"Trainer menja profile klijenata": UPDATE, qual=role='trainer'  -- ALL CLIENTS
```

- Any authenticated user can read **every** profile row (includes PII: weight, height, age, allergies, diagnoses, payment info — `profiles` has 35 columns including biometric data).
- Trainer UPDATE policy lets **any** trainer modify **any** client's profile (no `client_id` ownership scope).

### 2.2 `user_status` — same pattern

```sql
"Trener vidi sve statuse": SELECT all rows where role='trainer'
"Trener menja status klijenta": UPDATE all rows where role='trainer'
```

Any trainer = god mode over all clients. No `assigned_trainer_id` check. **Multi-trainer tenancy is broken.**

### 2.3 No RLS FORCE — superusers bypass

All 21 tables have `relforcerowsecurity = false`. Any function running as `postgres` or `service_role` bypasses RLS. Edge functions correctly use service_role, but `handle_new_user()` SECURITY DEFINER is callable by `anon` and `authenticated` (advisor flagged).

### 2.4 Public-facing INSERT policies with `WITH CHECK = null`

- `exercises.Trener pravi custom vezbe` — INSERT qual=null
- `food_items.Treneri INSERT custom food_items` — INSERT qual=null
- `session_templates.Trener pravi custom template-e` — INSERT qual=null
- `user_status.Klijentkinja kreira svoj status` — INSERT qual=null
- `meal_logs` / `water_logs` / `progress_photos` / `exercise_progress` similar patterns

**Risk:** Any authenticated user can insert rows with arbitrary `trainer_id`, `client_id`, or `created_by_trainer_id`. Should have `WITH CHECK (created_by_trainer_id = auth.uid())` etc.

### 2.5 `handle_new_user()` SECURITY DEFINER public-executable

Advisor lints 0028 + 0029: `anon` AND `authenticated` can execute via `/rest/v1/rpc/handle_new_user`. Revoke EXECUTE from public.

---

## 3. Edge Functions

### 3.1 Deployed remotely (13)

| Slug | verify_jwt | Created (ms epoch) | Consumer code |
|---|---|---|---|
| `process-daily-check-in` | true | 1776985390 | (no direct call found — possibly trigger) |
| `save-user-status` | true | 1776986091 | `useLogMeal.ts`, `useLogWaterGlass.ts` |
| `process-workout-completion` | true | 1776987759 | `useFinishWorkout.ts` |
| `swap-next-sessions` | true | 1777003746 | `useSwapNextSessions.ts` |
| `process-meal-log` | true | 1777004235 | `useLogMeal.ts` |
| `mesocycle-tick` | **false** | 1777023355 | cron (no client invoke) |
| `start-pause` | true | 1777024152 | `useStartPause.ts` |
| `end-pause` | true | 1777024171 | `useEndPause.ts` |
| `process-weekly-check-in` | true | 1777025348 | `useWeeklyCheckIn.ts` |
| `update-client-overrides` | true | 1777025960 | `useUpdateClientOverrides.ts` |
| `auto-confirm-signup` | **false** | 1777214797 | (older — superseded?) |
| `invite-client` | true | 1777907924 | `clientInvitationService.ts` |
| `signup-confirmed` | **false** | 1778072005 | `SignUpSheet.tsx` (latest fix `c3362db`) |

### 3.2 In repo but NOT deployed (2)

- `supabase/functions/daily-push-reminders/index.ts` — cron 08:00 UTC reminder push
- `supabase/functions/send-push/index.ts` — Web Push transport (consumed by other functions)
- `supabase/functions/smart-cut-tick/index.ts` — weekly Smart Cut evaluator (pocetnici.md §3.8)

Wait — 3 missing actually. `smart-cut-tick` is listed in `CLAUDE.md` as wired but is NOT in the remote deploy list. **Algorithm Layer 6 (Smart Cut hierarchy) is non-functional in prod.**

### 3.3 Orphan / suspect

- `auto-confirm-signup` — overshadowed by `signup-confirmed` per commit history (commits `c3362db`, `f2f2fa4`). Candidate for removal once verified.
- `mesocycle-tick`, `smart-cut-tick`, `daily-push-reminders` are cron-only but **pg_cron is NOT installed** (see §13). No scheduler exists to invoke them. **All time-based algorithm layers are dead.**

---

## 4. Migrations

### 4.1 Counts

- Remote migration history: 31 versions
- Local files: 29 SQL files
- Local repo has versions like `20260224142648_cbb56257...` and `20260320154548_f04fe637...` (Lovable scaffold IDs) but remote shows different chronology

### 4.2 Versions on remote NOT in local repo (Lovable scaffold remnants)

```
20260419172300  lovable_profiles_init
20260419172321  lovable_daily_nutrition_logs    ← drops/replaced by 419180100
20260419172347  create_user_status
20260419172433  extend_profiles_and_create_meal_logs
20260419172510  create_session_templates
20260419172605  fix_function_search_path
20260419190430  create_exercises_library
20260423215329  create_check_in_tables
20260423220439  create_weekly_pause_water_tables
20260423224157  create_progress_and_foods_seed
20260424104951  exercises_seed_expansion
20260426221442  create_packages_and_tier_system
20260426233836  create_messages_table
20260426234225  exercise_videos_storage_policies
20260428151909  user_status_write_policies
20260428230329  seed_ivana_template_exercises       ← in repo? probably not
20260428230844  relax_template_unique_for_overlays  ← in repo? probably not
20260428231011  seed_ivana_3_templates_v2           ← in repo? probably not
20260504141636  create_workouts_programs_notes
20260504141715  fix_trigger_search_path
20260504142945  add_nutrition_templates_and_program_assignment
20260504151753  add_trial_settings_to_profiles
20260508121927  update_beginner_3_skeletons_to_pocetnici_protocol
20260508154726  add_pump_and_mood_to_daily_check_ins
20260508171619  add_daily_steps_to_daily_check_ins
20260508172447  fix_pocetnici_swap_matrix_gaps
20260508174004  extend_weekly_check_ins_with_pocetnici_metrics
20260508174121  create_progress_photos_table
20260510174447  add_exercise_notes_table
20260510174529  harden_exercise_notes_function_search_path
20260510215931  add_v3_settings_to_profiles
```

### 4.3 Local migrations NOT yet on remote

- `20260509040000_create_push_subscriptions.sql` — **NOT applied**
- `20260509010000_expand_food_items_seed.sql` — not in remote list
- `20260509020000_add_recipe_fields.sql` — not in remote list
- `20260509030000_seed_recipe_data.sql` — not in remote list

**Sync drift: 4 local migrations have not been pushed to remote.**

### 4.4 Migration timestamps in 2026 (future-dated)

Every migration is dated 2026-02 through 2026-05. Current date is 2026-05-10. This is OK now but means the original Lovable scaffold was authored in this calendar; just note for future archeology.

---

## 5. Auth

### 5.1 Client config (`src/integrations/supabase/client.ts`)

- Uses `localStorage` for session persistence
- `autoRefreshToken: true`
- `persistSession: true`
- No `flowType` set (defaults to `pkce`)

### 5.2 AuthContext (`src/contexts/AuthContext.tsx`)

- **Dual mode:** mock vs real auth via `VITE_DEV_MOCK_AUTH`
- Mock mode creates synthetic User with hardcoded `VITE_DEV_TEST_USER_ID`
- **Risk:** If `VITE_DEV_MOCK_AUTH=true` ships to production, anyone bypasses auth using the seeded UUID. **No build-time guard.** Recommendation: add `if (import.meta.env.PROD && MOCK_AUTH_ENABLED) throw new Error(...)`.

### 5.3 Route guards (`src/App.tsx`)

| Guard | Behavior |
|---|---|
| `RouteGuard` | ErrorBoundary only (no auth) — used for `/`, `/onboarding`, `/analysis` |
| `AuthGuard` | `ProtectedRoute` + ErrorBoundary, no role check |
| `TrainerGuard` | `ProtectedRoute requireRole="trainer"` |

### 5.4 Protected routes inventory

- **Public:** `/`, `/onboarding`, `/analysis`, `*` (NotFound)
- **AuthGuard (client):** `/home`, `/gym`, `/workout/active`, `/workout/complete`, `/food`, `/chat`, `/profile`, `/progress`, `/weekly-check-in`, `/meal-plan`, `/shopping`, `/subscription`
- **TrainerGuard:** `/trainer/*` (24 routes)

### 5.5 Bypass paths

- `/onboarding` is **public** but writes to `profiles` table (via mutations). Anyone with the URL can spam onboarding without auth.
- `/analysis` is **public** but reads computed analysis — depends on session existence; if AuthContext has no user, it will fail silently or render stale data.
- Mock auth as noted above.

### 5.6 Role-fetch lookup race

`ProtectedRoute.tsx` queries `profiles.role` via TanStack Query with `staleTime: 5 min`. If role changes server-side, client won't see it for 5 min. **Privilege downgrade lag.**

### 5.7 Leaked password protection — **DISABLED**

Advisor `auth_leaked_password_protection`: HaveIBeenPwned check is off. Trivially enabled in dashboard.

---

## 6. Storage

### 6.1 Buckets

| Bucket | Public | Notes |
|---|---|---|
| `exercise-videos` | **YES** | Trainer-uploaded exercise demos. Public read OK; the issue is listing. |
| `progress_photos` | NO | underscore version — has 3 policies |
| `progress-photos` | NO | hyphen version — has 2 policies |

**Two buckets for the same logical asset (`progress_photos` vs `progress-photos`).** Likely typo migration. Need to consolidate to one canonical name.

### 6.2 Policies

| Policy | Bucket | Cmd | Risk |
|---|---|---|---|
| `Authenticated read exercise videos` | exercise-videos | SELECT | qual = bucket only; allows LISTING entire bucket (advisor 0025) |
| `Trener delete/update/upload exercise videos` | exercise-videos | DELETE/UPDATE/INSERT | role='trainer' — OK |
| `Users can read own progress photos files` | progress_photos | SELECT | owner-folder match — OK |
| `Users can delete own progress photos files` | progress_photos | DELETE | owner-folder match — OK |
| `Users can upload own progress photos` | progress_photos | INSERT | **qual=null** — anyone can upload anywhere in bucket |
| `Users can upload their own progress photos` | (bucket NULL? or hyphen) | INSERT | **qual=null** — duplicate, no check |
| `Users can view their own progress photos` | progress-photos | SELECT | `auth.uid() = owner` — OK |
| `Trainers can view all progress photos` | progress-photos | SELECT | role='trainer' — OK |

### 6.3 Storage gaps

- Bucket-name duplication (`progress_photos` vs `progress-photos`) — pick one, migrate, drop the other.
- Public listing on `exercise-videos` — switch to `bucket_id = ... AND name = current_setting('storage.filename')` pattern OR just rely on signed/public URLs and remove the SELECT policy.
- Two redundant INSERT policies on progress photos with null WITH CHECK.

---

## 7. PWA / Service Worker

### 7.1 Registration

- `public/sw.js` exists (57 lines)
- Registered from `src/main.tsx` → `void registerServiceWorker()` → `src/lib/webPush.ts:32` → `navigator.serviceWorker.register('/sw.js', { scope: '/' })`

### 7.2 What it does

- `push` event handler — shows `self.registration.showNotification` with payload `{title, body, url, tag, icon}`
- `notificationclick` — focuses or opens window with URL from `event.notification.data.url`
- `install` → `skipWaiting()`
- `activate` → `clients.claim()`
- **No fetch/caching strategy.** This is a notification-only SW. No offline shell, no asset cache, no precache manifest.

### 7.3 Push subscription flow (`src/lib/webPush.ts`)

- Reads `VITE_VAPID_PUBLIC_KEY` for public key
- Subscribes via `PushManager.subscribe`
- **Upserts to `public.push_subscriptions`** — table does not exist on remote (§1)
- Backend `send-push` function exists in repo but is **not deployed** (§3.2)

**Net: PWA push notifications are wired in code but completely non-functional in prod.**

---

## 8. Capacitor Native Bridge

### 8.1 Installed plugins (from package.json)

| Plugin | Version | Wired? | Where |
|---|---|---|---|
| `@capacitor/core` | 8.3.1 | ✅ | `src/lib/native.ts` |
| `@capacitor/cli` | 8.3.1 | dev | — |
| `@capacitor/app` | 8.1.0 | ✅ | `src/lib/native.ts` (state listeners, deep links) |
| `@capacitor/haptics` | 8.0.2 | ✅ | `src/hooks/useHaptic.ts` |
| `@capacitor/keyboard` | 8.0.3 | ✅ | `src/lib/native.ts` |
| `@capacitor/preferences` | 8.0.1 | ❌ | imported nowhere |
| `@capacitor/splash-screen` | 8.0.1 | ✅ | `src/lib/native.ts` |
| `@capacitor/status-bar` | 8.0.2 | ✅ | `src/lib/native.ts`, `src/contexts/ThemeContext.tsx` |

### 8.2 Configuration (`capacitor.config.ts`)

- AppId: `com.fitbyivana.app`
- WebDir: `dist`
- iOS only (no Android config block)
- StatusBar overlays WebView, dark style default
- Splash screen 1500ms with fadeOut 300
- `limitsNavigationsToAppBoundDomains: false` — App Store will require this `true` for production submission

### 8.3 Missing plugins implied by code/spec

- HealthKit — `src/contexts/HealthContext.tsx` exists; no `@capacitor-community/health` or similar in deps. Likely placeholder.
- Camera — none installed; progress photos must use file picker only
- Push — Web Push only, no native iOS APNs plugin (`@capacitor/push-notifications` not installed). iOS native push won't work; only PWA push in browser.
- Local notifications — not installed

### 8.4 `@capacitor/preferences` orphan

Installed but unused — `localStorage` is used directly in AuthContext etc. Either start using `Preferences` for native session storage (recommended for iOS) or remove dep.

---

## 9. Realtime Subscriptions

Channels found via Grep (cleanup pattern: `supabase.removeChannel`):

| Hook | Channel | Cleaned up |
|---|---|---|
| `src/hooks/useUnreadMessages.ts:36` | `messages_unread:${clientId}` | ✅ line 53 |
| `src/hooks/useMessages.ts:52` | `messages:${clientId}` | ✅ line 100 |
| `src/hooks/useUserStatus.ts:65` | `user_status:${clientId}` | ✅ line 86 |
| `src/pages/Food.test.tsx` | (test mock) | N/A |

All 3 production realtime channels properly clean up. **No leaks.**

---

## 10. Env Vars

### 10.1 Referenced in code

| Var | Where | In `.env.example`? |
|---|---|---|
| `VITE_SUPABASE_URL` | `client.ts:5` | ✅ |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `client.ts:6` | ✅ |
| `VITE_SUPABASE_PROJECT_ID` | (only `.env.example`) | ✅ but not consumed in code |
| `VITE_DEV_MOCK_AUTH` | `AuthContext.tsx:27` | ✅ |
| `VITE_DEV_TEST_USER_ID` | `AuthContext.tsx:28` | ✅ |
| `VITE_DEV_TEST_USER_EMAIL` | `AuthContext.tsx:29` | ✅ |
| `VITE_VAPID_PUBLIC_KEY` | `webPush.ts:18` | ✅ |
| `VITE_SENTRY_DSN` | `sentry.ts:13` | ✅ |
| `import.meta.env.MODE` | `sentry.ts:14` | n/a (built-in) |
| `process.env.NODE_ENV` | `invariants.ts:21,25` | n/a |
| `process.env.VITEST` | `invariants.ts:26` | n/a |

### 10.2 Server-side secrets (Edge Functions) per `.env.example`

`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, auto-injected `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

**Cannot verify these are set on remote via MCP.** Manual check required: Dashboard → Edge Functions → Secrets.

### 10.3 Coverage

All client-side `VITE_*` referenced in code are documented in `.env.example`. No missing.

`process.env.NODE_ENV` used in `src/utils/nutrition/invariants.ts` is a Node convention. In Vite this works because Vite shims `process.env.NODE_ENV` at build, but cleaner is `import.meta.env.DEV`.

---

## 11. Build Pipeline

### 11.1 `vite.config.ts`

- Minimal config, port 8080
- `hmr.overlay: false` — masks errors during dev (intentional but loses signal)
- No PWA plugin (`vite-plugin-pwa` absent) — SW must be served from `public/` as-is. Cache headers / versioning is manual.
- No build-time env validation (no `zod` schema for env vars)
- No code splitting hints beyond default Vite behavior

### 11.2 `tsconfig.json` family

- Root `tsconfig.json` is the slack/permissive one: `noImplicitAny: false`, `strictNullChecks: false`
- `tsconfig.app.json`: `strict: false`, target ES2020, JSX react-jsx, includes Vitest globals
- `tsconfig.node.json`: `strict: true`, target ES2022 (vite.config.ts only)

**Risk:** App code is type-loose. Production app runs with `strict: false`, `strictNullChecks: false`, `noImplicitAny: false`. Significant TypeScript safety left on the table.

### 11.3 Scripts

- `npm test` → Vitest
- `npm run test:e2e` → Playwright (chromium only)
- `npm run typecheck` → tsc --noEmit
- `npm run verify` → typecheck + lint + verify:tokens + test
- No `build && preview` smoke in verify chain

---

## 12. Dependency Audit (selected)

| Package | Version | Note |
|---|---|---|
| `vite` | ^5.4.19 | Vite 6 is current; 5.x still maintained |
| `react` / `react-dom` | ^18.3.1 | React 19 GA available; 18.3 supported |
| `@supabase/supabase-js` | ^2.97.0 | recent, fine |
| `@sentry/react` | ^10.49.0 | recent |
| `@tanstack/react-query` | ^5.83.0 | current |
| `react-router-dom` | ^6.30.1 | v7 available; v6 EOL warnings |
| `date-fns` | ^3.6.0 | v4 stable |
| `recharts` | ^2.15.4 | v3 available |
| `embla-carousel-react` | ^8.6.0 | recent |
| `vaul` | ^0.9.9 | v1 stable; consider upgrade |
| `lucide-react` | ^0.462.0 | very recent |
| `zod` | ^3.25.76 | v4 available |
| `react-day-picker` | ^8.10.1 | v9 available |
| `dotenv` (dev) | ^17.4.2 | major version 17 is unusual — confirm not deprecated transitive |
| `jsdom` (dev) | ^20.0.3 | jsdom 25 is current; significant lag |

`@capacitor/preferences` installed but unused — **dead dep**.

**No `npm audit` was run** (network-bound; not invoked here). Run `npm audit --omit=dev` separately.

---

## 13. Supabase Advisor Findings

### 13.1 Security (4 warns)

1. **`public_bucket_allows_listing`** — `exercise-videos` bucket has broad SELECT policy enabling client-side listing of all files. (Storage §6.3)
2. **`anon_security_definer_function_executable`** — `public.handle_new_user()` callable by anon via `/rest/v1/rpc/`
3. **`authenticated_security_definer_function_executable`** — same function callable by authenticated
4. **`auth_leaked_password_protection`** — HaveIBeenPwned check disabled

### 13.2 Performance

Output exceeds token budget (112KB). Not fully read. Expected categories: missing indexes on FKs, unused indexes, multiple permissive policies, slow queries. Manual remediation: Dashboard → Reports → Advisors → Performance.

### 13.3 Extensions — pg_cron and pg_net NOT installed

```sql
SELECT extname FROM pg_extension WHERE extname IN ('pg_cron','pg_net') → []
```

**Critical:** Spec (CLAUDE.md) describes cron jobs (`smart-cut-tick`, `mesocycle-tick`, `daily-push-reminders`) but **no cron extension is enabled**. Time-based algorithm layers are dormant. Either:
- Enable `pg_cron` + create schedule rows
- Or use external scheduler (GitHub Actions, Vercel cron, Supabase platform schedules if available)

---

## 14. P0 Infra Gaps (Top items to fix before launch)

### P0-1: `push_subscriptions` table missing on remote (§1, §7)

Local migration `20260509040000_create_push_subscriptions.sql` not applied. PWA push code reads/writes this table → 500s in prod. **Push notifications completely broken.**

**Fix:** `npx supabase db push` or apply via MCP `apply_migration`.

### P0-2: 3 edge functions in repo but NOT deployed (§3.2)

- `daily-push-reminders` — morning push cron
- `send-push` — Web Push transport (required by every notification path)
- `smart-cut-tick` — pocetnici.md §3.8 weekly evaluator (Algorithm Layer 6)

**Fix:** Deploy via `mcp__claude_ai_Supabase__deploy_edge_function` or `supabase functions deploy`.

### P0-3: pg_cron not installed → all cron-driven algorithm layers dormant (§13.3)

- Smart Cut weekly tick → never fires
- Mesocycle weekly advancement → never fires
- Daily push reminder → never fires
- Diet Break auto-clear after 14 days → never fires
- Emergency Refeed cleanup → never fires

**Fix:** Enable `pg_cron` extension; create schedule rows per `CLAUDE.md` spec. OR wire external cron (GitHub Actions hitting EFs with `x-cron-secret`).

### P0-4: RLS lets ANY trainer access ALL clients (§2.1, §2.2)

`profiles` and `user_status` SELECT/UPDATE for `role='trainer'` are unscoped. Multi-trainer tenancy fails — trainer A reads/writes trainer B's clients.

**Fix:** Add `trainer_id` foreign key to `profiles` (client side) and tighten policy to `EXISTS (... WHERE caller.id = auth.uid() AND profiles.trainer_id = caller.id)`.

### P0-5: Mock auth has no production guard (§5.2)

`VITE_DEV_MOCK_AUTH=true` shipped in `.env.production` would allow anyone to auth as the seeded UUID. **Production sign-in bypass risk.**

**Fix:** In `AuthContext.tsx`, throw if `import.meta.env.PROD && MOCK_AUTH_ENABLED`. Add CI check that production env has `VITE_DEV_MOCK_AUTH=false`.

### P0-6: 4 local migrations not pushed (§4.3)

- `20260509010000_expand_food_items_seed.sql`
- `20260509020000_add_recipe_fields.sql`
- `20260509030000_seed_recipe_data.sql`
- `20260509040000_create_push_subscriptions.sql`

Recipe-detail UI and meal-planner depend on these schema changes; they will fail with column-not-found errors on prod.

### P0-7: `INSERT WITH CHECK = null` on user-writable tables (§2.4)

`user_status`, `meal_logs`, `water_logs`, `progress_photos`, `exercise_progress`, `exercises`, `food_items`, `session_templates` — all let authenticated users insert with arbitrary `client_id`/`trainer_id`. A malicious authenticated user can write rows owned by another user. **Fix:** Add `WITH CHECK (auth.uid() = ...)`.

### P0-8: Two redundant storage buckets `progress_photos` vs `progress-photos` (§6.1)

Conflicting policies on each. Frontend uses one; trainer view uses the other. Consolidate to a single bucket.

### P0-9: `handle_new_user()` SECURITY DEFINER public-callable (§2.5, advisor 0028/0029)

REVOKE EXECUTE FROM anon, authenticated. Only the auth trigger needs it.

### P0-10: TypeScript strict mode disabled app-wide (§11.2)

Long-term reliability gap. Migrate path: turn `strict: true` on, fix violations incrementally per directory. Not blocking launch but accruing technical debt.

---

## File path

Audit written to: `/Users/mihajlotokovic/Desktop/ROOT/flex-femme-fit-main/100_PERCENT_INFRA_AUDIT.md`
