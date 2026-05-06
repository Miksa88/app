# UI UX Pro Max Skill Pack — Analiza i plan primene na fitbyivana

**Datum:** 2026-04-21
**Izvor:** `ui-ux-pro-max-skill-main v2.0` (nextlevelbuilder/ui-ux-pro-max-skill)
**Scope:** analiza kako se skill pack preporuke poklapaju sa trenutnim stanjem + plan WS-8 (next iteration posle v7.0)

---

## 1. Šta skill pack nudi

Sadržaj:
- **Python reasoning engine** — match product-type → UI category via BM25
- **14 CSV baza podataka** sa ~6.5K redova: ui-reasoning, ux-guidelines, colors, typography, icons, styles, products, charts, landing, app-interface, react-performance, google-fonts + stacks (react, react-native, swiftui, flutter...)
- **161 product types** (svaki sa pattern + style + colors + mood + anti-patterns + severity)
- **99 UX guideline rules**, **67 UI styles**, **161 color palette**, **57 font pairs**
- **Per-stack best practices** (react, react-native, swiftui...)
- **Design system skill** — token architecture (primitive → semantic → component)
- **ui-styling skill** — shadcn + tailwind references

Kategorije priority matrix-a (1→10):
1. Accessibility (CRITICAL)
2. Touch & Interaction (CRITICAL)
3. Performance (HIGH)
4. Style Selection (HIGH)
5. Layout & Responsive (HIGH)
6. Typography & Color (MEDIUM)
7. Animation (MEDIUM)
8. Forms & Feedback (MEDIUM)
9. Navigation Patterns (HIGH)
10. Charts & Data (LOW)

---

## 2. Product-type match za fitbyivana

Naša app je **hibrid** 5 kategorija iz baze. Sve su HIGH severity:

| Kategorija | Row | Ključni uvidi | Naš status |
|---|---|---|---|
| **Period & Cycle Tracker** | 144 | Pattern: Social Proof + Trust · Style: **Soft UI Evolution + Aurora UI** · Boje: **Blush #BE185D + Lavender #7C3AED** · Efekat: **flowing gradient 8-12s + color morphing** · Must-have: **data-privacy** | ✅ Boje poklapaju (naš primary `325 82% 51%` ≈ #E91E8C, secondary purple 289 — blizu #7C3AED) · ❌ Nema Aurora UI flowing gradient-a · ❌ Privacy messaging nije istaknut |
| **Calorie & Nutrition Counter** | 143 | Pattern: Feature-Rich · Style: **Flat Design + Vibrant** · Boje: **Protein=BLUE, Carb=ORANGE, Fat=YELLOW** + progress circle · Efekat: 150ms fast transitions · Anti-pattern: complex shadows | ❌ Macro boje ne-standard (naš Food.tsx: protein=RED #C62828, carb=YELLOW, fat=GREEN) · ❌ Inline `hsl(0,72%,51%)` u Food.tsx:318 — bypass design tokens |
| **Habit Tracker** | 94 | Pattern: Social Proof + Demo · Style: **Claymorphism + Vibrant Block** · Boje: **Streak amber/orange** + progress green · Efekat: **multi-layer shadows + spring bounce + soft press 200ms** · Must-have: gamification, achievement unlocks | ✅ Streak = warning amber ✓ · ✅ Milestones page postoji ✓ · ✅ Spring bounce (v5.0 IOS_SPRING) ✓ · ❌ Nema achievement-unlock celebration animation (samo PostWorkout confetti na set) |
| **Fitness/Gym App** | 35 | Pattern: Feature-Rich + Data · Style: **Vibrant & Block + DARK MODE (OLED)** · Boje: Energy orange + dark bg · Must-have: **progress-tracking, workout-plans** | ⚠ Intentional divergence: mi koristimo light-first pink/purple jer smo namenjeni ženama sa hormonalnim fokusom, ne generic fitness. Dark mode postoji kao opcija ✓ · ✅ Progress tracking ✓ · ✅ Workout plans ✓ |
| **Mental Health / Meditation** | 22, 98 | Style: **Neumorphism + Soft UI Evolution** · Boje: calm pastels · Efekat: **breathing animations** · Must-have: privacy-first | ❌ Nema breathing animation za lutealna faza / rest day kontekst · Soft UI postoji u subtle formi (card shadows) ✓ |

**Zaključak matcha:** Naš brand color (pink-purple gradient) je tačno u pravcu **Period & Cycle Tracker** preporuke — intuicija je validirana bazom od 161 kategorije. Fitness element je SEKUNDARAN; mi smo primarno women's hormonal health + fitness tool.

---

## 3. Validacija onoga što VEĆ radimo kako treba (iz Quick Reference)

Skill pack Priority 1-5 checklist ide kroz naš stack i uglavnom **passuje** zahvaljujući WS-1..WS-7 radu:

### ✅ Accessibility (CRITICAL)
- `color-contrast` 4.5:1 — semantic tokens pass (iz WS-1 Foundation)
- `focus-states` — shadcn + WS-2 `:focus-visible` outline
- `alt-text` — slike u Chat/TrainerProfile imaju alt
- `aria-labels` — ikone sa aria-label kroz `t()` (WS-2)
- `keyboard-nav` — Onboarding + Login (v2.0)
- `dynamic-type` — iOS rem scale (WS-1 §1.2)
- `reduced-motion` — globalni media query u index.css (WS-1)
- `voiceover-sr` — TrainerMessages, Chat, ProcessingScreen `aria-live` (v1.1)
- `skip-links` — `SkipToContent` komponenta ✓

### ✅ Touch & Interaction (CRITICAL)
- `touch-target-size` 44pt — WS-7 Faza 2 normalizovano (`min-h-11`)
- `touch-spacing` 8dp grid — WS-7 Faza 3 fractional cleanup
- `press-feedback` — v5.0 Apple prominent (scale 0.96 spring)
- `haptic-feedback` — v6.0 Capacitor Haptics Engine
- `safe-area-awareness` — v6.0 `.safe-top`, `.safe-bottom`, `.safe-x`
- `standard-gestures` — v6.0 SwipeBack komponenta (iOS edge-pan)
- `gesture-alternative` — svaka gesture ima visible control ✓

### ✅ Style Selection (HIGH)
- `style-match` — brand = Period/Cycle + Habit hybrid (validirano gore)
- `consistency` — WS-7 v7.0 zatvorio 47 ad-hoc call sites
- `no-emoji-icons` — v1.1 emoji aria-hidden pass, lucide wherever moguće
- `icon-style-consistent` — lucide-react (Outline) kroz ceo app
- `platform-adaptive` — iOS HIG (v5.0 Apple-native polish, Liquid Glass nav v5.1)
- `primary-action` — audit postoji u DESIGN_AUDIT; Gym/Home/Food imaju jedan primary gradient CTA

### ✅ Layout & Responsive (HIGH)
- `spacing-scale` — 4/8dp iOS grid (WS-7 Faza 3)
- `touch-density` — WS-7 generosity pass (card p-5, row min-h-14)
- `viewport-units` — `@supports (height: 100dvh)` (v3.1)
- `safe-area` — Capacitor WS-6
- `z-index-management` — v6.0 tailwind zIndex scale

### ✅ Animation (MEDIUM)
- `duration-timing` 150-300ms — MOTION_DURATION tokens (WS-1)
- `transform-performance` — samo transform/opacity, ne width/height
- `spring-physics` — IOS_SPRING.soft/snappy/bouncy (v5.0)
- `stagger-sequence` 30-50ms — milestones badge grid v3.0
- `shared-element-transition` — TabControl + BottomNav layoutId (v5.1, v7.0)
- `reduced-motion` — `shouldReduceMotion()` helper

### ✅ Forms & Feedback (MEDIUM)
- `input-labels` — WS-2 label+aria-label pass
- `inline-validation` — Onboarding per-step hint (v3.0)
- `input-type-keyboard` — WS-3 inputMode na email/numeric/decimal
- `autofill-support` — autoComplete na email/password (v1.1)
- `submit-feedback` — GradientButton `loading` prop + aria-busy (v2.0)
- `confirmation-dialogs` — AlertDialog na delete/logout/activate (v2.0)
- `success-feedback` — sonner toast + haptic success

### ✅ Navigation Patterns (HIGH)
- `bottom-nav-limit` ≤5 items ✓
- `nav-label-icon` — icon+label ✓
- `nav-state-active` — pill indicator animated ✓
- `back-behavior` — SwipeBack + scroll restoration (v6.0, WS-5)
- `state-preservation` — `useScrollRestoration` hook ✓
- `breadcrumb-web` 3+ deep — TrainerBreadcrumbs (v3.0)
- `modal-escape` — AlertDialog Cancel + Sheet swipe-down ✓

**Rezime:** naša WS-1..WS-7 evolucija je anticipirala ~85% skill pack Priority 1-9 zahteva. Ono što ostaje su **specifične gap-ove za women's health / nutrition / gamification vertical** koje Apple HIG generic ne pokriva.

---

## 4. Gap analiza (~20 identifikovanih stavki)

### 🔴 High impact, low effort (P1 — WS-8 starter)

**G1. Macro color standard (Calorie & Nutrition Counter rule)**
- **Trenutno:** [src/pages/Food.tsx](src/pages/Food.tsx) linije 318, 323, 328 koriste inline `style={{ color: "hsl(0, 72%, 51%)" }}` (red), `hsl(45, 93%, 47%)` (yellow), `hsl(142, 71%, 45%)` (green)
- **Skill pack:** industrial standard je **protein=BLUE, carb=ORANGE, fat=YELLOW** (MyFitnessPal, Lose It, Cronometer konvencija)
- **Problem:** (a) bypass design tokens → verify:tokens ignore ovo jer su u `style=`, ne className (b) non-standard mapping može zbuniti korisnice koje dolaze iz drugih trackera
- **Fix:** dodati `--macro-protein`, `--macro-carb`, `--macro-fat` CSS vars u [src/index.css](src/index.css) § 1.1. Tailwind util `text-macro-protein/carb/fat`. Primenjeno u Food.tsx macro row + FuelingStatusBar rings + ClientNutritionPlan macros.
- **Odluka:** ili (a) zadržati trenutni mapping (red/yellow/green po nutricijskoj konvenciji — protein je "primary" kao meso) i samo tokenizovati, ili (b) preći na blue/orange/yellow standard. Predlog: (a) tokenizovati bez menjanja boja, jer su već u UI-u i korisnice su ih naučile. Dokumentovati u MASTER.md kao intentional divergence sa business razlogom (brand pink, red protein je crveno meso metafora).

**G2. Color-only status indicators (rule `color-not-only`)**
- **Trenutno:** `UserAvatar` status dot (active/trial/paused/offline) prenosi informaciju isključivo kroz boju (success green / warning amber / muted gray). Aria-hidden je, pa screen reader ne čita status.
- **Skill pack:** WCAG + skill pack eksplicitno traži icon + text + color (ne color-only).
- **Fix:** u [src/components/ui/user-avatar.tsx](src/components/ui/user-avatar.tsx) dodati `aria-label` na parent containeru koji uključuje status text (npr. "Sarah, aktivna") + opcioni visible mini-badge next to name u listama. Alternativa: vizuelna izmena dot → tiny icon (Zap=active, Clock=trial, Pause=paused).

**G3. Privacy-first messaging (must_have za Period Tracker + Biohacking)**
- **Trenutno:** nikakav privacy indicator u UI-u. Ni u Onboarding, ni u Profile, ni kod cycle/weight inputa.
- **Skill pack:** za Period/Cycle Tracker i Biohacking apps privacy-first je MUST-HAVE. Poverenje korisnice = retention driver.
- **Fix (WS-8 Faza 1):**
  - Onboarding SignUp sheet: dodati privacy badge ("🔒 Tvoji podaci ostaju privatni i enkriptovani") ispod social login dugmadi
  - Profile page: nov section "Privatnost" sa ikonom Shield + short copy + link na privacy policy
  - Osetljiva polja (Weight entry, Cycle date, Heart rate sync): mali lock ikon pored label-a sa tooltip/helper text "Podaci se čuvaju lokalno na uređaju"
  - Copy: pokretanje spec-a za privacy page

**G4. Inline `hsl()` u Food.tsx bypassa design tokens**
- **Trenutno:** 3 inline style sa `hsl()` za macro colors (linije 318, 323, 328)
- **Fix:** povezano sa G1 — zameniti sa CSS vars
- **Bonus:** proširiti `scripts/verify-tokens.sh` sa provetrom na inline `style=` sa `hsl(` van index.css (vreme: 10min)

**G5. Empty state CTA audit**
- **Trenutno:** WS-3 je kreirao `<EmptyState>` komponentu i migrirao nekoliko mesta, ali nije svaki empty state ima CTA akciju (npr. Progress "Adaptacija" tab kad nema eventa — samo tekst)
- **Skill pack:** rule `empty-nav-state` + `empty-states` — uvek CTA pored poruke.
- **Fix:** audit svih `<EmptyState>` invokacija, dodati `cta` prop gde je moguće (Progress adaptation empty → "Pročitaj spec 01" link, Milestones filter empty → "Reset filter" button, itd.)

### 🟠 Medium impact, medium effort (P2 — WS-8 core)

**G6. Breathing animation za kalmni kontekst**
- **Trenutno:** RestDayHero (Home) i SyncBanner (lutealna faza) su statični.
- **Skill pack:** Meditation (98) + Mental Health (22) traže breathing animation kao signature motion za "calm" context. 4-6s opacity pulse, prefers-reduced-motion respect.
- **Fix:**
  - Dodati `.breathe` CSS keyframe utility u [src/index.css](src/index.css): opacity 0.85 ↔ 1.0, scale 1 ↔ 1.03, 5s ease-in-out infinite, guarded behind @media (prefers-reduced-motion: no-preference)
  - Primeniti na: RestDayHero moon icon, SyncBanner luteal icon, FuelingStatusBar ring (idle state), ProcessingScreen hero
  - Ne koristiti globalno — samo na elementima koji signaliziraju "odmori se" / "budi blag prema sebi"

**G7. Haptic pattern expansion (rule `haptic-feedback`)**
- **Trenutno:** v6.0 integrisano haptic na 3 mesta (set complete, meal eaten, meal skipped). Hook ima 7 pattern-a (light/medium/heavy/selection/success/warning/error).
- **Skill pack:** haptic za sve confirmations + important actions.
- **Fix (WS-8):** integrisati u:
  - Water glass add u Home (light)
  - Badge earned u Milestones (success)
  - Delete account confirm u Profile (heavy)
  - Form validation fail u Login, Onboarding (warning)
  - Weight entry save u Profile (medium)
  - Streak milestone cross (3/10/50/100 days) u Milestones (success + confetti)
  - Meal replaced confirm u Food (selection)

**G8. StatCard `layout="centered"` varijanta (v7.0 deferred)**
- **Trenutno:** Progress.tsx 4-col compact i Milestones.tsx 2-col hero stats su **izuzeci** iz WS-7 v7.0 zbog centered-layout mismatch-a.
- **Skill pack:** `consistency` rule.
- **Fix:** proširiti [src/components/ui/stat-card.tsx](src/components/ui/stat-card.tsx) sa `layout="centered"` (text-align center, ikona iznad velika, vrednost ispod, label mali) i migrirati Progress (4 sites) + Milestones (2 sites). Zatvori metriku adopcije na 10/10 StatCard.

**G9. Shared element transitions (layoutId expansion)**
- **Trenutno:** layoutId koristi se samo za TabControl pill + BottomNav active state.
- **Skill pack:** `shared-element-transition` + `modal-motion` — anamate from trigger source for spatial context.
- **Fix (Framer Motion layoutId):**
  - WeeklyCalendar selected day chip → Home hero Today card (kliknut dan → hero "morpha")
  - Meal card → Food meal detail sheet (card expand into sheet)
  - Client list item → ClientProfile hero avatar (avatar morpha iz liste u hero)
  - Program/Workout card → editor header

**G10. Achievement unlock celebration (Habit Tracker rule)**
- **Trenutno:** Milestones page prikazuje statične badge grid, earned vs locked. PostWorkout ima confetti ali samo za završen set.
- **Skill pack:** Habit Tracker (94) traži achievement-unlock animation + spring bounce na earn.
- **Fix:** kad user pređe novi streak threshold (npr. 3→10 ili 10→50) pojavljuje se full-screen badge-earn overlay (framer-motion AnimatePresence) sa:
  - Badge image scale 0.5 → 1.1 → 1 (bouncy spring)
  - Confetti
  - Haptic success pattern
  - CTA "Podeli" (opcionalno)
  - Auto-dismiss 3s ili tap
- Trigger: u `useMesocycleQueue` ili `useUserStatus` dodati streakCrossedThreshold event → show overlay

### 🟡 Medium impact, high effort (P3 — WS-9 iteracija)

**G11. Aurora UI flowing gradient za Period/Cycle insight**
- **Skill pack:** Period Tracker (144) signature effect je flowing gradient 8-12s sa color morphing.
- **Fix:** kreirati `AuroraCard` komponentu sa conic-gradient + @keyframes gradient-shift 12s animate, respect prefers-reduced-motion. Primeniti na:
  - Cycle phase insight card (kad se doda ovaj feature u Home — follicular/ovulatory/luteal/menstrual phase pickup)
  - Lutealna faza expanded view u Profile (ako se doda)
  - Paywall hero (premium feel)
- **Effort:** 1-2h CSS + 30min per-site integration. Estetski impact velik.

**G12. Privacy policy + data export page**
- **Skill pack + GDPR/App Store:** mora postojati privacy page sa export + delete data.
- **Fix:** dodati `/privacy` route + Profile link → render MD content sa:
  - Koje podatke skladištimo
  - Gde (Supabase EU region)
  - Kako da export-uje svoje podatke (JSON download)
  - Kako da obriše nalog (već postoji delete account flow ✓)
- **Bonus:** App Store submission preduslov.

**G13. Testimonials u Paywall (Social Proof trigger)**
- **Skill pack:** Period Tracker + Habit Tracker "if_trust_needed: add-testimonials" decision rule.
- **Trenutno:** Paywall nema social proof sekciju.
- **Fix:** dodati 3-5 mock testimonials (ili real posle beta launch) sa:
  - Avatar + ime + lokacija (npr. "Marija, Beograd")
  - 5-star rating
  - Short quote o hormonalnom balans-u + težina-lift progress
  - Scroll carousel ili stagger fade-in na scroll
- **Copywriting:** treba saradnja sa Ivanom za autentične kvote.

**G14. Cycle phase-aware theming (Aurora UI extension)**
- **Ideja:** subtle tint shift na Home hero background u zavisnosti od faze ciklusa:
  - Menstrual (dani 1-5): subtle warm terracotta tint
  - Follicular (6-13): fresh spring sage tint
  - Ovulatory (14-16): bright rose peak
  - Luteal (17-28): soft lavender calm
- **Implementation:** CSS custom property `--cycle-tint` switchuje se kroz JS na osnovu trenutnog dana ciklusa iz `useUserStatus`, subtle 5% overlay na background-secondary.
- **Skill pack:** validates via Aurora UI + Period Tracker "color morphing" rule.
- **Effort:** 2h; veliki retention potencijal.

### 🟢 Low impact / long-term (P4 — deferred)

**G15. Font pairing decision** — skill pack preporučuje Barlow Condensed + Barlow za Sports/Fitness. Mi koristimo system-ui za iOS-native feel. **Zadržati trenutno** — iOS HIG prioritet > generic fitness brand. Dokumentovati u MASTER.md §1.2 kao decision log.

**G16. Chart polish / 25 chart types reference** — Progress "Adaptacija" + TrainerAnalytics charts su placeholder. Skill pack charts.csv + Recharts best practices. Defer to backend wire-up iteracija.

**G17. Swipe gestures na meal cards** — v1.1 feature. `gesture-alternative` rule enforced.

**G18. Parallax subtle on rest day hero** — decorative, low impact. `parallax-subtle` rule.

**G19. Sortable TrainerClients list** — skill pack `sortable-table`. Low priority dok ne krene prod sa više klijenata.

**G20. Dark mode OLED optimization za sleep tracking views** — nije prioritet jer sleep je deo health sync, nije zaseban flow.

---

## 5. WS-8 plan (preporuka — P1 + P2 stavke)

### Faza 1: Quick wins (P1 bundle) — 3h
1. **G1+G4.** Tokenize macro colors (`--macro-protein/carb/fat` CSS vars) + fix Food.tsx inline styles + proširiti verify-tokens.sh da hvata inline `hsl()` u `style=` (30min + 30min)
2. **G2.** UserAvatar status accessibility fix (aria-label parent + optional visible icon overlay na avatar dot) (1h)
3. **G3.** Privacy messaging implementacija — badge u SignUpSheet + Shield section u Profile + lock helper na weight/cycle inputs (1h)
4. **G5.** Empty state CTA audit — grep svih `<EmptyState>` + dodati CTA gde nedostaje (30min)

**Verify:** typecheck + verify:tokens + build.

### Faza 2: Motion polish (G6 + G9) — 3h
1. **G6.** `.breathe` utility + integracija na RestDayHero, SyncBanner luteal, ProcessingScreen, FuelingStatusBar idle (1h)
2. **G9.** Shared element layoutId expansion:
   - WeeklyCalendar day ↔ Home Today hero
   - Meal card ↔ Food meal detail sheet
   - Client list ↔ ClientProfile hero avatar (2h)

**Verify:** manuelno Safari Responsive iPhone 17 — provera da motion radi + reduced-motion kill switch respektovan.

### Faza 3: Haptic + StatCard centered (G7 + G8) — 2h
1. **G7.** Haptic integration u 7 novih tačaka (1h)
2. **G8.** StatCard `layout="centered"` + Progress + Milestones migracija (1h)

**Verify:** typecheck + build + iOS simulator haptic test (require build na device).

### Faza 4: Achievement celebration (G10) — 2h
1. Dodati `useStreakMilestones` hook koji emituje `onCrossThreshold(newLevel)` event kad user pređe 3/10/50/100/365
2. Dodati `<AchievementOverlay>` komponentu (full-screen AnimatePresence + Lottie ili CSS confetti + haptic + auto-dismiss)
3. Wire-up u Milestones + Home (kada se streak update-uje)

**Verify:** mock cross-threshold u dev mode (force-set streak = 10 i proveri animaciju).

### Ukupno WS-8 effort: ~10h (slično WS-7 v7.0 obimu)

---

## 6. Šta NEĆEMO uzimati iz skill pack-a

Izričit skip:
1. **Sports/Fitness font (Barlow Condensed)** — sukob sa iOS HIG system-ui odlukom (G15)
2. **Dark mode-first (Fitness/Gym App rule 35)** — namerni brand izbor za women's health, validiran Period Tracker kategorijom
3. **Vibrant & Block layout stil** — previše "energetic" za naš kalmni brand language
4. **Claymorphism chunky style** — opet, ne odgovara women's wellness estetici
5. **Brutalism** — antitetic nasvom brandu
6. **Custom Python reasoning CLI setup** — value je u podacima, ne u CLI-ju. Mi smo ručno izvukli relevantne rule-ove.
7. **3D hyperrealism + WebGL** — za mobile web view previše teško, perf bi trpeo
8. **Auto-play video** u UI — `sustainability.auto-play-video` rule ali mi nemamo video sadržaj
9. **Zero Interface / AI-driven UI** — out of scope za MVP
10. **VisionOS Spatial UI** — nebitno

---

## 7. Validacija iz drugog ugla (što skill pack potvrđuje)

Ono što smo intuitivno / spec-driven uradili a sada ima **external validation** kroz 161-category reasoning engine:

| Naša odluka | Skill pack rule koji to validira |
|---|---|
| Pink + purple brand | Period Tracker (144) + Mental Health (22) color mood |
| iOS-first (Capacitor) | `platform-adaptive` + `system-controls` |
| Light-first theme | Period Tracker + Habit Tracker color mood (light-first) |
| Bottom nav 5 items max | `bottom-nav-limit` (MD, HIG) |
| 44pt touch targets | `touch-target-size` (HIG, MD) |
| Apple spring physics | `spring-physics` (HIG fluid animations) |
| Tabular nums za stats | `number-tabular` rule |
| Ne koristimo emoji kao ikone (post-WS-2) | `no-emoji-icons` rule |
| Semantic tokens (light+dark paralelno) | `color-semantic` + `dark-mode-pairing` |
| iOS Dynamic Type scale | `dynamic-type` (Apple Dynamic Type, MD) |
| ErrorBoundary + Sentry | `error-recovery` + `error-clarity` |
| Shared component system (v7.0) | `consistency` + `system-controls` |

**Rezime:** skill pack potvrđuje da je spec-driven dizajn (01/02/03 master docs + MASTER.md) već donio pravih odluka. Nismo gadžali u mraku.

---

## 8. Decision summary (šta radimo / ne radimo)

| ID | Gap | Akcija | Priority | Faza |
|---|---|---|---|---|
| G1 | Macro colors tokenization | DO — tokenize current colors, zadržati semantics | P1 | WS-8 F1 |
| G2 | Color-only status | DO — aria-label + optional icon overlay | P1 | WS-8 F1 |
| G3 | Privacy messaging | DO — badge + Profile section + lock helpers | P1 | WS-8 F1 |
| G4 | Inline hsl() cleanup | DO — povezano sa G1 | P1 | WS-8 F1 |
| G5 | EmptyState CTA audit | DO — auditor + dopune | P1 | WS-8 F1 |
| G6 | Breathing animation | DO — 4 target sites | P2 | WS-8 F2 |
| G7 | Haptic expansion | DO — 7 new sites | P2 | WS-8 F3 |
| G8 | StatCard centered | DO — complete v7.0 deferred | P2 | WS-8 F3 |
| G9 | Shared layoutId | DO — 3 key transitions | P2 | WS-8 F2 |
| G10 | Achievement overlay | DO — streak milestone trigger | P2 | WS-8 F4 |
| G11 | Aurora UI card | DEFER v1.1 (kad cycle phase feature stigne) | P3 | — |
| G12 | Privacy policy page | DO pre App Store submission (TBD datum) | P3 | posle WS-8 |
| G13 | Testimonials | DEFER dok ne bude real user feedback | P3 | — |
| G14 | Cycle phase tint | DEFER v1.1 sa cycle feature | P3 | — |
| G15 | Font pairing | SKIP — iOS HIG wins | — | — |
| G16 | Chart polish | DEFER — posle backend wire-up | P4 | — |
| G17 | Swipe gestures | DEFER v1.1 | P4 | — |
| G18 | Parallax | SKIP — ne odgovara brand-u | — | — |
| G19 | Sortable clients list | DEFER — post-beta | P4 | — |
| G20 | OLED sleep mode | SKIP — nije zaseban flow | — | — |

**Total WS-8 scope:** G1-G10 = 10 stavki, ~10h effort. Validirana vrednost po stavci.

---

## 9. Verifikacija end-to-end (WS-8 završetak)

**Automatski:**
```bash
npm run typecheck
npm run verify:tokens   # + new check za inline hsl() style
npm run build
```

**Manualno (Safari Responsive — iPhone 17 Pro):**
1. Macro boje u Food.tsx i FuelingStatusBar — tokenizovane, vizuelno identične starim (ili po izboru — nove)
2. UserAvatar status — VoiceOver čita status pored imena
3. Privacy badge u SignUpSheet prikazan
4. Lock icon na weight entry u Profile → Personal
5. EmptyState na Progress Adaptation → ima CTA
6. RestDayHero ikona Moon breathuje (5s cycle, respect reduced-motion)
7. Klik na weekly day → vraća se Home hero (shared element)
8. Streak cross 10 dana (force-mock) → achievement overlay prikazuje se
9. Water +1 u Home → haptic light
10. Badge earned u Milestones → haptic success + confetti

---

## 10. Iz skill pack-a — eventualni bonus alati

Skill pack donosi i generičke alate koje bismo mogli iskoristiti kao **jednokratnu referencu**, ali bez integracije u naš CLI:

1. **`ui-styling` SKILL shadcn references** — `references/shadcn-theming.md`, `references/shadcn-accessibility.md`. Mi već koristimo shadcn, ali mogli bismo proveriti poslednje guidelines.

2. **`design-system` SKILL token architecture** — three-layer (primitive→semantic→component). Mi trenutno imamo semantic layer. Dodavanje component layer (npr. `--button-bg`, `--card-radius`) može pojačati DRY princip ali za naš scope je over-engineering.

3. **google-fonts.csv (1924 redova)** — ako se ikad odlučimo za custom font, baza je ready.

4. **charts.csv (25 chart types)** — referenca za Progress + TrainerAnalytics chart polish iteraciju.

5. **react-performance.csv (45 redova)** — React perf checklist. Možemo scan-ovati nakon backend wire-up-a ako imamo re-render issues.

---

## 11. Sledeći koraci (posle usvajanja plana)

1. User odluči: P1+P2 bundle (WS-8) vs P1 only vs tek u v7.1 cycle
2. Ako P1+P2: kreirati granularni WS-8 plan u `.claude/plans/ws-8-*.md` sa svih 10 stavki granulirano
3. Izvršiti autonomno (kao WS-7 v7.0) sa verify posle svake faze
4. Update MASTER.md Changelog → v8.0

---

*Analiza v1.0 · 2026-04-21 · Izvor: ui-ux-pro-max-skill v2.0 · Gap analysis: Claude*
