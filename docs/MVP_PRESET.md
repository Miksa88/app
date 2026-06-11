# MVP PRESET — default feature konfiguracija za novog tenanta

> **STATUS: NACRT.** Ovaj dokument je hipoteza zasnovana na istraživanju tržišta
> (7 dokumenata u `upgrade/`). Finalizuje se posle **4–8 nedelja realnih usage
> podataka iz `usage_events` tabele** — svaka preporuka ispod je default koji
> podaci mogu da obore.
>
> Izvori: `upgrade/feature_requests_real_users.md`, `upgrade/feature_requests_real_feedback.md`,
> `upgrade/master_8020_sinteza.md`, `upgrade/sta_je_visak_komplikovano.md`,
> `upgrade/fitness_saas_analiza.md`, `upgrade/business_model_funneli.md`,
> `upgrade/personalizacija_automatizacija_deep_dive.md` + `src/tenant.config.ts`.

---

## 1. Šta istraživanja kažu

### 1.1. Šta korisnici (treneri + klijenti) realno traže

Najveći signal dolazi iz Trainerize Idea Foruma (6.341 trenerska + 6.593 klijentske
ideje, <5% completion rate) — to je mapa onoga što tržište hoće a niko ne isporučuje
(`feature_requests_real_users.md`, `feature_requests_real_feedback.md`):

| Zahtev | Snaga signala | Izvor |
|---|---|---|
| **Pause/Freeze klijenta** (workouts + billing) | #1 rupa industrije, otvoreno od 2018, "I have lost clients due to this", "mission critical" | `feature_requests_real_users.md` §B#1; `feature_requests_real_feedback.md` §2#3; `master_8020_sinteza.md` ⭐1 |
| **Smart exercise substitution** (muscle/equipment/injury filter) | 11.599 glasova, otvoreno od 2015 | `feature_requests_real_feedback.md` §2#1; `master_8020_sinteza.md` ⭐2 |
| **Pre-workout substitution** (swap pre starta) | otvoreno od 2018 | `feature_requests_real_users.md` §B#3 |
| **Auto-progresija / auto-deload / fatigue detection** | "emerging capability in 2026", niko nema pravu auto-progresiju ni auto-deload trigger | `personalizacija_automatizacija_deep_dive.md` §2–3; `master_8020_sinteza.md` ⭐20 |
| **Adaptive nutrition recalibration** (auto-adjust po realnom rate-u gubitka) | "Ne postoji" ni kod jednog igrača | `feature_requests_real_users.md` §H-A; `personalizacija_automatizacija_deep_dive.md` §8 |
| **Diet break / refeed logika** | "Ne postoji" — industrijski standard koji niko nema built-in | `feature_requests_real_users.md` §H-A; `personalizacija_automatizacija_deep_dive.md` §8B |
| **Custom makroi po gramu + training/rest day makroi** | otvoreno od 2014; "Planned" a ne isporučeno | `feature_requests_real_users.md` §B#12–14 |
| **Allergen/food exclusion filter** | "I can't even filter out pork" | `feature_requests_real_users.md` §B#15; `master_8020_sinteza.md` ⭐7 |
| **RPE per set/exercise** (ne per workout) | otvoreno od 2020; "standard for any serious strength program" | `feature_requests_real_users.md` §B#10; `master_8020_sinteza.md` ⭐3 |
| **Wearables** (Apple Health, Garmin, Whoop, Oura, Samsung) | "2026 commodity"; "I'll leave my current trainer" | `master_8020_sinteza.md` ⭐5, Tier S #8; `fitness_saas_analiza.md` bonus prilika #6 |
| **Check-in sistem first-class** (custom forme, notifikacije treneru) | Trainerize ga ignorisao 5+ godina | `fitness_saas_analiza.md` Prilika #2; `feature_requests_real_feedback.md` §4 |
| **Pouzdan workout logging** (auto-save, pause, resume) | "data loss" = najveća klijentska frustracija | `fitness_saas_analiza.md` Prilika #1; `feature_requests_real_users.md` §D |

Bitno za nas: **slojevi 1–8 Master Algoritma (mezociklusi, smart cut, refeed, diet
break, biofeedback autoregulacija) su tačno ono što `personalizacija_automatizacija_deep_dive.md`
§10 navodi kao "Top 10 problema koje NIKO nije rešio"** — automatizacija je naš
diferencijator, ne višak.

### 1.2. Šta je višak / komplikovano

`sta_je_visak_komplikovano.md` + `master_8020_sinteza.md` §III–IV (konsenzus pain points):

- **Bloat ubija**: "80% funkcija u prosečnom SaaS-u se retko ili nikad ne koristi"
  (Pendo); cluttered UI smanjuje conversion 20–40% (NNGroup). Trainerize =
  "endless corridor of menus"; Hevy pobedio jer je "stripped out the random nonsense".
- **Forsirana periodization terminologija je anti-feature**: "not all clients require
  periodization" — klijent koji mršavi 5 kg ne treba "Mesocycle 1 of 3" notifikaciju
  (`sta_je_visak_komplikovano.md` §B16; `master_8020_sinteza.md` ❌9). Logika DA,
  terminologija u klijent UI — opciono/sakriveno.
- **Mandatory body measurements / daily weight prompt** — toggle po klijentu obavezan
  (ED-history klijenti) (`sta_je_visak_komplikovano.md` §B1).
- **Achievement badges / confetti / streaks default-ON** — anti-feature ("false
  gratification"), sve gamification mora biti opt-in (`master_8020_sinteza.md` ❌1–2, 🗑️9–10).
- **Netačni algoritamski brojevi** (estimated workout time) — "Better no number than
  wrong number" (`master_8020_sinteza.md` ❌6). Direktna pouka za naš healthKit placeholder.
- **Auto-poruke sistema u ime trenera, forced welcome email, notification spam** —
  trener mora kontrolisati svaku komunikaciju (`sta_je_visak_komplikovano.md` §B7, §B18).
- **Add-on/per-client pricing** — "just trying to milk more money out of me";
  TIER NEVER #10 (`master_8020_sinteza.md` ❌5, §V).

### 1.3. Šta konkurencija nudi kao jezgro

Iz `fitness_saas_analiza.md` (Trainerize, TrueCoach, Everfit, PT Distinction,
My PT Hub, HubFit, Kahunas, Hevy Coach) — **table stakes** koje sve platforme imaju:

1. Drag-and-drop workout builder + exercise library sa custom video uploadom
2. Templates / master programs (Everfit Live Sync = best-in-class)
3. Client management (profil, notes, goals)
4. In-app chat (svi je imaju — Kategorija 4)
5. Progress tracking (težina, mere, fotke, PR)
6. Check-ins & habits
7. Stripe billing (TrueCoach: "that feature alone sold me")
8. Branding / white-label (PT Distinction i Kahunas uključeno u cenu)
9. Wearable integracije (Apple Health/Garmin minimum)
10. Mobile coach app sa workout loggingom (Hevy)

Niko od njih nema: pause klijenta, smart substitution, auto-deload, adaptive
nutrition, condition-aware programiranje — **to je naša Tier S pozicija**
(`master_8020_sinteza.md` §V Tier S; `personalizacija_automatizacija_deep_dive.md` §12).

---

## 2. Predlog default preseta za novog tenanta

Vodeći princip iz istraživanja: **algoritam radi tiho u pozadini (smart defaults su
diferencijator — `personalizacija_automatizacija_deep_dive.md` §12 anti-feature lista),
a klijent UI ostaje minimalan (Hevy princip)**. Naši algoritamski moduli su
condition-triggered banneri — nevidljivi dok se uslov ne ispuni — pa ne doprinose
bloatu kao stalno vidljive funkcije.

| Flag | Default | Obrazloženje (izvor) |
|---|---|---|
| `algorithm` | **`'full'`** | Automatizacija je glavni diferencijator: auto-deload, adaptive nutrition, refeed/diet break su "Top 10 problema koje niko nije rešio" (`personalizacija_..._deep_dive.md` §10; `master_8020_sinteza.md` ⭐20). `'simple'` mod nas svodi na "još jedan tracker" — komodizovano jezgro koje svi konkurenti već imaju (`fitness_saas_analiza.md` Deo 2). `'simple'` ostaje kao downgrade opcija za basic tier (v. §5). |
| `mesocycles` | **`true`** | Phased programs su Trainerize-ova najhvaljenija prednost ("unique feature that I have not seen on other PT software", `fitness_saas_analiza.md` Deo 4 §2); auto-deload je traženo a ne postoji (`master_8020_sinteza.md` ⭐20). **Uslov**: klijent UI ne sme forsirati terminologiju "mezociklus/overreach" — preimenovati banere u plain jezik ("lakša nedelja") (`sta_je_visak_komplikovano.md` §B16). |
| `smartCut` | **`true`** | Direktno mapira na "Adaptive nutrition recalibration — Ne postoji" (`feature_requests_real_users.md` §H-A) i plateau detection priliku (`personalizacija_..._deep_dive.md` §8: "ako 3 nedelje no change, predloži strategy"). Niko na tržištu ovo nema. |
| `emergencyRefeed` | **`true`** | "Diet break / refeed logic — Ne postoji — Posle X nedelja deficita predloži" (`feature_requests_real_users.md` §H-A; `personalizacija_..._deep_dive.md` §8B). Trigger-based, nevidljiv dok se ne aktivira. |
| `dietBreak` | **`true`** | Isto kao refeed — industrijski standard koji nijedna platforma nema built-in (`personalizacija_..._deep_dive.md` §8B). |
| `neatGate` | **`true`, uz reviziju tona** | Korak-tracking jeste tražen (manual step entry, step reports — `feature_requests_real_users.md` §H-E, §B#24), ali za sam "gate/hodaj više" banner **nema direktnog podatka** u istraživanju. Deo je Smart Cut hijerarhije pa ostaje uključen radi koherentnosti algoritma; banner copy ne sme zvučati paternalistički (pouka iz "adds an unnecessary layer of pressure", `sta_je_visak_komplikovano.md` §B6). Prvi kandidat za off ako `usage_events` pokaže ignore rate. |
| `biofeedbackRules` | **`true`** | Bukvalno implementira tražene a nepostojeće funkcije: "Auto-shift on bad day — 'Loš dan' mode → smanji volume/RPE" (`feature_requests_real_users.md` §H-B) i fatigue-based autoregulaciju (`master_8020_sinteza.md` Tier S #6 "Auto-deload detection sa RPE data"; `personalizacija_..._deep_dive.md` §12.3 "Bad day mode"). **Granularnost nedostaje**: libido slider u weekly check-inu je intiman podatak — za univerzalnog tenanta kandidat za poseban sub-toggle (v. §3). |
| `metabolicModules` | **`true`** | "Injury/medical handling — text field u beleški — Condition tags koji filtriraju... NEDOSTAJE NA TRŽIŠTU. Velika prilika." (`personalizacija_..._deep_dive.md` §6, §10#7). Moduli su condition-gated (vide ih samo klijenti koji prijave stanje) pa nema bloata za ostale. Obavezno uz disclaimer framework — Trainerize ToS pouka (§6: tool ne sme tvrditi da tretira bolest). |
| `cycleTracking` | **`true` za women-focused tenante; nema podatka u istraživanju** | Nijedan od 7 dokumenata ne pominje cycle/luteal tracking kao tržišni zahtev — **nema podatka**. Odluka je pozicioniranje (naša ciljna grupa = treneri ženske klijentele, gde je ovo diferencijator koji niko nema). Za tenanta sa mešovitom/muškom klijentelom: `false`. Ovo je flag koji se najviše razlikuje po tenantu, ne univerzalni default. |
| `domsDetection` | **`true`** | Mapira na traženu auto-progresiju/regresiju: "Ako 2/3 set-a završeno → drži load... Ako 4 nedelje plateau → suggest deload" (`personalizacija_..._deep_dive.md` §2 prilika) i SmartStep koncept koji treneri sami detaljno opisuju (`feature_requests_real_feedback.md` §3G). Tih je dok se ne triggeruje. |
| `healthKit` | **`false`** | Jedini predlog promene u odnosu na trenutni config. Wearables su "2026 commodity" i traženi (`master_8020_sinteza.md` ⭐5), ALI naš HealthKit je **placeholder UI bez realne integracije** (komentar u `tenant.config.ts`). Istraživanje je jasno: ne prikazuj ono što ne radi — "Better no number than wrong number" (`master_8020_sinteza.md` ❌6); Apple Watch glitchevi su top klijentska frustracija (`feature_requests_real_users.md` §D). Lažna integracija šteti više od odsutne. Uključiti tek kad sync realno radi. |

Rezime default preseta:

```ts
features: {
  algorithm: 'full',
  mesocycles: true,
  smartCut: true,
  emergencyRefeed: true,
  dietBreak: true,
  neatGate: true,        // revizija copy-ja; prvi kandidat za off po usage podacima
  biofeedbackRules: true,
  metabolicModules: true,
  cycleTracking: true,   // samo women-focused tenant; inače false (nema podatka u istraživanju)
  domsDetection: true,
  healthKit: false,      // placeholder — ON tek uz realnu integraciju
}
```

---

## 3. Gap lista — bitno po istraživanju, nepokriveno postojećim flagovima

Kandidati za nove flagove i/ili nove funkcije, po prioritetu signala:

| # | Naziv (predlog flaga) | Zašto | Izvor |
|---|---|---|---|
| 1 | **`clientPause`** — Pause/Freeze klijenta (program + notifikacije + kasnije billing; auto-resume od dana pauze) | Najveća pojedinačna rupa industrije, otvorena 8+ godina; "I have lost clients due to this", "mission critical" | `feature_requests_real_users.md` §B#1; `master_8020_sinteza.md` ⭐1; `personalizacija_..._deep_dive.md` §4 "Life Happens mode" |
| 2 | **`exerciseSubstitution`** — granularni flag za Surgical Swap + klijent-facing smart substitution (pre-workout swap, equipment/injury filter, permanent swap kroz program) | 11.599 glasova, otvoreno od 2015; Surgical Swap već postoji u kodu (`exerciseSubstitution.ts`) ali nema svoj flag niti klijent-facing pre-workout UI | `feature_requests_real_feedback.md` §2#1; `feature_requests_real_users.md` §B#2–5 |
| 3 | **`equipmentProfile`** — Equipment tab po klijentu koji filtrira exercise pool | Tier S #10; "TrueCoach equipment tab" best practice | `master_8020_sinteza.md` ⭐15, Tier S #10 |
| 4 | **`bodyStatsVisibility`** — per-klijent toggle za težinu/mere/fotke sekcije | ED-history/postpartum klijenti; "Don't force client to enter weight" (14 glasova) | `sta_je_visak_komplikovano.md` §B1; `master_8020_sinteza.md` ❌3 |
| 5 | **`messaging`** — in-app chat trener↔klijent (+ tier-aware: off za self-serve pakete) | Table stakes — sve platforme ga imaju; "Disable chat option!!" pokazuje da mora biti per-klijent/per-tier | `fitness_saas_analiza.md` Kategorija 4; `sta_je_visak_komplikovano.md` §B8 |
| 6 | **`payments`** — Stripe billing (subscription + one-time + manual retry + pause billing) | Tier S #3 "Ne pravi billing sam — koristi Stripe"; failed payment retry je top business pain | `master_8020_sinteza.md` Tier S #3, ⭐10; `feature_requests_real_users.md` §B#21 |
| 7 | **`customCheckInForms`** — trener definiše pitanja weekly check-ina + notifikacija treneru + "reviewed" status | Check-in kao first-class citizen je Prilika #2; naš `WeeklyCheckIn.tsx` je hardcoded | `fitness_saas_analiza.md` Prilika #2; `feature_requests_real_feedback.md` §4 |
| 8 | **`rpePerSet`** — RPE/RIR po setu u klijent loggingu (toggle po klijentu — "baka ne treba RPE") | "Standard for any serious strength program"; RPE autoregulacija nam postoji, ali per-set klijentski unos je odvojena stvar | `master_8020_sinteza.md` ⭐3; `feature_requests_real_users.md` §B#10 |
| 9 | **`nutritionCustomization`** — custom macro split po gramu + training/rest day makroi + allergen/ingredient exclusion | Otvoreno od 2014; RD-ovi napuštaju platforme zbog ovoga; naš Food modul ima macro-similar swap ali ne i allergen filter ni per-gram override | `feature_requests_real_users.md` §B#12–15; `master_8020_sinteza.md` ⭐6–7 |
| 10 | **`progressPhotos`** — side-by-side poredjenje + konfigurabilne poze (+ privacy opcija da trener NE vidi) | Tier A; hardcoded poze su anti-feature | `master_8020_sinteza.md` ⭐8, ❌14 |
| 11 | **`workoutReliability`** — pause/resume workouta, auto-save svakog seta, resume posle slučajnog "End" | Najveći single uzrok klijentske frustracije kroz sve platforme | `fitness_saas_analiza.md` Prilika #1; `feature_requests_real_users.md` §D |
| 12 | **`gamification`** — eksplicitni default-OFF flag (badges, streaks, PR animacije, "animal weights") | Sve gamification mora biti opt-in; Everfit "animal weights" je dobar opt-in primer | `master_8020_sinteza.md` 🏆 Everfit gamification + ❌1–2, 🗑️9–10 |
| 13 | **`wearableSync`** — prava integracija (Apple Health prvo, zatim Garmin/Whoop/Oura/Samsung), zamena za healthKit placeholder | "2026 commodity"; ne sme se naplaćivati posebno | `master_8020_sinteza.md` ⭐5; `fitness_saas_analiza.md` bonus #6 |
| 14 | **`funnelLayer`** — tier-aware klijent UI + in-app upgrade flow (tripwire → 1-on-1) | "Niko ne pokriva ceo funnel"; "Tier upgrade nije podržan" — post-MVP, ali strateški najveća biznis prilika | `business_model_funneli.md` §X nalazi #1–3 |
| 15 | **`coachSelfUse`** — trener koristi app za svoje treninge bez klijentskog slota | "What trainer doesn't use the app for their own workouts?" — konsenzus | `master_8020_sinteza.md` ⭐12 |

Napomena: #1, #2 i #6 zajedno čine direktan GTM message — "pause + smart substitution
+ pošten billing = ono što Trainerize 10 godina obećava" (`feature_requests_real_feedback.md` §16).

---

## 4. Šta od postojećeg appa istraživanje označava kao višak (za univerzalni MVP)

Kandidati za **sakrivanje iza flaga / preimenovanje** — ništa se ne briše sada:

| Stavka u appu | Problem po istraživanju | Akcija (kandidat) | Izvor |
|---|---|---|---|
| **HealthKit placeholder** (Profile red, HealthPage, onboarding korak) | Nefunkcionalna integracija = gore od odsutne; Apple Watch sync frustracije su top klijentska žalba | `healthKit: false` po defaultu (v. §2) dok integracija nije realna | `master_8020_sinteza.md` ❌6; `feature_requests_real_users.md` §D |
| **Periodization terminologija u klijent UI** (mezo overreach/deload/return-from-break banneri) | "Not all clients require periodization"; terminologija mora biti opciona | Zadržati logiku, prevesti banner copy u plain jezik; eventualno `showPeriodizationTerms` sub-flag | `sta_je_visak_komplikovano.md` §B16; `master_8020_sinteza.md` ❌9 |
| **Gustina bannera na Home** (`AlgorithmStatusBanners.tsx` — 6+ tipova bannera) | Banner/notification spam je anti-pattern; "cognitive load reduction" je Everfit-ova pobednička filozofija | Max 1 banner istovremeno (prioritizovan), ostalo u kolapsiranu listu | `master_8020_sinteza.md` 🏆 Everfit UI, ❌13; `sta_je_visak_komplikovano.md` §A |
| **Obavezna polja u WeeklyCheckIn** (težina, mere) | Mandatory body stats su konsenzus anti-feature (ED, postpartum) | Per-klijent toggle / skip opcija (gap #4 u §3) | `sta_je_visak_komplikovano.md` §B1 |
| **Libido slider u weekly check-inu** | Nema direktnog podatka u istraživanju; intiman podatak za univerzalnog tenanta, deo `biofeedbackRules` paketa bez sopstvene granularnosti | Sub-toggle unutar biofeedbacka za white-label tenante | nema podatka (izvedeno iz toggle-everything principa, `master_8020_sinteza.md` Pillar 2) |
| **NEAT gate "hodaj više" banner** | Za sam gate nema podatka; ton "pressure" poruka je dokumentovan anti-pattern | Zadržati logiku, ublažiti copy; pratiti dismiss rate u `usage_events` | `sta_je_visak_komplikovano.md` §B6 |
| **Identitetsko pitanje u WeeklyCheckIn** | Nema podatka u istraživanju (ni za ni protiv) | Ostaviti; meriti completion rate kroz `usage_events` | nema podatka |

Eksplicitno **NIJE višak** (da ne bude zabune): mezociklus/smart cut/refeed/diet
break logika sama po sebi — istraživanje je svrstava u najtraženije nepostojeće
funkcije (§1.1). Višak je samo njihova *terminologija i gustina prikaza* u klijent UI.

---

## 5. Pricing signal

`business_model_funneli.md` sadrži dve vrste cenovnih podataka:

**(a) Šta treneri naplaćuju klijentima** (§I — value ladder):

| Tier | Cena | Touch |
|---|---|---|
| Lead magnet | $0 | none |
| Tripwire | $7–47 | none |
| Low-touch self-serve | $50–200/mo | minimal |
| Group / mid-touch | $200–700/mo | limited |
| 1-on-1 standard | $500–1.500/mo | high |
| High-ticket 1-on-1 | $1.500–5.000/mo | very high |

**(b) Šta platforme naplaćuju trenerima** (`fitness_saas_analiza.md` Deo 1 + `business_model_funneli.md` §IV):
Trainerize $23/mo headline (realno $100–200 sa add-onima), TrueCoach $25–110,
Everfit free→$77+add-oni (realno ~$134), PT Distinction $19.90 (sve uključeno),
My PT Hub $14.40–49 unlimited, HubFit $39→$149, Kahunas $35 / $99 Ultimate (branded app),
Hevy Coach $25.

**Pravila iz istraživanja koja ograničavaju pricing dizajn:**
- Per-klijent pricing = "growth penalty", TIER NEVER (`master_8020_sinteza.md` ❌ TIER NEVER #10)
- Add-on model = "just trying to milk more money out of me" — najveći cross-platform complaint (`master_8020_sinteza.md` ❌5; `fitness_saas_analiza.md` Deo 6)
- "One price. Unlimited clients. All features." je predložena tagline pozicija (`master_8020_sinteza.md` §VI)

**Mapiranje flagova na tier-ove (predlog, naš white-label model = cena po treneru/tenantu):**

| Tier | Cena signal (analogija) | Flagovi |
|---|---|---|
| **Basic** ("pošten tracker") | ~$25–49/mo ekvivalent (Hevy $25, My PT Hub $49 unlimited, Kahunas Essentials $35) | `algorithm: 'simple'`, `healthKit: false` — workout + nutrition tracking, branding, bez algoritamskih modula |
| **Premium** ("autonomni algoritam") | ~$99/mo ekvivalent (Kahunas Ultimate $99 = branded app referentna tačka) | `algorithm: 'full'` + svi granularni moduli iz §2 — auto-deload, smart cut, refeed, diet break, biofeedback, condition moduli |

Upozorenje iz istraživanja: granularne module (smartCut, biofeedback...) **ne
naplaćivati pojedinačno kao add-one** — to je dokumentovani brand killer. Razlika
tier-ova sme biti samo simple vs. full, ne á la carte. Unutar tier-a svi flagovi
ostaju toggles za prilagođavanje, ne za naplatu.

Za buduće: `business_model_funneli.md` §X–XI predlaže funnel layer (tier-aware
klijent UI, 1-click upgrade, native booking) kao najveću nepokrivenu biznis priliku
— ali to je post-MVP sloj, ne deo ovog preseta (v. gap #14).

---

## Sledeći koraci (posle 4–8 nedelja `usage_events` podataka)

1. Izmeriti dismiss/ignore rate svakog bannera → potvrditi/oboriti `neatGate` i gustinu bannera.
2. Completion rate WeeklyCheckIn polja → odluka o mandatory poljima i libido slideru.
3. Učestalost Surgical Swap triggera → prioritet gap #2 (klijent-facing substitution).
4. Procenat klijenata sa condition flagovima → opravdanost `metabolicModules` defaulta.
5. Finalizovati ovaj dokument u MVP_PRESET v1.0 i upisati default u `tenant.config.ts` template.
