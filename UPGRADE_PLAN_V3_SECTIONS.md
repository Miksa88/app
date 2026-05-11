# Upgrade Plan V3 — Per-Section Anti-Bloat Blueprint

> Source: 7 MD u `upgrade/` (master_8020, feature_requests_real_users, feature_requests_real_feedback, sta_je_visak_komplikovano, personalizacija_automatizacija_deep_dive, business_model_funneli, fitness_saas_analiza). User-voice citati su verbatim.
> Approved P0 features: **Custom notes per exercise** + **Pause workout button**.
> Stripe/billing iskljuceno.
> Cilj: max UI/UX, single source of truth, anti-bloat per sekciji.

---

## Univerzalna pravila (sve sekcije)

1. **Jedan PageTitle po stranici** — koristi `src/components/PageTitle.tsx`. Nikad multiple H1, nikad nested page headers.
2. **Sva primarna CTA = `GradientButton`** (`src/components/GradientButton.tsx`). Sekundarni = `ui/button` ghost. Nikad ne koristi inline gradient classes.
3. **Maksimum 3 kartice po viewport-u na mobile-u**. Ako ima vise — prebaci u `QueueStrip` ili horizontalni scroll.
4. **Notifikacija = Save+Publish model**. Trener edituje slobodno; klijent je obavesten samo na `Publish` (citat: "5 to 10 changes ... 10 emails ... annoying" — Ryan).
5. **Nijedna animacija ne traje > 250ms**. Confetti i thumbs-up SAMO na mezo-end / weekly milestone, nikad na svaku akciju.
6. **Sve "broj" + "kontekst" = `StatCard` ili `CircularProgress`** — ne sirovi `<div>` brojevi.
7. **Bottom sheet za sve mid-session interakcije** (`ui/bottom-sheet`). Dialog samo za destruktivne akcije. Modal skoro nikad.
8. **Per-tenant flag ako feature ima > 1 user-voice citat za "toggle off"**. Tabele: `tenant_features`, `client_features`. Default = OFF za sve sto se javilo kao ED/privacy rizik (body measurements, streaks, achievements).
9. **Klijent NIKAD ne vidi periodization terminologiju** ("Mesocycle 1 of 3"). Trener vidi. Klijent vidi "Sedmica 2 / Faza Build".
10. **Estimated workout time = banned**. Citat: "inaccurate (too short) 99% of the time. Adds an unnecessary layer of pressure."
11. **Sve destruktivne akcije imaju Undo** (toast sa "Vrati" 5s). Citat: "It is 2025, why does the number one training software not have an undo button?"
12. **i18n keys u `LanguageContext` — nikad hardcoded srpski/engleski u JSX**.

---

## 1. Onboarding (klijent)

### User-voice signali iz MD-ova
- "Don't force client to enter weight, height etc." (14 votes) — Klijent, `feature_requests_real_users.md`
- "You can't switch off the walkthrough video that every client sees ... mentioning of diet plans is not applicable to many trainers so can be confusing" — Trener, `sta_je_visak_komplikovano.md`
- "the mentioning of diet plans is not applicable to many trainers so can be confusing for the client" — Trener, `sta_je_visak_komplikovano.md`
- "When I sign on a new client, they get bombarded with emails coming from all different software" — Trener, `master_8020_sinteza.md`
- "Custom Onboarding (pre-workout, ne walkthrough) — niko savrseno" — `master_8020_sinteza.md`

### MUST HAVE
- Goal + Experience + DoB + Limitations + Allergies + Metabolic (Hashimoto/PCOS/anemia) — feed algoritma
- Cycle question = SKIP-able (one tap "Ne pratim")
- Height/weight = optional polja sa "Dodacu kasnije"
- Permissions step (notifications + health) sa "Mozda kasnije"
- Tenant brand-aware Welcome (logo trenera, ne platform logo)

### SHOULD HAVE (per-tenant flag)
- Custom intake pitanja po treneru (max 5, multiple-choice ili kratak text)
- Stress/sleep baseline pitanja (default ON jer hrane algoritam)
- Paywall screen (off ako trener bira "self-serve")

### VISAK trenutno u app-u
- `src/components/onboarding/PaywallScreen.tsx` — visak za free-trial trenere — **HIDE BEHIND FLAG** `tenant.paywall_required`
- `src/components/onboarding/CycleTrackerStep.tsx` — vec optional ali default-on — **SIMPLIFY** na default-skip + jedan tap "Pratim"
- `HeightWeightStep.tsx` zahteva oba — **SIMPLIFY** na opciono (citat: "Don't force client to enter weight")
- `ProcessingScreen.tsx` traje 4s sa "AI analiza" textom — **SIMPLIFY** na max 1.5s, bez fake-AI teksta

### Simplifikacije
- 16 koraka -> 9 koraka (Welcome, Goal, Experience, DoB, Limitations, Allergies, Metabolic, Permissions, Done). Cycle / HeightWeight / Sleep / Stress su **opciono i u jednoj "More about you" kartici**.
- Sleep + Stress = jedna stranica (slider + slider) umesto 2 odvojene
- ScrollWheelPicker SAMO za DoB, ne za sve numericke unose

### General design rules
- Svaki step = jedan ekran, jedan PageTitle, jedan GradientButton "Dalje"
- Gornji indikator progressa = tanak bar, ne brojevi (2/16 demotivise)
- "Skip" link uvek vidljiv u top-right za neobavezne korake
- Bez auto-advance (klijent uvek tapne "Dalje")
- Validation inline, ne dialog
- Maksimum 3 polja po ekranu

### Trainer perspective
- Trener bira u `TrainerProfile` koja pitanja su required vs optional
- Trener gleda completed onboarding kao "Intake Summary" karticu na `ClientProfile` (ne raw form fields)
- Trener moze custom welcome message umesto generic ("Custom welcome — niko savrseno" iz MD-a)

---

## 2. Home (klijent dnevni hub)

### User-voice signali
- "core UX and visual design is so bad. If it weren't for respecting my trainer I would have bolted long ago" — Klijent, `feature_requests_real_users.md`
- "Why is my home page a giant list of mostly old workouts and future dates that aren't relevant?" — Alex Braica, `feature_requests_real_users.md`
- "Hevy: Compared to other apps, they're either too confusing or have too many bells and whistles that confuse clients" — `master_8020_sinteza.md`
- "It's a simple and easy dashboard ... clean app with UI" — Hevy review, `master_8020_sinteza.md`

### MUST HAVE
- "Sta je za danas" — top kartica (workout title + 1-tap Start)
- AlgorithmStatusBanners (mezo / smart cut / refeed / diet break) — vec postoji u `src/components/algorithm/AlgorithmStatusBanners.tsx`, drzi
- Today's nutrition summary (mini ring sa kcal + protein) — link ka Food
- WeeklyCalendar strip (vec postoji `src/components/queue/WeeklyCalendar.tsx`)
- One-tap "Pause" akcija (priblizi P0 Pause workout button)

### SHOULD HAVE (per-tenant flag)
- `MonitoringCarousel` — bio-feedback signali — drzi ali toggle za bake/casual klijente
- `WhyTodayPanel` — algorithm explanation — toggle (neki klijenti ne zele to)
- Goal countdown (`GoalEventCard`) — toggle

### VISAK trenutno u app-u
- `src/components/home/PromoteBanner.tsx` — tier promotion banner — **HIDE BEHIND FLAG** `tenant.tier_promotions_visible` (citat: "Just trying to milk more money out of me")
- `src/components/home/ProgressOutlookCard.tsx` — predicts kg loss — **SIMPLIFY** ili HIDE (rizik wrong-prediction; sliccno "estimated workout time")
- Multiple kartica skroluju vertikalno bez prioriteta — **SIMPLIFY** na fiksan vertical order: Today's workout > Today's nutrition > AlgorithmBanners > rest
- `useStreak.ts` + `useStreakMilestones.ts` — streak counters — **HIDE BEHIND FLAG** (default OFF, citat: "Streak anxiety je real")
- Confetti iz `ConfettiCelebration.tsx` na non-mezo akcije — **SIMPLIFY** trigger samo na completion mezociklusa

### Simplifikacije
- 6+ kartica trenutno -> 3 kartice + 1 carousel
- WeeklyCalendar i Today's workout mogu biti jedna komponenta (calendar sa expanded today)
- QuickPauseSheet (`src/components/home/QuickPauseSheet.tsx`) = preferred ulazna tacka za pause umesto skrivenog Settings linka

### General design rules
- Hero kartica = max 30% viewport-a
- Boje: status koristi 4 nivoa (zelena/zuta/narandzasta/crvena) — nikad vise
- Bez animacija na scroll (samo PageTransition wrapper)
- Greetings tekst SAMO ako tenant ima `home.greeting_enabled` — default OFF
- Bez "Did you know" eduPopup-a

### Trainer perspective
- Trener ne gleda klijent home; ima svoj dashboard
- Toggle "Sta klijent vidi na Home" = pre-set predloga (Minimal / Default / Full)

---

## 3. Gym / Training (klijent workout flow)

### User-voice signali
- "11.599 GLASOVA: Smart Exercise Substitution" — `feature_requests_real_feedback.md`
- "10.841 GLASOVA: Custom Text Notes per Exercise — Create a text box field for exercise notes (seat height/posture notes/etc)" — `feature_requests_real_feedback.md`
- "I myself have had a couple situations in which I can't finish a workout because I need to take a call ... There should be a way to pause" — Klijent, `feature_requests_real_users.md`
- "There is no way to resume a workout if you accidentally hit the button to end it" — Klijent
- "Estimated workout time is inaccurate (too short) 99% of the time" — `sta_je_visak_komplikovano.md`
- "Allow clients to swap an exercise BEFORE they start the workout, not during" — `master_8020_sinteza.md`

### MUST HAVE
- Active workout with set-by-set logging (postoji `src/pages/ActiveWorkout.tsx`)
- **Pause/Resume workout** (P0) — pauzira tajmer, lock state
- **Custom notes per exercise** (P0) — text field carry-over na sledeci trening, vidljiv tokom workouta (ne kao gigantska poruka)
- Smart Exercise Substitution (vec — `exerciseSubstitution.ts` + `SwapExerciseSheet.tsx`)
- Pre-workout substitution (na today's workout kartici, pre Start)
- 3-tier picker (regression / standard / progression) — UI overlay ako trener postavi alternative
- PostWorkout 3-button feedback (Lako/Taman/Tesko)

### SHOULD HAVE (per-tenant flag)
- Voice cues — default OFF, opt-in (citat: "complaints about the new voice and countdown lady")
- RPE per set — toggle (povercoach default ON, kazon default OFF)
- Form video upload per exercise (TrueCoach-style, citat Mimi Davenport)
- Animal-weights post-workout fun — toggle, default OFF za serious clients

### VISAK trenutno u app-u
- Estimated workout time prikaz (ako postoji u `ActiveWorkout.tsx`) — **KILL** (citat: 99% inaccurate)
- `AchievementOverlay.tsx` na svaki set/exercise PR — **HIDE BEHIND FLAG** `tenant.achievements_enabled` (default OFF). Citat: "false gratification ... dangerous in combat sports"
- Confetti na completion svakog seta — **KILL**, samo na completion celog workouta (i to opt-in)
- `PreWorkoutFatigueDialog.tsx` — drzi ali ne forsiraj na svaki workout (1x dnevno max, vec je tako)

### Simplifikacije
- Workout summary i completion sada moguci u 2 ekrana — spojiti u 1 (Done sheet sa Lako/Taman/Tesko + opcioni komentar)
- SwapExerciseSheet i 3-tier picker = ista komponenta sa 2 mode-a
- "Don't have equipment / hurts my X" = jedno dugme u SwapExerciseSheet (ne dva odvojena flow-a)

### General design rules
- Set row = 3 polja max (reps, weight, RPE-opciono). Notes su collapsable below.
- Tap-and-hold za bulk akcije (npr. copy last set), ne nested menu
- Pause dugme = top-right ikon, uvek dostupan, never hidden
- Resume after End Workout = uvek mozes (5min undo window) (citat: "no way to resume a workout if you accidentally hit End")
- Rest timer veliki broj, ne huge yellow box (citat: "Why are the yellow pause icons that show rest time so massive?")
- Print-friendly view svakog workouta (PDF download) — za starije klijente

### Trainer perspective
- Trener vidi log u ClientProfile sa diff-om planirano vs ostvareno
- Trener moze "Substitute permanently" na exercise (citat: "auto-fill in ALL upcoming workouts")
- Trener postavlja pre-set alternates u ProgramEditor
- Trener vidi "Custom notes" tab u ClientProfile (sve klijent's notes per exercise across vreme)

---

## 4. Food / Nutrition (klijent meal flow)

### User-voice signali
- "I want to exclude some ingredients, if my client doesn't like banana I should be able to exclude it" — Trener, `master_8020_sinteza.md`
- "We should be able to ... customize the macronutrient ratios depending on the client. It's a little frustrating" — Registered Dietitian, `feature_requests_real_users.md`
- "Pumpkin smoothie with a side of artichoke and salmon mouse for breakfast is a bit intimidating" — Ben Cross, `feature_requests_real_users.md`
- "Most clients are saying they want to do a full week's shop for food so a 7 day plan is essential" — Dom Thorpe, `feature_requests_real_users.md`
- "It would be great to set up different macro and calorie intake goals for different days out of the week" — `feature_requests_real_feedback.md`

### MUST HAVE
- Daily macro ring (kcal + protein/carbs/fats)
- Today's meal list (predlozeno + logged)
- Auto-suggest macro-similar zamena (vec u `Food.tsx`)
- ExtraMealSheet (vec) za off-plan / restoran
- 7-day meal view + Shopping list (vec `src/pages/Shopping.tsx`)

### SHOULD HAVE (per-tenant flag)
- Hydration tracker — toggle (P0+1, voda intake — high client votes)
- Photo log meals (klijent slika obrok)
- Different macros training vs rest day (vec u algoritmu, treba UI surface)
- Cultural meal pool (regional dishes) — per-tenant locale

### VISAK trenutno u app-u
- `RecipeVideoSheet.tsx` ako video nije custom-uploaded — **SIMPLIFY** (drzi za recepte koji imaju video, sakrij dugme za one bez)
- Strict pre-set macro splits — **SIMPLIFY** ka custom slider per gram (citat dietitian)
- Nutrition templates lista koja moze biti prazna i crash-ovala je app — **vec fixed** u recent commit, drzi
- Force-required ingredient log — **SIMPLIFY** ka opciono (klijent moze samo "I ate it" toggle)

### Simplifikacije
- MealPlan + Food + Shopping = 3 stranice. Mogu biti 2: Food (today + week toggle) + Shopping (auto-derived)
- "Dodaj jelo" + "Zameni jelo" sheets = ista komponenta sa mode prop

### General design rules
- Macro ring = jedna velika centralna komponenta, ne 4 mala broja
- Zelena/zuta/crvena samo za delta vs target, ne za apsolutne vrednosti
- Recept = max 6 ingredient by default; "Show all" za vise
- Pre-built meals imaju "Cook time" badge (samo ako < 30 min ili > 30 min — bez precise minute)
- Allergen badges uvek vidljivi (icon + boja) na svakom receptu

### Trainer perspective
- Trener postavlja: macro target (gram-level), allergens, ingredient blacklist, cuisine pool
- Trener vidi adherence % u ClientProfile (per nedelja, ne per dan)
- Trener moze override "Auto-suggest" sa custom meal za specifican dan

---

## 5. Progress (klijent progress tracking)

### User-voice signali
- "**As I don't want my clients to fixate on body shape and weight, it's unhelpful for the app to include an entire section dedicated to tracking body measurements**, weight, body fat %, progress photos etc. It would help to be able to toggle off these features for my clients" — Trener, `sta_je_visak_komplikovano.md`
- "Definitely need the option to disable parts of the body stats screen. My clients do not need to be promoted to measure their limbs every day" — Martin Voslar, `sta_je_visak_komplikovano.md`
- "How are side-by-side comparison photos not a feature enabled on desktop yet? ... low-hanging fruit" — `feature_requests_real_users.md`
- "Trainerize prompts to take three pictures and has clients cut off their lower half. Allow trainer to select poses" — `master_8020_sinteza.md`
- "weekly avg or total for the week is a much better target" — `feature_requests_real_feedback.md`

### MUST HAVE
- Weekly check-in entry (`WeeklyCheckIn.tsx` — vec)
- Weight rolling 7-day average (ne raw daily)
- Workout consistency view (kojih X od Y workouta zavrseno)
- AnalysisReport (vec) — algoritamski insights

### SHOULD HAVE (per-tenant flag)
- Progress photos sa configurabilim pose-ovima — toggle, default 1-2 pose
- Body measurements (do 3 sites max) — toggle, default OFF
- Side-by-side photo comparison
- Energy / mood / luteal flag indicator (samo ako cycle tracking on)

### VISAK trenutno u app-u
- 12-site body measurement form ako postoji — **HIDE BEHIND FLAG** `tenant.body_measurements_enabled` (default OFF; citat Martin Voslar)
- Forced weight prompt na svakom check-in-u — **SIMPLIFY** ka opciono "Skip ovu nedelju"
- Hardcoded 3-pose photo prompt — **SIMPLIFY** ka 1 default pose, trener konfigurise
- Body fat % field — **HIDE BEHIND FLAG** (default OFF)

### Simplifikacije
- Progress = single page sa tabs (Workout / Body / Photos), ne 3 odvojene stranice
- Daily weight prompt -> weekly only (citat: "weekly avg ... much better target")

### General design rules
- Apsolutne vrednosti SAMO sa trend ikonom (gore/dole/horizontalno) — nikad gola brojka
- Photos su privatne by default; trener mora explicit grant access
- Bez % body fat unless dietitian-tier tenant
- Side-by-side default 4 weeks gap, ne weekly

### Trainer perspective
- Trener vidi rolling avg + delta, ne raw daily
- "Don't show photos to me" toggle (za muske trenere sa zenskim klijentima — privacy)
- Trener konfigurise pose-ove i frekvenciju
- Trener vidi `RedFlagsSection` (vec `src/components/queue/RedFlagsSection.tsx`)

---

## 6. Profile / Settings (klijent)

### User-voice signali
- "Allowing clients to weigh in stone and lbs. Most of clients say this is one thing they don't like" — `master_8020_sinteza.md`
- "Per-client unit preference (kg/lb/stone, cm/in, °C/°F)" — `master_8020_sinteza.md`
- "Clients should be able to self-pause their subscription without having to contact us" — `feature_requests_real_users.md`
- "Default audio voice ... Always plays - Choose or mute" — `sta_je_visak_komplikovano.md`

### MUST HAVE
- Edit profile (name, photo, contact)
- Units toggle (kg/lb, cm/in)
- Notification preferences (granular: workout reminder, meal reminder, trainer message, system)
- Pause subscription / Vacation mode (klijent self-pause)
- Language picker
- Logout

### SHOULD HAVE (per-tenant flag)
- Privacy controls (hide weight from trainer, hide photos)
- Equipment list (TrueCoach-style)
- Equipment auto-filter na workout (ako klijent kaze "no rack" workout filtrira)
- Theme (dark mode toggle — high client votes)

### VISAK trenutno u app-u
- `TierBadge.tsx` ako pokazuje upsell — **SIMPLIFY** na statusni badge bez "Upgrade" CTA-a (citat: "Just trying to milk more money out of me")
- Subscription page sa marketing copy — **SIMPLIFY** na clean status + pause/cancel
- Settings sub-menus duboko nested — **SIMPLIFY** na flat list

### Simplifikacije
- Profile + Settings = jedna stranica sa sections (ne odvojene)
- Notification preferences = 5 toggles, ne nested kategorije
- Language picker = inline, ne novi screen

### General design rules
- Settings koristi `InsetGroupedList` (`src/components/ios/InsetGroupedList.tsx`) za consistency
- Destruktivne akcije (logout, cancel sub) = na dnu, crvene, sa confirm
- Bez accordion za < 5 stavki — samo flat lista
- Avatar upload uvek opciono

### Trainer perspective
- Trener vidi klijent pause status u TrainerClients
- Trener moze da forsira određene postavke (npr. metrics units) u TrainerProfile

---

## 7. Chat (klijent ↔ trener)

### User-voice signali
- "**Disable chat option!!**" — `sta_je_visak_komplikovano.md`
- "Have a way to have the messenger option shut off for people who are paying just to go through a program but do not have access to trainer.. i NEED this feature!" — `sta_je_visak_komplikovano.md`
- "Mute certain client message notifications. Some clients send numerous messages throughout the day" — Trener
- "Saved Replies / Snippets — coach kuca slash, dobija meni svojih saved replies" — `master_8020_sinteza.md`
- "threaded replies — keeps communities alive" — `feature_requests_real_users.md`

### MUST HAVE
- 1:1 chat trener-klijent (vec `useMessages.ts` + `Chat.tsx`)
- Read receipts
- Push notification opt-in
- Image / form video sharing

### SHOULD HAVE (per-tenant flag)
- Chat enabled/disabled per tenant (`tenant.chat_enabled`) i per client (`client.chat_enabled`)
- Voice memo
- Saved replies / snippets (trener)
- Vacation auto-reply (trener)

### VISAK trenutno u app-u
- Auto-system messages od platforme — **KILL** (citat: "Some of my clients do NOT like the automated messages")
- "Trener je online" status indicator ako postoji — **HIDE** (anxiety za klijenta + privacy)

### Simplifikacije
- Threaded replies = NICE-TO-HAVE Faza 4, ne MVP
- Single chat per pair (no group chat MVP)

### General design rules
- Chat bubble dizajn = `ui/card` token, ne custom
- Bez emoji picker (system keyboard radi)
- Bez "typing..." indicator (privacy + battery)
- Bez auto-scrolling, klijent kontrolise

### Trainer perspective
- Trener Messages page sa 4 status kategorija (`feature_requests_real_users.md` — Trainerize "Needing Attention"): unread / awaiting / 3+ days quiet / OK
- Trener moze mute per-client na X sati
- Saved replies sa "/" command

---

## 8. Milestones / Achievements (klijent gamification)

### User-voice signali
- "I need the option to turn off these badges for my clients. They clutter up the app and aren't necessary to motivate my clients. I do that through data" — `master_8020_sinteza.md`
- "False gratification is especially dangerous in combat sports which can be detrimental physically and psychologically" — `master_8020_sinteza.md`
- "Streak anxiety je real ... Streak je trener-side metric, ne klijent-side" — `master_8020_sinteza.md`
- "PR animations su za serious lifters ... Početnik koji prvi put radi squat sa 20kg dobija PR animaciju → demotivišuće" — `master_8020_sinteza.md`

### MUST HAVE
- Mezo completion celebration (jedan, na kraju 6/7 nedelja)
- Personal best history (data view, ne animacija)

### SHOULD HAVE (per-tenant flag)
- Achievement badges (default OFF) — toggle za "fun" trenere
- Streak counter (default OFF, klijent-side)
- Animal-weights post-workout fun (default OFF)

### VISAK trenutno u app-u
- `src/pages/Milestones.tsx` kao stand-alone klijent page — **HIDE BEHIND FLAG** `tenant.achievements_enabled`. Default OFF.
- `AchievementOverlay.tsx` triggerovan na svaki set/exercise — **SIMPLIFY** triggerovan SAMO na mezo end / weekly
- `useStreakMilestones.ts` notifications — **HIDE BEHIND FLAG**, default OFF
- ConfettiCelebration na svakoj milestoni — **SIMPLIFY** opt-in only

### Simplifikacije
- Cela sekcija ne mora da postoji za vecinu tenant-a — feature flag-irana
- Trener-side dashboard ima statistiku, klijent-side achievements su opcioni

### General design rules
- Bez popup-a koji blokira ekran
- Bez "X-day streak" velikih brojeva
- Achievement = static badge u Profilu, ne animation
- Bez "leaderboard" izmedju klijenata

### Trainer perspective
- Trener vidi PR / consistency stats u ClientProfile (data view)
- Trener bira da li su achievements vidljivi klijentu

---

## 9. Trener Dashboard (overview)

### User-voice signali
- "Coach dashboard pokazuje 🔴 klijent propustio 3+ workouta zaredom" — `master_8020_sinteza.md`
- "If a client misses more than 2 workouts in a row, the trainer should receive a notification" — `feature_requests_real_feedback.md`
- "It would be amazing to have a Weekly progress report ... easy to keep track of so we have the progress history" — `feature_requests_real_users.md`
- "I spend too much time trying to gather all information to conduct my weekly check-ins" — `feature_requests_real_users.md`

### MUST HAVE
- Client list sa color status (zelena/zuta/narandzasta/crvena)
- "Needs attention" feed (`AutoPilotFeed.tsx` vec — drzi)
- Today's check-in count + unread messages
- Quick "Add client"

### SHOULD HAVE (per-tenant flag)
- `PocetniciAlertsCard` (vec) — drzi za beginner-protocol trenere
- Trener self-use mode toggle (Coach mode — citat: "What trainer doesn't use the app for their own workouts too?")
- Custom widgets per trainer

### VISAK trenutno u app-u
- `TrainerFreeTrial.tsx` ako je upsell-heavy — **SIMPLIFY** na status banner only
- Multi-trainer / team features ako postoje — **HIDE BEHIND FLAG** za solo trenere
- `TierPromoteSheet.tsx` u dashboard-u — **HIDE** dok ne dođe do limita

### Simplifikacije
- Dashboard = 3 sekcije: Status grid (top) / Attention feed / Today's tasks. Sve drugo = u sub-pages.
- "Recent activity" feed je suvise sirov; zameni sa filterovan "Needs attention"

### General design rules
- Status boje konsistentno: zelena = OK, zuta = miss < 3, narandzasta = miss 3+, crvena = quit risk
- Klikom na klijent grid = `ClientProfile` (single tap, ne dialog)
- Bez sparkline grafova na main dashboard (idu u Analytics)
- Trener home je dense (vise informacije po inch-u nego klijent home)

### Trainer perspective
- Trener moze toggle "Compact / Full" view
- Vacation mode (citat: "Trener je na pauzi") = banner na dashboard-u + auto-reply chat-u

---

## 10. Trener Client Management (per-client views)

### User-voice signali
- "Equipment tab per client (knows what client has at home/gym)" — TrueCoach, `master_8020_sinteza.md`
- "Pause/Freeze klijenta — Saved client = saved revenue" — `master_8020_sinteza.md`
- "I have lost clients due to this" (pause) — `feature_requests_real_feedback.md`
- "switch quickly from a client's calendar to another client's calendar, via arrows/drop down menu" — `feature_requests_real_users.md`
- "Exercise Comment History — Past komentari na exercise vidljivi tokom workouta" — `master_8020_sinteza.md`

### MUST HAVE
- ClientProfile sa tabs: Overview / Program / Nutrition / Progress / Chat / Notes
- Pause/Freeze client (button) — pauzira workouts + messages, sets resume date
- Equipment tab (TrueCoach-style, auto-filters exercise picker)
- Quick swap to next client (arrows top of page)
- Trainer notes (private, never visible to client)

### SHOULD HAVE (per-tenant flag)
- Custom check-in form per client type
- Client tag system (e.g. "weight loss" / "comp prep")
- Photo gallery sa privacy controls

### VISAK trenutno u app-u
- `SyncRulesOverrideSection.tsx` — overrides bio-feedback rules — **HIDE BEHIND FLAG** advanced (only power-user trenere)
- Hardcoded check-in form (jedna verzija za sve) — **SIMPLIFY** ka customizable per client type
- Multiple program assignments u parallel — **SIMPLIFY** na 1 main + 1 add-on max

### Simplifikacije
- AssignProgram, AssignNutrition, AssignPackage = mogu biti jedan "Onboard client" wizard
- ClientProfile + Chat + Notes mogu biti tabs umesto odvojene stranice

### General design rules
- ClientProfile uvek otvara Overview tab
- Sve actions (pause, message, edit program) = sticky button bar at bottom
- Notes = chronological feed sa search
- Bulk akcije (e.g. "Send to 5 clients") na ClientList, ne ClientProfile

### Trainer perspective
- Pause = jedan klik, modal sa "Until when" (date picker + "Indefinite") — citat: "Right now we apply a 100% discount in order to pause"
- "Switch to next client" arrows pri vrhu — citat user-voice
- "Mark as priority" flag

---

## 11. Trener Program Builder (workout/nutrition templates)

### User-voice signali
- "drag-and-drop builder, %1RM auto-progression, and 1,000+ exercise video library make it one of the strongest workout programming tools available" — Everfit, `master_8020_sinteza.md`
- "Clients don't know the names of exercises. Recommended substitutes or auto subs for exercises that function similarly would be simpler" — Lucas Hyde, `feature_requests_real_feedback.md`
- "Have it so workout templates show in a column on a left-side bar with a client's calendar open on the main screen" — `feature_requests_real_users.md`
- "It would be ideal to be able to see how a client has performed in the past for each exercise (if they have already done an exercise) ... when the program is being built" — `feature_requests_real_feedback.md`

### MUST HAVE
- WorkoutEditor sa drag-and-drop ordering (vec, drzi)
- ExercisePicker sa filter (vec) — dodaj equipment + injury filter
- Pre-set alternates per exercise (regression / standard / progression)
- Tempo + RPE/RIR inputs (vec algoritam ima)
- Save reusable sections (warm-up template inserted in many programs)

### SHOULD HAVE (per-tenant flag)
- AI Workout Builder (`feature_requests_real_users.md` — kontekstualan AI)
- Master Programs sa Live Sync
- Multi-phase programs (vec mezociklus)
- Percentage-based lifting per client (auto-calc 1RM)

### VISAK trenutno u app-u
- Generic exercise library bez curation — **SIMPLIFY** na ~150 kuratorano (citat Amber Springer: "declutter the workout library")
- Multiple disabled / draft programs — **SIMPLIFY** na "Active" + "Archive" jedino
- ProgramTargeting feature ako postoji (vec git-deleted, drzi tako)

### Simplifikacije
- WorkoutEditor + ProgramEditor = mogu biti jedan editor sa zoom-in/zoom-out
- ExercisePicker + ExerciseDetail = single screen sa side panel detail

### General design rules
- Drag-and-drop MORA raditi na mobile (citat: "Recently it seems that the drag and drop ... no longer works ... deletes the exercise")
- Direct typing in progression boxes (citat: regression after Trainerize update — ne ponavljaj gresku)
- Auto-save every change, undo button uvek dostupan
- Pre-set alternates UI = inline na exercise card, ne nested menu
- Exercise history vidljiv u builder-u (mini chart by exercise per client)

### Trainer perspective
- Drag-and-drop kao primarni input (Everfit-style)
- Save section / template
- "Apply this exercise change to all upcoming weeks" toggle (citat: "substitute for all upcoming workouts")

---

## 12. Trener Messaging Center

### User-voice signali
- "Mute certain client message notifications. Some clients send numerous messages throughout the day" — `master_8020_sinteza.md`
- "Saved Replies / Snippets — coach kuca slash" — `master_8020_sinteza.md`
- "Trainer 'Vacation Mode' — auto-reply, notifikacije se queue-uju" — `master_8020_sinteza.md`
- "When clients currently complete their check-in forms, there is no notification sent to the trainer" — `feature_requests_real_users.md`

### MUST HAVE
- Inbox sa unread / starred / archive
- Quick reply
- Saved replies (snippets)
- Mute per client (X sata / dana)
- Form completion notification

### SHOULD HAVE (per-tenant flag)
- Vacation mode (auto-reply)
- Message templates (welcome, weekly check-in, end-of-program)
- Voice memo

### VISAK trenutno u app-u
- Auto-system messages — **KILL**
- Forced "welcome" template na new client signup — **SIMPLIFY** na opt-in

### Simplifikacije
- TrainerMessages = jedna stranica sa tabs (Inbox / Sent / Drafts), ne odvojene
- Message + form completion notifs = jedan unified feed

### General design rules
- "/" = saved replies trigger
- Bulk reply = max 10 klijenata u jednoj akciji
- Bez "broadcast to all" bez confirmation
- Mute UI = clear indikator "Muted until 18:00"

### Trainer perspective
- Trener bira default notif behavior per kategorija
- "Quiet hours" 22:00-07:00 — push pauza

---

## 13. Trener Analytics

### User-voice signali
- "I spend too much time trying to gather all information to conduct my weekly check-ins. I would love to see a report showing how often they hit their protein, Calories, habits, workouts, walking" — `feature_requests_real_users.md`
- "Need this! Especially average calories per day. Many cycle or are flexible day to day and their weekly avg or total for the week is a much better target" — `feature_requests_real_feedback.md`
- "Daily and weekly reports to show clients progress in their workouts" — `feature_requests_real_users.md`

### MUST HAVE
- Weekly auto-report per client (avg kcal, macros, weight, workouts, adherence %)
- Roster overview (X klijenata aktivno, Y na pauzi, Z risk)
- Client retention metric (90-day cohort)
- Compliance heatmap

### SHOULD HAVE (per-tenant flag)
- Revenue/Stripe analytics — IGNORE (per user instructions, no billing)
- Step reports per period
- Custom date range exports

### VISAK trenutno u app-u
- Forced billing/revenue widgets — **KILL** (per instructions: no billing/Stripe in plan)
- Multi-trainer team analytics — **HIDE BEHIND FLAG** za solo

### Simplifikacije
- TrainerAnalytics = single page sa 4 sections: Roster / Adherence / Retention / Activity. Ne 4 odvojene stranice.

### General design rules
- Charts: bar + line + heatmap dovoljno (no pie, no radar)
- Default view = "This week"
- Export to CSV uvek dostupan
- "Drill down to client" klik na bilo koji data point

### Trainer perspective
- Trener postavlja sopstvene threshold-e za "OK / At risk / Critical"
- Auto-email digest (opt-in)

---

## 14. Notifications (push + in-app)

### User-voice signali
- "**Don't give a streak notification or any new screen pop up after I mark off something on my to do list**" — `master_8020_sinteza.md`
- "Having the popup everyday for every metric of reaching an achievement is annoying. Allow setting to turn off achievement notifications or to have it celebrate at ranges (every 5)" — `sta_je_visak_komplikovano.md`
- "5 to 10 changes ... 10 emails ... annoying" — Ryan, `master_8020_sinteza.md`
- "Some of my clients do NOT like the automated messages that the system sends out on its own. Can we turn it off?" — `master_8020_sinteza.md`

### MUST HAVE
- 5 categories: workout reminder, meal reminder, trainer message, system, achievement
- Per-category opt-in toggle (default = first 3 ON, last 2 OFF)
- Quiet hours (22:00-07:00 default)
- "Save vs Publish" model za program changes

### SHOULD HAVE (per-tenant flag)
- Custom notification copy per tenant
- Branded push templates

### VISAK trenutno u app-u
- Auto-emails on every program change — **KILL** (use Save+Publish)
- System messages u in-chat (citat: "automated messages from system") — **KILL**

### Simplifikacije
- Settings -> Notifications = flat list 5 toggles + quiet hours + sound choice
- Bez nested kategorija

### General design rules
- Default = OPT-IN za sve achievement / streak / system promo
- Default = ON za workout/meal/trainer message
- Push titles = lokalizovani (i18n)
- Bez emoji u push titles by default
- Test push opciono u Settings

### Trainer perspective
- Trener postavlja default templates klijent push notif
- Trener vidi delivery status u TrainerMessages

---

## 15. Super-Admin (multi-tenant control panel) — NEW

### User-voice signali
- "Single trainer per app, deljen codebase, per-tenant flags + theme" — UPGRADE_PLAN_V2.md (interno)
- "I make one change in the master template and it pushes to all 40 clients" — Everfit Live Sync, `master_8020_sinteza.md`
- "Custom branded apps" — `master_8020_sinteza.md`

### MUST HAVE
- Tenant list (CRUD)
- Per-tenant flag panel (toggle achievements / cycle / body measurements / chat / paywall / etc)
- Per-tenant theme (logo, primary color, secondary color, font)
- Per-tenant default language
- Per-tenant intake question editor
- Per-tenant client cap (info only, no billing)
- Audit log (ko-je-promenio-sta)

### SHOULD HAVE
- Tenant impersonation (debug mode — login as trener)
- Feature rollout staging (canary % of tenants)
- Tenant usage telemetry (no PII)
- Brand asset manager (logo, splash, push icon upload)

### VISAK
- Niko jos nije izgrađen — krenuti from scratch sa minimal CRUD

### Simplifikacije
- Single page sa tenant table + drawer za detail
- Flag toggles inline u tabeli (ne nested screens)

### General design rules
- Web-only (no mobile)
- Auth = separate Supabase role (`super_admin`)
- Sve mutations = audit log entry
- Bulk actions = max 50 tenants u jednom batch-u
- Bez vizuelnog gradient-a (admin = utilitarni, ne brand-driven)

### Trainer perspective
- N/A — trener nema pristup
- Trener vidi rezultat svojih per-tenant settings u sopstvenom Profile -> Brand sekciji

---

## Top 10 surplus features koje IMAMO ali bi trebalo izbaciti/hide

1. `src/components/AchievementOverlay.tsx` — triggerovan na svaki PR — **HIDE BEHIND FLAG** `tenant.achievements_enabled`. Razlog: combat sport / serious lifters citat "false gratification dangerous".
2. `src/components/home/PromoteBanner.tsx` — tier upsell na home — **HIDE BEHIND FLAG**. Razlog: "milk more money out of me" konsenzus.
3. `src/components/home/ProgressOutlookCard.tsx` — predvidja kg loss — **KILL ili HIDE**. Razlog: like estimated workout time, "wrong > absent".
4. `src/hooks/useStreak.ts` + `useStreakMilestones.ts` — streak counters — **HIDE BEHIND FLAG**. Razlog: "Streak anxiety je real ... trener-side metric".
5. Body measurements 12-site form (gde god je u Progress) — **HIDE BEHIND FLAG** + default 1-3 sites max. Razlog: ED-history konsenzus citat.
6. `src/components/onboarding/PaywallScreen.tsx` — vidljiv u svim tenants — **HIDE BEHIND FLAG** `tenant.paywall_required`. Razlog: self-serve trenere ne trebaju.
7. Hardcoded 3-pose photo prompts — **SIMPLIFY** na 1 default + trener konfigurise. Razlog: "cuts off lower half" Trainerize critique.
8. `src/pages/Milestones.tsx` kao default klijent route — **HIDE BEHIND FLAG**. Razlog: "badges clutter up the app".
9. Auto-system messages u Chat — **KILL**. Razlog: "automated messages from system - turn off".
10. Any "Estimated workout time" text u ActiveWorkout — **KILL**. Razlog: 99% inaccurate konsenzus.

---

## Top 10 simplifikacija koje bi imale najveci impact

1. **Onboarding 16 steps -> 9 steps** + opciono cluster ("More about you"). 7 fewer screens.
2. **Progress 3 pages -> 1 page sa tabs** (Workout / Body / Photos).
3. **MealPlan + Food + Shopping = 2 pages** (Food sa today/week toggle + Shopping auto-derived).
4. **ClientProfile + Chat + Notes = tabs unutar ClientProfile** (od trener-a side, izbacuje 2 navigation steps).
5. **AssignProgram + AssignNutrition + AssignPackage = jedan "Onboard client" wizard**.
6. **WorkoutEditor + ProgramEditor = jedan editor sa zoom levels**.
7. **WorkoutSummary + PostWorkout = jedan completion sheet** (Lako/Taman/Tesko + opciono komentar).
8. **SwapExerciseSheet + 3-tier picker = ista komponenta** sa mode prop.
9. **Profile + Settings = jedna stranica sa sections** (klijent strana).
10. **TrainerAnalytics 4 pages -> 1 page sa 4 sekcije** (Roster / Adherence / Retention / Activity).

---

## Quick wins (pod 2h rada svaki, sortirano po impact-u)

1. **Hide PromoteBanner ako tenant flag off** — `src/components/home/PromoteBanner.tsx`. ~30 min. Eliminises "milk money" anxiety.
2. **Default OFF achievements + streak feature flag** — `useStreak.ts`, `useStreakMilestones.ts`, `AchievementOverlay.tsx`. ~1h. Big anti-bloat win.
3. **Pause Workout button u ActiveWorkout** — `src/pages/ActiveWorkout.tsx`. ~1.5h. P0 approved.
4. **Custom notes field per exercise (carry-over)** — schema + `ActiveWorkout.tsx` + persistence hook. ~2h. P0 approved (10.841 votes).
5. **Estimated workout time removal** — grep i remove. ~30 min. Removes wrong-data anxiety.
6. **Skip-able Cycle question u onboarding** — `src/components/onboarding/CycleTrackerStep.tsx` default OFF. ~30 min.
7. **Optional weight/height u onboarding** — `HeightWeightStep.tsx`. ~45 min. Citat 14 votes.
8. **WeeklyCheckIn weight prompt = "Skip this week"** option — `src/pages/WeeklyCheckIn.tsx`. ~30 min.
9. **Quiet hours default 22:00-07:00 u notification settings** — Profile/Settings + push handler. ~1.5h.
10. **Save+Publish workflow za program changes** — TrainerProgramEditor, send notif samo na Publish click. ~2h. Eliminises "10 emails" frustration.
11. **Body measurements default OFF** + tenant flag — Progress page. ~1h. ED-friendly default.
12. **Replace Confetti triggers** — only mezo end + opt-in. `ConfettiCelebration.tsx` + call sites. ~1h.
13. **Equipment tab per client** — `ClientProfile.tsx` + filter na ExercisePicker. ~2h. TrueCoach parity.
14. **Trainer "Switch to next client" arrows** u ClientProfile header. ~1h.
15. **Saved replies / snippets ("/")** u Chat trainer side. ~2h. Scaling helper.

---

*Generated: 2026-05-10. Sources: 7 MD docs in `upgrade/`, 50+ verbatim user citations. Aligns with approved P0 (Pause workout + Custom notes per exercise). Multi-tenant SaaS lens. Stripe/billing excluded per user instructions.*
