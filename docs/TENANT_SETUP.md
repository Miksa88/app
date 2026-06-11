# Setup novog trenera (tenant) — playbook

**Cilj:** novi trener live za <pola dana. Jedan trener = jedna kopija appa = jedan Supabase projekat + jedan deploy.

**Princip:** pri kloniranju se menja SAMO `src/tenant.config.ts` + env varovi. Kod, stilovi i logika se NE diraju.

---

## Korak 0 — Preduslov (jednom po mašini)

- Node 20+, `npm`, Supabase CLI (`npm i -g supabase` ili `npx supabase`)
- Supabase nalog sa organizacijom u koju idu tenant projekti
- Pristup master repo-u

## Korak 1 — Kloniraj kod (5 min)

```sh
./scripts/new-tenant.sh <ime-trenera>          # kreira ../fit-<ime-trenera> iz master repo-a
cd ../fit-<ime-trenera>
```

Skripta kopira repo (bez .git istorije master-a, novi git init), i otvara `src/tenant.config.ts` za izmenu.

## Korak 2 — Supabase projekat (15 min)

1. Dashboard → New project (region eu-central-1, jaka DB lozinka — sačuvaj u password manager).
2. Poveži i pogura šemu + funkcije:
   ```sh
   npx supabase login
   npx supabase link --project-ref <novi-project-ref>
   npx supabase db push                 # sve migracije iz supabase/migrations
   npx supabase functions deploy        # svih 16 edge funkcija
   ```
3. **Secrets** (Dashboard → Edge Functions → Secrets):
   - `ALLOWED_ORIGINS=https://<domen-trenera>` (obavezno — bez ovoga browser pada na CORS)
   - `CRON_SECRET=<random 32+ char>` (npr. `openssl rand -hex 32`)
   - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` ako tenant koristi push (novi par po tenantu: `npx web-push generate-vapid-keys`)
4. **Cron schedule** (Dashboard → Integrations → Cron, ili SQL `cron.schedule`): zakaži SAMO ono što tenant koristi:
   - `mesocycle-tick` (dnevno) — samo ako `features.mesocycles=true`
   - `smart-cut-tick` (dnevno) — samo ako `features.smartCut=true`
   - `daily-push-reminders` (dnevno) — ako tenant koristi push
   - Header `x-cron-secret: <CRON_SECRET>` u svakom cron pozivu.
   - **'simple' mod = ne zakazuj mesocycle/smart-cut tick uopšte.**
5. Auth podešavanja (Dashboard → Authentication): Site URL = domen tenanta; isključi anonimni signup ako se ne koristi; **uključi leaked-password protection**.
6. Seed: `supabase/seed.sql` sadrži osnovne podatke (vežbe, food items, paketi) — `npx supabase db push` ga ne izvršava; pokreni ručno preko SQL editora ili `psql`.

## Korak 3 — Brending (30 min)

Otvori `src/tenant.config.ts` i podesi:

| Polje | Šta je |
|---|---|
| `appName` / `appShortName` | Ime appa trenera |
| `logo.light` / `logo.dark` | Putanje do logoa u `public/` (ubaci fajlove) |
| `defaultLanguage` | `'sr'` ili `'en'` |
| `contact` | email / instagram / tiktok trenera |
| `colors` | HSL stringovi (format `"325 82% 51%"`). Minimalno `primary` + `ring`; ostalo može ostati |
| `features.algorithm` | `'full'` (Ivanin 8-slojni algoritam) ili `'simple'` (trener ručno vodi progresiju) |
| `features.*` | granularno gašenje modula (vidi tabelu ispod) |

Feature flagovi i šta gase (UI ulazi; logika u utils ostaje, samo se ne prikazuje):

| Flag | Gasi |
|---|---|
| `mesocycles` | overreach/deload/return bannere |
| `smartCut` | smart-cut banner + NEAT poruke uz njega |
| `emergencyRefeed` / `dietBreak` / `neatGate` | odgovarajuće bannere |
| `biofeedbackRules` | PreWorkoutFatigueDialog + libido/water-retention u WeeklyCheckIn |
| `metabolicModules` | Hashimoto/PCOS/anemija prilagođenja u UI |
| `cycleTracking` | luteal logiku u UI |
| `domsDetection` | chronic DOMS banner |
| `healthKit` | Apple Health red u profilu + onboarding korak |

Provera: `npm run dev` → boje/ime/logo na mestu, banneri u skladu sa flagovima.

## Korak 4 — Env + deploy (30 min)

1. `.env` (lokalno) i hosting env varovi:
   ```
   VITE_SUPABASE_PROJECT_ID=<ref>
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<sb_publishable_...>
   VITE_DEV_MOCK_AUTH=false
   VITE_SENTRY_DSN=<dsn>        # nov Sentry projekat po tenantu (preporuka)
   ```
2. Hosting (Vercel/Netlify/CF Pages): build `npm run build`, output `dist/`, SPA fallback na `index.html`.
3. Custom domen trenera → DNS → hosting. Zatim ažuriraj `ALLOWED_ORIGINS` secret i Auth Site URL na taj domen.

## Korak 5 — Verifikacija (15 min)

```sh
npm run verify        # typecheck + lint + tokens + testovi + arhitektura
```

Ručno na produkcionom URL-u: signup → onboarding → home (banneri po flagovima) → trening flow → meal log → weekly check-in → trainer dashboard login.

## Korak 6 — Primopredaja treneru

- Trener nalog: Dashboard → Authentication → kreiraj usera, pa u `profiles` postavi `role='trainer'`.
- Pošalji treneru: URL, login, mini-uputstvo.
- Zabeleži u internu evidenciju: project-ref, domen, datum, izabrani feature set, naplata.

---

## Custom zahtevi (doplata)

Custom feature za tenanta NIKAD ne ide kao fork bez flag-a:
1. Dodaj flag u `TenantFeatures` (default `false` u master repo-u).
2. Implementiraj u master repo-u iza flag-a.
3. U tenant kopiji uključi flag.
4. Sinhronizuj kopiju sa master-om (`git remote add master <master-repo> && git merge`) — zbog ovoga kopije ostaju merge-abilne.
