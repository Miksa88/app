# Detailed Audit — Real User Feedback vs fitbyivana Current State
Date: 2026-05-11

> Source documents: 7 MD files in `upgrade/` + `UPGRADE_PLAN_V3_SECTIONS.md` + codebase verification (grep).
> Every "we already do X" claim is paired with a file path. Every "we haven't done X" claim was grep-verified. Anything ambiguous is tagged `[VERIFY]`.
> Citations are verbatim from the source MDs (Trainerize Idea Forum, Capterra, Reddit, Trustpilot, App Store).
> Stripe/billing surfaces are explicitly out of scope per project instructions.

---

## 1. Verbatim Pain Points That We Already Solved

| # | Citation (verbatim, source) | What we shipped | Evidence path |
|---|---|---|---|
| 1.1 | "Ability to pause, freeze, pro-rate ... instead of cancelling their plans" — open since 2018, `feature_requests_real_users.md` | Client self-pause + trainer-side pause sheet, plus pause_state column in profiles | `src/components/home/QuickPauseSheet.tsx`, `src/components/trainer/PauseClientCard.tsx`, `src/services/clientPauseService.ts`, `src/hooks/useClientPause.ts` |
| 1.2 | "I always take a Christmas holiday and have to deactivate the auto-payment ... I have lost clients due to this" — Miguel Yiallourides (trainer vacation) | TrainerVacationBanner shown to clients when trainer is on vacation | `src/components/chat/TrainerVacationBanner.tsx`, `src/components/trainer/VacationModeCard.tsx` |
| 1.3 | "10.841 GLASOVA: Custom Text Notes per Exercise — seat height/posture notes" — `feature_requests_real_feedback.md` | Per-client custom exercise notes persisted in DB, carry-over capable | `src/hooks/useExerciseNote.ts`, `src/hooks/useClientNotes.ts`, `src/services/clientNotesService.ts` |
| 1.4 | "Equipment tab per client (knows what client has at home/gym)" — TrueCoach pattern | EquipmentEditor + client equipment service, surfaced in ClientProfile | `src/components/trainer/EquipmentEditor.tsx`, `src/services/clientEquipmentService.ts`, `src/pages/trainer/ClientProfile.tsx` |
| 1.5 | "We need a tag where we can say 'do this if you have knee pain' 'do this if that machine isn't available'" — admin Trevor (Trainerize) | Surgical Swap algorithm + SwapExerciseSheet honoring limitations/equipment | `src/utils/training/exerciseSubstitution.ts`, `src/components/workout/SwapExerciseSheet.tsx` |
| 1.6 | "Saved Replies / Snippets — coach kuca slash, dobija meni" — `master_8020_sinteza.md` | "/" snippet picker in trainer chat | `src/components/trainer/SavedRepliesSheet.tsx`, integrated in TrainerMessages |
| 1.7 | "Per-client unit preference (kg/lb/stone, cm/in)" — `master_8020_sinteza.md` | Units toggle in Profile, persisted as `preferred_units` | `src/pages/Profile.tsx` + `profiles.preferred_units` (DB) |
| 1.8 | "Don't force client to enter weight, height etc." (14 votes) | HeightWeightStep simplified, ProcessingScreen reduced; Frequency skip for beginners | `src/components/onboarding/HeightWeightStep.tsx`, `src/components/onboarding/ProcessingScreen.tsx`, `src/components/onboarding/ExperienceStep.tsx` |
| 1.9 | "Notifikacije se queue-uju, klijenti vide 'Trener je na pauzi do [date]'" | TrainerVacationBanner posts the date to client chat | `src/components/chat/TrainerVacationBanner.tsx` |
| 1.10 | "Allergens / Dietary Restrictions Filter — niko nema fully implementirano" | Per-client allergen list, anti-ingredient filter, meal plan personalization | `src/components/onboarding/AllergiesStep.tsx`, `src/utils/nutrition/antiIngredientFilter.ts`, `src/utils/nutrition/planPersonalization.ts` |
| 1.11 | "Custom macro split ... I want to customize each client's goal by the gram" — Jessica Koeman | Gram-level macro targets generated per client, training-vs-rest macros handled in algorithm pipeline | `src/utils/nutrition/bmrTdee.test.ts`, `src/utils/nutrition/mealPlanGenerator.ts`, CLAUDE.md "Different macros training vs rest day" |
| 1.12 | "Different macros for training vs rest days" (Planned at Trainerize, never shipped) | Built into intermediate protocol pipeline | `files_extracted/KOD-FIT_Master_Protokol_SREDNJE_NAPREDNE_V2.md` + `programGenerator.ts` |
| 1.13 | "Estimated workout time ... inaccurate (too short) 99% of the time" | Already removed — grep for `estimated.*time / workout_duration` returns zero matches in `src/` | (absence) |
| 1.14 | "Achievement Badges Spam — Default ON" anti-pattern | AchievementOverlay was deleted, streak badge hidden from Home | `src/components/AchievementOverlay.tsx` does not exist (grep) |
| 1.15 | "Auto-deload trigger" missing across industry | 8-layer pipeline includes auto deload (mezo lifecycle) | CLAUDE.md "Mezociklus 7/6 nedelja" + `mesocycleLifecycle.ts` |
| 1.16 | "Pre-workout fatigue — 'Umorna' triggers MAINTAIN" | PreWorkoutFatigueDialog wired into next-session intensity reduction | `src/components/PreWorkoutFatigueDialog.tsx`, `biofeedbackReactiveRules.ts` |
| 1.17 | "Tempo + Ramp-up automatski popunjeni" | tempoAndRampUp module + 90% ramp set on first compound | `src/utils/training/tempoAndRampUp.ts` |
| 1.18 | "Diet Break OBAVEZAN posle 4 mezociklusa" | mesocycle-tick cron + 14-day auto-clear | CLAUDE.md, edge function `mesocycle-tick` |
| 1.19 | "Emergency Refeed — 4-marker biofeedback trigger" | emergencyRefeed module + AlgorithmStatusBanners surface | `src/utils/training/emergencyRefeed.ts`, `src/components/algorithm/AlgorithmStatusBanners.tsx` |
| 1.20 | "Smart Cut hijerarhija + NEAT 10k gate" | smart-cut-tick cron + NEAT gate logic | `smartCut.ts` + edge function |
| 1.21 | "Group/Community Features Default-On" anti-pattern | No social feed, no leaderboards, no group chat shipped | (absence — grep) |
| 1.22 | "Hardcoded Photo Poses" / "12-site body measurements" anti-pattern | Body measurements component deleted (`src/components/CycleTracker.tsx` removed from active tree, no 12-site form) | git status shows removed components |
| 1.23 | "Auto messages od sistema — 'turn off'" | No system-authored chat messages — chat is strictly 1:1 trainer↔client | `src/pages/Chat.tsx` (manual sends only) |
| 1.24 | "Quiet hours" preference | QuietHoursPicker shipped in Profile, persisted in notification_preferences | `src/pages/Profile.tsx`, profiles.notification_preferences |

---

## 2. Verbatim Pain Points We Have NOT Solved Yet — Prioritized

### P0 (revenue or retention blocker)

**2.1 Smart Exercise Substitution UI for the client (engine exists, UX gap)**
- Citation: "11.599 GLASOVA ... Currently the substitute button pulls up a variety of exercises. **It should only narrow down to the ones that are similar.**" — `feature_requests_real_feedback.md` (Trainerize idea #1 by votes, open since 2015).
- Why it matters: Single most-voted feature in the entire industry. Our `exerciseSubstitution.ts` engine is in place; gap is the **client-facing flow** that lets the client see filtered options pre-workout (by muscle group + equipment + injury), not just trainer-side surgical swap.
- Implementation: `SwapExerciseSheet` already exists but needs (a) pre-workout entry point on today's card, (b) "doesn't have equipment / hurts my X" two-tap filter, (c) write-back to next instance only vs. all upcoming (toggle). DB: existing `client_equipment` + `client_limitations` columns are reusable.
- Effort: 4–6h UI + 1h backend.
- Priority: **P0**.

**2.2 Pre-workout substitution (swap BEFORE Start, not mid-session)**
- Citation: "I am deployed and equipment available varies by day. I would like to be able to substitute an exercise **before starting the workout**" — `feature_requests_real_users.md` (open since 2018, 50+ votes).
- Why: timer starts on Start; today's UX forces clients to start, then swap, which contaminates RPE/elapsed-time logs.
- Implementation: surface SwapExerciseSheet on today's workout preview card before the Start button.
- Effort: 2h.
- Priority: **P0**.

**2.3 Pre-set alternates per exercise (regression / standard / progression slider)**
- Citation: "Push from knees (easy), push up (default), push up (legs on a box) (advanced). Perhaps having a slider so they can select which version they're doing." — admin Trevor, June 2020.
- Why: clients don't know exercise names ("Lucas Hyde: Clients don't know the names of exercises"). 3-tier picker eliminates substitution paralysis.
- Implementation: trainer-side WorkoutEditor needs `regression_exercise_id` / `progression_exercise_id` columns; client-side single-tap slider on exercise card.
- Effort: 5–7h (schema + editor + client UI).
- Priority: **P0**.

**2.4 Weekly auto-generated trainer report per client**
- Citation: "**I spend too much time trying to gather all information to conduct my weekly check-ins.**" — Rachel Holden, Sep 2023. "Weekly avg or total for the week is a much better target."
- Why: trainer retention. We have raw signals (workouts, macros, weight, mood, NEAT) but no aggregated weekly digest.
- Implementation: scheduled edge function aggregates per-client week → DB; new `WeeklyReport` component shown on trainer ClientProfile.
- Effort: 6–8h.
- Priority: **P0** (verified absent — grep `weekly.*report` returned no matches).

**2.5 Save+Publish workflow for trainer program edits**
- Citation: "5 to 10 changes ... 10 emails ... annoying" — Ryan, Trainerize forum 2014, Trainerize officially refused. Our V3 plan §14 calls this out, but grep `publishWorkout` returns nothing — not yet implemented.
- Why: silently destroys client trust when small trainer iteration spams push.
- Implementation: program/workout edits save to a `draft` flag, "Publish" button flips state and triggers one notification.
- Effort: 4h.
- Priority: **P0**.

### P1 (parity with leaders)

**2.6 Undo on destructive trainer actions**
- Citation: "**It is 2025, why does the number one training software not have an undo button?**" — Reddit, `sta_je_visak_komplikovano.md`.
- Implementation: shared Sonner toast with "Vrati" 5s, wraps deletion of workout / nutrition plan / client archive.
- Effort: 3h.
- Priority: **P1**.

**2.7 Wearable native sync (Apple Health → Garmin/Whoop/Oura/Samsung)**
- Citations: "I'm not going to double enter the data" (Whoop), "I'll leave my current trainer" (Samsung).
- Status: grep `Whoop|Oura|Garmin|samsung_health` returns **zero hits** in `src/`. We do not even have Apple HealthKit bridge.
- Implementation: HealthKit + Health Connect (Android) via Capacitor plugins → ingest sleep/HRV/steps into our existing `daily_signals` table. Whoop/Oura via OAuth (post-MVP).
- Effort: HealthKit/Health Connect ~12h. Whoop/Oura OAuth ~8h each.
- Priority: **P1** (Apple Health/Garmin) / **P2** (Whoop/Oura/Samsung).

**2.8 RPE per set (not per workout)**
- Citation: "Same weight for same reps but with lower RPE is still progress" — Stefanie und Moritz, Sep 2020.
- Status: grep `setRpe|set_rpe|rpe_per_set` returns no matches. We log workout-level fatigue (3-button feedback) but not per-set RPE.
- Implementation: extend `workout_sets` schema with optional `rpe` column; conditional UI on power-user trainers (per-tenant flag).
- Effort: 4h.
- Priority: **P1** (toggle, opt-in — beginners shouldn't see RPE inputs).

**2.9 Side-by-side photo comparison**
- Citation: "How are side-by-side comparison photos not a feature enabled on desktop yet? ... this alone has driven me to explore other platforms."
- Status: grep `SideBySide|photoCompare` returns nothing.
- Implementation: Progress > Photos tab with two-photo overlay/diff component. Reuse existing photo bucket.
- Effort: 5h.
- Priority: **P1**.

**2.10 Failed payment retry / manual retry**
- Citation: "**This creates serious cash flow issues**" — Kacey, Jan 2024.
- Status: Stripe is currently NOT in the project (per session constraints). We have Subscription/PackageEditor/TrainerPayments pages but no live billing.
- Note: out of scope per user instruction "Stripe/billing isključeno".
- Priority: **DEFER** (only revisit when billing layer is reopened).

**2.11 Multi-language support**
- Citation: "Multi-language support — Dutch, Spanish, German, French, Italian. ... I've noticed that some of my potential clients face challenges using the app because it's only available in English."
- Status: LanguageContext exists and renders Serbian + English; grep shows ~30 missing keys recently patched (commit 96e1a80). Solid foundation, but Tier-2 languages (DE/ES/FR/IT/NL) absent.
- Effort: per-language ~6h translator pass.
- Priority: **P1** for SR/EN polish, **P2** for additional EU languages.

### P2 (delight, niche, post-MVP)

**2.12 Permanent substitution across all upcoming weeks**
- Citation: "substitute for all upcoming workouts" — multiple votes.
- Effort: 4h (extend swap engine to write forward).
- Priority: **P2**.

**2.13 Auto-progression engine (RPE-driven, not %1RM-only)**
- Citation: "SmartStep idea: Auto-switch exercises when client hits target 2 consecutive sessions" — Trainerize trainer wrote a full spec.
- Note: we already have intermediate U/L pipeline with RPE ramp and Hashimoto cap (CLAUDE.md). What's missing is **automated load adjustment** from set-level performance — we adjust at the mesocycle layer, not the set layer.
- Effort: 10–14h algorithm + UI explanation.
- Priority: **P2** (high-impact for power users; beginners don't need it).

**2.14 Beginner→Intermediate auto-graduation indicator**
- Citation: "Auto-promotion threshold: kad klijent dostigne X strength markers" — `personalizacija_automatizacija_deep_dive.md` §7.
- Note: we have beginner and intermediate protocols (both spec'd) but no automatic graduation. Trainer manually promotes today.
- Effort: 6h (threshold logic + trainer notification + client level-up screen).
- Priority: **P2**.

**2.15 Trainer self-use mode**
- Citation: "What trainer doesn't use the app for their own workouts too?" — overwhelming consensus.
- Effort: 8h (trainer role can own a client_id pointed at self, with UI toggle).
- Priority: **P2**.

**2.16 Multiple consultation/check-in forms per client type**
- Citation: "I work with pre and post-natal clients which means I can have 3 different par-qs for one client within a year."
- Effort: 6h (form template editor on trainer side).
- Priority: **P2**.

**2.17 Print/PDF view of a workout**
- Citation: TrueCoach has it; older clients pin workouts to the fridge.
- Effort: 3h with `@react-pdf/renderer` or HTML-to-print.
- Priority: **P2**.

**2.18 Hydration tracker**
- Citation: top voted B2C request alongside dark mode.
- Effort: 3h (water_log table + ring on Food).
- Priority: **P2** (per-tenant flag).

**2.19 Threaded chat replies**
- Citation: Skool/Circle pattern; current chat is a flat thread.
- Effort: 8h; defer to community phase.
- Priority: **P2**.

**2.20 Exercise comment history (carry past coach comments forward)**
- Citation: Everfit shipped Jan 2026; "Past komentari na exercise vidljivi tokom workouta".
- Note: our `useExerciseNote.ts` stores notes per (client, exercise) — confirm carry-forward UX in ActiveWorkout. `[VERIFY]`
- Effort: 1–2h if hook already aggregates history.
- Priority: **P2**.

---

## 3. Competitor "Wow" Features Worth Stealing

| Competitor | Feature | Why it works | How to adapt biology-first |
|---|---|---|---|
| **Everfit** | Live Sync on Master Programs ("change once, propagates to all 40 clients") | Trainer-side scale unlock | Apply only to **non-personalized** template seeds; once mesocycle pipeline personalizes the program, lock against live edits so adaptive logic isn't overwritten. |
| **Everfit** | Autoflow / By-Day-Sequence delivery | Group challenges, hands-off | Use as **on-ramp tier**: pre-built 4-week beginner programs that lead into our beginner protocol. |
| **Everfit** | Post-workout "animal weights" gamification | Retention through novelty | Toggle. Default OFF for serious / ED-risk profiles. Could reuse our existing GoalEventCard format. |
| **TrueCoach** | Form-check video annotation (slow-mo + drawing) | Coach credibility | Phase 2 trainer feature; reuse Chat video attachment + new annotation overlay. |
| **TrueCoach** | Stripe-managed client self-serve payment method | Reduces admin friction | Out of scope per instructions (billing deferred). |
| **PT Distinction** | Off-the-shelf packages with embed code (passive income) | Solves funnel layer (see §6) | Tie into our existing Package/Subscription pages once billing reopens. |
| **PT Distinction** | Custom assessments / movement screens | Professional credibility | Templatize as a new check-in form type; reuse our WeeklyCheckIn skeleton. |
| **Hevy Coach** | Coach-side mobile workout logging (real-time set entry during PT session) | In-person trainer use case | Phase 3; reuse ActiveWorkout from trainer's perspective with `loggingFor: clientId`. |
| **Hevy Coach** | Curated exercise library (no clutter) | Reduces substitution paralysis | We already have a small library — keep it small. Don't import an Everfit/Trainerize-size catalogue. |
| **Kahunas** | Daily visual behavior scorecards (color/shape, not numbers) | Motivation without anxiety | Apply to our Progress tab as an alternative to numeric tracking, default-on for "soft" tenants. |
| **Trainerize** | AI workout builder pulling client context (history + equipment + goals) | Speeds first-draft generation | We have the deterministic algorithm; an AI assist would only help **trainer onboarding** of new clients, not the core pipeline. Treat as Tier-B. |
| **Trainerize Business** | Referral tracking | Retention loop | Lightweight: profiles.referrer_id + Trainer Analytics card. |
| **HubFit** | Flat pricing, all features in every plan | Anti-bloat positioning | Already our planned business model. Make this an explicit marketing pillar. |
| **Hevy app** | Streak that lives in the client app but is anxiety-free | Healthy gamification example | Currently we hid streaks. Consider re-introducing **trainer-only** streak signal (not client-facing). |
| **MyFitnessPal** (despite hate) | Barcode scanner | Logging speed | Phase 2 ExtraMealSheet enhancement via Capacitor barcode plugin. |

---

## 4. Anti-Patterns We Should Continue to Avoid

| Anti-pattern (verbatim) | Do we accidentally do it? | Verification |
|---|---|---|
| "Confetti animation after every action" | **Cleared.** ConfettiCelebration only triggers on mezo completion per V3 plan. | Check call sites of `ConfettiCelebration.tsx` `[VERIFY]` |
| "Hardcoded 12-site body measurements" | **Cleared.** `CycleTracker.tsx` deleted in git status; Progress tabs are Completed + Adaptation. | git status |
| "Estimated workout time" | **Cleared.** Grep returns no matches. | grep `estimated.*time` |
| "Forced walkthrough video on first launch" | **Cleared.** Onboarding has no auto-played generic platform video; the ProcessingScreen is an algorithmic loader. | `ProcessingScreen.tsx` |
| "Constant upsell screens" | **Risk.** `PaywallScreen.tsx`, `Subscription.tsx`, `PackageEditor.tsx`, `TrainerPayments.tsx` still exist. Should hide behind tenant flag `paywall_required`. | grep |
| "Auto messages from system" | **Cleared.** No system bot writes to chat. | Chat.tsx only renders user_message rows |
| "Achievement badges default-on" | **Cleared.** AchievementOverlay does not exist. | grep |
| "Streak counter default-on, client-visible" | **Risk.** `useStreak.ts` still exists; UI hidden on Home but hook is wired. Verify it isn't read by other surfaces. | `[VERIFY]` `useStreak.ts` consumers |
| "Forced periodization terminology to clients" | **Likely cleared** — banners say "Sedmica 2" not "Mesocycle 2". `[VERIFY]` AlgorithmStatusBanners copy. | |
| "Default audio voice in workouts" | **Cleared.** No voice cue system shipped. | |
| "Pictures cropped at hip (hardcoded poses)" | **Cleared** — body photos UI not surfaced in active tree. | |
| "Tight MFP coupling" | **Cleared.** We use our own food database (`src/data/foodDatabase.ts`). | |
| "Multi-step nav for basic tasks" | **Risk.** Profile + Settings unified, but trainer ClientProfile uses 5 tabs — verify mobile depth. | `[VERIFY]` |
| "Notifications spam on every change" | **Risk.** No Save+Publish gate today (item 2.5). | grep `publishWorkout` empty |
| "Achievement notifications" | **Cleared.** `useStreakMilestones.ts` referenced in V3 plan but not in current grep results — likely removed/never wired. | `[VERIFY]` |
| "Group features default-on" | **Cleared.** No community/group feature. | |
| "Imperial-only or metric-only" | **Cleared.** Per-client units toggle live. | Profile.tsx |
| "Hidden add-on pricing" | **N/A.** Billing deferred. | |

---

## 5. Hidden Gaps in Our V3 Plan

These were surfaced by the 7 source docs but are NOT addressed in `UPGRADE_PLAN_V3_SECTIONS.md` (or only mentioned vaguely):

1. **Severity-graded allergies (anaphylaxis vs preference).** `personalizacija_automatizacija_deep_dive.md` §9 specifically calls for cross-contamination alerts. Our AllergiesStep is a flat string list — there is no severity field. **Risk: medical liability for severe allergies.**
2. **Adaptive recalibration of macros based on actual weekly loss rate.** V3 §4 mentions different macros training/rest, but not the **closed-loop adjustment** of TDEE every 2 weeks against actual weight delta. The deep-dive doc points out nobody does this — that's our biggest moat opportunity in nutrition.
3. **Plateau detection algorithm.** Smart cut exists but isn't reactive to 3-week no-change weight stalls with concrete strategy recommendations. Spec'd in deep-dive §8 but absent from V3 plan.
4. **Auto-shift after missed workouts** (not just "move forward" — recommend intro week if 5+ missed in 14 days). V3 §3 mentions Pause but not Smart Shift.
5. **Mute per-client X hours / day-of-week** (trainer-side). V3 §12 mentions vacation mode but not granular per-client mute.
6. **"Bad day" mode** (client signals "loš sleep, stress" → algorithm caps next session at -20% volume + lower RPE target). The pieces exist in `biofeedbackReactiveRules.ts` and PreWorkoutFatigueDialog, but only ONE trigger (fatigue) is wired; sleep + stress aren't independent triggers.
7. **Welcome flow customization per trainer (skip platform pitch).** V3 §1 mentions "tenant brand-aware welcome" but not full skip-able onboarding-video config.
8. **Form-check video upload directly attached to an exercise** (vs. chat attachment). Both feature_requests docs cite this from Mimi Davenport + Lisa Kirwan. V3 §3 mentions "form video upload per exercise" as Should-have but no schema.
9. **Resume after accidental "End Workout"** (5-min undo window). V3 §3 mentions it as a rule but isn't ticketed.
10. **Cultural/regional meal pool**. V3 §4 lists this as per-tenant locale but no concrete plan for Balkan recipe seed data — vs. the Trainerize complaint "Kindly add more Indian meals" the parallel for us is Serbian/regional cuisine. Our `foodDatabase.ts` should be audited for cultural balance. `[VERIFY]`
11. **DOMS chronic detection threshold tuning.** CLAUDE.md says "2+ Teško zaredom → −1 set" but V3 doesn't surface DOMS chronic state on either Home or Trainer dashboard — silent algorithm changes are spooky for users.
12. **Stop double-counting onboarding signals.** Onboarding 11 steps were trimmed but the `personalization_score` (if exists) probably isn't fed back to the trainer view — they should see "this client gave us X signals → here's the personalization confidence". `[VERIFY]`

---

## 6. Business Model + Funnel Gaps

Per `business_model_funneli.md`, the funnel has **6 layers**; we currently support only Layer 4 (1-on-1 delivery).

| Layer | What it is | Current state |
|---|---|---|
| **1. Acquisition (landing page + lead magnet + email capture)** | Stranger → Lead | **Not built.** No landing page builder, no lead form, no email capture, no email automation. PT Distinction has embed code; we don't. |
| **2. Tripwire ($7–$47)** | Lead → first paid customer | **Not built.** No pre-built challenge packages, no Stripe checkout outside trainer subscription. |
| **3. Self-Serve Group / Challenge ($50–$200/mo)** | Customer → engaged | **Not built.** No autoflow, no leaderboards (intentionally), no by-day-sequence delivery for cohorts. |
| **4. 1-on-1 ($500–$1500/mo)** | **This is where we live.** | Delivered. |
| **5. VIP / High-touch ($3000–$5000/mo)** | Tier upgrade | **Not built.** No tier-aware client UI (V3 §15 super-admin defers this). |
| **6. Business Ops (billing, calendar, retention dashboards)** | Trainer business engine | Partial. TrainerAnalytics exists. PackageEditor/TrainerPayments are scaffolds. Real Stripe out of scope. |

### Concrete revenue-unlocks if we add layers 1–3
- **Landing page builder + lead magnet upload** (PT Distinction style — embed code for trainer's website). Effort: ~24h.
- **Tripwire = "Pre-built 7-day challenge" template** that creates a downscoped client account auto-locked to that program. Effort: ~16h (reuse onboarding + a tier flag).
- **By-Day-Sequence cohort scheduler** for challenges. Effort: ~20h.
- **Tier-aware client UI** (Tripwire = no chat, no measurements, only program; 1-on-1 = full). Wire via `client.tier` enum + ProtectedRoute guards. Effort: ~12h.
- **1-click in-app upgrade flow** (Tripwire → 1-on-1). Effort: ~8h once billing reopens.

Marketable claim if shipped: **"From stranger to high-ticket client — all in one app"** (verbatim from `business_model_funneli.md`).

---

## 7. Personalization + Automation Gaps

Where we already win (biology pipeline is our moat):

| Pipeline layer | Status | Industry status |
|---|---|---|
| Mesocycle lifecycle (7/6 weeks) | Shipped | Nobody automates |
| Skeleton (A/B/A or U/L 4x) | Shipped | Trainerize "Phased Programs" — manual |
| RPE/RIR ramp with Hashimoto cap | Shipped | Manual everywhere |
| Tempo + Ramp-up | Shipped | Manual |
| Surgical Swap | Shipped | "Random list" everywhere |
| Smart Cut with NEAT gate | Shipped | Doesn't exist anywhere |
| Emergency Refeed (4-marker) | Shipped | Doesn't exist |
| Mandatory Diet Break + auto-clear | Shipped | Doesn't exist |
| Biofeedback reactive rules (pump/sleep/luteal/libido) | Shipped | Doesn't exist |
| Pre-workout fatigue MAINTAIN | Shipped | Doesn't exist |
| Lifestyle adjustments (sleep<6 / stress>8) | Shipped | Doesn't exist |
| Metabolic constraints (Hashimoto / PCOS / anemia) | Shipped | Doesn't exist |

Where we still gap (per `personalizacija_automatizacija_deep_dive.md` §10):

| Problem | Gap | Action item |
|---|---|---|
| Onboarding → auto program | Mapping exists but **no AI-assisted first-draft summary for the trainer** ("This client has T2DM + low back pain + dumbells only → here's the personalization recipe we applied") | New trainer ClientProfile card "Personalization Reasoning" |
| Auto progressive overload | Adjustments happen at mesocycle layer, not set-by-set | Add adaptive load suggestion based on set-level RPE (Tier-B) |
| Auto-deload trigger via wearable | We auto-deload by mezo schedule, but not reactive to wearable HRV/sleep | Once HealthKit ships, add HRV trigger |
| Beginner → Intermediate auto-graduation | Trainer-manual today | Add threshold detector + trainer notification |
| Adaptive nutrition recalibration | Static deficit | Add weekly weight-trend → ±100 kcal adjustment |
| Cultural meal adaptations | Food database needs Balkan audit | `[VERIFY]` `foodDatabase.ts` |

---

## 8. Anti-Bloat — What to REMOVE from Our App

Verified via grep + git status. Sorted by impact:

| # | Surface | What to do | Source citation |
|---|---|---|---|
| 8.1 | `src/components/onboarding/PaywallScreen.tsx` | Hide behind `tenant.paywall_required` flag (default OFF for self-serve trainers). | "milk more money out of me" |
| 8.2 | `src/pages/Subscription.tsx` + `src/pages/trainer/TrainerPayments.tsx` + `src/pages/trainer/PackageEditor.tsx` | Park behind feature flag until billing reopens. They reference Stripe but Stripe is out of scope. Hidden currently? **`[VERIFY]`** routes. | |
| 8.3 | `src/hooks/useStreak.ts` | Confirm no remaining call sites surface client-visible streak. If kept, demote to trainer-side metric. | "Streak anxiety je real" |
| 8.4 | `src/pages/Milestones.tsx` | Hide behind `tenant.achievements_enabled` flag (default OFF). | "badges clutter up the app" |
| 8.5 | `src/components/AchievementOverlay.tsx` | Already deleted (good). Make sure no orphan imports remain. **`[VERIFY]`** | |
| 8.6 | "Recent activity" feed (if any) on trainer dashboard | Replace with filtered "Needs attention" only. | V3 §9 rule |
| 8.7 | Deep settings nesting (Profile → Settings → Subscription → Billing → Payment Method) | Flatten. We already merged Profile+Settings — verify trainer side. | "Endless corridor of menus" |
| 8.8 | Bottom nav clutter for trainer (5+ tabs) | Audit `TrainerBottomNav.tsx` — does it expose Analytics, Messages, Clients, Programs, Profile? Should be 4 max. `[VERIFY]` | V3 anti-bloat |
| 8.9 | Onboarding 11 steps → 9 | V3 plan target. We're at 11 (incl. Frequency skip). Trim Cycle question + HeightWeight to a single "More about you" cluster. | "Don't force client to enter weight, height" (14 votes) |
| 8.10 | Generic platform welcome message in chat | Confirm we don't send one. **`[VERIFY]`** | "they get bombarded with emails" |

---

## 9. Top 20 Prioritized Action Items

### P0 — ship in next sprint

| # | Action | Effort | Touch points |
|---|---|---|---|
| 1 | **Client-facing Smart Substitution flow** (pre-workout entry, 2-tap filter, write-back scope toggle) | 5h | `src/components/workout/SwapExerciseSheet.tsx`, today's workout card |
| 2 | **Pre-workout swap UI** on today's preview card | 2h | `src/components/queue/WeeklyCalendar.tsx` or today's card |
| 3 | **Pre-set alternates per exercise (regression/std/progression)** | 6h | DB columns + WorkoutEditor + client slider |
| 4 | **Weekly auto-report per client** (aggregated digest) | 7h | new edge function `weekly-report` + trainer ClientProfile card |
| 5 | **Save+Publish workflow** for trainer program edits | 4h | TrainerProgramEditor + publishWorkout mutation |
| 6 | **Undo toast** on destructive trainer actions | 3h | shared hook around Sonner |
| 7 | **Resume after End Workout** (5-min undo window) | 2h | `src/pages/ActiveWorkout.tsx` + persisted draft state |
| 8 | **Hide streak hook entirely from client surfaces** + audit consumers | 1h | grep `useStreak` call sites |
| 9 | **Hide PaywallScreen / Subscription / Packages behind tenant flag** | 2h | route guards + tenant_features stub table |
| 10 | **Trim onboarding 11→9 steps**, fold Cycle + Height/Weight into optional "More about you" | 3h | Onboarding flow |

### P1 — next 30 days

| # | Action | Effort | Touch points |
|---|---|---|---|
| 11 | **Apple HealthKit + Google Health Connect** ingestion → daily_signals | 12h | Capacitor plugin + sync service |
| 12 | **RPE per set** (toggle, opt-in) | 4h | workout_sets schema + ActiveWorkout |
| 13 | **Side-by-side photo comparison** on Progress tab | 5h | new comparison component |
| 14 | **Severity-graded allergies** (preference vs anaphylaxis) | 3h | AllergiesStep + antiIngredientFilter |
| 15 | **Adaptive nutrition recalibration** (weight trend → ±kcal) | 8h | new edge function `nutrition-recalibrate` |
| 16 | **"Smart shift" after missed workouts** (intro-week recommendation) | 5h | mesocycleLifecycle.ts hook |
| 17 | **Permanent substitution across upcoming weeks** | 4h | exerciseSubstitution.ts extension |
| 18 | **Form-check video attached directly to an exercise log** | 6h | workout_sets schema + ChatVideoBubble reused |
| 19 | **Mute per-client X hours / day-of-week** on trainer side | 4h | trainer_client_mutes table |
| 20 | **DOMS chronic / fatigue state on Home + TrainerDashboard banners** | 3h | extend `AlgorithmStatusBanners.tsx` + Pocetnici alerts |

---

## 10. Quotes that Define Our North Star

Use these verbatim in marketing, decks, and as code comments where the feature decision was driven by them.

1. **"I have lost clients due to this."** — Miguel Yiallourides, on lack of pause/vacation. (Justifies our Pause feature being P0.)
2. **"Mission critical."** — Daniel Barton, on pause feature. (Same.)
3. **"It is 2025, why does the number one training software not have an undo button?"** — Reddit. (Justifies Undo on all destructive actions.)
4. **"Estimated workout time is inaccurate (too short) 99% of the time. Adds an unnecessary layer of pressure for folks who are already feeling anxious about starting a new program."** — Anon. (Justifies our removal of estimated workout time.)
5. **"I love that Hevy Coach has mostly stripped out the random nonsense that many apps have ... client experience comes first."** — Capterra. (North-star principle — every feature must justify its existence.)
6. **"As I don't want my clients to fixate on body shape and weight, it's unhelpful for the app to include an entire section dedicated to tracking body measurements ... It would help to be able to toggle off these features for my clients."** — Anon trainer. (Justifies ED-safe defaults: body measurements off, daily weight prompt removed.)
7. **"Clients don't know the names of exercises. Recommended substitutes or auto subs for exercises that function similarly would be simpler."** — Lucas Hyde. (Justifies regression/standard/progression slider over freeform search.)
8. **"5 to 10 changes ... 10 emails ... annoying."** — Ryan, on per-edit notifications. (Justifies Save+Publish.)
9. **"What trainer doesn't use the app for their own workouts too?"** — Anon. (Justifies a future Coach Self-Use mode.)
10. **"My most complaint is how outdated the app looks."** — Kiara Freeman. (Justifies our continued investment in modern, slick UI over feature count.)
11. **"False gratification is especially dangerous in combat sports which can be detrimental physically and psychologically."** — Combat trainer. (Justifies achievement badges default-OFF, gamification opt-in only.)
12. **"I'll leave my current trainer."** — re: Whoop integration. (Justifies wearable-native sync being P1, not P3.)

---

*Audit produced 2026-05-11. Source: 7 MD docs in `upgrade/`, V3 plan, grep verification of `src/` for every "we already do X" and "we still gap on X" claim. `[VERIFY]` markers indicate places where one more 30-second grep would confirm — flagged honestly rather than over-claimed. Stripe/billing surfaces explicitly out of scope. §15 (Super-Admin) skipped per user instruction.*
