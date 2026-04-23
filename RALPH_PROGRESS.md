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

