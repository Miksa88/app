# Beta Audit — 2026-04-24

**Auditor:** autonomni E2E tester (Claude Opus 4.7)
**Baseline:** `24d8b0a` + render/data-loading specs
**Test user:** `mixa37blok+beta@gmail.com` (id `1135fbe7-cd53-453a-89d8-cc5e1062168b`)
**Screenshots:** `test-results/screenshots/*.png` (22 fajla)

---

## 🔴 BLOKATORI — Hardcoded mock podaci umesto real user data

### BUG 1: Profile pokazuje TUĐE ime ("Sarah Johnson")
**Screenshot:** `06-profile.png`
**Fajl:** `src/pages/Profile.tsx`
**Šta pokazuje:**
- Ime: **"Sarah Johnson"** (trebalo "Beta Tester" iz profiles tabele)
- Email: **"sarah@example.com"** (trebalo `mixa37blok+beta@gmail.com`)
- Subscription: "Standard — €49.99/mo" (hardcoded, nema subscription tabele)
- My Goals: "Muscle gain, Glute growth" (hardcoded, ignoriše `profiles.primary_goal`)
- Apple Health: "Connected" (hardcoded — nema integracije)

**Impact:** Korisnik vidi **tuđe podatke** u vlastitom profilu. Najviše zbunjujuća stvar u app-u. Razlog zašto si ti rekao "sve bude prazno" — zapravo je **popunjeno lažnim podacima**.

**Fix:** Profile.tsx treba da čita iz `useAuth()` + `supabase.from("profiles").select().eq("id", clientId)`. Trenutno koristi hardkodovanu konstantu.

### BUG 2: Home pozdrav koristi hardcoded "Sarah"
**Screenshot:** `01-home.png`
**Fajl:** `src/pages/Home.tsx`
**Šta pokazuje:** "Dobro veče, **Sarah 👋**"
**Fix:** Koristi `profile.first_name` iz `useAuth` + `profiles` query.

### BUG 3: Trainer Dashboard pozdrav + client lista su MOCK
**Screenshot:** `10-trainer-dashboard.png`
**Fajl:** `src/pages/trainer/TrainerDashboard.tsx`
**Šta pokazuje:**
- "Dobro veče, **Ivana**" (hardcoded)
- "5 klijentkinja aktivno / 6 treninga" (hardcoded brojevi)
- Klijent lista: **Sarah / Ana / Mia / Jovana / John** (hardcoded mock)

**Impact:** Trener ne vidi svoje prave klijentkinje. Nema trainer-client binding u DB-u.
**Fix:** Query `profiles WHERE role='client'` + filter po trainer-client mapiranju (još nije u šemi).

### BUG 4: `/trainer/client/<id>` je POTPUNO PRAZAN
**Screenshot:** `19-trainer-client-detail.png` (4.2KB — samo siva pozadina)
**Fajl:** `src/pages/trainer/ClientProfile.tsx`
**Šta pokazuje:** Ništa. Stranica se render-uje prazna.

**Root cause kandidati:**
- Možda `useClientStatus(id)` ne nalazi klijentkinju ako trainer nije njen "owner"
- Možda useEffect fail-uje silently i komponenta vrati `null`
- Možda ruta dolazi sa loading state koji nikad ne završava

**Fix:** Dev mora da proveri ClientProfile.tsx — fallback na empty state + error boundary hint.

### BUG 5: Progress stranica MOCK
**Screenshot:** `04-progress.png`
**Fajl:** `src/pages/Progress.tsx`
**Šta pokazuje:**
- Level 3, 68% to Level 4 (hardcoded)
- 14 Streak, 21 Best Streak (hardcoded — user ima 0 workouts)
- 12.4t Volume (hardcoded — treba sum iz `exercise_progress`)
- "Your Journey" level badges 1-7 sa lockovima (mock)

**Real data:** "0 Workouts" stat je verovatno real (query iz exercise_progress), ali sve ostalo hardcoded.
**Fix:** Sve iznad Volume mora biti derived iz `exercise_progress` + workout_sessions (tabela ne postoji u DB-u).

---

## ✅ Šta STVARNO radi (potvrđeno kroz screenshots + 27 E2E testova)

1. **Auth**: Login forma zove real Supabase auth (potvrđeno Round 7 E2E)
2. **ProtectedRoute**: Neulogovan user bounce-uje na `/`
3. **Food / Nutrition** stranica (`03-food.png`) — pravi meal cards sa calories/protein/carbs/fat iz `foodDatabase.ts` ili `food_items` tabele
4. **Gym / Training** stranica (`02-gym.png`) — pokazuje queue sesije koje smo ručno insertovali (A1 Full Body, A2, A3)
5. **Water widget** — klik +1 čaša stvarno INSERT-uje u `water_logs` (E2E verified)
6. **Daily Check-in** — UI flow kroz sheet zaista radi DB inserts (E2E verified)
7. **Meal log eat/skip/replace** — UI sheet → button → meal_logs insert
8. **Backend Edge Functions** — svih 10 deployed i funkcionalni (direct invoke verified)
9. **Weekly trendline** — calorie adaptation na osnovu 2 weekly check-ina radi
10. **Pause events** — start-pause sa illness penalty, end-pause clear
11. **Workout completion** — queue pointer napreduje, exercise_progress se puni

---

## 🟡 Delimično / zavisi od data

- **ActiveWorkout UI** (Done set × N flow) — nisam testirao kroz klik (real queue fixture bi pomogao)
- **Weekly Check-in stranica** — forma radi, submit insertuje u DB, ali **weight auto-prefill** zavisi od postojećih weight_logs
- **Milestones** — prikazuje content ali ne znam da li su real achievements iz DB-a

---

## 🎯 Preporuka prioriteta za dev

1. **BLOKATOR**: Fix Profile.tsx i Home.tsx hardcoded imena (1-2h rada — UseAuth wire-up)
2. **BLOKATOR**: Fix Trainer Dashboard — query prave klijentkinje
3. **BLOKATOR**: Fix `/trainer/client/:id` prazan state
4. **HIGH**: Progress.tsx — derive stats iz exercise_progress tabele (streak computation, volume sum)
5. **MEDIUM**: Subscription info u Profile — ili sakrij ako nema stripe integracije
6. **MEDIUM**: Apple Health connect dugme — ili sakrij ili implementiraj

---

**Onboarding bug** (SignUpSheet.tsx) već popravljen u commit `24d8b0a`.

Ostalo otkriveno kroz E2E suite: 27 testova pass.
