# Deo 2: Dubinska Analiza Personalizacije i Automatizacije
## Kako konkurenti rešavaju (ili NE rešavaju) ključne slučajeve "personalized at scale"

**Cilj:** Razumeti šta se dešava ispod marketinga. Trener kaže "personalizovano za svakog klijenta" ali u praksi se pita kako tačno platforma rešava: onboarding podaci → program, automatska progresija, deload, supstituciju jela, alergene, povrede, metaboličke bolesti, missed workout, prelazak početnik→napredni, kalkulaciju kalorija/makroa.

**Glavni nalaz:** Većina ovih problema nije rešena algoritamski — rešena je **ručno od strane trenera** sa "alatima koji ti pomažu da brže to uradiš". Pravi automation je tek u povojima.

---

## 1. Onboarding podaci → automatska personalizacija programa

### Kako radi tipičan flow:
1. Klijent popunjava intake formu (PAR-Q, ciljevi, oprema, povrede, hrana koja im se ne sviđa)
2. Trener čita formu (često ručno)
3. Trener kopira "master program" template
4. Trener ga ručno modifikuje za tog klijenta

### Stvarno stanje po platformi:

#### **Trainerize**
- **Šta tvrdi**: AI Workout Builder "uses real client data — pulls workout history, goals, cardio, and equipment for smarter outputs"
- **Šta stvarno radi**: Pri pokretanju AI iz client profile-a, AI dobija ograničen kontekst:
  - Pol, godine, težina (ne ime)
  - Workout istoriju
  - Cardio istoriju
  - Equipment listu
  - Goals
- **Šta NE radi**: Ne pulluje povrede iz consultation form-e, ne pulluje alergije, ne uvažava metaboličke bolesti automatski
- **Trener i dalje mora**: Da napiše prompt manuelno sa povredama ("client has lower back pain"), da pregleda i izmeni rezultat
- **Kvalitet**: "Treat the output as a strong first draft, not a finished product"
- **Limitacija**: Nije moguće generisati više workouts u istoj konverzaciji, conversation history se ne čuva

#### **Everfit**
- **AI Workout Builder**: Slično — daje text prompt sa exercise format-om
- **Onboarding ne pulluje automatski u program**: Trener gleda informacije i ručno pravi
- **Live Sync feature**: Kad menja master program, menja se kod svih asignovanih klijenata istovremeno (rešenje za "scale" problem)
- **Autoflow**: Programa se isporučuje na "By Day Sequence" ili "By Exact Date" — ali ne menja se po klijentu, samo po datumu

#### **PT Distinction**
- **AI Assistant** za workout i nutrition
- **Custom assessments** dizajnirani da se rezultati uvažavaju u programu (movement screen → contraindicated exercises)
- **U praksi**: Trener i dalje vidi rezultate i ručno selektuje šta da promeni

#### **My PT Hub, HubFit, Kahunas, TrueCoach**
- Forme za intake postoje
- AI assistant na nekima
- **Ali nijedan ne mapira automatski "klijent ima dijabetes type 2 → ovi nutrition targets, ovi exercises izbegavaj"**

### Stvarna situacija: PROBLEM #1 OTVOREN
**Niko ne radi pravo "rule-based" mapiranje onboarding podataka u program.** Sve je trener-driven sa AI assist-om za prvi nacrt. To znači:
- Trener mora da zna šta da pita
- Trener mora da prevede "low back pain" u "izbaci good morning, deadlift, bent over row"
- Trener mora da prevede "diabetes" u "moderate carb timing, no sugar spikes"

**Prilika za tebe**: Strukturirani onboarding sa expert system-om ("ako klijent kaže X, onda automatski tagiraj Y exercises kao contraindicated, postavi macro target Z").

---

## 2. Automatska progresija (progressive overload)

Ovo je možda najveća iluzija u industriji. "Automatska" je samo donekle.

### Tri pristupa:

#### A) %1RM Auto-Progression (Everfit, Trainerize, PT Distinction, Hevy Coach)

**Kako radi:**
1. Trener postavi 1RM (ili klijent estimira putem testa)
2. Trener napiše program u procentima: "Bench 4×8 @75%"
3. App auto-popunjuje težinu iz 1RM × 0.75
4. Klijent diže — ako lakše ide, sistem auto-update-uje 1RM (Everfit npr. kaže: "As your client lifts increasing weight... we auto-calculate and set the client's 1RM with the new maximum")

**Šta NE radi:**
- Ne odlučuje samostalno: "ovaj je dosegao plateau, treba mu deload" — to je trener
- Ne predviđa: "ovaj trening je previše težak, smanji volume" — opet trener
- Ako klijent uzme pauzu, **trener ručno mora resetovati 1RM** ("Below you can find 2 easy methods to do so" — kaže Everfit help)

#### B) "Progression Editor" (Trainerize)
**Kako radi:**
- Trener postavi "Strength Training A" za svaki ponedeljak 4 nedelje
- Otvara progression editor i ručno menja reps/weight svake nedelje (npr. 8, 8, 6, 5 reps, 70 → 75 → 80 → 85kg)
- App ne odlučuje sam koliko treba povećati

#### C) Linear / Custom (TrueCoach, My PT Hub, ostali)
- Trener kopira workout i menja vrednosti za sledeću nedelju ručno
- Nema automatskih pravila

### Šta korisnici kažu:
> "Most platforms support progressive overload tracking by logging performance data set by set, but the coach still reviews trends and updates programs. Some platforms are adding AI suggestions based on logged data, but **this remains an emerging capability in 2026**" — Trainerize blog

> "The trainer reviews trends and updates programs" — to je istina za 2026. NIKO još nema pravu auto-progresiju koja "razume" da li klijent treba da povećava load, volume, intenzitet ili da ide na deload.

### Konkretan primer šta nedostaje:
Ako klijent radi 4×8 bench press @ RPE 8 ove nedelje, šta se dešava sledeću?
- **Idealno**: AI vidi "RPE 8, all reps completed, no failed sets" → predlaže +2.5kg ili +1 rep
- **Realno na svim platformama**: Trener gleda log, sam odlučuje, ručno upisuje sledeću nedelju

### Prilika za tebe:
Pravi adaptive progression engine sa pravilima:
- Ako 3 set-a x targeted reps završeno na RPE ≤7 → +load
- Ako 2/3 set-a završeno → drži load, fokus na formu
- Ako 1/3 → smanji load 10%
- Ako 4 nedelje istog plateau-a → suggest deload

Ovo niko ne pravi sistematski. To može da bude tvoja core killer-feature.

---

## 3. Deload nedelje

### Šta tvrde platforme:
- "Phased programming" (Trainerize)
- "Periodization" (PT Distinction)
- "Mesocycles, microcycles" (industrijska terminologija)

### Šta stvarno rade:
- **Trener mora ručno da ubaci deload week** kao posebnu fazu u program
- **Niko nema "auto-deload trigger"** koji se aktivira na osnovu fatigue/RPE/missed workouts
- Trainerize Master Programs imaju "phases" — trener postavlja "Week 1-3 hard, Week 4 deload" kao template. Ali template ne prilagođava kad treba dеload.

### Standardna industrijska praksa (koju trener mora da unese):
- 3 weeks on / 1 week off (najjednostavnije)
- Every 6-8 weeks
- Variabilna na osnovu signala

### Šta nijedna platforma ne radi:
- **Auto-detect overtraining**: pad performansi 2 nedelje u nizu, povećan resting heart rate (sa wearable-a), loš sleep, opadajući RPE → "preporučujemo deload"
- **Auto-reschedule**: kad klijent napravi 5 missed workouts u 2 nedelje, predloži intro/deload week umesto da samo "shift forward"

### Prilika:
Built-in fatigue detection algoritam koji koristi wearable podatke (HRV, sleep, resting HR), workout completion rate, i RPE da automatski predlaže deload. Niko to nema.

---

## 4. Missed workouts i pauze (vacation, bolest, lenjost)

Ovo je **najveći otvoreni problem** u industriji prema Trainerize Idea Forum-u — request star skoro 10 godina.

### Trainerize approach:
- **2 mode-a klijenta**:
  1. "Strict": Trener kontroliše scheduling. Klijent može reschedule-ovati ali ne i delete. Missed = "missed" status.
  2. "Flexible": Klijent može sve.
- **Ne postoji "shift entire program" dugme**: ako klijent propusti nedelju, trener mora ručno move-ovati sve workouts.
- **Klijenti pišu na forumu već 10 godina**: "It is incredibly irritating that you can't restart a program to the current date" (May 2022)
- **Pause payment**: Postoji feature request od 2018 za pause/freeze/prorate billing kad klijent ide na vacation. **I dalje nije implementirano** kako se traži.

### Industrija u celini:
- **Niko nema "Pause client" toggle** koji:
  1. Pauzira workouts
  2. Pauzira/produžava billing
  3. Pauzira reminder messages
  4. Po vraćanju, restartuje od dana pauze (ne fixed dates)

- **Niko ne radi smart shift**: ako klijent ima 4-week program i propusti workout 3, šta se dešava sa workouts 4, 5, 6, 7? Da li svi pomeraju za 1 dan? Ili samo 4? Ili ostaju ali on radi 3 sledećeg dana?

### TrueCoach, Everfit, ostali:
Sličan problem. Klijent prepusti — koach mora ručno reschedule.

### Trainerize jedno nedavno rešenje (jul 2025):
**AI workout recommendations** koji predlažu termine na osnovu klijentovih navika. Korak napred ali ne rešava problem prelaska iz pauze nazad.

### Konkretne user-istraite reči (Trainerize Idea Forum):
- "My mom had cancer so of course everything was on pause" — May 2022, problem nesresivanja
- "I always take a Christmas holiday and have to deactivate the auto-payment via Stripe and restart subscription. **I have lost clients due to this**" — December 2021
- "I would like the ability to **automatically shift** the previously scheduled exercise to the next day if you skipped your workout" — February 2018

### Prilika za tebe:
Pravi "Life Happens" mode:
- Klijent klikne "Pauza zbog [putovanje/bolest/posao]" na 1-14 dana
- Sistem pauzira workouts, billing prorate-uje, automated messages se ne šalju
- Po isteku pauze ili ranijem buđenju, sistem auto-reschedule-uje sve forward
- Trener dobije notifikaciju i može pristati ili predložiti adaptaciju (npr. ako je bila bolest, predloži lakši "intro" week)

---

## 5. Začinjavanje treninga: substituting exercises (oprema, povrede, alternativa)

### Trainerize Idea Forum citati (ovo je TRAGIKOMEDIJA):

Feature request **"Provide alternate exercises when searching to substitute"** — otvoren **2015**. Status: "We're excited to announce that this feature will be coming to Trainerize! We are currently in the research phase" (2020+). **Posle 5 godina još nije live**.

> "Currently the substitute button pulls up a variety of exercises. I would suggest that you limit this function to only display exercises that would work the same general muscle group. I.e. if I am trying to substitute a glute ham raise don't allow bicep curls to display" — Anonymous, Aug 2020

> "**My clients have asked that the app suggest replacements for exercises**. It would be nice when we are uploading a video, that there are 2-3 replacements attached to it as suggested substitutes" — Dec 2015

> "We need a tag where we can say 'do this if you have knee pain' 'do this if that machine isn't available' 'do this one if you want it harder'" — admin sam Trevor

> "I am deployed and equipment available varies by day. I would like to be able to substitute an exercise **before starting the workout**" — 2021 (ima preko 50 upvotes)

### Stvarno stanje 2026:
- **Trainerize**: "Substitute" dugme postoji. Ali baca random listu exercises iz cele biblioteke. Klijent treba sam da nađe replacement.
- **Everfit**: "Alternate exercises" — trener može da postavi 1-3 alternative pri kreiranju programa. Bolji pristup ali još ručno.
- **Hevy Coach**: Alternate exercises postavljeni unapred. Klijent može lako swap-ovati.
- **My PT Hub**: Slabo, ručno.
- **PT Distinction**: Bolje sa custom exercise tagging.

### Šta apsolutno NIKO ne radi:
1. **Pre-workout substitution**: Klijent dolazi u gym, vidi da je smith machine zauzet, treba da sub-uje pre nego što "start workout". Trainerize je ovo otvorio kao request — još nije implementirano.
2. **Smart filtering po muscle/movement**: Kad klijent traži alternativu za bench press, sistem automatski filtrira "horizontal push" → push-up, dumbbell press, machine chest press. Janusz Prociuk (Dec 2025): "Allow us as the coaches to set by default how the substitution filter auto applies."
3. **Permanent substitution**: Klijent ima problem sa kolenom 4 nedelje — jednim klikom postaviti "swap squat with leg press for next 4 weeks across all workouts". Trainerize forum citat (2025): "Substituting a movement... automatically fill in that movement in ALL of the upcoming scheduled workouts."

### Realan trenutni workflow:
Klijent ima loš dan, ne može deadlift. Šalje poruku treneru. Trener:
1. Kaže "uradi RDL umesto"
2. Klijent ručno menja u app-u, ili ne (jer je komplikovano)
3. Sledeća nedelja deadlift se opet pojavljuje. Klijent ponovo pita.
4. Frustracija raste.

### Prilika:
Smart substitution engine:
- Trener tagira svaki exercise sa: muscle group, movement pattern, equipment, joint stress (low/medium/high), skill level
- Klijent klikne "swap" → sistem nudi 3-5 najboljih opcija na osnovu njegovih constraints
- Klijent može označiti "knee issue" u svom profilu — sistem permanentno isključuje high-knee-stress varijante za njega

---

## 6. Povrede, metaboličke bolesti, hronični problemi

### Šta tvrde:
"Personalizovano za svakog klijenta" — svi.

### Šta stvarno rade:
- Forme za intake gde se beleži povreda (text field)
- Trener čita i ručno bira exercises
- **Niko nema medicinsku/PT specifičnu logiku** koja kaže "lower back pain → izbaci good morning, GHR, deficit deadlift, low row sa lošom formom"

### PT Distinction izuzetak:
- Najjača strana: **custom assessments** (movement screens, postural assessments)
- Trener može uneti rezultat i automatski markirati "asymmetry detected → korektivne vežbe"
- Ali to je trener-driven, ne AI-driven

### Metaboličke bolesti:
- **Niko nema dedicated logiku** za:
  - Diabetes type 1/2 (insulin sensitivity, kalorijski timing)
  - Hipotireoza (kalorijska potreba lošija nego TDEE prediktor)
  - PCOS (insulin resistance, specific macro split)
  - High blood pressure (avoid Valsalva, low-sodium)
- **Šta se radi**: Trener piše "client has hypothyroidism" u beleški, sam donosi sve odluke

### Trainerize Terms of Service citat (ovo je signifikantan):
> "the Smart Meal Planner should not be used for the diagnosis, prevention, monitoring, treatment, alleviation, cure or mitigation of any disease, health or medical condition, injury, disability or physiological or pathological process or state"

Drugim rečima: **AI tool nije osmišljen da hendluje medicinske slučajeve**. Sva odgovornost je na treneru.

### Prilika (oprezno):
- **Disclaimer-friendly framework**: app ne dijagnostikuje ali ima "condition flags" koje kontaminiraju program suggestions:
  - Klijent označi "disc herniation L4-L5" → exercises sa highflexion/loaded flexion auto-filtrirani out
  - Klijent označi "T2DM" → meal plans imaju default 35% carb max, balanced timing
- Trener i dalje ima završnu reč ali expert rules ga štite od grešaka
- **NEDOSTAJE NA TRŽIŠTU. Velika prilika.**

---

## 7. Prelazak iz početnik → srednji → napredni

### Šta tvrde:
Periodization, phased programs, master programs koji se menjaju.

### Stvarno stanje:
- **Trainerize "Master Programs"**: Trener pravi npr. "Beginner Strength" sa fazama (Phase 1: 4 weeks, Phase 2: 4 weeks). Klijent prolazi kroz sve faze sekvencijalno.
- **Niko ne pomera klijenta automatski** iz "Beginner" plana u "Intermediate" na osnovu progresa.
- Trener manuelno odlučuje kad je klijent spreman i prebacuje ga.

### Konkretan problem:
Klijent počinje sa beginner-friendly programom (3 dana/nedelja, full body, jednostavni exercises). Posle 3 meseca:
- Squatu 1.5x body weight
- Bench 1x body weight
- Deadlift 2x body weight

Ovo su jasni "intermediate" markeri. Ali trener mora SAM:
1. Da uoči ovo u logovima
2. Da odluči "vreme je za split"
3. Da ručno prebaci na "Intermediate Upper/Lower" ili sličan plan

### Šta niko nema:
- **Auto-promotion threshold**: "kad klijent dostigne X strength markers, predloži graduate na Intermediate plan"
- **Smart phase progression**: ako klijent prebrzo napreduje kroz beginner phase, predloži skratiti fazu

### Trainerize "Add-on Programs" feature:
Klijent može imati više stack-ovanih programa istovremeno (Main + Add-on). Trener može switch-ovati Add-on u Main. Korak napred ali i dalje 100% trener-driven.

### Prilika:
**Auto-graduation system** sa:
- Definisanim "ready for next level" thresholds (strength, technique, consistency)
- Notifikacija treneru: "Klijent X je dostigao 80% intermediate markera. Predlozi: prebaci na program Y."
- Klijent vidi "level progress bar" → motivacija + transparency
- Niko ovo ne radi sistematski. **Velika prilika.**

---

## 8. Kalkulacija kalorija/makroa za cilj (deficit, suficit, maintain)

Ovo je najjače pokriveno polje, ali još uvek ima ozbiljnih problema.

### Trainerize approach (Smart Meal Planner i Goals):
- **Built-in calculator** koji koristi:
  - Activity level (klijent unosi "sedentary" do "very active")
  - TDEE računanje
  - Goal: "lose 2 lbs/week" → -1000 kcal/day
  - "Gain 1 lb/week" → +500 kcal/day
- **Macro split**: Default ili custom (% protein/carb/fat)
- **Output**: Daily calorie + macro target koji se prikazuje klijentu

### Standardne formule koje koriste sve platforme:
- **Mifflin-St Jeor** za BMR (sa age, sex, height, weight)
- **Katch-McArdle** ako body fat % poznat (lean mass-based, tačnije za fit ljude)
- **Activity multiplier**: 1.2 (sedentary) → 2.5 (very active)
- **Goal adjust**: ±15-25% od TDEE (industrijski standard)

### Konkretne brojke (industrijska konvencija):
- Cut: -500 kcal/day = ~1 lb/week loss
- Recomp: maintenance kcal sa protein-priority
- Bulk: +5-10% surplus
- Protein: 0.7-1g/lb body weight

### Šta većina platformi radi DOBRO:
- Tačna BMR/TDEE formula
- Macro distribution na bazi cilja
- Daily target prikazan klijentu

### Šta NIKO ne radi dobro:

#### A) Adaptive recalibration
Klijent gubi sporije/brže nego prediktovano. Šta sad?
- **Idealno**: Sistem nakon 2-3 nedelje gleda actual rate of loss vs prediktovano. Ako je prespor — automatski smanji intake za 100-150 kcal. Ako je prebrz — povećaj.
- **Realno**: Trener gleda check-in fotke i težinu, ručno menja target.
- **Niko ovo ne automatizuje** sistematski.

#### B) Diet break / refeed days logika
Industrijski standard: cut > 4-6 nedelja → 1-2 dana refeed na maintenance. Niko nema ovo built-in u meal planning.

#### C) Metaboličko adaptacija handling
Posle 12+ nedelja deficita, TDEE pada (adaptive thermogenesis). Niko ne adjusts automatski za to.

#### D) Activity-based daily adjustment
Klijent radi heavy leg day → potrošio 600 kcal više. Idealno: današnji target +400 kcal (sa wearable sync). **Niko ovo ne radi automatski**, sve je manualno.

#### E) Carb cycling, intermittent fasting integration
Sve mora trener da postavi ručno. Niko nema "select cycling pattern" toggle.

### Promealplan (third-party tool koji platforme ne mogu da pobede):
**Razlog zašto coaches kombinuju Trainerize/Everfit + Promealplan**:
- 200+ allergy filteri
- 1.000+ recepata sa 99% macro accuracy
- Auto-meal plan generation za specifične macros
- White-label PDF export

> "Trainerize tracks calories. Everfit logs food. Neither creates actual meal plans. When your clients ask 'what should I eat tonight?', your workout app has nothing to say." — Promealplan marketing (ali tačno na osnovu user iskaza)

### Prilika:
Built-in adaptive nutrition koji:
1. Računa TDEE/macros (postojeći standard)
2. **Praćenje 7-day rolling average** težine i trend
3. **Auto-adjust** target svake 2 nedelje na osnovu actual vs predicted
4. **Refeed/diet break notifikacije** posle X nedelja u deficitu
5. **Activity-based daily macros** sa wearable sync
6. **Plateau detection**: ako 3 nedelje no change, predloži strategy (NEAT increase, refeed, ili lower deficit)

---

## 9. Substitucija jela, alergije, food preferences

### Šta postoji (slabo):

#### **Trainerize + Evolution Nutrition** (third-party):
- Meal plan ima "food swap" feature
- 50+ alternative koje su "nutritionally equivalent"
- Filter "vegetarian, high protein, gluten-free, lactose-free"

#### **Everfit Meal Plans add-on**:
- 500+ recepata, dietitian-approved
- Macro-based meal plan templates
- **Limit**: nema napredne allergy filtere, nema white-label

#### **PT Distinction**:
- 4 metode tracking-a (photo log, MFP, adherence, habit tracking)
- Editable meal plan documents
- Solidno ali ne automatizovano

### Šta je standardna industrija:

#### **Promealplan** (treću stranu, ali je najbolja):
- 200+ dietary kombinacija (vegan + nut allergy + carb cycling u jednoj kombinaciji)
- 100+ allergy ingredient exclusions
- "Klijent hoće sveže paradajze ali ne kuvane" — moguće
- "Grilled chicken ali ne fried" — moguće
- Multi-langual meal plans

### Šta NIKO ne radi:
- **Real allergen warnings** na osnovu medical records (anafilaktički šok severity vs. preferences)
- **Cross-contamination alerts** za ozbiljne alergije (kikiriki kontaminacija itd.)
- **Cultural food adaptations** (klijent iz Srbije ne jede grits, hoće mlince — niko ovo ne customize-uje)

### Šta je slabo:
- **Recipe library veličine**: Everfit 500, HubFit 5.000, Promealplan 1.000+
- Kvalitet nutrition info varira ozbiljno

### Prilika:
- **Severity-graded alergije**: distincija između "intolerance" (just exclude) i "anafilaksa" (red alert, cross-contamination warning)
- **Cultural meal adaptation**: regionalna jela u recipe library
- **Smart swap**: ako klijent kaže "ne mogu večeras na piletinu", sistem nudi 5 alternative koje fit-uju macros + dietary preferences

---

## 10. Sažetak: Top 10 problema koje NIKO nije rešio dobro

| # | Problem | Stanje 2026 | Prilika za tvoju app |
|---|---------|-------------|----------------------|
| 1 | **Onboarding → automatski program** | AI assist za prvi nacrt, sve ostalo trener | Rule-based mapping condition→program parameters |
| 2 | **Auto progressive overload** | %1RM auto, ostalo trener | Pravi adaptive engine sa RPE-based decisions |
| 3 | **Auto deload trigger** | Trener ručno postavlja u template | Fatigue detection iz wearable+RPE+performance trend |
| 4 | **Pause/vacation handling** | Najveća rupa, request star 10 godina | "Life Happens" mode sa auto-resume |
| 5 | **Smart exercise substitution** | Random exercise list ili 1-3 alternative pre-set | Movement pattern + equipment + injury filter |
| 6 | **Pre-workout sub** | Nije moguće na većini | Klijent može sub pre starta |
| 7 | **Injury/medical handling** | Text field u beleški | Condition tags koji filtriraju exercises/foods |
| 8 | **Beginner→Intermediate auto-graduation** | 100% trener-driven | Strength threshold based suggest-promotion |
| 9 | **Adaptive nutrition** | Statičan TDEE-target | Auto-recalibration na osnovu actual loss rate |
| 10 | **Cultural/severity allergy handling** | Filter list bez nuance | Severity grading + regionalna kuhinja |

---

## 11. Najbolji "best-in-class" elementi koje treba imitirati

| Funkcija | Najbolja platforma | Kako rade |
|----------|---------------------|-----------|
| %1RM auto progression | **Everfit** | Auto-update 1RM kad klijent diže više |
| Phased programs | **Trainerize Master Programs** | Multiple training phases combine u program |
| Custom assessments | **PT Distinction** | Movement screen → flag exercises |
| AI Workout Builder context | **Trainerize** | Pulluje workout history + cardio + equipment + goals |
| Live Sync (master → all clients) | **Everfit** | Promeni master, propagira na sve assigned clients |
| Alternate exercises pre-set | **Hevy Coach + Everfit** | Trener postavi 3 alternative pri kreiranju |
| Recipe library + meal alternatives | **HubFit (5.000)** | Najveća built-in baza |
| Allergy filters | **Promealplan (third-party)** | 200+ kombinacije, 100+ exclusions |
| Macro-targeted meal generation | **Promealplan** | 99% macro accuracy |
| Self-booking + vacation availability | **Trainerize Appointments** | Vacation block, time-off auto-responder |
| Workout completion compliance | **Trainerize** | Strict mode, missed = "missed" status |
| Habit tracking + streaks | **HubFit + PT Distinction** | Habit stacking, analytical reports |

---

## 12. Strateški savet — kako pretvoriti ove uvide u differentiator

### Tvoj 1-na-1 fitness app može biti **prvi koji rešava**:

**Trifecta automatizacije (niko ovo ne radi spojeno):**

1. **Smart onboarding → personalizovan program**:
   - Klijent popuni intake (PAR-Q+, ciljevi, oprema, povrede, ishrana, lifestyle)
   - Sistem MAPIRA: "back pain" → exercise tags excluded; "T2DM" → carb-conscious meal frame; "vegetarian" → recipe filter; "home gym, dumbells only" → exercise pool
   - AI generiše program koji već uvažava sve ove constraints
   - Trener pregleda, fini-tjuna, asignuje (5 min umesto 45 min)

2. **Adaptive engine tokom treninga**:
   - %1RM + RPE based auto-progression sa pravilima
   - Fatigue detection (wearable + log) → predlaže deload
   - Plateau detection → predlaže strategy change
   - Auto-graduation indikator: "klijent 80% kvalifikovan za Intermediate"
   - Sve sa "Trener mora odobriti" — coach ostaje u driverskom sedištu

3. **Life-aware system**:
   - "Pauza" mode (pauzira workouts, billing prorate, messages off)
   - Smart shift kad propusti: ne samo move forward, nego predloži intro-week ili lighter restart
   - Pre-workout substitution ("smith taken — swap to barbell squat")
   - "Bad day" mode: klijent kaže "loš sleep, stress" → sistem predloži -20% volume + RPE cap

### Anti-feature (šta NE raditi):
- Ne pokušavaj da budeš "all-in-one" sa peer-tier nutrition. Promealplan integration ili dedicated nutrition tab koja konkuriše njima.
- Ne dodaj funkcije bez auto-logike — to je samo "još jedan Trainerize".
- Ne komplikuj UI dodavanjem 1.000 podešavanja. Smart defaults su differentiator.

---

## Dodatak: Trainerize Idea Forum kao "wishlist od korisnika"

Najuvodljivije: **Idea forum Trainerize-a je zlato za product strategy.** Tamo treneri godinama upisuju šta žele. Mnogi requests su otvoreni 5+ godina. To je tačno mapa onoga što tržište hoće a niko ne rešava.

Top requests (sa godinom prvog request-a):
- Pre-workout exercise substitution (2018, još otvoren)
- Pause/freeze billing for vacation (2018, delimično adresovano)
- Mass shift workouts (2016, još otvoren)
- Reset program calendar (2016, još otvoren)
- Smart filter za substitute exercises (2015, još otvoren)
- Pre-set alternates per exercise (2020, delimično)
- "Knee pain" / "shoulder pain" tags (2020, otvoren)

Ako rešiš **5 od ovih 7**, već si imitirao ono što "veliki igrač" 10 godina ne može.

---

*Analiza zaključena: maj 2026. Glavni izvori: official help docs (Trainerize, Everfit, PT Distinction), Trainerize Idea Forum, FirstRep AI guide, Promealplan komparacije, fitness science izvori (Mifflin-St Jeor, Katch-McArdle, NASM/CSCS periodization).*
