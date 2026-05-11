# Upgrade Plan V2 — User Voice + Multi-Tenant Lens

> Source: deep read of `upgrade/*.md` (7 fajlova, ~265KB user research).
> Kontekst: NIJE samo Ivanin app — pravi se white-label SaaS za 50+ trenera (single-trainer per app, deljen codebase, per-tenant flags + theme).
> **Stripe/billing iskljucen iz ovog plana.**

---

## TL;DR (5 recenica)

1. Najbolnija stvar u svim platformama je **Smart Exercise Substitution** (11.599 glasova, otvoreno od 2015) — mi ga vec imamo (`exerciseSubstitution.ts`) i to je nas najveci marketing ugao zajedno sa 8-slojnim algoritmom.
2. Drugi najveci pain je **`Custom Text Notes per Exercise`** (10.841 glas) — nemamo, treba ga ubaciti odmah jer je trivijalan a USP-pojacavac (klijent zapise "seat 5, leg pad 3" i to se nosi sledeci trening).
3. Najjasniji **anti-feature signal** iz svih izvora: prisilni body measurements, streak counters, confetti/thumbs-up posle svake akcije, auto-emails na svaku izmenu — sve se mora ili izbrisati ili **per-tenant toggle**.
4. Multi-tenant prelaz znaci da svaka feature mora dobiti jedan od tri statusa: `core-locked` (algoritam, USP), `tenant-toggle` (cycle, body measurements, chat, achievements), `client-toggle` (notifications, weight prompts) — bez tabele kreiranja flagova ovo se ne moze skalirati na 50 app-ova.
5. Plan ima 4 faze: prvo izbacujemo VISAK i pravimo `tenant_config` skelet, pa gradimo top user-voice features, pa spremamo theme/branding pipeline, pa polish (wearables, advanced check-in, AI suggestions).

---

## Top 15 zahteva real-usera (sa citatima)

| # | Citat | Ko | Cesto u dok. | U app-u? | Status |
|---|-------|----|--------------|----------|--------|
| 1 | "I have lost so many clients because **they cannot find a substitute exercise easily.**" (11.599 glasova, otvoreno od 2015) | Trener | Vrlo (svuda kao #1) | DA — `exerciseSubstitution.ts` | KEEP + market |
| 2 | "Create a text box field for exercise notes (seat height/posture notes/etc)." (10.841 glas) | Trener+Klijent | Vrlo | NE | **BUILD P0** |
| 3 | "**Pause workout option** — High votes" | Klijent | Cesto | Delim. (PreWorkoutFatigue) | **BUILD P0** |
| 4 | "Water intake tracker — High votes" | Klijent | Cesto | NE | BUILD (tenant flag) |
| 5 | "Samsung Health integration — **why is this still not possible in 2026?**" | Klijent | Vrlo | NE | DEFER (Faza 4) |
| 6 | "Dark mode — High votes" | Klijent | Cesto | Delim. | BUILD (theme tokens) |
| 7 | "Manual step entry — High votes" | Klijent | Cesto | NE | BUILD (S) |
| 8 | "I'd appreciate the option to input alternative exercises (regression / standard / progression) ... **my clients get overwhelmed when trying to use the substitution feature**" | Trener | Cesto | Algoritam radi, UI nema 3-tier picker | **BUILD P0** (UI) |
| 9 | "Sending weekly check in survey/forms clients have to fill in. ... **fully customize it and reply to them from that form.**" | Trener | Vrlo | WeeklyCheckIn fixed schema | **BUILD** custom form builder |
| 10 | "I'll leave my current trainer if **Whoop integration** becomes possible elsewhere." | Klijent | Srednje | NE | DEFER |
| 11 | "have a feature for the client to record a video of them performing the exercises **within the workout** ... rather than having them pause the workout, exit out to record a video, and then go back in." (Mimi Davenport) | Klijent | Srednje | NE | BUILD (tenant flag, Faza 2) |
| 12 | "Currently, when a client completes a workout on their Garmin ... **the session is uploaded as a general workout and does not automatically match or merge with the corresponding scheduled workout** ... two separate entries on the calendar" | Klijent | Cesto | NE | DEFER (Faza 4 — wearables) |
| 13 | "I find myself making reminders in **my iPhone calendar** for things I need to do in trainerize for clients on specific dates" (Cassie David) | Trener | Cesto | NE | BUILD trener-only task list |
| 14 | "We should be able to ... **customize the macronutrient ratios** depending on the client. **It's a little frustrating.**" (Registered Dietitian) | Trener | Vrlo | Delim. | BUILD UI + per-day macros |
| 15 | "When payments fail, or programs are ending, **be able to remind me to follow up with clients.**" | Trener | Cesto | NE | DEFER (billing-related) |
| 16 | "Have it so workout templates show in a column on a left-side bar with a client's calendar open on the main screen such that a trainer can see all workouts and simply **drag/drop to a day on the calendar**" | Trener | Srednje | NE | BUILD (trener UI Faza 3) |
| 17 | "**Disable chat option!!**" + "Have a way to have the messenger option **shut off** for people who are paying just to go through a program" | Trener | Vrlo | Chat = on, nije toggle | BUILD per-tenant + per-client toggle |
| 18 | "I would really like to **declutter the workout library** by having the option to remove some of the many of different variations." (Amber Springer) | Trener | Cesto | NE (kuratorano vec) | KEEP minimal lib |
| 19 | "**Don't force client to enter weight, height etc.**" (14 votes) | Klijent | Vrlo | Onboarding ih trazi | BUILD optional fields + tenant flag |
| 20 | "**As I don't want my clients to fixate on body shape and weight, it's unhelpful for the app to include an entire section dedicated to tracking body measurements** ... toggle off these features for my clients." | Trener | Vrlo (najjaci konsenzus) | Progress section postoji full | BUILD tenant + client toggle |

---

## Sta je VISAK trenutno u app-u

(kandidati za skrivanje iza tenant flag-a ili izbacivanje)

| Feature | Razlog | Preporuka |
|---------|--------|-----------|
| `CycleTracker.tsx` (vec git-deleted) | Ne radi za sve trenere; ED/postpartum klijenti; muski treneri ne koriste | KILL ili strogi `tenant.cycle_tracking = on` (default off za nove tenant-e) |
| `MilestonesPage` + svi achievements popups | "Having the popup everyday for every metric of reaching an achievement is annoying" — Marie Anderson | **HIDE BEHIND FLAG**, default off. Trener bira "celebrate at ranges (5/10/...)". Streak counter NIKAD klijent-side. |
| `DailyCheckInSheet` (vec git-deleted) | Previse upitnika; weekly + post-workout je dovoljno | KILL — vec uradjeno, nemoj vracati |
| Onboarding `FrequencyStep` (deleted) za beginnere | Vec skipped, dobro | KEEP killed |
| Forced weight/height u onboarding | "Don't force client to enter weight, height etc." (14 votes) | SIMPLIFY — fields opcioni; tenant odlucuje da li su required |
| Body measurements full section (12 measurement sites) | Najupecatljiviji negative quote u celom istrazivanju | HIDE BEHIND FLAG (default 1-3 sites max; trener bira) |
| Chat (uvek-on) | "Disable chat option!!" — neki tier-i ne placaju za trener access | HIDE BEHIND FLAG (`tenant.chat_enabled` + `client.chat_enabled`) |
| Confetti/thumbs-up animacije | "thumbs up after every activity is ridiculous - it's slow and time consuming" — Marie Anderson | KILL ili hard-mute na default |
| Auto-emails klijentu na svaku izmenu programa | "5 to 10 changes ... 10 emails ... annoying" — Ryan | SIMPLIFY → Save vs Publish workflow + batch emails |
| Multi-language i18n vec ima 2 jezika hardcoded | OK ali tenant treba da bira primary jezik | KEEP, ali expose `tenant.default_language` |
| Pre-built meal templates (sa fixed macros) | "preset macronutrient ratios ... too strict" | SIMPLIFY → trener moze custom macro slider |
| `ProgramTargeting.tsx` (deleted) | Trener-side feature koji nije bio jasan | KEEP killed |
| Sve `ui/*` shadcn komponente koje su deleted | Bloat | KEEP killed (good cleanup) |
| `SwipeBack.tsx` (deleted) | iOS gesture handled native | KEEP killed |
| Default voice u workout (ako postoji) | "complaints about the new voice and countdown lady. We would love to be able to choose what they hear" | mute by default, opt-in |

---

## Multi-tenant flag taksonomija (KRITICNO)

Default u koloni "Default" znaci **ono sto vidi novi tenant van box-a**. `Per-tenant flag` = trener moze ON/OFF. `Client-side` = i klijent moze override (poslednji slovo pobedjuje).

| Feature | Default | Per-tenant flag | Client toggle | Razlog |
|---------|---------|-----------------|---------------|--------|
| Smart Cut hijerarhija | on | **NO (core)** | no | USP, ne dirati |
| Smart Exercise Substitution | on | NO (core) | no | Najveci konkurentski pain — nas USP |
| Mezociklus + RPE/RIR ramp | on | NO (core) | no | Algoritam |
| Emergency Refeed | on | NO (core) | no | Algoritam |
| Cycle/menstrual tracking | **off** | YES | yes | ED-history, muski klijenti, religiozni klijenti |
| Body measurements (full 12 sites) | off | YES | yes | "ED fixate" pain |
| Body measurements (1-3 osnovne: tezina, struk, kuk) | on | YES (treba moci hide all) | yes | Default minimal |
| Progress photos | off | YES | yes | "Don't fixate on body shape" |
| Weight prompt daily | off | YES | yes | "Don't force client to enter weight" |
| Chat (klijent ↔ trener) | on | YES | YES | Tier-aware (self-serve vs 1:1) |
| Voice notes | off | YES | no | Ne svi treneri koriste |
| Video form upload (in-workout) | off | YES | no | TrueCoach win, neka bude opt-in |
| Wearable sync (Apple/Garmin/Whoop) | off (Faza 4) | YES | yes | Premium tier |
| Custom check-in form builder | on | YES (template-level) | no | Trener kreira template |
| Habit tracker | off | YES | yes | Behavior-change coaches da, hipertrofija coaches ne |
| Water tracker | off | YES | yes | Wellness-leaning trener da, pure-strength coaches ne |
| Step tracker (manual entry) | off | YES | yes | NEAT gate koristi Apple Health, manual fallback |
| Achievements / badges | **off** | YES | YES | "ridiculous, slow, time consuming" |
| Streak counter (visible to client) | **OFF (never client-side)** | NO | NO | Streak anxiety = drop-off |
| Streak (trener-side metric) | on | NO | n/a | Trener treba retention signal |
| Pre-workout fatigue dialog | on | YES | yes | Algoritam-fed, ali neke klijente plasi |
| Post-workout 3-button feedback | on | YES | yes | DOMS detection treba ovo |
| Macro tracking (food log) | on | YES | yes | Ako trener ne radi nutrition, hide cela tab |
| Custom macro split (per gram) | on | YES | no | RD requirement |
| Per-day macros (training/rest/refeed) | on | YES | no | Algoritam vec ima refeed |
| Meal photo upload | off | YES | yes | Ne svi koriste |
| Allergen/exclusion filter | on | YES | yes | Univerzalna potreba |
| Trainer dashboard alerts | on | YES (granular: koji alert) | n/a | Trener bira sta ga zanima |
| Theme tokens (boja, logo, font) | tenant-specific | YES (`tenant.theme`) | no | Core za white-label |
| Default jezik | tenant-specific | YES | yes (override) | EN/SR sad, lako dodati |
| Push notifikacije | on | YES (granular) | YES | Najveci frustration vector |
| Auto-email na svaku promenu programa | **off** | YES | yes | "10 emails — annoying" |
| Drag-drop calendar (trener UI) | on | YES (trener pref) | n/a | Trener UX |
| Trainer task list / reminders | on | YES | n/a | Trener-side only |
| Onboarding `MotivationStep` | on | YES (custom pitanja) | no | Tenant brand specific |

---

## Real-user pain points koji su HOT (BUILD odmah)

1. **Custom text notes per exercise** (10.841 glasova) → input + carry-forward na sledeci log; trener vidi u trainer dashboard. Effort: **S**.
2. **Pause workout button** (visok glas) → state machine za sesiju (active/paused/resumed/abandoned) + restore. Effort: **S**.
3. **3-tier exercise picker** (regression/standard/progression) prikazan kao 3 cipa unutar workout cara, umesto modal liste 50 stavki. Algoritam vec generise, fali UI. Effort: **M**.
4. **Custom macro slider** (per klijent, per dan-tip: training/rest/refeed). RD pain point. Effort: **M**.
5. **Custom check-in form builder** (trener pravi pitanja, klijent odgovara, trener vidi history). Effort: **M-L**.
6. **Body measurements + cycle tracker iza tenant flag-a** (default off, trener-controlled visibility). Tehnicki HIDE, ne kill, jer Ivani treba. Effort: **S** (samo `tenant_config` lookup wrapper).
7. **Save vs Publish za program edits** (jedan email klijentu na publish, ne na svaku promenu). Effort: **S** (queue + debounce na backend).
8. **Trainer task list / podsetnici** (trener-only tab, "follow up Marija ponedeljak"). Effort: **S**.
9. **Weight/height optional u onboarding** + tenant flag da li su required. Effort: **S**.
10. **Manual step entry fallback** (kada Apple Health nije konektovan). Algoritam NEAT gate ce raditi cleaner. Effort: **S**.

---

## Pain points koji su MEHANICKI (DEFER ili automatizuj)

- **App speed / crashes / freezes** — "Every time I use this app **my phone stops working**" — to nije nova feature, to je perf budget. Vec smo lean (Vite + React + Supabase). Treba: bundle size budget < 350KB initial, lazy-load Trainer dashboard, virtualizovati duge liste exercise-a.
- **Confetti/animacije** — KILL by default, nije feature.
- **Body measurements obsession** — to je vec resi tenant flag, ne nova tab.
- **Auto-emails na svaku izmenu** — to je backend job batching, ne novi modul.
- **Default voice** — ako postoji, mute. Ako trener hoce voice → upload custom.
- **Onboarding walkthrough video** — NEMA, dobro. Ne dodavati.
- **Multi-language sync** — vec imamo i18n, treba samo `tenant.default_language` field i fallback.
- **Achievement popup spam** — vec smo killed `MilestonesPage` cleanup, ostaviti tako.

---

## Konkurencija i USP

### Sta JEDINO mi imamo

- **8-slojni algoritam za zenske klijente** (mezociklus + RPE ramp + tempo + smart cut + refeed + diet break + lifestyle adj. + biofeedback). NIJEDNA platforma (Trainerize, Everfit, TrueCoach, PT Distinction, My PT Hub, HubFit, Kahunas) nema autonomni weekly auto-progression koji "razume" deload, plateau, refeed, diet break u jednom toku.
- **Surgical Swap** auto-substitution po povredama bez trener-intervencije — Trainerize otvoren ticket od 2015.
- **Hashimoto/PCOS/anemia constraints** ugradjeni u meso + nutrition. Niko ne mapira "T2DM → carb-conscious" automatski.
- **Beginner vs intermediate skeleton automatic switch** sa graduation criteria. Niko (trener mora rucno).

### Sta svi imaju

- Workout builder, basic chat, basic progress tracking, MFP sync, photo log, payment processing.

### Sta NEMAMO ali korisnici traze

- Custom text notes per exercise (P0)
- Pause workout (P0)
- Custom check-in form builder (P0)
- Wearable sync **dubok** (Whoop, Oura, Garmin) — DEFER
- Drag-drop calendar trener UI — Faza 3
- Apple Watch native app — DEFER
- Video form upload in-workout — Faza 2 (tenant flag)
- 3-tier regression/standard/progression UI picker — P0 (algoritam radi, fali UI)

### Marketing ugao iz dokumentacije

> "Sve sto vam Trainerize forsira a ne treba vam — mi ne radimo."

---

## Multi-tenant arhitektura — sta sad treba pripremiti

Konkretni kodni potezi (samo plan, ne kod):

1. **`tenant_id` na svim tabelama**
   - Dodati `tenant_id uuid` kolone u sve klijent-vezane tabele (`profiles`, `workouts`, `meal_logs`, `weekly_checkins`, `body_measurements`, `messages`).
   - Dodati `tenants` tabelu: `id, slug, name, primary_color, secondary_color, accent_color, logo_url, default_language, created_at`.
   - RLS policy: `auth.jwt() -> tenant_id == row.tenant_id`.

2. **`tenant_config` (feature flags)**
   - Tabela `tenant_config`: `tenant_id uuid PK, feature_key text, enabled bool, value jsonb`.
   - JS helper: `useFeatureFlag('cycle_tracking')` — single hook svuda.
   - Init svaki tenant sa default seed iz tabele iznad.

3. **`client_overrides`**
   - Tabela `client_feature_overrides`: `(client_id, tenant_id, feature_key, enabled)` za fields koje klijent moze ugasiti (notifs, weight prompts).

4. **Theme tokens iz Supabase, ne iz Tailwind hardcode**
   - `tenants.theme jsonb` → CSS variables injected u `<html style>` na app boot.
   - Tailwind config koristi `var(--brand-primary)` umesto hex.
   - Logo url -> `<TenantBrandLogo>` komponenta.

5. **Single codebase, multi-deploy strategija**
   - Build-time env var `VITE_TENANT_SLUG` ili runtime-detection iz hostname.
   - Capacitor build script: za svaki tenant generise iOS/Android bundle sa svojim slug + logo (jedan codebase, 50 builds).
   - Centralna kontrolna tabla: `super_admin` rola u Supabase + Edge Function za "push update to all tenants" (tenant_config edits propagated kroz realtime).

6. **Lock-down trener-only features**
   - `useUserRole()` postoji vec? Ako ne, dodati `role: 'client' | 'trainer' | 'super_admin'`.
   - Sve trener komponente (`PocetniciAlertsCard`, `ClientWeekIndicator`, dashboard) gate-ovane tom rolom.
   - Klijent NIKAD ne sme videti `tenant_config` panel.

7. **Centralna kontrolna tabla (super-admin app)**
   - Posebna ruta `/superadmin` (gated by Supabase email allowlist).
   - Lista svih tenant-a + njihovog `tenant_config` JSON-a.
   - Ability to push `tenant_config` change i odmah propagate (Realtime channel).
   - Theme preview pre commit-a.

8. **Migration plan za postojece (Ivanin) podatke**
   - Backfill `tenant_id = 'fitbyivana'` na svim postojecim row-ovima.
   - Default `tenant_config` za nju ukljucuje `cycle_tracking=on`, `body_measurements=on`, jer ona to koristi.

---

## Plan rada (4 faze, BEZ Stripe-a)

### Faza 1: Anti-bloat + UX polish + tenant skeleton (2-3 nedelje)

**Cilj:** Resetovati app na "clean Ivana baseline" + pripremiti tenant infrastrukturu.

- [ ] Audit i remove svih confetti/toast spam-a (ostaviti samo kritican feedback).
- [ ] Save vs Publish workflow za trener-edited program changes (debounce auto-emails).
- [ ] `tenant_id` migracija + RLS policies + backfill.
- [ ] `tenants` + `tenant_config` + `client_feature_overrides` tabele.
- [ ] `useFeatureFlag` hook + wire na: cycle, body measurements, progress photos, chat, achievements, streak.
- [ ] Onboarding: weight/height optional + tenant flag za "required".
- [ ] Body measurements: default 1-3 fields (weight, waist, hip), trener u dashboard-u bira.
- [ ] Cycle tracker: default OFF za nove tenante; ON za Ivanu (seed migration).
- [ ] Theme tokens iz `tenants.theme` umesto Tailwind hardcode.

### Faza 2: Top user-voice BUILDs (P0 user requests, 3-4 nedelje)

- [ ] **Custom text notes per exercise** + carry-forward sledeci trening.
- [ ] **Pause workout** state machine (active/paused/abandoned + restore + grace period).
- [ ] **3-tier regression/standard/progression** UI picker (algoritam vec generise alternative).
- [ ] **Custom macro slider** per klijent + per dan-tip (training/rest/refeed).
- [ ] **Custom check-in form builder** (trener kreira pitanja, klijent odgovara, history view).
- [ ] **Trainer task list** (follow-up reminders, trener-only tab, ne klijent-vidljiv).
- [ ] Manual step entry fallback (kada Apple Health nije konektovan).
- [ ] Water tracker (tenant flag, default off).

### Faza 3: Multi-tenant infrastructure (priprema za 50 app-ova, 3-4 nedelje)

- [ ] Super-admin kontrolna tabla (`/superadmin` ruta + Supabase RBAC).
- [ ] Theme preview + push-to-tenant pipeline.
- [ ] Capacitor multi-build script (jedan codebase → N iOS/Android binaries).
- [ ] Tenant onboarding flow (kreiranje novog trenera, default seed config, theme upload).
- [ ] Realtime config sync (tenant_config edit u super-admin → odmah propagated).
- [ ] White-label email template engine (sender = trener, ne FitByIvana).
- [ ] Drag-drop calendar trener UI (workout templates → days, levo bar + main calendar).
- [ ] Translations: tenant-overridable strings (npr. "Workout" → "Sesija" za jednog trenera, "Trening" za drugog).

### Faza 4: Polish + retention features (4-6 nedelja)

- [ ] Wearable sync depth: Apple Health + Garmin + Whoop + Oura.
- [ ] Wearable workout merge logic (jedna sesija u kalendaru, ne dve).
- [ ] Apple Watch native (Capacitor + WatchKit shim).
- [ ] Video form upload IN-workout (camera → exercise log → trainer review).
- [ ] Side-by-side progress photos na desktop trener dashboard.
- [ ] Habit tracker tab (tenant flag, behavior-change coaches).
- [ ] Smart shift after missed workouts (algoritam vec nesto radi, treba "intro-week or lighter restart" logika).
- [ ] AI suggestions: "your client is 80% qualified for Intermediate" alert za trenera.

---

## Konflikti izmedju MD fajlova (FLAG)

1. **Body measurements** — `feature_requests_real_users.md` ih spominje kao "must-have parity" (Tier A) ali `sta_je_visak_komplikovano.md` i `master_8020_sinteza.md` insistiraju da su izvor najveceg klijent-pain-a (ED fixate). **Resolution:** zadrzati funkcionalno, **default OFF** za nove tenante, granular control od strane trenera.
2. **Achievements/badges** — `personalizacija_automatizacija_deep_dive.md` ih spominje kao retention tool (Layer 3 group/self-serve), `sta_je_visak_komplikovano.md` ih bezuslovno odbacuje. **Resolution:** off by default; tenant moze enable + bira "celebrate at ranges (5/10/...)" umesto svake aktivnosti.
3. **Chat default** — `master_8020` insistira na uvek-on, korisnici (`feature_requests_real_users.md`) glasno traze opt-out po klijentu. **Resolution:** on by default per-tenant, ali per-client toggle (tier-aware).
4. **Wearables** — `feature_requests_real_users.md` ih stavlja u Tier A (must-have), `master_8020` u Tier B. **Resolution:** Faza 4 (cilj je tenant pipeline pre wearable depth).
5. **Habit tracker** — `personalizacija_deep_dive.md` ga gura kao behavior-change USP, `sta_je_visak_komplikovano.md` upozorava na engagement bloat. **Resolution:** tenant flag, off by default, on za "wellness/lifestyle" tenant-e.

---

## Odluke za usera (samo neresena pitanja, max 5)

1. **Tenant slug strategija**: hostname-based (`marija.app`, `ana.app`) ili path-based (`fitsaas.com/marija`)? Hostname → bolji branding ali skuplja DNS infra. **Predlog:** path-based za web, custom URL scheme za iOS/Android Capacitor build (jeftinije za 50 app-a).
2. **Cycle tracker default za Ivanu vs nove tenante**: potvrdjeno da Ivana zadrzava ON, novi tenanti default OFF? Ako da, seed migration ide tako.
3. **Da li graditi sopstveni custom check-in form builder ili reuse open-source (npr. SurveyJS)?** Open-source je M effort, custom je L. **Predlog:** SurveyJS embedded + Supabase persistence.
4. **Achievements/streaks** — potpuno KILL ili sakriti iza flag-a? Plan trenutno sakriva, ali ako Ivana ne koristi → KILL je cleaner.
5. **Centralna kontrolna tabla (super-admin)** — separate Vite app ili route u istom codebase-u sa role gating? **Predlog:** route u istom codebase-u (manje deploy footprint), gated kroz Supabase Auth allowlist.
