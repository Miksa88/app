# FlexFemmeFit — Nutrition Algorithm Master Flow

**Target audience:** Isključivo žene (99% automatizacija, 1% manualni override)
**Verzija:** v1.1
**Filozofija:** Identitet iznad kalorija. Algoritam tretira ishranu kao biološki proces, ne kao matematički deficit. Cilj je izbegavanje metaboličke odbrane (Jo-Jo efekat) kroz postepenu, inteligentnu kalibraciju.

**Changelog v1.1:**
- **Deload-Maintenance Sync** — kada je trening u Deload modu, ishrana automatski prelazi na Maintenance (nema deficita dok se telo oporavlja)
- **Hidratacija modul** — 30-40ml/kg pravilo; algoritam proverava hidrataciju pre makro promene
- **Identity Check-in** — nedeljno psihološko pitanje o identitetu (ne samo biometrija)
- **IR profil** — 5 slotova zadržano, slotovi 2 i 4 postaju "Mini-obroci" (P+F, 0 carbs), ne užine; razmak između obroka fiksno 3h
- **GI standardizacija** — standardni način pripreme + "Trenerov savet" u UI-u (ne matematički modifikator)
- **UI skrivanje kalorija** — klijentkinja vidi "Fueling status" progress bar; trener vidi sve makroe i kalorije
- **Cycle Tracker integracija** — eksplicitno poslednje onboarding pitanje; `Hormonal_Aware_Mode` se aktivira automatski
- **Izbačeno iz MVP-a** — mikronutrijent tracking po imenu, komplikovana suplementacija (ostavili smo protein prah, kreatin, magnezijum, Omega-3)

**Changelog v1.0:**
- Inicijalni spec
- Mifflin-St Jeor BMR sa lifestyle modifikatorima (san, stres, ciklus)
- Anti-Ingredient Filter + Patološka Matrica (IR, Hashimoto, PCOS, Hipertenzija)
- 5-obrok struktura sa mTOR distribucijom i Nutrient Timing-om
- Pravilo 7 Dana (2-dnevna A/B rotacija za kalibraciju)
- Dnevni micro check-in + nedeljni makro check-in sa 5-dnevnim Moving Average
- Replacement logika (±10% makrosi, isti dan preraspodela proteina)
- Metabolička buka — vizuelni warning sistem
- MVP baza 200 jela sa punim tagovanjem

---

## Sadržaj

1. [Filozofija sistema](#1-filozofija-sistema)
2. [Sloj 1 — Digitalna anamneza i Anti-Ingredient Filter](#2-sloj-1--digitalna-anamneza-i-anti-ingredient-filter)
3. [Sloj 2 — Kalorijska kalibracija (BMR → TDEE → Target)](#3-sloj-2--kalorijska-kalibracija)
4. [Sloj 3 — Makronutrijentni split](#4-sloj-3--makronutrijentni-split)
5. [Sloj 4 — Hormonski i metabolički filteri (Patološka matrica)](#5-sloj-4--hormonski-i-metabolicki-filteri)
6. [Sloj 5 — Arhitektura obroka (5 zakona postavke)](#6-sloj-5--arhitektura-obroka)
7. [Sloj 6 — Faktori životnog stila (san, stres, ciklus)](#7-sloj-6--faktori-zivotnog-stila)
8. [Sloj 7 — Hidratacija i Deload-Maintenance Sync](#8-sloj-7--hidratacija-i-deload-sync)
9. [Pravilo 7 Dana — Merna nedelja](#9-pravilo-7-dana--merna-nedelja)
10. [Check-in sistem i adaptivna kalibracija](#10-check-in-sistem-i-adaptivna-kalibracija)
11. [Food database — struktura i tagovanje](#11-food-database--struktura-i-tagovanje)
12. [Meal Plan Generator — algoritamski flow](#12-meal-plan-generator--algoritamski-flow)
13. [Daily Logging logika](#13-daily-logging-logika)
14. [Data modeli (TypeScript)](#14-data-modeli-typescript)
15. [Plan implementacije — sprint redosled](#15-plan-implementacije--sprint-redosled)

---

## 1. Filozofija sistema

### Dva principa koja diktiraju sve odluke:

**Princip 1 — Identitet iznad kalorija.**
Klijentkinja ne treba da misli o kalorijama — to je posao algoritma. Njena jedina uloga je da jede iz ponuđenog jelovnika i da uredno check-in-uje. Algoritam sve ostalo radi u pozadini: account-uje deficit, prilagođava makroe, reaguje na promene težine. Kalorije su *sredstvo*, ne *identitet*.

**Princip 2 — Metabolička odbrana se izbegava, ne forsira.**
Agresivni deficit (>25% TDEE) triggeruje pad T3 hormona, kortizol skok i povećan apetit — klasična metabolička odbrana koja vodi do Jo-Jo efekta. Algoritam *nikad* ne ide ispod -20% TDEE za fat loss, i *nikad* ne zadržava deficit duže od 10 dana bez check-in korekcije.

### Šta algoritam radi, a šta ne radi:

**Radi:**
- Izračunava TDEE i target na osnovu onboarding podataka
- Generiše personalizovani jelovnik za svaki dan (A ili B rotacija)
- Prati trendliniju težine i prilagođava plan svakih 7 dana
- Upozorava na metaboličku buku (tečne kalorije, preskočeni proteini)
- Blago povećava kalorije u lutealnoj fazi ciklusa
- Smanjuje intenzitet deficita ako je san/stres loš

**Ne radi:**
- Ne prikazuje kalorije klijentkinji direktno (prikazuje "obroke", ne "kcal")
- Ne kažnjava preskočene obroke — redistribuira
- Ne smanjuje plan ispod fiziološkog minimuma (~1400 kcal za prosečnu ženu)
- Ne menja plan bez check-in podataka — algoritam je slep bez feedback-a

---

## 2. Sloj 1 — Digitalna anamneza i Anti-Ingredient Filter

### 2.1 Antropometrijski ulazi (iz onboardinga)

Svi ovi podaci već postoje u `ClientTrainingProfile`. Nutrition algoritam ih čita bez duplog unosa:

```
weight_kg       → za protein target i BMR
height_cm       → za BMR
age             → za BMR
primaryGoal     → određuje kalorijski mod (deficit / maintenance / suficit)
metabolicProfile → IR / Hashimoto / PCOS / Hipertenzija
allergies       → za Anti-Ingredient Filter
sleepQuality    → za lifestyle modifier
stressLevel     → za lifestyle modifier
cycleStartDate  → za lutealna faza korekcija
```

### 2.2 Dodatni nutrition-specifični ulazi

Pored onboarding podataka, nutrition modul zahteva još jedan unos pri prvom pokretanju. **Poslednje onboarding pitanje je Cycle Tracker** — pošto je aplikacija isključivo za žene, ovo je USP (Unique Selling Proposition) koji se ne sme sakriti.

```typescript
interface FoodPreferences {
  dislikedFoods: string[];       // nazivi namirnica koje ne voli (ne alergije)
  preferredCuisine?: string[];   // opciono: balkanska, mediteranska, azijska...
  mealsPerDay: 5;                // fiksno za MVP
  preferredMealTimes?: {         // opciono, za meal timing
    breakfast: string;           // npr. "07:30"
    morningSnack: string;        // npr. "10:30"
    lunch: string;               // npr. "13:00"
    afternoonSnack: string;      // npr. "16:00"
    dinner: string;              // npr. "19:00"
  };
  workoutTime?: string;          // za nutrient timing (pre/post workout obroci)

  // Cycle Tracker — poslednje onboarding pitanje (obavezno ponuđeno, opciono odgovoreno)
  cycleTrackingEnabled: boolean;
  lastPeriodStartDate?: Date;    // datum početka poslednje menstruacije
}
```

**Onboarding pitanje (poslednji step):**

```
"Da bismo precizno uskladili tvoj metabolizam sa tvojim hormonima,
unesi datum poslednjeg ciklusa."

[📅 Izaberi datum]          [Preskočiti za sada →]
```

**Logika aktivacije Hormonal_Aware_Mode:**

```typescript
function initHormonalAwareMode(
  lastPeriodStart: Date | null,
  cycleTrackingEnabled: boolean
): HormonalMode {

  if (!cycleTrackingEnabled || !lastPeriodStart) {
    return { active: false, mode: 'standard' };
  }

  const cycleDay = calcCycleDay(lastPeriodStart, new Date());

  return {
    active: true,
    mode: 'hormonal_aware',
    currentCycleDay: cycleDay,
    currentPhase: getCyclePhase(cycleDay),
    // getCyclePhase vraća: 'menstrual' | 'follicular' | 'ovulation' | 'luteal'
    appliedModifiers: getModifiersForPhase(getCyclePhase(cycleDay)),
  };
}
```

Ako klijentkinja preskoči Cycle Tracker na onboardingu, algoritam radi bez hormonalnih modifikatora. Može ga aktivirati kasnije kroz **Profile → Praćenje ciklusa**.

### 2.3 Anti-Ingredient Filter

Ovo je jedan od najvažnijih filtera u sistemu. Kombinuje **alergije** (medicinski imperativ — nikad ne sme da se pojavi) i **averzije** (preference — mogu se ublažiti ako nema alternative).

```typescript
function buildIngredientExclusionList(
  allergies: string[],
  dislikedFoods: string[],
  metabolicConditions: MetabolicCondition[]
): IngredientExclusionList {

  const hardExclusions: string[] = [
    ...allergies,                          // NIKAD ne ulazi u plan
    ...getPathologyExclusions(metabolicConditions), // npr. gluten za Hashimoto
  ];

  const softExclusions: string[] = [
    ...dislikedFoods,                      // izbegava se, ali kao fallback može
  ];

  return { hardExclusions, softExclusions };
}
```

**Patološke eksluzije (automatske, na osnovu metabolicProfile):**

| Stanje | Auto-isključene kategorije |
|---|---|
| `insulin_resistance` | Jela sa GI > 50, sve užine (snacking category) |
| `hashimoto` | Gluten (ako je označeno u anamnezi), jela sa `inflammatory: true` tagom |
| `pcos` | Jela sa visokim GI, zasićene masti > 15g po obroku |
| `hypertension` | Jela sa natrijumom > 600mg po obroku |

**Logika primene:**

```typescript
function filterFoodDatabase(
  foods: FoodItem[],
  exclusions: IngredientExclusionList
): FoodItem[] {

  return foods.filter(food => {
    // Hard exclusion — nijedno jelo sa ovim sastojkom ne prolazi
    const hasHardExclusion = food.ingredientsList.some(
      ingredient => exclusions.hardExclusions.includes(ingredient.toLowerCase())
    );
    if (hasHardExclusion) return false;

    // Patološki filteri — tagovi
    const passesTagFilters = food.tags.every(tag => {
      // Svaki tag se provjerava naspram patološke matrice klijentkinje
      return !isTagExcludedForProfile(tag, exclusions);
    });

    return passesTagFilters;
    // Soft exclusions se primenjuju u drugom prolazu (preferiramo, ali ne blokiramo)
  });
}
```

**Rezultat:** Za svaku klijentkinju, algoritam jednom izgradi njen **personalizovani pool jela** i sve ostale operacije rade samo nad tim pool-om. Pool se rebuild-uje samo ako se promene preference ili stanja.

---

## 3. Sloj 2 — Kalorijska kalibracija

### 3.1 BMR — Mifflin-St Jeor formula (ženska varijanta)

```
BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161
```

Ovo je polazna tačka. **Nikad se ne prikazuje direktno klijentkinji.**

### 3.2 TDEE — Total Daily Energy Expenditure

TDEE je BMR korigovan za nivo aktivnosti. Aktivnost se procenjuje iz **kombinacije onboarding odgovora**, ne iz kalendarskog planera:

```typescript
function calcActivityMultiplier(
  workoutFrequency: 3 | 4 | 5,
  stressLevel: number,        // 1–5
  jobPhysicality: string      // 'sedentary' | 'moderate' | 'active'
): number {
  // Bazni multiplier na osnovu treninga
  let base = {
    3: 1.375,  // Light active (3x/nedelja)
    4: 1.55,   // Moderate active (4x/nedelja)
    5: 1.725,  // Very active (5x/nedelja)
  }[workoutFrequency];

  // Korekcija za posao
  if (jobPhysicality === 'active') base += 0.05;
  if (jobPhysicality === 'sedentary') base -= 0.05;

  // Stres povećava kortizol što paradoksalno troši energiju, ali smanjuje oporavak
  // Ne menjamo TDEE direktno za stres — to ide u lifestyle modifier (Sloj 6)

  return base;
}

const TDEE = BMR × activityMultiplier;
```

### 3.3 Kalorijski target po cilju

Ovo su **startne pozicije za mernu nedelju** — menjaju se posle svakog 7-dnevnog check-in-a.

```typescript
function calcCaloricTarget(tdee: number, goal: PrimaryGoal): CaloricTarget {
  switch (goal) {
    case 'fat_loss':
      return {
        dailyTarget: Math.round(tdee * 0.80),   // -20% TDEE
        trainingDayTarget: Math.round(tdee * 0.85),  // malo više na trening dane
        restDayTarget: Math.round(tdee * 0.75),      // malo manje na rest dane
        mode: 'deficit',
        weeklyDeficit: Math.round(tdee * 0.20 * 7),  // ~1400 kcal/nedelja deficit
      };

    case 'tone':
      return {
        dailyTarget: Math.round(tdee * 0.90),   // -10% TDEE
        trainingDayTarget: Math.round(tdee * 0.95),
        restDayTarget: Math.round(tdee * 0.85),
        mode: 'recomposition',
        weeklyDeficit: Math.round(tdee * 0.10 * 7),
      };

    case 'glute_focus':
      return {
        dailyTarget: Math.round(tdee * 1.075),  // +7.5% TDEE (sredina 5-10%)
        trainingDayTarget: Math.round(tdee * 1.10),  // više na trening dane
        restDayTarget: Math.round(tdee * 1.05),      // manje na rest dane
        mode: 'lean_bulk',
        weeklyDeficit: 0,
      };
  }
}
```

**Fiziološki minimum — zaštitna granica:**
```
MIN_CALORIES = Math.max(calcCaloricTarget(tdee, goal).dailyTarget, 1400)
```

Algoritam nikad ne ide ispod 1400 kcal/dan, bez obzira na goal ili check-in korekcije. Ovo je hard floor.

### 3.4 Training day vs Rest day razlika

Za sve ciljeve postoji diferencijacija između trening i rest dana:

```typescript
function getDayCalories(
  target: CaloricTarget,
  isTrainingDay: boolean,
  queue: MesocycleQueue  // iz training modula
): number {
  return isTrainingDay
    ? target.trainingDayTarget
    : target.restDayTarget;
}
```

Algoritam zna koji su dani trening dani iz `MesocycleQueue.sessions` u training modulu — direktna integracija između dva sistema.

---

## 4. Sloj 3 — Makronutrijentni split

### 4.1 Proteini — konstanta za sve ciljeve

```
Protein_g = weight_kg × 2.0
Protein_kcal = Protein_g × 4
```

**Fiksno 2.0 g/kg** za sve ciljeve. Ovo je ne-pregovarački minimum za:
- mTOR aktivaciju (sinteza mišićnog proteina)
- Sitost (proteini su najsaturirajući makronutrijent)
- Zaštitu mišićne mase u deficitu

### 4.2 Masti — hormonalni minimum

```
Fat_g = Math.max(weight_kg × 0.9, totalCalories × 0.25 / 9)
// Min 0.9 g/kg ILI min 25% kalorija od masti — što je veće
Fat_kcal = Fat_g × 9
```

**Minimum 0.9 g/kg** zbog:
- Estrogen, progesteron i testosteron se sintetišu iz holesterola (masna kiselina baza)
- Apsorbcija vitamina A, D, E, K (liposolubilni vitamini)
- Insulinska senzitivnost (Omega-3 poboljšava receptor senzitivnost)

### 4.3 Ugljeni hidrati — varijabla i tamponi

```
Carb_kcal = dailyTarget - Protein_kcal - Fat_kcal
Carb_g = Carb_kcal / 4
```

Karbohidrati su ostatak kalorija. Oni se prilagođavaju:
- Kalorijs‍kom cilju (fat_loss → manje carbs, glute_focus → više carbs)
- Patologijama (IR → carbs dole, PCOS → niski GI carbs)
- Trening danu vs rest danu (trening → više carbs, rest → manje)

### 4.4 Macro split po cilju — ilustracija za 70kg ženu

```
BMR = (10 × 70) + (6.25 × 168) - (5 × 30) - 161 = 1544 kcal
TDEE (4x/nedelja, sedentary job) = 1544 × 1.50 = 2316 kcal

FAT LOSS (-20%):
  Daily target: 1853 kcal
  Protein: 70kg × 2.0 = 140g = 560 kcal
  Fat:     70kg × 0.9 = 63g  = 567 kcal
  Carbs:   1853 - 560 - 567  = 726 kcal = 181g

TONE (-10%):
  Daily target: 2084 kcal
  Protein: 140g = 560 kcal
  Fat:     63g  = 567 kcal
  Carbs:   2084 - 560 - 567  = 957 kcal = 239g

GLUTE FOCUS (+7.5%):
  Daily target: 2490 kcal
  Protein: 140g = 560 kcal
  Fat:     63g  = 567 kcal
  Carbs:   2490 - 560 - 567  = 1363 kcal = 341g
```

### 4.5 Patološki macro override

```typescript
function applyPathologyMacroOverride(
  macros: MacroTarget,
  conditions: MetabolicCondition[],
  totalCalories: number
): MacroTarget {
  let { protein, fat, carbs } = macros;

  if (conditions.includes('insulin_resistance')) {
    // Carbs na max 20-25% totalnih kalorija
    const maxCarbKcal = totalCalories * 0.23;
    const maxCarbG = Math.round(maxCarbKcal / 4);
    if (carbs > maxCarbG) {
      const diff = carbs - maxCarbG;
      carbs = maxCarbG;
      // Razliku prebaci u masti (masti su insulinski neutralne)
      fat += Math.round((diff * 4) / 9);
    }
  }

  if (conditions.includes('pcos')) {
    // Omega-3 min 2g/dan (algoritam preferira ribu, lan, orahe u bazi)
    macros.omega3MinG = 2;
    // Carbs isključivo GI < 40 (na tagu, ne matematički)
    macros.maxAllowedGI = 40;
  }

  if (conditions.includes('hashimoto')) {
    // Kalorije se ne menjaju, ali filteri su jači (vidi baza tagovanje)
    macros.antiInflammatoryFlag = true;
  }

  if (conditions.includes('hypertension')) {
    macros.maxSodiumMgPerDay = 2000; // ispod preporučenih 2300
    macros.minPotassiumMgPerDay = 3500;
  }

  return { protein, fat, carbs, ...macros };
}
```

---

## 5. Sloj 4 — Hormonski i metabolički filteri (Patološka matrica)

Ovo je centralna decision table koja određuje koji tagovi su obavezni/zabranjeni za svaku klijentkinju.

### 5.1 Patološka matrica — kompletna tabela

| Stanje | Zabranjeni tagovi | Obavezni tagovi | Macro override |
|---|---|---|---|
| `insulin_resistance` | `high_gi` (GI>50), `snack` kategorija, `high_sugar` | `low_gi`, `high_fiber` | Carbs max 23% kcal |
| `hashimoto` | `inflammatory`, `high_gluten`*, `processed` | `anti_inflammatory`, `iodine_rich`** | Nema math override, samo tagovi |
| `pcos` | `high_gi`, `high_saturated_fat` | `omega3_rich`, `low_gi`, `high_fiber` | Omega-3 min 2g/dan |
| `hypertension` | `high_sodium` (>600mg/obrok) | `high_potassium`, `low_sodium` | Na max 2000mg/dan |

*`high_gluten` se isključuje samo ako je klijentkinja eksplicitno navela gluten u alergijama/averzijama. Hashimoto automatski ne znači bezglutenska dijeta osim ako nema i serološku potvrdu osetljivosti.
**`iodine_rich` se preferira, ali ne forsira — štitna žlezda treba jod.

### 5.2 Kombinovane patologije (edge cases)

Najčešće kombinacije i kako ih tretiramo:

```typescript
// IR + PCOS (veoma česta kombinacija)
if (IR && PCOS) {
  // Najstriktniji filter od oba:
  maxGI = 40; // PCOS je strožiji od IR (koji je <50)
  carbs = Math.min(IR_carbs, PCOS_carbs); // uzimamo manji od dva
  omega3Min = 2g; // PCOS zahtev
  snackingAllowed = false; // IR zahtev
}

// Hashimoto + Hipertenzija
if (hashimoto && hypertension) {
  // Oba filtera se kumuliraju, nema konflikta
  // Anti-inflammatory + low-sodium jela se preferiraju
  requiredTags = ['anti_inflammatory', 'low_sodium', 'high_potassium'];
}

// IR + Hashimoto (česta)
if (IR && hashimoto) {
  // Najkritičniji slučaj: nizak GI + anti-inflammatory + bez procesiranog
  // Pool jela biće manji, algoritam mora imati dovoljno alternativa
  // Fallback: ako pool < 15 jela po obroku kategoriji, relaksiraj soft exclusions
}
```

---

## 6. Sloj 5 — Arhitektura obroka (5 zakona postavke)

### 6.1 Pet zakona koji definišu svaki obrok

**Zakon 1 — mTOR distribucija proteina:**
Ukupni dnevni proteini dele se ravnomerno na 5 obroka. Nijedan obrok ne sme imati manje od 20g proteina (ispod toga mTOR signal je slab).

```
MinProteinPerMeal = max(20g, TotalDailyProtein / 5)
```

Za 70kg ženu (140g/dan): `max(20, 140/5) = max(20, 28) = 28g proteina po obroku`

**Zakon 2 — Nutrient Timing (hidrati prate trening):**

```
Pre-workout obrok (60-90 min pre): Carbs_high + Protein + minFat
Post-workout obrok (30-60 min posle): Carbs_high + Protein + minFat
Ostali obroci: Protein + Fat + Vlakna + Carbs_low
```

Algoritam zna kada je trening iz `FoodPreferences.workoutTime` i `MesocycleQueue`. Automatski prilagođava koji je obrok pre/post workout.

**Zakon 3 — Enzimski redosled unutar obroka:**
Svako jelo u jelovniku nosi napomenu o redosledu jedenja:
```
"Redom: 1) Povrće/salata → 2) Protein → 3) Ugljeni hidrati"
```
Razlog: vlakna iz povrća usporavaju gastričnu pražnjenje i GI odgovor na kasniji unos hidrata.

**Zakon 4 — Fiber minimum:**
Svaki obrok mora sadržati min 3g vlakana, ukupno min 25g/dan. Vlakna podržavaju mikrobiom i usporavaju apsorpciju glukoze.

**Zakon 5 — Orjentir "tanjir":
Vizuelna komunikacija za klijentkinju (ne kalorije):
```
½ tanjira: Povrće i salata
¼ tanjira: Protein
¼ tanjira: Ugljeni hidrati ili masti
```
Ovo je ono što klijentkinja vidi u UI-u — ne gramatura, nego tanjir model.

### 6.2 Raspored 5 obroka i kalorijska distribucija

```typescript
const MEAL_CALORIE_DISTRIBUTION = {
  breakfast:       0.25,  // 25% dnevnih kalorija
  morning_snack:   0.12,  // 12%
  lunch:           0.30,  // 30% — najveći obrok
  afternoon_snack: 0.13,  // 13%
  dinner:          0.20,  // 20%
};
// Ukupno: 100%

// Na trening danima, pre/post workout obroci uzimaju proporcionalno više carbs
// Ali kalorijska distribucija ostaje ista (samo makro kompozicija se menja)
```

### 6.3 Pre/Post workout obrok switching

```typescript
function assignWorkoutMealTiming(
  mealSlots: MealSlot[],
  workoutTime: string,
  workoutDuration: number = 60 // minuta, default
): MealSlot[] {
  const workoutStart = parseTime(workoutTime);
  const preWorkoutTime = workoutStart - 90; // 90 min pre
  const postWorkoutTime = workoutStart + workoutDuration + 30; // 30 min posle

  return mealSlots.map(slot => {
    const slotTime = parseTime(slot.preferredTime);
    const distToPreWorkout = Math.abs(slotTime - preWorkoutTime);
    const distToPostWorkout = Math.abs(slotTime - postWorkoutTime);

    if (distToPreWorkout < 45) {
      return { ...slot, role: 'pre_workout', highCarbPriority: true };
    }
    if (distToPostWorkout < 45) {
      return { ...slot, role: 'post_workout', highCarbPriority: true };
    }
    return { ...slot, role: 'regular', lowCarbFatFiberPriority: true };
  });
}
```

### 6.4 IR profil — Specijalna arhitektura 5 slotova

Za klijentkinje sa insulinskom rezistencijom (**`insulin_resistance` u metabolicProfile**), struktura obroka se ne smanjuje na 3 već ostaje na 5 — ali se priroda slotova 2 i 4 fundamentalno menja.

**Zašto ne 3 obroka:** mTOR aktivacija zahteva minimalno 20g proteina po obroku, raspoređeno ravnomerno. Sa 3 obroka, intervali između obroka postaju previše dugi (5-6h), što aktivira katabolizam između obroka. 5 obroka sa prilagođenim makrima je optimum.

**Zašto ne klasične užine:** standardne užine (voće, orasi, jogurt) drže insulin hronično povišenim i blokiraju lipolizu između obroka. IR klijentkinja mora imati "insulin-free windows".

```typescript
function applyIRMealStructure(
  slots: MealSlot[],
  macros: MacroTarget
): MealSlot[] {
  // Za IR profil, slotovi 2 i 4 (morning_snack i afternoon_snack)
  // postaju Mini-obroci: isključivo Protein + Masti, 0 ugljenih hidrata

  return slots.map((slot, index) => {
    if (index === 1 || index === 3) { // slotovi 2 i 4 (0-indexed: 1 i 3)
      return {
        ...slot,
        slotType: 'mini_meal_ir',           // ne 'snack'
        carbsTarget: 0,                      // NULA ugljenih hidrata
        proteinTarget: macros.proteinG / 5,  // standardna protein distribucija
        fatTarget: slot.fatTarget * 1.2,     // blago više masti za sitost
        allowedFoodTags: ['ir_friendly', 'high_protein', 'low_gi'],
        forbiddenFoodTags: ['snack', 'high_gi', 'medium_gi', 'high_sugar'],
        mealGap: 180, // fiksno 3h od prethodnog i sledećeg obroka (u minutima)
        label: 'Mini-obrok (P+F)',
        uiNote: 'Protein i masti — bez hidrata do sledećeg glavnog obroka.',
      };
    }
    return slot;
  });
}
```

**Razmak između obroka za IR profil:**

```typescript
const IR_MEAL_SCHEDULE = {
  breakfast:       '07:30',  // Obrok 1
  morning_snack:   '10:30',  // Mini-obrok P+F (tačno 3h posle doručka)
  lunch:           '13:30',  // Obrok 3 (tačno 3h posle mini-obroka)
  afternoon_snack: '16:30',  // Mini-obrok P+F (tačno 3h posle ručka)
  dinner:          '19:30',  // Obrok 5 (tačno 3h posle mini-obroka)
};
// Algoritam prilagođava na osnovu preferredMealTimes klijentkinje,
// ali UVEK zadržava min 3h razmak između svakog obroka
```

**Kalorijska distribucija za IR (razlikuje se od standardne):**

```typescript
const IR_MEAL_CALORIE_DISTRIBUTION = {
  breakfast:       0.28,  // 28% (veći doručak — jutarnja insulinska senzitivnost je viša)
  morning_snack:   0.10,  // 10% (mali mini-obrok P+F)
  lunch:           0.32,  // 32% (najveći obrok)
  afternoon_snack: 0.10,  // 10% (mali mini-obrok P+F)
  dinner:          0.20,  // 20%
};
```

---

## 7. Sloj 6 — Faktori životnog stila

### 7.1 San — BMR Penalty i volume korekcija

Loš san direktno kompromituje T3 hormon, ghrelin/leptin balans i kortizol. Algoritam reaguje:

```typescript
function applySleepModifier(
  caloricTarget: CaloricTarget,
  sleepHours: number  // iz dnevnog micro check-in-a
): CaloricTarget {
  if (sleepHours >= 7) {
    return caloricTarget; // normalno
  }

  if (sleepHours >= 6 && sleepHours < 7) {
    // Blag BMR penalty
    return {
      ...caloricTarget,
      dailyTarget: Math.round(caloricTarget.dailyTarget * 0.97),
      note: 'Blagi san deficit — malo smanjujemo unos jer oporavak nije optimalan.',
    };
  }

  if (sleepHours < 6) {
    // Ne smanjujemo kalorije — povećavamo masti, smanjujemo deficit
    // Razlog: kalorijski deficit + loš san = katabolizam + kortizol = Jo-Jo
    return {
      ...caloricTarget,
      dailyTarget: Math.round(caloricTarget.dailyTarget * 1.05), // +5% da spustimo kortizol
      fatRatioBonus: 0.05,  // prebaci 5% kalorija iz carbs u masti
      note: 'Loš san detektovan. Privremeno povećavamo masti za kortizol regulaciju.',
    };
  }
}
```

**Logika: manje od 6 sati sna → algoritam NE smanjuje kalorije, nego ih blago POVEĆAVA.**
Razlog: telo je pod stresom, deficit u tom stanju pojačava katabolizam mišića i kortizol. Bolje je zadržati ishranu "toplom" dok se san ne reguliše.

### 7.2 Stres — Cortisol Buffer

```typescript
function applyStressModifier(
  macros: MacroTarget,
  stressLevel: number  // 1–5
): MacroTarget {
  if (stressLevel <= 2) return macros; // normalno

  if (stressLevel === 3) {
    // Blagi kortizol buffer — malo više masti
    return { ...macros, fatBonus: 5 }; // +5g masti
  }

  if (stressLevel >= 4) {
    // Kortizol buffer — smanjujemo deficit, povećavamo masti
    return {
      ...macros,
      fatBonus: 10,   // +10g masti (kortizol stabilizacija)
      carbReduction: 20, // -20g carbs da ostanemo u kalorijama
      note: 'Visok stres — prioritet je kortizol regulacija, ne deficit.',
    };
  }
}
```

### 7.3 Menstrualni ciklus — Lutealna faza korekcija

Lutealna faza (dani 21–28 ciklusa) karakteriše:
- Pad estrogena i progesterona → povećan apetit i craving za ugljenim hidratima
- Povećana bazalna temperatura → blago viši BMR
- Zadržavanje vode → trendlinija težine nije pouzdana

```typescript
function applyCycleModifier(
  caloricTarget: CaloricTarget,
  cycleDay: number  // trenutni dan ciklusa (1–28)
): CaloricTarget {
  if (cycleDay >= 21 && cycleDay <= 28) {
    // Lutealna faza — dodaj 100-200 kcal buffer (složeni ugljeni hidrati)
    const lutealBonus = 150; // sredina ranga

    return {
      ...caloricTarget,
      dailyTarget: caloricTarget.dailyTarget + lutealBonus,
      carbBonusG: Math.round(lutealBonus / 4), // sve u carbs
      note: 'Lutealna faza — blago povećanje ugljenih hidrata za prevenciju binge-eatinga.',
    };
  }

  if (cycleDay >= 1 && cycleDay <= 5) {
    // Menstrualna faza — trendlinija nije pouzdana (zadržavanje vode)
    return {
      ...caloricTarget,
      weightDataUnreliable: true, // check-in algoritam ignoriše kilažu ovaj period
      note: 'Menstrualni period — vaga može varirati ±1-2kg zbog zadržavanja vode.',
    };
  }

  return caloricTarget; // folikularna i ovulaciona faza — normalno
}
```

**Napomena za check-in:** Tokom menstrualnog perioda (dani 1–5), algoritam ignoriše promenu kilogramažu u trendliniji. Korisnica to vidi kao: *"Tvoja vaga može biti netačna ove nedelje. Gledamo obime, ne kilažu."*

---

## 8. Sloj 7 — Hidratacija i Deload-Maintenance Sync

### 8.1 Hidratacija — 30-40ml/kg pravilo

Voda je transportni medijum za sve nutrijente, koenzim za stotine enzimskih reakcija i direktno utiče na termogenezu i lipolizu. Algoritam je tretira kao **nulti korak** pre bilo kakve makro korekcije.

**Dnevni hidratacioni target:**

```typescript
function calcHydrationTarget(weightKg: number): HydrationTarget {
  return {
    minMl: Math.round(weightKg * 30),  // donja granica
    maxMl: Math.round(weightKg * 40),  // gornja granica
    targetMl: Math.round(weightKg * 35), // preporučeni srednji cilj
    unit: 'ml',
  };
}
// Primer: 70kg → min 2100ml, target 2450ml, max 2800ml
```

**Dnevni micro check-in uključuje i hidrataciju:**

```typescript
interface DailyCheckIn {
  // ... postojeća polja ...
  waterIntakeMl: number;  // NOVO — koliko je popila danas (gruba procena)
}
```

**Decision priority — hidratacija pre makroa:**

```typescript
function diagnoseEnergyDrop(
  checkIn: DailyCheckIn,
  hydrationTarget: HydrationTarget
): EnergyDropDiagnosis {

  const hydrationRate = checkIn.waterIntakeMl / hydrationTarget.targetMl;

  // KORAK 1: Da li je problem hidratacija?
  if (checkIn.energyLevel < 5 && hydrationRate < 0.70) {
    return {
      primaryCause: 'DEHYDRATION',
      action: 'HYDRATION_FIRST',
      message: 'Pre nego što menjamo ishranu, pokušaj da popiješ 500ml vode. ' +
               'Dehidratacija od 1-2% telesne mase smanjuje performanse za 10-20%.',
      macroChangeAllowed: false, // ne diramo makroe dok hidratacija nije rešena
    };
  }

  // KORAK 2: Ako hidratacija ok, gledamo makroe/san/stres
  if (checkIn.energyLevel < 5 && hydrationRate >= 0.70) {
    return {
      primaryCause: 'NUTRITION_OR_RECOVERY',
      action: 'STANDARD_ADAPTATION',
      macroChangeAllowed: true,
    };
  }

  return { primaryCause: 'NONE', action: 'MAINTAIN', macroChangeAllowed: false };
}
```

**UI prikaz hidratacije:**

Klijentkinja vidi jednostavan tracker u obliku "čaša":

```
💧 Hidratacija danas
[●●●●●●○○] 6/8 čaša (1500ml / 2450ml cilj)
"Još 2 čaše do cilja"
```

Svaka "čaša" = 250ml. Klijentkinja klikne "+" posle svakog ispijenog čaše. **Ne unosi tačne mililitre** — to je previše kognitivnog napora.

**Hidratacioni bonus na trening dane:**

```typescript
if (isTrainingDay) {
  hydrationTarget.targetMl += 500; // +500ml na trening dane (gubitak znojenjem)
}
```

---

### 8.2 Deload-Maintenance Sync (Trening ↔ Ishrana sinhronizacija)

Ovo je **kritična veza između dva algoritamska sistema**. Telo se ne može oporaviti od sistemskog zamora ako je istovremeno u kalorijskom deficitu.

**Pravilo:** Kada training modul uđe u Deload nedelju (planirani ili auto-triggered), nutrition modul **automatski prelazi na Maintenance kalorije** za tu nedelju.

```typescript
async function syncWithTrainingStatus(
  clientId: string,
  queue: MesocycleQueue,
  caloricTarget: CaloricTarget
): Promise<CaloricTarget> {

  // Proveri da li je trening u Deload modu
  const isDeloadWeek = await checkIfDeloadWeek(clientId, queue);

  if (isDeloadWeek) {
    // Prebaci ishranu na Maintenance bez obzira na goal
    return {
      ...caloricTarget,
      dailyTarget: caloricTarget.mode === 'deficit'
        ? Math.round(TDEE * 1.00)   // deficit → maintenance
        : caloricTarget.dailyTarget, // lean_bulk ostaje (rast ne staje na deload-u)
      trainingDayTarget: Math.round(TDEE * 1.00),
      restDayTarget: Math.round(TDEE * 0.95),
      deloadSyncActive: true,
      note: 'Deload nedelja — privremeno smo podigli ishranu na maintenance ' +
            'kako bi telo moglo da se potpuno oporavi.',
    };
  }

  // Return from Break — isti princip
  const isReturnFromBreak = queue.returnFromBreakCountdown &&
    Object.values(queue.returnFromBreakCountdown).some(v => v > 0);

  if (isReturnFromBreak) {
    return {
      ...caloricTarget,
      dailyTarget: Math.round(TDEE * 0.92), // smanjimo deficit sa -20% na -8%
      deloadSyncActive: true,
      note: 'Povratak posle pauze — blago smanjujemo deficit dok se trening intenzitet vraća.',
    };
  }

  return caloricTarget; // normalan plan
}
```

**Komunikacija prema klijentkinji:**

```
🔄 Deload nedelja (trening)
Tvoj trening je ove nedelje lakši da bi se telo oporavilo.
Ishranu smo podesili na "punjenje" — jedeš nešto više da podržiš oporavak.
Ovo NIJE varanje plana — ovo je napredna strategija koja sprečava plateau.
```

**Ključna razlika: Deload vs Refeed**

| Aspekt | Deload (trening sync) | Refeed (energija) |
|---|---|---|
| Triger | Training modul → Deload | Energija < 5/10 dva puta |
| Trajanje | Cela nedelja (5-7 dana) | 1 dan |
| Kalorije | Maintenance (TDEE × 1.0) | Maintenance (TDEE × 1.0) |
| Macro fokus | Balans (normalno) | Carbs ↑ 30% (glikogen) |
| Aktivacija | Automatska (sync) | Algoritam ili manual |

---

## 9. Pravilo 7 Dana — Merna nedelja

### 8.1 Zašto fiksnih 7 dana

Inicijalni kalorijski target je **procena**, ne precizna vrednost. Mifflin-St Jeor ima standardnu grešku ±10%. "Merna nedelja" je period u kojoj algoritam testira da li je procena tačna:

- Klijentkinja dobija **stabilizovani plan** (A/B rotacija, nema promena)
- Algoritam prati trendliniju težine i energiju
- Na kraju 7. dana: **prvi check-in i prva korekcija**

### 8.2 A/B rotacija tokom merne nedelje

Umesto 7 identičnih dana (psihološki neodrživo), imamo 2 verzije:

```
Dan 1 (Dan A): Breakfast_A, Snack_A, Lunch_A, Snack_A2, Dinner_A
Dan 2 (Dan B): Breakfast_B, Snack_B, Lunch_B, Snack_B2, Dinner_B
Dan 3 (Dan A): ponavljanje...
Dan 4 (Dan B): ponavljanje...
Dan 5 (Dan A): ponavljanje...
Dan 6 (Dan B): ponavljanje...
Dan 7 (Dan A): ponavljanje...
```

**Uslov za A/B rotaciju:**
- Dan A i Dan B imaju **identične makro ciljeve** (kcal, P, C, F)
- Razlikuju se samo u konkretnim jelima
- Oba moraju proći sve filtere (alergije, patologije, GI filteri)

```typescript
function generateMeasurementWeek(
  pool: FoodItem[],     // personalizovani pool klijentkinje
  macros: MacroTarget,
  mealTimes: MealTimes
): MeasurementWeekPlan {
  const dayA = generateDayPlan(pool, macros, mealTimes, 'A');
  const dayB = generateDayPlan(pool, macros, mealTimes, 'B');

  // Verifikuj da su makro ciljevi identični (tolerancija ±5%)
  const macroMatch = verifyMacroEquivalence(dayA, dayB, tolerance: 0.05);
  if (!macroMatch) throw new Error('A/B rotacija nema ekvivalentne makroe. Regeneriši.');

  return {
    schedule: [dayA, dayB, dayA, dayB, dayA, dayB, dayA],
    checkInDue: addDays(today, 7),
  };
}
```

### 8.3 Šta se meri na kraju merne nedelje

**Klijentkinja unosi (Nedeljni makro check-in):**
- Jutarnja težina (prosek poslednjih 3 dana)
- Obimi: struk (cm), kuk (cm), butina (cm)
- Energija (1-10 prosek nedelje)
- Nadutost (1-5 prosek nedelje)

**Algoritam procenjuje:**

```typescript
function evaluateMeasurementWeek(
  baseline: WeeklyMeasurement,     // pre merne nedelje
  endOfWeek: WeeklyMeasurement,    // posle 7 dana
  goal: PrimaryGoal,
  caloricTarget: CaloricTarget
): WeeklyEvaluation {

  const weightDelta = endOfWeek.weight - baseline.weight; // pozitivno = porast
  const weeklyDeficitTarget = caloricTarget.weeklyDeficit;

  // Procena: 7700 kcal deficit = 1kg masti
  // Ako je goal fat_loss sa 20% deficitom, očekujemo ~-0.3 do -0.5kg/nedelja (zdravo)

  if (goal === 'fat_loss') {
    if (weightDelta > -0.1) {
      // Nema pada ili rast težine → kalorije su previše ili procena TDEE je bila previsoka
      return { action: 'REDUCE_CALORIES', reduction: 0.05, note: 'Stagnacija. Smanjujemo za 5%.' };
    }
    if (weightDelta < -0.7) {
      // Previše brz pad → rizik od gubitka mišića
      return { action: 'INCREASE_CALORIES', increase: 0.05, note: 'Brz pad. Blago povećavamo.' };
    }
    // -0.1 do -0.7 kg: idealan opseg
    return { action: 'MAINTAIN', note: 'Idealan napredak. Nastavljamo.' };
  }

  // Slične logike za tone i glute_focus...
}
```

---

## 10. Check-in sistem i adaptivna kalibracija

### 9.1 Dnevni micro check-in (svaki dan, 60 sekundi)

Klijentkinja unosi:
```typescript
interface DailyCheckIn {
  clientId: string;
  date: Date;
  weightKg: number;        // jutarnja težina (pre jela, posle WC)
  energyLevel: number;     // 1–10 (kako se osećam)
  stressLevel: number;     // 1–5
  sleepHours: number;      // koliko sati je spavala noć pre
  cycleDay?: number;       // opciono (samo ako prati ciklus)
}
```

### 9.2 5-dnevni Moving Average za težinu

```typescript
function calcWeightTrend(checkIns: DailyCheckIn[]): number {
  const last5 = checkIns.slice(-5);
  if (last5.length < 3) return null; // nedovoljno podataka

  // Isključi outlier-e (±2 std deviacije od proseka)
  const avg = last5.reduce((s, c) => s + c.weightKg, 0) / last5.length;
  const stdDev = Math.sqrt(
    last5.reduce((s, c) => s + Math.pow(c.weightKg - avg, 2), 0) / last5.length
  );
  const filtered = last5.filter(c => Math.abs(c.weightKg - avg) < 2 * stdDev);

  return filtered.reduce((s, c) => s + c.weightKg, 0) / filtered.length;
}
```

**Zašto 5 dana, ne 7:** 7-dnevni prosek previše "gladi" varijaciju i kasni u detekciji trenda. 5-dnevni je balans između šuma i responzivnosti.

**Tokom menstrualnog perioda (dani 1–5):** algoritam **ignoriše** kilažu iz DailyCheckIn-a u moving average računici. Korisnici se prikazuje: *"Vaga nije merodavna ove nedelje — pratimo energiju i obime."*

### 9.3 Nedeljni makro check-in (jednom nedeljno)

```typescript
interface WeeklyCheckIn {
  clientId: string;
  weekIndex: number;        // koja nedelja programa
  weightKg: number;         // prosek posednjih 3 dana (ili korisnica unosi direktno)
  waistCm: number;          // struk
  hipsCm: number;           // kuk
  thighCm: number;          // butina (dominantna)
  energyAvg: number;        // prosek energije iz dnevnih check-in-a
  bloatingAvg: number;      // prosek nadutosti 1–5
  adherenceRate: number;    // % obroka koji su completed (algoritam računa)

  // Identity Check-in (NOVO)
  identityScore: 1 | 2 | 3 | 4 | 5;  // odgovor na identitetsko pitanje
  identityNote?: string;   // opcioni komentar (slobodan tekst)
}
```

### 9.3.1 Identity Check-in — psihološki sloj

Poslednje pitanje nedeljnog check-in-a nije biometrija — to je **identitet**. Istraživanja pokazuju da promena ponašanja kroz promenu identiteta ("ja sam osoba koja...") traje duže i otpornija je na stres od promena kroz cilj ("hoću da izgubim X kg").

**Pitanje (prikazuje se uvek poslednje, nikad prvo):**

```
"Da li si se ove nedelje, u situacijama kada si birala hranu,
ponašala kao tvoja buduća, zdravija verzija?"

[😔 1] [😐 2] [🙂 3] [😊 4] [💪 5]
```

**Skaliranje odgovora:**
- **1-2:** "Teška nedelja" — algoritam ne menja plan, šalje motivacionu poruku
- **3:** "Prosečno" — neutral, bez komentara
- **4-5:** "Identitet raste" — prikazuje pozitivnu potvrdu, eventualno streak brojač

**Šta algoritam radi sa Identity Score-om:**

```typescript
function processIdentityScore(
  score: number,
  weekIndex: number,
  previousScores: number[]
): IdentityResponse {

  const trend = calcIdentityTrend(previousScores, score);

  if (score <= 2) {
    return {
      action: 'MOTIVATE',
      message: 'Teška nedelja je deo procesa. Što god si napravila od iskustva — već se menjаš.',
      macroChange: 'none', // identitet score ne utiče na makroe
    };
  }

  if (score >= 4 && trend === 'improving') {
    return {
      action: 'CELEBRATE',
      message: 'Tvoje odluke postaju automatske. To je identitet koji se gradi.',
      streakBonus: true, // UI prikazuje streak karticу
      macroChange: 'none',
    };
  }

  return { action: 'ACKNOWLEDGE', message: 'Zabeleženo.', macroChange: 'none' };
}
```

**Važno:** Identity score **nikada ne utiče na makroe ili kalorijski plan**. On je psihološki instrument, ne metabolički. Čuva se u bazi za trenerov analytics (vidi korelaciju između identity score-a i dugoročne adherence rate-a).

### 9.4 Adaptivna kalibracija — decision tree

Ovo se izvršava svaki 7. dan (na nedeljnom check-in-u):

```
KORAK 1: Da li je adherence rate >= 80%?
  NE → Plan je previše restriktivan ili dosadan. Proveri filtere, razmotri šire jelo.
       NE menjaj kalorije — nema smisla ako se plan ne prati.
  DA → nastavi u korak 2

KORAK 2: Kolika je promena u moving average trendliniji?

  Za FAT LOSS:
    trendDelta > 0 kg/nedelja     → Stagnacija ili rast: REDUCE -5% kalorija (samo C i F)
    trendDelta 0 do -0.1 kg       → Stagnacija: REDUCE -5% (granično)
    trendDelta -0.1 do -0.7 kg    → Idealan opseg: MAINTAIN (ništa ne diri)
    trendDelta < -0.7 kg          → Previše brz pad: INCREASE +5% (mišić zaštita)

  Za TONE:
    Bez promene kilažu je OK ako obimi padaju → praćenje rekompozicije
    trendDelta > +0.3 kg          → Suficit je prevelik: REDUCE -5%
    trendDelta < -0.5 kg          → Previše deficit za tone: INCREASE +5%

  Za GLUTE FOCUS:
    trendDelta < 0 kg             → Nedovoljno kalorija za rast: INCREASE +5%
    trendDelta > +0.5 kg/nedelja  → Previše suficit: REDUCE -3%
    trendDelta 0 do +0.5 kg       → Idealan Lean Bulk: MAINTAIN

KORAK 3: Energija i zamor
  Ako energyAvg < 5/10 (2+ nedelje):
    → Aktiviraj "Refeed Dan" protokol (vidi ispod)
  Ako energyAvg < 3/10 (1 nedelja):
    → Odmah Refeed (nije potrebno čekati 2 nedelje)

KORAK 4: Stagnacija duža od 10 dana bez promene plana
  → Automatski trigger -5% kalorija bez čekanja nedeljnog check-in-a
  → Ovo je "10-day stagnation override"
```

### 9.5 Refeed Dan protokol

Kada energija padne ispod 5/10 ili na kumulativni zahtev:

```typescript
const REFEED_DAY = {
  calories: TDEE * 1.0,          // vraćamo na maintenance (nema deficita)
  carbsBonus: 0.30,              // +30% carbs od normalnog
  fatReduction: 0.15,            // -15% masti (carbs su primarne)
  proteinSame: true,
  note: 'Refeed dan — jedi više ugljenih hidrata. Telo i um ti trebaju gorivo.',
  frequency: 'max 1x po nedelji', // ne može svaki dan biti refeed
};
```

**Komunikacija prema klijentkinji:** *"Danas je refeed dan. To znači više energetske hrane — telo se "puni" da bi moglo bolje da napreduje sledećih dana. Ovo nije varanje — ovo je strategija."*

---

## 11. Food database — struktura i tagovanje

### 10.1 FoodItem interfejs — kompletna struktura

```typescript
interface FoodItem {
  id: number;
  name: string;           // "Piletina sa povrćem i heljdom"
  nameSr: string;         // srpski naziv
  category: MealCategory; // breakfast | morning_snack | lunch | afternoon_snack | dinner

  // Makronutrijenti (po porciji/100g — standardizovano)
  servingSizeG: number;   // standardna porcija u gramima
  calories: number;       // kcal po porciji
  proteinG: number;       // g proteina
  carbsG: number;         // g ugljenih hidrata
  fatG: number;           // g masti
  fiberG: number;         // g vlakana
  sugarG: number;         // g šećera

  // Mikronutrijenti (ključni za patologije)
  sodiumMg: number;       // za hipertenzija filter
  potassiumMg: number;    // za hipertenzija filter
  omega3G: number;        // za PCOS filter

  // Glikemijski indeks
  glycemicIndex: number;  // 0–100 (jela bez hidrata imaju GI = 0)
  glycemicLoad: number;   // GI × carbs / 100 (tačnija mera)

  // Patološki tagovi
  tags: FoodTag[];

  // Anti-Ingredient sistem
  ingredientsList: string[];  // ['piletina', 'brokoli', 'heljda', 'maslinovo ulje']
  allergensList: string[];    // ['gluten', 'laktoza', 'orasi', 'jaja'] — standardizovano

  // Nutrient Timing klasifikacija
  fastDigestion: boolean;     // true = visok GI, prikladano pre/post workout
  highFiber: boolean;         // true = >5g vlakana

  // Trener override (za 1-na-1)
  isCustom: boolean;
  createdByTrainerId?: string;

  // Mediji
  imageUrl?: string;
  prepTimeMin?: number;       // vreme pripreme u minutima
}

type FoodTag =
  // Patološki tagovi
  | 'low_gi'              // GI < 40
  | 'medium_gi'           // GI 40–55
  | 'high_gi'             // GI > 55
  | 'anti_inflammatory'   // dokazano antiinflamatorno (kurkuma, riba, maslinovo ulje...)
  | 'inflammatory'        // procesirano, trans masti, visok šećer
  | 'high_gluten'         // sadrži gluten (pšenica, ječam, raž)
  | 'gluten_free'
  | 'lactose_free'
  | 'high_sodium'         // >600mg natrijuma po porciji
  | 'low_sodium'          // <200mg natrijuma po porciji
  | 'high_potassium'      // >400mg kalijuma po porciji
  | 'omega3_rich'         // >1g Omega-3 po porciji
  | 'hashimoto_safe'      // prošlo sve Hashimoto filtere
  | 'ir_friendly'         // GI < 50, bez šećera
  | 'pcos_friendly'
  | 'hypertension_safe'
  // Nutrient Timing tagovi
  | 'pre_workout'         // preporučeno pre treninga
  | 'post_workout'        // preporučeno posle treninga
  | 'fast_digestion'      // probavlja se brzo (pre/post workout)
  | 'slow_digestion'      // probavlja se sporo (dobro za sitost)
  // Kulinarski tagovi
  | 'high_protein'        // >25g proteina po porciji
  | 'high_fiber'          // >5g vlakana
  | 'snack'               // prikladano kao užina
  | 'meal'                // prikladano kao glavni obrok
  | 'vegetarian'
  | 'vegan'
  | 'dairy_free';

type MealCategory =
  | 'breakfast'
  | 'morning_snack'
  | 'lunch'
  | 'afternoon_snack'
  | 'dinner';
```

### 10.2 Primer jela — kompletno tagovanje

```json
{
  "id": 101,
  "name": "Piletina sa povrćem i heljdom",
  "nameSr": "Piletina sa povrćem i heljdom",
  "category": "lunch",
  "servingSizeG": 350,
  "calories": 420,
  "proteinG": 38,
  "carbsG": 42,
  "fatG": 9,
  "fiberG": 6,
  "sugarG": 4,
  "sodiumMg": 310,
  "potassiumMg": 520,
  "omega3G": 0.2,
  "glycemicIndex": 35,
  "glycemicLoad": 14.7,
  "tags": [
    "low_gi", "anti_inflammatory", "high_protein",
    "high_fiber", "low_sodium", "high_potassium",
    "hashimoto_safe", "ir_friendly", "pcos_friendly",
    "hypertension_safe", "slow_digestion", "meal"
  ],
  "ingredientsList": [
    "piletina", "brokoli", "mrkva", "tikvica",
    "heljda", "maslinovo ulje", "beli luk", "začini"
  ],
  "allergensList": [],
  "fastDigestion": false,
  "highFiber": true,
  "isCustom": false,
  "prepTimeMin": 25
}
```

### 10.3 Distribucija 200 MVP jela po kategorijama

| Kategorija | Broj jela | Fokus |
|---|---|---|
| `breakfast` | 35 | Proteinski doručci, ovsena kaša, jaja, grčki jogurt, smoothies |
| `morning_snack` | 25 | Visok protein/fiber, mali volumen, pogodni za rad/putovanje |
| `lunch` | 55 | Najveća raznolikost, dominantno meso/riba + povrće + spori hidrati |
| `afternoon_snack` | 25 | Pre ili posle treninga, fast/slow opcije |
| `dinner` | 40 | Laka probava, visok protein, manji carbs (osim post-workout dinners) |
| **Ukupno** | **180** | + 20 custom rezervnih slotova za trener dodavanja |

### 10.4 Osiguranje minimalnog pool-a po patologiji

Svaka patologička kombinacija mora imati dovoljno jela:

```typescript
const MIN_FOODS_PER_CATEGORY = 8; // minimum 8 opcija po obroku kategoriji

function validatePoolSize(pool: FoodItem[], conditions: MetabolicCondition[]): ValidationResult {
  const categories: MealCategory[] = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner'];

  for (const cat of categories) {
    const count = pool.filter(f => f.category === cat).length;
    if (count < MIN_FOODS_PER_CATEGORY) {
      return {
        valid: false,
        issue: `Premalo jela za kategoriju "${cat}" uz date filtere (${count} < ${MIN_FOODS_PER_CATEGORY}).`,
        action: 'Relaksiraj soft exclusions ili dodaj više jela u bazu.',
      };
    }
  }
  return { valid: true };
}
```

---

## 12. Meal Plan Generator — algoritamski flow

### 11.1 Kompletni pseudokod

```
ULAZ: ClientNutritionProfile, today

KORAK 1 — Uzmi target
  daily_target = getCaloricTarget(profile, isTrainingDay(today))
  macros = applyAllModifiers(daily_target, profile, today)
  // applySleepModifier, applyStressModifier, applyCycleModifier, applyPathologyOverride

KORAK 2 — Odredi koji dan rotacije je danas
  dayType = getMeasurementWeekDayType(today)  // 'A' ili 'B'
  // ili za post-mernu-nedelju: getRegularDayType(today, queue)

KORAK 3 — Odredi meal timing
  slots = assignWorkoutMealTiming(mealSlots, profile.workoutTime)
  // Označi koji slot je pre-workout, post-workout, regular

KORAK 4 — Za svaki od 5 slotova, izaberi jelo
  za svaki slot od [breakfast, morning_snack, lunch, afternoon_snack, dinner]:

    4a. Filtriraj po kategoriji
        candidates = pool.filter(f => f.category == slot.category)

    4b. Filtriraj po danu (A ne ponavlja B iz istog dana)
        candidates = candidates.filter(f => !usedTodayOrYesterday(f))

    4c. Primeni Nutrient Timing
        ako slot.role == 'pre_workout' ili 'post_workout':
          candidates = candidates.filter(f => f.fastDigestion || f.tags.includes('pre_workout'))
        inače:
          candidates = candidates.sortBy(f => f.glycemicIndex ASC) // preferiramo niski GI

    4d. Score-uj kandidate po macro fitu
        za svaki kandidat:
          proteinFit = |candidate.proteinG - slot.proteinTarget| / slot.proteinTarget
          carbFit    = |candidate.carbsG   - slot.carbTarget  | / slot.carbTarget
          fatFit     = |candidate.fatG     - slot.fatTarget   | / slot.fatTarget
          score = 1 - (proteinFit * 0.5 + carbFit * 0.3 + fatFit * 0.2)
          // Proteini su najvažniji (50% težine u score-u)

    4e. Izaberi top-scored jelo
        chosen = candidates.sortBy(score DESC)[0]
        markAsUsed(chosen, today, slot)

KORAK 5 — Verifikuj dnevne makroe
  total = sum(chosen.macros for all slots)
  deviation = |total - macros| / macros
  ako deviation > 0.05 (>5% devijacija):
    → Pokuša korekciju na jednom obroku (lunch ili dinner — najveći)
    → Ako ne može: prihvati i loguj upozorenje

KORAK 6 — Postavi fiber minimum
  totalFiber = sum(chosen.fiberG)
  ako totalFiber < 25g:
    → Dodaj "fiber bridge" (salata ili povrće) u lunch bez kalorijskog uticaja

KORAK 7 — Vrati dnevni plan
  return DailyMealPlan {
    date: today,
    dayType: 'A' | 'B',
    meals: [breakfast, morning_snack, lunch, afternoon_snack, dinner],
    totalMacros: {...},
    notes: ['Lutealna faza korekcija primenjena', 'Pre-workout obrok u 12:30', ...],
  }
```

### 11.2 Replacement logika (±10% makros pravilo)

Klijentkinja može da zameni jelo:

```typescript
function getReplacementOptions(
  originalFood: FoodItem,
  pool: FoodItem[],
  slot: MealSlot
): FoodItem[] {

  const tolerance = 0.10; // ±10%

  return pool
    .filter(f =>
      f.category === originalFood.category &&     // ista kategorija obroka
      f.id !== originalFood.id &&                  // nije isto jelo
      Math.abs(f.proteinG - originalFood.proteinG) / originalFood.proteinG <= tolerance &&
      Math.abs(f.carbsG - originalFood.carbsG)   / originalFood.carbsG   <= tolerance &&
      Math.abs(f.fatG   - originalFood.fatG)     / originalFood.fatG     <= tolerance
    )
    .slice(0, 3); // max 3 opcije za zamenu
}
```

**Šta se dešava ako nema zamene u ±10% toleranciji:**
Algoritam proširuje na ±20% za tu kategoriju. Ako i dalje nema dovoljno, prikazuje poruku: *"Nema sličnog jela u tvojoj bazi. Možeš da preskochiš ovaj obrok i proteini će biti redistribuirani."*

---

## 13. Daily Logging logika

### 12.1 Status obroka

Za svaki od 5 dnevnih obroka, klijentkinja može da bira:

```typescript
type MealStatus = 'pending' | 'completed' | 'replaced' | 'skipped';

interface MealLog {
  mealSlotId: string;
  date: Date;
  originalFoodId: number;
  replacementFoodId?: number;  // popunjeno ako je replaced
  status: MealStatus;
  loggedAt: Date;

  // Tečne kalorije (metabolička buka) — loguju se posebno
  liquidCalories?: LiquidCaloricEntry[];
}

interface LiquidCaloricEntry {
  description: string;    // "kafa sa mlekom i šećerom"
  estimatedKcal: number;
  estimatedCarbsG: number;
  estimatedFatG: number;
  loggedAt: Date;
}
```

### 12.2 Logika preskočenog obroka (Protein redistribucija)

```typescript
function handleSkippedMeal(
  skippedSlot: MealSlot,
  remainingSlots: MealSlot[],
  dailyPlan: DailyMealPlan
): DailyMealPlan {

  const skippedProtein = skippedSlot.food.proteinG;
  const skippedCarbs = skippedSlot.food.carbsG;
  const skippedFat = skippedSlot.food.fatG;

  // Protein je prioritet — redistribuiramo u preostale obroke
  if (skippedProtein > 0) {
    const proteinPerRemainingMeal = skippedProtein / remainingSlots.length;

    remainingSlots.forEach(slot => {
      slot.proteinTarget += proteinPerRemainingMeal;
      // Triggeri: traži zamenu jela u tom slotu sa više proteina
      slot.needsProteinBoost = true;
    });

    // Muscle Loss Warning
    if (skippedProtein > 20) {
      triggerWarning('MUSCLE_LOSS_WARNING', {
        message: 'Preskočen protein-heavy obrok. Proteini su prerasporedjeni u preostale obroke radi zaštite mišića.',
        severity: 'warning',
      });
    }
  }

  // Kalorije iz preskočenog obroka se NE prenose u sledeći dan
  // "Dug" proteina ne postoji — svaki dan je nova tabla
  return updateDailyPlan(dailyPlan, remainingSlots);
}
```

### 12.3 Metabolička buka — tečne kalorije

```typescript
function applyLiquidCalories(
  liquidEntries: LiquidCaloricEntry[],
  dailyPlan: DailyMealPlan
): DailyMealPlanWithLiquid {

  const totalLiquidKcal = liquidEntries.reduce((s, e) => s + e.estimatedKcal, 0);
  const dailyBudget = dailyPlan.totalCalories;
  const liquidPercentage = totalLiquidKcal / dailyBudget;

  // Oduzimamo iz budžeta carbs i masti (proteini se ne diraju)
  const totalLiquidCarbs = liquidEntries.reduce((s, e) => s + e.estimatedCarbsG, 0);
  const totalLiquidFat = liquidEntries.reduce((s, e) => s + e.estimatedFatG, 0);

  const remainingCarbs = dailyPlan.macros.carbsG - totalLiquidCarbs;
  const remainingFat = dailyPlan.macros.fatG - totalLiquidFat;

  // Warning logika
  let warningLevel: 'none' | 'yellow' | 'red' = 'none';
  let warningMessage = '';

  if (liquidPercentage >= 0.10 && liquidPercentage < 0.20) {
    warningLevel = 'yellow';
    warningMessage = 'Tečne kalorije počinju da troše tvoj budžet za energiju. Ostalo ti je manje hrane za ostatak dana.';
  } else if (liquidPercentage >= 0.20) {
    warningLevel = 'red';
    warningMessage = 'Visok unos tečnih kalorija. Tvoj progres može stagnirati. Preporučujemo vodu, čaj ili kafu bez šećera.';
  }

  return {
    ...dailyPlan,
    remainingMacros: {
      carbsG: Math.max(0, remainingCarbs),
      fatG: Math.max(0, remainingFat),
      proteinG: dailyPlan.macros.proteinG, // proteini se ne diraju
    },
    liquidWarning: { level: warningLevel, message: warningMessage, kcal: totalLiquidKcal },
  };
}
```

---

## 14. Data modeli (TypeScript)

```typescript
// === CENTRALNI NUTRITION PROFIL ===

interface ClientNutritionProfile {
  clientId: string;

  // Kalorijski target (izvedeno iz BMR → TDEE → Goal)
  bmr: number;
  tdee: number;
  caloricTarget: CaloricTarget;

  // Makronutrijentni ciljevi
  macros: MacroTarget;

  // Filteri
  ingredientExclusions: IngredientExclusionList;
  foodPool: number[];  // ID-evi jela iz baze koji su prošli sve filtere

  // Trenutni plan
  activeMealPlan: DailyMealPlan | null;
  measurementWeekActive: boolean;
  measurementWeekDay: number; // 1–7

  // Check-in state
  lastWeeklyCheckIn: WeeklyCheckIn | null;
  weightTrendline: number[];  // poslednjih 10 dnevnih vrednosti (za moving avg)

  // Ciklus
  cycleTrackingEnabled: boolean;
  lastPeriodStart: Date | null;
  currentCycleDay: number | null;

  createdAt: Date;
  lastUpdatedAt: Date;
}

interface MacroTarget {
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberMinG: number;     // minimum 25g/dan
  sodiumMaxMg?: number;  // za hipertenzija
  potassiumMinMg?: number;
  omega3MinG?: number;   // za PCOS
  maxAllowedGI?: number; // za IR/PCOS
  antiInflammatoryFlag?: boolean; // za Hashimoto

  // Bonus/modifikatori (privremeni)
  fatBonus?: number;     // g masti za kortizol buffer
  carbBonusG?: number;   // g carbs za lutealnu fazu
  lutealActive?: boolean;
}

interface CaloricTarget {
  dailyTarget: number;
  trainingDayTarget: number;
  restDayTarget: number;
  mode: 'deficit' | 'recomposition' | 'lean_bulk';
  weeklyDeficit: number;
}

interface DailyMealPlan {
  id: string;
  clientId: string;
  date: Date;
  dayType: 'A' | 'B';
  isTrainingDay: boolean;

  meals: PlannedMeal[];

  totalCalories: number;
  totalMacros: { proteinG: number; carbsG: number; fatG: number; fiberG: number };
  macroDeviation: number; // % devijacije od target-a (idealno < 5%)

  // Modifikatori koji su primenjeni
  appliedModifiers: string[]; // ['luteal_phase_bonus', 'sleep_penalty', 'cortisol_buffer']
  notes: string[];
}

interface PlannedMeal {
  slotId: string;
  category: MealCategory;
  scheduledTime: string;  // "13:00"
  role: 'regular' | 'pre_workout' | 'post_workout';

  food: FoodItem;
  portionMultiplier: number; // 1.0 = standardna porcija, 1.2 = 20% više

  status: MealStatus;
  replacedWith?: FoodItem;
  skippedAt?: Date;
}

// === CHECK-IN MODELI ===

interface DailyCheckIn {
  clientId: string;
  date: Date;
  weightKg: number;
  energyLevel: number;  // 1–10
  stressLevel: number;  // 1–5
  sleepHours: number;
  cycleDay?: number;
  notes?: string;
}

interface WeeklyCheckIn {
  clientId: string;
  weekIndex: number;
  date: Date;
  weightKg: number;
  waistCm: number;
  hipsCm: number;
  thighCm: number;
  energyAvg: number;
  bloatingAvg: number;  // 1–5
  adherenceRate: number; // 0–1
}

interface WeightTrend {
  clientId: string;
  movingAverage5d: number;
  trend: 'losing' | 'maintaining' | 'gaining' | 'insufficient_data';
  weeklyRateKg: number;   // kg/nedelja (pozitivno = rast, negativno = pad)
  dataReliable: boolean;  // false tokom menstrualnog perioda
}
```

---

## 15. Plan implementacije — sprint redosled

### Sprint N1 — Nutrition tipovi i food database (1–2 nedelje)

**Deliverable:**
- `/src/types/nutrition.ts` — svi tipovi iz sekcije 13
- `/src/data/foodDatabase.ts` — 200 jela sa punim tagovanjem (proširuje postojeći 24KB fajl)
- Unit testovi za Anti-Ingredient Filter i patološku matricu

**Napomena:** Postojeći `/src/data/foodDatabase.ts` sadrži 24KB podataka. Pre start-a ovog sprint-a, pregledamo šta je već tu i koliko jela ima, pa dopunjujemo do 200.

### Sprint N2 — BMR / TDEE / Target kalkulacija (3–5 dana)

**Deliverable:**
- `/src/utils/nutrition/caloricCalculator.ts`
- `calcBMR()`, `calcTDEE()`, `calcCaloricTarget()`, `applyAllModifiers()`
- Integracija sa `ClientTrainingProfile` (čitanje weight, height, age, goal, sleepQuality, stressLevel)
- Test cases:
  - 70kg / 168cm / 30g / fat_loss / 4x/nedelja → TDEE ~2316, target ~1853
  - Ista klijentkinja sa Hashimoto + loš san → modifier primenjeni

### Sprint N3 — Meal Plan Generator (1 nedelja)

**Deliverable:**
- `/src/utils/nutrition/mealPlanGenerator.ts` — refaktor postojećeg 547-linijskog fajla
- `generateDayPlan()`, `generateMeasurementWeek()`, `applyNutrientTiming()`
- End-to-end: onboarding → profil → pool → dnevni plan

### Sprint N4 — Daily logging i Check-in (1 nedelja)

**Deliverable:**
- `/src/utils/nutrition/dailyLogger.ts`
- `handleSkippedMeal()`, `getReplacementOptions()`, `applyLiquidCalories()`
- Update `Food.tsx` da koristi realne meal planove (ne mockove)
- Dnevni micro check-in forma

### Sprint N5 — Adaptivna kalibracija (1 nedelja)

**Deliverable:**
- `/src/utils/nutrition/weeklyAdaptation.ts`
- `calcWeightTrend()` (5-dnevni moving avg)
- `evaluateWeeklyCheckIn()` — decision tree
- `applyRefeedDay()`, `applyCycleModifier()`, `10-day stagnation override`
- Database migration: `daily_nutrition_logs` proširiti sa obimima, energijom, stresom

### Sprint N6 — Integracija training ↔ nutrition (3–5 dana)

**Deliverable:**
- `isTrainingDay()` — čita `MesocycleQueue` iz training modula
- `assignWorkoutMealTiming()` — automatski pre/post workout obroci
- Training day vs Rest day kalorijska diferencijacija

### Ukupno — ~5–6 nedelja za kompletan nutrition algoritam

Posle ovoga → **Faza 3: Value Letter Flow & Subscription logika**

---

## Dodaci

### Dodatak A — Otvorena pitanja za potvrdu

1. **Broj obroka za IR klijentkinje** — dokument kaže "0 užina" za IR. To znači 3 obroka umesto 5? Ili i dalje 5 obroka ali bez "snack" kategorije (a snack slotovi postaju produžeci ručka/večere)?

2. **Tačnost GI vrednosti u bazi** — GI vrednosti se mogu razlikovati zavisno od načina pripreme (kuvana šargarepa ima viši GI od sirove). Da li standardizujemo GI na "uobičajen način pripreme" ili dodajemo `cookingMethodGI` modifikator?

3. **Kalorije u UI-u** — rekli smo da se kalorije ne prikazuju direktno klijentkinji. Ali trener vidi kalorije u svom dashboardu? I klijentkinja vidi makroe (P/C/F grame) ili i to skrivamo?

4. **Integracija sa cycle trackerom** — CycleTracker komponenta već postoji u kodu. Da li klijentkinja mora eksplicitno da uključi praćenje ciklusa, ili automatski pitamo na kraju onboardinga?

### Dodatak B — Šta sistem ne radi u MVP-u

- Praćenje mikronutrijenata (vitamini, minerali — osim natrijuma/kalijuma za hipertenziju)
- Integracija sa food scanner/barcode čitačem
- Personalizovani recepti (algoritam bira gotova jela, ne pravi recepte)
- Alat za kuvanje / meal prep kalkulacije (za v2)
- Kalorije iz suplementacije (protein prahovi, vitamini) — za v2
- Integracija sa wearables (Garmin, Fitbit, Apple Health) za tačniji TDEE — za v2
- Alcohol tracking beyond tečnih kalorija (hepatalni uticaj, inhibicija lipolize) — za v2

### Dodatak C — Terminološki rečnik

| Termin | Značenje |
|---|---|
| **BMR** | Bazalni metabolizam — energija za bazalne životne funkcije u miru |
| **TDEE** | Total Daily Energy Expenditure — ukupna potrošnja uključujući aktivnost |
| **mTOR** | Mammalian Target of Rapamycin — signalni put za sintezu mišićnih proteina |
| **GI** | Glikemijski indeks — brzina kojom hrana podiže glukozu u krvi (0–100) |
| **GL** | Glikemijsko opterećenje — GI × carbs / 100 (tačnija mera od GI) |
| **Anti-Ingredient Filter** | Sistem koji isključuje jela na osnovu alergija, averzija i patologije |
| **Metabolička odbrana** | Hormonski odgovor tela na agresivni deficit (pad T3, kortizol skok) |
| **Moving Average (MA5)** | 5-dnevni pokretni prosek težine — filtrira dnevni šum |
| **Refeed Dan** | Dan bez deficita (maintenance kalorije) za obnovu glikogena i leptina |
| **Nutrient Timing** | Prilagođavanje makroa i GI obroka u odnosu na vreme treninga |
| **Lean Bulk** | Blagi kalorijski suficit (+5–10%) za rast mišića uz minimalno nakupljanje masti |
| **Lutealna faza** | Dani 21–28 menstrualnog ciklusa — progesteron dominacija, viši apetit |

---

**Kraj dokumenta — v1.0**

*Sledeći korak: potvrdi 4 pitanja iz Dodatka A, pa krećemo Sprint N1.*
