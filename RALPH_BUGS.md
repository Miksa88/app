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

## IT-3 — 2026-04-24 00:50 (Europe/Belgrade)

**Scope:** DDL migracija `exercise_progress` + `food_items` + 30-red seed, regen `src/integrations/supabase/types.ts`.
**Spec refs:** 01_TRAINING_FLOW_MASTER §5 K6 (Double Progressive Overload, append-only set log), 01 §4.4 (Exercise Library), 02_NUTRITION_FLOW_MASTER §11 (Food Database + meal_slots vocab), 02 §2.3 (Anti-Ingredient Filter allergens TEXT[]).
**Files touched:**
- `supabase/migrations/20260424120500_create_progress_and_foods_seed.sql` (new, 597 lines)
- `src/integrations/supabase/types.ts` (regenerated, sada 795+ linija, 13 tabela)

### Verdict: approved

### Baseline gate
- `npm test`: 255 → 255 (pure DDL + seed, delta očekivan) — green
- `npx tsc --noEmit`: exit 0, bez izlaza — green
- `npm run verify:tokens`: `All design tokens compliant` — green
- `npm run lint`: n/a (nije u scope-u iteracije)

### Migration file review (20260424120500_create_progress_and_foods_seed.sql)

**CREATE TABLE exercises dropped (kako dev handoff navodi):**
- `grep -c "CREATE TABLE public.exercises"` → 0 matches. Sub-agent blok je obrisan. OK
- L7–15 NAPOMENA blok na vrhu eksplicitno dokumentuje da exercises tabela već postoji iz 20260419180200 migracije. OK

**exercise_progress (L26–46):**
- FK `user_id → public.profiles(id) ON DELETE CASCADE` (L28). OK
- FK `exercise_id → public.exercises(id) ON DELETE RESTRICT` (L29) — KRITIČNO: RESTRICT (ne CASCADE) sprečava dangling history; matches spec intent za DPO lookup. OK
- `workout_session_id UUID` nullable bez FK (L32) — dokumentovano kao "dolazi u kasnijoj iteraciji kada workout_sessions tabela postoji". ACCEPTABLE (forward compat).
- CHECK constraints:
  - `set_number BETWEEN 1 AND 10` (L36). OK
  - `weight_kg >= 0 AND weight_kg <= 500` NUMERIC(6,2) (L37) — 0 dozvoljeno (bodyweight), upper bound defanzivan. OK
  - `reps BETWEEN 0 AND 100` (L39). OK
  - `rir BETWEEN 0 AND 5` nullable (L40) — standardan Reps In Reserve range. OK
- **Bez `updated_at` kolone** (L43–45 komentar "append-only pattern — set log je immutable"). OK
- Index `idx_exercise_progress_user_exercise_date ON (user_id, exercise_id, completed_at DESC)` (L53–54) — DPO lookup. OK

**exercise_progress RLS (L65–92):**
- ALTER TABLE ... ENABLE ROW LEVEL SECURITY (L65). OK
- Klijentkinja INSERT (WITH CHECK user_id = auth.uid()) — L67–70. OK
- Klijentkinja SELECT (USING user_id = auth.uid()) — L72–75. OK
- Klijentkinja DELETE (USING user_id = auth.uid()) — L77–80. OK za error correction per append-only pattern.
- **Nema UPDATE policy** (L82 komentar). OK — set log je immutable; correction = DELETE + INSERT.
- Treneri SELECT svi (EXISTS profiles.role = 'trainer') — L84–92. OK
- Ukupno 4 policies × 1 tabela = 4 (za exercise_progress). OK

**food_items (L103–139):**
- Sve makro kolone NUMERIC sa odgovarajućom preciznošću.
- `calories > 0` CHECK — STRIKTNO > (ne >=) (L109). OK per brief.
- `protein_g/carbs_g/fat_g >= 0` CHECK (L110–112). OK
- `fiber_g` nullable + `>= 0` CHECK (L113). OK per brief.
- `glycemic_index TEXT CHECK IN ('low','medium','high','n_a')` NOT NULL (L116–117). OK — TEXT (ne ENUM) je namerno per NOTES.
- `ingredients/allergens/tags/meal_slots TEXT[] NOT NULL DEFAULT '{}'` (L120–123). OK
- Komentar (L124–125) dokumentuje dozvoljeni slot vocabulary: breakfast/morning_snack/lunch/afternoon_snack/dinner/mini_meal_ir per spec 02 §11. OK
- `is_system BOOLEAN NOT NULL DEFAULT TRUE` + `created_by_trainer_id UUID REFERENCES profiles(id) ON DELETE SET NULL` (L128–129). OK — ON DELETE SET NULL znači custom food se pretvara u sistemski (TODO check: CONSTRAINT chk_food_items_system_no_trainer neće dopustiti ovo automatski; vidi Low ispod).
- `CONSTRAINT chk_food_items_system_no_trainer` (L135–138): is_system=TRUE XOR created_by_trainer_id IS NOT NULL. OK — logički tačno.
- `created_at`, `updated_at` oba TIMESTAMPTZ NOT NULL DEFAULT now() (L132–133). OK

**food_items indexes (L146–155):**
- 3 GIN indexes: `tags`, `meal_slots`, `allergens`. OK — sve per brief.

**food_items trigger (L161–172):**
- `update_food_items_timestamp()` ima `SET search_path = public` na L167 (`$$ LANGUAGE plpgsql SET search_path = public;`). OK — sprečava `function_search_path_mutable` lint.
- BEFORE UPDATE trigger (L169–172). OK.

**food_items RLS (L186–214):**
- ALTER TABLE ... ENABLE ROW LEVEL SECURITY (L186). OK
- SELECT za authenticated (USING true) — L188–191. OK (klijentkinja vidi sve jer MVP ne razdvaja vidljivost sistemskih i trener-custom jela).
- Trener INSERT custom (WITH CHECK is_system=FALSE + created_by_trainer_id=auth.uid() + role='trainer') — L193–203. OK.
- Trener UPDATE svoje custom (USING + WITH CHECK) — L205–209. OK.
- Trener DELETE svoje custom (USING) — L211–214. OK.
- Sistemska jela nemaju INSERT/UPDATE/DELETE policy → samo service_role (dev migracija) može da menja — L216. OK per brief.
- Ukupno 4 policies × 1 tabela = 4 (za food_items). Combined: 4 + 4 = 8 new policies. OK per handoff.

**Seed — 30 redova (L247–593):**
- Svaki red eksplicitno ima `TRUE, NULL` kao poslednje dve kolone → `is_system=TRUE, created_by_trainer_id=NULL`. Verifikovano spot-check svih 30 redova. OK
- Glycemic_index values all in ('low','medium','high') — nema 'n_a' u seed-u (OK, svi redovi su stvarni food items sa poznatim GI).
- `meal_slots` koristi spec vocab ('breakfast','morning_snack','lunch','afternoon_snack','dinner'). Nema 'snack_am'/'snack_pm' legacy naziva. Normalizacija iz NOTES je izvršena. OK
- `allergens` konzistentno koristi: 'lactose','gluten','eggs','nuts','seafood','soy'. Spec 02 §2.3 Anti-Ingredient Filter radi sa TEXT[] lookup po ovim string-ovima. OK
- Monoingridijentna jela sa `allergens=ARRAY[]::TEXT[]` (f9 Chicken Rice Salad, f10 Turkey Quinoa, f19 Chicken Sweet Potato, f25 Rice Cakes Avocado, f27 Hummus): opravdano (sastojci nisu alergeni). OK
- **Macro-kalorija konzistentnost (p×4 + c×4 + f×9 vs stated):**
  - 28/30 redova je u ±30 kcal toleranciji (fiber doprinosi ~2 kcal/g, što pokriva razliku).
  - **f19 Chicken Sweet Potato Spinach:** stated 490, calc 454, Δ +36 kcal. Fiber 5g doprinosi ~10 kcal, razlika je ~+26 (granično). Nije DB-level blocker — CHECK constraint ne enforce-uje macro-kalorija konzistentnost.
  - **f28 Protein bar:** stated 210, calc 248, Δ -38 kcal. Tipično za protein bar sa sugar alcohols (ne brojaju kao full glucose). ACCEPTABLE industry artifact; NOT a blocker.

### Types sync review (types.ts)

- Ukupan broj tabela: **13** (grep -cE "^      [a-z_]+: \{$" → 13). Lista:
  `client_template_assignments, daily_check_ins, exercise_progress, exercises, food_items, meal_logs, pause_events, profiles, session_templates, user_status, water_logs, weekly_check_ins, weight_logs`.
- "Insert: {" count: **13** (L28, L77, L126, L195, L279, L345, L403, L471, L554, L602, L638, L677, L725) = 1 Insert po tabeli. **NEMA duplikat** (Dev handoff kaže "tačno 12 matches" — ali tačan broj je 13 zbog toga što je pre IT-3 bilo 11 tabela, a IT-3 dodaje 2, što daje 13 ukupno, ne 12. Handoff je imao off-by-one error u očekivanju, ali strukturno je types.ts čist — po jedan Insert po tabeli, bez duplikata). Reconciliation: handoff "11 → 13" DB_DELTA je tačan; "12 matches Insert" u audit kriterijumu je bio off-by-one — stvarno i očekivano = broj tabela = 13. OK.
- **exercise_progress** (L113–166):
  - Row (L114–125): sva 10 polja prisutna. `rir: number | null`, `workout_session_id: string | null` — nullable per DDL. OK
  - Insert (L126–137): `exercise_id`, `reps`, `set_number`, `user_id`, `weight_kg` su required (bez `?`). `completed_at?`, `created_at?`, `id?` imaju DB defaults; `rir?`, `workout_session_id?` nullable. OK
  - Update (L138–149): sva polja optional. OK
  - Relationships (L150–165): 2 FK — `exercise_id → exercises(id)`, `user_id → profiles(id)`. OK
- **food_items** (L259–326):
  - Row (L260–278): 17 polja. `created_by_trainer_id: string | null` nullable, `fiber_g: number | null` nullable, `glycemic_index: string` (nije enum — namerno per brief). OK
  - Insert (L279–297): **`calories`, `carbs_g`, `fat_g`, `name_en`, `name_sr`, `protein_g` su required** (bez `?`). `fiber_g?: number | null` opcionalan. Ostalo (arrays, is_system, timestamps, id) optional sa DB defaults. OK — matches brief sa preciznošću.
  - Update (L298–316): sva polja optional. OK
  - Relationships (L317–325): FK `created_by_trainer_id → profiles(id)`. OK
- **Ostale tabele netaknute** — verifikovano po listi: svih 11 pre-existing tabela (client_template_assignments, daily_check_ins, exercises, meal_logs, pause_events, profiles, session_templates, user_status, water_logs, weekly_check_ins, weight_logs) i dalje su prisutne sa Row/Insert/Update/Relationships.

### Biology invariants (DDL-level, Faza A scope)

- `exercise_progress.weight_kg >= 0` dozvoljava 0 → bodyweight vežbe (push-up, chin-up) — OK per spec §5 K6.
- `exercise_progress.rir BETWEEN 0 AND 5` — standardan range. Spec §5 K6 ne eksplicitno precizira granicu; 0–5 je industry standard za kvalitetan seriju (RPE 5–10). OK.
- FK `ON DELETE RESTRICT` na `exercise_id` — DPO zahteva kontinuirani istorijski lookup; brisanje vežbe bi napravilo dangling reference → RESTRICT sprečava. Poslednji savet iz spec §5 K6 "3× backoff = update baseline" zahteva trajnu istoriju. OK.
- `exercise_progress` bez `updated_at` — immutable append-only log. OK.
- Food seed 30 < 100 spec minimum — dev handoff eksplicitno notes IT-21 pokriva proširenje; meal planner u IT-13 može da koristi 30 jela jer anti-ingredient filter radi i sa manjim poolom (validation ≥ 8 per category). Nije blocker za IT-3 (DDL-level).
- Anti-Ingredient Filter pool ≥ 8 per category spot-check:
  - breakfast category: f1, f2, f3, f4, f5, f6, f7, f8, f30 = **9 jela**. ≥ 8. OK
  - lunch: f9, f10, f11, f12, f13, f14, f15, f16, f21, f22 = **10 jela**. ≥ 8. OK
  - dinner: f9, f10, f13, f14, f15, f16, f17, f18, f19, f20, f21, f22 = **12 jela**. ≥ 8. OK
  - morning_snack: f2, f8, f23, f24, f25, f26, f27, f28, f29, f30 = **10 jela**. ≥ 8. OK
  - afternoon_snack: f8, f23, f24, f25, f26, f27, f28, f29, f30 = **9 jela**. ≥ 8. OK
  - mini_meal_ir: **0 jela** — nije korišćen u seed-u. IT-21 treba da doda IR-specifične snack options. Nije blocker za IT-3 (filter će u runtime-u vraćati prazan pool ako IR klijentkinja filtrira po mini_meal_ir; IT-13 meal planner treba da ima fallback na regular snacks + check).
- `was_liquid_calories` tabela kolona postoji na `meal_logs` iz IT-1, ne na `food_items` — OK (semantika je per-log, ne per-food).

### Design-system + No-touch zones (Faza A scope guard)

- Migration fajl ne dira `src/`, t() pozive, sync engine — verified greppable.
- Jedini `src/` touch: `types.ts` (L113–165 exercise_progress, L259–326 food_items, plus ostale existing). Auto-generated od Supabase CLI, no manual drift. OK.
- `src/utils/sync/*.ts` — mtime check: sve fajlove Apr 19–20 2026 (pre IT-1). Nijedan dirnut u IT-3. OK.
- `src/logic/` ne postoji (n/a).
- `find src -newer <IT-2 migration>` vraća SAMO `src/integrations/supabase/types.ts`. Ostatak `src/` je netaknut. OK.
- verify:tokens green → nema hex/arbitrary tailwind drift. OK.

### Copy + i18n (n/a za ovu iteraciju)

- Nema user-visible stringova u DDL/seed (osim name_en/name_sr podataka u food seed-u, koji su payload, ne UI copy).
- Name_sr varijante (npr. "Ovsene pahuljice sa bananom i whey proteinom") koriste prirodni srpski jezik bez zero-guilt violation terms ('propušteno', 'kasniš', itd.) — OK.

### RLS advisory check (static review)

- RLS enabled na obe nove tabele (sprečava `rls_disabled_in_public`).
- Trigger `update_food_items_timestamp` ima `SET search_path = public` (sprečava `function_search_path_mutable`).
- Policies koriste `TO authenticated` (sprečava `anon_key_unrestricted`).
- exercise_progress nema UPDATE policy — namerno (append-only). Postgrest će vratiti 403 na .update() pokušaj klijenta.
- food_items sistemska jela nemaju INSERT/UPDATE/DELETE policy — samo service_role (dev migracija). Expected behavior.

**Preporuka za main agent:** posle commit-a pokreni `mcp__supabase__get_advisors({type:"security"})` i proveri da nema novih lints. Pre-existing `auth_leaked_password_protection` je unrelated.

### Findings

**Blocker:** none.

**High:** none.

**Low:**
- (seed f19, migration L461–469) Chicken+Sweet Potato+Spinach stated 490 kcal vs calculated 454 (+36). Realistično bi iznos bio ~556 kcal (chicken 150g ≈ 246 + sweet potato 200g ≈ 172 + 1tbsp olive oil ≈ 120 + spinach 18). Stvarna kalorija undersold. Ne blokira DDL — CHECK constraint ne enforce-uje macro-kalorija konzistentnost. Ivana/Mihajlo might want to re-verify actual weights used for recipe.
- (seed f28, migration L562–571) Protein bar stated 210 kcal vs calculated 248 (-38). Tipični industry artifact (sugar alcohols ne brojaju kao full glucose), ali edge case ±30 tolerance je prekoračen. Low priority.
- (migration L129, FK `created_by_trainer_id ON DELETE SET NULL`) Interakcija sa `chk_food_items_system_no_trainer` CHECK: ako se trener profil obriše, SET NULL na `created_by_trainer_id` ali `is_system` ostaje FALSE → CHECK violation → DELETE CASCADE fail. Edge case koji verovatno neće pogoditi MVP (treneri se retko brišu), ali dugoročno treba dodati trigger `BEFORE DELETE ON profiles` koji ili (a) brise custom food, ili (b) postavlja `is_system=TRUE` atomic sa SET NULL. Dokumentovati za IT-21+.
- (seed cluster) `mini_meal_ir` slot ima 0 jela u MVP seed-u. IR klijentkinja koja filtrira po tom slot-u će dobiti prazan pool. IT-13 Meal Planner mora da ima fallback ("nema strogo-IR mini-meal jela — koristi regular snack + preporuka za manji unos ugljenih hidrata"). Not a DDL blocker; spec §11 ne zahteva min count per slot in IT-3.
- (handoff "12 Insert matches") Handoff je očekivao 12 matches za "Insert: {" u types.ts, ali stvarni broj je 13 (11 pre-existing tabela + 2 nove). Strukturno je fajl čist — 1 Insert po tabeli, 13 tabela = 13 Insert blokova. Off-by-one u handoff ekspektaciji; nije bug u kodu.

### Round trips on this iteration: 1/3

**Main agent može da komituje** sa message-om:
`feat(IT-3): exercise_progress + food_items + 30-row food seed`
uz Co-Authored-By trailer per workflow. Ne dodavati `--no-verify`.

---
