# REPORT_REALITY_CHECK.md

**Datum:** 2026-04-23
**Verzija:** v1.0 (Faza 1 — Dijagnostika)
**Autor:** solo agent (pre Ralph Loop)
**Cilj:** uporediti šta MASTER.md / DESIGN_AUDIT.md tvrde da je urađeno sa stvarnim stanjem koda.

---

## 0. Baseline (potvrđeno trenutno)

| Provera | Komanda | Rezultat |
|---|---|---|
| Vitest testovi | `npm run test` | ✅ **22 files / 255 tests passed** |
| TypeScript | `npx tsc --noEmit` | ✅ clean (exit 0) |
| Token gate | `npm run verify:tokens` | ✅ **All design tokens compliant** (advisory warnings za 3 inline `zIndex` whileDrag — nije hard error) |
| Graphify | `graphify-out/GRAPH_REPORT.md` | ✅ postoji, 2488 nodes / 6685 edges, 207 communities, snapshot 2026-04-23 |
| Supabase | `mcp__supabase__list_tables` | ✅ 6 tabela u `public`: profiles, user_status, meal_logs, session_templates, client_template_assignments, exercises |
| Migracije | `mcp__supabase__list_migrations` | 7 migracija od 2026-04-19 |

**Verdikt baseline-a:** Zelena za sve gate-ove. Sva refaktoriranja iz WS-1..8 stoje. Niko nije razbio postojeće.

---

## 1. WS-1..8 (Design System / iOS Native) — claim vs reality

MASTER.md tvrdi da je 8 work-stream-ova završeno. DESIGN_AUDIT.md v2 ima detaljan progress tracker za Iter 2a–2f.

### Spot-check 5 ključnih fajlova

| Fajl | MASTER tvrdi | Stvarno stanje | Verdikt |
|---|---|---|---|
| [src/index.css](src/index.css) | CSS vars za semantic tokens (light + dark), spacing, motion, shadow tiers, focus-ring, breathe, ios-row-h | ✅ sve postoji, `--macro-protein/carb/fat` blue/orange/yellow (WS-8 v8.1 rotation) potvrđen | OK |
| [tailwind.config.ts](tailwind.config.ts) | tokeni mapirani preko `hsl(var(--X))`, z-index alijasi `z-snackbar:60`, motion durations | ✅ potvrđeno, postoji `xslow` (800ms), `health-move/exercise/stand/sleep` Apple Fitness tokeni | OK |
| [src/lib/motion.ts](src/lib/motion.ts) | `IOS_SPRING.soft/medium/snappy/precise/bouncy`, `MOTION_DURATION.fast/base/slow/xslow`, `STAGGER_DELAY`, `shouldReduceMotion()`, `fadeUp/scaleIn/staggerContainer` | ✅ sve postoji | OK |
| [src/lib/design-tokens.ts](src/lib/design-tokens.ts) | `ICON_SIZE.xs/sm/md/lg/xl`, `Z_INDEX`, `MACRO_COLORS`, `STATUS_SOFT` | ✅ potvrđeno | OK |
| [src/components/ui/](src/components/ui/) shared | `<Card>`, `<MotionCard>`, `<Button variant="cta\|ctaGhost">`, `<SectionLabel>`, `<StatCard layout="apple-health\|centered">`, `<BottomSheet>`, `<TabControl variant="animated">`, `<UserAvatar>`, `<ActionCard>`, `<AlertBanner>`, `<EmptyState>`, `<ConfettiCelebration>`, `<PrivacyBadge>`, `<AchievementOverlay>` | ✅ svi postoje, build clean, koristi se | OK |

### Provera „advisory" warning-a iz verify:tokens

`verify:tokens` ima 13 check-ova (8 hard, 5 advisory). Trenutno:
- `zIndex` warning: 3 mesta — sva 3 su `whileDrag={{ ..., zIndex: 10 }}` (Framer Motion drag animation, ne CSS layout):
  - [src/components/onboarding/ScrollWheelPicker.tsx:118](src/components/onboarding/ScrollWheelPicker.tsx:118)
  - [src/pages/trainer/ProgramEditor.tsx:443](src/pages/trainer/ProgramEditor.tsx:443)
  - [src/pages/trainer/WorkoutEditor.tsx:451](src/pages/trainer/WorkoutEditor.tsx:451)
- Ostalih checks: zelene.

**Verdikt WS-1..8:** ✅ stvarno dovršeno. Vizuelni sloj (tokens, motion, komponente, a11y, iOS HIG, Capacitor scaffolding) je realan.

---

## 2. Algoritamski sloj (01/02/03 specovi) — claim vs reality

Dokumenti tvrde da je „Faza 2/3" pure-funkcijskog sloja implementirana (vidi reference u kodu — `src/utils/training/`, `src/utils/nutrition/`, `src/utils/sync/`).

### Pure compute funkcije (testirane)

| Modul | Fajl | LOC | Test fajl | Spec § | Verdikt |
|---|---|---|---|---|---|
| Recovery Multiplier | [src/utils/training/recoveryCalibration.ts](src/utils/training/recoveryCalibration.ts) | 80 | recoveryCalibration.test.ts | 01 §5 K1 | ✅ pun (san/stres/godine/4 patologije, clamp 0.7–1.1, `mapMultiplierToZone` MEV/MAV/MRV) |
| Decay Calculator | [src/utils/training/decayCalculator.ts](src/utils/training/decayCalculator.ts) | 103 | decayCalculator.test.ts | 01 §5 K6 + §7.5 | ✅ pun (0–3 PROGRESS, 4–7 MAINTAIN, 8+ MINI_DELOAD, RFB countdown 2) |
| Queue Builder | [src/utils/training/queueBuilder.ts](src/utils/training/queueBuilder.ts) | 133 | queueBuilder.test.ts | 01 §4.7 | ✅ pun (linearizuje skeleton × weeks → A1/B1/A2/..., Partition derive) |
| Session Resolver | [src/utils/training/sessionResolver.ts](src/utils/training/sessionResolver.ts) | 339 | sessionResolver.test.ts | 01 §5 K2.5 + Faza 4.3 | ✅ pun + Hibridni shift (`detectAndShiftMissedSessions`) |
| Exercise Substitution | [src/utils/training/exerciseSubstitution.ts](src/utils/training/exerciseSubstitution.ts) | — | exerciseSubstitution.test.ts | 01 §5 K4 | ✅ implementirano (movement+muscle match, contraindikacije, gentleOn fallback, scoring) |
| Program Generator | [src/utils/training/programGenerator.ts](src/utils/training/programGenerator.ts) | 376 | programGenerator.test.ts | 01 §2 + §5 | ✅ orchestrator (Goal Overlay → Substitution → Decay → Volume calibration). **Loading Sloj 4 = placeholder** (vidi GAP) |
| Weekly Calendar Mapper | [src/utils/training/weeklyCalendarMapper.ts](src/utils/training/weeklyCalendarMapper.ts) | — | weeklyCalendarMapper.test.ts | Faza 4.3 | ✅ |
| BMR/TDEE | [src/utils/nutrition/bmrTdee.ts](src/utils/nutrition/bmrTdee.ts) | — | bmrTdee.test.ts | 02 §3.1–3.2 | ✅ Mifflin-St Jeor ženska, activity multiplier 3/4/5 + jobPhysicality |
| Macro Split | [src/utils/nutrition/macroSplit.ts](src/utils/nutrition/macroSplit.ts) | — | macroSplit.test.ts | 02 §4.1–4.4 | ✅ protein 2.0g/kg, fat min 0.9g/kg ili 25% kcal, carbs ostatak |
| Pathology Override | [src/utils/nutrition/pathologyMacroOverride.ts](src/utils/nutrition/pathologyMacroOverride.ts) | 72 | pathologyMacroOverride.test.ts | 02 §4.5 + §5 | ✅ IR (carbs ≤ 23%), PCOS (omega3 2g, GI ≤ 40), Hashimoto (anti-inflammatory flag), Hypertension (Na ≤ 2000mg) |
| Calorie Target | [src/utils/nutrition/calorieTarget.ts](src/utils/nutrition/calorieTarget.ts) | 125 | calorieTarget.test.ts | 02 §3.3 + 03 §3.3 | ✅ idempotentno (rebuild iz baseline-a), floor 1400, sve sync overrides |
| Cycle Phase | [src/utils/nutrition/cyclePhase.ts](src/utils/nutrition/cyclePhase.ts) | 87 | cyclePhase.test.ts | 02 §2.2 | ✅ 4-phase (menstrual/follicular/ovulation/luteal), `calcCycleDay` sa null za >35d |
| Anti-Ingredient Filter | [src/utils/nutrition/antiIngredientFilter.ts](src/utils/nutrition/antiIngredientFilter.ts) | 195 | antiIngredientFilter.test.ts | 02 §2.3 + §5.1 | ✅ hard/soft exclusions + forbidden tags + GI cap, validatePoolSize 8/cat |
| IR Meal Structure | [src/utils/nutrition/irMealStructure.ts](src/utils/nutrition/irMealStructure.ts) | 93 | irMealStructure.test.ts | 02 §6.4 | ✅ slotovi 2&4 → P+F mini-meals, 0 carbs, 3h gap |
| Sync Engine | [src/utils/sync/syncEngine.ts](src/utils/sync/syncEngine.ts) | 412 | syncEngine.test.ts | 03 §3 | ✅ svih 8 Sync Rules, idempotentno (clone + reset transient flags + rebuild target) |
| EventBus | [src/utils/sync/eventBus.ts](src/utils/sync/eventBus.ts) | — | eventBus.test.ts | 03 §5 | ✅ subscribe/emit, parallel handlers, fail-safe |
| Idempotency Guard | [src/utils/sync/idempotencyGuard.ts](src/utils/sync/idempotencyGuard.ts) | — | (sample u syncEngine test) | 03 §3.3 | ✅ |
| Red Flags | [src/utils/sync/redFlags.ts](src/utils/sync/redFlags.ts) | 140 | redFlags.test.ts | 03 §2.1 + §6.2 | ✅ 5 threshold-a, isAtRisk OR-aggregation, 7-day decay |

### Tipovi

| Fajl | LOC | Pokriva |
|---|---|---|
| [src/types/training.ts](src/types/training.ts) | 395 | sve enum-e + Skeleton/SlotPriority/MesocycleQueue/QueuedSession + ShiftHistoryEntry |
| [src/types/nutrition.ts](src/types/nutrition.ts) | 347 | MacroTarget, MealSlot, FoodTag, FoodItem (enriched), CalorieTargetMode, NutritionCyclePhase, DailyCheckIn |
| [src/types/userStatus.ts](src/types/userStatus.ts) | 189 | UserStatus + sub-interfejsi (bio/training/nutrition/redFlags), SyncRuleName enum, UserStatusRow |
| [src/types/events.ts](src/types/events.ts) | 178 | Sve `SystemEvent` varijante iz spec-a 03 §5.1 |

**Verdikt pure funkcija:** ✅ Specovi 01/02/03 imaju **realnu, testiranu implementaciju** za sve glavne biološke pure-data funkcije. Sync Engine je orchestrator koji ih sastavlja.

---

## 3. Hooks + Frontend integracija (read-side)

| Hook | LOC | Spec | Status |
|---|---|---|---|
| `useUserStatus(clientId)` | 99 | 03 §6 | ✅ initial fetch + Supabase Realtime postgres_changes subscription |
| `useNextSession(clientId)` | 33 | 03 §6.4 | ✅ derive iz `queue.sessions[pointer]` |
| `useMesocycleQueue(clientId)` | 24 | 01 §4.7 | ✅ derive iz `status.training.queue` |
| `useDailyCalorieTarget(clientId)` | 66 | 03 §6.1 | ✅ derive sa `hasActiveSync` boolean za UI banner |
| `useSyncEvents(clientId)` | 60+ | 03 §6.6 | ✅ derive listu aktivnih banner-a (luteal/deload/illness/...) |
| `useWeeklyCalendar(clientId)` | — | 03 §6.4 | ✅ derive nedeljni view iz queue |
| `useTrainerDashboard()` | — | 03 §6.2 | ✅ Red Flags filter |

**Spot-check upotrebe u stranicama:**

| Stranica | Real data hook? | Mock fallback? |
|---|---|---|
| [src/pages/Home.tsx](src/pages/Home.tsx) | ✅ `useUserStatus`, `useNextSession` | — |
| [src/pages/Gym.tsx](src/pages/Gym.tsx) | ✅ `useUserStatus`, `useNextSession`, `useMesocycleQueue` | — |
| [src/pages/Food.tsx](src/pages/Food.tsx) | ❌ **MOCK_CLIENT + FOOD_DATABASE statički** | GAP — vidi REPORT_FRONT_BACK_MISMATCH |
| [src/pages/Progress.tsx](src/pages/Progress.tsx) | parcijalno useUserStatus | mock metrika |
| [src/pages/trainer/*](src/pages/trainer/) | mahom mock (`trainerMockData.ts`) | TrainerDashboard koristi useTrainerDashboard kao read |

---

## 4. Mutacioni sloj (write-side) — najveći deo neimplementiran

| Operacija | Postoji? | Komentar |
|---|---|---|
| `loadUserStatus(clientId)` | ✅ | [src/utils/db/userStatus.ts](src/utils/db/userStatus.ts) |
| `saveUserStatus(status)` | ✅ | persist u user_status tabelu |
| `initUserStatus(clientId, profile)` | ✅ | parcijalno (vidi userStatus.test.ts) |
| `processDailyCheckIn(clientId, checkIn)` service | ❌ | spomenut u syncEngine ali ne postoji `userStatusService.ts` |
| `processWorkoutCompletion(clientId, sessionId)` | ❌ | nigde u kodu |
| `processMealLog(clientId, meal)` | ❌ | nigde |
| `processWeeklyCheckIn(clientId, data)` | ❌ | nigde |
| `startPause(clientId, type)` / `endPause` | ❌ | nigde, pause_events tabela ne postoji |
| `runMA5Update(clientId, weightKg)` | ❌ | sync engine direktno setuje `currentWeightMA5 = checkIn.weightKg` (ne računa pravi MA5) |

**Verdikt:** read-side (Realtime + derive iz UserStatus) = 90% gotov. Write-side (mutacije koje pomeraju queue, log-uju obroke, popunjavaju MA5 istoriju) = ~10% gotov. Ovo je glavni gap.

---

## 5. Database stanje

### Postojeće tabele u `public` (sve sa RLS-om — `rls_enabled: true`)

| Tabela | Redovi | Komentar / generated kolone |
|---|---|---|
| `profiles` | 1 | sve onboarding polja (training + bio + allergies + injuries + cycle_tracking_enabled + last_period_start) |
| `user_status` | 0 | full UserStatus u `status_json` JSONB; 3 GENERATED kolone (`is_in_deload`, `is_at_risk`, `cycle_phase`) iz JSONB-a |
| `meal_logs` | 0 | per-meal sa `was_liquid_calories` flag (Sync Rule 6 — metabolic noise) |
| `session_templates` | 4 | seedovani 4 sistema (`SYS_BEG_FB_3`, `SYS_BEG_FB_4`, `SYS_INT_UL_4`, `SYS_INT_LULUL_5`) — UNIQUE INDEX na `(position) WHERE status='active'` |
| `client_template_assignments` | 0 | snapshot binding (Spec 01 §3 Transition pravilo) |
| `exercises` | **32** | pretagovana baza — spec 01 §9 traži ~100 vežbi za MVP. **GAP: -68 vežbi.** |

### Migracije (kronološki)

1. `lovable_profiles_init` (2026-04-19)
2. `lovable_daily_nutrition_logs` — kasnije zamenjena sa per-meal `meal_logs`
3. `create_user_status` — sa 3 GENERATED kolone
4. `extend_profiles_and_create_meal_logs`
5. `create_session_templates` (sa seed-om i UNIQUE INDEX)
6. `fix_function_search_path` (security advisor)
7. `create_exercises_library`

### Tabele koje spec traži ali NE postoje u DB

| Tabela | Spec | Šta čuva | Posledica |
|---|---|---|---|
| `daily_check_ins` | 03 §3.1 | dnevni weight/sleep/stress/water/cycle_day/energy | bez nje sync engine ne može pravi MA5/MA7, sad mockuje |
| `weekly_check_ins` | 02 §10 | nedeljni weight/obimi/energy/identity score | bez nje weekly adaptacija ne radi |
| `pause_events` | 01 §4.8 | illness/travel sa start/end + penaltySessionsRemaining | bez nje illness penalty -0.15 ne može da bude persisted |
| `weight_logs` | implicirano (02 §10 MA5) | dnevni weight log za 5/7-day moving average | sad se piše samo `currentWeightMA5` skalar — istorija se gubi |
| `water_logs` (ili `hydration_events`) | 02 §8.1 | čaše po danu | bez nje istorija hidratacije = jedan flag `hydrationTodayMl` |
| `food_items` | 02 §11 | tagovana baza ~200 jela | sad u `src/data/foodDatabase.ts` (statički, ne DB) |
| `exercise_progress` (ili `set_logs`) | 01 §5 K6 | istorija setova po vežbi za Loading Sloj 4 | bez nje Double Progressive Overload ne može (placeholder ostaje) |
| `pause_events_audit` | 01 §4.8 | audit | optional, low priority |

---

## 6. Neslaganja koja sam našao (claim vs reality)

| Tvrdnja u dokumentaciji | Stvarnost | Severity |
|---|---|---|
| Spec 03 §3.1 „MA5 racuna se posle DailyCheckIn-a" | syncEngine.ts:78 direktno setuje `currentWeightMA5 = checkIn.weightKg` (nije moving average) — komentar sam priznaje da je to mock | **HIGH** — Princip 2 spec-a 02 (avoid Jo-Jo) zahteva pravi trend |
| Spec 03 §3.1 „san/stres/voda → 7-day avg" | sve tri su jednako mockovane (`s.bio.X = checkIn.X`) — nema istorije | **HIGH** za Recovery Multiplier kvalitet |
| Spec 02 §10.4 „Pravilo 7 dana — A/B rotacija + check-in" | `measurementWeekActive` polje postoji u UserStatus, ali nema service-a koji ga pomera kroz 7 dana | **HIGH** — bez ovoga adaptacija je ručna |
| Spec 01 §5 Korak 6 „Double Progressive Overload weight calc" | `programGenerator.ts:325` priznaje placeholder: „Sloj 4 weight/reps/RIR: PLACEHOLDER — Faza 2.4 popunjava sa real exercise history" | **HIGH** — bez ovoga generator vraća samo `loadingNote` string, ne stvarne kg |
| Spec 02 §11 „MVP baza 200 jela" | `src/data/foodDatabase.ts` statički u kodu, ne u DB; broj treba prebrojati | **MEDIUM** — radi ali nije skalirajuće |
| Spec 01 §9 „pretagovana baza ~100 vežbi" | `exercises` tabela: 32 reda | **MEDIUM** — Substitution može bez kandidata na više slot-ova |
| Spec 03 §3.2 Rule 1 „status.nutrition.macros.carbsG += 38" idempotentno | ✅ urađeno korektno (rebuild macros pa dodaj +38, ne akumulira) | OK |
| Spec 03 §6.5 „Anti-Ingredient Filter u Food.tsx Replace listi" | Food.tsx koristi `MOCK_CLIENT + FOOD_DATABASE`, ne pravi profil iz UserStatus + DB | **HIGH** — UI ne odražava stvarne klijent filtere |
| Spec 03 §6.1 „Klijent Dashboard banner za active sync events" | useSyncEvents postoji, SyncEventBanner komponenta postoji u DESIGN_AUDIT (`SyncEventBanner.tsx`) | OK |
| Spec 03 §3.3 „Idempotentnost" | Sync Engine reset-uje transient flags + rebuild calorie target — testirano | OK |
| MASTER §5 i18n „WS-2 placeholder" | `t()` se koristi široko (verifikovano kroz Bash grep), ali §5 sekcija MASTER-a nije popunjena | LOW (process), kod radi |

---

## 7. Šta MASTER ne pominje a postoji u kodu (silent merit)

- `idempotencyGuard.ts` — utility za sprečavanje dupliranog event-a posle Realtime push-a (nije u 03 spec-u, ali defensive QA-grade)
- `detectAndShiftMissedSessions` — Hibridni model iz Faza 4.3 (ne u originalnom 01 spec-u, već iz roadmap-a)
- `weeklyCalendarMapper.ts` — derivacija nedeljnog prikaza iz queue-a + `daysPerWeek` (postoji a 01 spec ne pominje eksplicitno)
- Sentry SDK + `captureError` u ErrorBoundary — ulazna tačka spremna za production telemetriju
- `useScrollRestoration` + `<ScrollManager>` — POP/PUSH/REPLACE scroll handling

---

## 8. Sažetak: Granica „odrađeno vs ostalo"

```
┌──────────────────────────────────────────────────────────────────┐
│  ZELENO (urađeno)                                                │
├──────────────────────────────────────────────────────────────────┤
│  • Design system foundation (WS-1..8) — tokens, motion, a11y     │
│  • Pure compute funkcije (training + nutrition + sync) — testeni │
│  • UserStatus tip + Supabase tabela + Realtime read              │
│  • EventBus skeleton                                             │
│  • Read-side hooks (useUserStatus, useNextSession, ...)          │
│  • Home.tsx + Gym.tsx wired na real data                         │
│  • Sync Engine: svih 8 Sync Rules + idempotentnost               │
│  • Capacitor iOS scaffolding                                     │
└──────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────┐
│  ŽUTO (delimično)                                                │
├──────────────────────────────────────────────────────────────────┤
│  • Exercise library: 32/100 vežbi seedovano                      │
│  • Loading Sloj 4 (DPO): placeholder, vraća samo note string     │
│  • Food.tsx: MOCK_CLIENT umesto stvarnog UserStatus              │
│  • Trainer dashboard: read postoji, mutations mahom mock         │
└──────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────┐
│  CRVENO (nedostaje)                                              │
├──────────────────────────────────────────────────────────────────┤
│  • Service sloj: processDailyCheckIn / processWorkoutCompletion  │
│    / processMealLog / processWeeklyCheckIn / startPause          │
│  • DB tabele: daily_check_ins, weekly_check_ins, pause_events,   │
│    weight_logs, water_logs, food_items, exercise_progress        │
│  • MA5 trendline (sad je skalar, ne moving average)              │
│  • Hidratacija: dnevni log čaša po klijentkinji                  │
│  • Pravilo 7 dana service (measurement week schedule)            │
│  • Identity Check-in (spec 02 §10)                               │
└──────────────────────────────────────────────────────────────────┘
```

**Glavni zaključak:** vizuelni sloj i pure logic su zreli. Glavni gap nije „kod algoritma", već **persistencioni i orchestration sloj** — tabele za istoriju + service funkcije koje pomeraju UserStatus posle svake user akcije.

---

## 9. Provere koje nisu zatvorene u Fazi 1 (rezerva za QA u Fazi 3)

- [ ] Stvarni broj vežbi po (movementPattern, muscleGroup) kombinaciji — da li ima fallback za svaki spec slot
- [ ] Broj jela u `foodDatabase.ts` po category × meal slot kombinaciji
- [ ] Da li RLS policies zaista filtriraju trener vs klijentkinja (postoje policy fajlovi, treba spot-check zapisa)
- [ ] Da li Realtime za user_status ima publication enabled u Supabase (UI hook to očekuje)
- [ ] Da li svi i18n stringovi za sync banner-e postoje u `t()` katalogu

---

**Kraj REPORT_REALITY_CHECK.md**
