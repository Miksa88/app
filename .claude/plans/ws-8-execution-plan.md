# WS-8 v8.1 — Execution Plan (Faze 2-4)

**Status:** approved 2026-04-21 · autonomous execution
**Baseline:** drift-audit.md (Faza 1 completed)
**Brand guardrails:** ✋ pink/purple light-first, system-ui font, iOS 26 Liquid Glass, no testimonials/Aurora/Brutalism/Claymorphism
**Macro color decision:** ROTATE → BLUE/ORANGE/YELLOW (kolor-blind safe + industry standard iz ui-ux-pro-max row 143)

---

## Faza 2 — Tokenization Sweep (~7h, 9 D-stavki)

**Verify posle SVAKE D-stavke:** `npm run typecheck && npm run verify:tokens && npm run build`

### D1 · Focus-ring utility + migration (2h)
- Dodaj `.focus-ring-default` utility u `src/index.css` u `@layer utilities`:
  ```css
  .focus-ring-default {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background;
  }
  ```
- Scan top 10 ekrana za `focus:outline-none` bez zamene, dodaj `focus-ring-default`:
  - Login.tsx:246, 265 (email + password inputs)
  - Home.tsx: water glass buttons (259-276), +/- buttons (282-313)
  - Profile.tsx: settings buttons (99-109), edit check button (256)
  - Chat.tsx: send button (103-110)
  - Milestones.tsx: badge cards
  - ActiveWorkout.tsx: weight/rep inputs, back + skip rest buttons
- Gym.tsx Swap button
- Verify

### D2 · `--muted-foreground` contrast upgrade (15min)
- `src/index.css` light mode: `--muted-foreground: 240 4% 46%` → `240 4% 40%` (darker = 4.8:1 na white card, 4.5:1 na background-secondary)
- Dark mode: ostavi (vrednost 60% je OK na dark)
- Verify kontrast na screenshot-u glavnih ekrana (Home/Food/Profile)

### D3 · px-spacing sweep (2-3h)

**Definisati whitelist fajlove (namerni, NE dirati):**
- `src/components/BottomNav.tsx`, `TrainerBottomNav.tsx` — iOS 26 Liquid Glass spec
- `src/components/GradientButton.tsx` — Apple prominent `rounded-[14px]`
- `src/components/onboarding/ProcessingScreen.tsx` — hero `text-[64px]`
- `src/components/onboarding/WelcomeScreen.tsx` — emoji `text-[48px]`
- `src/pages/trainer/NutritionTemplateEditor.tsx:512` — Apple-native meal slot ring
- `src/components/onboarding/ScrollWheelPicker.tsx` — internal stacking context zIndex 0/1/20

**Fix by file (top drift):**

**Profile.tsx (10 hits):**
- `min-h-[52px]` × 4 settings rows → `min-h-[3.25rem]` (idealno token-ize: dodati `--row-height-settings: 52px`) **decision: ostaje 52px kao row height spec; zameniti sa custom utility `.ios-row-h` = `min-h-[3.25rem]` definisan u index.css**
- `w-[32px] h-[32px]` edit check button → `w-8 h-8 min-w-11 min-h-11` (touch target fix uz to)
- `max-w-[...]` tooltip → dozvoljeno (single-use constraint)

**Login.tsx (5 hits):**
- `rounded-[14px]` × 3 social buttons → keep (Apple prominent) — **whitelist SignUpSheet buttons isto**
- `pb-10` → `pb-safe-cta` (D6 već pokriva)
- `rounded-t-[24px]` sheet → `rounded-t-3xl` (24px = Tailwind 3xl)

**Home.tsx (5 hits):**
- `min-w-[72px]` water counter → `min-w-20` (80px, najbliža Tailwind skala) ili `min-w-[4.5rem]` (exactly 72px)
- `min-h-[40px]` glass button → `min-h-10` (40px) — ali ovo nije tap target; parent motion.button ima min-h internal
- `w-[110px] h-[110px]` meal card image → `w-28 h-28` (112px, ~100% match)

**Food.tsx (5 hits):**
- `w-[110px] h-[110px]` meal image → `w-28 h-28` (isto kao Home)
- `w-[22px]` status dot → `w-[22px]` keep (nije touch target, layout constraint)
- padding constants → case-by-case

**ClientNutritionPlan.tsx (5 hits):**
- `min-h-[52px]` × 3 rows → `.ios-row-h` utility (isti kao Profile)

**SignUpSheet.tsx (5 hits):**
- `rounded-[14px]` × 3 → keep (Apple prominent)
- `min-h-[52px]` → `.ios-row-h`
- `rounded-t-[24px]` → `rounded-t-3xl`

**ProgramEditor.tsx (5 hits):** day cells `w-[N]` → case-by-case Tailwind scale

**HeightWeightStep, FrequencyStep (4 each):** step picker dimensions — case-by-case

**MonitoringCarousel (3):**
- `gap-[2px]` × 2 → `gap-0.5` (2px) — Tailwind alias postoji
- `h-[7px]` → `h-[7px]` keep (sparkline specific)

- Verify

### D4 · Z-index migration (30min)

Sa Tailwind `zIndex` extend (v6.0) imamo: `z-sticky: 10`, `z-dropdown: 20`, `z-sheet: 40`, `z-modal: 100`, `z-toast: 1000`.

- `src/components/SkipToContent.tsx:14` — `focus:z-[1000]` → `focus:z-toast`
- `src/components/trainer/ClientNutritionPlan.tsx:559` — `z-[60]` (snackbar) → **dodaj `z-snackbar: 60` u Tailwind config** pa `z-snackbar`
- `src/pages/ActiveWorkout.tsx:389` — `z-[100]` → `z-modal`
- `src/pages/Chat.tsx:36` — `z-[60]` chat overlay → `z-modal`
- `src/pages/trainer/TrainerMessages.tsx:133` — `z-[60]` → `z-modal`
- ScrollWheelPicker inline `zIndex: 0/1/20` — LEAVE (internal stacking context, ne global layer)

- Verify

### D5 · Touch target upgrade (30min)

- `src/components/queue/SyncEventBanner.tsx:31` — close X → `min-w-11 min-h-11` wrapper
- `src/components/trainer/ClientNutritionPlan.tsx:199,203` — avatars su unutar row-a koji je tappable; verify da parent button ima `min-h-11`; ako DA, leave avatar `w-8 h-8`. Ako NE, wrap.
- `src/components/home/MonitoringCarousel.tsx:53,56,59` — ikone su dekorativne (not interactive). LEAVE, dokumentuj.
- Verify

### D6 · Safe-area insets (30min)

- `src/pages/Login.tsx:42` — sign-in sheet `pb-10` → `pb-safe-cta`
- `src/pages/Subscription.tsx` — fixed bottom CTA wrapper → `pb-safe-cta` ako fali
- `src/pages/trainer/AssignProgram.tsx:205` — fixed bottom → `pb-safe-cta` ako fali
- Verify

### D7 · PostWorkout reduced-motion guard (15min)

- `src/pages/PostWorkout.tsx:29-53` — wrap confetti u `shouldReduceMotion()` check:
  - Ako reduce → ne prikazuj confetti komponentu uopšte
  - Stat cards animation već OK (ima fadeUp koji već guarded)
- Verify

### D8 · WeeklyCalendar color-only fix (30min)

- `src/components/queue/WeeklyCalendar.tsx:132-138` — shifted dot — dodati visible aria text ili ikonu Shift kraj dot-a za client variant (currently samo trainer ima aria-label). Pratiti pattern:
  - Dot ostaje za visual
  - Dodati `<ArrowRightLeft size={10}>` unutar dot-a ili `<span className="sr-only">` text
  - aria-label na parent day cell
- Verify

### D14 · MACRO COLOR ROTATION (45min)

**Trenutno:** red/yellow/green (semantic "food material")
**Novo:** BLUE/ORANGE/YELLOW (kolor-blind safe + MyFitnessPal/Lose It konvencija)

**Izmene u `src/index.css`:**
```css
/* Light mode */
--macro-protein: 211 100% 50%;  /* blue — strukturno/mišić */
--macro-carb: 25 95% 53%;       /* orange — energy/fuel */
--macro-fat: 45 93% 47%;        /* yellow — fat/ulje */

/* Dark mode */
--macro-protein: 211 100% 65%;
--macro-carb: 25 95% 65%;
--macro-fat: 45 93% 60%;
```

**Tailwind config:** nema promene (klase `text-macro-protein/carb/fat` čitaju CSS var).

**Dokumentuj u MASTER.md §1.1:** razlog rotacije (WCAG kolor-blindna + industrial alignment).

- Verify (Food.tsx meal detail pregled vizuelno)

**Faza 2 commit strategy:** 9 logical commits (po D-stavci).

---

## Faza 3 — Motion & iOS-Native Polish (~5h, 7 D-stavki)

### D9 · Spring migration (30min)

- `src/components/PlanInsightCard.tsx:31,33,35` — `duration: 0.2/0.25` linear → `...IOS_SPRING.soft`
- `src/components/home/MonitoringCarousel.tsx:50-56` — stagger reveals → `{ ...IOS_SPRING.soft, delay: i * 0.04 }`
- Verify

### D10 · Reduced-motion guards (30min)

- `src/components/queue/QueueStrip.tsx:54` — pulsing border 1.6s loop:
  ```tsx
  const reduce = shouldReduceMotion();
  const pulseAnimation = reduce ? {} : { ...pulsingBorderAnimation() };
  ```
- `src/pages/Onboarding.tsx:124-128` — slide variants → check reduce, use instant
- Verify

### D11 · Haptic expansion (5 novih, 1h)

- **TrainerProfile ToggleSwitch** — `haptic("medium")` na state change
- **Chat.tsx send button** — `haptic("light")` na send success
- **TrainerMessages filter buttons** — `haptic("light")` per filter toggle
- **WeeklyCalendar DayCell onClick** — `haptic("selection")`
- **NutritionTemplateEditor meal slot picker** — `haptic("light")`
- Verify

### D12 · Breathing 4th site (30min)

Cilj: 4 kalmna konteksta (v8.0 imamo 3: RestDay Moon, SyncBanner icon, PrivacyBadge Shield).

4. **Luteal phase indicator ako postoji u Home** (next-session card luteal badge)
   - Ili alternativno: **PostWorkout cool-down ikona** (gde je "Hvala, završen trening" poruka)
   - Odluka u izvršenju na osnovu šta postoji u kodu
- Verify

### D13 · Shared layoutId istraživanje (1-1.5h)

**Cilj:** client list item ↔ ClientProfile hero avatar cross-route transition.

**Istraživanje:**
1. Proveriti da li AnimatePresence wrap oko BrowserRouter omogućava layoutId cross-route
2. Ako DA — primeniti:
   - `src/pages/trainer/TrainerClients.tsx` row: `<UserAvatar layoutId={\`client-${id}\`} ... />`
   - `src/pages/trainer/ClientProfile.tsx` hero: `<UserAvatar layoutId={\`client-${id}\`} ... />`
3. Ako NE — dokumentovati u report-u + alternativa: WeeklyCalendar day → Home "Danas" hero layoutId (intra-page).

**Requirements:** UserAvatar mora da podržava `layoutId` prop (trenutno NE). Dodati u `src/components/ui/user-avatar.tsx`.

- Verify

### D15 · Achievement confetti reuse (30min)

- Extract `ConfettiCelebration` iz `src/pages/PostWorkout.tsx` u `src/components/ConfettiCelebration.tsx`
- Respektovati reduced-motion (iz D7 fix-a)
- Wire u `AchievementOverlay` — confetti iznad badge scale-up kada `milestone !== null`
- Verify

**Faza 3 commit strategy:** 7 logical commits + final swiftui-pro review pass (paste output u commit message).

---

## Faza 4 — Verification + Lock-in (~1h)

### V1 · Final verify-tokens
- `npm run verify:tokens` — expect 0 hard errors, warnings samo whitelist-ovane (iOS 26 spec, Apple hero displays)
- `npm run typecheck && npm run build`

### V2 · Pre-commit hook
- Proširi `.claude/settings.json` (ili `.husky/pre-commit` ako projekat koristi Husky):
  - **Option A (hooks):** PreToolUse `Edit|Write` na `src/**/*.tsx` → run `bash scripts/verify-tokens.sh`, blokiraj na failure
  - **Option B (Husky):** `npx husky add .husky/pre-commit "npm run verify:tokens"`
- Odluka u izvršenju: A je lakši (nema Husky instalacije), ali run-na-every-edit može biti spor. B je industrial-standard.
- Preporuka: A za harness-level, plus dodati verify:tokens u CI (`.github/workflows/ui-gate.yml` već postoji — potvrditi)

### V3 · Memory update
- `/Users/mihajlotokovic/.claude/projects/.../memory/project_roadmap.md` — dodati "WS-8 v8.1 complete: drift audit + tokenization sweep + iOS HIG polish + macro color rotation"
- `/Users/mihajlotokovic/.claude/projects/.../memory/feedback_workflow.md` — lesson: "Kolor-blindni parovi (red/green, red/brown) treba izbegavati u data visualization — ui-ux-pro-max rule `color-not-only` + WCAG SC 1.4.1"

### V4 · Final report
- `.claude/plans/ws-8-complete-report.md`:
  - Before/After drift count tabela
  - A11y score diff (2→0 CRITICAL, 3→0 HIGH, 15→<5 MEDIUM)
  - iOS HIG compliance tabela
  - Brand guardrails check (svaki ✋ = zadržan)
  - Preostali follow-up stavke

### V5 · MASTER.md Changelog v8.1
- Sekcija "2026-04-21 — WS-8 v8.1 Drift Elimination + iOS-Native Polish"
- Macro color rotation rationale
- 88 px-spacing → ~10 whitelist-ovanih
- 9 z-index → 4 (+ z-snackbar: 60 new Tailwind alias)
- 11 haptic → 16 (+5)
- 3 breathing → 4 sites
- 1 shared layoutId → 2 (ako D13 uspe)

---

## Verification gate (posle svake faze)

Svaka Faza ima verify check:
```bash
npm run typecheck  # 0 errors
npm run verify:tokens  # 0 hard errors, warnings whitelist only
npm run build  # success
```

## Brand guardrails check (kontinuirano)

Svaki commit mora da proleti kroz:
- Pink/purple brand gradient netaknut ✓
- System-ui font stack netaknut ✓
- iOS 26 Liquid Glass nav netaknut ✓
- No testimonials / Aurora / Brutalism / Claymorphism introduce ✓
- Macro rotation (novo): razlog dokumentovan u MASTER.md ✓

## Ukupan effort

| Faza | Trajanje |
|---|---|
| 2 — Tokenization Sweep (D1-D8, D14) | 7h |
| 3 — Motion & iOS-Native Polish (D9-D13, D15) | 5h |
| 4 — Verification + Lock-in | 1h |
| **Total** | **~13h autonomnog rada** |

---

## Rollback plan

Svaka D-stavka je separate commit. Ako bilo koji verify padne → revert tog commit-a, debug, re-commit. Ne next D dok prethodni ne zeleni.

---

*Plan v8.1 · 2026-04-21 · Full autonomous execution approved*
