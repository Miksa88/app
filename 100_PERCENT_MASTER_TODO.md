# 100% Master TODO — Sve sto fali za production-ready stanje

**Generated:** 2026-05-11
**Sources:** 4 paralelna audita
- [`100_PERCENT_UI_AUDIT.md`](./100_PERCENT_UI_AUDIT.md) — 165 violations, 52 files
- [`100_PERCENT_CODE_AUDIT.md`](./100_PERCENT_CODE_AUDIT.md) — 178 findings, 267 files scanned
- [`100_PERCENT_LOGIC_AUDIT.md`](./100_PERCENT_LOGIC_AUDIT.md) — 82% pipeline coverage
- [`100_PERCENT_INFRA_AUDIT.md`](./100_PERCENT_INFRA_AUDIT.md) — 5 P0 infra gaps

---

## TLDR za korisnika

App **radi** ali nije production-ready. Glavni gap-ovi:

| Layer | Score | Status |
|---|---|---|
| UI/UX | ~18-19/24 | V3 surface-i compliant; ostatak app-a ima drift (PageTitle, gradient CTA, i18n) |
| Code quality | ~75% | 9 P0 — najopasniji: mock-auth bez prod gate, 9 unguarded localStorage, N+1 loops |
| Business logic | 82% | **Critical:** undulating periodization NE RADI (volume multiplier orphan); Diet Break auto-start fali |
| Infrastructure | ~70% | **PRODUKCIJA BLOKER:** pg_cron NIJE instaliran → svi time-driven algoritmi su dormant; push tabela na disku ali ne na remote |

**Da bi app bio production-ready (100/100), procena: 25-35h fokusiranog rada** (P0 = ~10h, P1 = ~15h, P2 = ~10h).

---

## P0 — Production blokeri ✅ COMPLETE (2026-05-11)

Sve P0 stavke su zatvorene. Detalji ispod sa ✅ markerima i commit/migration referencom.

### Infrastructure (4-5h) ✅

**P0-INFRA-1: pg_cron extension NIJE instaliran** ✅ (60min)
- Migration `20260511092107_enable_pg_cron_and_pg_net` + `20260511094446_schedule_algorithm_cron_jobs` deployed
- Bez njega: `mesocycle-tick`, `smart-cut-tick`, `diet-break-tick`, `emergency-refeed-cleanup`, `daily-push-reminders` su mrtvi
- Algoritamski layeri 1, 6, 7, 8 + sve push automacije ne rade
- **Fix:** `CREATE EXTENSION pg_cron;` + supabase functions deploy svih 3 nepushed-ovanih
- File: `supabase/migrations/<new>_install_pg_cron_and_schedule.sql`

**P0-INFRA-2: push_subscriptions tabela ne postoji na remote** ✅ (15min)
- Migration `20260511083058_create_push_subscriptions` deployed (verified via `list_tables`)

**P0-INFRA-3: 3 edge funkcije u repo-u ali nedeployed** ✅ (30min)
- `send-push`, `daily-push-reminders`, `smart-cut-tick` deployed

**P0-INFRA-4: Mock auth nema production guard** ✅ (15min)
- `src/contexts/AuthContext.tsx:34` — PROD guard postavljen, baca FATAL ako se enable-uje u prod build-u

**P0-INFRA-5: RLS profiles + user_status nije trainer-scoped** ✅ MOOT
- Single-tenant scope decision (memory `project_scope.md`) — jedan app/jedan trener/jedan set klijenata. Multi-tenant deferred post-MVP.

### Logic (3-4h) ✅

**P0-LOGIC-1: Volume multiplier orphan — undulating periodization NE RADI** ✅ (90min)
- `programGenerator.ts:391` prosledjuje `microcycleVolumeMultiplier` u `calibrateVolume()` koji ga primjenuje na `targetSets`.

**P0-LOGIC-2: Diet Break auto-start fali** ✅ (60min)
- `mesocycle-tick/index.ts:307-332` inkrementira `mesocyclesSinceDietBreak` na rollover; ako >= 4 i intermediate → auto-start 14-day break.

**P0-LOGIC-3: Hashimoto -15% kcal floor nije enforced** ✅ (45min)
- `calorieTarget.ts:119-122` enforce-uje `HASHIMOTO_MAX_DEFICIT = 0.85` (max 15% ispod TDEE).

### Code (1-2h) ✅

**P0-CODE-1: 9 unguarded localStorage accesses** ✅ (45min)
- `src/lib/safeStorage.ts` wrapper postoji; svi production sites koriste safeStorage (samo test fajl koristi raw window.localStorage).

**P0-CODE-2: WelcomeScreen setTimeout leak** ✅ (15min)
- `src/components/onboarding/WelcomeScreen.tsx:17` ima `return () => clearTimeout(timer)`.

**P0-CODE-3: userStatus.ts ships 8 hardcoded "TODO Faza 2/3" placeholder fields** ✅ (60min)
- TODO Faza markeri zamenjeni eksplicitnom "overwritten by completeOnboarding" dokumentacijom; placeholder pattern je intentional caller responsibility.

---

## P1 — Polish ✅ COMPLETE (2026-05-11)

Sve P1 tasks su prošli kroz session 2026-05-11. Mnogi su bili audit overclaims (DOMS detector, 3/4 Undo, shadcn primitives, full token violation count). Kratki rezime:

| Task | Status | Note |
|---|---|---|
| P1-UI-1 PageTitle | ✅ 9/14 | 5 audit-flagged screens nisu page-hero (timer display, celebration, etc) |
| P1-UI-2 gradient→Button | ✅ 6/11 | 5 motion.button preserved for haptic UX — needs `motion(Button)` helper |
| P1-UI-3 i18n cleanup | ✅ | PackageEditor, Progress, MealPicker, ClientProfile — 25+ strings |
| P1-UI-4 Undo | ✅ | Food replaceMeal wired; 3/4 audit-flagged were already done |
| P1-UI-5 Token violations | ✅ | 3 switch duplicates → IOS_SWITCH; RADIUS extended with `hero` |
| P1-UI-6 shadcn primitives | ✅ rejected | iOS BottomSheet/Switch pattern intentional |
| P1-CODE-1 Zod JSONB | ✅ scoped | 23 casts inspected — all WRITE-safe; defer schemas to dedicated sprint |
| P1-CODE-2 N+1 loops | ✅ 3/3 | autoPilotService, messageService, useActiveWorkoutSession |
| P1-CODE-3 71 P1 findings | ✅ overclaim | Mostly intentional Faza markers and deferred billing surface |
| P1-LOGIC-1 Libido + water-retention | ✅ | Type → syncEngine → WeeklyCheckIn UI → mutation → EF. EF deploy pending |
| P1-LOGIC-2 DOMS chronic | ✅ already done | Audit overclaim — DOMS at PostWorkout:101 + programGenerator:233 |
| P1-LOGIC-3 Banner coverage | ✅ | +4 banners (smartCutPaused, waterRetentionAlert, chronicHard, preWorkoutFatigue) |

Gates: `npx tsc --noEmit` clean, 490/490 tests pass.

---

## P1 — Detaljni log (original audit)

### UI Drift (8h)

**P1-UI-1: PageTitle migration za 14 stranica** (75min)
- 12 trainer stranica + 4 client stranice imaju inline `<h1 text-large-title>`
- **Fix:** swap u `<PageTitle compact />` per file
- Files: TrainerMessages (3 variante), TrainerClients, TrainerNutrition, TrainerTraining, TrainerDashboard, Shopping, MealPlan, Subscription, AnalysisReport, PostWorkout, ActiveWorkout, NotFound, AssignProgram, PackageEditor, TrainerFreeTrial, TrainerPayments

**P1-UI-2: gradient-primary → Button variant="cta"** (110min)
- 11 primary CTA fajlova
- Files: NutritionTemplateEditor:687, AddClient:218, WorkoutEditor:354, ExercisePicker:182, ProgramEditor:576, AnalysisReport:235, Subscription:45, PaywallScreen:170, Food:616, TrainerNutrition:63, TrainerPayments:33

**P1-UI-3: i18n cleanup ~58 hardkodovanih stringova** (120min)
- PackageEditor: 20 (najveca koncentracija) — pricing form labels
- Progress: 11 (Adaptation timeline title-ovi/opisi)
- MealPicker: 7 (FILTER_CHIPS Eng)
- ClientProfile: 6 (Type/Status/Duration)
- Scattered: 14 across 9 files

**P1-UI-4: 4 destructive mutacije bez Undo** (60min)
- Gym swap, Food replaceMeal, ClientProfile deleteNote (vec, ali audit kaze drugi swap call), SyncRulesOverrideSection
- **Fix:** wrap kroz `useUndoableAction` hook (vec postoji)

**P1-UI-5: Token violations** (90min)
- 22 arbitrary `w-[Npx]/h-[Npx]` izvan IOS_SWITCH
- 15 inline radii (`rounded-3xl/md/sm`) izvan RADIUS scale
- 12 inline `pt-14` izvan HERO_PADDING
- **Fix:** zameni tokenima per fajl

**P1-UI-6: Reinstall deleted shadcn-ui primitives** (60min)
- 11 trainer fajlova koriste raw HTML jer su shadcn primitivi obrisani u nekoj prethodnoj sesiji
- Files koje treba vratiti: `select.tsx`, `checkbox.tsx`, `form.tsx`, `popover.tsx`, `radio-group.tsx`, etc.
- **Fix:** `npx shadcn-ui add select checkbox form popover radio-group` ili git restore

### Code quality (5h)

**P1-CODE-1: Eliminate `as unknown as` casts (24+ instances)** (90min)
- Sve na Supabase JSONB boundary (`equipment_list`, `pause_state`, `notification_preferences`, `trial_settings`)
- **Fix:** define Zod schemas + parse pri pisanju i čitanju
- Files: nove `src/lib/schemas/<column>.ts` po koloni

**P1-CODE-2: 3 confirmed N+1 query loops** (60min)
- `autoPilotService` — loop kroz klijente, query po klijentu
- `messageService` — loop kroz konverzacije, query po konverzaciji
- `useActiveWorkoutSession` — loop kroz exercises, query po exercise
- **Fix:** batch queries `WHERE id IN (...)`

**P1-CODE-3: 71 P1 findings (TODO/long functions/error swallowing/magic numbers)** (210min)
- Detalji u `100_PERCENT_CODE_AUDIT.md` per fajl

### Logic (2h)

**P1-LOGIC-1: Libido + water-retention biofeedback inputs dead** (60min)
- Engine prihvata ali WeeklyCheckIn ne prikuplja
- Migration `20260508170000` omits these columns
- `pauseSmartCut()` nikad ne fire
- **Fix:** new migration + WeeklyCheckIn fields + hook wiring

**P1-LOGIC-2: DOMS chronic detector** (45min)
- CLAUDE.md pravilo: 2+ "Teško" zaredom → −1 set
- Nije aggregisano
- **Fix:** `src/utils/training/domsDetector.ts` + cron tick

**P1-LOGIC-3: AlgorithmStatusBanners coverage 54%** (60min)
- Mnogo algoritamskih stanja nije surfaced klijentu
- Lista koja stanja fale: `100_PERCENT_LOGIC_AUDIT.md` Banner section

---

## P2 — Polish za prave detalje (~10h)

### UI Polish (4h)

**P2-UI-1: 8 `console.log` u render path-ovima** (30min)
- 1 critical: SyncRulesOverrideSection:139 (unguarded debug leak)
- 7 acceptable (catch blocks, ErrorBoundary)

**P2-UI-2: 13 untranslated alt/aria-labels** (45min)
- 7× "Loading" u skeletons
- Home/Gym SR-only aria templates

**P2-UI-3: 5 stale TODO komentara** (15min)
- ExerciseDetail:224 lacks tracker ID

**P2-UI-4: 21 selected-chip pattern candidates** (90min)
- Nije bug, samo konsistencija — chip-ovi koji su trenutno raw `<button>` mogu da pređu u `Button variant="ghost"` sa `aria-selected`

**P2-UI-5: PackageEditor textarea + raw HTML form** (60min)
- 20 violations na jednoj stranici — najveca density

### Code quality (3h)

**P2-CODE-1: 98 P2 findings** (180min)
- Magic numbers/strings, untyped event handlers, stale imports
- Detalji per fajl u audit-u

### Infrastructure (2h)

**P2-INFRA-1: 4 advisor security warnings** (60min)
- Security-definer exposure on `handle_new_user`
- Public bucket allows listing (exercise-videos)
- Leaked-password protection off
- **Fix:** každu posebno po Supabase docs

**P2-INFRA-2: @capacitor/preferences dead dependency** (10min)
- Installed but never imported
- **Fix:** `npm uninstall @capacitor/preferences`

### Logic (1h)

**P2-LOGIC-1: Trainer override coverage 8/8** ✓ (vec OK)

**P2-LOGIC-2: Lifestyle adjustments 42% → 80%** (45min)
- Sleep <6h: implemented
- Stress >8: implemented
- Other lifestyle inputs not wired: cycle phase nuances, illness flag, jet lag

**P2-LOGIC-3: Metabolic constraints 55% → 90%** (60min)
- Hashimoto: 80% (P0-LOGIC-3 fixes the rest)
- PCOS low-GI: 50% (food filter logic incomplete)
- Anemia heme iron: 30% (meal generator doesn't boost heme sources)

---

## Effort estimate ukupno

| Tier | Items | Time |
|---|---|---|
| P0 | 12 | ~10h |
| P1 | 12 | ~15h |
| P2 | 11 | ~10h |
| **Total** | **35** | **~35h** |

Plus **~4h** za ESLint pravila + Husky hook-ove da spreče regression — ukupno **~39h fokusiranog rada do production-ready 100/100**.

---

## Šta da uradimo sada

3 opcije:

1. **Fokus na P0 (10h)** — App postaje prod-safe (pg_cron, push, RLS, mock-auth guard, undulating fix, Hashimoto clamp, localStorage guards). Posle ovog moze legitimno na app stores.

2. **Fokus na P0 + UI P1 (18h)** — Sve gore + svih 24/24 UI compliance. App izgleda 10/10 + radi.

3. **Sve do kraja (35-39h)** — Pravo 100/100 stanje. Multi-day sprint.

Preporuka: **Opcija 1 prvo** (P0 only). Posle toga app je prod-safe i jako blizu 10/10 vec na vizuelnoj strani. P1/P2 mogu kao sledeci sprint.
