# Upgrade Plan — fitbyivana

## Sinteza istraživanja (pet rečenica)

Sedam upgrade dokumenata se slažu oko jedne stvari: tržište coaching SaaS-a (Trainerize, TrueCoach, Everfit, MPH, PT Distinction, Hevy, Kahunas) je **bloated u onome što ne treba** (badges, walkthrough video, estimated time, upsell screens, forced periodization terminologija), a **prazno u onome što treba** (Pause/Freeze klijenta — open 8 god., Smart Substitution — open 11 god., Whoop/Oura/Samsung, custom macros po gramu, allergen filter, side-by-side foto compare, failed payment retry sa manual button, saved replies, equipment-aware exercise filter). Drugi makro signal: cela industrija je "delivery-first, funnel-blind" — niko ne pokriva acquisition → tripwire → tier upgrade flow u istoj app, treneri pegaju 5–7 alata za $130–$350/mo. Treći signal: klijenti različitih tier-ova zaslužuju različit UI (tripwire ≠ 1-on-1 ≠ VIP), a sve glavne platforme forsiraju uniform experience. Naš lokalni status: već imamo solidan **biology-precise algoritam za žene** (8-slojni pipeline, mezo/skeleton/RPE ramp/tempo/swap/smart-cut/refeed/diet-break) i deo Pause flow-a (`QuickPauseSheet`, `useStartPause`, `useEndPause`), Smart Swap (`SwapExerciseSheet`, `exerciseSubstitution.ts`), pre-workout fatigue dialog, weekly check-in, custom macro override po patologiji, anti-ingredient filter — što nas stavlja **ispred konkurencije po dubini algoritma**, ali iza po breadth-u (nema Stripe billing, nema wearable sync, nema tier-aware UI, nema funnel layer). Strategija: ne kopirati Trainerize bloat — iskoristiti naš algoritmički rov, dodati 10–12 critical missing features iz P0/P1 liste, i konsolidovati funnel u jednu app uz "stripped of the random nonsense" UI filozofiju.

---

## Šta IMAMO (verifikovano u kodu)

### Algoritam (jedinstvena prednost — niko od konkurencije nema)
- **8-slojni training pipeline** — `src/utils/training/{mesocycleLifecycle,queueBuilder,microcycleIntensity,tempoAndRampUp,exerciseSubstitution,programGenerator}.ts`
- **Smart Cut (3/4-step hierarchy + NEAT 10k gate)** — `src/utils/nutrition/smartCut.ts`, `supabase/functions/smart-cut-tick/`
- **Emergency Refeed (4-marker biofeedback)** — `src/utils/nutrition/emergencyRefeed.ts`
- **Diet Break logic (mandatory posle 4 mezo)** — `src/utils/training/mesocycleLifecycle.ts`
- **Biofeedback reactive rules (pump/sleep/luteal/libido)** — `src/utils/nutrition/biofeedbackReactiveRules.ts`
- **Pre-workout fatigue dialog (Umorna → MAINTAIN)** — `src/components/workout/PreWorkoutFatigueDialog.tsx`
- **DOMS chronic detection + RPE autoregulacija** — `src/utils/training/microcycleIntensity.ts`
- **Cycle phase macro adjustments** — `src/utils/nutrition/cyclePhase.ts`
- **Pathology macro override (Hashimoto/PCOS/anemia)** — `src/utils/nutrition/pathologyMacroOverride.ts`
- **Lifestyle adjustments (sleep <6h produžen mezo, stres >8 −20% volume)** — `src/utils/training/lifestyleAdjustments.ts`
- **Strength trend + week 8 evaluation (auto-graduate signal)** — `src/utils/training/{strengthTrend,week8Evaluation}.ts`

### Klijent surfaces
- **Home + Algorithm Status Banners** — `src/components/algorithm/AlgorithmStatusBanners.tsx`
- **Queue-based weekly calendar** — `src/components/queue/WeeklyCalendar.tsx`, `src/utils/training/weeklyCalendarMapper.ts`
- **Active workout sa set-by-set logging** — `src/pages/ActiveWorkout.tsx`, `useCompleteSet`
- **Post-workout 3-button feedback (Lako/Taman/Teško)** — `src/pages/PostWorkout.tsx`
- **Weekly check-in (težina, mere, energija, identitet, san avg, stres avg)** — `src/pages/WeeklyCheckIn.tsx`, `useWeeklyCheckIn`
- **Food / Meal Plan / Shopping / Recipe sheets** — `src/pages/{Food,MealPlan,Shopping}.tsx`
- **Off-plan / Extra meal log** — `src/components/food/ExtraMealSheet.tsx`
- **Anti-ingredient filter (allergen exclude)** — `src/utils/nutrition/antiIngredientFilter.ts`
- **Hydration tracking** — `src/hooks/useHydration.ts`, `src/utils/nutrition/hydration.ts`
- **Pause flow (delimično — workout-side)** — `src/components/home/QuickPauseSheet.tsx`, `useStartPause`, `useEndPause`
- **Swap exercise sheet (smart sub UI)** — `src/components/workout/SwapExerciseSheet.tsx`
- **Tier badge na profilu (visual)** — `src/components/profile/TierBadge.tsx`
- **i18n EN+SR** — `src/contexts/LanguageContext.tsx`
- **Streak + milestones + achievement overlay (toggle TBD)** — `src/components/AchievementOverlay.tsx`, `useStreak`

### Trener surface
- **Trener Dashboard + AutoPilot Feed + Pocetnici Alerts** — `src/pages/trainer/TrainerDashboard.tsx`, `src/components/trainer/{AutoPilotFeed,PocetniciAlertsCard,ClientWeekIndicator}.tsx`
- **Client profile + Tier promote sheet** — `src/pages/trainer/ClientProfile.tsx`, `src/components/trainer/TierPromoteSheet.tsx`
- **Workout/Program/Package/Nutrition Template editori** — `src/pages/trainer/{WorkoutEditor,ProgramEditor,PackageEditor,NutritionTemplateEditor}.tsx`
- **Add Client + Free Trial flows** — `src/pages/trainer/{AddClient,TrainerFreeTrial}.tsx`
- **Sync rules override** — `src/components/trainer/SyncRulesOverrideSection.tsx`
- **Trener Analytics + Payments + Messages** — `src/pages/trainer/{TrainerAnalytics,TrainerPayments,TrainerMessages}.tsx`

### Backend
- **27 migracija** uključujući user_status, packages+tiers, daily check-ins, weekly check-ins, progress photos, push subscriptions, swap matrix
- **`useWebPush` hook + push_subscriptions tabela** — `src/hooks/useWebPush.ts`, `src/lib/webPush.ts`
- **Edge functions cron-ovi** — smart-cut-tick, mesocycle-tick, signup-confirmed

---

## Šta NEMAMO (potrebno za upgrade)

### P0 — kritične (bez ovog ne može)

- **Stripe billing integration (real)** — Trener strana ima `TrainerPayments.tsx` UI ali nema Stripe Connect, subscription mgmt, failed-payment retry sa manual button. Master 80/20 § "TIER S #3", business_model § VIII. **Pristup:** Edge function `stripe-webhook`, `stripe-checkout-session`, klijent self-manage payment method preko Stripe Customer Portal. **Effort: L.**

- **Full Pause/Freeze (workouts + billing + messages)** — Imamo workout-side pauzu, ali ne pauzira billing niti mute-uje notifikacije/messages, nema "Resume on date X". Open request 8 god. kod konkurencije. Sinteza § "TIER S #4". **Pristup:** Proširiti `user_status` sa `pause_billing`, `pause_messages`, `resume_at`; dodati Stripe subscription pause API; trener-side toggle u ClientProfile. **Effort: M.**

- **Wearable sync (Apple Health → Garmin → Whoop → Oura → Samsung)** — Nemamo nijednu wearable integraciju. Samo `useHydration` i manual unos. § "TIER S #8". **Pristup:** Capacitor HealthKit plugin za iOS (Apple Health), Web API sa Garmin Connect/Whoop OAuth, Health Connect za Android (Samsung). Day-1 podrška za HRV/sleep/steps/cardio. **Effort: L.**

- **Failed payment retry + dashboard + manual button** — Nedostaje. § "TIER S, item #10 in feature_requests". **Pristup:** Stripe webhook → retry policy 1d/3d/7d, manual retry endpoint, trener-side "Failed Payments" tab. **Effort: M.**

- **Equipment tab per klijent (auto-filter exercise library)** — Nemamo. TrueCoach ima. § "TIER S #10". **Pristup:** Tabela `client_equipment`, integrisati u `exerciseSubstitution.ts` i workout builder filter. **Effort: S.**

- **Per-client toggle za sve features (anti-bloat)** — Nema centralnog `feature_flags` po klijentu. § "TIER S #9", sta_je_visak § VII. **Pristup:** `client_settings` JSONB sa toggle-ovima (body_measurements_visible, badges_enabled, periodization_terminology, weight_prompt, photo_poses_count). **Effort: M.**

### P1 — quick wins (visok ROI, mali effort)

- **Saved Replies / Snippets (trener)** — Nema. Everfit ima, scaling killer. **Pristup:** `message_snippets` tabela, "/" autocomplete u `TrainerMessages`. **Effort: S.**

- **Side-by-side photo comparison (4w/8w/12w slider + overlay)** — `progress_photos` tabela postoji ali nema compare UI. **Pristup:** `PhotoCompareSheet.tsx` u Progress, trener vidi u ClientProfile. **Effort: S.**

- **Pre-workout exercise substitution (swap PRE start)** — `SwapExerciseSheet` postoji ali samo mid-workout. Klijent ne može da otvori sutrašnji workout i swap-uje. **Pristup:** Reuse sheet u `WeeklyCalendar` next-session preview. **Effort: S.**

- **Permanent substitution kroz ceo program** — Trenutni swap je per-session. Open 11 god. kod Trainerize. **Pristup:** "Swap u svim sledećim sesijama" toggle na `useSwapNextSessions` (već postoji hook!), proširiti scope. **Effort: S.**

- **Coach Self-Use Mode** — Nemamo. Trener ne može da koristi app za svoje treninge bez taking up slot. § "TIER S #12". **Pristup:** `is_coach_self_user` flag na profile, u trener-side prikaži "My Workouts" tab koji koristi isti queue/algoritam. **Effort: S.**

- **Print workout PDF / Print-friendly view** — Nema. Stariji klijenti. **Pristup:** PDF generator (jsPDF) + print stylesheet za workout day. **Effort: S.**

- **Multi-account toggle (kao Instagram)** — Nema. Gen Z and trener-koji-su-i-klijenti deal-breaker. **Pristup:** Supabase auth multi-session, account switcher u Profile. **Effort: M.**

- **Check-in form notifikacije + review tab + "Mark as reviewed"** — `WeeklyCheckIn` postoji ali trener ne dobija push. **Pristup:** Reuse `useWebPush`, dodati `reviewed_at` polje + trener "Pending Check-ins" tab. **Effort: S.**

- **Save vs Publish model za program edits** — Trenutno svaka izmena trigeruje notifikaciju (verovatno; treba verifikovati). § "ANTI-FEATURE #13". **Pristup:** `is_draft` flag na programu, "Publish changes" CTA. **Effort: S.**

- **Imperial/Metric toggle per klijent (kg/lb, cm/in)** — Trenutno samo metric. **Pristup:** `unit_preference` u profilu, helper `formatWeight/Length`. **Effort: S.**

- **Custom macro split by gram (ne samo %)** — Postoji macro split logic ali samo kao ratio. RD-class pain point. **Pristup:** Slider u trener nutrition template editoru — toggle "% vs grams". **Effort: S.**

- **Different macros training vs rest day** — Nema. Standardna stvar koja se traži decenijama. **Pristup:** `macro_targets` po `day_type` (training/rest/refeed) u nutrition template. **Effort: M.**

### P2 — large bets (značajan razvoj)

- **Tier-aware client UI (Tripwire / Self-Serve / 1-on-1 / VIP)** — Imamo `TierBadge` ali ne i različit UI/access po tier-u. § "Glavni nalaz #2 business_model". **Pristup:** `tier_features_matrix` definicija, `useTierAccess` hook gating sekcija (chat, custom macros, weekly call). **Effort: L.**

- **In-app tier upgrade flow (1-click)** — Nema. § "Glavni nalaz #3". **Pristup:** `UpgradeBanner` u home, Stripe subscription change endpoint, automatska promena tier-a + welcome flow novog tier-a. **Effort: L.**

- **Funnel layer (landing page builder + lead magnet + email automation + tripwire payment)** — Cela acquisition strana. Nedostaje. § Layer 1+2 business_model. **Pristup:** Posebna marketing-page route (`/coach/:slug`), integracija sa Resend/Postmark za email drip, Stripe Checkout za tripwire. **Effort: XL.** Možda v2/v3.

- **Group / Challenge programs sa Autoflow-style automation** — Imamo individual queue. Nemamo group challenge engine. Everfit dominira ovde. **Pristup:** `challenge_programs` (master programa sa "By Day Sequence"), grupni leaderboard (opt-in), broadcast messages. **Effort: L.**

- **Trener task / to-do / follow-up reminder sistem** — Nema. Open Trainerize request od 2020. **Pristup:** `trainer_tasks` tabela, "Today's Follow-ups" widget na TrainerDashboard. **Effort: M.**

- **Weekly auto-generated client reports** — Trener ručno gleda. Open request. **Pristup:** Cron koji generiše PDF/email summary (avg težina/macros/training count/compliance) → trener dobija svaki Sunday. **Effort: M.**

- **Movement screen / video annotation tools** — Nema. PT Distinction strong. Premium positioning. **Pristup:** Video upload, frame-by-frame annotation, "red flag" tagovi. **Effort: L.** V3.

- **AI workout builder sa context (multiple workouts + history)** — Nemamo AI generator (algoritam je rule-based). § "TIER B". **Pristup:** Anthropic API edge function koji koristi naš `programGenerator.ts` kao constraint. **Effort: L.** V3.

- **Multi-language proširenje (de, es, it, ru, hr, bs, mk)** — Imamo en+sr. EU expansion. **Effort: M.**

- **Threaded community / group chat (Skool-style)** — Nemamo. **Effort: L.** V3.

- **Cue up next training plan automatski** — Posle završenog mezo, automatski startovati sledeći. Open since 2014! **Pristup:** Već imamo `mesocycleLifecycle.ts` — proširiti sa `next_program_id`. **Effort: S–M.**

---

## Šta je VIŠAK (može da se izbaci ili skriti iza toggle-a)

- **Achievement badges / `AchievementOverlay` po default-u ON** — § "ANTI-FEATURE #1, sta_je_visak DEO B item 2". **Akcija:** Premestiti za toggle, default-OFF; minimalan badge set (3–5 max), bez "false gratification" za svaku sitnicu.

- **`ConfettiCelebration` posle svake mikro-akcije** — § "ANTI-FEATURE #2". **Akcija:** Samo za major events (završen mezo, prvi 1RM PR sa flag-om "intermediate+"). Ne za logging vode, ne za completed set.

- **Forced periodization terminology u klijent UI** — Klijentkinja koja hoće da gubi 5kg ne treba "Mezociklus 1 od 3". § "ANTI-FEATURE #9". **Akcija:** Hide "Mezociklus N" od klijenata sa goal=weight_loss, low experience; trener vidi puno; klijent vidi "Nedelja 3 od 7".

- **Hardcoded body measurement obsesija** — § "ANTI-FEATURE #3", sta_je_visak DEO B item 1. ED/postpartum klijenti. **Akcija:** Per-client toggle "Body measurements section visible" (default ON, ali trener može gasiti za ED sensitive klijente). Default na 2-3 polja umesto 12.

- **Streak counter vidljiv klijentu** — § "VIŠAK #9 sta_je_visak DEO F". **Akcija:** Streak je trener-side metric; klijent vidi "Konzistentnost: 80% ove nedelje" umesto "30-day streak".

- **PR notifikacije za SVE klijente (default)** — Početnik koji prvi put diže 20kg ne treba PR animaciju. § "VIŠAK #10". **Akcija:** Toggle, default OFF za beginner experience level, ON za intermediate+.

- **Mock data i deletovani UI components** — Mnogo `_*.test.tsx` i `mockData.ts`. **Akcija:** Cleanup pred production launch (već je u toku — vidim deleted files u git status).

- **Generic onboarding walkthrough video (ako postoji)** — § "ANTI-FEATURE #4". **Akcija:** Skip-able u 3s; nikad ne forsirati edukativni video pre prvog korišćenja.

---

## Šta treba UPGRADE-ovati (postoji ali nedovoljno)

- **Pause flow** — `QuickPauseSheet` postoji za workout-side pauzu. **Cilj:** Full Pause Mode (workouts + billing + messages + auto-resume on date). Treba dodati Stripe subscription pause + push mute + `resume_at` field + klijent self-pause toggle.

- **Smart Substitution Engine** — `SwapExerciseSheet` + `exerciseSubstitution.ts` postoje, dobro. **Cilj:** Dodati (1) muscle group + movement pattern filter UI, (2) trener pre-set alternates per exercise (regression/standard/progression slider), (3) pre-workout swap iz next-session preview, (4) "swap permanently" opcija za sve buduće instance.

- **Check-in system** — `WeeklyCheckIn` jak. **Cilj:** Dodati (a) push notifikaciju treneru pri completion, (b) "Pending Check-ins" tab sa "Mark as reviewed", (c) custom check-in forme po tipu klijenta (per-natal/post-natal/hybrid), (d) automated weekly Sunday delivery.

- **Tier system** — `TierBadge` + `usePackages` postoje. **Cilj:** Tier-aware UI (Tripwire klijent vidi minimal UI, VIP vidi sve), 1-click in-app upgrade, Stripe subscription change automatic.

- **Notifications** — `useWebPush` postoji. **Cilj:** Per-client + per-event opt-in matrix (notification batching, "Save vs Publish" za izmene programa, mute-able iz coach side).

- **Equipment awareness** — `exerciseSubstitution.ts` ima logiku, ali nema klijent profil ground-truth o tome šta klijent ima. **Cilj:** Equipment tab → workout builder filtrira automatski + swap engine zna šta da nudi.

- **Allergen filter** — `antiIngredientFilter.ts` postoji ali samo na nivou ingredient. **Cilj:** Severity grade (intolerance vs anaphylaxis), per-client master allergy list u onboarding-u, hide u meal generator-u.

- **Custom macros** — Logic postoji preko pathology override. **Cilj:** Slider po gramu (ne samo %) + različiti dani (training/rest/refeed) + RD-friendly UI.

- **Progress photos** — Tabela postoji, fali compare UI. **Cilj:** Side-by-side overlay (kao Kahunas), pose consistency overlay, privacy toggle (trener ne vidi ako je flagged).

- **Trener push notifikacije za priority alerts** — `PocetniciAlertsCard` postoji. **Cilj:** Push (ne samo in-app card) za 🔴 missed 3 workouts, 🟠 program ending, 🟡 macros not logged 3d.

- **Rest day/Pause workout button mid-session** — `ActiveWorkout` ima logging. **Cilj:** "Pause workout" za interrupcije + "Resume after End Workout" recovery (Trainerize bug koji ne smemo da imamo).

---

## Predloženi redosled rada (faze)

### Faza 1: Quick wins (1–2 nedelje)

1. **Saved Replies / Snippets** za trener messages (S)
2. **Side-by-side photo comparison sheet** (S)
3. **Pre-workout swap iz Weekly Calendar preview** (S)
4. **"Swap u svim sledećim sesijama" toggle** (S, hook već postoji)
5. **Equipment tab per klijent** + auto-filter integracija (S)
6. **Mark check-in as reviewed + trener push notif** (S)
7. **Anti-bloat audit:** premestiti badges/confetti/streak na toggle, default-OFF za beginner & ED-flagged klijente (S)
8. **Imperial/Metric per klijent toggle** (S)
9. **Print workout PDF view** (S)
10. **Coach Self-Use mode toggle** (S)

### Faza 2: P0 kritične (3–4 nedelje)

1. **Stripe billing integration** (Connect + Customer Portal + checkout edge function) (L)
2. **Full Pause/Freeze klijenta** (workouts + Stripe subscription pause + message mute + resume date) (M)
3. **Failed payment retry sistem + manual retry button + dashboard** (M)
4. **Per-client feature flags / toggle matrix** (centralni anti-bloat sistem) (M)
5. **Save vs Publish model** za program edits (S)
6. **Custom macros by gram + training vs rest day macros** (M)

### Faza 3: P1 ROI (2–3 nedelje)

1. **Wearable sync — Apple Health (Capacitor HealthKit) + Garmin Connect** (L)
2. **Multi-account toggle** (M)
3. **Tier-aware client UI** (gating po tier-u) (L)
4. **Trener task / follow-up sistem** (M)
5. **Weekly auto-report (PDF + email)** (M)
6. **Cue up next training plan auto** (S–M, lifecycle već postoji)
7. **Custom check-in forme (per-natal, hybrid, online)** (M)

### Faza 4: P2 large bets

1. **In-app tier upgrade flow (1-click + Stripe subscription change)** (L)
2. **Whoop + Oura + Samsung Health Connect (Android)** (L)
3. **Group / Challenge programs + Autoflow-style automation + leaderboard (opt-in)** (L)
4. **Funnel layer:** landing page builder + lead magnet + email drip + tripwire (XL — možda kao standalone v2)
5. **AI Workout Builder sa context (Anthropic + naš algoritam kao constraint)** (L)
6. **Movement screen video annotation** (L)
7. **Threaded community (Skool-style)** (L)
8. **Multi-language proširenje (de, es, it, ru, hr/bs)** (M)

---

## Risk flags / odluke koje user treba da donese

1. **Pricing model:** Flat unlimited (My PT Hub-style) vs per-klijent (Trainerize-style). Sinteza preporučuje flat — anti-growth-penalty. **Odluka tvoja: koji model za fitbyivana?** (Ako je B2C — single subscription, jasno; ako B2B trener — flat preporučujemo.)

2. **B2C only vs B2C+B2B:** Imamo trener dashboard. Da li trenirice (Ivana + ostali certified women's coaches) dobijaju ozbiljan B2B alat ili je trener layer samo za Ivanu (single-tenant)? Ovo menja prioritet funnel layer-a.

3. **Stripe Connect (multi-trener) vs Stripe Standard (Ivana only):** Ako je single-tenant, Stripe Standard je dovoljan. Ako multi-tenant, Connect je obavezan i blokira P0 #1.

4. **Wearable priority:** Whoop i Oura zahtevaju OAuth + paid API; Apple Health (HealthKit) je free preko Capacitor. **Predlog:** Apple Health prvo (najlakše), Garmin drugo (free OAuth), Whoop/Oura tek kad treningu klijenata budu zahtevali HRV-based deload triggering.

5. **AI Workout Builder vs naš rule-based generator:** Naš `programGenerator.ts` je već biology-precise. AI sloj treba da bude **iznad** algoritma (LLM koji kalibrira parametre, ne piše program), inače razbijamo USP. **Odluka:** Ne praviti generic AI workout builder, već "AI Coach Assistant" koji objašnjava algoritamske odluke klijentima na njihovom jeziku.

6. **Group/Challenge funkcionalnost vs jedinstveni 1-on-1 fokus:** fitbyivana je 1-on-1 women's app sa preciznim algoritmom. Group challenges narušavaju personalizaciju. **Predlog:** Skip Faza 4 group programs ako pozicija ostaje "premium 1-on-1 women's coaching".

7. **Tier-aware UI vs uniform UX:** Ako fitbyivana ostaje single-tier ($X/mo full access), Faza 4 #1 nije potrebna. Ako planira tripwire ($27 challenge) → low-touch ($197 program) → 1-on-1 ($497/mo) ladder, **mora da se napravi.**

8. **Funnel layer (landing/lead magnet/email/tripwire):** Najveći undelivered job-to-be-done u celoj industriji, ali XL effort. **Pitanje:** Da li je fitbyivana app-first (delivery layer, marketing radimo eksterno) ili coach business OS (sve u jednom)? Ovo definiše da li Faza 4 #4 ide na roadmap ili ne.

9. **Cleanup deletovanih komponenti:** Git status pokazuje masivnu deletion od shadcn-ui komponenti i nekoliko legacy fajlova. Treba **commit-ovati** to čišćenje pred početak Faze 1, da se ne meša sa novim radom.

10. **Coach (Ivana) self-use vs separate trener app:** Ivana sigurno koristi sopstvenu app. Ako trener self-use mode nije implementiran, Ivana sad pravi "fake klijenta" — što i konkurencija mrzi. **Predlog:** Faza 1 #10 je urgent.
