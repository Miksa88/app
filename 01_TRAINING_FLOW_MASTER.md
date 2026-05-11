# FlexFemmeFit — Training Algorithm Master Flow

**Target audience:** žene, početnice i srednje napredne (99% korisnika)
**Napredne + 1-na-1 klijente:** ne pokriva algoritam, trener ih vodi ručno
**Verzija:** v2.0

**Changelog v2.0 (arhitektonska izmena):**
- Baza vežbi dolazi **pretagovana iz sistema** — trener više ne tagira vežbe
- Template-i su **sistemski defaulti**; trener može da napravi custom po poziciji
- Uveden template status sistem: aktivan / neaktivan (arhiva)
- Po jednoj poziciji: tačno 1 aktivan + do 3 neaktivna u arhivi
- Promena template-a ne utiče na postojeće klijentkinje (samo na nove)
- Custom vežbe: trener ih dodaje kroz app, ali tagove bira iz predefinisanih opcija (ne piše slobodnim tekstom)
- Trener iz "arhitekta sistema" postao "operater sistema + 1-na-1 savetnik"
- **Workout Queue sistem** — napušten kalendar, uveden pointer-based queue (A1 → B1 → A2 → ...)
- **Partition-specific Decay** — svaka particija (Lower/Upper) ima svoj tajmer oporavka
- **MAINTAIN / MINI-DELOAD režimi** — automatska regulacija targeta posle pauze
- **Pauza modul** — Bolest (dodatni -0.15 na Recovery Multiplier) vs. Putovanje (samo decay)
- **Return from Break** — 2 sesije po particiji sa -50% volumena i -20% težine
- **Swap feature** — klijentkinja može 1× po mikrociklusu da zameni susedne sesije
- **"Bez krivice" UI** — nema prikaza "Propušteno", queue strip zamenjuje kalendar

**Changelog v1.1:**
- Uveden conditional branching u onboardingu — beginner može samo 3/4 dana, intermediate samo 4/5 dana
- Session skeleton lista smanjena sa 6 na 4 (izbačeni `BEG_UL_4` i `INT_PPL_3`)
- Uklonjena sva fallback/downgrade logika iz algoritma — validacija se radi u UI sloju
- Beginner je uvek Full Body, bez izuzetka

---

## Sadržaj

1. [Filozofija sistema](#1-filozofija-sistema)
2. [Arhitektura na 4 sloja](#2-arhitektura-na-4-sloja)
3. [Template sistem i trener uloga](#3-template-sistem-i-trener-uloga)
4. [Data modeli](#4-data-modeli)
5. [Algoritamski pipeline — korak po korak](#5-algoritamski-pipeline)
6. [Programiranje kroz cikluse](#6-programiranje-kroz-cikluse)
7. [Auto-regulacija (in-workout + post-workout)](#7-auto-regulacija)
8. [Level-up sistem (beginner → intermediate)](#8-level-up-sistem)
9. [Exercise Library — taxonomy i tagovanje](#9-exercise-library)
10. [Plan implementacije — redosled sprint-ova](#10-plan-implementacije)

---

## 1. Filozofija sistema

### Pet pravila koja diktiraju sve:

**Pravilo 1 — Sistem je izvor znanja, trener je operater.**
Biomehanika vežbi je objektivna činjenica, ne mišljenje. "Deadlift opterećuje donja leđa", "čučanj pritiska kolena", "OHP iza glave rizikuje rame" — ovo piše u stotinama studija. Sistem dolazi sa tagovanom bazom od ~100 vežbi gde je svaka kategorizacija zasnovana na literaturi. Trener ne tagira vežbe, ne piše if-then pravila, ne definiše zone zamora — sve to je već ugrađeno.

**Pravilo 2 — Trener ima 3 smislene uloge:**
1. **Operater** — aktivira/deaktivira template-e, prati progres klijentkinja kroz analytics
2. **Autor custom sadržaja** — može da doda custom vežbu ili napravi svoj template ako sistemski defaulti ne pokrivaju njegov pristup
3. **1-na-1 savetnik** — za premium high-ticket klijentkinje radi ručno, sa potpunim override-om algoritma

**Pravilo 3 — Minimalan skup template-a, maksimalna personalizacija.**
4 pozicije × 1 aktivan template = 4 aktivna template-a u sistemu. Algoritam svakog dana sklapa konkretan trening za konkretnu klijentkinju na osnovu aktivnog template-a, propuštajući ga kroz 4 sloja personalizacije (arhitektura → biološki filter → kalibracija oporavka → loading).

**Pravilo 4 — Iskustvo je glavni razdelnik, sve ostalo su filteri.**
Početnica i srednje napredna imaju **različite zakone fiziologije** (linearna vs undulating, više compound vs više izolacija, 5–10 reps vs 6–20 reps). Zato se na najvišem nivou arhitektura deli na 2 grane. Unutar svake grane, sve ostale varijable (cilj, san, stres, povreda) su filteri koji peglaju plan.

**Pravilo 5 — Biologija ne poznaje ponedeljak. Queue umesto kalendara.**
Mezociklus nije vremenski blok ("4 nedelje") nego **redosled sesija** (npr. 16 sesija za 4× nedeljno plan). SRA ciklus (Stimulus → Recovery → Adaptation) se odvija u biološkom vremenu, ne kalendarskom. Ako klijentkinja otvori app u utorak umesto u ponedeljak, sledeća sesija je ista — pointer u queue-u nije pomeren. Kalendar se koristi samo interno za analytics (trener vidi discipline/adherence), ali **klijentkinji se nikad ne prikazuje "propušten" trening**.

### Šta to znači za brzinu razvoja

U staroj verziji (v1): pre nego što bilo koji trener može da koristi app, mora da uradi 1 dan setup-a (tagiranje 100 vežbi + pisanje pravila). Svaki novi trener = novi setup.

U novoj verziji (v2): **nula trener setup-a**. Trener se registruje, baza radi, template-i su aktivni, klijentkinje mogu odmah da se prijave. Trener može da prilagodi kasnije ako želi, ali ne mora.

---

## 2. Arhitektura na 4 sloja

Svaki put kada algoritam pravi trening, on prolazi kroz 4 sloja procesiranja:

```
┌─────────────────────────────────────────────────────────────┐
│  SLOJ 1 — ARHITEKTURA                                       │
│  Odluka: Koji split? Koja periodizacija?                    │
│  Inputi: iskustvo + frekvencija + cilj                      │
│  Output: Session Skeleton (prazan kostur nedelje)           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SLOJ 2 — BIOLOŠKI FILTER                                   │
│  Odluka: Koje vežbe su zabranjene? Koje su zamene?          │
│  Inputi: metabolička stanja + povrede + alergije (alergije  │
│           idu samo u nutrition modul)                       │
│  Output: filtrirani pool vežbi + substitution matrix        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SLOJ 3 — KALIBRACIJA OPORAVKA                              │
│  Odluka: Koliko serija? Gde u MEV/MAV/MRV zoni?             │
│  Inputi: san + stres + godine + ciklus (faza)               │
│  Output: recovery_multiplier (0.7–1.1) koji množi volumen   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SLOJ 4 — INTENZITET I LOADING                              │
│  Odluka: Koje kilaže? Koji RIR? Koji tempo? Koje pauze?     │
│  Inputi: telesna masa + istorija setova + nedelja u mezo-   │
│          ciklusu + cilj                                     │
│  Output: konkretna težina, reps target, RIR, rest time      │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    FINALNI TRENING (JSON)
```

### Zašto baš ovim redosledom?

Red ne može da se menja. Ne možeš da znaš koliko serija da daš (Sloj 3) pre nego što znaš koje vežbe radiš (Sloj 2). Ne možeš da filtriraš vežbe (Sloj 2) pre nego što znaš koji je split (Sloj 1). Svaki sloj zavisi od izlaza prethodnog.

---

## 3. Template sistem i trener uloga

### Pregled arhitekture

Imamo **4 pozicije** koje pokrivaju sve legalne kombinacije:

| Pozicija | Za koga |
|---|---|
| `beginner_3` | Beginner + 3 dana |
| `beginner_4` | Beginner + 4 dana |
| `intermediate_4` | Intermediate + 4 dana |
| `intermediate_5` | Intermediate + 5 dana |

Svaka pozicija u svakom trenutku ima:
- **1 aktivan template** (obavezno) — template koji algoritam koristi za nove klijentkinje te pozicije
- **0 do 3 neaktivna template-a** (opciono) — arhiva, mogu se reaktivirati u bilo kom trenutku

### Conditional branching u onboardingu

Umesto da algoritam rešava edge case-ove (beginner + 5 dana, intermediate + 3 dana), **onboarding UI unapred filtrira nelegalne kombinacije**. Korisnica fizički ne može da izabere besmislenu opciju.

**Pravilo:**
- **Beginner** → može da bira **samo 3 ili 4 dana**, i **uvek ide Full Body**
- **Intermediate** → može da bira **samo 4 ili 5 dana**, i ide **U/L ili L-U-L-U-L**

**Implementaciono:** pitanje za iskustvo mora doći **pre** pitanja za frekvenciju. `FrequencyStep` komponenta prima `experienceLevel` kao prop:

```typescript
const availableDays = experienceLevel === 'beginner' ? [3, 4] : [4, 5];
```

### Sistem template-i (dolaze sa app-om)

Ovo su **defaulti koje mi u sistemu definišemo na osnovu literature i tvoje ekspertize**. Ovi template-i su uvek dostupni — čak i ako ih trener deaktivira, mogu se reaktivirati.

| Sistem ID | Pozicija | Struktura | Periodizacija |
|---|---|---|---|
| `SYS_BEG_FB_3` | `beginner_3` | Full Body × 3 (A / B / A) | Linearna |
| `SYS_BEG_FB_4` | `beginner_4` | Full Body × 4 (H / L / H / L) | Linearna |
| `SYS_INT_UL_4` | `intermediate_4` | Upper / Lower × 2 | Undulating |
| `SYS_INT_LULUL_5` | `intermediate_5` | L / U / L / U / L | Undulating |

**Default stanje nakon registracije trenera:** sva 4 sistem template-a su aktivna.

### Custom template-i (trener pravi)

Trener može da napravi svoj custom template za bilo koju poziciju. Kad ga kreira, može da ga:
- **Sačuva kao neaktivan** — ulazi u arhivu pozicije, sistem default ostaje aktivan
- **Sačuva i aktivira** — postaje aktivan za tu poziciju, sistem default se automatski premešta u neaktivne

**Ograničenja po poziciji:**
- Tačno **1 aktivan** template (sistem ili custom)
- Do **3 neaktivna** template-a u arhivi
- Ako je arhiva puna (3 neaktivna) i trener hoće da doda 4. neaktivan, UI mu traži da obriše jedan iz arhive prvo

**Transition pravilo — šta kad trener aktivira novi template:**
- Template se menja **samo za nove klijentkinje** koje se od tog trenutka registruju
- **Postojeće klijentkinje ostaju na template-u koji su započele** do kraja programa
- Razlog: konzistentnost progresije — ne prekidaj u sredini makrociklusa

### Custom vežbe (trener dodaje)

Trener može da doda vežbu koje nema u pretagovanoj bazi. Kad je dodaje:
- **Naziv** — slobodan unos
- **Video URL** — opciono
- **Instrukcije** — slobodan unos (srpski)
- **Sve tagove bira iz predefinisanih dropdown opcija** — nije slobodan tekst
  - Movement pattern: dropdown (knee_dominant, hip_dominant, horizontal_push, ...)
  - Primary muscle: dropdown (glutes, quads, chest, ...)
  - Equipment: multi-select checkbox
  - Kontraindikacije: multi-select checkbox (lower_back, knee_acl, shoulder_impingement, ...)
  - CNS load: radio (1–5)
  - itd.

**Zašto:** tagovi moraju da ostanu standardizovani da bi algoritam mogao da ih koristi. Free-text tagovi bi razbili celu logiku.

### Uloga trenera — sumarno

Šta trener **ne radi**:
- ❌ Ne piše planove za pojedinačne klijentkinje (osim za 1-na-1)
- ❌ Ne tagira vežbe u bazi (dolaze pretagovane)
- ❌ Ne piše if-then pravila (univerzalna, u kodu)
- ❌ Ne definiše MEV/MAV/MRV vrednosti (globalne konstante)

Šta trener **radi**:
- ✅ Prati klijentkinje kroz analytics dashboard
- ✅ Po želji pravi custom template-e ako ima svoj pristup koji se razlikuje od sistem default-a
- ✅ Po želji dodaje custom vežbe koje nema u bazi
- ✅ Podesi dužinu free trial-a (npr. 14 dana)
- ✅ Za **1-na-1 premium klijentkinje** piše planove ručno, sa override-om algoritma
- ✅ Komunicira sa klijentkinjama (motivacija, korekcija forme)

**Novi trener može da se registruje i odmah primi klijentkinje bez setup-a.** Sistemski defaulti su dovoljni za početak.

### Goal Overlays (univerzalni modifikatori, fiksni u sistemu)

Goal Overlay nije template — to je **skup pravila** koji algoritam primenjuje nakon izbora template-a, na osnovu primarnog cilja klijentkinje. Overlay-i su fiksni u kodu, nisu u rukama trenera.

| Overlay | Pravilo |
|---|---|
| `GLUTE_FOCUS` | Gluteus vežba = Ex #1 na svakom Lower danu. 2 glute vežbe po Lower danu (1 tenzija + 1 izolacija). Obavezne abdukcije 2× nedeljno. |
| `TONE` | Jednak broj serija gornji/donji (50/50). Poslednje 2 vežbe svakog treninga = superset bez pauze (metabolic finisher). |
| `FAT_LOSS` | Pauze fiksno 45–60s. Težina **ne** pada (intenzitet isti kao za hipertrofiju). LISS kardio 30–40 min na rest danima. |

Ako trener pravi custom template, može da specifikuje **koji overlay-i su kompatibilni** sa njegovim template-om (npr. "moj custom template ne podržava TONE overlay jer nema balans 50/50"). Ali overlay pravila sama ne može da menja.

### Free trial — kako radi

Free trial nije poseban template — to je **period testiranja** kroz koji klijentkinja prolazi sa istim algoritmom kao da je plaćala.

- Trener podešava broj dana free trial-a (default: 14 dana)
- Klijentkinja prolazi isti onboarding, dobija isti plan iz aktivnog template-a za svoju poziciju
- Posle isteka: ili plaća → nastavlja isti plan, ili odlazi
- **Value letter flow** (lead magnet → online plan → 1-na-1) se tempira oko free trial-a — detalji u Fazi 4

---

## 4. Data modeli

Ovo su TypeScript tipovi koji idu u `/src/types/training.ts`. Oni definišu celu strukturu.

### 4.1 ClientTrainingProfile — izvedeno iz onboardinga

```typescript
interface ClientTrainingProfile {
  // Osnovni identifikatori
  clientId: string;
  gender: 'female'; // hardcoded za MVP
  age: number; // izvedeno iz dob
  weight: number; // kg
  height: number; // cm
  bmi: number; // izvedeno

  // Sloj 1 inputi
  experienceLevel: 'beginner' | 'intermediate';
  trainingDays: 3 | 4 | 5;
  primaryGoal: 'glute_focus' | 'tone' | 'fat_loss';

  // Sloj 2 inputi
  metabolicConditions: Array<'none' | 'insulin_resistance' | 'hashimoto' | 'hypertension' | 'pcos' | 'other'>;
  injuries: Array<InjuryTag>; // vidi dole
  allergies: string[]; // koristi samo nutrition modul

  // Sloj 3 inputi
  sleepHoursAvg: number; // 0-10+ (iz onboarding skale, konvertovano)
  stressLevel: number; // 1-5
  jobPhysicality: 'sedentary' | 'moderate' | 'active'; // buduće polje
  cycleTrackingEnabled: boolean;
  cycleStartDate?: Date; // za period tracking

  // Izvedeni scores (algoritam računa)
  recoveryMultiplier: number; // 0.7 - 1.1
  strengthTier: 'novice' | 'learner' | 'competent' | 'proficient' | 'advanced';
  // strengthTier se menja kroz vreme na osnovu podignutih težina u odnosu na bw
}

type InjuryTag =
  | 'lower_back'
  | 'knee_general'
  | 'knee_acl'
  | 'knee_meniscus'
  | 'shoulder_impingement'
  | 'shoulder_rotator'
  | 'wrist'
  | 'hip'
  | 'ankle'
  | 'neck'
  | 'none';
```

### 4.2 Session Skeleton (struktura unutar template-a)

```typescript
interface SessionSkeleton {
  id: string; // 'BEG_FB_3', 'INT_LULUL_5', itd.
  level: 'beginner' | 'intermediate';
  daysPerWeek: 3 | 4 | 5;
  name: string; // 'Beginner Full Body 3x'
  periodizationType: 'linear' | 'undulating' | 'mixed';

  days: SkeletonDay[];
}

interface SkeletonDay {
  dayIndex: number; // 1-7
  dayType: 'FullBody' | 'Upper' | 'Lower' | 'Push' | 'Pull' | 'Legs' | 'Rest';
  dayRole?: 'Heavy' | 'Light' | 'Tension' | 'Stretch' | 'Pump'; // za diferencijaciju sličnih dana
  defaultRepRangeZone: 'strength' | 'hypertrophy' | 'metabolic'; // 5-10 / 8-12 / 12-20
  targetRIR: number; // 2-3 na početku mezo, ide ka 0-1 na kraju

  exerciseSlots: ExerciseSlot[];
}

interface ExerciseSlot {
  slotIndex: number; // 1, 2, 3... redosled u treningu
  movementPattern: MovementPattern; // šta mora biti — ne koja konkretna vežba
  muscleGroup: MuscleGroup;
  setsRange: [min: number, max: number]; // npr. [3, 4] — algoritam bira na osnovu recovery
  repRange: [min: number, max: number]; // npr. [8, 12]
  priority: 'primary' | 'secondary' | 'isolation' | 'finisher';
  // "primary" ide prvi, "isolation" poslednji. GLUTE_FOCUS overlay pomera glute na primary.
}

type MovementPattern =
  | 'knee_dominant'      // squat, leg press, lunge
  | 'hip_dominant'       // RDL, hip thrust, deadlift
  | 'horizontal_push'    // bench, push-up, chest press
  | 'vertical_push'      // OHP, shoulder press
  | 'horizontal_pull'    // row
  | 'vertical_pull'      // pulldown, pullup
  | 'abduction'          // hip abduction, side-lying abduction
  | 'adduction'
  | 'core_antirotation'  // plank, pallof press
  | 'core_flexion'       // crunch, hanging leg raise
  | 'calf_raise'
  | 'isolation_biceps'
  | 'isolation_triceps'
  | 'isolation_rear_delt'
  | 'isolation_lateral_delt'
  | 'carry'
  | 'cardio_liss'
  | 'cardio_hiit';

type MuscleGroup =
  | 'quads' | 'hamstrings' | 'glutes' | 'glutes_med' | 'calves'
  | 'chest' | 'back_lats' | 'back_upper' | 'back_lower'
  | 'shoulders_front' | 'shoulders_side' | 'shoulders_rear'
  | 'biceps' | 'triceps' | 'forearms'
  | 'core' | 'obliques'
  | 'full_body';
```

### 4.3 Session Template (wrapper oko Skeleton-a)

Template je **ono što trener vidi u UI-u i što klijentkinja dobija**. Sadrži Session Skeleton + metadata o vlasništvu, statusu i poziciji.

```typescript
interface SessionTemplate {
  id: string; // 'SYS_BEG_FB_3' za sistemske, 'tpl_abc123' za custom
  name: string; // prikazno ime

  // Pozicija — ovo je ključ koji određuje kojim klijentkinjama se dodeljuje
  position: 'beginner_3' | 'beginner_4' | 'intermediate_4' | 'intermediate_5';

  // Status
  status: 'active' | 'inactive';
  isSystemDefault: boolean; // true za 4 sistemska, false za trener custom
  trainerId: string | null; // null za sistemske, trener ID za custom

  // Periodizacija i struktura
  skeleton: SessionSkeleton;

  // Kompatibilni overlay-i (za custom template-e trener može da ograniči)
  compatibleOverlays: Array<'GLUTE_FOCUS' | 'TONE' | 'FAT_LOSS'>;

  // Metadata
  createdAt: Date;
  activatedAt: Date | null; // kad je poslednji put aktiviran (za new clients bind)
  deactivatedAt: Date | null;
}
```

**Ključna invarijanta:** Za svaku `position` vrednost, u svakom trenutku postoji **tačno 1 template sa status = 'active'**. Ovo je database constraint, ne samo business rule:

```sql
CREATE UNIQUE INDEX one_active_per_position
ON session_templates (position)
WHERE status = 'active';
```

**Arhiva pravilo:** Do 3 template-a sa `status = 'inactive'` po poziciji. Implementira se kao provera u backend-u pre INSERT-a:

```typescript
async function createCustomTemplate(trainerId: string, position: Position, data: TemplateData) {
  const inactiveCount = await db.templates.count({ position, status: 'inactive' });
  if (inactiveCount >= 3 && data.status === 'inactive') {
    throw new Error('Arhiva pozicije je puna. Obriši neaktivni template pre dodavanja novog.');
  }
  // ...
}
```

**Binding na klijentkinju:** Kad se klijentkinja prijavi i završi onboarding, algoritam uzima **trenutno aktivan** template za njenu poziciju i **zaključava** (snapshot-uje) ga za tu klijentkinju. Od tog trenutka, **njen plan koristi taj template do kraja makrociklusa**, bez obzira šta se posle dešava sa aktivnim template-om te pozicije.

```typescript
interface ClientTemplateAssignment {
  clientId: string;
  assignedTemplateId: string; // snapshot — fiksan nakon registracije
  assignedAt: Date;
  position: Position; // za audit
}
```

### 4.4 Exercise Library entry (bogato tagovan)

```typescript
interface Exercise {
  id: number;
  name: string;
  nameSr: string; // srpski naziv

  // Izvor
  isSystemExercise: boolean; // true za pretagovanu bazu, false za trenerov custom
  createdByTrainerId: string | null;

  // Klasifikacija
  movementPattern: MovementPattern;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[]; // sinergisti (važno za planiranje)

  // Biomehanički profil (pretagovano iz literature za sistemske)
  tensionProfile: 'stretch' | 'shortened' | 'mid_range' | 'full_rom';
  // stretch = RDL, stretching curl — visok stimulus i zamor
  // shortened = kickback, spider curl — manji zamor, više pump
  // mid_range = bench, squat — balans

  cnsLoad: 1 | 2 | 3 | 4 | 5; // 1 = leg extension, 5 = deadlift
  fatigueIndex: 1 | 2 | 3 | 4 | 5; // ukupni sistemski zamor

  // Oprema i nivo
  equipment: Equipment[];
  difficulty: 'beginner_safe' | 'intermediate' | 'advanced';
  requiresStabilization: boolean; // free weight = true, machine = false

  // Povrede (kontraindikacije — pretagovane iz literature)
  contraindications: InjuryTag[]; // ["lower_back", "knee_acl"] — ako korisnik ima bilo šta od ovoga, vežba se isključuje
  gentleOn: InjuryTag[]; // vežba se PREPORUČUJE za ove povrede (npr. glute bridge je gentle_on: lower_back)

  // Progresija
  weightIncrement: number; // minimalno povećanje u kg (2.5 za compound, 1 za izolacije)
  isBilateral: boolean; // bilateral = squat, unilateral = bulgarian

  // Mediji
  videoUrl: string | null;
  instructions: string;

  // Za Goal Overlays
  isGluteBuilder: boolean; // da li broji kao glute vežba za GLUTE_FOCUS
  isCompound: boolean;
  isFinisherEligible: boolean;
}

type Equipment =
  | 'barbell' | 'dumbbell' | 'kettlebell' | 'machine' | 'cable' | 'bench'
  | 'rack' | 'bodyweight' | 'band' | 'smith';
```

### 4.5 Generated Training Program (output algoritma)

```typescript
interface TrainingProgram {
  id: string;
  clientId: string;
  sessionSkeletonId: string; // koji skelet je korišćen

  macrocycle: {
    startDate: Date;
    durationWeeks: 12; // MVP default 12 nedelja
    phases: Mesocycle[]; // obično 2-3 mezociklusa po 4-6 nedelja
  };

  currentMesocycleIndex: number;
  currentMicrocycleIndex: number; // trenutna nedelja u mezociklusu
  nextDeloadWeek: number; // apsolutni broj nedelje kada je deload

  generatedAt: Date;
  regeneratedAt?: Date; // ako je algoritam nešto promenio
}

interface Mesocycle {
  index: number;
  durationWeeks: number; // obično 4-6
  focus: 'hypertrophy_accumulation' | 'hypertrophy_intensification' | 'strength_base';
  volumeProgression: 'linear_up' | 'undulating' | 'plateau'; // kako se volumen menja kroz mezo
  intensityProgression: 'linear_up' | 'undulating'; // kako se RIR smanjuje (težina raste)
  deloadAtEnd: boolean;
}
```

### 4.6 Concrete Workout Session (šta korisnik vidi)

```typescript
interface WorkoutSession {
  id: string;
  programId: string;
  scheduledDate: Date;
  microcycleIndex: number; // koja nedelja
  dayInMicrocycle: number; // 1-7

  dayType: string; // iz skeleton-a
  sections: WorkoutSectionInstance[];

  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: Date;
}

interface WorkoutSectionInstance {
  name: string; // 'Warmup', 'Main', 'Finisher'
  exercises: ExerciseInstance[];
}

interface ExerciseInstance {
  exerciseId: number;
  name: string;
  slotIndex: number;

  // Target (šta algoritam kaže da radi)
  targetSets: number;
  targetReps: string; // "8-10" ili "12" ili "AMRAP"
  targetWeight: number | null; // null za bodyweight
  targetRIR: number;
  targetRest: number; // sekunde
  targetTempo: string; // "3-1-1-0"

  // Instrukcije
  notes: string;
  substitutionNote?: string; // "Zamenjeno sa XY zbog povrede donjih leđa"

  // Logged (šta korisnik uradi)
  loggedSets: SetLog[];
}

interface SetLog {
  setNumber: number;
  weight: number;
  reps: number;
  rir?: number; // opciono — ako korisnik unese
  done: boolean;
  completedAt?: Date;
}
```

### 4.7 MesocycleQueue (pointer-based redosled sesija)

Ovo je srce Queue sistema. Umesto da su sesije vezane za datum, one su uređene u niz sa pointerom na sledeću.

```typescript
interface MesocycleQueue {
  clientId: string;
  mesocycleIndex: number; // 1, 2, 3 unutar makrociklusa
  templateId: string;     // koji template se koristi (snapshot)

  sessions: QueuedSession[]; // uređen niz, npr. [A1, B1, A2, B2, A3, B3, A4, B4]
  sessionPointer: number;    // index trenutno aktivne sesije (0-based)

  // Swap tracking
  currentMicrocycleIndex: number;    // koji "krug" sesija je u toku (0, 1, 2, ...)
  swapUsedThisMicrocycle: boolean;   // reset-uje se kad se završi pun krug

  // Partition tracking — ključno za Decay
  partitionLastSeen: {
    Lower?:   { sessionId: string; date: Date };
    Upper?:   { sessionId: string; date: Date };
    FullBody?: { sessionId: string; date: Date };
  };

  // Return from Break tracking
  returnFromBreakCountdown: {
    Lower?: number;    // broj preostalih "lakih" sesija za Lower (0–2)
    Upper?: number;
    FullBody?: number;
  };

  createdAt: Date;
  completedAt: Date | null; // null dok mezociklus nije završen
}

interface QueuedSession {
  sessionId: string;  // 'A1', 'B1', 'A2'... (unikatno u queue-u)
  label: string;      // 'Lower — Tension', 'Upper — Heavy' (prikazno ime)
  dayType: 'FullBody' | 'Upper' | 'Lower' | 'Push' | 'Pull' | 'Legs';
  partition: 'Lower' | 'Upper' | 'FullBody'; // za decay tracking
  dayRole?: 'Heavy' | 'Light' | 'Tension' | 'Stretch' | 'Pump';

  status: 'completed' | 'next' | 'pending';

  // Scheduled date (interno, samo za analytics — ne prikazuje se klijentkinji)
  scheduledDate: Date;

  // Actual completion
  completedAt: Date | null;
  actualWorkoutSessionId: string | null; // link na konkretnu WorkoutSession instancu
}
```

**Invarijanta:** u svakom trenutku, tačno jedna sesija u `sessions` ima `status: 'next'`. Ostale su `completed` (iza) ili `pending` (ispred).

### 4.8 PauseEvent (logika pauziranja)

Klijentkinja može eksplicitno da obeleži pauzu (bolest, putovanje, obaveze). Ovo je važno za Decay kalkulaciju.

```typescript
interface PauseEvent {
  id: string;
  clientId: string;

  pauseType: 'illness' | 'travel' | 'other';
  startDate: Date;
  endDate: Date | null; // null dok pauza traje
  isActive: boolean;

  // Uticaj na Recovery Multiplier
  recoveryPenalty: number; // 0 za travel, -0.15 za illness
  penaltySessionsRemaining: number; // broj sesija na koje se primenjuje penalty (2 za illness, 0 za travel)

  notes?: string; // opciono, klijentkinja može da napiše detalje
}
```

**Razlika u logici:**

- **`pauseType: 'travel'`** — samo prestaje decay timer normalno radi. Ako nije trenirala 10 dana jer je putovala, Decay automatski preporučuje MINI-DELOAD (pauza > 7 dana). Nema dodatnog penalty-a na Recovery Multiplier.
- **`pauseType: 'illness'`** — pored standardnog Decay-a, **dodatno oduzima -0.15 od Recovery Multiplier-a za prve 2 sesije po povratku**. Razlog: bolest iscrpi imuni i nervni sistem sistemski, ne samo gubitak stimulusa.

---

## 5. Algoritamski pipeline — korak po korak

Evo tačno šta se dešava kada korisnik završi onboarding.

### Korak 1 — Izgradnja `ClientTrainingProfile`

Input: 11 onboarding odgovora.

```typescript
function buildTrainingProfile(onboarding: OnboardingAnswers): ClientTrainingProfile {
  const age = calcAge(onboarding.dob);
  const bmi = onboarding.weight / Math.pow(onboarding.height / 100, 2);

  // experience → level mapping
  const experienceLevel = mapExperience(onboarding.trainingExperience);
  // 'never' / '<6m' → 'beginner'
  // '6m-2y' / '2y+' → 'intermediate'
  // Napredne ignorišemo — za njih je 1-na-1

  // Recovery Multiplier — ključna brojka
  const recoveryMultiplier = calcRecoveryMultiplier({
    sleepQuality: onboarding.sleepQuality,
    stressLevel: onboarding.stressLevel,
    age,
    metabolicConditions: onboarding.metabolicProfile,
  });

  // Strength tier — početni tier na osnovu iskustva
  const strengthTier = mapInitialStrengthTier(experienceLevel);

  return {
    // ... sve polje mapirano
    recoveryMultiplier,
    strengthTier,
  };
}
```

#### Recovery Multiplier — formula

Ovo je jedna od **najvažnijih brojki** u sistemu. Određuje gde u MEV/MAV/MRV zoni će klijentkinja raditi.

```
base = 1.0

// San
if sleepHours >= 8: base += 0.05
else if sleepHours >= 7: base += 0.02
else if sleepHours >= 6: base += 0
else if sleepHours >= 5: base -= 0.10
else: base -= 0.20  // <5h spavanja = crveni alarm

// Stres (1-5 skala)
if stressLevel == 1: base += 0.05
else if stressLevel == 2: base += 0.02
else if stressLevel == 3: base += 0
else if stressLevel == 4: base -= 0.10
else: base -= 0.15  // visok hronični stres

// Metabolizam
if contains('hashimoto'): base -= 0.10
if contains('insulin_resistance'): base -= 0.05
if contains('hypertension'): base -= 0.05
if contains('pcos'): base -= 0.03

// Godine
if age >= 45: base -= 0.05
if age >= 55: base -= 0.05 (dodatno)

// Clamp
recoveryMultiplier = clamp(base, 0.7, 1.1)
```

#### Mapiranje recoveryMultiplier → volume zona

| Multiplier | Zona | Značenje |
|---|---|---|
| 0.70 – 0.80 | **MEV** | Minimum, telo pod stresom (loš san, Hashimoto, ekstremni stres) |
| 0.81 – 0.95 | **MEV → MAV** | Konzervativno, gradi se polako |
| 0.96 – 1.05 | **MAV** | Zlatna sredina — default za zdravu klijentkinju |
| 1.06 – 1.10 | **MAV → MRV** | Agresivno, samo za one sa odličnim oporavkom |

> **Nikad ne stavljamo klijentkinju u pravi MRV.** MRV je granica — rad iznad nje je pretreniranost. Algoritam čuva MRV kao "strop", ne kao cilj.

### Korak 2 — Selekcija aktivnog Template-a za poziciju (Sloj 1)

Algoritam ne bira iz hardkodovane lookup tabele. On pita bazu: *"Ko je trenutno aktivan za ovu poziciju?"* To može biti sistemski default ili trenerov custom — algoritam ne razlikuje, koristi onaj koji je označen kao `status: 'active'`.

```typescript
async function selectTemplate(profile: ClientTrainingProfile): Promise<SessionTemplate> {
  const position = `${profile.experienceLevel}_${profile.trainingDays}` as Position;

  // Baza garantuje da postoji tačno jedan aktivan po poziciji (UNIQUE INDEX)
  const activeTemplate = await db.templates.findOne({
    position,
    status: 'active',
  });

  if (!activeTemplate) {
    // Ovo je fatal — znači da je sistem default deaktiviran bez zamene, što ne bi smelo
    throw new Error(`Nijedan aktivan template za poziciju: ${position}. Sistem integritet narušen.`);
  }

  return activeTemplate;
}
```

**Template snapshot (binding):** Čim se odredi template, algoritam **zaključa** tu klijentkinju na taj template. Ako trener posle promeni aktivni template, ova klijentkinja i dalje koristi snapshot:

```typescript
async function assignTemplateToClient(clientId: string, template: SessionTemplate) {
  await db.clientTemplateAssignments.insert({
    clientId,
    assignedTemplateId: template.id,
    assignedAt: new Date(),
    position: template.position,
  });
}

// Kasnije kada generišemo trening za ovu klijentkinju:
async function getClientTemplate(clientId: string): Promise<SessionTemplate> {
  const assignment = await db.clientTemplateAssignments.findOne({ clientId });
  return db.templates.findOne({ id: assignment.assignedTemplateId });
  // NE koristimo status: 'active' — koristimo ID koji je snapshotovan
}
```

**Napomena:** Nema više edge case-ova u samoj lookup logici jer onboarding UI garantuje legalnu poziciju (vidi sekciju 3 — conditional branching). Ako ipak dođe do nepostojećeg template-a, to je fatal error koji znači kvar sistem integriteta (npr. neko je ručno obrisao template-e u bazi).

### Korak 2.5 — Queue Lookup (Sliding Pointer)

**Kada se ovaj korak izvršava:** svaki put kad klijentkinja otvori app i sistem treba da odluči "koju sesiju pokazati sada". **Nikada se ne poziva u onboardingu** — onda se queue tek inicijalizuje.

```typescript
async function getNextSession(clientId: string, today: Date): Promise<QueueLookupResult> {
  const queue = await db.mesocycleQueues.findActive(clientId);

  // === Edge case 1: Queue ne postoji (prvi onboarding) ===
  if (!queue) {
    // Inicijalizuj prvi mezociklus
    const template = await getClientTemplate(clientId);
    const newQueue = initializeMesocycleQueue(template, mesocycleIndex: 1);
    return { status: 'initialized', queue: newQueue, session: newQueue.sessions[0] };
  }

  // === Edge case 2: Mezociklus je završen ===
  if (queue.sessionPointer >= queue.sessions.length) {
    // Vreme za deload ili novi mezociklus
    return handleMesocycleEnd(clientId, queue);
  }

  // === Normalan slučaj: vrati sesiju na koju pointer pokazuje ===
  const nextSession = queue.sessions[queue.sessionPointer];

  // Proveri da li je bilo pauza event-a između poslednjeg treninga i danas
  await checkAndApplyPauseEvents(clientId, queue, today);

  return { status: 'ok', queue, session: nextSession };
}
```

**Šta se dešava posle završenog treninga** (post-workout hook):

```typescript
async function onSessionCompleted(clientId: string, completedSession: QueuedSession, today: Date) {
  const queue = await db.mesocycleQueues.findActive(clientId);

  // 1. Obeleži sesiju kao završenu
  queue.sessions[queue.sessionPointer].status = 'completed';
  queue.sessions[queue.sessionPointer].completedAt = today;

  // 2. Pomeri pointer
  queue.sessionPointer += 1;
  if (queue.sessionPointer < queue.sessions.length) {
    queue.sessions[queue.sessionPointer].status = 'next';
  }

  // 3. Updateuj partitionLastSeen
  queue.partitionLastSeen[completedSession.partition] = {
    sessionId: completedSession.sessionId,
    date: today,
  };

  // 4. Dekrement Return from Break countdown ako je aktivan
  const countdown = queue.returnFromBreakCountdown[completedSession.partition] ?? 0;
  if (countdown > 0) {
    queue.returnFromBreakCountdown[completedSession.partition] = countdown - 1;
  }

  // 5. Dekrement illness penalty
  const activeIllness = await getActivePauseEvent(clientId, 'illness');
  if (activeIllness && activeIllness.penaltySessionsRemaining > 0) {
    activeIllness.penaltySessionsRemaining -= 1;
    if (activeIllness.penaltySessionsRemaining === 0) {
      activeIllness.isActive = false;
      activeIllness.endDate = today;
    }
  }

  // 6. Proveri da li je završen mikrociklus (pun krug sesija)
  if (hasCompletedFullMicrocycle(queue, completedSession)) {
    queue.currentMicrocycleIndex += 1;
    queue.swapUsedThisMicrocycle = false; // reset swap
  }

  await db.mesocycleQueues.save(queue);
}
```

**Swap request** (klijentkinja hoće da zameni sledeću sesiju sa onom posle):

```typescript
async function requestSwap(clientId: string): Promise<SwapResult> {
  const queue = await db.mesocycleQueues.findActive(clientId);

  if (queue.swapUsedThisMicrocycle) {
    return { success: false, reason: 'Već si iskoristila swap u ovom krugu sesija.' };
  }

  const current = queue.sessions[queue.sessionPointer];
  const next = queue.sessions[queue.sessionPointer + 1];

  if (!next) {
    return { success: false, reason: 'Nema sledeće sesije za swap.' };
  }

  if (current.partition === next.partition) {
    return { success: false, reason: 'Dve sesije iste particije ne mogu da se zamene.' };
  }

  // Izvrši swap
  [queue.sessions[queue.sessionPointer], queue.sessions[queue.sessionPointer + 1]] =
    [queue.sessions[queue.sessionPointer + 1], queue.sessions[queue.sessionPointer]];

  queue.swapUsedThisMicrocycle = true;

  await db.mesocycleQueues.save(queue);
  return { success: true };
}
```

**Ograničenja swap-a:**
- Max 1 po mikrociklusu (po krugu sesija, ne po kalendarskoj nedelji)
- Samo susedne sesije u queue-u
- Samo različite particije (Lower ↔ Upper, nikad Lower ↔ Lower)
- **Za Full Body splitove (`BEG_FB_3`, `BEG_FB_4`) swap opcija se ne prikazuje** — sve sesije su `FullBody` particija, swap nema smisla

### Korak 3 — Primena Goal Overlay-a

```typescript
function applyGoalOverlay(skeleton: SessionSkeleton, goal: PrimaryGoal): SessionSkeleton {
  const modified = cloneDeep(skeleton);

  switch (goal) {
    case 'glute_focus':
      // 1. Na svakom Lower danu: pomeri glute_builder slot na poziciju 1
      // 2. Dodaj drugu glute vežbu (izolaciju) ako nije već tu
      // 3. Osiguraj da svaka nedelja ima ≥ 2 abdukcione vežbe (može i na Upper danima kao mini-circuit)
      return applyGluteFocus(modified);

    case 'tone':
      // 1. Balansiraj upper/lower slotove na 50/50
      // 2. Poslednje 2 vežbe svakog treninga: markiraj kao superset
      return applyTone(modified);

    case 'fat_loss':
      // 1. Overwrite rest times na 45-60s
      // 2. Dodaj LISS cardio section na rest dane (30-40 min)
      // NOTE: ne diramo težine/reps — težina ostaje ista kao za hipertrofiju
      return applyFatLoss(modified);
  }
}
```

### Korak 4 — Biološki filter (Sloj 2)

```typescript
function filterAndSubstitute(
  skeleton: SessionSkeleton,
  profile: ClientTrainingProfile,
  exerciseLibrary: Exercise[]
): SessionSkeleton {
  for (const day of skeleton.days) {
    for (const slot of day.exerciseSlots) {
      // Za svaki slot, biramo konkretnu vežbu koja:
      // 1. Matchuje movementPattern i muscleGroup
      // 2. NIJE kontraindikovana za ijednu korisničku povredu
      // 3. Matchuje equipment koju korisnica ima (za MVP pretpostavimo teretanu)
      // 4. Matchuje difficulty (beginner_safe za beginnera)

      const candidates = exerciseLibrary.filter(ex =>
        ex.movementPattern === slot.movementPattern &&
        ex.primaryMuscle === slot.muscleGroup &&
        !profile.injuries.some(inj => ex.contraindications.includes(inj)) &&
        matchesDifficulty(ex, profile.experienceLevel) &&
        (profile.primaryGoal !== 'glute_focus' || slot.priority !== 'primary' || ex.isGluteBuilder)
      );

      if (candidates.length === 0) {
        // Fallback: relaksiraj kriterijume
        // 1. Prvo probaj bez muscleGroup match-a (samo movementPattern)
        // 2. Ako ni to, probaj da nađeš "gentleOn" vežbu za povredu
      }

      // Scoring: kod više kandidata, biraj na osnovu:
      // - tensionProfile ('stretch' > 'mid_range' > 'shortened' za hipertrofiju cilj)
      // - cnsLoad (niži je bolji kada je recoveryMultiplier nizak)
      // - novina (ako je korisnica već radila vežbu X puta uzastopno, prebaci na drugu — variety)

      slot.chosenExerciseId = pickBest(candidates, profile);
    }
  }
  return skeleton;
}
```

#### Substitution Matrix primer

```typescript
const SUBSTITUTION_RULES: SubstitutionRule[] = [
  {
    condition: { injury: 'lower_back' },
    forbidden: ['barbell_deadlift', 'barbell_bent_row', 'back_squat_high_load'],
    preferredReplacements: {
      'hip_dominant': ['glute_bridge', 'hip_thrust_machine', 'back_extension_bodyweight'],
      'knee_dominant': ['leg_press', 'goblet_squat', 'bulgarian_split_squat_low_load'],
    },
  },
  {
    condition: { injury: 'knee_general' },
    forbidden: ['deep_barbell_squat', 'jump_squat', 'lunge_reverse_deep'],
    preferredReplacements: {
      'knee_dominant': ['leg_press_partial_rom', 'wall_sit_isometric', 'step_up_low_box'],
    },
  },
  {
    condition: { injury: 'shoulder_impingement' },
    forbidden: ['behind_neck_press', 'upright_row', 'wide_grip_bench'],
    preferredReplacements: {
      'vertical_push': ['landmine_press', 'neutral_grip_db_press', 'machine_shoulder_press'],
      'horizontal_push': ['neutral_grip_db_bench', 'machine_chest_press'],
    },
  },
  // ... 15-20 pravila ukupno
];
```

### Korak 5 — Kalibracija volumena (Sloj 3)

```typescript
function calibrateVolume(skeleton: SessionSkeleton, profile: ClientTrainingProfile, cycleDay?: CyclePhase) {
  const recovery = profile.recoveryMultiplier;
  const baseZone = mapMultiplierToZone(recovery); // MEV / MEV-MAV / MAV / MAV-MRV

  // Dodatno: cycle modifier
  let cycleBonus = 0;
  if (profile.cycleTrackingEnabled && cycleDay) {
    if (cycleDay === 'late_follicular' || cycleDay === 'ovulation') cycleBonus = +0.05;
    if (cycleDay === 'late_luteal' || cycleDay === 'menstrual') cycleBonus = -0.08;
  }

  for (const day of skeleton.days) {
    for (const slot of day.exerciseSlots) {
      const [min, max] = slot.setsRange;
      // Recovery 0.70 → blizu min; Recovery 1.10 → blizu max
      const normalized = (recovery + cycleBonus - 0.7) / 0.4; // 0 do 1
      const setsFloat = min + normalized * (max - min);
      slot.finalSets = Math.round(setsFloat);

      // Sanity: nikad ispod MEV zone
      slot.finalSets = Math.max(slot.finalSets, min);
    }
  }
}
```

#### Menstrual cycle faze (ako je cycleTrackingEnabled)

Bazirano na CycleTracker komponenti koja već postoji u kodu:

| Faza | Dani | Volume adj. | Intensity adj. | Napomena |
|---|---|---|---|---|
| Menstrual | 1–5 | -8% | -5% | Niska estrogen/progesteron, umor. Fokus na pokret, ne na PR-ove. |
| Early Follicular | 6–9 | 0 | 0 | Stabilizacija, standard plan. |
| Late Follicular | 10–13 | +5% | +5% | **PEAK** — estrogen visok, snaga i recovery najbolji. PR dani ovde. |
| Ovulation | 14 | +5% | +3% | Još uvek dobar, ali pažnja na ligamentnu laksnost (viši rizik ACL). |
| Early Luteal | 15–21 | 0 | 0 | Standard. |
| Late Luteal (PMS) | 22–28 | -8% | -3% | Progesteron visok, voda, loša regulacija temperature. Smanji volumen. |

**Implementacija:** jednostavno dodati polje `cyclePhase` u `WorkoutSession` i koristiti ga kao multiplikator u koraku 5.

### Korak 6 — Loading (Sloj 4) sa Partition-specific Decay

Sada biramo **konkretne težine, repse, RIR, tempo, pauze**. Ključno: Loading više nije čista funkcija nedelje u mezociklusu — uzima u obzir **koliko dana je prošlo od poslednjeg treninga iste particije** i da li smo u **Return from Break** režimu.

```typescript
function loadParameters(
  session: QueuedSession,
  skeleton: SessionSkeleton,
  profile: ClientTrainingProfile,
  queue: MesocycleQueue,
  today: Date,
) {
  const level = profile.experienceLevel;
  const partition = session.partition;

  // === STEP 1: Izračunaj Decay Mode za ovu particiju ===
  const lastSeen = queue.partitionLastSeen[partition];
  const daysSince = lastSeen ? daysBetween(lastSeen.date, today) : null;

  let loadingMode: 'PROGRESS' | 'MAINTAIN' | 'MINI_DELOAD';

  if (daysSince === null) {
    loadingMode = 'PROGRESS'; // prvi trening ikada za ovu particiju
  } else if (daysSince < 4) {
    loadingMode = 'PROGRESS';
  } else if (daysSince <= 7) {
    loadingMode = 'MAINTAIN';
  } else {
    loadingMode = 'MINI_DELOAD';
  }

  // === STEP 2: Override ako je Return from Break aktivan ===
  const returnCountdown = queue.returnFromBreakCountdown[partition] ?? 0;
  if (returnCountdown > 0) {
    loadingMode = 'MINI_DELOAD'; // nastavi -20% / -50% dok countdown ne dostigne 0
  }

  // === STEP 3: Aktiviraj Return from Break ako tek ulazimo ===
  if (loadingMode === 'MINI_DELOAD' && daysSince !== null && daysSince > 7 && returnCountdown === 0) {
    queue.returnFromBreakCountdown[partition] = 2; // 2 lagane sesije po povratku
  }

  // === STEP 4: Illness penalty (ako je aktivna PauseEvent sa pauseType: 'illness') ===
  const activeIllness = getActivePauseEvent(profile.clientId, 'illness');
  let illnessPenalty = 0;
  if (activeIllness && activeIllness.penaltySessionsRemaining > 0) {
    illnessPenalty = -0.15; // dodatno -15% na Recovery Multiplier
  }

  const effectiveRecoveryMultiplier = profile.recoveryMultiplier + illnessPenalty;

  // === STEP 5: Loading za svaku vežbu ===
  for (const day of skeleton.days) {
    if (day.dayType !== session.dayType) continue; // samo aktivnu sesiju

    for (const slot of day.exerciseSlots) {
      const exercise = getExercise(slot.chosenExerciseId);
      const progressState = getProgressState(profile.clientId, exercise.id);

      // REPS, TEMPO, RIR — kao ranije
      slot.targetReps = pickRepsInZone(day.defaultRepRangeZone, exercise, level);
      slot.targetTempo = level === 'beginner' ? '2-0-1-0' : '3-1-1-0';
      slot.targetRIR = calcRIR(queue.mesocycleIndex, level, loadingMode);
      slot.targetRest = calcRest(profile.primaryGoal, day.defaultRepRangeZone);

      // WEIGHT — zavisi od loadingMode
      const lastWeight = progressState?.currentWorkingWeight ?? estimateInitialWeight(profile, exercise);

      switch (loadingMode) {
        case 'PROGRESS':
          // Double Progressive Overload (standard)
          slot.targetWeight = calcProgressiveWeight(progressState, exercise);
          break;

        case 'MAINTAIN':
          // Stagnacija — iste težine
          slot.targetWeight = lastWeight;
          slot.loadingNote = 'Iste težine kao prošli put';
          break;

        case 'MINI_DELOAD':
          // -20% na težinu
          slot.targetWeight = roundToIncrement(lastWeight * 0.80, exercise.weightIncrement);
          // -50% na broj serija (samo ako je returnFromBreak aktivan)
          if (returnCountdown > 0) {
            slot.finalSets = Math.max(1, Math.floor(slot.finalSets * 0.50));
          }
          slot.loadingNote = returnCountdown > 0
            ? 'Dobrodošla nazad! Lagana sesija da se vratimo u ritam.'
            : 'Lagana sesija — fokus na tehniku.';
          break;
      }
    }
  }

  // === STEP 6: Dekrement Return from Break countdown posle sesije (ovo se radi u post-workout) ===
  // (Vidi sekciju 7 — Auto-regulacija)

  return { session, loadingMode, illnessPenaltyApplied: illnessPenalty < 0 };
}
```

#### Odluka flow — sažetak

```
daysSince < 4      →  PROGRESS     (težina ↑, volume normalan)
daysSince 4-7      →  MAINTAIN     (težina =, volume normalan)
daysSince > 7      →  MINI_DELOAD  (težina ↓20%, volume ↓50% na 2 sesije)
                      + aktivira Return from Break countdown

AKO je pauseType = illness:
                     dodatno RecoveryMultiplier -0.15 za prve 2 sesije
```

#### Rep Ranges po nivou — direktno iz Master Prompt-a v2.0

**Beginner (linearna):**
- Compound: 5–10 reps
- Izolacija: 10–12 reps
- Tempo: 2-0-1-0

**Intermediate (undulating):**
- Tenzija (Lower1): 6–8 reps, RIR 2
- Hipertrofija (Lower2, Upper): 8–12 reps, RIR 2
- Metabolički (Lower3 kod 5x): 12–20 reps, RIR 0–1, isključivo mašine
- Tempo: 3-1-1-0

#### RIR progresija kroz mezociklus (5-nedeljni ciklus sa deload-om)

| Nedelja | RIR (beg) | RIR (int) | Napomena |
|---|---|---|---|
| 1 | 3 | 3 | Adaptacija, lak start |
| 2 | 2–3 | 2 | Build-up |
| 3 | 2 | 1–2 | Blizu zlatne sredine |
| 4 | 1–2 | 0–1 | Peak intenzitet |
| 5 | **DELOAD** | **DELOAD** | Volume -50%, težina -20% |

---

## 6. Programiranje kroz cikluse

Ovo je sloj "iznad" treninga — kako se plan menja **kroz nedelje**.

### 6.1 Makrociklus default

**MVP — 12 nedelja:**
- Mezociklus 1: nedelje 1–4 (akumulacija volumena, linearna progresija težina)
- DELOAD: nedelja 5
- Mezociklus 2: nedelje 6–9 (intensifikacija, manje volumena, veći intenzitet)
- DELOAD: nedelja 10
- Mezociklus 3: nedelje 11–12 (re-test, potencijalno level-up provera)

> **Napomena o trajanju mezociklusa (UPDATE 2026-05-08):** Originalni MVP plan je bio 4+1=5 nedelja (RP/Israetel). Posle pocetnici.md spec-a, **default je 6+1=7 nedelja po ciklusu** — početnice trebaju 14-20 dana neuralne adaptacije; 4-nedeljni blok se završi pre nego što stvarno počne stimulus. Lifestyle adjustment: san <6h prosečno → mezo se produžava na 8 nedelja sa Overreach blokom (videti `src/utils/training/lifestyleAdjustments.ts`).

### 6.2 Deload protokol — konkretna pravila

Deload se **može aktivirati na dva načina**:

**A. Planirano** — svaka 5. nedelja (default)
- Volumen −50% (pola serija)
- Intenzitet −20% (težina pada)
- Rep range ostaje isti
- RIR 4–5 (nikad blizu otkaza)

**B. Auto-triggered** — ako algoritam detektuje overreaching
Triggeri:
- 2 uzastopna treninga na kojima je klijentkinja failоvala target reps (npr. planirano 8, uradila 5)
- Check-in self-report: "jako umorna", "bolovi u zglobovima" 2 nedelje zaredom
- Pad u PR-ovima 2 treninga zaredom

Kada se auto-deload triggeruje, algoritam **preskače ostatak tekućeg mezociklusa i ubacuje deload nedelju odmah**.

### 6.3 Kako se mezociklusi razlikuju

| Aspekt | Mezo 1 (akumulacija) | Mezo 2 (intensifikacija) | Mezo 3 (re-test) |
|---|---|---|---|
| Fokus | Volume up | Volume down, intensity up | Konsolidacija |
| Rep range (compound) | 8–12 | 6–8 | 5–8 |
| Broj serija | Max (MAV) | Srednje | MEV-MAV |
| Tempo | Eccentric bias | Controlled | Normal |
| RIR finalna nedelja | 0–1 | 0 | 1–2 |
| Vežbe | Standardni skeleton | Možda rotacija (varijacije) | Vraća se na originalne, merimo progres |

Napomena: za **beginnera**, mezociklusi su **suptilnije razlikuju** — uglavnom samo linearno raste težina, sa rotacijom vežbi (npr. mezo 1 Goblet Squat → mezo 2 Front Squat) da klijentkinja uči nove pokrete.

---

## 7. Auto-regulacija

Ovo je "in-workout brain" — kako algoritam reaguje na ono što klijentkinja radi.

### 7.1 Double Progression — srce progresije

Najvažniji mehanizam. Za svaku vežbu:

```
Target rep range: 8-12
Trenutna težina: 40kg

Trening 1: 40kg × 8, 7, 7  →  nije hit top; ostavi 40kg za sledeći put
Trening 2: 40kg × 9, 8, 7  →  bliži vrhu; ostavi 40kg
Trening 3: 40kg × 10, 10, 9 →  dva seta na 10+, BLIZU vrha; ostavi 40kg još jednom
Trening 4: 40kg × 12, 11, 10 → PRVI SET dostigao top reps; sledeći put ↑ težinu
Trening 5: 42.5kg × 9, 8, 7  →  pale reps ali to je normalno, krenuo novi ciklus
```

**Pravilo:** Kada klijentkinja odradi **top reps u prvom setu** (npr. 12 od 12 target), sledeći trening algoritam **doda minimum increment** (2.5kg za compound, 1kg za izolaciju — ili 1.25kg za one sa mini-tegovima).

### 7.2 Regresija kada ne uspeva

```
Target: 40kg × 8-12
Trenutni trening: 40kg × 6, 5, 4 — pao je pod donji prag

Šta algoritam radi:
1. Prvi put: ništa, može biti loš dan. Zadrži 40kg za sledeći put.
2. Drugi put zaredom: smanji težinu na 37.5kg i "zavrti" Double Progression iz početka.
3. Treći put: ako je i dalje problem → auto-deload trigger.
```

### 7.3 In-workout set targets

Na svakom setu, algoritam prikazuje:

- **Target weight** (npr. 40kg)
- **Target reps** (npr. "8–12")
- **Target RIR** (npr. "2 u rezervi")
- **Previous best** (za uporedni UI — "prošli put 40kg × 10")

Korisnica unosi:
- **Actual weight** (default = target, može da menja)
- **Actual reps**
- **Optional: actual RIR** (ako hoće finer control)

Na osnovu toga, algoritam prebacuje u rest timer i **ažurira progress_state** za tu vežbu.

### 7.4 Progress state (šta se pamti)

```typescript
interface ExerciseProgressState {
  clientId: string;
  exerciseId: number;

  currentWorkingWeight: number; // trenutna težina
  currentRepTarget: [number, number]; // [min, max]

  consecutiveSuccesses: number; // koliko puta je hit top reps
  consecutiveFailures: number; // koliko puta je pao ispod min
  lastTrainingDate: Date;

  allTimeHeaviest: number; // PR record
  allTimeHeaviestReps: number;

  history: ExerciseHistoryEntry[]; // zadnjih 10 treninga
}
```

### 7.5 Handling Life Events (Decay & Pause)

Ova podsekcija pokriva **šta se dešava kad život presekne redovnost** — bolest, putovanje, obaveze, ili jednostavno "zaboravila sam na trening 5 dana". Biologija ne čeka kalendar; algoritam to prepoznaje i prilagođava se bez krivice prema klijentkinji.

#### Partition-specific Decay tajmer

**Ključno pravilo:** "dana pauze" se **ne** računa od poslednjeg bilo kog treninga, nego od **poslednjeg treninga iste particije**. Razlog: kad klijentkinja dolazi na Lower dan, bitno je kada su noge poslednji put trenirane, ne kada je bilo kakav trening bio.

```
Primer: U/L split, klijentkinja je trenirala:
  Lower (A2) — 12. april
  Upper (B2) — 14. april
  [pauza]
  Danas je 20. april, sledeća je Lower (A3).

  daysSince za Lower particiju = 20 - 12 = 8 dana  →  MINI_DELOAD
  (Upper je bio pre 6 dana, ali nas zanima Lower)
```

#### Decay pragovi (pregled)

| Dana pauze | Režim | Težina | Volume (serije) | Poseban UI |
|---|---|---|---|---|
| 0–3 | **PROGRESS** | ↑ Double Progressive Overload | Normalno | Nijedan |
| 4–7 | **MAINTAIN** | = Iste kao prošli put | Normalno | "Iste težine kao prošli put" |
| 8+ | **MINI_DELOAD** | −20% | Normalno (osim ako Return from Break) | "Lagana sesija — vraćamo se polako" |

#### Return from Break — 2 lagane sesije po particiji

Kada se detektuje pauza > 7 dana, algoritam aktivira **Return from Break protokol** koji traje **2 sledeće sesije iste particije**:

- **Težina:** −20% (kao MINI_DELOAD)
- **Volume:** −50% broj serija (5 serija → 3 serije, 4 → 2, 3 → 2, zaokruženo nadole, minimum 1)
- **Trajanje:** 2 sesije per particija (Lower countdown i Upper countdown su nezavisni)

```
Primer: Vratila se posle 10 dana pauze.

Lower sesija 1 (A3, dan 0):
  loadingMode = MINI_DELOAD
  returnFromBreakCountdown.Lower = 2 (aktiviramo)
  Težina: −20%, Serije: −50%
  UI: "Dobrodošla nazad! Lagana sesija da se vratimo u ritam."

[posle sesije, countdown → 1]

Upper sesija (B3, dan 2):
  loadingMode zavisi od Upper particije zasebno
  Ako je i Upper pauziran >7 dana:
    returnFromBreakCountdown.Upper = 2
    Isti tretman kao Lower

Lower sesija 2 (A4, dan 4):
  countdown.Lower = 1, i dalje MINI_DELOAD
  Težina: −20%, Serije: −50%
  UI: "Još jedna laka, pa se vraćamo na puno."

[posle sesije, countdown → 0]

Lower sesija 3 (A5, dan 6):
  countdown.Lower = 0
  loadingMode = PROGRESS (vraćamo se normalno)
  UI: Nijedan poseban banner
```

#### Manual Override — "Osećam se spremno"

Klijentkinja može da preskoči ostatak Return from Break protokola klikom na dugme:

```
U UI-u (samo tokom MINI_DELOAD sesije):
  [Osećam se spremno za punu težinu →]

On click:
  queue.returnFromBreakCountdown[partition] = 0
  loadingMode se prebacuje na MAINTAIN za tu sesiju (težina = last working weight)
  Od sledeće iste-particije sesije: PROGRESS normalno
```

**UX napomena:** dugme je **diskretno, ne agresivno** — ne želimo da klijentkinja oseti pritisak da preskoči protokol. Može se pojaviti tek nakon prve MINI_DELOAD sesije, ne odmah na početku.

#### Pauza modul — Bolest vs Putovanje

Klijentkinja može **eksplicitno da obeleži pauzu** preko Profile → "Pauziram trening" dugmeta. Otvara se dialog:

```
Zašto pauziraš?
  [○] Bolest       ("Telo treba oporavak, polako vraćamo intenzitet")
  [○] Putovanje    ("Nastavljamo gde smo stali, prilagođavamo težinu")
  [○] Drugo        (tretira se kao Putovanje)

Do kada (opciono)?
  [_____________] (ostavi prazno ako ne znaš)
```

**Razlika u tretmanu pri povratku:**

| Aspekt | Travel/Other | Illness |
|---|---|---|
| Decay (težina) | Standardni (zavisi od dana) | Standardni (zavisi od dana) |
| Return from Break (volume) | Ako pauza > 7 dana, aktivira se | Ako pauza > 7 dana, aktivira se |
| Recovery Multiplier penalty | Nema | −0.15 za prve 2 sesije |
| Poruka u UI-u | "Dobrodošla nazad!" | "Dobrodošla nazad! Polako vraćamo intenzitet nakon bolesti." |

Recovery Multiplier penalty (−0.15) znači da tokom prve 2 sesije posle bolesti, algoritam računa dodatno manji volumen u Sloj 3 (Kalibracija oporavka). Ako je normalni multiplier bio 1.0, privremeno je 0.85 — **MEV zona**, minimum potreban da se održi stimulus.

#### "Bez krivice" UI — Queue Strip

**Zabranjeno:**
- Reč "Propušteno" ili "Missed" bilo gde u klijentskom UI-u
- Brojanje "3 propuštene sesije ove nedelje"
- Kalendarski view sa praznim slotovima (utorak bez treninga = neuredan)
- Guilt-trip poruke ("Nisi trenirala 5 dana, idemo!")

**Obavezno:**
- Queue strip kao glavna vizualizacija rasporeda:
  ```
  [A1 ✓]  [B1 ✓]  [A2 ✓]  [B2 ✓]  [A3 ← danas]  [B3]  [A4]  [B4]
  12.04   14.04   16.04   18.04
  ```
- "Nedelja" = blok sesija (2 kruga za U/L_4 = 8 sesija), ne 7 kalendarskih dana
- Napredak: "Mezociklus 1: 4/16 sesija završeno (25%)"
- Ako je pauza duga: pozitivan ton pri povratku, ne "konačno se vratila"

**Interno** (trener vidi u analytics-u):
- Scheduled date na svakoj sesiji (datum kad je očekivana)
- Actual date (kad je završena)
- Adherence rate po nedelji (% sesija završenih u 7-dnevnom prozoru oko scheduled date-a)
- Liste aktivnih PauseEvent-ova
- Sve ovo je za trenerov dashboard, **ne za klijentkinjski**

---

## 8. Level-up sistem

Prelazak **beginner → intermediate** je najvažniji automatski prelaz.

### 8.1 Kriterijumi — radi li se AND ili OR?

Predlog: **kompozitan score na 0–100 skali, prag 70+ = promoted.**

```
score = 0

// Strength (40 poena) — ratios prema telesnoj težini
if (hip_thrust_1RM >= 1.2 × bodyweight): score += 15
if (goblet_squat_heaviest >= 0.5 × bodyweight): score += 10
if (bench_press_1RM >= 0.7 × bodyweight): score += 10
if (deadlift_1RM >= 1.0 × bodyweight): score += 5

// Technique (20 poena) — self-report + trener review (za premium)
if (monthsInProgram >= 3): score += 10
if (no_form_breakdown_flagged): score += 10

// Consistency (20 poena)
if (adherence_rate >= 80% over 8 weeks): score += 20

// Recovery tolerance (20 poena)
if (recoveryMultiplier >= 0.95): score += 20

// Promotion: score >= 70
```

**Napomena:** 1RM brojke se **ne mere direktno** (preopasno za beginnere). Umesto toga, koristi Epley formulu:
`estimated_1RM = weight × (1 + reps/30)`

Na primer, 50kg × 10 reps → `50 × (1 + 10/30) = ~66.7kg`

### 8.2 Demotion (rollback)

Takođe postoji **obrnuti prelaz**. Ako intermediate klijentkinja:
- Ima 3 uzastopne nedelje sa recoveryMultiplier < 0.85
- Ima 4 uzastopna failed treninga
- Pauzirala duže od 6 nedelja pa se vratila

→ algoritam je **privremeno prebacuje na "deloaded intermediate"** ili **fallback na beginner arhitekturu na 4 nedelje** dok se ne vrati u formu.

### 8.3 Transition ritual

Kada algoritam odluči da je vreme za promociju:

1. Klijentkinja dobije push notifikaciju: *"Čestitamo! Spremna si za sledeći nivo."*
2. Prikaz "Analysis Report"-a sa grafikom progresa
3. **Obavezni 1-nedeljni transition block** — mini deload + uvod u nove tehnike (ekscentrični tempo, RIR koncept) pre nego što krene intermediate skeleton
4. Tek onda aktivacija intermediate skeleton-a

---

## 9. Exercise Library

### 9.1 Ciljno stanje — 100 vežbi sa fokusom na žene

Trenutno u kodu: 35 vežbi. Treba dodati ~65, sa **60:40 lower/upper odnosom** (tvoje pravilo za žene).

Predlog raspodele:

| Kategorija | Broj vežbi | Primeri |
|---|---|---|
| Gluteus (primary) | 18 | Hip thrust variants, Glute bridge, Cable kickback, B-stance RDL, Frog pump, Banded clamshells |
| Quads | 12 | Leg press, Goblet squat, Bulgarian split squat, Leg extension, Sissy squat, Step-up |
| Hamstrings | 10 | RDL, Leg curl variants, Nordic curl, Glute-ham raise, Swiss ball curl |
| Glutes medius (abd) | 8 | Cable abduction, Banded side walks, Side-lying raise, Hip airplane |
| Calves | 4 | Standing, Seated, Donkey, Single-leg |
| Back (lats + upper) | 12 | Lat pulldown, Pull-up variants, Row variants, Face pull |
| Back (lower) | 3 | Back extension, Reverse hyper, Superman |
| Chest | 7 | Bench variants, DB press, Machine press, Fly variants, Push-up |
| Shoulders (front/side/rear) | 10 | OHP, Lateral raise, Rear delt fly, Cable lateral, Face pull |
| Arms (biceps/triceps) | 8 | Curl variants, Pushdown, Overhead extension, Skullcrusher |
| Core | 6 | Plank, Deadbug, Russian twist, Pallof press, Hanging leg raise, Crunch |
| Cardio/Conditioning | 2 | LISS (treadmill walk), HIIT (mountain climbers) |

**Ukupno: ~100.** Distribucija bi bila ~61 lower, ~39 upper + core = **61:39 ratio, približno 60:40.**

### 9.2 Primer potpuno tagovane vežbe

```typescript
{
  id: 101,
  name: "Barbell Hip Thrust",
  nameSr: "Hip Thrust sa šipkom",

  movementPattern: 'hip_dominant',
  primaryMuscle: 'glutes',
  secondaryMuscles: ['hamstrings', 'core'],

  tensionProfile: 'shortened', // top contraction glute squeeze
  cnsLoad: 3,
  fatigueIndex: 3,

  equipment: ['barbell', 'bench'],
  difficulty: 'intermediate', // zbog setup-a i kilaže
  requiresStabilization: true,

  contraindications: [], // nema direktne kontraindikacije
  gentleOn: ['lower_back', 'knee_general'], // odlično za one sa problemima
  isBilateral: true,
  weightIncrement: 2.5,

  videoUrl: null,
  instructions: "Nasloni gornja leđa na klupu, stavi šipku preko kukova, podigni i stisni gluteus na vrhu.",

  isGluteBuilder: true,
  isCompound: true,
  isFinisherEligible: false,
}
```

### 9.3 Zašto je tensionProfile ključan

Tvoj materijal: vežbe u **izduženom (stretch) položaju** daju jači stimulus za hipertrofiju (mTOR), ali veći zamor. U **skraćenom (shortened) položaju** → metabolički stres, pump, manji zamor.

Algoritamski: za **GLUTE_FOCUS**, Ex #1 mora biti `tensionProfile: 'stretch'` (npr. B-stance RDL ili deep Bulgarian split squat), a Ex #2 (izolacija) može biti `shortened` (kickback). Kombinujemo obe fiziološke stimulacije u istom treningu.

---

## 10. Plan implementacije

Ovo je konkretan **redosled sprint-ova** koji predlažem. Svaki sprint ima jasan deliverable.

### Sprint 1 — Type system + Exercise Library expansion (1–2 nedelje)

**Deliverable:**
- `/src/types/training.ts` sa svim tipovima iz sekcije 4
- `/src/data/exerciseLibraryV2.ts` — 100 vežbi sa punim tagovanjem
- Unit testovi za type guardove

**Tvoj posao (trener):** Pregled taxonomy, potvrda movementPattern enuma, finalna lista 100 vežbi. Verovatno 1 sesija ~2h.

### Sprint 2 — Profile Builder (recoveryMultiplier) (3–5 dana)

**Deliverable:**
- `/src/utils/training/profileBuilder.ts`
- `buildTrainingProfile(onboarding)` funkcija
- `calcRecoveryMultiplier()` sa testovima za edge case-ove
- Integracija u Onboarding.tsx — posle 11. pitanja generiše i persistuje profile

**Test cases:**
- Zdrava 25-godišnjakinja, 8h sna, stres 2 → multiplier ~1.05
- 40-godišnjakinja sa Hashimoto, 5h sna, stres 4 → multiplier ~0.75
- 30-godišnjakinja, 6h sna, stres 3, normalni metabolizam → multiplier ~0.95

### Sprint 3 — Session Skeletons (1 nedelja)

**Deliverable:**
- `/src/data/sessionSkeletons.ts` — svih 6 skeleton-a kao data
- `/src/utils/training/skeletonSelector.ts` sa `selectSkeleton(profile)`

**Tvoj posao:** Finalna verifikacija svakog skeleton-a (koliko slotova, koji movementPattern po slot-u, koji rep range).

### Sprint 4 — Goal Overlays + Filter + Substitution (1 nedelja)

**Deliverable:**
- `/src/utils/training/goalOverlays.ts`
- `/src/utils/training/filterEngine.ts`
- `/src/data/substitutionRules.ts`

### Sprint 5 — Volume Calibration + Loader (1 nedelja)

**Deliverable:**
- `/src/utils/training/volumeCalibrator.ts`
- `/src/utils/training/loader.ts` (RIR, tempo, rest, weight estimation)
- End-to-end: onboarding → profile → skeleton → filter → calibrate → load → finalni JSON

### Sprint 6 — Program generator + cycle scheduling (1–2 nedelje)

**Deliverable:**
- `/src/utils/training/programGenerator.ts` — generiše 12-nedeljni makrociklus
- Scheduling: kada je koji trening (vezano za startDate)
- Database migrations za `training_programs`, `workout_sessions`, `exercise_progress_state`

### Sprint 7 — Auto-regulacija (in-workout) (1 nedelja)

**Deliverable:**
- `/src/utils/training/autoRegulator.ts`
- Double Progression logic
- Regresija logic
- Update ActiveWorkout.tsx da koristi realne targete (ne hardcode-ovane)

### Sprint 8 — Level-up system + Deload triggers (1 nedelja)

**Deliverable:**
- `/src/utils/training/levelUpEvaluator.ts`
- `/src/utils/training/deloadTrigger.ts`
- UI: AnalysisReport sa strength tier grafikom

### Ukupno — ~8 nedelja za kompletan training algoritam

Posle ovoga → **Faza 2: Nutrition**.

---

## Dodaci

### Dodatak A — Otvorena pitanja za potvrdu

Pre nego što krenemo Sprint 1, potrebno je da potvrdiš ili razjasniš:

1. **Equipment predpostavka** — Da li je MVP "gym-only" (korisnica ima pristup punoj teretani)? Ili moramo pokriti i "home gym" scenario (samo bučice + bandovi)?

2. **Cycle tracking** — Imaš `CycleTracker` komponentu. Da li je ona već funkcionalna (klijentkinja loguje početak menstruacije), ili je placeholder? Ako jeste, algoritam može odmah da je koristi za cyclePhase. Ako nije, za MVP radimo bez cycle adjustment-a i dodajemo kasnije.

3. **Level-up kriterijumi** — Brojke u sekciji 8.1 (0.5× bodyweight goblet squat, 0.7× bench, 1.2× hip thrust) su standardni literature benchmarks. Da li imaš tvoje brojke iz prakse koje bi koristio umesto njih?

4. **Rotacija vežbi unutar mezociklusa** — Da li želiš da se vežbe **menjaju svake nedelje** (kao što RP radi), ili se **drže iste kroz mezociklus** (kao što Juggernaut radi)? Preporuka za MVP: **drže se iste kroz mezociklus, menjaju se na novi mezociklus** (jednostavnije, klijentkinja ne mora da uči nove pokrete svake nedelje).

**Potvrđeno u v1.1:** Beginner = uvek Full Body; frekvencija filtrirana u onboardingu (beg: 3/4, int: 4/5).

### Dodatak B — Šta sistem **neće** da radi u MVP-u

Da ne dođe do scope creep-a, sledeće eksplicitno **nije u MVP**:

- Napredni vežbači (blok periodizacija, rest-pause, cluster sets) — njih vodi trener 1-na-1
- Vežbe sa specijalizovanom opremom (TRX, GHR, Reverse Hyper, sled)
- Trudnoća/postpartum programi (poseban vertical, kasnije)
- Strongman/powerlifting specifične progresije
- 3+ obe dnevni split-ovi
- Dinamičko menjanje splita unutar mezociklusa (npr. "prvu nedelju UL, drugu FB")
- Integracija sa wearables (HRV, RHR) — može biti v2

### Dodatak C — Terminološki rečnik (za dev tim)

| Termin | Značenje |
|---|---|
| **Session Skeleton** | Trenerov prazan kostur nedelje (koje dane, koje movement patterns, koji rep range zone) |
| **ExerciseSlot** | Jedna "rupa" u skeletonu koja definiše *šta mora biti*, ne *koja vežba konkretno* |
| **Goal Overlay** | Set pravila koji modifikuje skeleton na osnovu primarnog cilja |
| **Recovery Multiplier** | Brojka 0.7–1.1 koja diktira gde u MEV/MAV/MRV zoni klijentkinja radi |
| **Strength Tier** | Klasifikacija snage na osnovu dignutih kilaža relativno na bw (novice/learner/competent/proficient) |
| **Double Progression** | Progresija gde prvo raste broj reps-a unutar range-a, zatim težina, pa se reps resetuju |
| **Macrocycle** | 12 nedelja (MVP default) |
| **Mesocycle** | 6 nedelja akumulacije + 1 deload = 7 nedelja (pocetnici.md §2.1, 2026-05-08 update) |
| **Microcycle** | Jedna nedelja treninga |

---

**Kraj dokumenta — v1.0**

*Sledeći korak: potvrdi 5 pitanja iz Dodatka A, pa krećemo Sprint 1.*
