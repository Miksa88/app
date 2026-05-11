# UI Review — V3 Surfaces (Retroactive 6-Pillar Audit)

**Audited:** 2026-05-11
**Baseline:** Abstract 6-pillar standards + `UPGRADE_PLAN_V3_SECTIONS.md` univerzalna pravila (sekcije 1–14)
**Screenshots:** not captured (no dev server detected, code-only audit)
**Auditor stance:** adversarial — assume divergence until code/strings prove otherwise.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | Hardcoded SR strings in WeeklyCheckIn + hardcoded "Save/Cancel/Delete/Pro Trainer/FlexFemme Fit/PPL Split" across trainer surfaces violate i18n rule §12 |
| 2. Visuals | 3/4 | Banners and pickers follow card-shadow + rounded-2xl idiom, but inconsistent radii (rounded-xl vs rounded-2xl vs rounded-3xl) and decorative gradient blobs only on ClientProfile create one-off visual treatments |
| 3. Color | 3/4 | Status tokens disciplined (warning/info/success/destructive), but tier badges + gradient hero + PPL header all compete; accent overused on trainer ClientProfile hero (gradient hero + gradient progress bar + gradient pill all in one viewport) |
| 4. Typography | 3/4 | Mostly token-based (text-caption-1/footnote/body/headline/title-2/large-title), but `text-2xl` for flag emojis (Profile.tsx:682, TrainerProfile.tsx:363) and inline `text-large-title` outside `PageTitle` (Home.tsx:105, WeeklyCheckIn.tsx:258) bypass the §1 "Jedan PageTitle" rule |
| 5. Spacing | 3/4 | Consistent `px-5`, `space-y-3/4`, `gap-2/3` rhythm; but Chat banner uses `mx-3 my-2` while the rest of Chat uses `px-5` — visual seam between header and banner |
| 6. Experience Design | 2/4 | Pause/Vacation/Equipment have loading + empty + active states but **no Undo on destructive actions** (V3 §11 explicit rule) and Delete-note/Pause-client/Activate-Vacation all execute on first tap without confirmation or toast Undo |

**Overall: 16/24**

---

## Top 5 Cross-Pillar Priority Fixes

1. **Add Undo (5s toast) to all destructive V3 actions** — `PauseClientCard.tsx:38` (`onSubmitPause`), `VacationModeCard.tsx:38` (`onActivate`), `ClientProfile.tsx:504` (`deleteNoteMutation.mutate(n.id)`), `Profile.tsx:71` (`toggleNotif` — silently overwrites server). V3 §11 verbatim citate: *"It is 2025, why does the number one training software not have an undo button?"*. **Fix:** wrap each mutation in a `toast.success(t('...'), { action: { label: t('common.undo'), onClick: rollback } })` with 5s timeout, using `sonner` already imported in `WeeklyCheckIn.tsx`.

2. **Move all hardcoded strings to `LanguageContext`** — `ClientProfile.tsx:490` ("Save"), `:491` ("Cancel"), `:506` ("Delete note"), `:521` ("Physical"), `:545` ("Dietary"), `:567` ("Lifestyle"), `:601` ("PPL Split — 12 Weeks"), `:621` (`'Mon: Push Day'…'Sun: Rest'`), `:642–644` (workout history), `:689–692` (check-in history); `TrainerProfile.tsx:40` ("Strength & Conditioning"), `:118` ("Pro Trainer"), `:75/:270` ("FlexFemme Fit"), `:277` ("#E91E8C"); `WeeklyCheckIn.tsx:386, :399, :410, :424, :426, :556` (Serbian copy). V3 §12 explicit ban on hardcoded JSX strings.

3. **Replace `text-large-title` H1 with the canonical `<PageTitle>` component** — `Home.tsx:105` and `WeeklyCheckIn.tsx:258` render `<h1 className="text-large-title …">` inline; only `Profile.tsx:262` and `PageHeader` use the contract. V3 §1: *"Jedan PageTitle po stranici"*. **Fix:** swap both inline h1s for `<PageTitle title={…} />`; this also normalizes top-padding currently fudged with `pt-14` (Home) and `pt-2` (WeeklyCheckIn).

4. **Unify primary-action button style — `gradient-primary` raw vs `<Button variant="cta">`** — `QuietHoursPicker.tsx:95`, `EquipmentEditor.tsx:99`, `PauseClientCard.tsx:97`, `VacationModeCard.tsx:134` all use raw `gradient-primary` className composition for the primary CTA. `Profile.tsx:561, 628` and `WeeklyCheckIn.tsx:469` use `<Button variant="cta" size="xl">`. V3 §2: *"Sva primarna CTA = `GradientButton`"*. **Fix:** import and use `GradientButton` (or `Button variant="cta" size="xl"`) in all four new V3 components; reduces 4 maintenance points and one inconsistent height (`min-h-12` vs `xl`).

5. **Confirm-before-destruct on Pause / Vacation activation, and 3-card-per-viewport audit on ClientProfile Settings tab** — `ClientProfile.tsx` Settings tab renders Profile info → Program settings → Sync rules → Equipment → Pause → Danger zone = 6 cards in a single scroll. V3 §3: *"Maksimum 3 kartice po viewport-u na mobile-u"*. **Fix:** group "Profile info" + "Program settings" into a single Card with separator-ios dividers (pattern already used in TrainerProfile business sub-page `:168-187`); collapse "Sync rules + Equipment" into one "Plan rules" card; keep Pause + Danger as the bottom pair. Same fix applies to Profile.tsx where Quick Pause card (`:289`) renders **above** Account sections — should be a single "Account & lifestyle" card.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

**Strengths**
- Empty states on Chat (`Chat.tsx:97-103`) and WeightHistory (`Profile.tsx:704-706`) use product-voice copy via i18n keys (`chat.emptyTitle`, `chat.emptyBody`).
- Pause / Vacation banners surface contextual subtext (`pause.until` w/ date interpolation, `vacation.untilUntil`) instead of bare "Active" labels.

**Issues**
- **BLOCKER — Hardcoded Serbian strings in WeeklyCheckIn submit form.** `WeeklyCheckIn.tsx:386` (`Koliko si u proseku spavala?`), `:399` (aria `Prosečan san`), `:410` (`Koliko si bila pod stresom?`), `:424` (aria `Prosečan stres`), `:426` (`1 = opušteno · 5 = pod velikim pritiskom`), `:556` (radiogroup aria `Identity score`). The i18n keys EXIST at `LanguageContext.tsx:2222-2224` but the component never calls `t()` on them — a literal translation regression. EN users see Serbian.
- **BLOCKER — Hardcoded English in trainer surfaces.** `ClientProfile.tsx:490–491` ("Save"/"Cancel" buttons), `:506` ("Delete"), `:521/:545/:567` (section labels Physical/Dietary/Lifestyle), `:601` ("PPL Split — 12 Weeks"), `:621` weekday strings, `:677` ("Submitted 2 hours ago"), `:690–692` check-in dates, `:730` ("Body Fat", "Waist"). `TrainerProfile.tsx:40` (`"Strength & Conditioning"` default state), `:118` (`Pro Trainer` badge), `:270` (`FlexFemme Fit` literal), `:277` (`#E91E8C` rendered as user-visible body text).
- **WARNING — Generic CTAs.** `ClientProfile.tsx:490` `<Button>Save</Button>` and `:491` `<button>Cancel</button>` for note submission. Spec suggests verb-noun ("Add note" / "Discard"). Same generic "Cancel" in `PauseClientCard.tsx:146`.

**Fixes**
- Add `t()` wrap for sleep/stress/identity strings in WeeklyCheckIn using existing keys (`weeklyCheckIn.fields.sleepAvg` etc).
- Add missing keys for `trainer.notes.save`, `trainer.notes.cancel`, `trainer.notes.delete`, `clientProfile.sections.physical|dietary|lifestyle`, then call `t()` everywhere.
- Move `FlexFemme Fit`, `#E91E8C`, `Pro Trainer` into `tenant.brand.*` keys or a `BRAND` constant.

---

### Pillar 2: Visuals (3/4)

**Strengths**
- New V3 banners (PausedClientBanner, TrainerVacationBanner) reuse `rounded-2xl` + `bg-{tone}/10 border-{tone}/30 p-4 flex items-start gap-3` idiom that mirrors `AlgorithmStatusBanners` — visually coherent.
- Equipment editor selected state uses `border-2 border-primary bg-primary/10` matching the goals/allergies picker in `Profile.tsx:465` — consistent pattern.

**Issues**
- **WARNING — Inconsistent corner radius scale.** Within ClientProfile alone: `rounded-3xl` (hero `:253`), `rounded-2xl` (cards), `rounded-xl` (sub-cards, pills `:497, :780`), `rounded-lg` (activity icons `:460`), `rounded-full` (status pills). Five distinct radii in one screen; spec implies a `card`/`pill`/`chip` 3-tier scale.
- **WARNING — Decorative gradient blobs only on ClientProfile hero** (`:257-258`) — one-off visual that doesn't exist on `Home` or `TrainerProfile` hero. Either promote to a `<HeroCard>` primitive or drop the blobs.
- **WARNING — `PausedClientBanner` icon container is `rounded-xl` (`:24`) but `TrainerVacationBanner` icon container is `rounded-lg` (`:32`).** Same banner family, two different radii. Pick one.

**Fixes**
- Document a 3-tier radius scale in `design-tokens.ts` (card=2xl, pill=full, chip/icon=xl) and audit ClientProfile against it.
- Promote gradient hero to `<TrainerClientHero>` primitive so blobs/decoration is a single source of truth.

---

### Pillar 3: Color (3/4)

**Strengths**
- Semantic color tokens (warning/info/success/destructive/primary/secondary) used consistently across all 14 audited files via `bg-{tone}/10` / `text-{tone}` pattern — no hex literals in component logic except `TrainerProfile.tsx:277` (intentional brand readout) and the gradient definition in `Home.tsx:388-391` (SVG defs, acceptable).
- Accent (primary gradient) is reserved for CTAs and active workout card top-stripe (`Home.tsx:249`); rest day uses `bg-success/40`, next meal uses `bg-warning/60` — strong status differentiation.

**Issues**
- **WARNING — Accent overuse on ClientProfile hero viewport.** Hero has: gradient background (`:254`) + gradient progress bar (intermediate state) + gradient TierBadge (`<TierBadge>`) + decorative white blobs over gradient. Then `:611` adds another `gradient-primary` progress bar. V3 §2 implies primary is for primary CTA; here it is decorative chrome. The 60/30/10 split is closer to 35/35/30 on this page.
- **WARNING — `Profile.tsx:298` Quick Pause uses `bg-secondary/10` + `text-secondary`** but `PausedClientBanner.tsx:24` uses `bg-warning/15` + `text-warning` for the same domain concept. Same feature, two different semantic tones.
- **WARNING — Status pill colors not paired with status meaning.** `ClientProfile.tsx:210-214` maps trial→primary, active→success, paused→warning, finished→muted (correct), but `:780–797` Settings tab type/status pills all collapse onto the same `gradient-primary` selected state — loses status semantics on the editor.

**Fixes**
- On ClientProfile hero, demote either the gradient progress bar or the gradient TierBadge to a tonal/neutral; pick one accent moment per viewport.
- Standardize "pause" semantic on `warning` everywhere (Profile quick-pause should be `bg-warning/10 text-warning`, not `secondary`).

---

### Pillar 4: Typography (3/4)

**Strengths**
- Apple-style type ramp used consistently (`text-large-title`, `text-title-2/3`, `text-headline`, `text-body`, `text-subhead`, `text-footnote`, `text-caption-1/2`). No raw `text-xs|sm|base|lg|xl|2xl|3xl|4xl` in audited Home/Profile/Chat/WeeklyCheckIn except where called out below.
- Tabular numerals applied for streak/macro/percentage tabular content (`Home.tsx:417, :425`, `ClientProfile.tsx:303, :316`).

**Issues**
- **WARNING — Inline `<h1 className="text-large-title">` bypasses `<PageTitle>`.** `Home.tsx:105` and `WeeklyCheckIn.tsx:258` violate V3 §1 ("Jedan PageTitle po stranici"). `Profile.tsx:262` uses `<PageTitle title={…} />` correctly. Inconsistent.
- **WARNING — `text-2xl` for flag emojis** (`Profile.tsx:682`, `TrainerProfile.tsx:363`) breaks the type scale. Use `text-title-2` or fixed `text-[24px]` token, or render via SVG.
- **WARNING — Mixed font weights for the same role.** Section labels: `Home.tsx:177` uses `font-medium`, `ClientProfile.tsx:400` uses `font-bold`, `Profile.tsx`'s `SectionLabel` component has its own default. Three different weights for "uppercase tracking-wider caption" header rows.

**Fixes**
- Migrate Home + WeeklyCheckIn to `<PageTitle>`.
- Replace flag emojis with `SectionLabel`-styled "EN / SR" badges or use unicode flags inside `text-headline`.
- Lock `SectionLabel` semantic weight in `section-label.tsx` and remove inline overrides.

---

### Pillar 5: Spacing (3/4)

**Strengths**
- Page-level rhythm consistent: `px-5` + `pb-32` + `space-y-3/4` is the canonical pattern across `Home.tsx:135`, `Profile.tsx:264`, `ClientProfile.tsx:220, :366`, `TrainerProfile.tsx:108`, `WeeklyCheckIn.tsx:254`.
- Form group rhythm consistent inside V3 components: `space-y-3` between header → hint → controls (PauseClientCard, VacationModeCard, EquipmentEditor, QuietHoursPicker).

**Issues**
- **WARNING — `TrainerVacationBanner.tsx:30` uses `mx-3 my-2`** while every other Chat-page element uses `px-5`. The banner shifts 8px right of the message column and gets vertical margin where none of the surrounding chrome uses margin (header is `pb-3`, messages list is `py-4`). Visual seam.
- **WARNING — Arbitrary pixel values.** `Home.tsx:124` (`min-w-[20px]`), `:384` (`w-[72px] h-[72px]`), `Profile.tsx:520, 522, 590-592` (`w-[51px] h-[31px]`, `w-[27px] h-[27px]` for the iOS-style switch). These are intentional iOS metrics but live as one-offs; should be tokens like `switch-track`, `switch-thumb`.
- **WARNING — Hero padding asymmetry.** `Home.tsx:100` uses `px-5 pt-14 pb-5`, `Profile.tsx:262` uses `mt-3`, `TrainerProfile.tsx:112` uses `pt-3`. Three different vertical entries to the first card.

**Fixes**
- Change `TrainerVacationBanner` to `mx-5 mb-3` (matches Chat input bar) or move it inside the Messages scroll region.
- Add `iosSwitch.{track,thumb}` to design-tokens.ts and reference them.
- Decide top-padding contract (probably `pt-3` after `PageHeader`/`PageTitle`) and apply uniformly.

---

### Pillar 6: Experience Design (2/4)

**Strengths**
- Loading states present on every V3 component (`EquipmentEditor.tsx:64`, `PauseClientCard.tsx:73`, `VacationModeCard.tsx:73`, `QuietHoursPicker.tsx:58`, `PausedClientBanner` early-return on no data, Home skeleton `:137-144`).
- Optimistic / `isDirty` save pattern in `EquipmentEditor.tsx:34` and `QuietHoursPicker.tsx:35` is correct — disables save when no changes, surfaces save only when dirty.
- Confirmation dialog on logout + delete account (`Profile.tsx:718-756`) uses `AlertDialog` with explicit destructive style.

**Issues**
- **BLOCKER — No Undo on destructive mutations.** V3 §11 quote: *"why does the number one training software not have an undo button?"*. Failures across the board:
  - `ClientProfile.tsx:504` — `deleteNoteMutation.mutate(n.id)` on first tap, no toast Undo.
  - `Profile.tsx:71` — `toggleNotif` writes server prefs instantly, no rollback handle.
  - `PauseClientCard.tsx:38` `onSubmitPause` — major side effect (paused client banner appears for the trainee), no confirm and no Undo.
  - `VacationModeCard.tsx:38` `onActivate` — sets `vacation.active = true`, surfaces to all clients in Chat — no confirm.
  - `EquipmentEditor.tsx:45` `onSave` — overwrite of equipment array, no Undo.
- **BLOCKER — Pause + Vacation lack confirmation step.** Both are high-impact, client-visible mutations. V3 §7: *"Dialog samo za destruktivne akcije"*. Pause IS destructive (algorithm halts), but the current flow is a direct `pauseMutation.mutate()` call after a form submit (`PauseClientCard.tsx:38`).
- **WARNING — Chat input has no offline / send-failed state.** `Chat.tsx:48-53` swallows errors with `setInput(body)` only. No toast, no inline error indicator. Trainer Vacation banner doesn't tell client *"messages will deliver but trainer may reply late"* — just *"on vacation"*. Spec V3 §12 implies expectation-setting copy.
- **WARNING — Notif toggle has no failure handling.** `Profile.tsx:71` `setNotifPrefsMutation.mutate(...)` is fire-and-forget. If RLS denies or network drops, the UI shows the new state but server keeps old.

**Fixes**
- Add `useUndoableMutation` wrapper or use `sonner.toast(label, { action: { label: 'Undo', onClick: rollback } })` for note delete, pause, vacation activate, equipment save, notif toggle. Match the 5-second toast spec.
- Insert `AlertDialog` confirm before `pauseMutation.mutate` and `vacationMutation.mutate` (re-use existing `AlertDialog` already imported in `Profile.tsx`).
- Add a `MessageDeliveryStatus` indicator next to each outgoing chat bubble (sent/queued/failed) — even if all-green for MVP, the slot has to be there for the offline case.

---

## Files Audited

- `src/pages/Home.tsx` (476 lines)
- `src/pages/Chat.tsx` (174 lines)
- `src/pages/Profile.tsx` (762 lines)
- `src/pages/WeeklyCheckIn.tsx` (586 lines)
- `src/pages/trainer/ClientProfile.tsx` (857 lines)
- `src/pages/trainer/TrainerProfile.tsx` (397 lines)
- `src/pages/trainer/ExercisePicker.tsx` (183 lines)
- `src/components/home/PausedClientBanner.tsx` (47 lines)
- `src/components/chat/TrainerVacationBanner.tsx` (55 lines)
- `src/components/profile/QuietHoursPicker.tsx` (108 lines)
- `src/components/profile/UnitsPicker.tsx` (106 lines)
- `src/components/trainer/EquipmentEditor.tsx` (115 lines)
- `src/components/trainer/PauseClientCard.tsx` (178 lines)
- `src/components/trainer/VacationModeCard.tsx` (150 lines)

**Reference docs:** `UPGRADE_PLAN_V3_SECTIONS.md` (universal rules 1–12), `CLAUDE.md` (design token + protocol context).

---

## Summary

Total: **16/24** — surfaces are visually consistent with the existing system but the V3-introduced flows (pause, vacation, equipment, units, quiet hours) break the §11 Undo rule and the §12 i18n rule across the board, and ClientProfile / WeeklyCheckIn render hardcoded copy + bypass the `<PageTitle>` contract. Two failing pillars (Copywriting, Experience Design) are blockers; remaining three (Visuals, Color, Typography, Spacing) are warnings of system drift.
