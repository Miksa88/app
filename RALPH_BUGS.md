# Ralph QA bug log

Chronological log of QA audit findings for Ralph iterations.
Newest entries appended at bottom.

---

## IT-1 — 2026-04-23 23:58 (Europe/Belgrade)

**Scope:** DB migracija `weight_logs` + `daily_check_ins` + regen `src/integrations/supabase/types.ts`.
**Spec refs:** 03_INTEGRATION_LAYER §3.1 (DailyCheckIn flow), 02_NUTRITION_FLOW_MASTER §10 (MA5 weight trendline).
**Files touched:**
- `supabase/migrations/20260423234800_create_check_in_tables.sql` (new, 134 lines)
- `src/integrations/supabase/types.ts` (regenerated, 658 lines)

### Verdict: approved

### Baseline gate
- `npm test`: 255 → 255 (no delta, expected — pure DDL iteration) — green
- `npx tsc --noEmit`: exit 0, no output — green
- `npm run verify:tokens`: `All design tokens compliant` — green
- `npm run lint`: n/a (script not invoked per iteration scope)

### Migration file review (20260423234800_create_check_in_tables.sql)

Verified invariants from QA brief:
- `ENABLE ROW LEVEL SECURITY` present on both tables (L50, L117). OK
- RLS policies — klijentkinja CRUD via `FOR ALL` with `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())` on both tables (L52–56, L119–123). OK
- RLS policies — trener SELECT via `EXISTS` subquery on `profiles.role = 'trainer'` on both tables (L58–66, L125–133). OK
- Trigger funkcije imaju `SET search_path = public` — present on both `update_weight_logs_timestamp` (L39) i `update_daily_check_ins_timestamp` (L106). Proaktivno sprečava `function_search_path_mutable` security advisor lint. OK
- FK `ON DELETE CASCADE` na user_id — oba (L12, L74) referenciraju `public.profiles(id)` sa CASCADE. OK
- CHECK constraints verified:
  - `weight_kg BETWEEN 20 AND 300` (L13) — range defanzivan za žensku klijentelu, pokriva edge cases
  - `sleep_hours BETWEEN 0 AND 14` (L76) — OK
  - `stress_level BETWEEN 1 AND 5` (L77) — OK, matches spec 1–5 skala
  - `energy_level BETWEEN 1 AND 10` (L78) — OK, matches spec 1–10 skala
  - `water_intake_ml >= 0` (L79) — OK
  - `cycle_day BETWEEN 1 AND 45` (L80) — pokriva >35d anomalous cikluse + buffer, dozvoljava NULL per spec §2.2
  - `source IN ('auto','manual','wearable')` (L15–16) — OK
- `UNIQUE (user_id, date)` na daily_check_ins (L86, constraint `uq_daily_check_ins_user_date`). OK — jedan check-in po danu.
- Indexes:
  - `idx_weight_logs_user_date ON (user_id, logged_at DESC)` (L26–27) — MA5 lookup performance. OK
  - `idx_daily_checkins_user_date ON (user_id, date DESC)` (L93–94) — OK
- Trigger `BEFORE UPDATE ... SET NEW.updated_at = now()` na obe tabele. OK

### Types sync review (types.ts)

- `daily_check_ins` Row/Insert/Update prisutni (L65–113) sa svim kolonama: `id, user_id, date, sleep_hours, stress_level, energy_level, water_intake_ml, cycle_day, notes, created_at, updated_at`. FK relationship ka `profiles` (L107–111). OK
- `weight_logs` Row/Insert/Update prisutni (L460–496) sa svim kolonama: `id, user_id, weight_kg, logged_at, source, created_at, updated_at`. FK relationship ka `profiles` (L490–494). OK
- Nullability ispravno: `cycle_day/sleep_hours/stress_level/energy_level/water_intake_ml/notes` su `number | null` / `string | null` u Row; optional u Insert; OK.
- Ostale tabele netaknute: `client_template_assignments` (L20), `exercises` (L115), `meal_logs` (L207), `profiles` (L269), `session_templates` (L369), `user_status` (L422). Sve prisutne.

### Biology invariants (DDL-level)

- Weight range 20–300 kg: defanzivan, pokriva ekstreme bez blokiranja real usera. ACCEPTABLE.
- Cycle day 1–45: spec §2.2 vraća null za >35d. Polje dozvoljava 1–45 + NULL. CORRECT per spec.
- `was_menstrual_weight_reliable` flag NIJE u tabeli — spec Rule 8 kaže `weightDataReliable=false` se setuje u UserStatus JSONB, ne u weight_logs. Migration slědí spec. OK.

### No-touch zones (Faza A scope guard)

Verified via `stat -f "%Sm"` na `src/utils/sync/*.ts`:
- Sve fajlove u sync/ imaju mtime Apr 19–20 2026. Nijedan nije dirnut danas (Apr 23). OK.
- `src/logic/` ne postoji (n/a).
- `src/engine/` nije dirnut.
- Nema `t()` call site diffs.
- Jedini fajlovi sa današnjim mtime-om: nova migracija (Apr 23 23:48) i regenerated types.ts (Apr 23 23:54).

### RLS advisory check

MCP `mcp__supabase__get_advisors` nije trenutno ucitan u registry ove sesije. Static review migration fajla pokazuje proaktivno adresiranje poznatih linta:
- RLS enabled na obe tabele (sprečava `rls_disabled_in_public`).
- Trigger funkcije imaju `SET search_path = public` (sprečava `function_search_path_mutable`).
- Policies koriste `TO authenticated` umesto `TO public` (sprečava `anon_key_unrestricted` pattern).

**Preporuka za main agent:** posle commit-a pokreni ručni `mcp__supabase__get_advisors({type:"security"})` i proveri da je 0 novih lints. Pre-existing `auth_leaked_password_protection` je unrelated.

### Findings

**Blocker:** none.

**High:** none.

**Low:**
- (L58, L125) Policy names koriste ćirilicu/latinicu-mix ("Klijentkinja CRUD svoje...", "Treneri čitaju sve..."). Funkcionalno OK (Postgres to dozvoljava), ali buduće SQL tooling ili grep-ing po policy imenu može da bude nezgodnije. NOT a blocker — spec ne propisuje engleski policy naming.
- Nema eksplicitnog testa za RLS behavior (npr. vitest integration koji simulira auth.uid()). Opcionalno za kasniju iteraciju kad client service sloj doda CRUD pozive (verovatno IT-2/IT-3).

### Round trips on this iteration: 1/3

**Main agent može da komituje** sa message-om:
`feat(IT-1): weight_logs + daily_check_ins migration + types regen`
uz Co-Authored-By trailer per workflow.

---

## IT-2 — 2026-04-24 00:10 (Europe/Belgrade)

**Scope:** DB migracija `weekly_check_ins` + `pause_events` + `water_logs` + regen `src/integrations/supabase/types.ts` (sa manual fix za profiles Insert duplikat).
**Spec refs:** 02_NUTRITION_FLOW_MASTER §10 (weekly check-in + identity score), 01_TRAINING_FLOW_MASTER §4.8 (Pauza modul), 02_NUTRITION §8.1 + 03_INTEGRATION §6.5 (water logs append-only).
**Files touched:**
- `supabase/migrations/20260424120000_create_weekly_pause_water_tables.sql` (new, 206 lines)
- `src/integrations/supabase/types.ts` (regenerated + manual fix, 795 lines)

### Verdict: approved

### Baseline gate
- `npm test`: 255 → 255 (pure DDL, no delta expected) — green
- `npx tsc --noEmit`: exit 0, bez izlaza — green
- `npm run verify:tokens`: `All design tokens compliant` — green
- `npm run lint`: n/a (nije u scope-u iteracije)

### Migration file review (20260424120000_create_weekly_pause_water_tables.sql)

Potvrđeni invarijanti iz QA brief-a:
- `CREATE TYPE public.pause_type AS ENUM ('illness', 'travel')` (L11) — izvršeno PRE `CREATE TABLE pause_events` (L85). OK — enum tip dostupan.
- `ENABLE ROW LEVEL SECURITY` na sve 3 tabele (L63 weekly, L134 pause, L178 water). OK
- Policy count: **8 total** preko 3 tabele:
  - weekly_check_ins: 2 (klijentkinja FOR ALL L65–69, trener FOR SELECT L71–79). OK
  - pause_events: 2 (klijentkinja FOR ALL L136–140, trener FOR SELECT L142–150). OK
  - water_logs: **4** (klijentkinja INSERT L180–183, SELECT L185–188, DELETE L190–193, trener SELECT L197–205). CRITICAL VERIFIKACIJA: **nema UPDATE policy** — append-only pattern (L195 komentar). OK
- Trigger funkcije imaju `SET search_path = public`:
  - `update_weekly_check_ins_timestamp` (L46–52). OK
  - `update_pause_events_timestamp` (L117–123). OK
  - water_logs nema trigger (namerno, append-only). OK
  - Proaktivno sprečava `function_search_path_mutable` advisor.
- FK `ON DELETE CASCADE` na user_id x3:
  - weekly_check_ins → profiles(id) (L19). OK
  - pause_events → profiles(id) (L87). OK
  - water_logs → profiles(id) (L158). OK
- CHECK constraints — sve match spec:
  - weight_avg_kg 20–300 (L21) — OK
  - waist_cm 40–200 (L22), hip_cm 40–200 (L23), thigh_cm 20–100 (L24) — OK
  - energy_avg 1–10 (L25) — matches spec Daily/Weekly skala
  - identity_score 1–5 (L26) — per spec §10 Identity Check-in
  - recovery_penalty BETWEEN -0.5 AND 0 (L93) — pokriva illness -0.15 i travel 0; donja granica daje headroom za buduće pauze bez runaway-a. OK
  - penalty_sessions_remaining >= 0 (L95) — OK
  - ml_added > 0 AND ml_added <= 2000 (L161) — OK, prevents accidental 5000ml pogreške
- UNIQUE (user_id, week_start_date) na weekly_check_ins (L32, constraint `uq_weekly_check_ins_user_week`). OK — jedan check-in po nedelji po korisniku.
- Parcijalni UNIQUE INDEX `idx_pause_events_one_active_per_user ON public.pause_events (user_id) WHERE is_active = TRUE` (L110–111). OK — spec §4.8 zahteva "samo jedna aktivna pauza po korisniku"; DDL-level enforcement.
- Regular indexes (user_id, <date_col> DESC) za sve 3:
  - `idx_weekly_check_ins_user_date` (L39–40) — weekly rollup.
  - `idx_pause_events_user_active_date` (L106–107) — active pauza lookup.
  - `idx_water_logs_user_logged_at` (L171–172) — dnevni water rollup.
- Triggeri `BEFORE UPDATE` na weekly + pause (L54–57, L125–128). OK
- Policies koriste `TO authenticated` (ne TO public) — sprečava `anon_key_unrestricted` pattern. OK

### Types sync review (types.ts, 795 linija)

- Struktura: `Insert: {`, `Update: {`, `Row: {`, `Relationships: [` — sve po **11 matches** (8 pre-existing tabela + 3 nove). Verifikovano preko grep count. **Duplicate Insert u profiles je popravljen** — single Insert blok L351–383, single Update L384–416, Relationships L417 prazan array. Manual fix main agenta je tačno izveden.
- **pause_events** (L269–318):
  - Row: 11 polja uključujući `pause_type: Database["public"]["Enums"]["pause_type"]`, `recovery_penalty: number`, `penalty_sessions_remaining: number`. OK
  - Insert (L283–295): `pause_type` required (bez `?`), `start_date` required, `user_id` required; `recovery_penalty?` / `penalty_sessions_remaining?` / `is_active?` optional (DB defaults). OK
  - Update (L296–308): sva polja optional. OK
  - Relationships: FK `pause_events_user_id_fkey` → profiles(id). OK
- **water_logs** (L510–541):
  - Row: 5 polja (`id, user_id, logged_at, ml_added, created_at`), **bez `updated_at`** — matches append-only dizajn. OK
  - Insert (L518–524): `ml_added` required, `user_id` required; nema `updated_at`. OK
  - Update (L525–531): postoji u type fajlu (Postgrest može da generiše tip čak i ako RLS ne dozvoljava UPDATE na runtime; DDL-level enforcement je preko izostanka UPDATE policy, što je validna strategija). NOT a bug.
  - Relationships: FK `water_logs_user_id_fkey` → profiles(id). OK
- **weekly_check_ins** (L542–594):
  - Row: 12 polja. Sve metrike (`weight_avg_kg, waist_cm, hip_cm, thigh_cm, energy_avg, identity_score, notes`) su `number | null` / `string | null` — OK, spec dozvoljava parcijalne weekly check-ins.
  - Insert (L557–570): `user_id` + `week_start_date` required, ostalo optional. OK
  - Update: sva polja optional. OK
  - Relationships: FK → profiles(id). OK
- **Enums** (L640–653): `pause_type: "illness" | "travel"` (L645) — OK, red order matches ENUM DDL order.
- **Constants.Enums** (L777–795): `pause_type: ["illness", "travel"]` (L784). OK
- Ostale tabele netaknute: `client_template_assignments`, `daily_check_ins`, `exercises`, `meal_logs`, `profiles`, `session_templates`, `user_status`, `weight_logs`. Sve prisutne sa Row/Insert/Update/Relationships.

### Biology invariants (DDL-level)

- `recovery_penalty` range [-0.5, 0]: pokriva spec scenarije (illness -0.15, travel 0) + headroom za buduće pauze bez rizika od runaway negative multiplier-a. Kombinuje sa spec "Recovery multiplier clamp [0.7, 1.1]" u runtime sloju (koji nije menjan u IT-2). DDL-level OK.
- `pause_type` ENUM samo illness + travel — spec §4.8 ne pominje druge kategorije (injury je pokriven preko `injuries[]` u profiles, ne kao pause). OK
- `identity_score` 1–5 per spec §10 — OK
- `week_start_date` DATE bez DOW CHECK-a: aplikacijski sloj će odlučiti ponedeljak-start (spec §10). DB-level nije enforce-ovano; FEATURE (ne bug) — dozvoljava buduću fleksibilnost ako se promeni anchor day.
- `ml_added <= 2000` cap: razuman fizički limit za single-entry water log (spec ne propisuje eksplicitno, ali 2L max po unosu je tipičan best-practice guard). OK

### No-touch zones (Faza A scope guard)

- `src/utils/sync/syncEngine.ts` mtime: Apr 20 00:25 2026 — netaknut u IT-2 (migracija apply-ovana 24. aprila). OK
- `src/utils/sync/*` ostali fajlovi: mtime-ovi Apr 19–20. Nijedan dirnut danas. OK
- `src/logic/` ne postoji u repo-u (n/a). OK
- `src/engine/` ne postoji (n/a). OK
- Nema t() call site promena. OK

### RLS advisory check

Static review migration fajla pokazuje proaktivno adresiranje poznatih lints:
- RLS enabled na sve 3 tabele (sprečava `rls_disabled_in_public`).
- Trigger funkcije imaju `SET search_path = public` (sprečava `function_search_path_mutable`).
- Policies koriste `TO authenticated` (sprečava `anon_key_unrestricted`).
- water_logs nema UPDATE policy — namerno, append-only. Neće generisati dodatni lint.

Main agent je verifikovao advisors posle apply-a (samo pre-existing `auth_leaked_password_protection`). Prihvaćeno.

### Findings

**Blocker:** none.

**High:** none.

**Low:**
- (L65, L71, L136, L142, L180, L185, L190, L197) Policy names koriste ćirilicu/latinicu-mix (npr. "Klijentkinja INSERT svoje water_logs", "Treneri čitaju sve..."). Funkcionalno OK; ostavlja konzistentnost sa IT-1 stilom. Buduća kosmetika.
- Nema integration testa koji simulira RLS `auth.uid()` preko Supabase service role client-a. Opcionalno za kasniju iteraciju kad CRUD sloj bude dodat (IT-3+).
- `water_logs.Update` type postoji u types.ts iako RLS nema UPDATE policy. Postgrest generiše tip na osnovu kolona, ne policy-ja. Runtime će vratiti 403 na UPDATE pokušaj. NOT a bug, ali mogao bi da se doda JSDoc komentar u service sloj da zabrani `.update()` calls na water_logs. Nice-to-have za IT-3+.

### Round trips on this iteration: 1/3

**Main agent može da komituje** sa message-om:
`feat(IT-2): weekly_check_ins + pause_events + water_logs migration`
uz Co-Authored-By trailer per workflow.

---
