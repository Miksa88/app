# REPORT_FRONT_BACK_MISMATCH.md

**Datum:** 2026-04-23
**Verzija:** v1.0
**Cilj:** mapirati nepodudarnost između (a) Supabase šeme, (b) generisanih TS tipova, (c) hookova/services, (d) UI ekrana koji ih čitaju.

---

## 1. Supabase šema (snapshot iz `mcp__supabase__list_tables`)

**Schema `public`** (RLS enabled na svim tabelama):

| Tabela | Redovi | RLS | Sva polja |
|---|---|---|---|
| `profiles` | 1 | ✅ | id, first_name, last_name, email, role, date_of_birth, current_weight, height, goal, job_type, work_schedule, level, avatar_url, created_at, updated_at, **experience_level** (enum), **training_days** (3-5), **primary_goal** (enum), **metabolic_conditions** (text[]), **sleep_hours_avg** (0-14), **stress_level** (1-5), **job_physicality** (enum), **cycle_tracking_enabled**, **last_period_start**, **injuries** (text[]), **allergies** (text[]), **food_dislikes** (text[]) |
| `user_status` | 0 | ✅ | client_id, status_json (JSONB), last_updated_at, created_at, **is_in_deload** (GENERATED), **is_at_risk** (GENERATED), **cycle_phase** (GENERATED) |
| `meal_logs` | 0 | ✅ | id, user_id, meal_id (text), meal_slot_index (0-4), status (logged/skipped/replaced), logged_at, calories_actual, protein_actual, carbs_actual, fat_actual, **was_liquid_calories**, replacement_meal_id, notes, created_at, updated_at |
| `session_templates` | 4 | ✅ | id, name, position (enum), status (active/inactive), is_system_default, trainer_id, skeleton (JSONB), compatible_overlays (enum[]), created_at, activated_at, deactivated_at, updated_at |
| `client_template_assignments` | 0 | ✅ | client_id (PK), assigned_template_id, assigned_at, position, macrocycle_ends_at, created_at, updated_at |
| `exercises` | 32 | ✅ | id, name, name_sr, is_system_exercise, created_by_trainer_id, movement_pattern, primary_muscle, secondary_muscles[], tension_profile, cns_load (1-5), fatigue_index (1-5), equipment[], difficulty, requires_stabilization, contraindications[], gentle_on[], weight_increment, is_bilateral, video_url, instructions, is_glute_builder, is_compound, is_finisher_eligible, created_at, updated_at |

**Postgres advisors (security):**
- `auth_leaked_password_protection` = WARN (HIBP nije aktivan u Auth) — non-blocker za beta
- 0 RLS lints (sve postojeće tabele imaju RLS enable)

---

## 2. TypeScript types vs Supabase šema

### A. Auto-generated `src/integrations/supabase/types.ts`

`gen types typescript` output — 568 LOC, sadrži tipove za sve 6 postojećih tabela. Spot-check:

| Tabela | TS type postoji? | Polja se poklapaju? |
|---|---|---|
| profiles | ✅ Tables.profiles | ✅ pun match |
| user_status | ✅ Tables.user_status | ✅ pun match (status_json je `Json` tip — runtime cast u UserStatus) |
| meal_logs | ✅ | ✅ pun match |
| session_templates | ✅ | ✅ pun match |
| client_template_assignments | ✅ | ✅ pun match |
| exercises | ✅ | ✅ pun match |

**Verdikt:** Auto-generated tipovi su sinhronizovani sa šemom. Kontrola: posle bilo koje DDL migracije, **mora se rerun** `supabase gen types typescript` jer fajl ima napomenu „Do not edit it directly. Regenerate after every schema migration."

### B. Manualni domain tipovi `src/types/userStatus.ts`

`UserStatus` interface (runtime shape JSONB-a) deklariše polja koja **nisu (još) sva pisana**:

| Polje | Tip kaže | Stvarno se piše? |
|---|---|---|
| bio.currentWeightMA5 | number | 🟡 syncEngine setuje `= checkIn.weightKg` (nije MA5) |
| bio.weightTrend | enum | ❌ nigde se ne piše (uvek default `insufficient_data`?) |
| bio.weeklyWeightDelta | number | ❌ nigde se ne piše |
| bio.sleepLast7DaysAvg/stressLast7DaysAvg/hydrationLast7DaysAvgMl | number | 🟡 isto kao MA5 — direktno checkIn vrednost |
| training.queue | MesocycleQueue | ✅ initUserStatus seed + advance |
| training.partitionLastSeen | mapa | ✅ advance helper popunjava |
| training.isInDeload | bool | 🟡 nikad se ne setuje na true (mesocycleLifecycle ne postoji) |
| training.isInReturnFromBreak | bool | 🟡 isti problem (treba derive iz countdown) |
| training.activePauseEvent | obj/null | ❌ pause_events tabela ne postoji |
| nutrition.bmr/tdee/currentCalorieTarget/macros | number/obj | ✅ initUserStatus + recalcCalorieTarget |
| nutrition.metabolicFilter | enum[] | ✅ initUserStatus iz profiles.metabolic_conditions |
| nutrition.isMetabolicNoiseTriggered | bool | ❌ nigde se ne setuje (treba meal_logs aggregator) |
| nutrition.hydrationTodayMl | number | 🟡 syncEngine setuje iz checkIn, ali nema istorija per čaša |
| nutrition.hydrationTargetMl | number | 🟡 init postavlja, nema +500 trening dan modifikator |
| nutrition.measurementWeekActive/Day | bool/num | ❌ nema scheduler-a |
| nutrition.daysSincePlanChange | num | ❌ nema increment-er-a |
| nutrition.activeRefeedDay | bool | ❌ nema setter-a |
| redFlags.* | num | 🟡 calcRedFlags pure postoji, ali samo `incrementEnergyBelowDays` se zaista koristi u syncEngine; ostali nema writers |

**Pravi gap:** tip postoji, ali **mnoga polja su zauvek default** dok ih neki write-side service ne počne da ažurira. Ovo nije TypeScript bug — ovo je nedostatak orchestration sloja.

---

## 3. Hookovi koji gađaju nepostojeće tabele/kolone

| Hook / fajl | Šta gađa | Postoji u DB? | Status |
|---|---|---|---|
| `useUserStatus.ts` | `supabase.channel('user_status:<id>')` postgres_changes | ✅ tabela + Realtime publication treba potvrditi | ✅ ako je publication enabled |
| `loadUserStatus.ts` | `select * from user_status where client_id=$1` | ✅ | ✅ |
| `saveUserStatus.ts` | `upsert user_status` | ✅ | ✅ ali RLS — INSERT/UPDATE namerno nemaju policy za authenticated, samo service_role (vidi migraciju). **GAP**: klijent ne može direktno da piše; potreban Edge Function ili server-side service |
| `useNextSession.ts` | derive iz UserStatus, ne gađa direktno DB | n/a | ✅ |
| `useMesocycleQueue.ts` | derive iz UserStatus | n/a | ✅ |
| `useDailyCalorieTarget.ts` | derive iz UserStatus | n/a | ✅ |
| `useSyncEvents.ts` | derive iz UserStatus | n/a | ✅ |
| `useWeeklyCalendar.ts` | derive | n/a | ✅ |
| `useTrainerDashboard.ts` | `select * from user_status where is_at_risk=true` | ✅ kolona je GENERATED iz JSONB | ✅ |
| `mealPlanGenerator.generateMealPlan` | uvozi statički `FOOD_DATABASE` iz src/data | ❌ nema `food_items` tabele | 🟡 radi sa statičkim za alpha |
| `exerciseLibrary.ts` (`src/utils/db/`) | `select * from exercises` | ✅ | ✅ ali samo 32 vežbe — substitution može da ne nađe kandidata |
| `sessionTemplates.ts` (`src/utils/db/`) | `select * from session_templates where status='active'` | ✅ + UNIQUE INDEX | ✅ |

### Hookovi/komponente koje **nedostaju** za UI flow

| Operacija | Komponenta koja je očekuje | Status |
|---|---|---|
| `useDailyCheckIn(clientId)` mutation | Home.tsx (jutarnja forma) | ❌ |
| `useLogMeal(clientId)` mutation | Food.tsx (mark eaten/skipped/replace) | ❌ (Food.tsx ne loguje u DB) |
| `useStartWorkout(clientId)` | Gym.tsx → ActiveWorkout | ❌ |
| `useCompleteSet(workoutId, setData)` | ActiveWorkout.tsx | ❌ — spec 01 traži DPO history |
| `useFinishWorkout(clientId, sessionId)` | PostWorkout.tsx | ❌ — treba advance pointer |
| `useStartPause(clientId, type)` / `useEndPause` | Profile.tsx | ❌ |
| `useWeeklyCheckIn(clientId)` | nova WeeklyCheckIn stranica | ❌ |
| `useLogWaterGlass(clientId)` | Home.tsx (water widget) | ❌ |
| `useSwapNextSessions(clientId)` | Gym.tsx swap dugme | ❌ |
| `useMutateClientOverride(clientId, ruleName)` | trener UI | ❌ |

---

## 4. UI ekrani sa mock-ovima vs Supabase

### Klijent strana

| Stranica | Stvarno koristi | Mock/legacy? | Verdikt |
|---|---|---|---|
| Home.tsx | useUserStatus + useNextSession + useSyncEvents (kroz banner) | water widget je samo lokalni state | 🟢 mahom real, water = 🟡 |
| Gym.tsx | useUserStatus + useNextSession + useMesocycleQueue + useWeeklyCalendar | swap UI bez backing mutation | 🟢 read real, write 🟡 |
| Food.tsx | **MOCK_CLIENT + INITIAL_PLAN = generateMealPlan(MOCK_CLIENT, MOCK_TEMPLATE, FOOD_DATABASE)** | sve mock | 🔴 niti jedan podatak iz UserStatus / DB |
| ActiveWorkout.tsx | mock weight/reps + lokalni state | sve mock | 🔴 |
| PostWorkout.tsx | mock summary | mock | 🔴 |
| Progress.tsx | parcijalno useUserStatus | grafovi mock | 🟡 |
| Profile.tsx | profile reads (verovatno supabase auth.user-from-context) | settings mock | 🟡 |
| Onboarding | lokalni state, na kraju treba `onSubmit → insert profile + initUserStatus` | service nije wired | 🟡 (treba potvrditi pri završnom checkout-u) |
| Subscription.tsx | mock plan | mock | OK za sad |
| Chat.tsx | mock conversation | mock | OK |
| Milestones.tsx | mock badges | mock | OK |

### Trener strana

| Stranica | Stvarno koristi | Mock? | Verdikt |
|---|---|---|---|
| TrainerDashboard.tsx | useTrainerDashboard (verovatno supabase) | client carousel može biti mock | 🟡 |
| TrainerClients.tsx | client list | mahom trainerMockData | 🟡 |
| ClientProfile.tsx | parcijalno useUserStatus za status sekciju | mahom mock metrika | 🟡 |
| TrainerMessages.tsx | full mock | 🔴 OK za alpha |
| TrainerPayments.tsx | mock | 🔴 OK |
| TrainerAnalytics.tsx | mock chart data | 🔴 OK |
| ProgramEditor.tsx | mock program | 🟡 — wirovanje session_templates write je gap |
| WorkoutEditor.tsx | mock workout | 🟡 |
| ExercisePicker / ExerciseDetail | exercise read iz DB? potrebno potvrditi | 🟡 |
| NutritionTemplateEditor | mock | 🔴 — nema DB tabele za nutrition templates |
| MealPicker | uses `FOOD_DATABASE` statički | 🟡 |
| AddClient.tsx | invitation flow (verovatno mock) | 🟡 |
| TrainerFreeTrial.tsx | mock | OK |
| PackageEditor.tsx | mock | OK |

---

## 5. RLS policies pregled

### `profiles`
- ✅ Public viewable, vlasnik može insert/update svoj
- 🟡 **Trainer view all clients?** — policy „Trainers can view all" postoji za progress photos, ali za profiles ne postoji eksplicitno (verovatno preko `role` flag u SELECT-u na strani aplikacije)
- ⚠️ moglo bi biti potrebno `CREATE POLICY "trainers can view client profiles"` za TrainerClients view

### `user_status`
- ✅ SELECT: vlasnik + trener (komentar u migraciji)
- ⚠️ **INSERT/UPDATE/DELETE: NEMA policy za authenticated** — namerno (Sync Engine = jedini writer kroz `service_role`)
- 🔴 **GAP:** Sync Engine kao Edge Function ne postoji još. Sad bi sav write iz browser-a (anon/authenticated) bio blokiran. Treba odluka: (a) pisati kroz Edge Function `process-daily-check-in`, ili (b) liberalizovati RLS i držati sync engine na frontu (manje sigurno).

### `meal_logs`
- ✅ Klijentkinja CRUD svoje
- ✅ Trener SELECT all
- OK

### `session_templates`
- ✅ SELECT za sve authenticated
- ✅ INSERT/UPDATE od strane custom trener-a samo svoje
- ⚠️ INSERT/UPDATE sistemskih default-a nema policy — samo service_role (OK po dizajnu)

### `client_template_assignments`
- treba potvrditi da ima policy za klijentkinju + trener SELECT, klijentkinja INSERT samo sebi
- (ne videh u spot-check-u, treba pun read migracije)

### `exercises`
- ✅ SELECT za sve
- 🟡 INSERT custom od trener-a — treba potvrditi policy
- ⚠️ za beta sa 32 vežbe — admin treba seed batch da bi se dosglo do ~100

---

## 6. Missing endpoints / Edge Functions

Spec implicira ali ne postoji:

| Endpoint | Potreban za | Status |
|---|---|---|
| `POST /functions/v1/process-daily-check-in` | mutate UserStatus iz Home jutarnje forme | ❌ |
| `POST /functions/v1/process-meal-log` | meal_logs insert + trigger metabolic noise check | ❌ |
| `POST /functions/v1/process-workout-completion` | advance queue + RFB countdown decrement + emit events | ❌ |
| `POST /functions/v1/process-weekly-check-in` | weekly_check_ins insert + trendline adaptation | ❌ |
| `POST /functions/v1/start-pause` / `end-pause` | pause_events tabela | ❌ |
| `POST /functions/v1/swap-next-sessions` | swap mutation | ❌ |
| Cron `daily-decay-rollover` (jednom dnevno) | redFlags.decayRollingCounters + measurementWeek schedule | ❌ |

**Alternativa:** hold service na frontu, ali tada moramo liberalizovati RLS za user_status — što briše „jedini writer" pravilo iz spec-a.

---

## 7. Spec vs DB sažetak

| Kategorija | Spec traži | DB ima | Gap |
|---|---|---|---|
| Profile | 27 polja | ✅ svih 27 | OK |
| UserStatus | JSONB sa puno strukture | ✅ + 3 GENERATED | OK |
| Meal logs | per-meal, was_liquid_calories | ✅ | OK |
| Session templates | 4 sistema + custom + UNIQUE active | ✅ | OK |
| Client assignment | snapshot binding | ✅ | OK |
| Exercises | ~100 pretagovanih | ❌ samo 32 | 🟡 -68 |
| Daily check-ins | dnevni weight/sleep/stress/water/cycle/energy | ❌ tabela nema | 🔴 |
| Weekly check-ins | nedeljni weight/obimi/energy/identity | ❌ | 🔴 |
| Weight logs | dnevni snapshot za MA5 | ❌ | 🔴 |
| Water logs | čaše per day | ❌ | 🟡 |
| Pause events | illness/travel + penalty | ❌ | 🔴 |
| Food items | tagovana baza ~200 | ❌ statički | 🟡 |
| Exercise progress | set logs po vežbi | ❌ | 🔴 (za DPO) |
| Workout sessions | per-instance log | 🟡 nema dedicated tabele (queue session ima `actualWorkoutSessionId` ali bez tabele iza) | 🔴 |
| Nutrition templates | trener-side preset | ❌ nema tabele (mock u kodu) | 🟡 (low priority) |
| Daily/Weekly check-ins audit | event log | ❌ | NICE-TO-HAVE |

---

## 8. Što ovo znači za RALPH plan

Pravi zadatak nije „dovrši logiku" (ona je 80% gotova), već **„dovrši persistencionu i orchestration košuljicu"** koja stoji između čistih funkcija i UI-a:

1. **5 novih DB tabela** + RLS migracije (daily_check_ins, weekly_check_ins, weight_logs, water_logs, pause_events) + pomocne (exercise_progress / set_logs, food_items)
2. **5 service funkcija** (processDailyCheckIn, processMealLog, processWorkoutCompletion, processWeeklyCheckIn, startPause/endPause) — ili kao Edge Functions ili kao klijentske mutations
3. **5 mutation hooks** (useDailyCheckIn, useLogMeal, useFinishWorkout, useWeeklyCheckIn, useStartPause)
4. **MA5 racunar** + integracija u syncEngine (zameniti mock)
5. **Loading Sloj 4** (DPO weight calc) + integracija u programGenerator
6. **Food.tsx full rewire** od MOCK_CLIENT → useUserStatus + DB foods + replace lista preko anti-ingredient filter-a
7. **mesocycleLifecycle service** (kraj queue, deload week, isInDeload setter, isInReturnFromBreak setter)
8. **Hidratacija UI write path** + hydration target +500 trening dan
9. **Weekly check-in stranica + identity score**
10. **Trener override UI** + write mutation za clientOverrides

**Procena: 18–22 fokusirane iteracije po 30–45 min** (vidi RALPH_PLAN.md).

---

**Kraj REPORT_FRONT_BACK_MISMATCH.md**
