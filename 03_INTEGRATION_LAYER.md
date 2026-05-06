# FlexFemmeFit — Core Integration Layer (Sync Engine)

**Verzija:** v1.0
**Svrha:** Definiše tačno kako se Training (`01`) i Nutrition (`02`) sistemi povezuju u jednu biološku celinu kroz centralni `UserStatus` objekat i Sync Engine.
**Predusovljava:** `01_TRAINING_FLOW_MASTER.md` v2.0, `02_NUTRITION_FLOW_MASTER.md` v1.1

---

## Sadržaj

1. [Filozofija integracije](#1-filozofija-integracije)
2. [Centralni UserStatus objekat](#2-centralni-userstatus-objekat)
3. [Sync Engine — pravila integracije](#3-sync-engine--pravila-integracije)
4. [Vlasništvo podataka — ko piše šta](#4-vlasnistvo-podataka)
5. [Event-driven komunikacija](#5-event-driven-komunikacija)
6. [Frontend mapping — gde se to vidi](#6-frontend-mapping)
7. [Plan implementacije — Sprint I](#7-plan-implementacije)

---

## 1. Filozofija integracije

### Problem koji rešavamo

Training i Nutrition sistemi su pisani kao **dva odvojena algoritma** sa svojom logikom. U realnosti, telo ne razlikuje "trening modul" od "ishrana modul" — to je jedan organizam. Ako trening ode u Deload, a ishrana ostane u agresivnom deficitu, telo se ne može oporavljati. Ako klijentkinja loše spava, oba sistema moraju da reaguju koordinisano.

**Bez integration sloja, dva sistema bi mogli da:**
- Daju kontradiktorne signale (trening +20% volumena, ishrana -20% kalorija u istoj nedelji)
- Dupliraju računanja (oba sistema čitaju `recoveryMultiplier` ali svaki na svoj način)
- Promaše kritične događaje (trening Deload se aktivira, ishrana ne zna)

### Rešenje — `UserStatus` kao Single Source of Truth

Jedan centralni objekat čuva **sve trenutno stanje klijentkinje**. Oba sistema (training, nutrition) čitaju iz njega i pišu u njega. Sync Engine garantuje konzistentnost.

```
┌─────────────────────────────────────────────────┐
│         UserStatus (Single Source of Truth)     │
│  bio | training state | nutrition state         │
└─────────────────────────────────────────────────┘
            ▲                     ▲
            │                     │
   ┌────────┴────────┐   ┌────────┴────────┐
   │ Training Module │   │ Nutrition Module│
   │ (algoritam 01)  │   │ (algoritam 02)  │
   └─────────────────┘   └─────────────────┘
            ▲                     ▲
            └─────────┬───────────┘
                      │
              ┌───────┴────────┐
              │  Sync Engine   │
              │ (if-then sync) │
              └────────────────┘
```

### Tri pravila integracije

**Pravilo 1 — Nikad direktna komunikacija između sistema.**
Training modul nikad ne zove funkcije iz Nutrition modula direktno. Sve ide kroz `UserStatus` ili Sync Engine event-e.

**Pravilo 2 — Svaki podatak ima jednog vlasnika.**
Sleep hours npr. ima jednog "writer-a" (DailyCheckIn forma). Oba modula čitaju, samo jedan piše.

**Pravilo 3 — Sync Engine je idempotentan.**
Ako se isti event obradi 2 puta, rezultat mora biti isti (nema akumulacije bug-ova).

---

## 2. Centralni UserStatus objekat

### 2.1 Struktura

```typescript
interface UserStatus {
  clientId: string;
  lastUpdatedAt: Date;

  // === BIO DATA (šta telo trenutno radi) ===
  bio: {
    currentWeightMA5: number;        // 5-day moving average
    weightTrend: 'losing' | 'maintaining' | 'gaining' | 'insufficient_data';
    weeklyWeightDelta: number;       // kg/nedelja na osnovu MA5

    cycleDay: number | null;         // null ako Cycle Tracker nije aktiviran
    cyclePhase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | null;
    weightDataReliable: boolean;     // false tokom menstrualnog perioda

    recoveryMultiplier: number;      // 0.7 - 1.1, izračunat
    sleepLast7DaysAvg: number;       // sati
    stressLast7DaysAvg: number;      // 1-5
    hydrationLast7DaysAvgMl: number; // ml
  };

  // === TRAINING STATE ===
  training: {
    activeTemplateId: string;        // koji template je snapshot-ovan
    sessionPointer: number;          // pozicija u queue-u
    nextSessionId: string;           // npr. "A3"
    nextSessionPartition: 'Lower' | 'Upper' | 'FullBody';

    partitionLastSeen: {
      Lower?: { date: Date; sessionId: string };
      Upper?: { date: Date; sessionId: string };
      FullBody?: { date: Date; sessionId: string };
    };

    isInDeload: boolean;             // KRITIČAN flag za nutrition sync
    isInReturnFromBreak: boolean;
    currentMesocycleIndex: number;
    currentMicrocycleIndex: number;

    activePauseEvent: {
      type: 'illness' | 'travel' | null;
      startDate: Date | null;
      penaltySessionsRemaining: number;
    } | null;
  };

  // === NUTRITION STATE ===
  nutrition: {
    bmr: number;
    tdee: number;
    currentCalorieTarget: number;    // dnevni target (već prilagođen sync-om)
    targetMode: 'deficit' | 'recomposition' | 'lean_bulk' | 'maintenance';

    macros: {
      proteinG: number;
      carbsG: number;
      fatG: number;
    };

    metabolicFilter: Array<'IR' | 'Hashimoto' | 'PCOS' | 'Hypertension'>;
    isMetabolicNoiseTriggered: boolean;  // tečne kalorije > 10%
    hydrationTargetMl: number;
    hydrationTodayMl: number;

    measurementWeekActive: boolean;
    measurementWeekDay: number;      // 1-7 ili 0 ako nije aktivna
    daysSincePlanChange: number;     // za 10-day stagnation override

    activeRefeedDay: boolean;        // da li je danas refeed
  };

  // === RED FLAGS (za trener dashboard) ===
  redFlags: {
    skipCount7d: number;             // broj preskočenih obroka u 7 dana
    metabolicNoiseDays7d: number;    // koliko dana je triger-ovala buka
    energyBelowThreshold7d: number;  // koliko dana energija < 5/10
    consecutiveFailedWorkouts: number;
    daysSinceLastWeeklyCheckIn: number;
    isAtRisk: boolean;               // computed: any of above triggers attention
  };
}
```

### 2.2 Lifecycle

**Kreiranje:** Posle završetka onboardinga, jednom se inicijalizuje `UserStatus` sa default-ima.

**Update frekvencija:**
- Posle svakog DailyCheckIn-a (svako jutro): `bio.*` se ažurira
- Posle svakog završenog treninga: `training.*` se ažurira
- Posle svakog meal log-a: `nutrition.hydrationTodayMl`, `nutrition.isMetabolicNoiseTriggered`
- Posle svakog WeeklyCheckIn-a: `bio.weeklyWeightDelta`, `nutrition.daysSincePlanChange` reset
- **Sync Engine se okida posle SVAKE promene** — proverava da li neka pravila treba aktivirati

**Persistencija:** Supabase tabela `user_status` (1 red po klijentkinji, update-uje se in-place).

```sql
CREATE TABLE user_status (
  client_id UUID PRIMARY KEY REFERENCES profiles(id),
  status_json JSONB NOT NULL,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Indexed kolone za brze upite (denormalizovano iz JSON-a)
  is_in_deload BOOLEAN GENERATED ALWAYS AS ((status_json->'training'->>'isInDeload')::boolean) STORED,
  is_at_risk BOOLEAN GENERATED ALWAYS AS ((status_json->'redFlags'->>'isAtRisk')::boolean) STORED,
  cycle_phase TEXT GENERATED ALWAYS AS (status_json->'bio'->>'cyclePhase') STORED
);

CREATE INDEX idx_user_status_at_risk ON user_status (is_at_risk) WHERE is_at_risk = true;
CREATE INDEX idx_user_status_deload ON user_status (is_in_deload) WHERE is_in_deload = true;
```

---

## 3. Sync Engine — pravila integracije

### 3.1 Glavni entry point

```typescript
async function processDailyCheckIn(
  clientId: string,
  checkIn: DailyCheckIn
): Promise<UserStatus> {

  // 1. Učitaj trenutni status
  const status = await loadUserStatus(clientId);

  // 2. Update bio sekciju iz check-in-a
  status.bio.currentWeightMA5 = recalcMA5(clientId, checkIn.weightKg);
  status.bio.sleepLast7DaysAvg = recalc7DayAvg(clientId, 'sleepHours', checkIn.sleepHours);
  status.bio.stressLast7DaysAvg = recalc7DayAvg(clientId, 'stressLevel', checkIn.stressLevel);
  status.bio.hydrationLast7DaysAvgMl = recalc7DayAvg(clientId, 'waterIntakeMl', checkIn.waterIntakeMl);
  status.bio.recoveryMultiplier = recalcRecoveryMultiplier(status.bio);

  // 3. Cycle update (ako je tracker aktivan)
  if (checkIn.cycleDay) {
    status.bio.cycleDay = checkIn.cycleDay;
    status.bio.cyclePhase = getCyclePhase(checkIn.cycleDay);
    status.bio.weightDataReliable = checkIn.cycleDay > 5; // false tokom menstrualnog
  }

  // 4. POKRENI SVE SYNC RULES
  await runSyncRules(status);

  // 5. Update Red Flags
  status.redFlags = await calcRedFlags(clientId, status);

  // 6. Save i return
  await saveUserStatus(status);
  return status;
}
```

### 3.2 Sync Rules — kompletan if-then katalog

```typescript
async function runSyncRules(status: UserStatus): Promise<void> {

  // === RULE 1: Hormonal Sync (Lutealna faza) ===
  if (status.bio.cyclePhase === 'luteal') {
    // Nutrition: +150 kcal (carbs)
    status.nutrition.currentCalorieTarget += 150;
    status.nutrition.macros.carbsG += 38; // 150kcal / 4 = 37.5g

    // Training: smanji intenzitet za jedan nivo (signaliziraj training modulu)
    await emitEvent('TRAINING_INTENSITY_REDUCE', {
      clientId: status.clientId,
      reason: 'luteal_phase',
      reduction: 0.05, // -5% targetSets
    });
  }

  // === RULE 2: Fatigue Sync (San + Stres) ===
  if (status.bio.sleepLast7DaysAvg < 6 || status.bio.stressLast7DaysAvg > 4) {
    // Training: smanji volumen
    await emitEvent('TRAINING_VOLUME_REDUCE', {
      clientId: status.clientId,
      reason: 'low_recovery',
      reduction: 0.15, // -15% serija
    });

    // Nutrition: prebaci na maintenance (zaštita metabolizma)
    if (status.nutrition.targetMode === 'deficit') {
      status.nutrition.currentCalorieTarget = Math.round(status.nutrition.tdee * 1.0);
      status.nutrition.targetMode = 'maintenance';
      status.nutrition._fatigueSyncActive = true;
    }
  }

  // === RULE 3: Deload Sync (Training → Nutrition) ===
  if (status.training.isInDeload) {
    // Nutrition: maintenance (osim za lean_bulk koji ostaje)
    if (status.nutrition.targetMode === 'deficit' || status.nutrition.targetMode === 'recomposition') {
      status.nutrition.currentCalorieTarget = Math.round(status.nutrition.tdee * 1.0);
      status.nutrition.targetMode = 'maintenance';
      status.nutrition._deloadSyncActive = true;
    }
  }

  // === RULE 4: Return from Break Sync ===
  if (status.training.isInReturnFromBreak) {
    // Nutrition: blago smanji deficit (sa -20% na -8%)
    if (status.nutrition.targetMode === 'deficit') {
      status.nutrition.currentCalorieTarget = Math.round(status.nutrition.tdee * 0.92);
      status.nutrition._returnSyncActive = true;
    }
  }

  // === RULE 5: Hydration First (energija pad) ===
  const hydrationRate = status.nutrition.hydrationTodayMl / status.nutrition.hydrationTargetMl;
  if (status.bio.recoveryMultiplier < 0.85 && hydrationRate < 0.70) {
    // Pre svake druge promene, sugeriši vodu
    await emitEvent('HYDRATION_FIRST_WARNING', {
      clientId: status.clientId,
      message: 'Pre nego što menjamo plan, popij 500ml vode.',
    });
    // BLOKIRAJ druge auto-prilagođavanja na 24h
    status._blockMacroChangesUntil = addHours(new Date(), 24);
  }

  // === RULE 6: Metabolic Noise Block ===
  if (status.nutrition.isMetabolicNoiseTriggered) {
    // Ne menjaj plan dok klijentkinja ne reguliše tečne kalorije
    status._blockProgressionUntil = addDays(new Date(), 3);
  }

  // === RULE 7: Illness Penalty Sync ===
  if (status.training.activePauseEvent?.type === 'illness') {
    // Recovery multiplier je već smanjen u training modulu (-0.15)
    // Nutrition: ne agresivni deficit dok traje
    if (status.nutrition.targetMode === 'deficit') {
      status.nutrition.currentCalorieTarget = Math.round(status.nutrition.tdee * 0.95);
      // -5% je sigurniji za oporavak nego standardni -20%
    }
  }

  // === RULE 8: Cycle Menstrual — ignore weight ===
  if (status.bio.cyclePhase === 'menstrual') {
    status.bio.weightDataReliable = false;
    // Weekly check-in algoritam će znati da preskoči adaptaciju ove nedelje
  }
}
```

### 3.3 Idempotentnost

Pravila su pisana tako da **višestruko izvršavanje daje isti rezultat**. Ne koristimo "+= 150" iznova; svaki put rekreiramo target iz baznih podataka:

```typescript
// LOŠE — akumulacija
status.nutrition.currentCalorieTarget += 150; // svaki put dodaje 150

// DOBRO — rekonstrukcija
function recalcCalorieTarget(status: UserStatus): number {
  let target = status.nutrition.tdee;

  // Goal-based base
  if (status.nutrition.targetMode === 'deficit') target *= 0.80;
  else if (status.nutrition.targetMode === 'recomposition') target *= 0.90;
  else if (status.nutrition.targetMode === 'lean_bulk') target *= 1.075;

  // Sync overrides (idempotentni — uvek rekonstruišu)
  if (status.training.isInDeload) target = status.nutrition.tdee * 1.0;
  if (status.bio.cyclePhase === 'luteal') target += 150;

  // Floor
  return Math.max(target, 1400);
}
```

---

## 4. Vlasništvo podataka — ko piše šta

Da bi se izbegli race condition-i i konfuzija, svaki podatak ima **tačno jednog writer-a**.

| Podatak | Vlasnik (Writer) | Čitaoci (Readers) |
|---|---|---|
| `weightKg` (raw) | DailyCheckIn forma | UserStatus → MA5 |
| `currentWeightMA5` | UserStatus (računato) | Training (level-up), Nutrition (adaptacija), Trener Analytics |
| `sleepHours`, `stressLevel`, `waterIntakeMl` | DailyCheckIn forma | UserStatus |
| `recoveryMultiplier` | UserStatus (računato) | Training (volume calibration), Nutrition (sync rules) |
| `cycleDay`, `cyclePhase` | DailyCheckIn (ako enabled) ili manual unos | UserStatus → Training, Nutrition |
| `sessionPointer`, `nextSessionId` | Training Module (`onSessionCompleted`) | UserStatus, Frontend |
| `isInDeload` | Training Module (`programGenerator`) | UserStatus → Nutrition Sync |
| `partitionLastSeen` | Training Module | UserStatus → Decay calc |
| `bmr`, `tdee` | Onboarding (jednom) + Profile update | Nutrition (svako računanje) |
| `currentCalorieTarget` | Sync Engine (recalc) | Nutrition Module, Frontend |
| `metabolicFilter` | Onboarding (`metabolicProfile`) | Nutrition (food filter), Sync (illness penalty) |
| `isMetabolicNoiseTriggered` | Nutrition Module (`applyLiquidCalories`) | UserStatus → Sync (block progression) |
| `redFlags.*` | UserStatus (računato u `calcRedFlags`) | Trener Dashboard |

**Pravilo:** Ako videš da neki podatak ima više writer-a, to je bug u arhitekturi. Refaktoriši dok ne ostane jedan.

---

## 5. Event-driven komunikacija

### 5.1 Eventi koje sistem emituje

```typescript
type SystemEvent =
  // Training events
  | { type: 'WORKOUT_COMPLETED'; clientId: string; sessionId: string; partition: string }
  | { type: 'DELOAD_ACTIVATED'; clientId: string; reason: 'planned' | 'auto_triggered' }
  | { type: 'DELOAD_ENDED'; clientId: string }
  | { type: 'RETURN_FROM_BREAK_STARTED'; clientId: string; partition: string }
  | { type: 'RETURN_FROM_BREAK_ENDED'; clientId: string; partition: string }
  | { type: 'LEVEL_UP_ACHIEVED'; clientId: string; newLevel: 'intermediate' }
  | { type: 'LEVEL_DOWN_TRIGGERED'; clientId: string }

  // Nutrition events
  | { type: 'MEAL_LOGGED'; clientId: string; mealId: string; status: MealStatus }
  | { type: 'MEAL_SKIPPED'; clientId: string; mealId: string; isProtein: boolean }
  | { type: 'METABOLIC_NOISE_TRIGGERED'; clientId: string; percentage: number }
  | { type: 'WEEKLY_CHECKIN_COMPLETED'; clientId: string; data: WeeklyCheckIn }
  | { type: 'PLAN_ADJUSTMENT_APPLIED'; clientId: string; delta: number; reason: string }

  // Lifecycle events
  | { type: 'ONBOARDING_COMPLETED'; clientId: string }
  | { type: 'TRIAL_DAY_REMAINING'; clientId: string; daysLeft: number }
  | { type: 'PAUSE_STARTED'; clientId: string; pauseType: 'illness' | 'travel' }
  | { type: 'PAUSE_ENDED'; clientId: string }

  // Sync events (interno)
  | { type: 'TRAINING_INTENSITY_REDUCE'; clientId: string; reason: string; reduction: number }
  | { type: 'TRAINING_VOLUME_REDUCE'; clientId: string; reason: string; reduction: number }
  | { type: 'HYDRATION_FIRST_WARNING'; clientId: string; message: string };
```

### 5.2 Subscriber pattern

Svaki modul se pretplaćuje na event-e koji ga zanimaju:

```typescript
// Nutrition modul subscribe-uje na training event-e
EventBus.subscribe('DELOAD_ACTIVATED', async (event) => {
  await syncNutritionToDeload(event.clientId);
});

EventBus.subscribe('WORKOUT_COMPLETED', async (event) => {
  // Update UserStatus.training.partitionLastSeen
  await updateUserStatus(event.clientId, status => {
    status.training.partitionLastSeen[event.partition] = {
      date: new Date(),
      sessionId: event.sessionId,
    };
  });
});

// Trener Dashboard subscribe-uje na red flag event-e
EventBus.subscribe('METABOLIC_NOISE_TRIGGERED', async (event) => {
  await notifyTrainer(event.clientId, 'Klijentkinja triger-ovala metaboličku buku');
});
```

### 5.3 Implementacija EventBus-a (jednostavna varijanta)

```typescript
class EventBus {
  private static handlers = new Map<string, Array<(event: any) => Promise<void>>>();

  static subscribe<T extends SystemEvent>(
    eventType: T['type'],
    handler: (event: T) => Promise<void>
  ): void {
    const list = this.handlers.get(eventType) ?? [];
    list.push(handler);
    this.handlers.set(eventType, list);
  }

  static async emit(event: SystemEvent): Promise<void> {
    const list = this.handlers.get(event.type) ?? [];
    // Pokreni sve handler-e paralelno, ali sačekaj sve da završe
    await Promise.all(list.map(h => h(event).catch(err => {
      console.error(`Event handler failed for ${event.type}:`, err);
      // Ne baca — jedan failed handler ne sme da ruši ostale
    })));
  }
}
```

**Za production:** zameniti sa pravim message queue-om (Supabase Realtime, ili Redis Pub/Sub). Za MVP dovoljan in-memory pristup.

---

## 6. Frontend mapping

Konkretno gde se Sync Engine vidi u postojećem UI-u.

### 6.1 Klijent Dashboard (`/src/pages/Home.tsx`)

**Trenutno:** statičan dashboard sa karticama.

**Treba dodati:**
- Queue Strip komponentu (vidi 6.4)
- Hidratacija tracker (čaše)
- Identity status indikator (ako je nedeljni check-in dao identity score 4+)
- Banner za active sync events:
  - "🔄 Deload nedelja — ishrana je na maintenance"
  - "💧 Pre vežbe popij vodu"
  - "🌙 Lutealna faza — dodajemo malo carbs"

### 6.2 Trener Dashboard (`/src/pages/trainer/TrainerDashboard.tsx`)

**Trenutno:** lista klijentkinja sa osnovnim info.

**Treba dodati:**
- **Red Flags sekcija na vrhu** — query: `SELECT * FROM user_status WHERE is_at_risk = true`
- Brojač "Aktivnih klijentkinja na Deload-u" (info za trening planiranje)
- Brojač "Klijentkinje u Lutealnoj fazi" (info za očekivane symptom check-in-ove)

```tsx
// Pseudokod komponente
<RedFlagsSection>
  {redFlagClients.map(client => (
    <RedFlagCard
      name={client.name}
      flag={client.primaryRedFlag}
      // npr. "skipCount > 2" ili "metabolicNoise 3 days"
      action={() => navigate(`/trainer/client/${client.id}`)}
    />
  ))}
</RedFlagsSection>
```

### 6.3 Client Profile (`/src/pages/trainer/ClientProfile.tsx`)

**Treba dodati:**
- **Status sekciju** koja prikazuje ceo `UserStatus` u čitljivom formatu (samo trener vidi)
- Vizuelni indikatori sync stanja: badge "Deload Sync Active", "Cycle: Luteal Day 23"
- Timeline event-ova (poslednjih 30 dana svih sync trigger-a)

### 6.4 Queue Strip — nova komponenta

**Lokacija:** `/src/components/QueueStrip.tsx` (nova)

```tsx
interface QueueStripProps {
  queue: MesocycleQueue;
}

// Renders:
// [A1 ✓] [B1 ✓] [A2 ✓] [B2 ✓] [A3 ← danas] [B3] [A4] [B4]
// Prikazuje samo "Sledeći trening", ne datume
// Klik na trenutnu sesiju → start workout
// Klik na završene → istorija setova (read-only)
// Klik na pending → "Ovo je tvoj sledeći trening posle" tooltip
```

Stavlja se u `Home.tsx` kao glavna trening kartica.

### 6.5 Nutrition Builder / Replace lista (`/src/pages/Food.tsx`)

**Trenutno:** prikazuje meal plan.

**Treba dodati:**
- Anti-Ingredient Filter integraciju u "Replace" listu (vidi sekciju 11 nutrition spec-a)
- Hydration tracker (čaše)
- Liquid calorie input (sa warning sistemom)
- Identity Check-in pitanje na nedeljnom check-in-u

### 6.6 Notifikacije i banner sistem

**Lokacija:** novi globalni `<SyncEventBanner />` komponenta u App.tsx

Prikazuje aktivne sync banner-e na svim stranicama. Primeri:

```
┌────────────────────────────────────────────┐
│ 🔄 Deload nedelja — ishrana je podešena na │
│    maintenance kalorije za bolji oporavak. │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 💧 Niska hidratacija. Pre svake promene    │
│    plana, pokušaj sa 500ml vode.           │
└────────────────────────────────────────────┘
```

Banner se zatvara klikom (sledećih 24h se ne prikazuje za isti trigger).

---

## 7. Plan implementacije — Sprint I (Integration)

Ovo je **Sprint I (Integration)** koji ide **paralelno** sa Sprint 1 trening modula i Sprint N1 nutrition modula. Radi se posle što su tipovi spremni u oba modula.

### Sprint I.1 — UserStatus tip + Supabase tabela (3 dana)

**Deliverable:**
- `/src/types/userStatus.ts` — kompletan TS tip
- Supabase migration: `user_status` tabela sa generated kolonama
- `loadUserStatus(clientId)`, `saveUserStatus(status)` osnovne CRUD funkcije
- `initUserStatus(clientId)` — kreira default status posle onboardinga

### Sprint I.2 — Sync Engine core (5 dana)

**Deliverable:**
- `/src/utils/sync/syncEngine.ts`
- `processDailyCheckIn()` glavni entry point
- Svih 8 Sync Rules implementirano
- `recalcCalorieTarget()` idempotentno
- `calcRedFlags()` funkcija
- Unit testovi za svaku Sync Rule (test svaki edge case)

### Sprint I.3 — EventBus i subscriber-i (3 dana)

**Deliverable:**
- `/src/utils/sync/eventBus.ts`
- Svi `SystemEvent` tipovi definisani
- Training modul emituje WORKOUT_COMPLETED, DELOAD_ACTIVATED, itd.
- Nutrition modul emituje MEAL_LOGGED, METABOLIC_NOISE_TRIGGERED, itd.
- Subscriber-i u oba modula registrovani

### Sprint I.4 — Frontend integracija (5 dana)

**Deliverable:**
- `<QueueStrip />` komponenta + integracija u Home.tsx
- `<SyncEventBanner />` u App.tsx
- Red Flags sekcija u TrainerDashboard.tsx
- UserStatus prikaz u ClientProfile.tsx (trener view)
- Anti-Ingredient Filter u Food.tsx Replace listi

### Sprint I.5 — End-to-end testiranje (3 dana)

**Test scenariji koji moraju proći:**

1. **Lutealna faza scenario:** klijentkinja unese cycle day 23 → algoritam dodaje +150 kcal, banner se prikazuje, training intenzitet -5%
2. **Deload scenario:** training generiše deload nedelju → nutrition automatski na maintenance, banner se prikazuje
3. **Loš san scenario:** 3 dana zaredom < 6h sna → training -15% volumena, nutrition na maintenance
4. **Metabolic noise scenario:** klijentkinja loguje 600 kcal kafe → 12% budžeta → žuti warning, plan adjustment se blokira na 3 dana
5. **Illness scenario:** klijentkinja označi pauzu (illness) → -0.15 recovery, nutrition na -5% deficit (umesto -20%)
6. **Hydration first scenario:** energija < 5 + hydration < 70% → blok makro promene, hidration warning

### Ukupno: ~3 nedelje za kompletan integration sloj

Posle ovoga celokupan sistem (training + nutrition + sync) je spreman za **end-to-end testiranje na realnim klijentkinjama** (Beta).

---

## Dodaci

### Dodatak A — Šta NIJE u Sync Engine-u (granice scope-a)

- **Notifikacije korisnici** (push, email) — to je odvojen sistem, koristi event-e sa EventBus-a
- **Trener notifikacije** — isto kao gore, odvojen modul
- **Analytics agregacije** — to je za poseban dashboard sloj
- **A/B testovi pravila** — sva pravila su deterministički hardkoded, ne dynamic
- **Rule editor za trenera** — pravila su fiksna, samo dev tim ih menja kroz kod

### Dodatak B — Šta se dešava kad sync rule failed

```typescript
// Defenzivan pattern
async function runSyncRules(status: UserStatus): Promise<void> {
  const rules = [
    { name: 'hormonal_sync', fn: applyHormonalSync },
    { name: 'fatigue_sync', fn: applyFatigueSync },
    // ...
  ];

  for (const rule of rules) {
    try {
      await rule.fn(status);
    } catch (err) {
      // Loguj grešku, ali nastavi sa ostalim pravilima
      console.error(`Sync rule "${rule.name}" failed:`, err);
      await logSyncRuleFailure(status.clientId, rule.name, err);
      // status ostaje u stanju u kakvom je bio pre tog pravila
    }
  }
}
```

**Princip:** jedna pala pravila ne sme da blokira ostale niti da ostavi UserStatus u nekonzistentnom stanju.

### Dodatak C — Migracija sa starog sistema

Ako već imaš klijentkinje u sistemu pre Sync Engine-a (alfa testeri):

```typescript
async function migrateExistingClient(clientId: string): Promise<UserStatus> {
  // 1. Učitaj postojeće podatke iz odvojenih tabela
  const profile = await db.profiles.get(clientId);
  const trainingProgram = await db.trainingPrograms.findActive(clientId);
  const nutritionPlan = await db.nutritionPlans.findActive(clientId);

  // 2. Konstruiši UserStatus iz tih podataka
  const status = buildUserStatusFromLegacy(profile, trainingProgram, nutritionPlan);

  // 3. Pokreni Sync Engine jednom da uskladiš stanja
  await runSyncRules(status);

  // 4. Sačuvaj
  await saveUserStatus(status);

  return status;
}
```

### Dodatak D — Otvorena pitanja za potvrdu

1. **Real-time vs polling** — Da li Frontend ide na polling `UserStatus`-a svakih X sekundi, ili koristimo Supabase Realtime za push? Realtime je bolji UX ali kompleksniji setup.

2. **Lock kontigent** — Ako više sync rule-a jednovremno menja `currentCalorieTarget`, koji ima prednost? Predlog: redosled u `runSyncRules()` je prioritet (raniji ima manji prioritet, kasniji override-uje).

3. **Trener override Sync Engine-a** — Da li trener za 1-na-1 klijente može ručno da onemogući neku Sync Rule (npr. "ne želim luteal bonus za ovu klijentkinju")? Predlog: postoji `clientOverrides` polje u UserStatus-u sa listom isključenih pravila.

---

**Kraj dokumenta — v1.0**

*Posle implementacije Sprint I, sistem je spreman za Beta testiranje sa realnim klijentkinjama.*
