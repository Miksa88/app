# Master bug lista — stabilizacija za MVP (2026-06-12)

Izvori: (1) Mihajlovo ručno testiranje, (2) E2E beta-tester run (RALPH_BUGS.md), (3) Claude browser audit.
Status: ⬜ otvoren · 🔧 u radu · ✅ rešen + test

## P0 — blokira MVP prodaju

| # | Bug | Izvor | Repro | Status |
|---|-----|-------|-------|--------|
| 1 | ActiveWorkout: težina/ponavljanja input "razliven" pri selekciji na desktop Safari — `type="number"` spinner strelice u uskom polju (64px). Na pravom telefonu se ne vidi. | Mihajlo | Safari responsive (iPhone 17 Pro) → start trening → klik u weight polje | 🔧 globalni CSS fix (svi numerički inputi) |
| 2 | Baza hrane: samo 30 jela u `food_items` → meal planovi se ponavljaju, deluju siromašno; nema videa; slike fallback pool | Mihajlo | Food/MealPlan bilo koji dan | ⬜ sadržajni projekat (vidi dole) |

## P1 — mora pre prvog tenanta

| # | Bug | Izvor | Repro | Status |
|---|-----|-------|-------|--------|
| 3 | (E2E rezultati se dopunjuju kad agent završi) | E2E | — | ⬜ |

## P2 — posle MVP-a

| # | Bug | Izvor | Repro | Status |
|---|-----|-------|-------|--------|
| — | | | | |

## Mihajlovi sirovi nalazi za triju (dopunjavati ovde)

- "ima jako puno stvari", "vizual nije uniformisan ili baguje" — čeka konkretne stavke ekran-po-ekran
- hrana: odakle podaci, kako se prave jela, kako izgledaju, YT video — pokriveno stavkom #2

## Proces

1. Svaki bug dobija: repro korake, fix, test koji ga čuva.
2. `npm run verify` + browser provera pre zatvaranja.
3. MVP preset = `algorithm: 'simple'` — bagovi u full-mode modulima ne blokiraju prodaju.
