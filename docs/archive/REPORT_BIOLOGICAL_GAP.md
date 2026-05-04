# REPORT_BIOLOGICAL_GAP.md

**Datum:** 2026-04-23
**Verzija:** v1.0
**Cilj:** za svaku biološku komponentu iz spec-a 01/02/03 mapirati: (a) šta spec traži, (b) gde je u kodu, (c) status (✅/🟡/❌), (d) prioritet (BLOCKER / HIGH / NICE-TO-HAVE).

**Legenda statusa:**
- ✅ kompletno — pure funkcija + test + integracija u sync engine ili UI
- 🟡 delimično — pure funkcija postoji, ali fali persist sloj ili UI wire-up ili istorija
- ❌ nije — nema implementacije, samo spec tekst

---

## 01_TRAINING_FLOW_MASTER

### A. Workout Queue (pointer-based, ne kalendar) — Sekcija 4.7 + 5 K2.5

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| `MesocycleQueue` tip sa `sessions[]`, `sessionPointer`, `partitionLastSeen`, `returnFromBreakCountdown`, `swapUsedThisMicrocycle` | §4.7 | [src/types/training.ts](src/types/training.ts) (linije ~150–250) | ✅ | — |
| `buildMesocycleQueue(skeleton, weeks)` linearizator | §4.7 | [src/utils/training/queueBuilder.ts](src/utils/training/queueBuilder.ts) | ✅ | — |
| `resolveNextSession(queue)` lookup | §5 K2.5 | [src/utils/training/sessionResolver.ts:32](src/utils/training/sessionResolver.ts:32) | ✅ | — |
| `advancePointerAfterCompletion(queue, today)` post-workout pointer mutation | §5 K2.5 | [src/utils/training/sessionResolver.ts:65](src/utils/training/sessionResolver.ts:65) | ✅ pure funkcija | — |
| **Service**: `processWorkoutCompletion(clientId, sessionId)` koji wraps advance + DB save + emit `WORKOUT_COMPLETED` | §5 K2.5 + 03 §3 | ❌ NE postoji | ❌ | **BLOCKER** |
| `canSwapNextTwoSessions` + `swapNextTwoSessions` (1× po mikrociklusu, susedne, različite particije, ne FullBody) | §5 K2.5 | [src/utils/training/sessionResolver.ts:162](src/utils/training/sessionResolver.ts:162) | ✅ | — |
| **UI swap dugme** wired sa `useSwapSession` mutation hook | §5 K2.5 | ❌ swap UI postoji u Gym.tsx ali bez backing service-a (mock) | 🟡 | HIGH |
| `handleMesocycleEnd(queue)` — kraj queue-a → novi mezo + deload week injekcija | §6.1 | ❌ ne postoji `mesocycleLifecycle.ts` | ❌ | HIGH |
| `detectAndShiftMissedSessions` (Hibridni model za UI calendar view) | Faza 4.3 | [src/utils/training/sessionResolver.ts:270](src/utils/training/sessionResolver.ts:270) | ✅ idempotentno + shiftHistory audit | — |
| Partition tracking u `partitionLastSeen` (Lower/Upper/FullBody) | §4.7 + §5 K6 | UserStatus.training.partitionLastSeen + advance helper popunjava | ✅ | — |

### B. Partition-specific Decay — Sekcija 5 K6 + 7.5

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| `calcDecay(partition, lastSeen, today, returnCountdown)` | §5 K6 | [src/utils/training/decayCalculator.ts:47](src/utils/training/decayCalculator.ts:47) | ✅ pure | — |
| Pravila: 0–3d PROGRESS / 4–7d MAINTAIN / 8+d MINI_DELOAD | §5 K6 | konstante `PROGRESS_MAX_DAYS=3`, `MAINTAIN_MAX_DAYS=7` | ✅ | — |
| Edge: prvi trening particije → PROGRESS (lastSeen===null) | §5 K6 | [decayCalculator.ts:54](src/utils/training/decayCalculator.ts:54) | ✅ | — |
| `shouldActivateReturnFromBreak` (8+d trigger) | §5 K6 | [decayCalculator.ts:82](src/utils/training/decayCalculator.ts:82) | ✅ | — |
| `nextCountdownAfterSession` decrement | §5 K6 | [decayCalculator.ts:95](src/utils/training/decayCalculator.ts:95) | ✅ | — |
| Integracija sa programGenerator: `loadingMode` se prosleđuje slot-ovima | §5 K6 | [programGenerator.ts:240](src/utils/training/programGenerator.ts:240) `resolveLoadingModeForSession` | ✅ | — |
| **Concrete weight/reps/RIR Loading Sloj 4** (Double Progressive Overload sa exercise history) | §5 K6 | ❌ placeholder — `loadingNote` string only | ❌ | **BLOCKER** za real workout |

### C. Recovery Multiplier 0.7–1.1 + MEV/MAV/MRV — Sekcija 5 K1

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| `calcRecoveryMultiplier({sleep, stress, age, conditions})` | §5 K1 | [src/utils/training/recoveryCalibration.ts:29](src/utils/training/recoveryCalibration.ts:29) | ✅ tačno spec formula | — |
| Clamp 0.7–1.1 + assert invariant | §5 K1 | [recoveryCalibration.ts:56](src/utils/training/recoveryCalibration.ts:56) | ✅ | — |
| `mapMultiplierToZone` MEV/MEV_MAV/MAV/MAV_MRV | §5 tabela | [recoveryCalibration.ts:71](src/utils/training/recoveryCalibration.ts:71) | ✅ (granice 0.80/0.95/1.05) | — |
| `calibrateVolume(skeleton, recovery, cyclePhase, returnFromBreak)` interpolacija setsRange | §5 K5 | [programGenerator.ts:181](src/utils/training/programGenerator.ts:181) | ✅ | — |
| Cycle bonus +5% follicular/ovulation, -8% menstrual, -3% luteal | §5 tabela | [programGenerator.ts:208](src/utils/training/programGenerator.ts:208) `cycleBonusForPhase` | ✅ (4-phase mapping; 6-phase fine-grain TODO ako spec eksplicitno zahteva) | NICE-TO-HAVE |
| Return from Break -50% volume na MINI_DELOAD | §7.5 | [programGenerator.ts:197](src/utils/training/programGenerator.ts:197) | ✅ | — |

### D. Return from Break (-20% težina, -50% volumen, 2 sesije) — Sekcija 7.5

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| RFB countdown po particiji (2 sesije) | §7.5 | UserStatus.training.queue.returnFromBreakCountdown + RETURN_FROM_BREAK_INITIAL_COUNTDOWN=2 | ✅ | — |
| Volume -50% u `calibrateVolume` kada `returnFromBreakActive && loadingMode==MINI_DELOAD` | §7.5 | [programGenerator.ts:197](src/utils/training/programGenerator.ts:197) | ✅ | — |
| **Weight -20%** kada RFB aktivan | §7.5 | ❌ Loading Sloj 4 placeholder — weight nije izračunat | ❌ | **BLOCKER** |
| RFB → Nutrition sync (deficit -8% umesto -20%) | 03 Rule 4 | [calorieTarget.ts:87](src/utils/nutrition/calorieTarget.ts:87) `RETURN_FROM_BREAK_DEFICIT=0.92` | ✅ | — |
| `isInReturnFromBreak` flag u UserStatus.training | 03 §2.1 | ✅ tip postoji | OK tip, **🟡 service** koji ga setuje na osnovu countdown-a per partition | HIGH |

### E. Pauza modul (Bolest vs Putovanje) — Sekcija 4.8

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| `PauseEvent` tip sa `pauseType`, `recoveryPenalty`, `penaltySessionsRemaining` | §4.8 | [src/types/training.ts](src/types/training.ts) | ✅ tip | — |
| `pause_events` Supabase tabela | §4.8 | ❌ ne postoji u DB | ❌ | **BLOCKER** za persistencu |
| `startPause(clientId, type)` / `endPause` mutations | §4.8 | ❌ | ❌ | **BLOCKER** |
| Illness penalty -0.15 na recovery multiplier (prve 2 sesije) | §4.8 | UserStatus.training.activePauseEvent + Sync Rule 7 (calorieTarget illness deficit 0.95) | 🟡 sync rule postoji, nije validirano da -0.15 zaista ulazi u recovery (Recovery Calibration ne prima `pausePenalty` parametar) | **HIGH** |
| Travel pauza = nema penalty, samo decay normalan | §4.8 | implicirano (nema kod-a koji posebno hendluje travel) | 🟡 | NICE-TO-HAVE |
| UI „Pauza" dugme na Profile / Home | spec | mock UI postoji u Profile.tsx ali nije wired | 🟡 | MEDIUM |

### F. „Bez krivice" UI — Sekcija 1 Pravilo 5

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| QueueStrip umesto kalendara, prikazuje samo „Sledeća sesija" | 03 §6.4 | ✅ `<QueueStrip>` postoji + `<WeeklyCalendar>` koji NE prikazuje „Propušteno" | ✅ | — |
| Detect & shift missed sessions bez „missed" labela u UI-u | Faza 4.3 | shift `reason: 'missed'` ide samo u audit shiftHistory, ne u UI | ✅ | — |
| Copy ne pominje „kasniš" / „propušteno" | spec | spot-check potreban u Phase 3 QA | 🟡 | LOW |

### G. Level-up sistem (beginner → intermediate) — Sekcija 8

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| Auto-promocija na osnovu lifted weights vs bodyweight | §8 | ❌ nema `levelUpDetector.ts` | ❌ | NICE-TO-HAVE |
| Manual override za trenera | §8 | ❌ | ❌ | NICE-TO-HAVE |

### H. Exercise Library — Sekcija 9

| Stavka | Cilj | Stvarno | Status |
|---|---|---|---|
| Pretagovana baza | ~100 vežbi MVP | **32 vežbe** u DB (`exercises` tabela) | 🟡 -68 |
| Movement pattern coverage | sve iz §4.1 | nedovoljno proverljivo bez popisa | 🟡 |
| Trener može da doda custom kroz dropdown | §3 | ❌ UI postoji (ExercisePicker), ali write-side mutation ne ide do DB-a | 🟡 | HIGH za beta |

---

## 02_NUTRITION_FLOW_MASTER

### A. Anti-Ingredient Filter — Sekcija 2.3

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| `buildIngredientExclusionList(allergies, dislikes, conditions)` hard+soft+forbiddenTags+maxAllowedGI | §2.3 | [src/utils/nutrition/antiIngredientFilter.ts:44](src/utils/nutrition/antiIngredientFilter.ts:44) | ✅ | — |
| `filterFoodByExclusions(foods, exclusions)` | §2.3 | [antiIngredientFilter.ts:111](src/utils/nutrition/antiIngredientFilter.ts:111) | ✅ | — |
| Hashimoto + gluten = forbidden (samo ako u alergijama eksplicitno) | §5.1 fusnota | [antiIngredientFilter.ts:67](src/utils/nutrition/antiIngredientFilter.ts:67) komentar potvrđuje pravilo, ali kod ne dodaje gluten u hard exclusion (čeka da bude u alergijama) | ✅ | — |
| validatePoolSize ≥ 8 jela/category | §11.4 | [antiIngredientFilter.ts:166](src/utils/nutrition/antiIngredientFilter.ts:166) | ✅ | — |
| **UI replace lista koristi pravi filter sa client UserStatus profilom** | 03 §6.5 | ❌ Food.tsx koristi `MOCK_CLIENT` | ❌ | **HIGH** |
| Food database persisted u DB (umesto statički u src/data) | §11 | ❌ `food_items` tabela ne postoji | 🟡 | MEDIUM (radi sa statičkim za alpha) |

### B. Metabolička Matrica (IR / PCOS / Hashimoto / Hipertenzija) — Sekcija 5

| Stanje | Macro override | Tag forbidden | Implementacija | Status |
|---|---|---|---|---|
| **IR** | carbs ≤ 23% kcal, prebaci u masti | high_gi, snack, high_sugar | [pathologyMacroOverride.ts:36](src/utils/nutrition/pathologyMacroOverride.ts:36) + [antiIngredientFilter.ts:78](src/utils/nutrition/antiIngredientFilter.ts:78) | ✅ |
| **PCOS** | omega3 min 2g, GI ≤ 40 | high_gi, high_saturated_fat | [pathologyMacroOverride.ts:49](src/utils/nutrition/pathologyMacroOverride.ts:49) | ✅ |
| **Hashimoto** | anti-inflammatory flag, no math | inflammatory, processed | [pathologyMacroOverride.ts:61](src/utils/nutrition/pathologyMacroOverride.ts:61) | ✅ |
| **Hipertenzija** | Na ≤ 2000mg/dan, K min 3500mg | high_sodium | [pathologyMacroOverride.ts:66](src/utils/nutrition/pathologyMacroOverride.ts:66) | ✅ |
| Combo IR+PCOS „uzmi strožiji" | §5.2 | `Math.min(maxAllowedGI ?? 100, 40)` automatski | ✅ | — |
| Combo Hashimoto+Hipertenzija „kumulira" | §5.2 | oba flag-a se setuju nezavisno | ✅ | — |
| Combo IR+Hashimoto fallback ako pool premali | §5.2 | `validatePoolSize` vraća error, ali nema **automatske relax soft exclusions** strategije | 🟡 | MEDIUM |

### C. IR 5-slot mini-meal arhitektura — Sekcija 6.4

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| Slotovi 2 i 4 → P+F mini, 0 carbs | §6.4 | [src/utils/nutrition/irMealStructure.ts:53](src/utils/nutrition/irMealStructure.ts:53) | ✅ | — |
| 3h razmak (`mealGap: 180`) | §6.4 | [irMealStructure.ts:26](src/utils/nutrition/irMealStructure.ts:26) | ✅ | — |
| Kalorijska distribucija 28/10/32/10/20 (umesto 25/12/30/13/20) | §6.4 | ❌ `IR_MEAL_CALORIE_DISTRIBUTION` konstanta nije implementirana — koristi se default | 🟡 | HIGH |
| Forbidden/allowed tags za mini-meal slotove | §6.4 | [irMealStructure.ts:28](src/utils/nutrition/irMealStructure.ts:28) | ✅ | — |
| **Integracija u `generateMealPlan` pipeline** (zovi `applyIRMealStructure` ako klijentkinja ima IR) | §6.4 | ❌ `mealPlanGenerator.ts` ne koristi `applyIRMealStructure` | ❌ | **HIGH** |

### D. MA5 Trendline + menstrualni preskok — Sekcija 10

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| `currentWeightMA5` polje u UserStatus.bio | 03 §2.1 | ✅ tip + DB JSONB | ✅ | — |
| `recalcMA5(clientId, newWeight)` koja čita istoriju i računa pravi 5-day MA | 03 §3.1 | ❌ syncEngine.ts:78 direktno setuje `= checkIn.weightKg` (komentar priznaje da je mock) | ❌ | **BLOCKER** za adaptaciju |
| `weight_logs` tabela za istoriju | implicirano | ❌ ne postoji | ❌ | **BLOCKER** |
| Skip days 1–5 menstrual u trend racunici (Sync Rule 8 → `weightDataReliable=false`) | 03 §3.2 Rule 8 | ✅ flag se setuje, ali nigde nema MA5 racunara koji bi koristio flag | 🟡 | HIGH |
| `weeklyWeightDelta` derive iz MA5 | 03 §2.1 | ✅ tip postoji, ali bez stvarne istorije = 0 | 🟡 | HIGH |

### E. Hormonal Buffer (luteal +150 kcal) — Sekcija 7.3

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| Luteal +150 kcal additivno na finalni target | §7.3 + 03 Rule 1 | [calorieTarget.ts:97](src/utils/nutrition/calorieTarget.ts:97) `LUTEAL_CARB_BONUS_KCAL=150` | ✅ idempotentno | — |
| Luteal +38g carbs eksplicitno (150/4) na macros | 03 Rule 1 | [syncEngine.ts:194](src/utils/sync/syncEngine.ts:194) `LUTEAL_EXPLICIT_CARB_BONUS_G=38` + IR exception | ✅ | — |
| Menstrual `weightDataReliable=false` Rule 8 | 03 Rule 8 | [syncEngine.ts:377](src/utils/sync/syncEngine.ts:377) | ✅ | — |
| Cycle phase derive iz `lastPeriodStart` | §2.2 | [cyclePhase.ts:25](src/utils/nutrition/cyclePhase.ts:25) `calcCycleDay` (null za >35d) | ✅ | — |
| **DailyCheckIn UI koja klijentkinjski unosi cycleDay** | §2.2 | ❌ u `daily_check_ins` ne postoji DB tabela; UI forma ne postoji | ❌ | **BLOCKER** za hormonalni mod |
| Profile → „Praćenje ciklusa" toggle za naknadno aktiviranje | §2.2 | ❌ nije implementirano | 🟡 | MEDIUM |

### F. Deload-Maintenance Sync — Sekcija 8.2 + 03 Rule 3

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| Deload aktivan → calorie target = TDEE × 1.0 (osim lean_bulk) | §8.2 | [calorieTarget.ts:81](src/utils/nutrition/calorieTarget.ts:81) | ✅ | — |
| `_deloadSyncActive` flag za UI banner | 03 §6.6 | [syncEngine.ts:267](src/utils/sync/syncEngine.ts:267) `applyDeloadSync` | ✅ | — |
| `isInDeload` polje pisuje **training modul** (lifecycle) | spec | ❌ nema servisa koji periodično postavlja `isInDeload=true` na deload nedelje | 🟡 | HIGH (zavisi od mesocycleLifecycle) |
| Refeed (1 dan TDEE × 1.0 + carbs +30%) | §8.2 tabela | ❌ `activeRefeedDay` polje postoji, nema service-a | ❌ | NICE-TO-HAVE |

### G. Hidratacija (30–40 ml/kg) — Sekcija 8.1

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| `calcHydrationTarget(weightKg)` → min/target/max | §8.1 | ❌ nije pure funkcija, koristi se inline u UserStatus.nutrition.hydrationTargetMl | 🟡 | HIGH |
| +500 ml na trening dane | §8.1 | ❌ nije implementirano (target je statičan po klijentkinji) | 🟡 | MEDIUM |
| Hydration First Sync Rule 5 (recovery<0.85 + hydr<70% → 24h block) | 03 Rule 5 | [syncEngine.ts:305](src/utils/sync/syncEngine.ts:305) | ✅ | — |
| `diagnoseEnergyDrop` (hidracija pre makroa) | §8.1 | implicirano kroz Rule 5 (manje precizan) | ✅ | — |
| Per-čaša UI tracker („+1") sa optimističkim apdejtom | §8.1 + 03 §6.5 | ❌ Home.tsx ima vodeni widget ali nije wired na DB / sync | 🟡 | HIGH |
| `water_logs` ili `hydration_events` tabela za istoriju | implicirano | ❌ | ❌ | MEDIUM |

### H. Pravilo 7 dana / Merna nedelja — Sekcija 9 + 10

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| `measurementWeekActive`, `measurementWeekDay` polja | spec | UserStatus.nutrition postoje | ✅ tip | — |
| A/B rotacija meal plan (`generateMeasurementWeek`) | §9.2 | ❌ `mealPlanGenerator.ts` generiše jedan dnevni plan, nema A/B rotacije | ❌ | HIGH |
| Weekly check-in UI + zabeleži weight/obimi/energy/identity | §10 | ❌ ne postoji `WeeklyCheckIn.tsx` | ❌ | **HIGH** |
| `processWeeklyCheckIn` service + Trendline adaptacija | §10 | ❌ | ❌ | **HIGH** |
| Identity Check-in pitanje + identity score 1–5 | §10 | ❌ | ❌ | NICE-TO-HAVE |
| `daysSincePlanChange` brojač (10-day stagnation override) | spec | UserStatus.nutrition polje postoji, nema service-a | 🟡 | MEDIUM |

### I. Metabolic Noise (tečne kalorije) — Sync Rule 6

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| `was_liquid_calories` flag u meal_logs | 03 Rule 6 | ✅ DB kolona u `meal_logs` (sa komentarom u DB-u) | ✅ | — |
| `isMetabolicNoiseTriggered` derive (tečne >10% target-a) | 03 Rule 6 | ❌ nema service-a koji čita meal_logs i postavlja flag | ❌ | HIGH |
| Block progression 3 dana (`_blockProgressionUntil`) | 03 Rule 6 | [syncEngine.ts:340](src/utils/sync/syncEngine.ts:340) `applyMetabolicNoiseBlock` | ✅ pure | — |
| UI warning banner za metabolic noise | spec | useSyncEvents banneri postoje, ovaj specifičan tip treba dodati | 🟡 | MEDIUM |

### J. mTOR distribucija + Nutrient Timing — Sekcija 6.1–6.3

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| MinProteinPerMeal = max(20g, total/5) | §6.1 Zakon 1 | macroSplit.ts računa total, ne enforcuje per-meal min | 🟡 | MEDIUM |
| Pre/Post workout meal switching | §6.3 | `assignWorkoutMealTiming` opisan u spec-u, ne postoji u kodu | ❌ | NICE-TO-HAVE |
| Enzimski redosled `Povrće → Protein → Carbs` napomena | §6.1 Zakon 3 | spec UI tip postoji, ne renderuje se | 🟡 | LOW |

---

## 03_INTEGRATION_LAYER

### A. UserStatus + Sync Engine — Sekcija 2 + 3

| Komponenta | Spec | Implementacija | Status | Priority |
|---|---|---|---|---|
| `UserStatus` tip sa bio/training/nutrition/redFlags | §2.1 | [src/types/userStatus.ts](src/types/userStatus.ts) | ✅ kompletno | — |
| `user_status` Supabase tabela + 3 GENERATED kolone | §2.2 | ✅ migracija primenjena | ✅ | — |
| `runSyncRules(status)` 8 pravila | §3.2 | [src/utils/sync/syncEngine.ts:141](src/utils/sync/syncEngine.ts:141) | ✅ idempotentno + reset transient flags | — |
| `recalcCalorieTarget(...)` idempotent | §3.3 | [src/utils/nutrition/calorieTarget.ts:71](src/utils/nutrition/calorieTarget.ts:71) | ✅ | — |
| `clientOverrides` (trener može da isključi rule) | §2.1 | UserStatus.clientOverrides + isRuleDisabled u syncEngine | ✅ tip + provera | — |
| `applyDailyCheckIn(status, checkIn)` pure transformer | §3.1 | [syncEngine.ts:64](src/utils/sync/syncEngine.ts:64) | ✅ | — |
| **Service `processDailyCheckIn`** (load → apply → save → emit) | §3.1 | ❌ ne postoji `userStatusService.ts` | ❌ | **BLOCKER** |
| Realtime push posle save | §6 | useUserStatus subscribe radi; mutations strana nije implementirana | 🟡 | BLOCKER |
| `loadUserStatus / saveUserStatus / initUserStatus` | spec | [src/utils/db/userStatus.ts](src/utils/db/userStatus.ts) | ✅ | — |

### B. Sync Rules pojedinačno — §3.2

| Rule | Status | Lokacija | Priority napomena |
|---|---|---|---|
| 1 Hormonal (luteal carb +150/+38g) | ✅ | [syncEngine.ts:211](src/utils/sync/syncEngine.ts:211) + [calorieTarget.ts:97](src/utils/nutrition/calorieTarget.ts:97) | OK |
| 2 Fatigue (san<6 ili stres>4 → maintenance) | ✅ | [syncEngine.ts:236](src/utils/sync/syncEngine.ts:236) | OK |
| 3 Deload (training → nutrition maintenance, lean_bulk pošteđen) | ✅ | [syncEngine.ts:267](src/utils/sync/syncEngine.ts:267) | depend na `isInDeload` setter — 🟡 |
| 4 Return from Break (deficit → ×0.92) | ✅ | [syncEngine.ts:287](src/utils/sync/syncEngine.ts:287) | depend na `isInReturnFromBreak` setter — 🟡 |
| 5 Hydration First (block 24h ako recovery<0.85+hydr<70%) | ✅ | [syncEngine.ts:305](src/utils/sync/syncEngine.ts:305) | OK |
| 6 Metabolic Noise Block (3 dana) | ✅ | [syncEngine.ts:340](src/utils/sync/syncEngine.ts:340) | depend na `isMetabolicNoiseTriggered` writer — ❌ |
| 7 Illness Penalty (deficit → ×0.95) | ✅ | [syncEngine.ts:360](src/utils/sync/syncEngine.ts:360) | depend na pause_events tabelu — ❌ |
| 8 Cycle Menstrual (`weightDataReliable=false`) | ✅ | [syncEngine.ts:377](src/utils/sync/syncEngine.ts:377) | OK |

### C. Event Bus — §5

| Komponenta | Spec | Implementacija | Status |
|---|---|---|---|
| `EventBus.subscribe / emit` | §5.3 | [src/utils/sync/eventBus.ts](src/utils/sync/eventBus.ts) | ✅ in-memory |
| Svi `SystemEvent` tipovi | §5.1 | [src/types/events.ts](src/types/events.ts) | ✅ |
| Subscribers registrovani u svakom modulu | §5.2 | ❌ nema `subscribers/` foldera, nema initSubscribers poziva u main.tsx | 🟡 (ima emit, nema subscribe na produktivnom path-u) |
| Production: zameni in-memory sa Supabase Realtime / Redis | §5.3 napomena | implicirano za beta; OK ostavljeno za sad | NICE-TO-HAVE |

### D. Vlasništvo podataka — §4

Tabela vlasnika u spec-u 03 §4 mahom poštovana u kodu (jedan writer per podatak), ali sledeća polja nemaju nijednog writer-a:
- `bio.weeklyWeightDelta` — nigde se ne piše (treba `processWeeklyCheckIn`)
- `nutrition.daysSincePlanChange` — nema increment-er
- `nutrition.activeRefeedDay` — nema setter
- `nutrition.measurementWeekDay` — nema scheduler (treba dnevni cron ili shift kroz processDailyCheckIn)
- `redFlags.skipCount7d` — `calcRedFlags` ima `incrementSkipCount` parametar, ali nigde nije pozvan (treba `processMealLog` da inkrementuje na skip)
- `redFlags.consecutiveFailedWorkouts` — nema writer-a (treba `processWorkoutFailure`)

### E. Frontend mapping — §6

| Stranica | Spec | Stvarno |
|---|---|---|
| Home.tsx — QueueStrip + Hidratacija + identitet + sync banner | §6.1 | ✅ QueueStrip + sync banner; Hidratacija widget ne piše u DB |
| TrainerDashboard.tsx — Red Flags sekcija + brojači | §6.2 | ✅ koristi useTrainerDashboard |
| ClientProfile.tsx — Status sekcija + timeline | §6.3 | 🟡 Status sekcija delimična, timeline nema |
| QueueStrip — `<QueueStrip>` | §6.4 | ✅ postoji, koristi se u Home + Gym |
| Food.tsx — Anti-Ingredient Filter u Replace listi | §6.5 | ❌ koristi MOCK_CLIENT |
| `<SyncEventBanner>` u App.tsx | §6.6 | ✅ postoji + useSyncEvents hook |

---

## SUMARNI GAP — prioritetizovan

### 🔴 BLOCKER (bez ovih ne može produkcija)

| # | Stavka | Modul |
|---|---|---|
| B1 | **Service sloj `processDailyCheckIn`** (load → applyDailyCheckIn → save → emit `WORKOUT_COMPLETED`/banner) — bez ovoga UI ne može da pošalje user akciju | 03 §3.1 |
| B2 | **Service `processWorkoutCompletion`** (advance pointer + RFB countdown decrement + emit + persist) | 01 §5 K2.5 |
| B3 | **Service `processMealLog`** (insert meal_logs + isMetabolicNoiseTriggered set ako liquid >10%) | 03 Rule 6 |
| B4 | **`daily_check_ins` Supabase tabela** + RLS policy | 03 §3.1 |
| B5 | **`weight_logs` tabela + `recalcMA5`** (pravi 5-day moving average) | 03 §3.1 + 02 §10 |
| B6 | **`pause_events` tabela** + `startPause/endPause` mutations | 01 §4.8 |
| B7 | **Loading Sloj 4 — Double Progressive Overload** (weight calc iz progress history, RFB -20%) | 01 §5 K6 |
| B8 | **`exercise_progress` tabela** (set logs po vežbi za DPO) | 01 §5 K6 |
| B9 | **Food.tsx → real UserStatus + DB foods** (anti-ingredient filter sa pravim profilom) | 03 §6.5 |
| B10 | **`isMetabolicNoiseTriggered` writer** (cron ili posle meal log-a) | 03 Rule 6 |

### 🟡 HIGH (potrebno za beta sa ženama)

| # | Stavka | Modul |
|---|---|---|
| H1 | `weekly_check_ins` tabela + `WeeklyCheckIn.tsx` UI + `processWeeklyCheckIn` service (weight, obimi, energy, identity) | 02 §10 |
| H2 | A/B rotacija meal plan (`generateMeasurementWeek`) | 02 §9.2 |
| H3 | Hidratacija per-čaša UI + `water_logs` tabela + +500ml na trening dane | 02 §8.1 + 03 §6.5 |
| H4 | Mesocycle lifecycle service (kraj queue → novi mezo + deload week injekcija; postavi `isInDeload`) | 01 §6.1 + 03 Rule 3 |
| H5 | RFB sync — service koji setuje `isInReturnFromBreak` na osnovu countdown[any partition] > 0 | 01 §7.5 + 03 Rule 4 |
| H6 | IR meal calorie distribution 28/10/32/10/20 + integracija `applyIRMealStructure` u generateMealPlan | 02 §6.4 |
| H7 | Trener `clientOverrides` UI (toggle Sync Rule per klijentkinja) | 03 §2.1 |
| H8 | Custom exercise add — UI postoji, treba write mutation do DB-a | 01 §3 |
| H9 | Exercise library popunjavanje na ~100 vežbi (sad 32) | 01 §9 |
| H10 | i18n keys za sve nove sync banner-e (cycle, deload, hydration, illness, metabolic noise, fatigue, RFB, menstrual) | 03 §6.6 + MASTER §5 |
| H11 | Illness `recoveryPenalty: -0.15` zaista ulazi u `calcRecoveryMultiplier` (sad samo na nutrition deficit, ne i na recovery) | 01 §4.8 |
| H12 | `food_items` Supabase tabela + migracija iz `src/data/foodDatabase.ts` | 02 §11 |

### 🟢 NICE-TO-HAVE (post-beta)

| # | Stavka | Modul |
|---|---|---|
| N1 | Refeed day algoritam (1 dan TDEE×1.0 + carbs +30%) | 02 §8.2 |
| N2 | Identity Check-in pitanje + score | 02 §10 |
| N3 | Level-up sistem (beg → int) + manual override | 01 §8 |
| N4 | 6-phase cycle granularity (early/late follicular/luteal) | 01 §5 tabela |
| N5 | Pre/Post workout meal switching (`assignWorkoutMealTiming`) | 02 §6.3 |
| N6 | EventBus production swap (Realtime/Redis) | 03 §5.3 |
| N7 | Combo IR+Hashimoto auto-relax soft exclusions | 02 §5.2 |
| N8 | Trainer timeline view of sync events (last 30 days) | 03 §6.3 |

---

## Brojanje za RALPH plan

- **BLOCKER:** 10 stavki
- **HIGH:** 12 stavki
- **NICE-TO-HAVE:** 8 stavki

**Procenjena količina rada:** ~22 zaista neophodne iteracije za beta. Ovo je **dovoljno za Agent Teams** (>15 iteracija).

---

**Kraj REPORT_BIOLOGICAL_GAP.md**
