# RALPH_PROGRESS.md

Progres po Ralph iteracijama. Svaka iteracija ima timestamp, file delta, test delta, notes.

---

## IT-1 — weight_logs + daily_check_ins migracija

**Timestamp:** 2026-04-23 23:49 CEST
**Agent:** db-migrator (Sonnet) → main (apply) → pending QA
**Spec:** 03_INTEGRATION §3.1 (DailyCheckIn), 02_NUTRITION §10 (MA5 trendline)

### Files touched
- `supabase/migrations/20260423234800_create_check_in_tables.sql` (new)
- `src/integrations/supabase/types.ts` (regenerated)

### DB delta
- Tables: 6 → 8 (+weight_logs, +daily_check_ins)
- Both `rls_enabled: true`
- 4 RLS policies (client CRUD + trainer SELECT × 2)
- 2 BEFORE UPDATE triggers (`update_*_timestamp` sa `SET search_path = public`)
- 2 indexes (user_id + date DESC za MA5 lookup + daily scan)
- 1 UNIQUE constraint: `daily_check_ins (user_id, date)`

### Acceptance
- [x] `mcp__supabase__list_tables` → obe tabele `rls_enabled: true`
- [x] `mcp__supabase__get_advisors(type="security")` → 0 novih lints (samo pre-existing `auth_leaked_password_protection` WARN, nevezano)
- [x] `generate_typescript_types` → `src/integrations/supabase/types.ts` osvežen, ima `daily_check_ins` i `weight_logs` Row/Insert/Update tipove
- [x] `npx tsc --noEmit` exit 0
- [x] `npm test` 255 passed (pre-apply baseline; nema novih testova — pure DDL iteracija)
- [x] `npm run verify:tokens` green

### Deviations from plan
- RALPH_PLAN je tražio `IT-1.1` za gen types. Spojeno u IT-1 (logičnije — migracija + types idu zajedno, ne može se commit-ovati migracija bez sinhronih tipova).
- Sub-agent `db-migrator` nije imao pristup MCP tools u svom tool registry-ju. Apply je izvršio main agent posle user approval-a (opcija A — direktan apply na produkcijski projekt `zrjqateswwyeoyfdjswv`).

### Next
- QA reviewer audit (paralelno čita migration fajl + verifikuje baseline + spot-check biology invariants)
- Ako approved → git commit `feat(IT-1): weight_logs + daily_check_ins migration`
- Zatim IT-2 (`weekly_check_ins + pause_events + water_logs`)

---

## IT-2 — weekly_check_ins + pause_events + water_logs migracija

**Timestamp:** 2026-04-24 CEST
**Agent:** db-migrator (Sonnet) → main (apply) → pending QA
**Spec:** 02_NUTRITION §10 (weekly + identity score), 01_TRAINING §4.8 (Pauza), 02_NUTRITION §8.1 + 03 §6.5 (water logs)

### Files touched
- `supabase/migrations/20260424120000_create_weekly_pause_water_tables.sql` (new)
- `src/integrations/supabase/types.ts` (regenerated + jedna ručna korekcija: prvi auto-generisani fajl je imao duplicate Insert u profiles blok zbog moje greške pri kopiranju; fiksovano Edit-om)

### DB delta
- Tables: 8 → 11 (+weekly_check_ins, +pause_events, +water_logs)
- Enums: +`pause_type` ('illness'|'travel')
- Sve 3 tabele `rls_enabled: true`
- 9 RLS policies ukupno:
  - weekly_check_ins: 2 (klijentkinja CRUD + trener SELECT)
  - pause_events: 2 (klijentkinja CRUD + trener SELECT)
  - water_logs: 4 (klijentkinja INSERT/SELECT/DELETE — append-only; trener SELECT)
- 2 BEFORE UPDATE triggers (weekly + pause; water_logs nema updated_at)
- 4 indexes (2 standard user+date, 1 pause composite, 1 parcijalni UNIQUE za aktivnu pauzu)
- 1 UNIQUE constraint: `weekly_check_ins (user_id, week_start_date)`

### Acceptance
- [x] `list_tables` → 11 tabela, sve 3 nove `rls_enabled: true`
- [x] `get_advisors(security)` → 0 novih lints (pre-existing auth leaked password protection ostaje)
- [x] `generate_typescript_types` → nove tabele + pause_type enum u `src/integrations/supabase/types.ts`
- [x] `npx tsc --noEmit` exit 0
- [x] Baseline testovi: 255 (bez promene — pure DDL)

### Decisions
- `pause_events` ima parcijalni UNIQUE INDEX `(user_id) WHERE is_active = TRUE` — DB-enforces "samo jedna aktivna pauza po korisniku" (spec 01 §4.8)
- `water_logs` namerno bez UPDATE policy — append-only, greška se ispravlja DELETE + novi INSERT
- `weekly_check_ins.week_start_date` bez DB CHECK-a da je ponedeljak; aplikacioni sloj enforce (fleksibilnost za buduće `firstDayOfWeek` preference)

### Next
- QA reviewer audit
- Ako approved → git commit `feat(IT-2): weekly_check_ins + pause_events + water_logs migration`
- Zatim IT-3 (`exercise_progress + food_items seed` — najveća iteracija Faze A, uključuje seed iz `src/data/foodDatabase.ts`)

---

## IT-3 — exercise_progress + food_items + seed

**Timestamp:** 2026-04-24 CEST
**Agent:** db-migrator (Sonnet) → main (apply + edit) → pending QA
**Spec:** 01_TRAINING §5 K6 (DPO), 01_TRAINING §4.4 (Exercise Library), 02_NUTRITION §11 (Food DB)

### Files touched
- `supabase/migrations/20260424120500_create_progress_and_foods_seed.sql` (new; ručno uklonjen duplikat `CREATE TABLE exercises` blok koji je sub-agent greškom uključio — tabela već postoji iz lovable dev migracije)
- `src/integrations/supabase/types.ts` (regenerated)

### DB delta
- Tables: 11 → 13 (+exercise_progress, +food_items). `exercises` već postojala (32 rows sistemskih vežbi).
- food_items seed: 30 redova iz `src/data/foodDatabase.ts` (f1..f30). Spec traži ≥100 — IT-21 (Faza E) proširuje.
- RLS policies: +8 (exercise_progress 4 + food_items 4). Sve `rls_enabled: true`.
- Indexes: +4 (1 B-tree na exercise_progress, 3 GIN na food_items `tags/meal_slots/allergens`).
- 1 trigger (`food_items` updated_at). exercise_progress bez trigger-a — append-only.
- 0 novih enum-a (glycemic_index je TEXT CHECK: `'low'|'medium'|'high'|'n_a'`).

### Decisions
- `exercise_progress.exercise_id` FK sa `ON DELETE RESTRICT` — brisanje vežbe zabranjeno dok ima istorije (spec intent, štiti DPO lookup od dangling reference)
- `exercise_progress.workout_session_id` UUID bez FK za sad (workout_sessions tabela dolazi u Fazi B); ALTER TABLE ADD CONSTRAINT kasnije
- `exercise_progress` bez UPDATE policy (append-only, kao water_logs)
- `food_items` koristi GIN indexes na TEXT[] kolonama za brzi tag/slot/allergen lookup (spec 02 §11 + anti-ingredient filter iz IT-13)
- Seed normalizuje `snack_am/snack_pm` → `morning_snack/afternoon_snack` (spec 02 §11 naziv)
- Sub-agent je pogrešno uključio `CREATE TABLE exercises` u migraciju iako tabela već postoji u DB. Main agent je Edit-om obrisao taj blok pre `apply_migration`. Razlog sub-agent greške: `src/utils/db/exerciseLibrary.ts` referencira exercises + nijedna tracked lokalna migracija ne kreira exercises → sub-agent zaključio da nedostaje. Zapravo je dev migracija (Lovable-side) kreirala tabelu pre repo init-a.

### Acceptance
- [x] `list_tables` → 13 tabela, obe nove `rls_enabled: true`, food_items 30 rows, exercises 32 rows (nedirnutih)
- [x] `get_advisors(security)` → 0 novih lints
- [x] `generate_typescript_types` → `exercise_progress` i `food_items` Row/Insert/Update u types.ts
- [x] `npx tsc --noEmit` exit 0
- [x] Baseline testovi: 255 (pure DDL, nema novih testova)

### Next
- QA reviewer audit
- Ako approved → git commit `feat(IT-3): exercise_progress + food_items seed`
- IT-4 — **prva non-DDL iteracija**: `process-daily-check-in` Edge Function + MA5 calculator pure helper + testovi. Deploy kroz `mcp__supabase__deploy_edge_function`.

---

## IT-4 — process-daily-check-in Edge Function + MA5 pure helper

**Timestamp:** 2026-04-24 00:56 CEST
**Agent:** Dev Implementer (Opus 4.7 1M) → pending QA
**Spec:** 02_NUTRITION §10 (MA5 trendline), 03_INTEGRATION §3.1 (DailyCheckIn flow), 03 §3.2 Rule 8 (menstrual weight unreliable)

### Files touched
- `src/utils/db/movingAverage.ts` (new) — pure `calcMA5(samples) → { ma5, reliableSampleCount }` sa menstrual skip (dan 1–5)
- `src/utils/db/movingAverage.test.ts` (new) — 4 test case-a: insufficient / normal / with skip / all skip
- `supabase/functions/process-daily-check-in/index.ts` (new) — Deno Edge Function (compute-only, opcija A'')
- `supabase/functions/process-daily-check-in/deno.json` (new) — import map za jsr resolvers + dev task
- `supabase/functions/_shared/movingAverage.ts` (new) — Deno-kompatibilna kopija pure helpera (standardni Supabase shared pattern)

### Test delta
- 255 → 259 (+4). Svi `movingAverage.test.ts` case-ovi prolaze.

### Baseline gate
- [x] `npm test` → 259 passed, 0 failures
- [x] `npx tsc --noEmit` → exit 0
- [x] `npm run verify:tokens` → "All design tokens compliant"

### Arhitekturalne odluke
- **Edge Function je compute-only (opcija A'').** DB writes (upsert `daily_check_ins`, insert `weight_logs`) + MA5 / 7-day avg compute + return. **Ne poziva `applyDailyCheckIn` niti snima `user_status`.** IT-5 mutation hook će na klijent-strani da pozove `applyDailyCheckIn`, patch-uje MA5/avg-ove, pa drugi endpoint za save UserStatus.
  - Razlog: `applyDailyCheckIn` je u `src/utils/sync/syncEngine.ts` (Node/Vite stack sa `@/` alias-ima). Deno Edge Runtime ne može direktno da importuje — preferirano je holding pure transformer-a na klijent-strani + Edge Function je tanka DB agregacija.
- **`syncEngine.ts` nije diran.** Mock MA5 u linijama 74–78 je prihvatljiv fallback; IT-5 hook (patch-after-transformer pattern) će override-ovati `currentWeightMA5` / avg vrednosti real-ma iz Edge Function odgovora.
- **Shared helper duplicate** (`src/utils/db/movingAverage.ts` + `supabase/functions/_shared/movingAverage.ts`). Source of truth je `src/` (pokriven vitest-om). Budućnost: build-step za sync ili workspace paket.
- **Menstrual skip semantika**: `cycleDayAtTime` je per-sample, resolve-ovan u Edge Function-u korelisanjem `daily_check_ins.cycle_day` po datumu. Ako tracker nije aktivan → `null` → ne preskače se (backward compatible sa klijentkinjama bez ciklusa).
- **Buffer od 14 weight log-ova** pri fetch-u (limit 14) pokriva worst case gde polovina uzoraka pada u menstrualnu fazu — i dalje 5 pouzdanih za MA5.
- **Hydration avg** NE filtrira menstrual (ciklus ne utiče na unos vode). Sleep/stress avg **da** filtriraju (one su već noise-y u menstrualnoj zbog umora/PMS-a i ne daju validan 7-day prosek van faze).
- **Validacija payload-a** (weightKg 20–300, sleepHours 0–14, stressLevel 1–5, energyLevel 1–10, waterIntakeMl ≥0, cycleDay 1–45|null) — mirror DB CHECK constraints iz IT-1.
- **Auth**: JWT iz `Authorization: Bearer` kroz anon klijent (`getUser(jwt)`); service-role client samo za DB writes da budemo jedan writer po Principu 1 spec-a 03.

### Side-finds / deviations
- `supabase/functions/` folder nije postojao pre IT-4 — napravljen u toku iteracije.
- `deno.json` dodat iako RALPH_PLAN ga označava kao "opciono" — minimalna verzija sa import map-om za jsr resolve pri lokalnom `deno run` dev task-u.
- Nije diran `syncEngine.ts`, plan je nudio cleanup linija 74–78 ali taj cleanup logično pripada IT-5 gde ispunjavamo real flow. Stavka prepuštena IT-5.
- E2E test iz RALPH_PLAN acceptance (60/61/60/60/59 kg → 60.2) pokriven unit-testom `with skip` (vraća 60.2). Live E2E kroz deploy + curl je za posle deploy-a (u ingerencijama main agenta).

### Next
- QA reviewer audit (verifikuje pure helper invariants + Edge Function validaciju + baseline)
- Ako approved → main agent deploy kroz `mcp__supabase__deploy_edge_function` i git commit `feat(IT-4): process-daily-check-in + MA5 pure helper`
- IT-5 — mutation hook `useDailyCheckIn(clientId)` koji orchestrira EF poziv + `applyDailyCheckIn` + patch + save UserStatus

---

## IT-5 — useDailyCheckIn mutation hook + save-user-status Edge Function

**Timestamp:** 2026-04-24 01:08 CEST
**Agent:** Dev Implementer (Opus 4.7 1M) → pending QA
**Spec:** 02_NUTRITION §10/§13, 03_INTEGRATION §3.1 (DailyCheckIn flow), §5 (RLS one-writer pattern)

### Files touched
- `supabase/functions/save-user-status/index.ts` (new) — drugi Edge Function za upsert user_status; JWT auth + clientId == auth.uid verifikacija + service_role upsert.
- `supabase/functions/save-user-status/deno.json` (new)
- `src/hooks/mutations/useDailyCheckIn.ts` (new) — React Query mutation + pure `runDailyCheckIn` orchestrator + defaultDeps za produkciju + DailyCheckInDeps injection za testove.
- `src/hooks/mutations/useDailyCheckIn.test.ts` (new, 4 test case-a) — testira `runDailyCheckIn` direktno (bez renderHook).

### Test delta
- 259 → 263 (+4). Svi case-ovi prolaze.

### Baseline gate
- [x] `npm test` → 263 passed, 0 failures
- [x] `npx tsc --noEmit` → exit 0
- [x] `npm run verify:tokens` → "All design tokens compliant"

### Arhitekturalne odluke
- **Orchestrator split (`runDailyCheckIn` + `useDailyCheckIn`)**: pure async funkcija sa `DailyCheckInDeps` injection-om pokriva biznis flow (invokeProcess → loadStatus → applyCheckIn → patch → rekalk recovery → invokeSave). React Query hook je tanak omotac oko tog core-a. Razlog: testiranje bez `renderHook` + `QueryClientProvider` wrapper-a je manje boilerplate-a; 4 test case-a ne opravdavaju postavljanje React testing utils-a samo za njih. Pokrivenost hook-specific ponašanja (cache invalidation, toast error) ostaje za IT-6 integracioni test na `DailyCheckInSheet`.
- **Dva Edge Function-a je eksplicitno u NOTES-u**: `process-daily-check-in` (IT-4, compute-only) + `save-user-status` (IT-5, writer). Razlog: syncEngine živi u Vite/Node stack-u sa `@/` alias-ima, Deno ne može direktno da ga import-uje. Kompromis: klijent patch-pattern (transformer vrati mock, EF vrati realne, hook overriduje samo ne-null vrednosti).
- **Patch fallback**: ako `process-daily-check-in` vrati null za MA5/avg (nedovoljno istorije — < 5 pouzdanih uzoraka ili 0 non-menstrual dana), hook zadržava mock vrednost iz `applyDailyCheckIn` transformera (= dnevna vrednost iz check-in-a). UI na taj nacin uvek ima broj za prikaz; kad se istorija skupi, EF pocinje da vraca realne avg-ove i mock se menja automatski.
- **Recovery multiplier rekompjut posle patch-a**: `calcRecoveryMultiplier` zavisi od 7-day avg-ova, ne od dnevnih vrednosti. Bez rekompjuta, recovery bi reflektovao "jedna tačka danas" umesto trend-a. Zato posle patch-a ide eksplicitan poziv `calcRecoveryMultiplier(...)` sa patched bio vrednostima (drugi put u istom flow-u — prvi put ga radi `applyDailyCheckIn` sa mock avg-ovima, drugi put mi rekompjutujemo sa realnim).
- **save-user-status vraća DB row**: radi defensive react-query cache update-a (Realtime push je primarni kanal, ali subscription može da padne na mobile backgrounding-u).
- **clientId == auth.uid provera u save-user-status EF-u**: service_role bypass-uje RLS, pa eksplicitno verifikujemo vlasništvo pre upsert-a. Sprečava scenario gde se payload `status.clientId` falsifikuje radi pisanja tuđeg reda.
- **lastUpdatedAt server override**: EF setuje `lastUpdatedAt = now()` umesto da veruje klijentskom timestamp-u (autoritet vremena je server — sprečava clock-skew bug-ove u React Query staleTime kalkulaciji).
- **Error semantika**: oba EF-a bacaju Error preko `supabase.functions.invoke` API error polja; hook konvertuje u `useMutation.error`; `onError` prikazuje `toast.error`. `silent` option omogucava pozivaocima (npr. batch check-in flow u budućnosti) da preuzmu error feedback.
- **toIsoDate helper** koristi local-timezone datum (ne UTC slice) — sprečava bug gde klijentkinja u +2h zoni u 00:30 lokalno loguje juče.

### Side-finds / deviations from plan
- **RALPH_PLAN IT-5 scope-a tražio samo jedan EF** (`process-daily-check-in`) — moja IT-4 odluka (EF compute-only) je dovela do potrebe za drugim EF-om. Dokumentovano u task brief-u i u RALPH_PROGRESS IT-4 Arhitekturalne odluke. Ovo nije scope creep — direktna posledica IT-4 decision-a.
- **Testovi koriste `runDailyCheckIn` direktno umesto `renderHook`** (vidi Arhitekturalne odluke). Ako QA traži hook-level testove, preporuka: dodati RTL `renderHook` + `QueryClientProvider` wrapper u IT-6 kao deo integracionog testa `DailyCheckInSheet`-a.
- **Mock `applyDailyCheckIn` u testovima je minimalan** — ne pokreće stvarni syncEngine. Razlog: pravi `applyDailyCheckIn` zahteva EventBus mock + 40+ polja na status-u i test fail-uje bez kompletnog stuba. Minimalan mock (status kopija sa bio poljima overrid-ovanim) je dovoljan da validira patch logiku hook-a (što je ono što testiramo). `applyDailyCheckIn` ima zasebnu pokrivenost u `syncEngine.test.ts`.
- **`syncEngine.ts` nije diran** (no-touch zone) — mock MA5 cleanup iz linija 74–78 i dalje stoji kao fallback. Patch pattern u hook-u je način na koji ga obilazimo bez menjanja god-node-a.
- **Nema novih i18n string-ova za toast** — `toast.error("Check-in nije sačuvan", ...)` je jedini hardcoded string koji sam dodao. Prolazi kroz sonner direktno (ne `t()`). Za IT-6 ili IT-20 (i18n polish) prebacuje se na `t('checkin.error.saveFailed')`. Zabeleženo za QA/IT-20.

### Deploy pending
- `save-user-status` — main agent kroz `mcp__supabase__deploy_edge_function` nakon QA approval-a.
- `verify_jwt=true` (default) ostaje; EF eksplicitno radi `auth.getUser(jwt)` za dobijanje userId, plus `clientId === userId` check.

### Next
- QA reviewer audit (verifikuje patch logiku + EF bezbednost + test coverage)
- Ako approved → main agent deploy `save-user-status` i git commit `feat(IT-5): useDailyCheckIn mutation + save-user-status EF`
- IT-6 — UI `DailyCheckInSheet` na Home tab-u, zove `useDailyCheckIn().mutate()`

---

## IT-6 — DailyCheckInSheet UI + Home CTA integracija

**Timestamp:** 2026-04-23 23:30 CEST
**Agent:** dev-implementer (Opus 4.7)
**Spec:** 02_NUTRITION_FLOW_MASTER.md §13 (Daily logging), 03_INTEGRATION_LAYER.md §3.1 (DailyCheckIn flow)

### Files touched
- `src/components/checkin/DailyCheckInSheet.tsx` (new) — BottomSheet sa forma koja zove `useDailyCheckIn(clientId).mutate()`
- `src/components/checkin/DailyCheckInSheet.test.tsx` (new) — prvi `.test.tsx` fajl u codebase-u; 2 test case-a (render + submit)
- `src/pages/Home.tsx` (modified) — CTA dugme "Morning check-in"/"Jutarnji check-in" (conditional na `!hasCheckInToday`) + mount `<DailyCheckInSheet>`
- `src/contexts/LanguageContext.tsx` (modified) — dodati 23 i18n ključeva pod `checkin.*` i `a11y.*` (sr-latn + en)
- `src/test/setup.ts` (modified) — dodati `ResizeObserver` i `PointerEvent` polyfill-e za jsdom (Radix Slider/Dialog ih zahtevaju)

### Test delta
263 → 265 (+2)
- `DailyCheckInSheet > renders all fields and disables submit until weight is valid`
- `DailyCheckInSheet > calls mutate with correct DailyCheckIn payload on submit`

### Baseline gate (sve green)
- `npm test` — 265 passed ✓
- `npx tsc --noEmit` — clean ✓
- `npm run verify:tokens` — "All design tokens compliant" ✓ (pre-existing grandfathered z-index warnings u ScrollWheelPicker/ProgramEditor su nevezani)

### Acceptance (iz RALPH_PLAN IT-6)
- [x] Nova komponenta `<DailyCheckInSheet>` u `src/components/checkin/`
- [x] Otvara se sa "Jutarnji check-in" CTA na Home tab-u (samo ako `!hasCheckInToday`)
- [x] Polja: weight (decimal input), sleep hours (slider 0–12, step 0.5), stress (1–5 segmented sa zero-guilt labelima), energy (1–10 slider), water (+/- stepper sa 250ml increment), cycle day (conditional — samo ako tracker aktivan)
- [x] Submit zove `useDailyCheckIn().mutate()` sa `DailyCheckIn` shape (clientId, date, weightKg, sleepHours, stressLevel, energyLevel, waterIntakeMl, cycleDay?)
- [x] Posle uspeha: zatvara sheet, `ConfettiCelebration` overlay burst, `toast.success(t("checkin.successToast"))`, reset forme
- [x] Na error: hook već pokazuje toast; forma ostaje netaknuta za retry
- [x] Koristi postojeće UI tokene — BottomSheet, Button (variant="cta" size="xl"), Input, Slider, Label
- [x] Tap targets ≥ 44pt (Button size="xl" → min-h-[56px], Input min-h-11, stress segments min-h-11)
- [x] a11y: form labels (Label + htmlFor), role="radiogroup" za stres, aria-invalid na invalid input, aria-busy na submit
- [x] Motion: `<ConfettiCelebration>` interno respect-uje `shouldReduceMotion()`, sheet enter/exit ide kroz Radix Dialog defaults
- [x] Zero-guilt copy: CTA "Morning check-in / Jutarnji check-in" (nikad "moraš/kasniš/propušteno"); success toast "Check-in is saved / Check-in je zabeležen"; stres labels "Opušteno → Intenzivno"

### Ključne odluke
- **Weight input kao decimal text field, ne ScrollWheelPicker** — user brief pomenuo ScrollWheelPicker kao opciju, ali nijedan pravi use-case u repo-u ga nije tražio za weight (postoji samo u Onboarding za kompletne mere); obični `<Input type="text" inputMode="decimal">` sa 62.4 placeholder-om je brži i manje prepreke za morning check-in.
- **Stres kao custom segmented (ne TabControl)** — TabControl je dizajniran za navigation tabs (string keys); stres ima numeric value + pod-label, pa custom radio-group daje čistiji a11y (`role="radiogroup"` + `role="radio"` + `aria-checked`).
- **hasCheckInToday heuristika = `status.lastUpdatedAt >= startOfToday`** — ne-dedicated read hook za daily_check_ins tabelu; `save-user-status` EF server-side setuje `lastUpdatedAt=now()` pa ovo pouzdano signalizira "check-in je obavljen danas". Ako u FAZI B pojavi drugi flow koji pomera `lastUpdatedAt`, ovo se mora zameniti dedicated `useHasCheckInToday(clientId)` hookom koji SELECT-uje iz `daily_check_ins WHERE date = today`.
- **cycleTrackingEnabled deriv = `bio.cycleDay !== null || bio.cyclePhase !== null`** — UserStatus tip ne nosi eksplicitan `cycleTrackingEnabled` (to je u ClientNutritionProfile). Presence oba cycle polja u bio sekciji je tri-state signal da se tracker koristi. Kad klijentkinja uđe u cycle sync, sheet automatski pokazuje cycle day polje.
- **ResizeObserver + PointerEvent polyfill u test/setup.ts** — Radix Sheet, Dialog i Slider svi koriste jedno od ovih; jsdom ne implementira. Polyfill je no-op stub (observe/setPointerCapture/scrollIntoView), jedinstveno mesto u setup.ts tako da svi budući `.test.tsx` fajlovi nasleđuju fix.
- **vi.mock(useDailyCheckIn) umesto runDailyCheckIn import** — komponentni test se vezuje za React hook API-ju (mutate/isPending), ne za orkestrator pure funkciju. Mutation state transitioni (loading, success, error) će se pokriti kroz integracione testove u kasnijim iteracijama.

### Side-finds
- Na submit uspeh, `setTimeout(() => setShowConfetti(false), 3500)` obezbeđuje da confetti motion završi pre unmount-a (particle animacije traju 2.5–4.5s); reduce-motion case je no-op jer `ConfettiCelebration` sam vraća null.
- `initialCycleDay` prop-om sheet prima pre-fill vrednost iz `status.bio.cycleDay`; tako klijentkinja koja je juče prijavila dan 14 vidi 14 kao default pa samo inkrementuje na 15 (UX friction reduction).
- Confetti overlay koristi `z-50` (tailwind preset class, ne hardcoded `z-[N]`) pa ne triggera verify:tokens warning.

### Deviations from plan
- Nema. Sve tačke iz IT-6 brief-a ispunjene unutar plana; nije trebao dedicated test-utils wrapper (LanguageProvider jedini context koji sheet zavisi na, useDailyCheckIn je mokovan).

### Next
- QA reviewer audit:
  - verifikuje da forma ne dozvoljava submit za weight izvan [20, 300] kg (boundary testovi)
  - verifikuje dark mode rendering (oba Input/Slider tokena su bg-muted/60 pa se prilagođavaju)
  - verifikuje da je confetti reduce-motion-safe
  - opciono: dodati smoke E2E test (prava Supabase instanca) — out of scope za IT-6
- Ako approved → commit `feat(IT-6): DailyCheckInSheet + Home CTA integracija`
- **Ovo je poslednja iteracija Faze A.** Posle commit-a, cela FAZA A (IT-1..IT-6) je gotova. Sledeća je FAZA B — Workout completion loop (IT-7).


---

## IT-7 — process-workout-completion Edge Function + post-completion pure helper

**Timestamp:** 2026-04-24 01:36 CEST
**Agent:** Dev Implementer (Opus 4.7 1M) → pending QA
**Spec:** 01_TRAINING §5 Korak 2.5 (onSessionCompleted), §4.8 (PauseEvent illness lifecycle), §7.5 (Return from Break); 03_INTEGRATION §3.1 (WorkoutCompletion flow)

### Files touched
- `src/utils/db/workoutCompletion.ts` (new) — pure `applyPostCompletionCounters(training, partition) → { training, pauseJustEnded }` helper za RFB decrement + illness penalty decrement + partitionLastSeen mirror + isInReturnFromBreak derive
- `src/utils/db/workoutCompletion.test.ts` (new) — 7 test case-a: normal completion, RFB Lower 2→1, RFB both 1→0/1, illness 2→1, illness 1→0 end, travel no-op, immutability guard
- `supabase/functions/_shared/queueAdvance.ts` (new, Deno port) — verbatim port `advancePointerAfterCompletion` + `resolveNextSession` + `hasMesocycleEnded` + `inferMicrocycleSize` iz `src/utils/training/sessionResolver.ts`; source of truth ostaje `src/`, ovo je Deno kopija
- `supabase/functions/process-workout-completion/index.ts` (new) — Edge Function: JWT auth → clientId guard → SELECT user_status → sessionId guard → advance queue → inline Deno port applyPostCompletionCounters → recompute nextSessionId/Partition → atomic upsert user_status → UPDATE pause_events ako illness završena
- `supabase/functions/process-workout-completion/deno.json` (new) — import map + dev task (analogno process-daily-check-in)
- `RALPH_PROGRESS.md` (appended)

### Test delta
- 265 → 272 (+7). Svi `workoutCompletion.test.ts` case-ovi prolaze.

### Baseline gate
- [x] `npm test` → 272 passed, 0 failures
- [x] `npx tsc --noEmit` → exit 0
- [x] `npm run verify:tokens` → "All design tokens compliant"

### Arhitekturalne odluke
- **EF save-uje interno (atomic path).** Queue pointer advance + RFB decrement + illness penalty decrement + `pause_events` UPDATE moraju ili svi da uspeju ili nijedan. Ako bi EF bio samo compute (kao IT-4) a hook save-ovao, mini-racing prozor između dva HTTP poziva mogao bi da ostavi UserStatus u "advanced" stanju bez persistiranja. EF ovde radi upsert `user_status` + update `pause_events` pa je race eliminisan na server strani. Razlika od IT-4: daily check-in je append-only (retry-safe), workout completion je state progression (ne sme da diverge-uje).
- **EF NE poziva `runSyncRules` (god node no-touch).** Deno port svih 8 sync rule-ova + zavisnosti (calcBMR, calcTDEE, calcCalorieTarget, cycle sync, deload sync…) bi bio ogroman posao + duplikacija. Umesto toga, IT-9 hook posle uspešnog EF-a poziva klijent-side `runSyncRules(status)` + `save-user-status` za rebuild calorie target-a. Mini-race dok drugi save ne uspe: klijent može da vidi queue advance bez recomputed calorie target-a kratko; u praksi Realtime push prvog save-a stiže i drugi save brzo za njim (~100ms). Prihvatljivo za alpha.
- **Pure helper `applyPostCompletionCounters` živi u `src/utils/db/`**, testiran Vitest-om. Inline-ovan u EF fajlu (bez _shared/ duplikata) jer je kratak (~30 LOC) i svaka promena algoritma će pogoditi samo dva mesta; za `advancePointerAfterCompletion` (150+ LOC sa inferMicrocycleSize + tipovi) _shared/queueAdvance.ts je bolji izbor.
- **Shared Deno port duplicate** (`src/utils/training/sessionResolver.ts` ↔ `supabase/functions/_shared/queueAdvance.ts`). Source of truth je `src/`. Ako se `advancePointerAfterCompletion` menja, oba mesta treba sync-ovati. Ovo je isti pattern koji je već ustanovljen u IT-4 sa `movingAverage.ts`.
- **sessionId guard (korak 2 iz briefa)** vraća 400 ako `queue.sessions[pointer].sessionId !== payload.sessionId`. Ovo čini EF idempotentan pri retry-ju: ako je prvi save prošao i pointer već napredovao, drugi poziv će naći drugu sesiju na pointer poziciji i odbiti — neće nastati duplikat advance.
- **`pause_events` UPDATE je sekundaran**: ako fail-uje posle uspešnog user_status upsert-a, EF vraća 200 sa `warning` poljem umesto 500. Razlog: biology-critical path (calorie sync) već radi dobro preko `status_json.training.activePauseEvent=null`; `pause_events` red je audit trail za trener dashboard i može da stagnira 1 request bez biološke štete.
- **activePauseEvent.type === 'travel' → no-op**. Travel pauza ima `penaltySessionsRemaining=0` od starta; helper već guard-uje `> 0` pa ne decrement-uje ispod nule niti završava travel (travel se gasi user-triggered, spec 01 §4.8).
- **`nextSessionId` / `nextSessionPartition` recompute** kroz `resolveNextSession(advancedQueue)` — ako queue završen, ostavljamo prethodne vrednosti (mesocycle lifecycle IT-15 će resetovati pri generisanju novog mezociklusa).

### Side-finds
- `supabase/functions/_shared/` već je postojao od IT-4 (`movingAverage.ts`); `queueAdvance.ts` samo dodat u isti folder — jedinstveno mesto za Deno port-ove.
- `workoutService.ts` u `src/services/` već ima ekvivalentnu orchestraciju (linije 52–125) za single-client mode. EF je server-side mirror, ne zamena — `workoutService` ostaje za legacy flows (local-first refactor path kroz `updateUserStatus`); IT-9 hook zameniti direktnim EF pozivom.
- `PostCompletionResult.pauseJustEnded` flag izložen u helper-u jer EF treba da zna da UPDATE `pause_events` red (side-effect van UserStatus-a). Pure helper ostaje pure — signal je samo return value.

### Deviations from plan
- Brief je tražio test case (1) "Normal completion: session pointer napreduje za 1, partitionLastSeen update-ovan". Pointer advance je logika `advancePointerAfterCompletion` koja je već pokrivena u `sessionResolver.test.ts`; moj test case (1) umesto toga verifikuje partitionLastSeen mirror + isInReturnFromBreak + immutability aspekte helpera — fokus na NJEGOVE invariants, ne re-testiranje već pokrivene advance logike. Dodao sam 7 test case-a umesto 4 radi pokrivanja travel-no-op i immutability guard-a.
- EF interno koristi inline Deno port `applyPostCompletionCounters` umesto _shared/ fajla. Helper je 30 LOC, jedan pozivalac u EF — shared/ bi uneo nepotrebni sloj za minimum benefita. Ako se pojavi drugi EF koji decrement-uje iste brojače, refaktor-ovaće se u _shared/.

### Next
- QA reviewer audit:
  - verifikuje sessionId guard (400 response shape)
  - verifikuje immutability helpera (da ne curi reference na ulazni queue)
  - verifikuje atomic path (da pause_events UPDATE fail-safely ne vraća 500)
  - verifikuje validate 7 case-ova pokrivaju sve grane `applyPostCompletionCounters`
- Ako approved → main agent deploy kroz `mcp__supabase__deploy_edge_function` i git commit `feat(IT-7): process-workout-completion + workoutCompletion pure helper`
- IT-8 — DPO calculator + useFinishWorkout + useCompleteSet mutation hooks

---

## IT-8 (continuation) — DPO integracija u programGenerator + mutation hooks (useFinishWorkout, useCompleteSet)

**Timestamp:** 2026-04-24 02:55 CEST
**Agent:** Dev Implementer (Opus 4.7 1M) → pending QA
**Spec:** 01_TRAINING §5 Korak 6 (Loading Sloj 4 DPO), §7.5 (Return from Break deload); 03_INTEGRATION §3.1 (WorkoutCompletion flow)

### Files touched
- `src/utils/db/exerciseHistory.ts` (new) — tanak Supabase wrapper `loadExerciseHistory(userId, exerciseId, limit=10)` koji vraca `ExerciseHistoryRow[]` sortiran DESC po `completed_at`. Bez testa (DB wrapper; mock se radi u pozivaocima).
- `src/utils/training/programGenerator.ts` (modified) — dodat opcioni arg `exerciseHistoryMap?: Map<number, ExerciseHistorySample[]>` u `GenerateSessionInputs`. Kada je prosledjena mapa, Sloj 4 loop sada poziva `calcNextWeight()` i popunjava `slot.targetWeight`, `slot.targetReps`, `slot.targetRIR`. Kada nije, stari placeholder `loadingNote` ponasanje zadrzano (backward compatible — svih 12 postojecih testova prolaze bez izmene).
- `src/hooks/mutations/useFinishWorkout.ts` (new) — React Query mutation hook oko `process-workout-completion` Edge Function-a. Razdvojen `runFinishWorkout` pure orchestrator za lakse testiranje (isti pattern kao `runDailyCheckIn`). Invalidate-uje `['userStatus', clientId]` query cache posle uspeha.
- `src/hooks/mutations/useFinishWorkout.test.ts` (new, 2 cases) — happy path + error path.
- `src/hooks/mutations/useCompleteSet.ts` (new) — Direct INSERT u `exercise_progress` (RLS dozvoljava vlasniku). Razdvojen `runCompleteSet` pure orchestrator. Invalidate-uje `['exerciseProgress', userId, exerciseId]` cache.
- `src/hooks/mutations/useCompleteSet.test.ts` (new, 2 cases) — happy path + RLS error (code 42501).
- `RALPH_PROGRESS.md` (appended)

### Test delta
- 272 → 281 (+9 total): +5 `dpoCalculator.test.ts` (vec u gotovom delu), +2 `useFinishWorkout.test.ts`, +2 `useCompleteSet.test.ts`.
- Svi 281 prolaze, 0 failures.

### Baseline gate
- [x] `npm test` → 281 passed, 0 failures
- [x] `npx tsc --noEmit` → exit 0
- [x] `npm run verify:tokens` → "All design tokens compliant"

### Arhitekturalne odluke
- **programGenerator inline DPO (ne wrapper).** Brief je dao fallback opciju `enrichSlotsWithDPO` kao poseban helper. Odabrao sam inline u `generateSessionSkeleton` jer: (1) slot struktura nije bila komplikovana (targetWeight, targetReps, targetRIR vec postoje u `ExerciseSlot` interfejsu — tipovi su bili spremni za DPO), (2) mapa je opcioni arg sa `undefined` default-om pa legacy testovi ne menjaju semantiku, (3) pozivalac (IT-9 UI) ima jedan call site umesto dva sekvencijalna.
- **Opcioni `exerciseHistoryMap` umesto default `new Map()`.** Razlog: testovi koji ne prosleduju mapu ocekuju placeholder `loadingNote` (ne target*). Ako bi default bio `new Map()`, DPO loop bi se izvrsio (samo bi `history` bio prazan array `[]`), sto znaci "first_time" estimateInitialWeight bi popunio `targetWeight`. To bi promenilo ponasanje za legacy caller-e koji nemaju istoriju. Strict `undefined` gate je manje invazivna migracija.
- **`calcNextWeight` poziva se samo za slotove sa `chosenExerciseId`.** Ako supstitucija nije izabrala vezbu (failure), DPO se preskace — bez chosen exercise nema `weight_increment` / `is_compound` meta, pa estimateInitialWeight ne bi imao smisla. Failures se prijavljuju kroz `substitutionFailures` vec.
- **`slot.targetReps` format `"${min}-${max}"`** (npr. "8-12") — polje je tip `string` u `ExerciseSlot`, spec UI ocekuje rep range. `calcNextWeight` interno koristi `repMax` kao `slotRepsTop` gate (koji se dostigao → +increment).
- **Pure `run*` orchestrator pattern za mutation hooks.** Replikovan iz `useDailyCheckIn` (IT-5). Benefit: mutation test-ovi se pisu kao obicne async funkcije bez `QueryClientProvider` wrappera i polling-a `waitFor(mutation.isSuccess)`. Orkestrator je biznis logika; hook je tanak React Query shell (cache invalidation + toast).
- **`useCompleteSet` direct INSERT, ne Edge Function.** Spec kaze "klijent moze pisati `exercise_progress` jer RLS dozvoljava vlasniku CRUD svoje istorije" i nema sync rule orkestracije po setu — `runSyncRules` se pokrece tek na `finishWorkout` (IT-7 EF). Direct INSERT elminise jedan HTTP hop.
- **Toast source: `sonner`.** Usledjeno iz `useDailyCheckIn.ts` pattern-a (linija 38) — `toast` iz `sonner` je standardan u projektu. Nije korisceno lokalni `src/hooks/use-toast.ts` shadcn wrapper jer postojeci mutation pattern koristi `sonner` direktno.

### Side-finds
- `ExerciseSlot` interfejs vec ima sva cetiri polja: `targetWeight`, `targetReps`, `targetRIR`, `targetRest`. Placeholder komentar u `programGenerator.ts:325` ("Faza 2.4 popunjava sa real exercise history") je sada realizovan — polja su popunjena kada mapa stigne.
- `dpoCalculator.ts` koristi `ExerciseMeta.id: string`, `programGenerator` koristi `Exercise.id: number` — mapiran kroz `String(exercise.id)` u DPO meta. Mapa same je keyed na `Exercise.id` (number) radi konzistentnosti sa exerciseLibrary.
- `ClientTrainingProfile.experienceLevel` literal type je `'beginner' | 'intermediate'` — identican sa `ClientProfileSnapshot.experienceLevel`, pa se prosledjuje direktno bez narrowing-a.

### Deviations from plan
- Nijedna materijalna. Brief je predvideo "default `undefined` ili `new Map()`" — odabrao sam `undefined` jer `new Map()` bi promenio legacy ponasanje.
- `useFinishWorkout` i `useCompleteSet` imaju razdvojen `run*` orchestrator + `DependencyInjection` interfejs umesto cistog inline `mutationFn`. Ovo je _ekspanzija_ briefa, ne devijacija — brief je zahtevao 2 test case-a svaki, ovaj pattern cini test-ove cistim bez RTL renderHook wrappera.

### Next
- QA reviewer audit:
  - verifikuje da `programGenerator` ne menja legacy ponasanje kad `exerciseHistoryMap` nije prosledjena (12 postojecih testova)
  - verifikuje DPO integraciju sa test case-om koji prosleduje mapu + chosen exercise (trenutno nije pokriven testom; vec je pokriven kroz `dpoCalculator.test.ts`, ali bi integration test kroz `generateSessionSkeleton` bio bonus)
  - verifikuje da mutation hooks se pravilno vezuju za React Query cache keys (`['userStatus']`, `['exerciseProgress']`)
  - sanity check `loadExerciseHistory` SQL query shape (DESC order + limit)
- Ako approved → main agent commit `feat(IT-8): DPO integration + useFinishWorkout + useCompleteSet hooks`
- IT-9 — ActiveWorkout.tsx wired na real data (pozivalac obe mutation hooks)

