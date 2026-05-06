# WS-8.5 Shell Layer Audit

**Datum:** 2026-04-21
**Scope:** inventar navigation shell pattern-a svih 33 screen komponenti pre refactor-a na unified iOS NavBar
**Live dev server preview:** 4 screena capture-ovana (Home, ClientProfile, TrainerPackages, TrainerProfile, Milestones)
**Trigger:** user screenshots pokazuju breadcrumb na ClientProfile (web pattern), "< Back" plain text (ne iOS-native), raw Postgres UUID error u UI

---

## 1. Ključni nalazi iz screenshot-a

### 1.1 CRITICAL violations

**A. ClientProfile `trainer/client/1` — tri-layer navigation chaos:**
- Layer 1: `PageHeader` sa `< Clients` + "Sarah John..." (truncated) — iOS-native OK pattern
- Layer 2: `TrainerBreadcrumbs` sa "Trainer › Clients › Sarah Johnson" ispod PageHeader-a — **WEB pattern, redundantno**
- Layer 3: gradient hero card sa avatar-om + "Sarah Johnson" + "Active" + streak — brand moment (OK da ostane **unutar content area**, ne u shell-u)
- **Problem:** breadcrumb je `role="navigation"` web anti-pattern na iOS; duplira info koji back button već nosi

**B. Raw Postgres UUID error u UI:**
- `src/components/queue/ClientUserStatusPanel.tsx:62` render-uje `Greška: getClientStatusByTrainer(1) failed: invalid input syntax for UUID...`
- Visible u Overview tab panel-u ClientProfile screen-a
- Jedan direct hit — ovo je **primary leakage** koji je user flagged

**C. Secondary leakage:**
- `src/pages/trainer/ProgramEditor.tsx:229-234` — `{error}` raw string u AlertBanner (trainer-facing, lower priority ali same anti-pattern)

### 1.2 HIGH severity — "Back" literal umesto contextual label

Ekrani koji su pokriveni live screenshot-om i imaju `< Back` plain text (trebalo bi iOS-native named parent):

| Screen | Trenutno | iOS-native trebalo bi |
|---|---|---|
| **TrainerPackages** | `< Back` | `< Trainer` (parent = TrainerDashboard) |
| **TrainerProfile** | `< Back` | `< Menu` (ili `< Trainer`) |
| **Milestones** | `< Back` | `< Home` (parent je Home) |
| **PackageEditor** | (ne-snimljeno, isti pattern) | `< Packages` |
| ~13 drugih screen-ova koji koriste `<PageHeader onBack={() => navigate(-1)} />` bez `backLabel` prop-a | svi → `< Back` | treba contextual |

**Root cause:** `src/components/PageHeader.tsx:52` default je `t("common.back")` = "Back"/"Nazad"; call sites ne prosleđuju `backLabel` prop.

### 1.3 HIGH severity — truncated titles

Screenshoti pokazuju:
- "Sarah John..." (ClientProfile) — client name truncated na sred reči
- "Trainer Pro..." (TrainerProfile) — literal page title truncated

**Root cause:** `PageHeader.tsx:83` `truncate text-center` sa `flex-1` kontejnerom; kada je back label ("< Back") i right action prisutni, srednji slot ima premalo širine za 17pt title.

**Fix:** (a) kraći contextual backLabel oslobađa mesto, (b) scroll-to-compact title može preteći u right slot kada nije action.

---

## 2. Full inventory (33 screen-ova)

| Screen | Back pattern | Header bg | Title pos | Right action | Safe-area | ErrorBoundary |
|---|---|---|---|---|---|---|
| Home | none (root) | plain-bg-card | large-title-top | chat icon + streak | pt-14 | Global |
| Login | none (auth) | transparent | center | none | pt-header-safe | Global |
| Onboarding | plain-text (← Back) | transparent | center | skip (opt) | pt-14 | Global |
| Gym | none (tab root) | plain-bg-card | large-title-top | none | pt-14 | Global |
| ActiveWorkout | arrow-icon custom | frosted-glass sticky | none | timer | pt-14 | Global |
| PostWorkout | none (overlay) | transparent | center | none | no-pad | Global |
| Food | none (tab root) | plain-bg-card | large-title-top | search | pt-14 | Global |
| Chat | plain-text (ChevronLeft custom) | frosted-glass | center (name) | none | pt-12 | Global |
| Profile | none (tab root) | plain-bg-card | large-title-top | none | pt-14 | Global |
| Progress | none (tab root) | plain-bg-card | large-title-top | none | pt-14 | Global |
| **Milestones** | PageHeader `< Back` | plain-bg-card | center | **share icon** | PageHeader-wrapped | Global |
| **Subscription** | PageHeader `< Back` | plain-bg-card | center | none | PageHeader-wrapped | Global |
| AnalysisReport | none (flow) | transparent | center | none | no-pad | Global |
| NotFound | none | transparent | center | none | no-pad | Global |
| TrainerDashboard | none (root) | plain-bg-card | large-title-top | profile avatar | pt-14 | Global |
| TrainerClients | none (tab root) | plain-bg-card | large-title-top | add client icon | pt-14 | Global |
| **ClientProfile** 🔴 | **Breadcrumb + PageHeader + hero** | hero-inside gradient | in-hero | none | PageHeader-wrapped | Global |
| TrainerTraining | none (tab root) | plain-bg-card | large-title-top | none | pt-14 | Global |
| TrainerMessages | none (tab root) | plain-bg-card | large-title-top | search | pt-14 | Global |
| **TrainerProfile** | PageHeader `< Back` | plain-bg-card | center | none | PageHeader-wrapped | Global |
| **TrainerPackages** | PageHeader `< Back` | plain-bg-card | center | `+` add | PageHeader-wrapped | Global |
| **PackageEditor** | PageHeader `< Back` | plain-bg-card | center | none | PageHeader-wrapped | Global |
| TrainerNutrition | none (tab root) | plain-bg-card | large-title-top | none | pt-14 | Global |
| **NutritionTemplateEditor** | PageHeader `< Back` | plain-bg-card | center | none | PageHeader-wrapped | Global |
| TrainerAnalytics | PageHeader `< Back` | plain-bg-card | center | none | PageHeader-wrapped | Global |
| TrainerPayments | PageHeader `< Back` | plain-bg-card | center | none | PageHeader-wrapped | Global |
| TrainerFreeTrial | PageHeader `< Back` | plain-bg-card | center | none | PageHeader-wrapped | Global |
| AddClient | PageHeader `< Back` | plain-bg-card | center | none | PageHeader-wrapped | Global |
| AssignProgram | PageHeader `< Back` | plain-bg-card | center | none | PageHeader-wrapped | Global |
| **ExerciseDetail** 🟡 | PageHeader + Breadcrumb | plain-bg-card | center | none | PageHeader-wrapped | Global |
| ExercisePicker | PageHeader `< Back` | plain-bg-card | center | none | PageHeader-wrapped | Global |
| **WorkoutEditor** 🟡 | PageHeader + Breadcrumb | plain-bg-card | center | none | PageHeader-wrapped | Global |
| **ProgramEditor** 🟡 | PageHeader + Breadcrumb + raw error | plain-bg-card | center | none | PageHeader-wrapped | Global |
| MealPicker | PageHeader `< Back` | plain-bg-card | center | none | PageHeader-wrapped | Global |

**Legenda:**
- 🔴 CRITICAL: ClientProfile (breadcrumb + hero + error leakage combo)
- 🟡 HIGH: 4 trainer editor screen-a sa dupla navigacija (PageHeader + TrainerBreadcrumbs)

---

## 3. Summary statistics

| Kategorija | Distribucija |
|---|---|
| Root screens (no back) | 14 (42%) — tab roots, auth, overlays |
| PageHeader (generic "Back") | 13 (39%) — **svi imaju iOS-native deviation** |
| PageHeader + Breadcrumbs | 4 (12%) — **anti-pattern duplikat** |
| Custom arrow-icon/plain-text | 2 (6%) — ActiveWorkout, Chat |
| **ErrorBoundary** | **globalni root** u `src/App.tsx:60` (`<ErrorBoundary>` wraps ceo QueryClientProvider tree). NI JEDAN per-route. |

---

## 4. ErrorBoundary investigacija

- Postoji `src/components/ErrorBoundary.tsx` — wraps ceo app-tree (src/App.tsx:60)
- **Nedostaje per-route granularity** — ako ClientProfile crash-uje, celi app se ruši u fallback umesto samo te route
- `src/pages/NotFound.tsx` postoji ali samo za 404, ne za render crashes

**Recommendation:** dodati `RouteErrorBoundary` wrap oko svake Route unutar `<AnimatedRoutes />` (WS-8 v8.2 dodao AnimatePresence). Jedan crash na screen ≠ ceo app down.

---

## 5. Dizajn-odluka za Fazu 2

User prompt traži novi `src/components/shell/NavBar.tsx`. Ali postojeći `PageHeader` već ima:
- `backLabel?` prop (nije iskorišćen)
- `largeTitle` varijanta
- `rightAction` slot
- Safe-area handling (`env(safe-area-inset-top)`)
- Sticky + backdrop-blur

**Dve opcije za Fazu 2:**

### Opcija A (per user-spec, novi fajl)
- Kreirati `src/components/shell/NavBar.tsx` sa proširenim API-jem: `scrollY`, mandatory `backLabel`, haptic+spring feedback built-in
- `PageHeader` postaje deprecated, zadržan zbog backward compat
- 33+ call sites moraju da migriraju

### Opcija B (predlog — upgrade existing)
- Proširiti postojeći `PageHeader` sa:
  - Dodati haptic feedback na back press (light impact, reduced-motion respected)
  - Dodati spring whileTap scale na right action
  - Dodati opcioni `scrollY?` prop za scroll-aware shrink (v8.3 enhancement)
- Call sites samo update-uju `backLabel="Clients"` style labels (mehanički sweep)
- ClientProfile: ukloniti TrainerBreadcrumbs, zadržati PageHeader + move gradient hero u content area
- Popraviti `ClientUserStatusPanel.tsx:62` — koristi `<AlertBanner tone="warning">Podaci nisu dostupni</AlertBanner>` umesto raw error.message
- Popraviti `ProgramEditor.tsx:229-234` — kratak generic error string, log puna greška u console/Sentry

**Preporuka:** **Opcija B**. Razlozi:
1. WS-7 v7.0 commitment bio je "single shared component per pattern" — novi NavBar duplira funkcionalnost
2. `PageHeader.tsx` ima 110 linija, dodati ~30 za scrollY/haptic je lakše od 200 linija novog fajla + 33 call site migracije
3. Zero breaking changes u call sites (samo manual `backLabel` population gde nedostaje)
4. User explicit brand guardrail "ne uvoditi nove zavisnosti bez pitanja" — novi component je lite enhancement, ali duplikat

**Ako user insistira na Opciji A** (shell folder = arhitekturna granica): krećemo.

---

## 6. Faza 2 predlog (pending user decision)

### Opcija B (preporuka) — Scope

1. **Enhance PageHeader** (~20 LOC):
   - Dodati `whileTap` spring scale na back button + right action
   - Dodati haptic light call na back press (via `useHaptic`)
   - Dodati opciono `subtitle` prop (već postoji samo uz largeTitle)
   - Document API u component header comment

2. **Fix ClientProfile** (CRITICAL):
   - Remove `<TrainerBreadcrumbs client={client.name} />` invocation
   - Move gradient hero card 16px ispod PageHeader-a u regular content flow (ne u shell)
   - Update `<PageHeader title="Sarah Johnson" backLabel="Clients" onBack={...} />`
   - layoutId morph između TrainerClients row-a i ClientProfile hero-a (WS-8 v8.2 D20 već pripremljeno, treba test)

3. **Fix error leakage** (CRITICAL):
   - `ClientUserStatusPanel.tsx:62` — zameniti raw error sa `<EmptyState icon={AlertCircle} title="Podaci nisu dostupni" description="Ova klijentkinja još nema završen onboarding ili postoji problem sa konekcijom." />` (koristi postojeći `<EmptyState>` + log full error na `console.error`)
   - `ProgramEditor.tsx:229-234` — generic "Nešto nije u redu pri čuvanju. Pokušaj ponovo." + log full error

4. **Contextual backLabels** (13 call sites):
   - Milestones → `backLabel={t("nav.home")}`
   - TrainerPackages → `backLabel={t("nav.trainerHome")}`
   - TrainerProfile → `backLabel={t("nav.trainerHome")}` ili `backLabel="Menu"`
   - PackageEditor → `backLabel={t("packages.title")}`
   - ostali 9 — slično, per-parent-context

5. **Remove TrainerBreadcrumbs** od ExerciseDetail, WorkoutEditor, ProgramEditor (migrate into contextual backLabel)

6. **Per-route ErrorBoundary** (v8.2 follow-up):
   - Wrap svaku `<Route>` u `<AnimatedRoutes>` u `src/App.tsx` sa `<RouteErrorBoundary>` (novi tanki wrapper oko postojećeg ErrorBoundary)
   - Fallback: friendly message + retry button (per user-spec Faza 4)

### Verify
- `npm run typecheck && npm run verify:tokens && npm run build`
- 4 screenshot "after" za Milestones, TrainerPackages, TrainerProfile, ClientProfile — poređenje sa before
- Manual: navigate TrainerClients → tap row → ClientProfile morph; proveri da back chevron kaže "Clients"

### Effort estimate
| Stavka | Trajanje |
|---|---|
| PageHeader enhance (haptic + spring) | 30min |
| ClientProfile breadcrumb ukloni + hero reposition | 1h |
| Error leakage fix (2 call sites + AlertBanner/EmptyState pattern) | 30min |
| 13 contextual backLabels sweep | 1h |
| Remove TrainerBreadcrumbs iz 3 fajla | 30min |
| Per-route ErrorBoundary | 45min |
| Screenshots after + verify | 30min |
| MASTER.md v8.5 Changelog | 15min |
| **Total** | **~5h** |

---

## 7. Screenshot evidence (captured)

Live preview na `localhost:8091`:
1. **Home** — tab root, large title "Dev 👋", weekly strip, rest day hero. Clean ✓.
2. **ClientProfile** (`/trainer/client/1`) — 🔴 breadcrumb visible ("Trainer > Clients > Sarah Johnson"), truncated "Sarah John..." title, raw `Greška: getClientStatusByTrainer(1) failed: invalid input syntax...` error u Overview tab.
3. **TrainerPackages** — `< Back` plain + "Packages" center + `+` right. Generic "Back" label.
4. **TrainerProfile** — `< Back` plain + "Trainer Pro..." truncated. Same pattern.
5. **Milestones** — `< Back` plain + "Milestones" + share icon. Same pattern.

Screenshots not persisted to disk in ovom audit-u (preview servis je in-memory) — video ih sam. Pre sledeće faze mogu napraviti disk export ako treba.

---

## 8. Brand guardrails provera (za Fazu 2)

- ✋ Pink/purple gradient u ClientProfile hero **OSTAJE** — samo se pozicionira NIŽE u content flow (ispod NavBar-a, ne unutar njega) ✓
- ✋ Light-first mode netaknut ✓
- ✋ Design tokens samo primenjujem, ne menjam ✓
- ✋ Nema novih dependency-ja ✓
- ✋ Logic/data layer netaknut — samo presentational shell + error UX ✓

---

**🛑 CHECKPOINT — čekam user odluku:**

1. **Opcija A (novi NavBar fajl) ili Opcija B (PageHeader upgrade)?** — preporučujem **B** zbog single-source consistency.
2. **Screenshot export** pre Faze 2? — mogu ih disk-persistovati ako želiš pre/after dokumentaciju.
3. **Per-route ErrorBoundary** je deo Faze 2 (po opciji B) ili Faza 4 (po user-prompt)? — predlažem da bude deo Faze 2 jer je vezano za leakage fix.

*Audit v1.0 · 2026-04-21 · 33 screen-a skenirano · 4 live screenshots · 2 error leakage točke identifikovane*
