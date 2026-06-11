# Product

## Register

product

## Users

Žene 25–45 koje treniraju po programu svog trenera (trenutno Ivana). Koriste app na telefonu (iOS-native osećaj, Capacitor shell), često usred treninga u teretani ili kod kuće — jedna ruka, znojavi prsti, kratka pažnja između serija. Drugi korisnik: trener, na telefonu ili laptopu, pregleda klijente i uređuje programe. Treći (white-label): drugi treneri kojima se app prodaje sa njihovim brendingom.

## Product Purpose

Autonomni trening + ishrana coach: 8-slojni algoritam (mezociklusi, RPE/RIR, smart cut, refeed) vodi klijentkinju kroz program bez čekanja trenera. App mora da uliva poverenje — korisnica veruje brojevima i preporukama. Uspeh = klijentkinja se vraća svaki dan, loguje trening i obroke bez trenja, i oseća da je app "uz nju".

## Brand Personality

Mirna, stručna, ohrabrujuća. "Starija sestra koja je i fiziolog" — ne drill sergeant, ne cheerleader. Anti-anxiety je ugrađen princip: bez streak-ova, bez kazni za propušteno, bez "missed workout" sramoćenja (queue je pointer, ne kalendar). Telesni podaci se tretiraju nežno (ED-aware: merenja su opciona).

## Anti-references

- Tipičan fitness-bro app (crno/neon zeleno, agresivne CAPS poruke, PR konfete na svakom koraku)
- Gamifikovani štapići-i-šargarepe (Duolingo streak pritisak)
- Generički AI SaaS izgled (cream bg, gradient text, identične kartice sa ikonicom+naslov+tekst, eyebrow iznad svake sekcije)
- Spreadsheet-coaching estetika (Trainerize/TrueCoach sive tabele)

## Design Principles

1. **Tišina je premium** — manje elemenata, jasnija hijerarhija; jedna stvar po ekranu je glavna.
2. **iOS-native pre nego web** — sheet-ovi, krupni touch targeti (≥44pt), spring tranzicije, poštovanje safe-area.
3. **Brojevi moraju da deluju pouzdano** — podaci (težine, makroi, RPE) tipografski čvrsti, bez dekoracije koja podriva poverenje.
4. **Usred treninga sve je krupno i jednoručno** — ActiveWorkout je najvažniji ekran; donja polovina ekrana nosi akcije.
5. **Motion potvrđuje, ne zabavlja** — animacija postoji da potvrdi akciju (set završen, obrok logovan), nikad da uspori čest gest.

## Accessibility & Inclusion

WCAG AA kontrast (≥4.5:1 body tekst). `prefers-reduced-motion` poštovan globalno. Touch targeti ≥44×44pt. Dva jezika (sr default, en). Dark i light tema ravnopravne. ED-aware: težina/mere/fotke nikad obavezne, bez vrednosnih sudova u copy-ju ("loš dan" ne postoji).
