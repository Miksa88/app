# RALPH_PLAN.md

**Datum:** 2026-04-23
**Verzija:** v1.0
**Cilj:** detaljan plan iteracija po 30–45 min za zatvaranje gap-a iz REPORT_BIOLOGICAL_GAP.md i REPORT_FRONT_BACK_MISMATCH.md.
**Stop conditions:** vidi originalnu instrukciju (255 testova, tsc clean, verify:tokens green, isti bug 3× → escalate).

**Princip prioritizacije:**
1. **DB tabele i migracije pre service-a** (write side ne radi bez tabele)
2. **Service sloj pre UI mutation hooks** (hookovi zovu services)
3. **Mutation hookovi pre UI rewire** (UI komponentama treba mutation API)
4. **Verifikacija (testovi + sanity flow) posle svake iteracije**

**Konvencija:**
- ID: `IT-N` (Iteration N)
- Duration: 30–45 min realnog rada
- Scope: 5–10 fajlova
- Acceptance: konkretne tačke
- Test coverage: novi vitest + ručni sanity
- Dependencies: koji ID-evi moraju biti gotovi pre

---

## FAZA A — Baseline persistence (BLOCKER) — 6 iteracija

Cilj: imati DB tabele za istoriju i pause events. Bez ovoga ništa drugo ne može.

### IT-1 — Migracija: `weight_logs` + `daily_check_ins` tabele

**Scope:**
- `supabase/migrations/<timestamp>_create_check_in_tables.sql`
- `weight_logs` (id, user_id, weight_kg, logged_at, source enum=auto/manual/wearable)
- `daily_check_ins` (id, user_id, date PK part, sleep_hours, stress_level, energy_level, water_intake_ml, cycle_day nullable, notes)
- RLS: vlasnik CRUD svoj, trener SELECT svojih klijentkinja
- Indexes: `(user_id, date DESC)` za MA5 lookup

**Acceptance:**
- `mcp__supabase__list_tables` vraća obe tabele sa RLS
- `npm run typecheck` clean (zatim `supabase gen types` regen u IT-1.1)
- 0 advisors lints za nove tabele

**Tests:** sanity SQL `SELECT * FROM daily_check_ins LIMIT 0`

**Deps:** —

**Status:** pending

---

### IT-2 — Migracija: `weekly_check_ins` + `pause_events` + `water_logs`

**Scope:**
- `weekly_check_ins` (id, user_id, week_start_date, weight_avg, waist_cm, hip_cm, thigh_cm, energy_avg, identity_score 1-5, notes)
- `pause_events` (id, user_id, pause_type enum, start_date, end_date nullable, is_active, recovery_penalty, penalty_sessions_remaining, notes)
- `water_logs` (id, user_id, logged_at, ml_added) — append-only, dnevni rollup u view
- RLS: vlasnik CRUD svoj, trener SELECT
- Sve sa updated_at trigger-om

**Acceptance:** isto kao IT-1; 3 tabele potvrđene

**Tests:** sanity insert/select preko Supabase studio

**Deps:** —

**Status:** pending

---

### IT-3 — Migracija: `exercise_progress` (set logs) + `food_items`

**Scope:**
- `exercise_progress` (id, user_id, exercise_id FK, workout_session_id, set_number, weight_kg, reps, rir nullable, completed_at) — istorija za DPO
- `food_items` (id, name, name_sr, calories, protein, carbs, fat, fiber, glycemic_index enum, ingredients[], allergens[], tags[], meal_slots[], created_at)
- Migracija seed: pretoči `src/data/foodDatabase.ts` u `food_items` insert (može Edge Function ili `supabase db push --include-data`)
- RLS: exercise_progress vlasnik CRUD; food_items SELECT za sve, INSERT/UPDATE samo trener role

**Acceptance:**
- `food_items` ima >= 100 redova (pretoči FOOD_DATABASE)
- `exercise_progress` ima index `(user_id, exercise_id, completed_at DESC)` za DPO lookup

**Tests:** ručni count

**Deps:** IT-1, IT-2 (migracije se primjenjuju redom)

**Status:** pending

---

### IT-4 — Edge Function: `process-daily-check-in`

**Scope:**
- `supabase/functions/process-daily-check-in/index.ts`
- Input: `{ clientId, date, weightKg, sleepHours, stressLevel, energyLevel, waterIntakeMl, cycleDay? }`
- Logic:
  1. Insert u `daily_check_ins`
  2. Insert u `weight_logs` (`source='manual'`)
  3. Računaj MA5 iz poslednjih 5 weight_logs unosa (skip dane 1-5 menstrual ako je cycleDay 1-5 jer su weights nepouzdani)
  4. Load UserStatus
  5. Call `applyDailyCheckIn(status, checkIn)` (postojeća pure)
  6. Save UserStatus (kao service_role da bypass RLS)
  7. Vrati novi UserStatus
- Pure helper: `src/utils/db/movingAverage.ts` koji radi MA5 sa skip dana

**Acceptance:**
- E2E test: insert weight 60kg dan 1, 61 dan 2, 60 dan 3, 60 dan 4, 60 dan 5 (svi non-menstrual) → MA5 vraća 60.2
- `currentWeightMA5` u user_status posle Realtime push-a vraća 60.2
- Stari syncEngine mock cleanup (linije 74-78 → koristi istoriju)

**Tests:**
- `movingAverage.test.ts` (pure: 4 case-a — insufficient data, normal, with skip, all skip)
- E2E ručni: poslati POST i pratiti Realtime na useUserStatus subscription

**Deps:** IT-1

**Status:** pending

---

### IT-5 — Mutation hook: `useDailyCheckIn(clientId)`

**Scope:**
- `src/hooks/mutations/useDailyCheckIn.ts`
- React Query `useMutation` koji POST-uje na `/functions/v1/process-daily-check-in`
- Optimistic update: postavi loading state, posle uspeha pusti Realtime da osveži
- Error handling: toast.error sa porukom

**Acceptance:**
- Hook tip ispravan, exposuje `mutate`, `isLoading`, `error`
- Test sa mock Supabase client

**Tests:** `useDailyCheckIn.test.ts` (mock fetch, assert call args + state transitions)

**Deps:** IT-4

**Status:** pending

---

### IT-6 — UI: Daily check-in modal/sheet u Home.tsx

**Scope:**
- Nova komponenta `<DailyCheckInSheet>` u `src/components/checkin/`
- Otvara se sa „Jutarnji check-in" CTA na Home tab-u (samo ako je dan već završen ili nije bilo unosa danas)
- Polja: weight (decimal), sleep hours (slider 0-12), stress (1-5 segmented), energy (1-10 slider), water (čaše +/-), cycle day ako je tracker aktivan
- Submit zove `useDailyCheckIn().mutate()`
- Posle uspeha: zatvara sheet, ConfettiCelebration mini, banner se pojavi ako sync rule trigger-uje (Hydration First, Fatigue, Luteal)
- Use existing tokens (BottomSheet, GradientButton, Input)

**Acceptance:**
- Manual smoke: otvori app, klikni „Jutarnji check-in", popuni, submit, vidi banner ako stres=5 + san=4 (Fatigue Sync)
- 255 + novi testovi prolaze
- a11y: form labels, role=dialog na BottomSheet

**Tests:** snapshot/render test za otvoreni sheet (vitest + RTL ako postoji)

**Deps:** IT-5

**Status:** pending

---

## FAZA B — Workout completion loop (BLOCKER) — 4 iteracije

Cilj: cela petlja od „start workout" → „log set" → „finish workout" radi sa pravim queue advance-om.

### IT-7 — Edge Function: `process-workout-completion`

**Scope:**
- `supabase/functions/process-workout-completion/index.ts`
- Input: `{ clientId, sessionId, completedAt }`
- Logic:
  1. Load UserStatus
  2. Validate `queue.sessions[pointer].sessionId === sessionId`
  3. Call `advancePointerAfterCompletion(queue, completedAt)` (postojeća pure)
  4. Decrement `returnFromBreakCountdown[partition]` ako >0
  5. Decrement `activePauseEvent.penaltySessionsRemaining` ako illness aktivan
  6. Run `runSyncRules(status)` (rebuild calorie target, isInReturnFromBreak setter)
  7. Save UserStatus
  8. Emit `WORKOUT_COMPLETED` event

**Acceptance:**
- queue.sessionPointer napreduje za 1
- partitionLastSeen[partition] dobija današnji datum
- Ako je RFB countdown bio 2, postaje 1
- isInReturnFromBreak = (countdown > 0 za bilo koju particiju)

**Tests:** E2E sanity + 3 case-a u `processWorkoutCompletion.test.ts`

**Deps:** IT-1 (UserStatus radi)

**Status:** pending

---

### IT-8 — Mutation hook + Loading Sloj 4 (DPO)

**Scope:**
- `src/utils/training/dpoCalculator.ts` — pure funkcija `calcNextWeight(history, exercise, loadingMode, RFB)`:
  - PROGRESS: ako poslednja sesija hit-ovala top reps → +`weightIncrement`; ako je underperformed → ostaje
  - MAINTAIN: ostaje isto
  - MINI_DELOAD: -10% (RFB aktivan: -20%)
  - Početna težina (no history): `estimateInitialWeight(profile, exercise)` heuristic (BW × ratio za compound, fixed za izolacije)
- Replace placeholder u `programGenerator.ts:325` — sad popuni `targetWeight` na svaki slot
- `src/hooks/mutations/useFinishWorkout.ts` — POST na process-workout-completion
- `src/hooks/mutations/useCompleteSet.ts` — INSERT u `exercise_progress` direktno (RLS dozvoljava klijentkinji)

**Acceptance:**
- Test: history sa 3 setova × 8 reps na 50kg → next sa 52.5kg ako je top reps hit
- Test: RFB aktivan + MINI_DELOAD → -20% od last weight
- ActiveWorkout.tsx pokazuje pravi targetWeight (ne placeholder)

**Tests:**
- `dpoCalculator.test.ts` (5 case-a — first time, hit top, miss top, RFB, illness combo)
- programGenerator test ažuriran

**Deps:** IT-3 (exercise_progress tabela), IT-7 (workout completion service)

**Status:** pending

---

### IT-9 — UI: ActiveWorkout.tsx wired na real data

**Scope:**
- `src/pages/ActiveWorkout.tsx` čita `useNextSession + generateSessionSkeleton`
- Renderuje slot.targetWeight / targetReps / targetRIR / targetRest
- „Done set" dugme zove `useCompleteSet().mutate({weight, reps, rir})`
- „Finish workout" zove `useFinishWorkout().mutate(sessionId)`
- Posle finish: navigate na `/post-workout`
- PostWorkout pokazuje summary iz `exercise_progress` poslednje sesije

**Acceptance:**
- Manual: complete jedan trening, queue.sessionPointer napreduje, exercise_progress ima nove redove
- 255 + novi testovi prolaze
- Haptic na `completeSet` i `finishWorkout`

**Tests:** sanity (vitest sa mock useMutation)

**Deps:** IT-8

**Status:** pending

---

### IT-10 — Swap mutation + UI

**Scope:**
- `src/hooks/mutations/useSwapNextSessions.ts` — proverava canSwapNextTwoSessions, ako OK INSERT u user_status sa updated queue (kroz Edge Function ili klijentska mutation ako sloj dozvoli; preferiraj edge `swap-next-sessions` zbog RLS)
- Gym.tsx swap dugme wired
- Toast „Sledeća dva treninga zamenjena" sa undo (window 30s)

**Acceptance:**
- Manual: 2× swap u istom mikrociklusu → drugi se odbija sa porukom
- Full Body templates: dugme nije prikazano (canSwap vraća not allowed)

**Tests:** existing canSwap test (već prolazi 100%)

**Deps:** IT-7 (process service skeleton)

**Status:** pending

---

## FAZA C — Nutrition write loop + Food.tsx rewire (BLOCKER) — 4 iteracije

### IT-11 — Edge Function: `process-meal-log` + Metabolic Noise writer

**Scope:**
- `supabase/functions/process-meal-log/index.ts`
- Input: `{ clientId, mealId, slotIndex, status, calories, protein, carbs, fat, wasLiquidCalories?, replacementMealId? }`
- Logic:
  1. Insert u `meal_logs`
  2. Aggregate poslednjih 24h liquid kcal: SELECT SUM(calories_actual) WHERE was_liquid_calories=TRUE AND logged_at > now() - 24h
  3. If liquid_total / currentCalorieTarget > 0.10 → set `nutrition.isMetabolicNoiseTriggered = true`
  4. Run `runSyncRules` (Rule 6 će postaviti `_blockProgressionUntil = +3 dana`)
  5. Increment `redFlags.skipCount7d` ako status='skipped'
  6. Save UserStatus
  7. Emit `MEAL_LOGGED` event

**Acceptance:**
- E2E: log 3 čaše Coca-Cola po 200kcal sa was_liquid_calories=true → isMetabolicNoiseTriggered=true ako je daily target ~1800 kcal (600/1800 = 33% > 10%)
- Banner se pojavi (useSyncEvents detektuje `_blockProgressionUntil`)

**Tests:** `processMealLog.test.ts` (3 cases — normal, liquid trigger, skip increment)

**Deps:** IT-1 (UserStatus + RLS service_role)

**Status:** pending

---

### IT-12 — Mutation hooks: useLogMeal + useReplaceMeal + useLogWaterGlass

**Scope:**
- `src/hooks/mutations/useLogMeal.ts` — POST na process-meal-log sa status='logged'
- `useSkipMeal` (status='skipped'), `useReplaceMeal` (replacementMealId)
- `useLogWaterGlass(clientId)` — direktan INSERT u `water_logs` (klijentkinja CRUD svoje, RLS OK), pa update UserStatus.nutrition.hydrationTodayMl kroz Edge Function ili klijent compute (preferiraj klijent: SUM today's ml, save flag)

**Acceptance:**
- Hook unit testovi
- 255 + novi testovi prolaze

**Tests:** `useLogMeal.test.ts`, `useLogWaterGlass.test.ts`

**Deps:** IT-2, IT-11

**Status:** pending

---

### IT-13 — Food.tsx rewire na real UserStatus + DB foods

**Scope:**
- Replace `MOCK_CLIENT` sa `useUserStatus(clientId)` derive ClientProfile
- Replace `FOOD_DATABASE` (statički import) sa `useFoodItems()` hook (SELECT iz food_items)
- `generateMealPlan` poziv preko nove derive funkcije
- Replace lista koristi `filterFoodByExclusions(allFoods, exclusionsFromUserStatus)` — pravi anti-ingredient filter sa stvarnim klijent profilom
- Eat/skip/replace dugmad pozivaju useLogMeal/useSkipMeal/useReplaceMeal
- IR klijentkinje: poziv `applyIRMealStructure` ako `metabolicFilter.includes('insulin_resistance')`

**Acceptance:**
- Manual: ulogovati se kao klijentkinja sa hashimoto + alergija na gluten → meals iz baze ne sadrže gluten
- IR klijentkinja vidi „Mini-obrok (P+F)" za slot 2 i 4
- Eat dugme uplaćuje meal_logs zapis

**Tests:** `Food.tsx` snapshot pre/posle, plus integracioni test sa mock useUserStatus

**Deps:** IT-3 (food_items), IT-12 (mutations)

**Status:** pending

---

### IT-14 — Hydration UI + +500ml trening dan

**Scope:**
- `src/utils/nutrition/hydration.ts` — pure `calcHydrationTarget(weightKg, isTrainingDay)` → +500ml ako isTrainingDay
- `useHydration(clientId)` hook — derive trenutni progress, target, čaše
- Home.tsx water widget: dugme „+1 čaša" zove useLogWaterGlass + optimistic local state
- initUserStatus + processDailyCheckIn poštuju is_training_day flag (derive iz queue.sessions[pointer-1] današnji datum)

**Acceptance:**
- 70kg klijentkinja na trening dan → target 2950 ml (2450 + 500)
- Manual: kliknuti +1 5×, water_logs ima 5 redova

**Tests:** `hydration.test.ts` (4 case — base, training day, edge weight, fractional kg)

**Deps:** IT-2 (water_logs), IT-12

**Status:** pending

---

## FAZA D — Mesocycle lifecycle + Pause + Trainer (HIGH) — 4 iteracije

### IT-15 — Mesocycle lifecycle service: kraj queue + deload week

**Scope:**
- `src/utils/training/mesocycleLifecycle.ts` (pure):
  - `handleMesocycleEnd(queue, profile)` — vraća novi queue za sledeći mezo + injekcija deload nedelje (4. nedelja postaje deload: setsRange ↓50%, intenzitet -10%)
  - `shouldStartDeload(currentMicrocycleIndex, mesocycleWeeks)` boolean
- Edge Function `mesocycle-tick` (cron jednom dnevno):
  - Za sve klijentkinje: ako pointer >= sessions.length → call handleMesocycleEnd
  - Ako shouldStartDeload → setuj `training.isInDeload = true` (sync će prebaciti nutrition)
  - Posle deload nedelje → `isInDeload = false`

**Acceptance:**
- Test: queue od 16 sesija sa pointer=16 → novi queue 16 sesija sa deload week 13-16
- isInDeload setter trigger Sync Rule 3 (deload sync)

**Tests:** `mesocycleLifecycle.test.ts` (5 cases — mid mezo, end mezo, deload week start/end, lean_bulk preserved)

**Deps:** IT-1

**Status:** pending

---

### IT-16 — Pause events: startPause/endPause + illness penalty u recovery

**Scope:**
- Edge Function `start-pause` i `end-pause` (mutate `pause_events` + UserStatus.training.activePauseEvent)
- `src/hooks/mutations/useStartPause.ts`, `useEndPause.ts`
- **Bugfix:** `calcRecoveryMultiplier` prima novi opcioni param `illnessPenalty?: number` koji oduzima od baseline-a; syncEngine prosleđuje `activePauseEvent.type === 'illness' ? -0.15 : 0`
- Profile.tsx „Pauza" dugme postavlja sheet sa izborom illness/travel + datum start

**Acceptance:**
- Test: illness aktivan + sleep=8 + stress=2 → recovery = 1.07 - 0.15 = 0.92 (umesto 1.07)
- Sync Rule 7 (illness deficit 0.95) trigger-uje se
- Posle 2 sesije, penaltySessionsRemaining = 0 → illness se auto-završava

**Tests:** `recoveryCalibration.test.ts` ažuriran sa illness case-om

**Deps:** IT-2 (pause_events), IT-7 (workout completion decrement)

**Status:** pending

---

### IT-17 — Weekly check-in stranica + processWeeklyCheckIn

**Scope:**
- `src/pages/WeeklyCheckIn.tsx` — forma sa weight (avg poslednjih 3 dana auto-prefill iz weight_logs), waist/hip/thigh cm, energy 1-10, identity score 1-5, notes textarea
- Edge Function `process-weekly-check-in`:
  1. Insert weekly_check_ins
  2. Compute weeklyWeightDelta iz current MA5 vs prošla nedelja MA5
  3. Run trendline adaptation: ako delta neočekivana (npr. fat_loss klijentkinja gubi >1kg/sed → relax 50kcal; ako gubi <0.3kg → tighten 100kcal); ALI ne adaptiraj ako `weightDataReliable=false` (menstrual)
  4. Reset `redFlags.daysSinceLastWeeklyCheckIn = 0`
  5. Update `nutrition.daysSincePlanChange`
- Cron banner u Home: „Vreme je za nedeljni check-in" ako daysSinceLastWeeklyCheckIn > 7

**Acceptance:**
- Manual: kompletirati weekly check-in → daysSincePlanChange = 0
- Tests sa 3 trendline cases

**Tests:** `processWeeklyCheckIn.test.ts`

**Deps:** IT-2 (weekly_check_ins), IT-4 (MA5 racunar)

**Status:** pending

---

### IT-18 — Trainer clientOverrides UI

**Scope:**
- ClientProfile.tsx (trener view) → nova „Sync Rules Override" sekcija
- Per Sync Rule (8 ukupno) toggle „Active" / „Disabled za ovu klijentkinju"
- Mutation: update UserStatus.clientOverrides (kroz Edge Function `update-client-overrides`)
- Audit: posle promene, log u trener-side audit (može biti samo console za alpha)

**Acceptance:**
- Manual: trener disable-uje hormonal_sync za klijentkinju → luteal phase ne dodaje +150kcal
- 255 + novi testovi prolaze

**Tests:** integracioni test sa mock useUserStatus

**Deps:** IT-1

**Status:** pending

---

## FAZA E — Polish + meal structure (HIGH) — 4 iteracije

### IT-19 — IR meal calorie distribution + integracija u generateMealPlan

**Scope:**
- `IR_MEAL_CALORIE_DISTRIBUTION = { breakfast: 0.28, morning_snack: 0.10, lunch: 0.32, afternoon_snack: 0.10, dinner: 0.20 }` u irMealStructure.ts
- `mealPlanGenerator.generateMealPlan` checkuje `metabolicConditions.includes('insulin_resistance')`:
  - Ako da: koristi IR_MEAL_CALORIE_DISTRIBUTION umesto default 25/12/30/13/20
  - Posle generisanja, prosledi slots kroz `applyIRMealStructure(slots, macros)`
- Test sa IR profilom — 5 obroka, slot 2 i 4 = mini, ostala 3 = main

**Acceptance:**
- IR klijentkinja: kalorija raspodela 28/10/32/10/20%
- Slotovi 2&4 imaju `slotType='mini_meal_ir'` i `carbsTarget=0`

**Tests:** `mealPlanGenerator.test.ts` ažuriran

**Deps:** IT-13

**Status:** pending

---

### IT-20 — i18n keys za sve sync banner-e + UI banner copy

**Scope:**
- Audit useSyncEvents.ts — svaki banner mora imati title + description kroz `t()`
- Dodaj nove keys:
  - `banner.luteal.title/desc`
  - `banner.deload.title/desc`
  - `banner.returnFromBreak.title/desc`
  - `banner.illness.title/desc`
  - `banner.hydrationFirst.title/desc`
  - `banner.metabolicNoise.title/desc`
  - `banner.menstrualWeight.title/desc`
  - `banner.fatigue.title/desc`
- Sve u srpskom (sr-latn) i en-US
- ELI5 zero-guilt copy (nikad „kasniš", „propušteno", „nisi uradila")

**Acceptance:**
- Svaki banner u useSyncEvents prolazi kroz t()
- Manual switch jezika u dev → sve banner-e prevedene
- Verify:tokens još uvek green

**Tests:** sanity grep za hardcoded srpske stringove u banner kod-u

**Deps:** —

**Status:** pending

---

### IT-21 — Exercise library expansion (32 → ~100 vežbi)

**Scope:**
- `supabase/migrations/<ts>_exercises_seed_expansion.sql` — dodati ~70 vežbi
- Strategija: pretagovana lista po `(movementPattern, primaryMuscle, equipment, contraindications)` da pokrije sve spec slot-ove
- Verifikacija: za svaku kombinaciju iz programGenerator slotova, postoji barem 2 kandidata

**Acceptance:**
- `SELECT COUNT(*) FROM exercises >= 100`
- `SELECT movement_pattern, primary_muscle, COUNT(*) FROM exercises GROUP BY 1,2` ima coverage matrici

**Tests:** sanity SQL query

**Deps:** IT-3 (exercises već postoji, samo seed expand)

**Status:** pending

---

### IT-22 — End-to-end smoke test + cleanup

**Scope:**
- Manualni E2E test (možda Playwright ako se postavi):
  1. Onboarding novi user → profile + UserStatus init
  2. Dnevni check-in (weight + sleep + stres + voda)
  3. Vidi banner ako sync rule aktiviran
  4. Otvori Gym, start workout, complete sve setove, finish
  5. Queue pointer napredovao
  6. Otvori Food, pojedi 3 obroka
  7. Vidi sync banner ako log liquid kcal > 10%
  8. Posle 7 dana — weekly check-in, trendline adaptacija
- Cleanup: ukloni neiskorišćene MOCK_* konstante u Food.tsx, mealPlanGenerator.ts (ostaviti samo MEAL_PRESETS u njegovom delu)
- Update README sa novim flow-om
- Tag git: `ralph-iter-22-beta-baseline`

**Acceptance:**
- Sve 22 iteracije done
- 255+ testovi (verovatno dodatno 40-60 novih) prolaze
- verify:tokens green
- tsc clean
- ručni E2E prošao

**Tests:** ručni smoke + checklist

**Deps:** sve prethodne

**Status:** pending

---

## NICE-TO-HAVE (post-beta, ne ulaze u Ralph)

| ID | Stavka | Iteracija |
|---|---|---|
| N-A | Refeed day algoritam (1 dan TDEE×1.0 + carbs +30%) | post |
| N-B | Identity Check-in pitanje + score adaptacija | post |
| N-C | Level-up sistem (beg → int) + manual override | post |
| N-D | 6-phase cycle granularity | post |
| N-E | Pre/Post workout meal switching | post |
| N-F | EventBus production swap (Supabase Realtime) | post |
| N-G | Combo IR+Hashimoto auto-relax | post |
| N-H | Trainer timeline view | post |

---

## Sumarni overview

```
FAZA A — Baseline persistence  →  IT-1..IT-6   (6 iteracija)  BLOCKER
FAZA B — Workout completion    →  IT-7..IT-10  (4 iteracije)  BLOCKER
FAZA C — Nutrition write loop  →  IT-11..IT-14 (4 iteracije)  BLOCKER
FAZA D — Lifecycle + trener    →  IT-15..IT-18 (4 iteracije)  HIGH
FAZA E — Polish + smoke         →  IT-19..IT-22 (4 iteracije)  HIGH
                                 ─────────────
                                 22 iteracije
                                 ~14h kumulativno (30-45 min × 22)
                                 Realno sa QA round-trip-ima:
                                 22-32h aktivnog rada
```

**Quota strategy:**
- 22 iteracije sa Agent Teams: 8-12h efektivno (paralelizacija Dev/QA daje ~2× speedup za nezavisne stavke u Faza A i C)
- Checkpoint posle Faze A (IT-6), Faze B (IT-10), Faze C (IT-14) — git tag svakih 3-4 iteracije
- Context monitoring: posle IT-7, IT-14, IT-21 → /context → ako > 70% → checkpoint + clear

**Stop conditions (od originalnog brief-a):**
- 255 testova padaju → instant stop, rollback
- TypeScript errori → stop, fix
- verify:tokens fail → stop, fix
- Isti bug 3× iz QA → escalate
- Context > 70% → checkpoint
- User „stop" / „pauza" → stop
- Ambiguity u specu → pitaj, ne improvizuj

**Decision input za Mihajla (Faza 2):**
- 22 iteracije > 15 → matematički je za **OPCIJU B (Ralph Loop)**
- Većina rada paralelizable: Faza A (DB tabele) može ići paralelno sa drugom polovinom Faze B (DPO calculator je pure, ne zavisi od svih DB-ova)
- Ako mi kažeš **OPCIJA A**, sekvencijalno ide IT-1 → IT-22, oko 22-32h aktivnog rada
- Ako **OPCIJA B**, Dev Team radi IT-1, IT-2, IT-3 paralelno (sve su nezavisne migracije), QA verifikuje posle svake, savings ~30%
- Ako **OPCIJA C**, reci koji ID-evi treba da idu prvi / drugačijim redosledom

---

**Kraj RALPH_PLAN.md**
