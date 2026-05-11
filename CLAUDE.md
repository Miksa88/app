# fitbyivana — Master Algoritam

## Master spec

Algoritam je organizovan oko dva master spec dokumenta:

- **`pocetnici.md`** — beginner protokol (7-week mezo, A/B/A skeleton)
- **`files_extracted/KOD-FIT_Master_Protokol_SREDNJE_NAPREDNE_V2.md`** — intermediate protokol (6-week mezo, U/L 4x, mixed undulating)

### Implementiran kao 8-slojni pipeline

1. **Mezociklus** — 7 nedelja beginner / 6 intermediate (`mesocycleLifecycle.ts`)
2. **Skeleton** — A/B/A + BAB rotacija (beginner) / U/L 4x (intermediate) (`queueBuilder.ts`)
3. **RPE/RIR ramp** — linearno (beginner) / mixed undulating (intermediate) sa Hashimoto cap-om (`microcycleIntensity.ts` + `programGenerator.ts`)
4. **Tempo + Ramp-up** — automatski popunjeni; 3-0-1-2 izolacije + 90% ramp set za prvi compound (intermediate) (`tempoAndRampUp.ts`)
5. **Surgical Swap** — automatska zamena vežbi po povredama (`exerciseSubstitution.ts`)
6. **Smart Cut hijerarhija** — 3 step (beginner) / 4 step (intermediate); NEAT 10k gate (`smartCut.ts` + `smart-cut-tick` cron)
7. **Emergency Refeed** — 4-marker biofeedback trigger (`emergencyRefeed.ts`)
8. **Diet Break** — OBAVEZAN posle 4 mezociklusa za intermediate, auto-clear posle 14 dana (`mesocycle-tick`)

### Dodatne pravila

- **Lifestyle adjustments** (san <6h → produžen mezo, stres >8 → -20% volumen)
- **Metabolic constraints** (Hashimoto -15% deficit cap, PCOS low-GI, anemia heme iron)
- **Biofeedback reactive rules** (§4.3) — pump/sleep/luteal/libido (`biofeedbackReactiveRules.ts` + syncEngine wired)
- **Pre-workout fatigue** — "Umorna" → MAINTAIN sledeću sesiju (`PreWorkoutFatigueDialog.tsx`)
- **Post-workout 3-button** (Lako/Taman/Teško) — pump_score signal + DOMS chronic detection
- **RPE autoregulacija** (intermediate) — sleep<5 ili luteal → −10% težina
- **DOMS chronic** — 2+ "Teško" zaredom → −1 serija po vežbi

### Klijent UI surfaces

- **Home**: `AlgorithmStatusBanners.tsx` (mezo overreach/deload, smart cut, refeed, diet break, return-from-break, NEAT gate)
- **Pre-workout**: `PreWorkoutFatigueDialog.tsx` (jednom dnevno)
- **Post-workout**: `PostWorkout.tsx` 3-button feedback
- **Weekly**: `WeeklyCheckIn.tsx` (težina, mere, energija, identitet, **san avg, stres avg**, beleške)
- **Food**: `Food.tsx` (auto-suggest macro-similar zamena), `Shopping.tsx` (kupovna lista)
- **Off-plan**: `ExtraMealSheet.tsx` (restoran/cheat meal log sa custom makroima)

### Trener dashboard

Surfacuje §8 crvene indikatore preko `PocetniciAlertsCard.tsx` + `ClientWeekIndicator.tsx`. Trener nije neophodan za autonomni rad algoritma.

---

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn-ui (selektivno)
- Supabase (Postgres + Auth + Edge Functions + Realtime + Storage)
- Vitest (unit) + Playwright (E2E)
- Capacitor (iOS shell)

## Development

```sh
npm i              # Install
npm run dev        # Dev server (port 8080)
npm test           # Vitest unit
npm run test:e2e   # Playwright E2E
npm run verify:tokens  # Design token compliance
npx tsc --noEmit   # Type check
```

## Deploy

Standard Vite build → static hosting (Vercel, Netlify, Cloudflare Pages) ili native iOS/Android preko Capacitor.

---

## graphify

Projekat ima graphify knowledge graph u `graphify-out/`.

- Pre arhitektonskih pitanja: pročitaj `graphify-out/GRAPH_REPORT.md`
- Ako postoji `graphify-out/wiki/index.md`, navigiraj kroz njega
- Posle code izmena: `graphify update .`
