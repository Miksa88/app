# KŌDO.fit ALGORITAM KLASIFIKACIJE: ŽENE
## Sistem za on-boarding novog korisnika i sanity check progresije

**Tip dokumenta:** Operativni algoritam za aplikaciju
**Cilj:** Klasifikovati ženu u jedan od tri nivoa (Početnica / Srednje-napredna / Napredna) na osnovu **merljivih kilaža**, ne subjektivne procene
**Princip:** Žena sama bira nivo. Algoritam proverava da li ima smisla i upozorava ako ne.

---

## SEKCIJA 0: FILOZOFIJA SISTEMA

### 0.1 Zašto je merljiva klasifikacija kritična?

Bez objektivnih kriterijuma, žena će:
- **Precenjivati** svoj nivo (Instagram efekat — "ja sam već napredna jer treniram 1 godinu")
- **Pokrenuti pogrešan protokol** (napredni protokol za početnicu = povreda za 4-6 nedelja)
- **Stagnirati** (početnički protokol za naprednu = nema progresa, dosada, odustajanje)

Algoritam koristi **kilažu koju žena trenutno može da podigne** kao primarni indikator.

### 0.2 Hijerarhija odluke

```
1. Žena sama bira nivo na startu
2. Algoritam pita 4 stvari (Sekcija 1)
3. Algoritam izračunava preporučeni nivo
4. Ako se preporuka i izbor SLAŽU → kreće se sa tim nivoom
5. Ako se RAZILAZE → algoritam upozorava i nudi 3 opcije
```

### 0.3 Tri nivoa — kratko

| Nivo | Tipičan profil | Cilj |
|---|---|---|
| **POČETNICA** | < 6 meseci treninga, ne dize svoju težinu na klasičnim liftovima | Učenje tehnike, neuralne adaptacije, rekompozicija |
| **SREDNJE-NAPREDNA** | 6-18 meseci, dize svoju težinu na lower body liftovima | Hipertrofija + rekompozicija, Upper/Lower split |
| **NAPREDNA** | 12+ meseci, dize 1.25-2× svoje težine | Specijalizacija (gluteus, leđa), napredne tehnike |

---

## SEKCIJA 1: ON-BOARDING — ŠTA ALGORITAM PITA

### 1.1 Korak 1: Osnovne informacije

Algoritam pita:
1. **Tvoja telesna težina** (kg)
2. **Da li si trenirala sa tegovima u poslednjih 6 meseci?** (DA/NE)
3. **Koliko dugo treniraš dosledno?** (< 3 meseca / 3-6 meseci / 6-12 meseci / 12+ meseci)
4. **Koji nivo misliš da si?** (Početnica / Srednje-napredna / Napredna)

### 1.2 Korak 2: Test snage (3 vežbe)

**VAŽNO:** Test se izvodi sa **RPE 8** (poslednja serija — još 1-2 ponavljanja u rezervi, NE do otkaza).

**Algoritam objašnjava:**
> "Pre nego što ti dodelim plan, hoću da znam koliko si stvarno snažna. Uradi sledeće 3 vežbe sa težinom koja ti je TEŠKA ali ne maksimalna — trebalo bi da ti ostane još 1-2 ponavljanja u rezervi. Logguj rezultate."

#### Vežba 1: HIP THRUST

**Format:** 1 set × 8 ponavljanja @ RPE 8
**Ramp-up obavezan:** 50% × 8 → 75% × 5 → test set
**Tehnika:** šipka (ili mašina) na karlici, telo u liniji u top poziciji, brada uvučena
**Ako klijentkinja nikad nije radila Hip Thrust:** počinje sa Glute Bridge sa poda + bodyweight, algoritam je automatski klasifikuje **POČETNICA**

#### Vežba 2: GOBLET SQUAT (ili LEG PRESS)

**Format:** 1 set × 10 ponavljanja @ RPE 8
**Ramp-up obavezan:** 50% × 10 → 75% × 6 → test set
**Tehnika:** dubina ispod paralele (kuk ispod kolena), kontrolisani spust
**Ako klijentkinja nikad nije čučala:** počinje sa bodyweight squat, algoritam je automatski klasifikuje **POČETNICA**

**Napomena za Leg Press:** ako teretana nema dovoljno bucica za Goblet Squat (npr. 30+ kg), koristi Leg Press kao alternativu (kilaža × 0.5 daje ekvivalent Goblet Squat-a, jer Leg Press eliminiše stabilizaciju trupa).

#### Vežba 3: RDL BUCICE

**Format:** 1 set × 10 ponavljanja @ RPE 8
**Ramp-up obavezan:** 50% × 10 → 75% × 6 → test set
**Tehnika:** hip hinge, kolena lagano savijena, šipka/bucice klize uz noge, ravna kičma
**Ako klijentkinja ima diskus herniju ili bol u donjim leđima:** zameni sa **Lying Leg Curl** (mašinska varijanta), algoritam koristi različite pragove (vidi Sekcija 4.3)

---

## SEKCIJA 2: ALGORITAMSKI PRAGOVI (RELATIVNO NA TELESNU TEŽINU)

### 2.1 Glavna tabela klasifikacije

**Sve vrednosti su za RPE 8 (8 ponavljanja Hip Thrust, 10 ponavljanja Squat i RDL).**

| Vežba | POČETNICA | SREDNJE-NAPREDNA | NAPREDNA |
|---|---|---|---|
| **Hip Thrust** | < **1.0×** TT | **1.0× – 2.0×** TT | **≥ 2.0×** TT |
| **Goblet Squat** | < **0.5×** TT | **0.5× – 0.85×** TT | **≥ 0.85×** TT |
| **Leg Press** (alternativa) | < **1.5×** TT | **1.5× – 2.5×** TT | **≥ 2.5×** TT |
| **RDL Bucice** | < **0.25×** TT po bucici | **0.25× – 0.40×** TT po bucici | **≥ 0.40×** TT po bucici |

**TT = Telesna težina**

### 2.2 Zašto baš ovi pragovi?

#### Hip Thrust standardi (Bret Contreras, autor vežbe)
- 1.0× TT = može da uradi sa svojom težinom = svršena početnica
- 1.5× TT = standard intermediate level (Bret Contreras klasifikacija)
- 2.0× TT = standard advanced level
- 2.5× TT = elite (sportistkinje, powerlifterke)

**Logika:** Hip Thrust je **najjača vežba za žene** zbog anatomije gluteusa. Žene mogu da hip thrust-uju 2-3x više nego što mogu da bench-uju.

#### Squat standardi (StrengthLevel database, 153M+ lifts)
- 0.5× TT = beginner female
- 1.0× TT = intermediate female (50-percentil)
- 1.35× TT = advanced female
- 1.65× TT = elite female

**Logika:** žena koja čuči svoju težinu je već **iznad proseka** treniranih žena.

**Naš prag 0.85× za prelazak u napredni je konzervativan** (između intermediate 1.0× i advanced 1.35×) — sigurnije.

#### RDL standardi (deadlift bazirano, prilagođeno za bucice)
- Klasičan deadlift female: beginner 1.0×, intermediate 1.25×, advanced 1.55×
- RDL bucice je ~50% lakši od klasičnog deadlift-a (zbog bucica i pozicije)
- Naš prag 0.25× po bucici × 2 bucice = 0.5× ukupno = beginner deadlift ekvivalent
- 0.40× po bucici × 2 = 0.8× ukupno = approaching intermediate

### 2.3 Konkretne kilaže za različite telesne težine

#### Žena 55 kg

| Vežba | Početnica | Srednje-napredna | Napredna |
|---|---|---|---|
| Hip Thrust | < 55 kg | 55 – 110 kg | ≥ 110 kg |
| Goblet Squat | < 28 kg | 28 – 47 kg | ≥ 47 kg |
| Leg Press | < 82 kg | 82 – 137 kg | ≥ 137 kg |
| RDL po bucici | < 14 kg | 14 – 22 kg | ≥ 22 kg |

#### Žena 65 kg

| Vežba | Početnica | Srednje-napredna | Napredna |
|---|---|---|---|
| Hip Thrust | < 65 kg | 65 – 130 kg | ≥ 130 kg |
| Goblet Squat | < 32 kg | 32 – 55 kg | ≥ 55 kg |
| Leg Press | < 97 kg | 97 – 162 kg | ≥ 162 kg |
| RDL po bucici | < 16 kg | 16 – 26 kg | ≥ 26 kg |

#### Žena 75 kg

| Vežba | Početnica | Srednje-napredna | Napredna |
|---|---|---|---|
| Hip Thrust | < 75 kg | 75 – 150 kg | ≥ 150 kg |
| Goblet Squat | < 37 kg | 37 – 64 kg | ≥ 64 kg |
| Leg Press | < 112 kg | 112 – 187 kg | ≥ 187 kg |
| RDL po bucici | < 19 kg | 19 – 30 kg | ≥ 30 kg |

#### Žena 85 kg

| Vežba | Početnica | Srednje-napredna | Napredna |
|---|---|---|---|
| Hip Thrust | < 85 kg | 85 – 170 kg | ≥ 170 kg |
| Goblet Squat | < 42 kg | 42 – 72 kg | ≥ 72 kg |
| Leg Press | < 127 kg | 127 – 212 kg | ≥ 212 kg |
| RDL po bucici | < 21 kg | 21 – 34 kg | ≥ 34 kg |

---

## SEKCIJA 3: LOGIKA ODLUKE — KAKO ALGORITAM KOMBINUJE 3 VEŽBE

### 3.1 Skor sistem

Svaka vežba daje 1 od 3 ocene:
- **0 = Početnica**
- **1 = Srednje-napredna**
- **2 = Napredna**

Algoritam sabira sve 3 ocene → ukupan skor 0-6.

### 3.2 Tabela odluke

| Ukupan skor | Primarna preporuka | Sigurnosna provera |
|---|---|---|
| **0-1** | **POČETNICA** | Bez dodatnih provera |
| **2-3** | **POČETNICA** (konzervativno) | Ako vreme treninga ≥ 6 meseci → ponovni test za 4 nedelje |
| **4** | **SREDNJE-NAPREDNA** | Slabija vežba postaje fokus 1. mezociklusa |
| **5** | **SREDNJE-NAPREDNA** | Standardni nastavak |
| **6** | **NAPREDNA** (uslovno) | Vremenska provera obavezna (Sekcija 4.1) |

### 3.3 Konkretni primeri

#### Primer 1: Žena 60 kg, trenirala 4 meseca

**Test rezultati:**
- Hip Thrust: 50 kg × 8 → 0.83× TT → **POČETNICA (skor 0)**
- Goblet Squat: 24 kg × 10 → 0.40× TT → **POČETNICA (skor 0)**
- RDL: 12 kg po bucici × 10 → 0.20× TT → **POČETNICA (skor 0)**

**Ukupan skor: 0 → POČETNICA** ✅

**Algoritam predlog:** "Zasnovano na tvojim rezultatima, preporučujem ti **Početnički Master Protokol**. Tvoja snaga još uvek može mnogo da raste sa Full Body 3x nedeljno."

#### Primer 2: Žena 65 kg, trenirala 10 meseci

**Test rezultati:**
- Hip Thrust: 105 kg × 8 → 1.62× TT → **SREDNJE-NAPREDNA (skor 1)**
- Goblet Squat: 32 kg × 10 → 0.49× TT → **POČETNICA (skor 0)**
  - *Goblet Squat je limitiran bucicama — nemoguće je goblet 50 kg, traži Leg Press*
- Leg Press: 110 kg × 10 → 1.69× TT → **SREDNJE-NAPREDNA (skor 1)**
  - *Algoritam koristi Leg Press umesto Goblet jer je dostupan*
- RDL: 22 kg po bucici × 10 → 0.34× TT → **SREDNJE-NAPREDNA (skor 1)**

**Ukupan skor: 3 → SREDNJE-NAPREDNA (uslovno)**

**Algoritam predlog:** "Tvoja snaga ti omogućava prelazak u srednje-napredni nivo. Preporučujem **Srednje-napredni Master Protokol** sa fokusom na Hip Thrust kao zaostalu vežbu prvi mezociklus."

#### Primer 3: Žena 70 kg, trenirala 18 meseci

**Test rezultati:**
- Hip Thrust: 145 kg × 8 → 2.07× TT → **NAPREDNA (skor 2)**
- Leg Press: 175 kg × 10 → 2.50× TT → **SREDNJE-NAPREDNA (skor 1)**
- RDL: 28 kg po bucici × 10 → 0.40× TT → **NAPREDNA (skor 2)**

**Ukupan skor: 5 → SREDNJE-NAPREDNA**

**Algoritam predlog:** "Hip Thrust i RDL su ti na naprednom nivou, ali Leg Press još nije. Preporučujem **Srednje-napredni Master Protokol** — fokus na podizanje Squat/Leg Press do naprednog praga u sledeća 1-2 mezociklusa, pa onda prelazak."

#### Primer 4: Žena 75 kg, trenirala 24 meseca

**Test rezultati:**
- Hip Thrust: 175 kg × 8 → 2.33× TT → **NAPREDNA (skor 2)**
- Leg Press: 200 kg × 10 → 2.67× TT → **NAPREDNA (skor 2)**
- RDL: 32 kg po bucici × 10 → 0.43× TT → **NAPREDNA (skor 2)**

**Ukupan skor: 6 → NAPREDNA** ✅

**Algoritam predlog:** "Tvoji rezultati pokazuju napredni nivo. Pre nego što otključam napredni protokol, hoću da proverim još par stvari (vremenska provera, biofeedback)."

→ Vremenska provera (Sekcija 4.1).

---

## SEKCIJA 4: SIGURNOSNE PROVERE (KADA ALGORITAM UPOZORI)

### 4.1 Vremenska provera za prelazak u NAPREDNI

Čak i ako kilaže pokažu napredni nivo, algoritam **NE pušta** ženu u napredni protokol bez:

| Kriterijum | Minimum |
|---|---|
| **Vreme doslednog treninga** | **12+ meseci** (3-4 mezociklusa po 7 nedelja) |
| **Stabilan ciklus** | **3+ meseca bez većih poremećaja** |
| **Bez bolesti** dužih od 3 dana u poslednjem mezociklusu | DA |
| **Tehnika RPE skale uvežbana** | DA |
| **Hidratacija + ishrana stabilizovani** | DA |

**Ako je SVE od navedenog DA + skor 6 → otključava se Napredni protokol.**
**Ako bilo šta NIJE → ostaje na Srednje-naprednom još 1 mezociklus.**

### 4.2 Razilaženje izbora i preporuke

Kada se ženin **izbor nivoa** i **algoritamska preporuka** razilaze:

#### Scenario A: Izbrala POČETNICU, algoritam preporučuje SREDNJE-NAPREDNU

**Algoritam:**
> "Tvoji testni rezultati pokazuju da si već na srednje-naprednom nivou. Početnički protokol bi ti bio prelagan i mogla bi da staneš sa progresom za 4-6 nedelja. Preporučujem ti **Srednje-napredni Master Protokol**.
>
> Šta želiš da uradiš?
> 1. **Prihvatim preporuku** (Srednje-napredni)
> 2. **Ostajem pri svom izboru** (Početnica) — algoritam će prilagoditi težine
> 3. **Hoću još 1 mezociklus početničkog** da konsolidujem tehniku, pa onda srednje-napredni"

#### Scenario B: Izabrala NAPREDNU, algoritam preporučuje SREDNJE-NAPREDNU

**Algoritam:**
> "Hoću da budem iskren sa tobom. Tvoja snaga je solidna ali još nije na naprednom nivou. Napredni protokol je za žene koje dize **2× svoje težine na Hip Thrust-u** i imaju **12+ meseci doslednog treninga**.
>
> Ako ulaziš sada u napredni protokol, rizikuješ:
> - Povredu (težine će biti previsoke za tvoj CNS)
> - Stagnaciju (zato što preskačeš fazu konsolidacije)
> - Ciklus poremećaj (volumen će biti previsok)
>
> **Preporučujem Srednje-napredni Master Protokol** — kada dosegneš pragove za napredni, algoritam će te automatski upozoriti.
>
> Šta želiš?
> 1. **Prihvatim preporuku** (Srednje-napredni) — preporučeno
> 2. **Ostajem pri naprednom** — moram da potvrdim 3x da razumem rizik"

**Ako žena 3x potvrdi:** algoritam dozvoljava napredni, ali sa **upozorenjem da se prati 2x češće** (svake nedelje, ne mesečno).

#### Scenario C: Izabrala SREDNJE-NAPREDNU, algoritam preporučuje POČETNICU

**Algoritam:**
> "Tvoji testni rezultati pokazuju da si još na početničkom nivou. To NIJE loše — to je **investicija**. Većina žena prelazi iz početničkog u srednje-napredni za 6-12 meseci.
>
> Ako kreneš sa srednje-naprednim:
> - Težine bi bile previsoke za tvoju trenutnu tehniku → rizik povrede
> - Volumen bi bio prevelik → CNS umor → stagnacija
>
> **Preporučujem Početnički Master Protokol** — to je *najbrži* put do srednje-naprednog.
>
> Šta želiš?
> 1. **Prihvatim preporuku** (Početnički) — preporučeno
> 2. **Ostajem pri srednje-naprednom** — algoritam će prilagoditi težine i pratiti čak češće"

### 4.3 Modifikacije zbog povreda

Ako klijentkinja ima ograničenja (anamneza), algoritam koristi **različite vežbe za test**:

| Originalna vežba | Zamena | Modifikovani prag |
|---|---|---|
| **Hip Thrust** | Mašinski Hip Thrust (Glute Drive) | Isti prag |
| **Hip Thrust** (ako bol u donjim leđima) | Glute Bridge sa poda | Prag -20% |
| **Goblet Squat** (ako bol u kolenu) | Box Squat (visoka klupa) | Prag -15% |
| **RDL** (ako diskus hernija) | 45° Hyperextension sa težinom | Prag = telesna težina za naprednu |
| **RDL** (ako bol u zglobu šake) | Lying Leg Curl mašina | Prag (kg) = 0.5× TT za srednje-naprednu |

**Pravilo:** ako klijentkinja ima 2+ povrede, algoritam **automatski preporučuje POČETNICU** dok se povrede ne razreše (Surgical Swap protokol u Početničkom Master Protokolu).

---

## SEKCIJA 5: RE-EVALUACIJA (POSLE SVAKOG MEZOCIKLUSA)

### 5.1 Kada algoritam ponovo testira?

**Posle Nedelje 7 (kraj mezociklusa)** — u Deload nedelji, klijentkinja loguje **3 testna seta** (Hip Thrust, Squat, RDL).

### 5.2 Šta algoritam radi sa novim rezultatima?

| Promena | Akcija |
|---|---|
| Skor isti ili niži | Nastavlja postojeći nivo |
| Skor +1 (npr. 3 → 4) | Predlaže prelazak (uslovno) |
| Skor +2 ili više | Predlaže prelazak (uslovno) + sigurnosna provera (Sekcija 4.1) |

**Logika:** algoritam **uvek konzervativan**. Predlaže, ne forsira. Žena potvrđuje.

### 5.3 Crveni signali (kada algoritam BLOKIRA prelazak)

Čak i ako kilaže pokazuju da se može u sledeći nivo, algoritam blokira ako:

- [ ] Ciklus se poremetio u prethodnom mezociklusu
- [ ] Klijentkinja je imala 2+ bolesti u poslednjih 14 nedelja
- [ ] DOMS hronično > 7/10
- [ ] Recovery time > 60h

**Akcija:** "Tvoja snaga može u napredni nivo, ALI tvoje telo trenutno ne. Hoću da rešimo (specifikuje šta) prvo. Ostaješ na trenutnom nivou još 1 mezociklus."

---

## SEKCIJA 6: ŠTA SE PRIKAZUJE U APLIKACIJI

### 6.1 On-boarding flow (vizuelno)

```
1. "Dobrodošla! Hajde da kreiramo tvoj plan."
2. [Korak 1: 4 pitanja — težina, iskustvo, vreme, izabrana kategorija]
3. "Pre nego što ti dam plan, hoću da znam koliko si snažna. 
    Idi u teretanu, uradi 3 vežbe i logguj rezultate. 
    Imaš nedelju dana."
4. [Korak 2: 3 testne vežbe sa video uputstvima]
5. "Tvoji rezultati su... [tabela]"
6. "Algoritam preporučuje: [NIVO]"
7. [Razilaženje? Sekcija 4.2 dialog]
8. "Tvoj plan je spreman. Krećemo Mezociklus 1."
```

### 6.2 Re-evaluacija flow (kraj mezociklusa)

```
1. "Završila si Mezociklus 1! Hajde da vidimo gde smo."
2. "U Deload nedelji, uradi 3 testna seta:"
3. [Hip Thrust, Squat, RDL — istih 3 vežbe kao na startu]
4. "Tvoja snaga je porasla X% — odlično!"
5. "Tvoj novi nivo je: [NIVO ili NEPROMENJEN]"
6. "Mezociklus 2 počinje. Krećemo."
```

---

## SEKCIJA 7: REKAPITULACIJA — KLJUČNE BROJKE

### 7.1 Univerzalna formula

**POČETNICA** — sve 3 vežbe ispod praga:
- Hip Thrust < 1.0× TT (8 reps)
- Goblet Squat < 0.5× TT (10 reps)
- RDL < 0.25× TT po bucici (10 reps)

**SREDNJE-NAPREDNA** — minimum 4 od 6 bodova (skor sistem 0-2 po vežbi):
- Hip Thrust 1.0× – 2.0× TT
- Goblet Squat 0.5× – 0.85× TT
- RDL 0.25× – 0.40× TT po bucici

**NAPREDNA** — skor 6 + vremenska provera:
- Hip Thrust ≥ 2.0× TT
- Goblet Squat ≥ 0.85× TT
- RDL ≥ 0.40× TT po bucici
- + 12 meseci treninga
- + Stabilan ciklus 3+ meseca
- + Tehnika RPE uvežbana

### 7.2 Brza referenca za najčešće telesne težine

| TT | Početnica → Srednje | Srednje → Napredna |
|---|---|---|
| **55 kg** | Hip Thrust 55kg, Squat 28kg, RDL 14kg | Hip Thrust 110kg, Squat 47kg, RDL 22kg |
| **65 kg** | Hip Thrust 65kg, Squat 32kg, RDL 16kg | Hip Thrust 130kg, Squat 55kg, RDL 26kg |
| **75 kg** | Hip Thrust 75kg, Squat 37kg, RDL 19kg | Hip Thrust 150kg, Squat 64kg, RDL 30kg |
| **85 kg** | Hip Thrust 85kg, Squat 42kg, RDL 21kg | Hip Thrust 170kg, Squat 72kg, RDL 34kg |

---

## ZAKLJUČAK

Ovaj algoritam radi 3 stvari:

1. **Klasifikuje** ženu na osnovu **objektivnih kilaža** (ne subjektivne procene)
2. **Upozorava** kada se njen izbor i naučni standardi razilaze
3. **Re-evaluira** posle svakog mezociklusa, automatski prati progres

**Šta je važno za aplikaciju:**
- Žena uvek **bira sama**
- Algoritam je **savetnik**, ne policajac
- Svi pragovi su **iz recenzirane literature** (Bret Contreras, StrengthLevel, ExRx)
- Sigurnosne provere sprečavaju **povredu** i **stagnaciju**

**Šta NIJE u ovom dokumentu (ide u glavne master fajlove):**
- Same kilaže za svaku vežbu (samo za test)
- Mezociklusna struktura
- Ishrana
- Biofeedback
- Surgical Swap
- Emergency protokoli
