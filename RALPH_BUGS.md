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
