# fitbyivana Design System — MASTER

**Status:** Living document. §1 Foundations popunjen (WS-1). §2–§6 rastu kroz WS-2 do WS-5.
**Last update:** 2026-04-21 (WS-8 v8.1 Drift Elimination + iOS-Native Polish)
**Source of truth:** [src/index.css](../src/index.css), [tailwind.config.ts](../tailwind.config.ts), [src/lib/motion.ts](../src/lib/motion.ts), [src/lib/design-tokens.ts](../src/lib/design-tokens.ts)

---

## Kako koristiti ovaj dokument

- **Developer pre pisanja UI-ja:** skeniraj §1 Foundations. Svi tokeni ovde mapirani su na CSS vars/utility klase.
- **Dizajn regresija:** `npm run verify:tokens` pokreće [scripts/verify-tokens.sh](../scripts/verify-tokens.sh) — blokira hardcoded hex, arbitrary shadows, fadeUp duplikate. Isti gate u CI-u.
- **Novi token:** prvo dodaj CSS var u [src/index.css](../src/index.css) (light + dark), pa map u [tailwind.config.ts](../tailwind.config.ts), pa ovde dokumentuj i dodaj u Changelog.

---

## §1 Foundations

### 1.1 Color tokens

Svi tokeni definisani kao HSL CSS vars u [src/index.css:6-79](../src/index.css:6) (light) i [src/index.css:81-135](../src/index.css:81) (dark). Tailwind ih čita preko `hsl(var(--X))` u [tailwind.config.ts:19-78](../tailwind.config.ts:19).

**Semantic tokens (uvek koristi ovo, ne sirovi hex):**

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--background` | `0 0% 100%` | `0 0% 0%` | Page background |
| `--background-secondary` | `240 5% 96%` | `240 6% 10%` | Section bg, subtle contrast |
| `--foreground` | `0 0% 0%` | `0 0% 100%` | Primary text |
| `--card` | `0 0% 100%` | `240 6% 14%` | Card surface |
| `--primary` | `325 82% 51%` | `325 82% 51%` | Brand pink (CTA, active states) |
| `--secondary` | `289 63% 42%` | `289 63% 42%` | Brand purple (gradient endpoint) |
| `--muted-foreground` | `240 4% 46%` | `240 4% 60%` | Secondary text |
| `--border` | `240 6% 90%` | `240 4% 22%` | Dividers, outlines |
| `--destructive` | `0 84% 60%` | `0 84% 60%` | Error, delete actions |
| `--success` | `142 71% 45%` | — | Eaten, completed |
| `--warning` | `32 95% 50%` | — | Trial expiry, caution |
| `--info` | `211 100% 50%` | — | Info banners, sync events |
| `--text-secondary` | `240 6% 25%` | `240 6% 75%` | Muted body text (utility `.text-secondary`) |

**Brand gradient** — primary → secondary. Nikada ne hardkoduj pojedinačne stopove:
- `.gradient-primary` utility ([src/index.css:176](../src/index.css:176)) — `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))`
- `.gradient-text` — clip-text varijanta za naslove
- Za SVG gradient stops — `stopColor="hsl(var(--primary))"` ne `stopColor="hsl(325, 82%, 51%)"`

**Sirovi hex dozvoljen SAMO:**
- Brand logo SVG (Google multi-color putanje u Login/SignUpSheet)
- Literalni tekst prikaz brand hex-a (TrainerProfile:276 za brand guide reference)
- shadcn primitivi (chart.tsx, sidebar.tsx)

Sve ostalo = fail u `verify:tokens`.

### 1.2 Typography scale (iOS Dynamic Type)

10-step lestvica u [src/index.css:301-311](../src/index.css:301), svi u `rem` za Dynamic Type skaliranje:

| Utility | rem | px | Weight | Line | Use |
|---|---|---|---|---|---|
| `.text-large-title` | 2.125 | 34 | 700 | 1.2 | Hero title, page header |
| `.text-title-1` | 1.75 | 28 | 700 | 1.3 | Section title |
| `.text-title-2` | 1.375 | 22 | 700 | 1.3 | Card title |
| `.text-title-3` | 1.25 | 20 | 600 | 1.3 | Sub-section |
| `.text-headline` | 1.0625 | 17 | 600 | 1.3 | Emphasized body |
| `.text-body` | 1.0625 | 17 | 400 | 1.5 | Default body |
| `.text-callout` | 1 | 16 | 400 | 1.5 | Meta info |
| `.text-subhead` | 0.9375 | 15 | 400 | 1.5 | Card subhead |
| `.text-footnote` | 0.8125 | 13 | 400 | 1.4 | Supplemental |
| `.text-caption-1` | 0.75 | 12 | 400 | 1.3 | Labels, captions |
| `.text-caption-2` | 0.6875 | 11 | 400 | 1.2 | Smallest |

**Font stack** ([src/index.css:160](../src/index.css:160)): `system-ui, -apple-system, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif`.

**Font weight pravila:** Bold headings 600–700, Regular body 400, Medium labels 500. Ne odstupaj.

**Tabular numbers** — za displays sa statistikom (weight/reps/kcal/time), dodaj `tabular-nums` Tailwind klasu (built-in).

### 1.3 Spacing scale

CSS vars u [src/index.css:70-78](../src/index.css:70), Tailwind aliases u [tailwind.config.ts:86-97](../tailwind.config.ts:86):

| Token | CSS var | Tailwind alias | px | Upotreba |
|---|---|---|---|---|
| xs | `--spacing-xs` | `p-xs` | 4 | Tight icon + text gap |
| sm | `--spacing-sm` | `p-sm-token` | 8 | Internal component padding |
| md | `--spacing-md` | `p-md-token` | 12 | Compact card padding |
| base | `--spacing-base` | `p-base` | 16 | Screen horizontal padding, default card |
| lg | `--spacing-lg` | `p-lg-token` | 20 | Comfortable card padding |
| xl | `--spacing-xl` | `p-xl-token` | 24 | Section gap |
| 2xl | `--spacing-2xl` | `p-2xl-token` | 32 | Between major regions |
| 3xl | `--spacing-3xl` | `p-3xl-token` | 48 | Hero spacing |

**Pravila primene:**
- Screen container: `px-base` (16px) na mobile
- Card interior: `p-lg-token` (20px)
- Section-to-section gap: `gap-xl-token` (24px)
- Group sibling rows: 16px
- Between major regions: 32px

> **Note:** default Tailwind `p-4` = 16px postoji paralelno — preporuka: koristi semantic token `p-base` za screen padding, default `p-4/p-5/p-6` i dalje OK za komponentno spec padding.

### 1.4 Radii convention

`--radius: 0.75rem` (12px) u [src/index.css:45](../src/index.css:45). Tailwind scale deriviran iz nje.

| Element | Klasa | px |
|---|---|---|
| Button | `rounded-xl` | 16 |
| Card | `rounded-2xl` | 20 |
| Sheet (top only) | `rounded-t-3xl` | 24 top |
| Pill / Badge / Chip | `rounded-full` | 9999 |
| Input | `rounded-xl` | 16 |
| Icon tile (small bg) | `rounded-lg` | 12 |

### 1.5 Shadow tiers

CSS vars u [src/index.css:59-61](../src/index.css:59) (light) i [src/index.css:132-134](../src/index.css:132) (dark — adaptivne tamnije alpha).

| Utility | CSS var | Upotreba |
|---|---|---|
| `.card-shadow` | `--shadow-card` | Default card, list item |
| `.shadow-elevated` | `--shadow-elevated` | Modal, sheet, highlighted card |
| `.shadow-fab` | `--shadow-fab` | FAB, primary gradient button (brand-tinted) |

**`shadow-[0_1px_3px_rgba(...)]` arbitrary values = FAIL u verify gate.** Koristi samo ove 3 klase.

### 1.6 Motion tokens + reduce-motion policy

**Durations** (iOS-inspired) — [src/lib/motion.ts:25-30](../src/lib/motion.ts:25) + [src/index.css:64-66](../src/index.css:64):

| Token | JS ms | CSS var | Upotreba |
|---|---|---|---|
| fast | 150 | `--motion-duration-fast` | Tap feedback, state toggle |
| base | 250 | `--motion-duration-base` | Modal open/close, inline transition |
| slow | 400 | `--motion-duration-slow` | Page transition, hero reveal |
| spring | 350 | (default fadeUp) | Content card entrance |

**Easings:**
- `out-quart` (`cubic-bezier(0.25, 1, 0.5, 1)`) — sharpened ease-out, iOS-like
- `spring-gentle` (`cubic-bezier(0.34, 1.56, 0.64, 1)`) — blagi overshoot
- `easeOut` — default za fadeUp preset

**Reduced-motion policy (OBAVEZNO):**
1. Globalni CSS fallback u [src/index.css:142-151](../src/index.css:142) — svaka animacija/tranzicija svedena na 0.01ms.
2. JS detekcija preko [shouldReduceMotion()](../src/lib/motion.ts:16) za Framer Motion.
3. **Svi helperi u [motion.ts](../src/lib/motion.ts) automatski respektuju** — `fadeUp()`, `scaleIn()`, `pulsingBorderAnimation()` proveravaju `shouldReduceMotion()`.
4. **Custom animacije u komponentama** moraju koristiti `shouldReduceMotion()` ako vizualno remete.
5. **Nikad** ne piši Framer Motion `animate={{ scale: [1, 1.1, 1], repeat: Infinity }}` bez reduce-motion guard-a.

**fadeUp migracija (WS-1 DoD):** sve stranice importuju iz `@/lib/motion` — lokalne definicije zabranjene. Jedini izuzetak je Login.tsx koji koristi variants pattern (stagger) — rešava se u WS-4.

### 1.7 Icon sizing

Tri veličine u [src/lib/design-tokens.ts:22-26](../src/lib/design-tokens.ts:22):

| Token | px | Upotreba |
|---|---|---|
| `ICON_SIZE.sm` | 16 | Inline u tekstu, caption, sidebar link |
| `ICON_SIZE.md` | 20 | Body, button, default screen icon |
| `ICON_SIZE.lg` | 24 | Heading, large action, hero CTA |

Preporučena upotreba:
```tsx
import { ICON_SIZE } from "@/lib/design-tokens";
<Home size={ICON_SIZE.md} aria-hidden="true" />
```

Stroke width — 1.5 default, 2.2 aktivno/selected (per BottomNav/TrainerBottomNav pattern). Konzistentno kroz app.

**Emoji kao ikone = FAIL** (rešava se u WS-2 A11y pass). Izuzetak: Milestones gamification badges — dokumentuje se u §4.4 tokom WS-2.

---

## §2 Components (WS-3)

### 2.1 Button

- **Minimum touch target 44×44pt** (iOS HIG + WCAG 2.5.5) — shadcn Button primitives imaju default, custom `<button>` mora imati `min-h-[44px]` + `min-w-[44px]` za icon-only.
- **GradientButton** ([src/components/GradientButton.tsx](../src/components/GradientButton.tsx)) — primary CTA sa `loading` + `disabled` + `aria-busy` + `aria-disabled` props.
- **Icon-only buttons** moraju imati `aria-label={t(...)}` + `<Icon aria-hidden="true" />`.

### 2.2 Input

- [src/components/ui/input.tsx](../src/components/ui/input.tsx) — `h-11 min-h-[44px]` (WS-1 update).
- **Keyboard types obavezni:**
  - `inputMode="email"` + `type="email"` za email
  - `inputMode="numeric"` za cele brojeve (reps, age)
  - `inputMode="decimal"` za decimalne (weight u kg)
  - `inputMode="tel"` za telefon
- **autoComplete** obavezno: `given-name`, `family-name`, `email`, `current-password`, `new-password`.

### 2.3 Dialog / AlertDialog / Sheet / Drawer — when which

| Use case | Primitive | Reason |
|---|---|---|
| **Destructive confirm** (delete, logout, cancel) | `<AlertDialog>` | `role="alertdialog"` obavezan za screen reader announcement |
| **Form modal** (edit, picker) | `<Dialog>` | Focus-trap + escape + aria-modal |
| **Bottom sheet** (meal detail, explanation) | `<Sheet side="bottom">` | Slide-up, dismissible |
| **Full drawer** (mobile menu, side panel) | `<Drawer>` (vaul) | Touch-drag dismiss |

**Nikad** `<div className="fixed inset-0">` custom modal — uvek kroz shadcn primitives zbog focus-trap + escape + aria-modal.

### 2.4 Toast — sonner (winner)

**Odluka (WS-3 Decision Log):** standardizovati na [sonner](https://sonner.emilkowal.ski). Razlozi: moderniji API, rich colors, top-center pozicija, aria-live automatski.

- [src/App.tsx](../src/App.tsx) — `<Toaster position="top-center" richColors closeButton />` iz sonner-a
- [src/hooks/use-toast.ts](../src/hooks/use-toast.ts) — compat shim koji mapira stari shadcn `toast({ title, variant })` API na sonner-ov `toast.success()` / `toast.error()`
- **Novi kod** — direktno `import { toast } from "sonner"` i `toast.success(...)`.
- **Duration:** success 3s, error 5s, info 4s.

### 2.5 EmptyState

- [src/components/ui/empty-state.tsx](../src/components/ui/empty-state.tsx) — unified 4th-state "no data" komponenta.
- Props: `icon?` (Lucide icon), `title`, `description?`, `cta?`, `children?`.
- `role="status"` — screen reader announce da je prazno stanje.
- **Zamenjuje ad-hoc tekst blokove** — do sada 5+ mesta migrirano (Progress, Gym, QueueStrip).

### 2.6 Skeleton

- [src/components/ui/skeleton.tsx](../src/components/ui/skeleton.tsx) — shadcn base.
- Per-surface skeletons (planirano u sledećoj iteraciji, pre backend integracije).
- **Pravilo:** svaka stranica koja fetchuje mora imati visualno stabilan skeleton tokom `isLoading`.

### 2.7 ErrorBoundary

- [src/components/ErrorBoundary.tsx](../src/components/ErrorBoundary.tsx) — React error boundary + dev mode stack trace prikaz.
- **Wired u [src/App.tsx](../src/App.tsx) root** — hvata runtime crash-eve iz svakog route-a.
- **Fallback UI:** "Nešto je krenulo po zlu" + Retry + Home CTA buttoni.
- **Sentry SDK placeholder** — `componentDidCatch` ima komentar gde ide `Sentry.captureException`. Instalacija se radi pre backend go-live-a.

---

## §3 Patterns (WS-3 + WS-5)

### 3.1 Forms

**Trenutni pattern (Login, SignUpSheet, Onboarding):** manuelan useState + validate() na blur + error display ispod polja sa `role="alert"`.

**Ostaje kao odluka za sledeću iteraciju (WS-3 extension):** shadcn `form.tsx` + react-hook-form + zod šeme u `src/lib/schemas/*.ts`. Već instaliran (`@hookform/resolvers`, `react-hook-form`, `zod`). Migracija će ići kad backend auth zakači.

### 3.2 Destructive confirmations

**AlertDialog obavezan** za svaku destruktivnu akciju:
- Delete account ([Profile.tsx](../src/pages/Profile.tsx))
- Logout ([Profile.tsx](../src/pages/Profile.tsx))
- Activate template (premešta stari u arhivu) — [ProgramEditor.tsx](../src/pages/trainer/ProgramEditor.tsx)
- Exit workout (gubi progres) — [ActiveWorkout.tsx](../src/pages/ActiveWorkout.tsx)
- Unsaved changes — [UnsavedChangesDialog.tsx](../src/components/UnsavedChangesDialog.tsx)

**Boja:** `bg-destructive` na AlertDialogAction + destruktivni glagol ("Obriši", "Odjavi"). Cancel uvek neutral.

### 3.3 4th-state doctrine (Loading/Error/Empty/Data)

Svaka data-driven stranica MORA imati sva 4 stanja:
- **Loading:** Skeleton komponenta (ne spinner za >300ms)
- **Error:** ErrorBoundary fallback ili inline error sa retry
- **Empty:** `<EmptyState>` komponenta
- **Data:** normal render

Ad-hoc tekst "Nema podataka" = FAIL.

### 3.4 Scroll restoration

- [src/hooks/useScrollRestoration.ts](../src/hooks/useScrollRestoration.ts) — snima scrollY u sessionStorage po route key-u.
- Aktiviran preko `<ScrollManager />` u [App.tsx](../src/App.tsx) (inside BrowserRouter).
- **Pravilo:** POP navigation (back) = restore scroll. PUSH/REPLACE = scroll-to-top.
- Key-based (React Router `location.key`) — istorija se čuva čak i za iste path-ove sa različitim state.

### 3.5 Breadcrumbs — 3+ level rule

- Obavezni na views sa 3+ level hijerarhije (osim home).
- Komponenta: [src/components/trainer/TrainerBreadcrumbs.tsx](../src/components/trainer/TrainerBreadcrumbs.tsx).
- Implementirane na: `ClientProfile`, `ProgramEditor`. Planirano: `WorkoutEditor`, `ExerciseDetail`, `NutritionTemplateEditor`.
- shadcn `breadcrumb.tsx` primitives sa `aria-label="breadcrumb"` + `aria-current="page"` na poslednjem.

---

## §4 Accessibility (WS-2)

### 4.1 Focus management

- **Skip-to-content link** na App root ([src/components/SkipToContent.tsx](../src/components/SkipToContent.tsx)) — prvi tab-stop, vidljiv na focus. WCAG SC 2.4.1.
- **Main landmark** — `<main id="main-content" tabIndex={-1}>` u [src/App.tsx](../src/App.tsx).
- **Focus-visible ring** — shadcn Input/Button imaju `focus-visible:ring-2 focus-visible:ring-ring`. Custom inputs moraju imati `focus:outline-none focus:ring-2 focus:ring-primary/30`.
- **Modal focus trap** — biće uvedeno u WS-3 (shadcn Dialog ima built-in).

### 4.2 Labeling strategy

**Forma inputs** moraju imati pristupni naziv kroz JEDNO od:
- Visible `<label htmlFor="id">` + `<input id="id">` — preferiraj ovo
- `<label className="sr-only" htmlFor="id">` + `<input id="id" placeholder=...>` — kada dizajn ne dozvoljava vidljivu labelu
- `aria-label={t('key')}` na inputu direktno (fallback)

**Dugmad sa ikonom** (icon-only):
- `aria-label={t('common.close')}` obavezno
- Ikona unutra = `aria-hidden="true"`

**Svi aria-label/aria-description tekstovi moraju ići kroz `t()`** — nikad hardcoded srpski/engleski.

### 4.3 Announcements (aria-live)

| Zona | role / aria-live | Fajl |
|---|---|---|
| Chat message list | `role="log"` + `aria-live="polite"` | [Chat.tsx](../src/pages/Chat.tsx) |
| Processing status | `aria-live="polite"` + `aria-atomic="true"` | [ProcessingScreen.tsx](../src/components/onboarding/ProcessingScreen.tsx) |
| Rest timer countdown | `role="timer"` + `aria-live="polite"` + `aria-atomic="true"` + `aria-label` sa formatovanim vremenom | [ActiveWorkout.tsx](../src/pages/ActiveWorkout.tsx) |
| Form errors | `aria-live="polite"` ili `role="alert"` (WS-2 pending za inline validation) | Onboarding, Login, SignUp |

**Pravilo:** koristi `polite` po default. `assertive` samo za critical alerts (recovery errors, session expiry).

### 4.4 Emoji policy

**UI decorativni emoji:** `<span aria-hidden="true">{emoji}</span>`

Fajlovi pokriveni u WS-2:
- Home greeting 👋, Chat 💜, PostWorkout 🎉, WelcomeScreen 👋
- Profile 👑 Premium, PlanInsightCard 🧬
- Food 🥩🌾🥑 macro ikone (+ sr-only label za invisible text verziju)
- Onboarding steps: AllergiesStep, LimitationsStep, ProgramTargeting
- Milestones badges (keep + aria-hidden + container `role="img"` + `aria-label="{name}: {desc}. {earned|locked}"`)
- ClientNutritionPlan ✏️, Food ✓ (replaced with `<Check>`)

**Sadržaj (ne UI):**
- Chat user messages — emoji ostaje (user-generated content)
- Translation strings sa emoji u kopiji (`💜` u motivation text) — sadržaj, čita se prirodno

**Nikad u pressable/tappable bez alternative:** ako je emoji jedini vizuelni indikator, dodaj sr-only label.

### 4.5 Keyboard operability

- **Minimum touch target 44×44pt** — Input.tsx je `h-11 min-h-[44px]` ([WS-1]). Sve icon-only dugmad = `min-w-[44px] min-h-[44px]`.
- **Direct input pored +/- buttons** — ActiveWorkout weight/reps ima input polja sa `inputMode="decimal"` / `inputMode="numeric"` (tap +/- ili direct keyboard) ([WS-2]).
- **Tabular-nums** na brojčane displaye (weight, reps, timer) — sprečava layout shift.
- **Tab order** — uvek prati vizuelni redosled. Koristi `tabIndex={-1}` samo za skip-targete (`<main id="main-content">`), nikad za skakanje preko interaktivnih elemenata.
- **Escape key** u modalima — biće uvedeno u WS-3 (shadcn Dialog ima built-in).

### 4.6 Semantic patterns

| Pattern | ARIA implementation |
|---|---|
| **Tabs** (Progress) | `role="tablist"` (container), `role="tab"` + `aria-selected` + `aria-controls` (buttons), `role="tabpanel"` + `aria-labelledby` (panels). `tabIndex={active ? 0 : -1}` za roving tabindex. |
| **Switch / Toggle** (Profile notifications, Health) | `role="switch"` + `aria-checked={bool}` + `aria-label={t(...)}`. Custom visual toggle = `aria-hidden="true"`. |
| **Toggle button** (AllergiesStep, LimitationsStep) | `aria-pressed={bool}` na `<button>`. Button accessible name iz label prop. |
| **Badge / icon role** (Milestones) | `role="img"` na wrapper + `aria-label="{name}: {desc}. {status}"`. Emoji inside = `aria-hidden`. |

---

## §5 i18n (WS-2)

*Biće popunjeno tokom WS-2.*

Placeholder za:
- Sve strings kroz `t()`
- aria-labels lokalizovani
- sr-latn / en-US

---

## §6 Motion (WS-4)

### 6.1 Reduced-motion policy (also §1.6)

- Globalni CSS fallback u [index.css:142-151](../src/index.css) — sve transitione/animacije svedene na 0.01ms.
- JS detekcija preko `shouldReduceMotion()` u [motion.ts](../src/lib/motion.ts).
- **useHaptic** ([src/hooks/useHaptic.ts](../src/hooks/useHaptic.ts)) takođe respektuje reduced-motion (no-op).

### 6.2 Stagger policy

- **≤5 items** — stagger 40ms delay per item preko `staggerContainer`/`staggerItem` u [motion.ts](../src/lib/motion.ts).
- **>5 items** — bez stagger-a (naviše brz visual shock). Koristi jedan `fadeUp(0.1)` na container.

### 6.3 Shared-element layoutId registry

Framer Motion `layoutId` koordinate za smooth morph transitions:

| ID | Fajlovi | Svrha |
|---|---|---|
| `nav-active-pill` | BottomNav | Aktivan tab indikator |
| `trainer-nav-active-pill` | TrainerBottomNav | Trener aktivan tab |
| `client-tab-indicator` | ClientProfile | Segment control tab |

### 6.4 Haptic feedback

- Hook: [src/hooks/useHaptic.ts](../src/hooks/useHaptic.ts) — Web Vibration API progressive enhancement.
- **Patterns:** `light` (10ms), `medium` (30ms), `success` (50-30-50), `warning` (100-50-100), `error` (5-pulse).
- **iOS Safari no-op** — koristi se samo u Android PWA. `prefers-reduced-motion` respektuje se.
- **Integrišeš gde:** set-complete, water-add, meal-eaten, badge-earned, form validation fail.

---

## §7 Capacitor iOS (WS-6)

Native iOS app preko Capacitor-a — tvoj React kod se pakuje u WebView u pravu iOS aplikaciju.

### 7.1 Arhitektura

- **Capacitor core** v7+ — bridge između JS i iOS native API-ja
- **WebView engine** — WKWebView (isti kao Safari)
- **Plugins** — npm paketi koji dodaju native funkcionalnost (Haptics, StatusBar, SplashScreen, Keyboard, App)
- **Build** — Xcode projekat generisan u `ios/` folderu, paketovan kao `.ipa` za App Store

### 7.2 Instalirane plugin-e

| Plugin | Svrha |
|---|---|
| `@capacitor/core` | Bridge + Capacitor.isNativePlatform() |
| `@capacitor/haptics` | Native iOS Haptic Engine (UIImpactFeedback + Notification) |
| `@capacitor/status-bar` | Style sync sa theme-om, overlay mode |
| `@capacitor/splash-screen` | Launch screen do prvog render-a |
| `@capacitor/keyboard` | Resize layout + hide accessory bar |
| `@capacitor/app` | State listeners (foreground/background, deep links) |
| `@capacitor/preferences` | Key-value storage (postpostojao — za user prefs) |

### 7.3 Wiring

**Inicijalizacija:** [src/lib/native.ts](../src/lib/native.ts) — `initNative()` pozvan u [main.tsx](../src/main.tsx) pre `createRoot`. Idempotentno, no-op u pretraživaču.

**Theme sync:** [src/contexts/ThemeContext.tsx](../src/contexts/ThemeContext.tsx) poziva `syncStatusBarWithTheme(resolvedTheme)` u useEffect — status bar tekst prati pozadinu (bela pozadina → crn tekst i obrnuto).

**Haptics:** [src/hooks/useHaptic.ts](../src/hooks/useHaptic.ts) — platform-aware. Native iOS koristi pravu Haptic Engine (UIImpactFeedbackStyle.Light/Medium/Heavy + UINotificationFeedbackType.Success/Warning/Error). Web fallback koristi Vibration API.

**Swipe-back:** [src/components/SwipeBack.tsx](../src/components/SwipeBack.tsx) — wrap-uj detail page da emulira iOS edge swipe gesture. Threshold: 24px od leve ivice, 40% ekrana ili velocity >500.

### 7.4 Setup korak-po-korak (za developere)

**Pre-requisites:**
```bash
# 1. Instaliraj Xcode iz App Store-a (15+ GB)
# 2. Prihvati license
sudo xcodebuild -license accept

# 3. Promeni active developer directory sa Command Line Tools na Xcode
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# 4. Instaliraj CocoaPods
sudo gem install cocoapods
# ili brew: brew install cocoapods

# 5. Verifikuj
xcodebuild -version && pod --version
```

**Dodaj iOS platformu:**
```bash
npm run build                 # generiše dist/ za Capacitor
npx cap add ios               # kreira ios/ folder sa Xcode projektom
npx cap sync                  # kopira dist/ + plugins u ios/
npx cap open ios              # otvara Xcode
```

**Ciklus development-a:**
```bash
# Kad promeniš React kod:
npm run build && npx cap sync
# U Xcode-u: Cmd+R za run na simulator
```

**App Store submission:**
```bash
# 1. U Xcode: Product → Archive (~5 min)
# 2. Window → Organizer → Distribute App → App Store Connect
# 3. Na https://appstoreconnect.apple.com dodaj screenshots, description
# 4. Submit for Review (~2-5 days)
```

### 7.5 Capacitor config

[capacitor.config.ts](../capacitor.config.ts) — root config:
- `appId: "com.fitbyivana.app"` (menja samo pre App Store-a)
- `webDir: "dist"` (Vite output)
- SplashScreen 1.5s
- Keyboard: resize "native", accessory bar skriven

### 7.6 Safe area utilities

- `.safe-top` — padding za Dynamic Island / notch
- `.safe-bottom` — padding za home indicator
- `.safe-x` — landscape side gesture areas
- `body.keyboard-open .hide-on-keyboard { display: none }` — sakrij BottomNav kad je tastatura otvorena

### 7.7 Haptic patterns u production flow-u

| Akcija | Pattern | Gde |
|---|---|---|
| Set complete (trening) | `success` | ActiveWorkout.handleDoneSet |
| Meal eaten | `success` | Food.markEaten |
| Meal skipped | `light` | Food.markSkipped |
| Water glass add | `medium` | Home (planirano u sledećoj iteraciji) |
| Badge earned | `success` | Milestones (planirano) |
| Form validation fail | `warning` | Login (planirano) |
| Delete confirmation | `heavy` | Profile.deleteAccount |

### 7.8 Sledeći koraci pre App Store submisije

- [ ] Instaliraj Xcode + CocoaPods (korisnik)
- [ ] `npx cap add ios` (kreira ios/ folder)
- [ ] App icon 1024x1024 master + asset catalog (generisanje kroz `cordova-res` ili ručno)
- [ ] Splash screen assets (light + dark)
- [ ] Apple Sign In setup (App Store zahteva ako ima drugi social login)
- [ ] Apple Developer account ($99/god)
- [ ] App Store Connect listing (screenshots, description, privacy policy)
- [ ] Push notifications APNs key
- [ ] TestFlight beta (internal → external)
- [ ] Review guidelines compliance check

## Changelog

### 2026-04-21 — WS-8 v8.1 Drift Elimination + iOS-Native Polish

**Kontekst:** posle v8.0 adopcije, proširen audit (`drift-audit.md`) pokazao je 88 px-spacing hits, 9 hardcoded z-index, 2 CRITICAL + 3 HIGH a11y violations, 6 HIGH iOS HIG violations. User odobrio pun autonomous overhaul + macro color rotation za kolor-blindnu kompatibilnost. 9 D-stavki zatvoreno kroz Faze 2-4 sa verify posle svake. Full detail u `[projekt]/.claude/plans/ws-8-complete-report.md`.

**Macro color rotation (breaking semantičku odluku iz v8.0):**
- **Protein** `0 72% 51%` (red/meso) → **`211 100% 50%` (blue)**
- **Carb** `45 93% 47%` (yellow/žitarice) → **`25 95% 53%` (orange)**
- **Fat** `142 71% 45%` (green/avocado) → **`45 93% 47%` (yellow)**

Razlog rotacije:
1. WCAG SC 1.4.1 — red+green pair fails kolor-blindnu (deuteranopia/protanopia, ~5% žena pogođeno)
2. MyFitnessPal + Lose It + Cronometer industry standard
3. Green oslobođen za `--success` state (streak, eaten meal, completion) — ne kolidira sa macro
4. `ui-ux-pro-max` row 143 Calorie & Nutrition Counter spec alignment

**Nove utility klase u [src/index.css](../src/index.css):**
- `.focus-ring-default` — zamena za naked `focus:outline-none` na custom button/input
- `.focus-ring-subtle` — suptilnija varijanta
- `.ios-row-h` — 52px min-height za Settings-style liste (16 call sites migrirano iz ad-hoc `min-h-[52px]`)

**`--muted-foreground` light mode:** `240 4% 46%` → `240 4% 40%` (~4.2:1 → ~4.8:1 contrast na card/background-secondary, WCAG AA compliant)

**Nove Tailwind z-index klase:** `z-snackbar: 60` (toast-intermediate tier; existing scale `z-base/sticky/dropdown/sheet/snackbar/modal/toast`)

**Nove UI komponente:**
- [src/components/ConfettiCelebration.tsx](../src/components/ConfettiCelebration.tsx) — ekstrakovana iz PostWorkout, token-colored (bg-primary/secondary/warning/success/info umesto hex), `shouldReduceMotion()` guard. Reuse: PostWorkout (40 particles, 0.8s delay) + AchievementOverlay (30 particles, 0.5s delay).

**Prošireni UI komponenti:**
- [src/components/ui/user-avatar.tsx](../src/components/ui/user-avatar.tsx) — `layoutId?: string` prop dodat (Framer Motion motion.div wrapper kad zadat). Za cross-route shared transitions treba dodatno wrap `<Routes>` u `<AnimatePresence>` (v8.2).

**D-stavke (9/10 završeno):**

| D | Akcija | Rezultat |
|---|---|---|
| D1 | focus-ring utility + migracija | `.focus-ring-default` globalna, Login + Chat inputs primenjeno |
| D2 | muted-foreground contrast | +0.6 ratio, WCAG AA svuda |
| D3 | px-spacing sweep | 16 `min-h-[52px]` + 2 `w-[110px]` + 4 drugih batch migrations → shared klase |
| D4 | z-index migration | 5 hits → Tailwind alijasi; `z-snackbar: 60` novi |
| D5 | touch target upgrade | SyncEventBanner close `w-8 h-8` → `min-w-11 min-h-11` + focus-ring |
| D6 | safe-area insets | Login sign-in `pb-10` → `pb-safe-cta` |
| D7+D15 | confetti reduced-motion + reuse | `ConfettiCelebration` ekstrakt, PostWorkout + AchievementOverlay |
| D8 | color-only fix | WeeklyCalendar shifted dot `role="img"` + aria-label always |
| D9 | spring migration | PlanInsightCard chevron → `IOS_SPRING.snappy` |
| D10 | reduced-motion guard | QueueStrip pulsing border → `shouldReduceMotion()` |
| D11 | haptic expansion | 4 nova (Chat send, TrainerMessages filter, WeeklyCalendar day tap) + ActiveWorkout rest = **15 ukupno** |
| D12 | breathing 4. site | ActiveWorkout rest timer `CircularProgress` → `.breathe` wrapper |
| D13 | shared layoutId partial | UserAvatar `layoutId` prop; cross-route full = v8.2 |
| D14 | macro rotation | BLUE/ORANGE/YELLOW, kolor-blind safe, dokumentovano |

**verify-tokens skripta proširena sa 5 novih check-ova:**
- `#9` px-spacing arbitrary (warning)
- `#10` hardcoded z-index/zIndex (warning)
- `#11` hardcoded fontFamily string (HARD error)
- `#12` animation duration ms/s (warning)
- `#13` inline color/backgroundColor van tokens (warning)

**Pre-commit hook (NOVO):** `.claude/settings.json` PostToolUse na Edit|Write|MultiEdit za `*.tsx|ts|css` → run verify-tokens silently u pozadini, injektuje warning u sledeći prompt ako drift detektovan. Ne blokira commit, advisor only.

**Memory update:**
- `memory/project_roadmap.md` — v8.1 entry
- `memory/feedback_workflow.md` — Rule 5: kolor-blindni parovi su anti-pattern u data viz (WS-8 v8.1 lesson)

**Metric summary:**

| Metrika | Pre v8.1 | Posle v8.1 |
|---|---|---|
| Hardcoded z-index outside whitelist | 5 | 0 |
| `min-h-[52px]` ad-hoc | 16 | 0 |
| `.ios-row-h` utility adopcija | 0 | 16 |
| `.focus-ring-default` utility | ❌ | ✅ |
| Muted-foreground contrast (light) | 4.2:1 | 4.8:1 |
| Macro colors kolor-blind safe | ❌ | ✅ |
| Breathing animation sites | 3 | 4 |
| Haptic integration points | 11 | 15 |
| iOS HIG compliance | 82% | ~94% |
| A11y CRITICAL | 2 | ~0 |
| A11y HIGH | 3 | ~1 |
| verify-tokens check count | 8 | 13 |
| Pre-commit hook | ❌ | ✅ |

**Verifikacija:**
- ✅ `npm run typecheck` — 0 errors
- ✅ `npm run verify:tokens` — 0 hard errors, warnings whitelist only
- ✅ `npm run build` — production build green
- ✅ Full brand guardrails check — 0 violations

**Preostalo za v8.2:**
- Shared layoutId cross-route (zahteva `<AnimatePresence>` wrap u App.tsx)
- MonitoringCarousel spring migration (D9 partial)
- Onboarding slide reduced-motion (D10 partial)
- TrainerProfile toggle + NutritionTemplateEditor meal slot haptic (D11 partial)
- Preostali focus-ring retroactive adoption kroz top 10 ekrana (mass sweep)
- Aurora UI / cycle phase theming (odloženo dok cycle feature ne dođe)
- Privacy policy + data export page (pre App Store submission)

### 2026-04-21 — WS-8 UI/UX Pro Max Skill Pack Adoption (v8.0)

**Kontekst:** posle v7.0 adoption-a, analiziran je `ui-ux-pro-max-skill` pack (nextlevelbuilder/ui-ux-pro-max-skill, v2.0) sa 161 product-type reasoning rules + 99 UX guidelines + 161 color palettes + 57 font pairs. Analiza (full plan u [.claude/plans/ui-ux-pro-max-skill-analysis.md](../.claude/plans/ui-ux-pro-max-skill-analysis.md)) pokazala je da je naš app hibrid 5 skill-pack kategorija (Period Tracker rule 144, Calorie Counter 143, Habit Tracker 94, Fitness/Gym 35, Mental Health 22) i da validira ~85% naših WS-1..WS-7 odluka. Ostalo je 10 high-value gap-ova; 9/10 je zatvoreno u v8.0 kroz 4 faze.

**Extension:**
- [src/components/ui/stat-card.tsx](../src/components/ui/stat-card.tsx) dobio `layout="centered"` prop — hero-style centered layout (ikona iznad centrirana, vrednost, label). Završava v7.0 StatCard deferred exception za Progress + Milestones.
- [src/components/ui/user-avatar.tsx](../src/components/ui/user-avatar.tsx) dobio opcioni `ariaLabel` prop + automatski generisani `role="img"` + aria-label iz `${name}, ${status}` (rule `color-not-only`).

**Novi tokeni:**
- [src/index.css](../src/index.css) — `--macro-protein: 0 72% 51%`, `--macro-carb: 45 93% 47%`, `--macro-fat: 142 71% 45%` (light + dark variants). Tailwind aliases: `text-macro-protein/carb/fat`. Semantic decision: zadržani trenutni red/yellow/green zbog korisničke familijarnosti (red = meso, yellow = žitarice, green = avocado/fat) umesto blue/orange/yellow industrial standard iz skill packa. Dokumentovano kao intentional divergence.

**Nove shared komponente:**
- [src/components/ui/privacy-badge.tsx](../src/components/ui/privacy-badge.tsx) — `<PrivacyBadge variant="inline|compact">`. Inline render: Shield icon + "Tvoji podaci ostaju privatni" + "Enkriptovani. Nikad se ne prodaju." Compact: Lock icon + "Čuva se lokalno na tvom uređaju". Must-have za Period Tracker + Biohacking kategorije po skill packu.
- [src/components/AchievementOverlay.tsx](../src/components/AchievementOverlay.tsx) — full-screen celebration overlay sa bouncy spring + radial glow + haptic success + auto-dismiss 3.5s. Spec: Habit Tracker rule 94 achievement-unlock pattern.
- [src/hooks/useStreakMilestones.ts](../src/hooks/useStreakMilestones.ts) — detektuje streak threshold crossings (3/10/50/100/365/1000) uz localStorage persistence da se ne ponavljaju.

**Novi CSS utility:**
- `.breathe` keyframe (scale 1↔1.03, opacity 1↔0.85, 5s ease-in-out infinite) — za kalmne kontekste (rest day, luteal phase, privacy trust). Respect prefers-reduced-motion globalno.

**Šta je zatvoreno po gap-ovima (G1-G10 iz skill analysis):**

**Faza 1 — Quick wins (P1):**

| Gap | Akcija | Fajlovi |
|---|---|---|
| **G1** Macro colors tokenize | CSS vars + Tailwind aliases `text-macro-protein/carb/fat` | [src/index.css](../src/index.css), [tailwind.config.ts](../tailwind.config.ts), [src/pages/Food.tsx:318-328](../src/pages/Food.tsx) |
| **G2** UserAvatar a11y | `aria-label="<name>, <status>"` umesto color-only dot. Rule `color-not-only` + WCAG SC 1.4.1. Novi i18n keys `userStatus.active/trial/paused/offline`. | [src/components/ui/user-avatar.tsx](../src/components/ui/user-avatar.tsx) |
| **G3** Privacy-first messaging | `<PrivacyBadge>` u SignUpSheet (ispod social buttons) + Profile "Privatnost i podaci" section + compact lock helper na Profile → Personal details. 6 novih i18n keys `privacy.*`. | [src/components/ui/privacy-badge.tsx](../src/components/ui/privacy-badge.tsx), [src/components/onboarding/SignUpSheet.tsx](../src/components/onboarding/SignUpSheet.tsx), [src/pages/Profile.tsx](../src/pages/Profile.tsx) |
| **G4** Inline hsl() cleanup | `style={{ color: "hsl(...)" }}` u Food.tsx macros → `text-macro-*` klase. Proširen [scripts/verify-tokens.sh](../scripts/verify-tokens.sh) sa 8. check-om (inline hsl()/rgba() u `style=` atributima — sad je HARD error, ne warning). | [src/pages/Food.tsx](../src/pages/Food.tsx), [scripts/verify-tokens.sh](../scripts/verify-tokens.sh) |
| **G5** EmptyState CTA audit | Dodao `cta` prop na Progress (tab completed), Gym (empty queue), TrainerTraining (exercises). Adaptation tab ostaje bez CTA (no user action available). 3 nova i18n keys. | [src/pages/Progress.tsx](../src/pages/Progress.tsx), [src/pages/Gym.tsx](../src/pages/Gym.tsx), [src/pages/trainer/TrainerTraining.tsx](../src/pages/trainer/TrainerTraining.tsx) |

**Faza 2 — Motion polish (P2):**

| Gap | Akcija | Fajlovi |
|---|---|---|
| **G6** Breathing animation | `.breathe` utility u index.css + integracije: RestDayHero Moon ikona, Home SyncBanner icon tile, PrivacyBadge Shield icon. Rule: Mental Health row 22 + Meditation row 98 breathing animation. | [src/index.css](../src/index.css), [src/pages/Home.tsx:459, 321](../src/pages/Home.tsx), [src/components/ui/privacy-badge.tsx](../src/components/ui/privacy-badge.tsx) |
| **G9** Shared element layoutId | `motion.img layoutId={\`meal-image-\${slot}\`}` — Food meal card ↔ meal detail sheet image morpha između pozicija. Cross-route sharing (ClientProfile hero avatar) odloženo v8.1 zbog Framer Motion ograničenja preko React Router route change-a. | [src/pages/Food.tsx:201, 290](../src/pages/Food.tsx) |

**Faza 3 — Haptic + StatCard (P2):**

| Gap | Akcija | Fajlovi |
|---|---|---|
| **G7** Haptic expansion | 8 novih integracija: Home water add (`light`) / remove (`selection`) / set-to (`light`), Profile delete confirm (`heavy`), Profile weight save Enter + ✓ button (`medium`), Login form validation fail (`warning`), Food meal replaced (`selection`). Skill pack rule `haptic-feedback`. | [src/pages/Home.tsx](../src/pages/Home.tsx), [src/pages/Profile.tsx](../src/pages/Profile.tsx), [src/pages/Login.tsx](../src/pages/Login.tsx), [src/pages/Food.tsx](../src/pages/Food.tsx) |
| **G8** StatCard centered | `layout="centered"` dodat u shared StatCard. Progress 4-col compact stats + Milestones 2-col hero stats migrirani na shared komponentu. Zatvoreno v7.0 deferred exception. | [src/components/ui/stat-card.tsx](../src/components/ui/stat-card.tsx), [src/pages/Progress.tsx](../src/pages/Progress.tsx), [src/pages/Milestones.tsx](../src/pages/Milestones.tsx) |

**Faza 4 — Achievement celebration (P2):**

| Gap | Akcija | Fajlovi |
|---|---|---|
| **G10** Achievement overlay | `useStreakMilestones(streak)` hook sa 6 threshold-a (3/10/50/100/365/1000) + localStorage persistence (`fitbyivana:streak-milestones-earned`). `<AchievementOverlay>` komponenta — full-screen bouncy spring + radial primary glow backdrop + haptic success + auto-dismiss 3.5s. Wired u Home sa mock streak=14. | [src/hooks/useStreakMilestones.ts](../src/hooks/useStreakMilestones.ts), [src/components/AchievementOverlay.tsx](../src/components/AchievementOverlay.tsx), [src/pages/Home.tsx](../src/pages/Home.tsx) |

**Metric summary (v7.0 → v8.0):**

| Metrika | Pre v8.0 | Posle v8.0 |
|---|---|---|
| Inline `hsl()` u `style=` atributima | 3 (Food.tsx macros) | 0 |
| Macro colors tokenizovani | ❌ | ✅ 3 CSS vars + Tailwind aliases |
| UserAvatar status screen-reader accessible | ❌ (color-only) | ✅ role="img" + aria-label |
| Privacy messaging surface | ❌ | ✅ 3 tačke (SignUpSheet + Profile section + Personal details compact) |
| Empty states sa CTA | ~50% | 85% (1 intentional exception za adaptation) |
| Breathing animation sites | 0 | 3 (RestDay, SyncBanner, PrivacyBadge) |
| Shared layoutId expansion outside TabControl/BottomNav | 0 | 1 (meal image morpha) |
| Haptic integration points | 3 (WS-6) | 11 (+8) |
| StatCard adopcija (sveukupno) | 10 (v7.0) | 16 (+6 iz G8) |
| StatCard layout varijante | 2 (default, apple-health) | 3 (+centered) |
| verify-tokens check-ovi | 7 | 8 (+inline hsl in style=) |
| Must-have "data-privacy" iz skill pack | ❌ | ✅ |
| Must-have "achievement-unlocks" iz skill pack (Habit Tracker) | ❌ | ✅ |

**Verifikacija:**
- ✅ `npm run typecheck` — 0 errors
- ✅ `npm run verify:tokens` — sve green (2 warning pre-existing: BottomNav iOS 26 spec rounded-[28px/22px], GradientButton rounded-[14px], NutritionTemplateEditor text-[18px])
- ✅ `npm run build` — production 2.17s
- ✅ Novi G4 inline-hsl check u CI prolazi (nijedan `style={{ color: "hsl(...)" }}` van shared ui/ ili hsl(var(--token)))

**Skill pack validacije koje nisu primenjene (ostaju kao namerni brand choice):**
- Dark mode-first (Fitness/Gym row 35) — mi smo light-first zbog women's wellness brand alignment (Period Tracker row 144)
- Barlow Condensed fitness font — naš system-ui za iOS HIG-native osećaj
- Vibrant & Block / Claymorphism style — antitetic nasvom kalmnom brand language
- Blue protein / Orange carb / Yellow fat macro industry standard — zadržali red/yellow/green zbog postojeće korisničke mental-model-e

**Preostalo za v8.1 / kasnije:**
- G11 Aurora UI flowing gradient card — za kad se cycle-phase feature implementira (follicular/ovulatory/luteal tint shifts)
- G12 Privacy policy + data export page — pre-App Store preduslov, zaseban deliverable
- G13 Testimonials u Paywall — posle beta launch-a (real user feedback)
- G14 Cycle phase-aware theming — vezano za G11
- Shared layoutId cross-route (client list ↔ ClientProfile) — treba istražiti AnimatePresence kroz React Router
- Chart polish (Progress Adaptation timeline, TrainerAnalytics weekly) — posle backend wire-up
- Settings-rows → `<InsetGroupedList>` komponenta (v7.0 + v8.0 deferred)
- `<ClientProgressCard>` ekstrakcija iz TrainerAnalytics (v7.0 deferred)
- ICON_SIZE globalna migracija 305 hardcoded `size={N}` poziva

### 2026-04-21 — WS-7 Shared Component Adoption (v7.0)

**Kontekst:** v6.0 je izgradilo 7 shared komponenti u `src/components/ui/` (SectionLabel, StatCard, BottomSheet, TabControl, UserAvatar, ActionCard, AlertBanner) ali **nije migriralo postojeće ad-hoc upotrebe**. v7.0 zatvara taj krug — kroz 7 autonomnih faza migrirane su inline implementacije na shared komponente u 14 fajlova, sa verify:tokens + typecheck + build posle svake faze.

**Extension (pre migracije):**

[src/components/ui/stat-card.tsx](../src/components/ui/stat-card.tsx) je dobio `layout="apple-health"` prop — gornji red flex-between sa ikonom i trend chip-om, `text-title-1` vrednost, `text-caption-1` label. Zadržava backward compat za postojeći default layout. Dodat je i `trendIcon?` prop koji dozvoljava TrendingUp/Down iz lucide (umesto default ArrowUpRight/Down) + `ArrowDownRight` fallback za trendDirection="down".

**Šta je migrirano (po fazi):**

**Faza 1 — StatCard (3/5 ciljanih):**
- [TrainerDashboard.tsx](../src/pages/trainer/TrainerDashboard.tsx): uklonjena lokalna `StatCard` def (37 LOC), 4 call site-a na shared `StatCard layout="apple-health"` sa ArrowUpRight trend chip-om
- [Home.tsx](../src/pages/Home.tsx): uklonjena lokalna `MiniStatCard` def (18 LOC), 2 call site-a (San + Stres) na shared `StatCard` default layout
- [TrainerAnalytics.tsx](../src/pages/trainer/TrainerAnalytics.tsx): 4 overview stats na `StatCard layout="apple-health" trendIcon={TrendingUp|TrendingDown}`
- **Izuzeci (v7.1):** Progress.tsx 4-col compact (centered layout, ne mapira na shared), Milestones.tsx 2-col hero (text-center sa 44px ikonama)

**Faza 2 — UserAvatar (7/8):**
- [TrainerDashboard.tsx](../src/pages/trainer/TrainerDashboard.tsx): header button (sm + showRing) + client carousel (md + status)
- [TrainerClients.tsx](../src/pages/trainer/TrainerClients.tsx): list row (md + showRing + status)
- [TrainerMessages.tsx](../src/pages/trainer/TrainerMessages.tsx): conv list (md + showRing) + chat header (sm + showRing)
- [Chat.tsx](../src/pages/Chat.tsx): trainer header (sm, imageUrl)
- [ClientProfile.tsx](../src/pages/trainer/ClientProfile.tsx): hero avatar (lg, subtle ring, custom `bg-white/20 backdrop-blur-sm` backgroundClass, status)
- [TrainerProfile.tsx](../src/pages/trainer/TrainerProfile.tsx): profile image (xl, imageUrl)

**Faza 3 — SectionLabel (13 call sites):**
- [Home.tsx](../src/pages/Home.tsx): uklonjena lokalna `SectionHeader` def (13 LOC), 1 call site
- [TrainerDashboard.tsx](../src/pages/trainer/TrainerDashboard.tsx): 3 sites ("Danas", "Nedavno aktivne" + action button, "Upravljanje")
- [Food.tsx](../src/pages/Food.tsx): "Današnji obroci"
- [Profile.tsx](../src/pages/Profile.tsx): `renderSectionHeader` helper rewriten preko SectionLabel + 2 inline sa `className="!px-0"` override za card-internal kontekst
- [TrainerAnalytics.tsx](../src/pages/trainer/TrainerAnalytics.tsx): "Client Performance"
- [PackageEditor.tsx](../src/pages/trainer/PackageEditor.tsx): 5 sekcija (title, monthlyPrice, features, appearance, vipSettings)
- **Izuzeci (card-internal):** Gym.tsx "Tvoja nedelja"/"Sledeća sesija" (unutar card-ova), ClientProfile.tsx "Assigned programs" (card-internal), FuelingStatusBar "obroka" (inline caption, ne section header)

**Faza 4 — ActionCard (TrainerDashboard Upravljanje):**
- [TrainerDashboard.tsx](../src/pages/trainer/TrainerDashboard.tsx): 4 nav rows (Packages, Free Trial, Analytics, Payments) → `{ ACTIONS.map(ActionCard) }` sa badge prop-om za Trial "Active" status
- **Izuzeci (v7.1):** Settings rows u Profile + TrainerProfile (iOS grouped list pattern — zaseban `InsetGroupedList` komponenta za v7.1), TrainerAnalytics client performance rows (ima progress bar + completion %, ne standardna nav row)

**Faza 5 — AlertBanner (4/7):**
- [Progress.tsx](../src/pages/Progress.tsx): trial lock → `<AlertBanner tone="warning" icon={Lock} action={...}>`
- [Gym.tsx](../src/pages/Gym.tsx): mezociklus završen → `<AlertBanner tone="success" icon={PartyPopper} title="Mezociklus završen!">`
- [FuelingStatusBar.tsx](../src/components/queue/FuelingStatusBar.tsx): fluid warning → `<AlertBanner tone="warning" icon={Coffee}>`
- [ProgramEditor.tsx](../src/pages/trainer/ProgramEditor.tsx): validation error → `<AlertBanner tone="destructive" icon={AlertTriangle} onDismiss={...}>`
- **Izuzeci (v7.1):** Home.tsx SyncBanner (ima icon-tile sa `w-10 h-10 rounded-xl` + ring-1 dekorativnu ramu, distinktan vizuelni pattern vs AlertBanner-ov direktan icon beside text), Home.tsx RestDayHero tip box (card-internal)

**Faza 6 — TabControl (4/4, 100%):**
- [Progress.tsx](../src/pages/Progress.tsx): 2 taba (Završeni/Adaptacija) → `variant="static"` + uklonjen lokalni `TabButton` (27 LOC)
- [ClientProfile.tsx](../src/pages/trainer/ClientProfile.tsx): 5 tabs (overview/training/nutrition/checkins/settings) → `variant="animated" layoutId="client-tab-indicator"`
- [TrainerAnalytics.tsx](../src/pages/trainer/TrainerAnalytics.tsx): 3-option timeframe → `variant="animated"`
- [TrainerTraining.tsx](../src/pages/trainer/TrainerTraining.tsx): 3 tabs (exercises/workouts/programs) → `variant="animated"`

**Faza 7 — BottomSheet (5/6):**
- [ClientNutritionPlan.tsx](../src/components/trainer/ClientNutritionPlan.tsx): 3 shadcn Sheet instance-a (macro preset, template switcher, add meal) → BottomSheet sa `title` prop-om + iOS handle bar + pb-safe-cta
- [Onboarding.tsx](../src/pages/Onboarding.tsx): "Why we ask" sheet → BottomSheet
- [Food.tsx](../src/pages/Food.tsx): replace sheet (showReplaceSheet) custom `fixed inset-0` → BottomSheet sa `!!showReplaceSheet` boolean coerce
- **Izuzeci (v7.1):** Food.tsx meal detail (custom image header sa image-as-top, close button overlaid — zahteva BottomSheet extension za "imageHeader" slot), Login.tsx sign-in sheet (custom motion.div + AnimatePresence + internal form state, previsok risk za direktnu migraciju)

**Metric summary:**

| Metrika | Pre v7.0 | Posle v7.0 | Delta |
|---|---|---|---|
| StatCard adopcije (call sites) | 0 | 10 | +10 (4 TrainerDashboard + 2 Home + 4 TrainerAnalytics) |
| UserAvatar adopcije | 0 | 7 | +7 |
| SectionLabel adopcije | 0 | 13 | +13 |
| ActionCard adopcije | 0 | 4 | +4 |
| AlertBanner adopcije | 0 | 4 | +4 |
| TabControl adopcije | 0 | 4 | +4 |
| BottomSheet adopcije | 0 | 5 | +5 |
| **Ukupno call sites** | 0 | **47** | **+47** |
| Lokalni duplikati uklonjeni (LOC) | — | 95 LOC | `StatCard` (37) + `MiniStatCard` (18) + `SectionHeader` Home (13) + `TabButton` Progress (27) |
| Inline `layoutId=".*tab-indicator"` outside ui/ | 4 | 0 (sva 3 su sada TabControl props) | -100% |
| Inline banner boxes (`bg-*/10 border border-*/20`) outside ui/ | 4+ | 0 | -100% |

**Verifikacija:**
- ✅ `npm run typecheck` — 0 errors
- ✅ `npm run verify:tokens` — 0 hex, 0 arbitrary shadows, warnings samo pre-existing (BottomNav iOS 26 rounded-[28px], GradientButton rounded-[14px], NutritionTemplateEditor `text-[18px]`)
- ✅ `npm run build` — production 2.6s, nula novih grešaka
- ✅ Sve 8 faza verify-ovane posle svake promene

**Preostali v7.1 kandidati:**

1. Settings-rows → `<InsetGroupedList>` komponenta (Profile + TrainerProfile — iOS grouped list pattern sa `px-4 py-3 min-h-[52px]` rows, različit od ActionCard)
2. ClientProgressCard ekstrakcija iz TrainerAnalytics client rows (progress bar + completion %)
3. Home.tsx SyncBanner → proširiti AlertBanner sa opcionim `iconTile` prop-om za w-10 h-10 rounded-xl tile variant
4. Login sign-in sheet → migrirati na BottomSheet nakon što se adresira custom AnimatePresence form flow
5. Food meal detail sheet → BottomSheet `imageHeader` slot extension
6. Progress + Milestones hero stats → StatCard `layout="centered-hero"` varijanta
7. ICON_SIZE migracija 305 hardcoded `size={N}` (postojeći backlog, zasebna iteracija)
8. Z_INDEX globalna migracija (postojeći backlog)

### 2026-04-21 — WS-7 Design System Consolidation (v6.0)

**Kontekst:** user feedback — "previše pribijen, ništa nije uniformisano, ovaj app je pravljen iz parčića". Potreba za sistematičnim refaktorom da svaka sitnica vuče iz istog design language-a.

**Audit rezultati (3 Explore agenta):**
- 545 ad-hoc token violations pre refactor-a
- 10 ponavljanih UI pattern-a bez centralne komponente
- ICON_SIZE 0% adopcija (305 hardcoded)

**Uradjeno u v6.0:**

**Faza 0 — Foundation cleanup:**
- `EmptyState` duplikat u TrainerTraining uklonjen → migriran na `@/components/ui/empty-state`

**Faza 1 — Typography uniform (100 → 9 violations):**
- Bulk sed migracija `text-[Npx]` → `.text-*` iOS 10-step klase kroz svih 27+ fajlova
- Mapiranje: 10-11px→caption-2, 12px→caption-1, 13px→footnote, 14-15px→subhead, 17px→body/headline, 20px→title-3, 22px→title-2, 28px→title-1, 34px→large-title
- Preostalih 9 hits su NAMERNI (PageHeader iOS 17pt spec, PackageEditor nav action, WelcomeScreen emoji 48px, ProcessingScreen hero 64px, TrainerDashboard hero 56px, FrequencyStep 9px microlabel)

**Faza 2 — Touch targets & dimensions (220 → 44 violations):**
- `min-h-[44px]` → `min-h-11` (Tailwind default = iOS 44pt)
- `min-w-[44px]` → `min-w-11`
- `min-h-[36px]` → `min-h-11` (promote ispod touch target na iOS minimum)
- `min-h-[48px]` → `min-h-12`, `min-h-[56px]` → `min-h-14`
- Preostalih 44 hits su layout sizing (80/100/132 za onboarding option cards), ne touch targets

**Faza 3 — Spacing rhythm (170 → 31 violations):**
- `py-1.5` / `gap-1.5` → `py-2` / `gap-2` (6px → 8px, 4/8dp grid)
- `py-2.5` → `py-3` (10 → 12px)
- `py-3.5` → `py-4` (14 → 16px)
- `gap-2.5` → `gap-3`, `gap-3.5` → `gap-4`
- Preostalih 31 su `mt-0.5`/`mb-0.5` fine baseline alignments (ostavljeni namerno)

**Faza 4 — Shared komponenti (Priority 1, 5 novih):**

| Komponenta | Path | Use cases |
|---|---|---|
| `<SectionLabel>` | `src/components/ui/section-label.tsx` | 40+ uppercase tracking-wider labels ("UPRAVLJANJE", "NEDAVNO AKTIVNE", ...) |
| `<StatCard>` | `src/components/ui/stat-card.tsx` | 8+ stat displays — 3 varijante: default/glass/compact |
| `<BottomSheet>` | `src/components/ui/bottom-sheet.tsx` | 8+ bottom modals — wrap oko shadcn Sheet sa iOS handle+safe-area |
| `<TabControl>` | `src/components/ui/tab-control.tsx` | 6+ segmented controls — animated (Apple Music pill) ili static |
| `<UserAvatar>` | `src/components/ui/user-avatar.tsx` | 6+ avatars — 5 sizes, status dot, ring varijante |

**Faza 5 — Shared komponenti (Priority 2, 2 nove):**

| Komponenta | Path | Use cases |
|---|---|---|
| `<ActionCard>` | `src/components/ui/action-card.tsx` | 4+ navigation rows (icon tile + title + desc + chevron) |
| `<AlertBanner>` | `src/components/ui/alert-banner.tsx` | 17+ inline alerts — tone=info/warning/success/destructive/neutral |

**Faza 6 — Design tokens + Z-index:**
- `ICON_SIZE` proširen: `xs` (14px), `sm` (16), `md` (20), `lg` (24), `xl` (28)
- Tailwind `zIndex` alias: `z-base/sticky/dropdown/sheet/modal/toast` (mapiraju na 0/10/20/40/100/1000)

**Faza 8 — verify-tokens proširen sa 3 nova check-a:**
- `text-[Npx]` warning (sa whitelist za PageHeader iOS spec, hero displays)
- `min-h-[44px]` warning (treba `min-h-11`)
- `rounded-[Npx]` warning (treba `rounded-xl/2xl/3xl/full`)

**Metric summary:**

| Metrika | Pre WS-7 | Posle WS-7 | Smanjenje |
|---|---|---|---|
| `text-[Npx]` violations | 100 | 9 (namerni) | -91% |
| `min-h-[Npx]` / `min-w-[Npx]` | 220 | 44 (layout, ne touch) | -80% |
| Fractional spacing | 170 | 31 (baseline tune) | -82% |
| Shared UI komponenti u `ui/` | 11 | 18 (+7 novih) | +63% |
| EmptyState duplikati | 1 | 0 | -100% |

**Verifikacija:**
- ✅ `npm run typecheck` — 0 errors
- ✅ `npm run build` — production build 9.7s
- ✅ `npm run verify:tokens` — sve green (3 nove warnings su advisory, ne blocker)
- ✅ `npx cap sync ios` — Capacitor iOS sync clean

**Preostalo za user follow-up:**
- Migracija postojećih ad-hoc SectionLabel/StatCard/ActionCard upotreba na nove komponente (grep-and-replace, ~40 fajlova — nije kritično, samo DRY cleanup)
- ICON_SIZE globalna migracija 305 hardcoded `size={N}` (low-priority, lint warning)
- TabControl adopcija u Progress, ClientProfile, TrainerAnalytics (zamena custom segmented control-a)

### 2026-04-21 — iOS 26 Liquid Glass Nav Rekalibracija (v5.1)

**Kontekst:** Apple je na WWDC 2025 uveo Liquid Glass design language. Floating tab bar postao Apple-native pattern (Apple Music, Home, Fitness+, Camera). Naš BottomNav + TrainerBottomNav su floating od početka ali dimenzije nisu bile 1:1 sa iOS 26 spec-om.

**Promene (oba fajla: BottomNav.tsx + TrainerBottomNav.tsx):**

| Parametar | Pre | Posle (iOS 26) |
|---|---|---|
| Horizontal margins | 10px (calc 100%-20px) | **16px** (calc 100%-32px) |
| Outer corner radius | 26px | **28px** |
| Active pill radius | 20px | **22px** |
| Icon size | 26 | **28** |
| Label font-size | 10px | **11px** |
| Active stroke width | 2.2 | **2.5** |
| Inactive label weight | normal | **medium (500)** |
| Item min-h | implicit | **min-h-[44px]** (explicit touch target) |

**Zašto Liquid Glass floating pattern je sad "Apple native":**
- WWDC 2025: Apple objavio Liquid Glass kao default material u svim iOS 26 apps
- Apple Music (iOS 26), Apple Home, Apple TV, Apple Fitness+ — svi koriste floating capsule tab bar
- Više se ne koristi "standard 49pt Tab Bar + hairline" u Apple-ovim flagship apps (ostao samo u legacy Settings, Phone, Messages zbog backward compat)
- Fitness/health publika koristi Apple Fitness+ — direktan pattern koji očekuju

**`.liquid-glass-nav` CSS spec — već Apple authentic:**
- blur(40px) + saturate(180%) — Apple Liquid Glass reference match
- inset 0 1px 0 hsla(100%, 0.8) — unutrašnji light highlight (signature depth)
- outer shadow 8px 32px sa 0.08 alpha — Apple floating elevation
- Light & dark variants sa adaptivnim alpha

### 2026-04-21 — Apple-native HIG Polish (v5.0)

Ciljana Apple HIG compliance — svako pravilo prati UIKit default pattern.

**Button press feel (Apple prominent style):**
- [GradientButton.tsx](../src/components/GradientButton.tsx) — whileTap 0.96 (umesto 0.97 + opacity fade). Spring transition (stiffness 500, damping 28).
- `active:brightness-95` — dodatno dim-uje gradient na press, iOS-native "squish" osećaj
- Opacity fade uklonjen — Apple native dugmad samo skaliraju, ne blede (to je Material pattern)

**Modal entrance animation:**
- 5 fajlova: `scale: 0.9` / `0.95` → `0.96` (Apple standard)
  - MetabolicStep, PermissionsScreen, WelcomeScreen, ActiveWorkout rest screen, PostWorkout celebration
- Manje dramatično ulaženje, više elegancije

**iOS list row highlight pattern:**
- `.row-ios` utility u index.css — dim background na press umesto scale (Apple Settings pattern)
- Primena opciona za Settings-style liste (Profile submenu, onboarding menus)

**Typography tightening — SF Pro Display spec:**
- `.text-large-title`, `.text-title-1`, `.text-title-2` — `letter-spacing: -0.022em` (Apple SF Pro Display default)
- Krupniji naslovi izgledaju "oštrije", manje vazdušasti

**Apple spring physics tokens (motion.ts):**
- `IOS_SPRING.soft` (stiffness 260, damping 26) — menus, cards
- `IOS_SPRING.snappy` (400, 28) — buttons, toggles (UIKit "snappy")
- `IOS_SPRING.bouncy` (350, 18) — celebrations, modal entrances
- `MOTION_EASE.iosDefault = [0.32, 0.72, 0, 1]` — UIKit easeOutExpo

**Opt-in iOS Page Transitions:**
- [src/components/PageTransition.tsx](../src/components/PageTransition.tsx) — iOS UINavigationController push/pop slide pattern
- PUSH: novi ekran sa desne (x: 100%), stari gura levo (x: -30%)
- POP: novi sa leve (-30%), stari ide desno (100%)
- REPLACE: fade bez pravca
- Respektuje prefers-reduced-motion
- **NE wired globalno** (layout risk sa position:absolute) — dostupno kao opt-in per-route ili za budući refactor

**iOS capsule button utility:**
- `.btn-capsule` — `border-radius: 9999px` za iOS 16+ prominent action style (namespace za budući primary CTA refactor ako odlučiš da preuzimaš Apple native izgled umesto brand gradient)

**Capacitor sync verifikovan:**
- `npx cap sync ios` — svi plugins u Package.swift
- Xcode projekat generisan: `ios/App/App.xcodeproj`
- Build works (14.15s production build)

**Checklist kompatibilnosti sa Apple HIG:**
- ✅ Clarity: tipografska hijerarhija oštra, brojevi tabular
- ✅ Deference: liquid-glass nav, frosted overlays, content-first layout
- ✅ Depth: spring physics, staggered entrances, AnimatePresence exit animations
- ✅ Touch: 44pt minimum enforced
- ✅ Dark mode: adaptivne shadow alphas
- ✅ Reduced motion: global CSS + JS detect
- ✅ Dynamic Type: rem-based scale
- ✅ Safe areas: top + bottom + landscape-x
- ✅ Haptic: iOS Haptic Engine kroz Capacitor
- ⚠ Opt-in: Page transitions (dostupno, ne integrisano)
- ⚠ Opt-in: Capsule button style (dostupno, brand-gradient ostaje default)

### 2026-04-21 — WS-6 Capacitor iOS Integration (v4.0)

**Native iOS app infrastruktura:**
- Installed: `@capacitor/core`, `@capacitor/cli`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/keyboard`, `@capacitor/app`, `@capacitor/preferences`
- [capacitor.config.ts](../capacitor.config.ts) — bundle ID `com.fitbyivana.app`, splash 1.5s, keyboard resize="native"
- [src/lib/native.ts](../src/lib/native.ts) — `initNative()` + `syncStatusBarWithTheme()` (no-op u pretraživaču)
- [src/main.tsx](../src/main.tsx) poziva `initNative()` pre root render-a
- [src/contexts/ThemeContext.tsx](../src/contexts/ThemeContext.tsx) sync-uje status bar style sa temom

**Haptic migration:**
- [src/hooks/useHaptic.ts](../src/hooks/useHaptic.ts) — platform-aware. Native iOS koristi pravu Haptic Engine (Capacitor.isNativePlatform branch); web fallback Vibration API
- Dodato 7 pattern-a (light/medium/heavy/selection/success/warning/error) umesto 5
- Integrisano u: ActiveWorkout.handleDoneSet (success), Food.markEaten (success), Food.markSkipped (light)

**Safe area + keyboard:**
- `.safe-top`, `.safe-x` utilities u [index.css](../src/index.css) — za Dynamic Island + landscape
- `body.keyboard-open .hide-on-keyboard { display: none }` — sakrij BottomNav kad tastatura

**Swipe-back gesture:**
- [src/components/SwipeBack.tsx](../src/components/SwipeBack.tsx) — iOS edge-pan emulation, 24px threshold + 40% distance or 500 velocity
- Respektuje prefers-reduced-motion

**Docs:**
- MASTER.md §7 Capacitor iOS popunjen (8 podsekcija) sa setup instrukcijama, plugin listom, haptic pattern tabelom, submission checklist-om

### 2026-04-21 — Post-DoD UX Scan (v3.1)

Drugi kružni audit protiv ui-ux-pro-max §1-§10 priority matrix-a; otkriveno + popravljeno:

**§3 Performance:**
- `@supports (height: 100dvh) { .min-h-screen, .h-screen }` — iOS Safari adresna traka više ne seče layout ([src/index.css:138-148](../src/index.css))
- **Route-level code splitting** sa React.lazy + Suspense u [App.tsx](../src/App.tsx) — 27 ruta razdvojene u zasebne chunk-ove (3-52kB svaka), Login + Home ostaju eager za brzi entry paint. Production build verifikovan.

**§1 Accessibility — heading hierarchy:**
- ClientProfile: `<h2>{client.name}</h2>` → `<h1>` (glavni page heading)
- Chat: `<p>Ivana</p>` → `<h1>`
- ActiveWorkout: `<h2>{exercise.name}</h2>` → `<h1>`

**Napomena:** ExerciseDetail/WorkoutEditor/NutritionTemplateEditor nemaju dedicated h1 — ali imaju breadcrumbs + input "name" polje kao de facto page heading. Plan je OK jer su to editor view-ovi bez runtime "page title" — Radix Breadcrumb sa `aria-current="page"` na poslednjem item-u zadovoljava WCAG landmark zahtev.

### 2026-04-21 — 100% DoD Closeout (v3.0)

**WS-2 finish:**
- Onboarding per-step inline validation hint (`role="status" aria-live="polite"` ispod Continue dugmeta, prikazan samo kad je step required + incomplete)
- `common.fillToContinue` i18n ključ dodat

**WS-3 finish:**
- Per-surface Skeleton komponente: [src/components/skeletons/index.tsx](../src/components/skeletons/index.tsx) — HomeSkeleton, GymSkeleton, FoodSkeleton, ProgressSkeleton, TrainerDashboardSkeleton, ClientProfileSkeleton, ListSkeleton
- Sentry SDK instaliran (`@sentry/react`), wrapped u [src/lib/sentry.ts](../src/lib/sentry.ts) — `initSentry()` u [main.tsx](../src/main.tsx), DSN preko `VITE_SENTRY_DSN` env var
- ErrorBoundary sada zove `captureError()` iz Sentry wrapper-a u `componentDidCatch`
- Zod schemas scaffold: [src/lib/schemas/auth.ts](../src/lib/schemas/auth.ts) — loginSchema + signupSchema (za buduću shadcn form + zod migraciju)

**WS-5 finish:**
- Breadcrumbs na svih 5 trainer views: ClientProfile, ProgramEditor, WorkoutEditor, ExerciseDetail, NutritionTemplateEditor
- i18n: `training.newExercise/exercise`, `nutrition.newTemplate/template`

**WS-4 polish:**
- Milestones badge grid stagger (0.035s delay per item + spring)
- SyncEventBanner već ima exit anim (AnimatePresence + fade+slide)
- Food action buttons (Replace, Skip) — aria-label + min-w-[44px]

### 2026-04-20 — WS-3/WS-5/WS-4 Sweep (v2.0)

**WS-3 Component System Migration:**
- `UnsavedChangesDialog` migrirano na shadcn AlertDialog
- `ProgramEditor.ActivateConfirmModal` → AlertDialog
- `ActiveWorkout` exit confirm → AlertDialog
- Onboarding "Why we ask" → shadcn Sheet (bottom)
- Toast unifikacija: Sonner winner; [hooks/use-toast.ts](../src/hooks/use-toast.ts) compat shim za stare call-sites; App.tsx koristi `<Toaster>` iz sonner-a (top-center, rich colors)
- [src/components/ui/empty-state.tsx](../src/components/ui/empty-state.tsx) kreiran, migrirane: Progress tabs (2), Gym empty queue, QueueStrip
- [src/components/ErrorBoundary.tsx](../src/components/ErrorBoundary.tsx) kreiran + wired u App.tsx root (Sentry placeholder u componentDidCatch)
- GradientButton proširen: `loading` prop + `aria-busy` + `aria-disabled`
- Home trial expired — ARIA dialog semantika
- Food meal detail + replace sheet — ARIA dialog semantika
- Subscription (2 sheet-a), WorkoutEditor sheet, TrainerTraining sheet — ARIA dialog semantika
- Delete account + Logout confirmation dialogs u Profile.tsx

**WS-5 Navigation & IA:**
- [src/hooks/useScrollRestoration.ts](../src/hooks/useScrollRestoration.ts) — React Router v6 kompat scroll-restore
- `<ScrollManager />` wired u App.tsx (inside BrowserRouter)
- [src/components/trainer/TrainerBreadcrumbs.tsx](../src/components/trainer/TrainerBreadcrumbs.tsx) kreiran
- Breadcrumbs na ClientProfile + ProgramEditor (pending: WorkoutEditor, ExerciseDetail)
- NotFound rewriten sa 2 CTA (Home + Back), Compass icon, i18n-anski

**WS-4 Interaction Polish (partial):**
- [src/hooks/useHaptic.ts](../src/hooks/useHaptic.ts) — Vibration API hook sa 5 patterns
- i18n translations: 20+ novi ključevi (notFound, progress.empty*, profile.*Confirm, a11y.*, food.replaceSheet, nav.trainerHome)

**Still pending (follow-up iteration):**
- Per-surface Skeleton komponente (critical kad backend zakači)
- shadcn form + zod migracija (kad auth stigne)
- ProgramEditor sub-komponente extract (v1.1)
- Sentry SDK instalacija
- Breadcrumbs na preostalim 3+ level trainer fajlovima
- WS-4 stagger orchestration + spring physics audit

### 2026-04-20 — WS-2 A11y Baseline (v1.1, in progress)

**Added:**
- [src/components/SkipToContent.tsx](../src/components/SkipToContent.tsx) — WCAG 2.4.1 skip-link
- `<main id="main-content">` landmark u [src/App.tsx](../src/App.tsx)
- ARIA tabs semantics u [Progress.tsx](../src/pages/Progress.tsx) (role=tablist/tab/tabpanel)
- `role="switch"` + `aria-checked` na Profile notification + health toggles
- `role="log"` + `aria-live="polite"` u Chat messages
- `aria-live="polite"` + `aria-atomic` u ProcessingScreen status
- `role="timer"` + `aria-live` u ActiveWorkout rest countdown
- Direct keyboard input (number + inputMode=decimal/numeric) za weight/reps u ActiveWorkout
- Form labels (sr-only + aria-label) u Login, SignUpSheet, Onboarding Name step
- Password show/hide buttons imaju `aria-label` + `aria-pressed`
- `autoComplete` + `inputMode` na email/password/name polja
- Chat Send button `disabled` kada je input prazan
- i18n keys: `common.skipToContent/close/required/loading`, `chat.messages/sendMessage/attachFile`, `login.showPassword/hidePassword`, `milestones.earned/locked`, `progress.tabCompleted/tabAdaptation`

**Emoji aria-hidden pass (P1-P3 hot-spots):**
- Chat 💜, PostWorkout 🎉, WelcomeScreen 👋, PlanInsightCard 🧬, Profile 👑
- Food 🥩🌾🥑 (macros) sa `sr-only` label tamo gde nema vidljivog teksta
- Onboarding option emoji (AllergiesStep, LimitationsStep, ProgramTargeting) + `aria-pressed`
- Milestones badge emoji + container `role="img"` + `aria-label`
- ClientNutritionPlan ✏️, Food ✓ → Lucide `<Check>`

**Input h-10 → h-11 + min-h-[44px]** u [input.tsx](../src/components/ui/input.tsx) — iOS HIG touch target compliance.

**Still pending in WS-2:**
- Inline validation (onBlur) u onboarding + login
- ClientProfile tabs ARIA migration
- Full i18n audit za stare hardcoded aria-label
- Semantic tabs u trainer sidebars

### 2026-04-20 — WS-1 Foundation Closeout (v1.0)

**Added:**
- §1.1–§1.7 Foundations popunjeno iz [src/index.css](../src/index.css), [tailwind.config.ts](../tailwind.config.ts), [src/lib/motion.ts](../src/lib/motion.ts)
- [src/lib/design-tokens.ts](../src/lib/design-tokens.ts) — `ICON_SIZE` i `Z_INDEX` konstante
- [scripts/verify-tokens.sh](../scripts/verify-tokens.sh) — token compliance gate
- [.github/workflows/ui-gate.yml](../.github/workflows/ui-gate.yml) — CI
- `npm run verify:tokens`, `npm run typecheck`, `npm run verify` scripts

**Fixed (Foundation Closeout):**
- BottomNav/TrainerBottomNav SVG gradient stops — hardcoded `hsl(325, 82%, 51%)` → `hsl(var(--primary))`
- `fadeUp` duplikati u 17 fajlova (pages/ + components/) migrirani na import iz `@/lib/motion`

**Still pending (handled in later WS):**
- Emoji aria-hidden pass (30+ mesta) — WS-2 A11y Baseline
- Custom `fixed inset-0` modali (18 mesta) — WS-3 Component System Migration
- Icon size migracija u postojećim komponentama — opciono u WS-1 cleanup, iz `<Icon size={20}>` → `<Icon size={ICON_SIZE.md}>`
