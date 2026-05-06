# WS-8 Drift Audit

**Datum:** 2026-04-21
**Scope:** Sistematsko mapiranje design-token drift-a, a11y violacija (ui-ux-pro-max Priority 1) i iOS HIG compliance-a (swiftui-expert-skill mental model) preko celokupnog `src/`.
**Svrha:** input za Fazu 2 (tokenization sweep), Fazu 3 (motion/iOS polish), Fazu 4 (verifikacija).
**Baseline:** WS-1..WS-7 + WS-8 v8.0 već završeni (vidi `design-system/MASTER.md` Changelog).

---

## 1. Token drift (proširena verify-tokens skripta)

Skripta `scripts/verify-tokens.sh` proširena sa 5 novih check-ova (9-13):

| # | Check | Tip | Current status |
|---|---|---|---|
| 1 | Hardcoded hex `#RRGGBB` | HARD error | ✅ 0 |
| 2 | Arbitrary `shadow-[...]` | HARD error | ✅ 0 |
| 3 | Lokalne `const fadeUp` | HARD error | ✅ 0 |
| 4 | `fontSize:.*px` / `font-[Npx]` | Warning | ⚠ 0 (no hits) |
| 5 | `text-[Npx]` arbitrary | Warning | ⚠ 1 (NutritionTemplateEditor:512 namerni Apple-style ring editor) |
| 6 | `min-h/w-[44px]` umesto `min-h-11` | Warning | ⚠ 0 |
| 7 | `rounded-[Npx]` arbitrary | Warning | ⚠ 5 (GradientButton rounded-[14px] + BottomNav/TrainerBottomNav rounded-[28px/22px] — iOS 26 Liquid Glass spec) |
| 8 | Inline `hsl()`/`rgba()` u `style=` | HARD error | ✅ 0 |
| **9** | **NOVO:** Arbitrary px-spacing `{p,m,gap,inset,w,h}-[Npx]` | Warning | ⚠ **88 hits** u **21 fajla** |
| **10** | **NOVO:** Hardcoded z-index `z-[N]`/`zIndex: N` | Warning | ⚠ **9 hits** u 6 fajla |
| **11** | **NOVO:** Hardcoded `fontFamily:` string | HARD error | ✅ 0 |
| **12** | **NOVO:** Hardcoded animation duration (`transitionDuration:"Nms"`, `duration-[Nms]`) | Warning | ⚠ 0 |
| **13** | **NOVO:** Inline `backgroundColor`/`color` u `style=` van `hsl(var(...))` | Warning | ⚠ 0 |

### 1.1 Top 20 fajlova po drift severity (px-spacing + z-index + arbitrary-shadow + text/rounded-[Npx] kombinovano)

| Rank | Fajl | Total | Dominant violations |
|---|---|---|---|
| 1 | `src/pages/Profile.tsx` | **10** | `min-h-[52px]` × 4 (settings rows), `w-[32px] h-[32px]` (edit check button), `max-w-[...]` |
| 2 | `src/pages/trainer/ProgramEditor.tsx` | **5** | `w-[Npx]`, `h-[Npx]` za day cells |
| 3 | `src/pages/trainer/NutritionTemplateEditor.tsx` | **5** | `w-[56px] h-[56px] text-[18px]` meal slot rings (Apple-native editor) |
| 4 | `src/pages/Login.tsx` | **5** | `rounded-[14px]`, `rounded-[24px]`, `pb-10` magic number za safe-area |
| 5 | `src/pages/Home.tsx` | **5** | `min-w-[72px]` water counter, `min-h-[40px]` glass button, `w-[110px] h-[110px]` meal placeholder |
| 6 | `src/pages/Food.tsx` | **5** | `w-[110px] h-[110px]` meal image, `w-[22px]` status dot, padding constants |
| 7 | `src/components/trainer/ClientNutritionPlan.tsx` | **5** | `min-h-[52px]` × 3 rows |
| 8 | `src/components/onboarding/SignUpSheet.tsx` | **5** | `rounded-[14px]` × 3 buttons, `min-h-[52px]`, `rounded-t-[24px]` |
| 9 | `src/components/onboarding/ScrollWheelPicker.tsx` | **4** | `zIndex: 0/1/20` × 4 (inline) — **unique: jedini `zIndex: N`** |
| 10 | `src/components/onboarding/ProcessingScreen.tsx` | **4** | `text-[64px]` hero (namerni), `w-[22px]` dot, `py-[6px]` |
| 11 | `src/components/onboarding/HeightWeightStep.tsx` | **4** | step picker dimensions |
| 12 | `src/components/onboarding/FrequencyStep.tsx` | **4** | `text-[9px]` microlabel (Dynamic Type ISPOD 16px) |
| 13 | `src/components/TrainerBottomNav.tsx` | **4** | iOS 26 Liquid Glass nav (namerno) |
| 14 | `src/components/BottomNav.tsx` | **4** | iOS 26 Liquid Glass nav (namerno) |
| 15 | `src/pages/trainer/PackageEditor.tsx` | **3** | duration picker, `w-10 h-10` color swatches |
| 16 | `src/pages/Onboarding.tsx` | **3** | step transition gaps |
| 17 | `src/pages/AnalysisReport.tsx` | **3** | hero layout constants |
| 18 | `src/pages/ActiveWorkout.tsx` | **3** | `fixed inset-0 z-[100]` rest overlay, weight/reps inputs |
| 19 | `src/components/trainer/ProgramTargeting.tsx` | **3** | option tile padding |
| 20 | `src/components/home/MonitoringCarousel.tsx` | **3** | `gap-[2px]` × 2 sparkline bars, `h-[7px]` |

### 1.2 Z-index landscape (koristi Tailwind z-sticky/dropdown/sheet/modal/toast alijase)

Postojeći Tailwind alijasi: `z-base (0)`, `z-sticky (10)`, `z-dropdown (20)`, `z-sheet (40)`, `z-modal (100)`, `z-toast (1000)`.

| Hit | Treba postati |
|---|---|
| `src/components/SkipToContent.tsx:14` — `focus:z-[1000]` | `focus:z-toast` |
| `src/components/trainer/ClientNutritionPlan.tsx:559` — `z-[60]` toast | `z-toast` (ili dedicated `z-snackbar: 60`) |
| `src/pages/ActiveWorkout.tsx:389` — `z-[100]` rest overlay | `z-modal` |
| `src/pages/Chat.tsx:36` — `z-[60]` trainer chat overlay | `z-modal` |
| `src/pages/trainer/TrainerMessages.tsx:133` — `z-[60]` chat overlay | `z-modal` |
| `src/components/onboarding/ScrollWheelPicker.tsx:86,95,105,118` — inline `zIndex: 0/1/20/20` | keep (internal picker ticks, not global layer) |

**Akcija:** migrirati prvih 5 na Tailwind alijase; ScrollWheelPicker je lokalni stacking-context (OK da ostane).

### 1.3 Namerni "violations" (NE diraj — dokumentovati u whitelist-u)

- **iOS 26 Liquid Glass spec** — `rounded-[28px]` (nav outer) + `rounded-[22px]` (active pill) u BottomNav/TrainerBottomNav: eksplicitno 1:1 sa Apple WWDC 2025 spec, ne Tailwind skalom. **Whitelist.**
- **GradientButton `rounded-[14px]`** — Apple prominent button radius (ne `rounded-xl = 12px`). **Whitelist.**
- **ProcessingScreen `text-[64px]`** — hero percentage display, tabular. **Whitelist.**
- **WelcomeScreen emoji `text-[48px]`** — decorative aria-hidden. **Whitelist.**
- **NutritionTemplateEditor meal slot ring `w-[56px] h-[56px] text-[18px]`** — explicit Apple-native ring editor pattern. **Whitelist.**
- **Capacitor safe-area helpers** — `w-[calc(100%-32px)]` + `max-w-[420px]` u nav-ovima (iOS 26 margin spec). **Whitelist.**

---

## 2. Accessibility audit (ui-ux-pro-max Priority 1)

**Rezultat Explore agent-a na 10 ekrana (Login, Onboarding, Home, Food, Gym, ActiveWorkout, PostWorkout, Profile, Chat, Milestones):**

| Screen | CRITICAL | HIGH | MEDIUM | LOW | Top violation |
|---|---|---|---|---|---|
| Home | **1** | **1** | 2 | 1 | `text-success #10B981` kontrast na light card ≈ 3.8:1 |
| ActiveWorkout | **1** | **1** | 2 | 1 | Rest timer `aria-atomic="true"` spam + focus-ring missing |
| Login | 0 | 1 | 1 | 1 | `focus:outline-none` bez ring (WCAG SC 2.4.7) |
| Food | 0 | 0 | 3 | 1 | Macro inline HSL kontrast na card ≈ 4.2:1 |
| Profile | 0 | 0 | 2 | 1 | `text-muted-foreground` na card 3.8:1 |
| Onboarding | 0 | 0 | 2 | 1 | Slide motion bez prefers-reduced-motion guard |
| Gym | 0 | 0 | 2 | 1 | Swap button nema focus ring |
| Chat | 0 | 0 | 1 | 2 | Send button `focus:outline-none` bez ring |
| Milestones | 0 | 0 | 0 | 2 | Badge cards focus-ring missing |
| PostWorkout | 0 | 0 | 0 | 2 | Confetti bez reduced-motion |
| **TOTAL** | **2** | **3** | **15** | **13** | — |

### 2.1 Cross-cutting a11y issues (svi ekrani)

1. **`focus:outline-none` bez zamene** (WCAG SC 2.4.7, HIGH/MEDIUM) — naši shadcn `<Button>` i `<Input>` imaju default focus-visible ring, ali custom `<button>` / `<input>` u app kodu često override-uju bez zamene. Affects: Login lines 246, 265; Home water glasses/buttons; ActiveWorkout inputs; Profile settings buttons; Chat send; Milestones badge cards.
   **Fix:** dodati utility klasu `.focus-ring-default` u index.css = `focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none` i primeniti svuda gde se override-uje outline.

2. **`text-muted-foreground` contrast na card-ovima** (WCAG SC 1.4.3, HIGH) — var(--muted-foreground) je `240 4% 46%` u light mode = HSL lightness 46%, što daje ~4.2-4.8:1 na white card depending na pairing. Na `bg-background-secondary` (light gray) pada ispod 4.5:1 za normal text.
   **Fix:** povisiti `--muted-foreground` light vrednost u index.css na `240 4% 40%` (darker) → validira kroz @stark contrast tool.

3. **Motion bez reduced-motion guard** (WCAG SC 2.3.3, MEDIUM) — globalni CSS media query gasi CSS transitions/animations, ali ne framer-motion `initial/animate/transition` props. Affects:
   - PostWorkout confetti (29-53)
   - MonitoringCarousel stagger reveals (50-56)
   - QueueStrip pulsing border (54) infinite loop
   - Onboarding slide transitions (124-128)
   **Fix:** koristiti `shouldReduceMotion()` helper wrap ili `useReducedMotion()` hook unutar svake motion komponente.

4. **Color-only status indicators** (WCAG SC 1.4.1, MEDIUM) — nekoliko mesta:
   - WeeklyCalendar shifted day dot (warning amber, no label)
   - Food macro colors (red/yellow/green only, no text distinction)
   **Fix:** dodati icon + text label pored boje.

---

## 3. iOS HIG compliance audit (swiftui-expert-skill mental model)

**Rezultat Explore agent-a kroz 6 dimenzija:**

| Dimension | CRITICAL | HIGH | MEDIUM | LOW | Assessment |
|---|---|---|---|---|---|
| Touch targets ≥ 44×44 | 0 | **3** | 2 | 0 | 82% clean — neki icon buttons ispod |
| Spring animation timing | 0 | 0 | 2 | 1 | Mostly clean; IOS_SPRING tokens dostupni |
| Dynamic Type support | 0 | 0 | 3 | 1 | Body ≥ 16px gotovo svuda; 10-12px microlabels u 3 mesta |
| Safe-area insets | 0 | **2** | 2 | 0 | BottomNav ✓, ali custom sheets neke miss-uju |
| Reduced-motion fallback | 0 | **1** | 2 | 0 | `fadeUp()` helper respektuje; framer-motion raw motion često ne |
| Haptic opportunities | 0 | 0 | 0 | 5 | 11 tačaka trenutno (WS-6 + WS-8); 5 novih prilika |
| **TOTAL** | 0 | **6** | 11 | 7 | **82% HIG-compliant** |

### 3.1 Touch target violations (HIGH)

- `src/components/home/MonitoringCarousel.tsx:53,56,59` — `w-6 h-6` icon containers (ako su interaktivni — proveriti)
- `src/components/queue/SyncEventBanner.tsx:31` — close X `w-8 h-8` (32pt) → treba `min-w-11 min-h-11`
- `src/components/trainer/ClientNutritionPlan.tsx:199,203` — avatar buttons `w-8 h-8` → upgrade

### 3.2 Safe-area violations (HIGH)

- `src/pages/Subscription.tsx` — `fixed bottom-0` bez `pb-safe-cta` → home indicator overlay rizik
- `src/pages/Login.tsx:42` — sign-in sheet `pb-10` (40px) umesto `pb-safe-cta`; na iPhone 17 Pro (home indicator 34pt) nedovoljno

### 3.3 Reduced-motion HIGH violation

- `src/pages/PostWorkout.tsx:29-53` — confetti full-screen 2.5-4.5s bez `shouldReduceMotion()` guard. Može izazvati motion sickness.

### 3.4 Missing haptic opportunities (LOW — pod P2 plan)

1. TrainerProfile ToggleSwitch (notifikacija toggles) — `haptic("medium")`
2. Chat send button — `haptic("light")`
3. TrainerMessages filter buttons — `haptic("light")`
4. WeeklyCalendar day tap — `haptic("selection")`
5. NutritionTemplateEditor meal slot picker — `haptic("light")`

---

## 4. Decisions nakon audita

### 4.1 P1 (Faza 2 scope — CRITICAL + HIGH)

| ID | Akcija | Fajlovi | Effort |
|---|---|---|---|
| **D1** | Focus-ring utility klasa `.focus-ring-default` + primena na sve custom button/input | index.css + 10 pages | 2h |
| **D2** | `--muted-foreground` light value povisiti na 40% lightness za bolji contrast | index.css | 15min |
| **D3** | Auto-fix 88 px-spacing hits → Tailwind skala ili `--spacing-*` tokens | top 10 fajlova | 2-3h |
| **D4** | Z-index migration 5 hits → `z-modal`/`z-toast` Tailwind alijasi | SkipToContent, ClientNutritionPlan, ActiveWorkout, Chat, TrainerMessages | 30min |
| **D5** | Touch target upgrade 3 HIGH hits (SyncEventBanner X, ClientNutritionPlan avatars, MonitoringCarousel icons) | 3 fajla | 30min |
| **D6** | Safe-area fix — Subscription + Login sign-in sheet → `pb-safe-cta` | 2 fajla | 30min |
| **D7** | PostWorkout confetti → `shouldReduceMotion()` guard | PostWorkout.tsx | 15min |
| **D8** | Color-only fix — WeeklyCalendar shifted dot add text/icon label | WeeklyCalendar.tsx | 30min |

**Ukupan P1 effort:** ~6-7h.

### 4.2 P2 (Faza 3 scope — motion/iOS polish sa brand guardrails)

| ID | Akcija | Effort |
|---|---|---|
| **D9** | Spring migration — PlanInsightCard, MonitoringCarousel → `IOS_SPRING.soft` | 30min |
| **D10** | QueueStrip pulsing border + Onboarding slide transitions → reduced-motion guards | 30min |
| **D11** | 5 novih haptic integracija (toggle, Chat send, filter, calendar day, meal slot) | 1h |
| **D12** | Proširiti breathing animation sa 3 → 4 sites (dodati post-workout cool-down ili luteal phase UI) | 30min |
| **D13** | Shared layoutId proširenje: client list ↔ ClientProfile hero avatar (istražiti Framer Motion cross-route) | 1-1.5h |
| **D14** | **Macro color rotation prema ui-ux-pro-max row 143 standard (BLUE/ORANGE/YELLOW)?** — decision needed | 30min |
| **D15** | Achievement overlay confetti reuse iz PostWorkout | 30min |

**Ukupan P2 effort:** ~5h.

### 4.3 BRAND GUARDRAILS — šta NEĆEMO dirati

- ✋ Pink/purple light-first brand palette (Period Tracker row 144 match)
- ✋ System-ui font stack (iOS HIG native)
- ✋ BottomNav iOS 26 Liquid Glass `rounded-[28px]` spec
- ✋ GradientButton `rounded-[14px]` Apple prominent
- ✋ No testimonials / social proof sekcije (v1.1 samo)
- ✋ No Aurora UI flowing gradient (incompatible sa brand)
- ✋ No Brutalism / Claymorphism stilovi

**Diskusna tačka (D14):** Macro colors. v8.0 tokenizovao postojeće red/yellow/green kao `--macro-protein/carb/fat`. Novi WS-8 prompt traži BLUE/ORANGE/YELLOW industrial standard (products.csv row 143). **Macro nije na ✋ listi**, pa user ima pravo overwrite-a. Preporuka: **ostaviti odluku useru** — argumenti za obe strane u Fazi 2 diff-u.

---

## 5. Faze 2-4 Roadmap (spreman za approval)

### Faza 2 — Tokenization Sweep (6-7h, posle approval-a)
- D1–D8 (P1 fixes)
- Verifikacija posle svakog batch-a
- Commit per logical group (focus-ring, px-spacing, z-index, touch, safe-area, reduced-motion, color-only)

### Faza 3 — Motion & iOS-Native Polish (5h, posle approval-a)
- D9–D15 (P2 polish)
- `swiftui-pro` review pass na izmenjene komponente
- User decision za D14 macro colors
- Commit per feature

### Faza 4 — Verification + Lock-in (1h)
- Full verify-tokens expectation: 0 P1 hits u top 10 fajlova
- Dodaj pre-commit hook u `.claude/settings.json` (PreToolUse Edit/Write → run verify-tokens)
- Ažuriraj memory: `project_roadmap.md` (WS-8 complete), `feedback_workflow.md` (ako nova lesson)
- Finalni `.claude/plans/ws-8-complete-report.md` sa before/after metrikama i brand guardrails check

---

## 6. Summary numbers

| Metric | Pre-audit | Post-audit target |
|---|---|---|
| Hard verify-tokens errors | 0 | 0 (maintain) |
| px-spacing warnings | 88 | < 20 (whitelist iOS 26 + namerne hero displays) |
| z-index hardcodes | 9 | 4 (ScrollWheelPicker lokalno OK) |
| A11y CRITICAL | 2 | 0 |
| A11y HIGH | 3 | 0 |
| A11y MEDIUM | 15 | < 5 |
| iOS HIG HIGH | 6 | 0 |
| iOS HIG MEDIUM | 11 | < 4 |
| Haptic integration points | 11 | 16 (+5) |
| Breathing animation sites | 3 | 4 |
| Shared layoutId transitions | 1 | 3 |

---

*Audit v1.0 · 2026-04-21 · Extended verify-tokens + 2 Explore agenti · Pre Faze 2 approval*
