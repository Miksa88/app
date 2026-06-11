# Plan rada — od audita (6.5/10) do white-label proizvoda

**Datum:** 2026-06-11
**Status (2026-06-11):** Faze 0–3 ZAVRŠENE ✅ · Faza 4 u toku (4.2 analitika ✅, 4.3 Sentry čeka DSN + mesečni advisors check zakazan ✅, 4.4 nacrt u docs/MVP_PRESET.md ✅, 4.1 čeka produkcioni deploy) · Faza 5 čeka 5+ tenanta. GitHub remote još ne postoji — CI neaktivan do push-a.
**Cilj:** Kod "apoteka" (8+/10) → univerzalni MVP koji se prodaje i setupuje različitim trenerima (boje/logo/podešavanja po tenantu), uz Ivanin algoritam kao premium feature flag.
**Strategija tenancy:** Opcija A — kopija po treneru (svaki trener = svoj Supabase projekat + svoj deploy iz istog master repo-a). Multi-tenant se NE radi dok ne bude 5+ trenera koji plaćaju.

---

## FAZA 0 — Quick wins (security + higijena) · ~1 dan

| # | Zadatak | Fajlovi | Done kriterijum |
|---|---------|---------|-----------------|
| 0.1 | CORS whitelist umesto `*` u svih 13 edge funkcija (deljeni `_shared/cors.ts`, origin iz env var) | `supabase/functions/*/index.ts` | Poziv sa stranog origina pada |
| 0.2 | Generičke error poruke ka klijentu; pravi error samo u `console.error` (server log) | sve edge funkcije | Nijedan `error.message` iz DB ne ide u response |
| 0.3 | Cron secret: fail-loud ako `CRON_SECRET` nije setovan | `daily-push-reminders`, `smart-cut-tick`, `mesocycle-tick` | Funkcija baca grešku bez env var |
| 0.4 | Počistiti 3 ESLint greške (uklj. `any` u `Profile.tsx:260`) | `src/pages/Profile.tsx` + 2 | `npx eslint src --quiet` = 0 |
| 0.5 | `logger` util (dev-only) i zamena 40 `console.*` poziva | `src/lib/logger.ts` + src | `grep console\.` u src = 0 (osim logger-a) |

## FAZA 1 — Refaktor jezgra na 8/10 · ~2-3 nedelje

| # | Zadatak | Detalji | Done kriterijum |
|---|---------|---------|-----------------|
| 1.1 | **Servisni sloj svuda** — nula direktnih `supabase.from()` u stranicama | `profileService.ts` + hookovi (`useProfileInjuries`...); refaktor `ActiveWorkout.tsx:126`, `Profile.tsx`, `ClientProfile.tsx` | `grep "supabase.from" src/pages` = 0 |
| 1.2 | **ActiveWorkout dekompozicija** — 11 useState → 1 `useReducer` (`useWorkoutState`), 3 setInterval → `useWorkoutTimer()` sa garantovanim cleanup-om, provera deps svih 8 useEffect | `src/pages/ActiveWorkout.tsx` (795 → <400 linija) | Testovi prolaze; nema duplog tajmera pri remount-u |
| 1.3 | **LanguageContext → JSON locales** — prevodi u `src/locales/sr.json` + `en.json`, tipizirani ključevi, provider <150 linija | `src/contexts/LanguageContext.tsx` (2347 → <150) | tsc hvata nepostojeći ključ |
| 1.4 | **Zajednički `useEditor` hook** za ProgramEditor / WorkoutEditor / NutritionTemplateEditor (load → edit → reorder → save pattern) | `src/hooks/useEditor.ts` | ProgramEditor <600 linija; ~800 linija duplikacije skinuto |
| 1.5 | **`useMealPlan` refaktor** — useQuery + useMutation + `mealPlanStorageService` (localStorage izolovan u servis; priprema za Supabase migraciju) | `src/hooks/useMealPlan.ts`, `src/services/` | Logika generisanja pure; storage zamenljiv |
| 1.6 | **mealPlanGenerator konstante** — magic numbers → imenovane konstante sa referencom na spec sekciju (`HASHIMOTO_DEFICIT_CAP // §3.2`) + unit testovi | `src/utils/mealPlanGenerator.ts`, `src/constants/` | Sve numeričke vrednosti imenovane i citirane |
| 1.7 | Zajednički `MealSearchModal` (Food + MealPlan replace logika) | `src/components/food/` | Jedna implementacija pretrage |
| 1.8 | `meal_logs` trainer UPDATE/DELETE RLS politike | nova migracija | Trener može da koriguje log |

**Gate posle Faze 1:** `npm test` zelen, `tsc` čist, eslint 0, nijedan src fajl >700 linija.

## FAZA 2 — Enforcement (kvalitet se zaključava) · ~1 nedelja

| # | Zadatak | Done kriterijum |
|---|---------|-----------------|
| 2.1 | ESLint pravila: zabrana supabase importa van `services/`+`integrations/`, zabrana `console.*`, `no-explicit-any` error, max-lines 400 (warning) | CI pada na prekršaj |
| 2.2 | Vitest coverage threshold za `utils/` i `services/` (start 70%, cilj 80%) | CI gate aktivan |
| 2.3 | GitHub Actions CI: tsc + eslint + test + verify:tokens na svaki push/PR | Zeleni badge |
| 2.4 | dependency-cruiser: `utils/` i `services/` ne smeju import iz `pages/`/`components/` | Pravilo u CI |
| 2.5 | E2E Playwright smoke (login → workout → meal log → check-in) u CI | Prolazi na PR |

## FAZA 3 — White-label temelj (tenant config) · ~1-2 nedelje

| # | Zadatak | Detalji |
|---|---------|---------|
| 3.1 | **`tenant.config.ts`** — jedan fajl: ime appa, logo, boje (mapirano na Tailwind/CSS tokene), default jezik, kontakt | Sav brending čita SAMO odavde |
| 3.2 | **Feature flags po tenantu** — `algorithm: 'full' \| 'simple'`, toggles za: mezocikluse, Smart Cut, Refeed, Diet Break, biofeedback rules, Hashimoto/PCOS/anemija module, NEAT gate | `simple` mod = trener ručno vodi progresiju; UI banneri i cron-ovi se gase flagom |
| 3.3 | HealthContext placeholder — ukloniti ili staviti iza flaga | mrtav kod van bundle-a |
| 3.4 | **Setup playbook** (`docs/TENANT_SETUP.md`): novi Supabase projekat → env → migracije → seed → deploy → brending — cilj: novi trener za <pola dana | Probni dry-run po dokumentu |
| 3.5 | Skripta `scripts/new-tenant.sh` (koliko je automatizovati moguće) | Jedan command setup skeleta |

## FAZA 4 — Pilot i validacija MVP-a · kontinuirano

| # | Zadatak |
|---|---------|
| 4.1 | Ivana = tenant #1 sa `algorithm: 'full'` — produkcija, realni klijenti |
| 4.2 | Osnovna analitika korišćenja (koje stranice/feature se koriste) — bez toga je sečenje funkcija nagađanje |
| 4.3 | Sentry (ili sl.) za runtime greške + mesečni `get_advisors` check |
| 4.4 | Posle 4-8 nedelja podataka: definisati finalni "univerzalni MVP" preset za prodaju |

## FAZA 5 — Skaliranje (TEK kad zatreba)

- 5+ plaćajućih trenera → razmotriti multi-tenant (trainer_client_assignments, RLS rewrite) — 4-6 nedelja, ne ranije.
- Premium tier: "napredni algoritam" (full mod) kao doplata.
- Custom zahtevi trenera = posebne grane/flagovi, nikad fork bez flag-a.

---

## Šta je MVP (jezgro koje svaki trener dobija)

Auth + onboarding · trening (program, queue, ActiveWorkout, post-workout feedback) · ishrana (meal plan, log, makroi, shopping) · weekly check-in · progress · chat · trener dashboard (klijenti, alarmi, editori) · sr/en.

## Šta ide iza flag-a (Ivana full / premium)

8-slojni algoritam (mezo, RPE/RIR, Smart Cut, Refeed, Diet Break, NEAT) · metabolički moduli (Hashimoto/PCOS/anemija) · biofeedback reactive rules · luteal/ciklus logika · DOMS detekcija.

## Redosled i procena

Faza 0 (1 dan) → Faza 1 (2-3 ned.) → Faza 2 (1 ned.) → Faza 3 (1-2 ned.) → Faza 4 (paralelno od kraja Faze 3). **Ukupno do prodajno-spremnog white-label: ~6-8 nedelja.**
