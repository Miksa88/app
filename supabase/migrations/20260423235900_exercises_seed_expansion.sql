-- Migracija: exercises seed expansion 32 → 100
-- Spec referenca: 01_TRAINING_FLOW_MASTER.md §9 (Exercise Library)
-- Commit: IT-21

-- ============================================================================
-- NAPOMENA: ON CONFLICT strategija
-- ============================================================================
-- exercises tabela NEMA UNIQUE constraint na `name` (provjereno u shemi).
-- INSERT bez conflict handling. Sva nova imena su provjere ne postoje u
-- postojećih 32 (Barbell Squat, Romanian Deadlift, Hip Thrust, Bulgarian Split
-- Squat, Leg Press, Bench Press, Overhead Press, Lat Pulldown, Cable Row,
-- Bicep Curl, Tricep Pushdown, Face Pull, Lunges, Glute Bridge, Leg Curl,
-- Leg Extension, Deadlift, Cable Kickback, Plank, Russian Twist, Sumo Squat,
-- Goblet Squat, Step Up, Seated Row, Incline Bench Press, Dumbbell Fly,
-- Lateral Raise, Hammer Curl, Skull Crusher, Mountain Climbers, Burpees,
-- Calf Raise, Back Extension, Clean & Press, Kettlebell Swing).
-- ============================================================================

INSERT INTO public.exercises (
  name, name_sr, is_system_exercise, movement_pattern, primary_muscle,
  secondary_muscles, tension_profile, cns_load, fatigue_index,
  equipment, difficulty, requires_stabilization, contraindications,
  gentle_on, weight_increment, is_bilateral, is_compound,
  is_finisher_eligible, is_glute_builder, instructions
) VALUES

-- ============================================================================
-- LOWER BODY — SQUAT (5 vežbi)
-- ============================================================================

('Box Squat', 'Čučanj na kutiju', TRUE, 'squat', 'quads',
  ARRAY['glutes','hamstrings']::TEXT[], 'mid_range', 4, 4,
  ARRAY['barbell']::TEXT[], 'intermediate', FALSE,
  ARRAY['knee_pain']::TEXT[], ARRAY['knee_pain']::TEXT[],
  2.5, TRUE, TRUE, FALSE, FALSE,
  'Stani ispred kutije sa šipkom na ramenima. Sedi polako na kutiju, zadrži sekund i vrati se gore.'),

('Hack Squat', 'Hek čučanj', TRUE, 'squat', 'quads',
  ARRAY['glutes','calves']::TEXT[], 'mid_range', 3, 4,
  ARRAY['machine']::TEXT[], 'intermediate', FALSE,
  ARRAY['knee_pain','lower_back_injury']::TEXT[], ARRAY['lower_back_injury']::TEXT[],
  5.0, TRUE, TRUE, FALSE, FALSE,
  'Sedi u hack squat mašinu. Gurni platformu nogama i vrati kontrolisano, kolena prate pravac prstiju.'),

('Front Squat', 'Prednji čučanj', TRUE, 'squat', 'quads',
  ARRAY['core_front','glutes']::TEXT[], 'mid_range', 4, 4,
  ARRAY['barbell']::TEXT[], 'advanced', TRUE,
  ARRAY['shoulder_impingement','wrist_pain']::TEXT[], ARRAY[]::TEXT[],
  2.5, TRUE, TRUE, FALSE, FALSE,
  'Šipka leži na prednjoj strani ramena. Čučni duboko držeći torzo uspravan.'),

('Zercher Squat', 'Zercher čučanj', TRUE, 'squat', 'quads',
  ARRAY['core_front','glutes','biceps']::TEXT[], 'mid_range', 4, 4,
  ARRAY['barbell']::TEXT[], 'advanced', TRUE,
  ARRAY['elbow_pain','lower_back_injury']::TEXT[], ARRAY[]::TEXT[],
  2.5, TRUE, TRUE, FALSE, FALSE,
  'Šipka drži u pregibima laktova. Čučni duboko, laktovi ostaju gore.'),

('Dumbbell Squat', 'Čučanj sa bučicama', TRUE, 'squat', 'quads',
  ARRAY['glutes','hamstrings']::TEXT[], 'mid_range', 2, 3,
  ARRAY['dumbbell']::TEXT[], 'beginner_safe', FALSE,
  ARRAY[]::TEXT[], ARRAY['knee_pain','lower_back_injury']::TEXT[],
  2.5, TRUE, TRUE, FALSE, FALSE,
  'Drži bučice pored tela ili na ramenima. Čučni dok butine nisu paralelne sa podom.'),

-- ============================================================================
-- LOWER BODY — HINGE (5 vežbi)
-- ============================================================================

('Stiff Leg Deadlift', 'Mrtvo dizanje sa ispruženim nogama', TRUE, 'hinge', 'hamstrings',
  ARRAY['glutes','lower_back']::TEXT[], 'stretch', 3, 4,
  ARRAY['barbell']::TEXT[], 'intermediate', FALSE,
  ARRAY['lower_back_injury']::TEXT[], ARRAY[]::TEXT[],
  2.5, TRUE, TRUE, FALSE, FALSE,
  'Noge skoro potpuno ispružene. Savij napred od kukova spuštajući šipku niz noge.'),

('Good Morning', 'Dobro jutro', TRUE, 'hinge', 'hamstrings',
  ARRAY['glutes','lower_back']::TEXT[], 'stretch', 3, 4,
  ARRAY['barbell']::TEXT[], 'intermediate', FALSE,
  ARRAY['lower_back_injury']::TEXT[], ARRAY[]::TEXT[],
  2.5, TRUE, TRUE, FALSE, FALSE,
  'Šipka na ramenima. Savij napred od kukova dok torzo nije skoro paralelan sa podom, pa se vrati.'),

('Single Leg Deadlift', 'Mrtvo dizanje na jednoj nozi', TRUE, 'hinge', 'hamstrings',
  ARRAY['glutes','core_front']::TEXT[], 'stretch', 3, 4,
  ARRAY['dumbbell','kettlebell']::TEXT[], 'intermediate', TRUE,
  ARRAY['lower_back_injury','ankle_instability']::TEXT[], ARRAY[]::TEXT[],
  2.5, FALSE, TRUE, FALSE, TRUE,
  'Stoj na jednoj nozi. Savij napred od kuka spuštajući teg ka podu dok slobodna noga ide unazad.'),

('Trap Bar Deadlift', 'Mrtvo dizanje sa trap šipkom', TRUE, 'hinge', 'hamstrings',
  ARRAY['glutes','quads','lower_back']::TEXT[], 'mid_range', 4, 4,
  ARRAY['barbell']::TEXT[], 'intermediate', FALSE,
  ARRAY['shoulder_impingement']::TEXT[], ARRAY['lower_back_injury']::TEXT[],
  5.0, TRUE, TRUE, FALSE, FALSE,
  'Stani unutar trap šipke. Podignise sa ravnim leđima, manje stresa na leđa nego klasično.'),

('Kettlebell Deadlift', 'Mrtvo dizanje sa kettlebell-om', TRUE, 'hinge', 'glutes',
  ARRAY['hamstrings','lower_back']::TEXT[], 'mid_range', 2, 3,
  ARRAY['kettlebell']::TEXT[], 'beginner_safe', FALSE,
  ARRAY[]::TEXT[], ARRAY['lower_back_injury']::TEXT[],
  4.0, TRUE, TRUE, FALSE, TRUE,
  'Kettlebell između nogu na podu. Čučni blago i podignise ravnih leđa. Dobro za učenje hinge pokreta.'),

-- ============================================================================
-- LOWER BODY — LUNGE (6 vežbi)
-- ============================================================================

('Reverse Lunge', 'Iskorak unazad', TRUE, 'lunge', 'glutes',
  ARRAY['quads','hamstrings']::TEXT[], 'mid_range', 2, 3,
  ARRAY['dumbbell','bodyweight']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['knee_pain']::TEXT[], ARRAY['knee_pain']::TEXT[],
  2.5, FALSE, TRUE, FALSE, TRUE,
  'Korakni unazad i spusti zadnje koleno ka podu. Manje stresa na koljeno nego klasični iskorak.'),

('Walking Lunge', 'Hodajući iskorak', TRUE, 'lunge', 'quads',
  ARRAY['glutes','hamstrings']::TEXT[], 'mid_range', 3, 4,
  ARRAY['dumbbell','bodyweight']::TEXT[], 'intermediate', TRUE,
  ARRAY['knee_pain']::TEXT[], ARRAY[]::TEXT[],
  2.5, FALSE, TRUE, TRUE, FALSE,
  'Korakni napred u iskorak, pa drugi korak odmah napred. Nastavi hodanjem kroz prostor.'),

('Lateral Lunge', 'Bočni iskorak', TRUE, 'lunge', 'quads',
  ARRAY['glutes','hip_abductor']::TEXT[], 'mid_range', 2, 3,
  ARRAY['dumbbell','bodyweight']::TEXT[], 'beginner_safe', TRUE,
  ARRAY['knee_pain','hip_pain']::TEXT[], ARRAY[]::TEXT[],
  2.5, FALSE, TRUE, FALSE, FALSE,
  'Korakni u stranu i sedi u iskorak na jednoj nozi. Druga noga ostaje ispružena.'),

('Curtsy Lunge', 'Referencijalni iskorak', TRUE, 'lunge', 'glutes',
  ARRAY['quads','hip_abductor']::TEXT[], 'mid_range', 2, 3,
  ARRAY['dumbbell','bodyweight']::TEXT[], 'beginner_safe', TRUE,
  ARRAY['knee_pain']::TEXT[], ARRAY[]::TEXT[],
  2.5, FALSE, TRUE, FALSE, TRUE,
  'Korakni iza i unakrst, spusti koleno ka podu. Fokus na spoljašnji deo gluteusa.'),

('Lunge with Knee Drive', 'Iskorak sa podizanjem kolena', TRUE, 'lunge', 'glutes',
  ARRAY['quads','core_front']::TEXT[], 'mid_range', 3, 3,
  ARRAY['bodyweight','dumbbell']::TEXT[], 'intermediate', TRUE,
  ARRAY['knee_pain']::TEXT[], ARRAY[]::TEXT[],
  2.5, FALSE, TRUE, TRUE, FALSE,
  'Iskorak napred, pa se vrati podižući prednje koleno visoko. Dinamično, aktivira core.'),

('Barbell Lunge', 'Iskorak sa šipkom', TRUE, 'lunge', 'quads',
  ARRAY['glutes','hamstrings']::TEXT[], 'mid_range', 4, 4,
  ARRAY['barbell']::TEXT[], 'intermediate', TRUE,
  ARRAY['knee_pain','lower_back_injury']::TEXT[], ARRAY[]::TEXT[],
  2.5, FALSE, TRUE, FALSE, FALSE,
  'Šipka na ramenima. Korakni napred u dubok iskorak i vrati se u početak.'),

-- ============================================================================
-- LOWER BODY — GLUTE ISOLATION (4 vežbi)
-- ============================================================================

('Barbell Hip Thrust', 'Hip trest sa šipkom', TRUE, 'hip_extension', 'glutes',
  ARRAY['hamstrings','core_front']::TEXT[], 'shortened', 3, 4,
  ARRAY['barbell']::TEXT[], 'intermediate', FALSE,
  ARRAY['lower_back_injury']::TEXT[], ARRAY[]::TEXT[],
  5.0, TRUE, TRUE, FALSE, TRUE,
  'Nasloni gornja leđa na klupu sa šipkom na kukovima. Gurni kukove gore i stisni gluteus na vrhu.'),

('Single Leg Hip Thrust', 'Hip trest na jednoj nozi', TRUE, 'hip_extension', 'glutes',
  ARRAY['hamstrings']::TEXT[], 'shortened', 3, 4,
  ARRAY['bodyweight','dumbbell']::TEXT[], 'intermediate', TRUE,
  ARRAY['lower_back_injury']::TEXT[], ARRAY[]::TEXT[],
  2.5, FALSE, TRUE, FALSE, TRUE,
  'Hip trest sa jednom nogom podignutom. Duplo intenzivniji od klasičnog hip tresta.'),

('Donkey Kick', 'Donkey kick', TRUE, 'hip_extension', 'glutes',
  ARRAY[]::TEXT[], 'shortened', 2, 2,
  ARRAY['bodyweight','cable','resistance_band']::TEXT[], 'beginner_safe', FALSE,
  ARRAY[]::TEXT[], ARRAY['knee_pain','lower_back_injury']::TEXT[],
  1.0, FALSE, FALSE, FALSE, TRUE,
  'Na četiri oslonca, podignise nogu prema plafonu savijenu u koljenu. Stisni gluteus na vrhu.'),

('Fire Hydrant', 'Vatrogasni otvarač', TRUE, 'hip_abduction', 'glutes',
  ARRAY['hip_abductor']::TEXT[], 'mid_range', 1, 2,
  ARRAY['bodyweight','resistance_band']::TEXT[], 'beginner_safe', FALSE,
  ARRAY[]::TEXT[], ARRAY['knee_pain','hip_pain','lower_back_injury']::TEXT[],
  0.0, FALSE, FALSE, FALSE, TRUE,
  'Na četiri oslonca, podignise koljeno u stranu bez pomeranja kuka. Aktivira gornji deo gluteusa.'),

-- ============================================================================
-- LOWER BODY — HIP ABDUCTION / ADDUCTION (3 vežbi)
-- ============================================================================

('Hip Abduction Machine', 'Mašina za otvaranje nogu', TRUE, 'hip_abduction', 'glutes',
  ARRAY['hip_abductor']::TEXT[], 'mid_range', 2, 2,
  ARRAY['machine']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['hip_pain']::TEXT[], ARRAY['knee_pain','lower_back_injury']::TEXT[],
  5.0, TRUE, FALSE, FALSE, TRUE,
  'Sedi u mašinu, gurnise noge u stranu protiv otpora. Odlično za aktivaciju gluteus mediusa.'),

('Hip Adduction Machine', 'Mašina za zatvaranje nogu', TRUE, 'hip_adduction', 'quads',
  ARRAY['hip_adductor']::TEXT[], 'mid_range', 2, 2,
  ARRAY['machine']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['hip_pain','groin_injury']::TEXT[], ARRAY['knee_pain']::TEXT[],
  5.0, TRUE, FALSE, FALSE, FALSE,
  'Sedi u mašinu, skupise noge jednu prema drugoj. Radi unutrašnju stranu butine.'),

('Resistance Band Hip Abduction', 'Otvaranje sa trakom', TRUE, 'hip_abduction', 'glutes',
  ARRAY['hip_abductor']::TEXT[], 'mid_range', 1, 2,
  ARRAY['resistance_band']::TEXT[], 'beginner_safe', FALSE,
  ARRAY[]::TEXT[], ARRAY['knee_pain','hip_pain','lower_back_injury']::TEXT[],
  0.0, FALSE, FALSE, FALSE, TRUE,
  'Traka oko kolena ili gležnjeva. Stoji ili leži i otvaraj noge suprotno otporu trake.'),

-- ============================================================================
-- UPPER BODY — PUSH HORIZONTAL (5 vežbi)
-- ============================================================================

('Dumbbell Bench Press', 'Potisak sa bučicama ležeći', TRUE, 'push_horizontal', 'chest',
  ARRAY['triceps','shoulders']::TEXT[], 'stretch', 3, 3,
  ARRAY['dumbbell']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['shoulder_impingement']::TEXT[], ARRAY['shoulder_impingement']::TEXT[],
  2.0, TRUE, TRUE, FALSE, FALSE,
  'Lezi na klupu sa bučicama. Spusti ih do visine grudi i gurni gore. Veći ROM od šipke.'),

('Cable Chest Press', 'Potisak na kablovima', TRUE, 'push_horizontal', 'chest',
  ARRAY['triceps','shoulders']::TEXT[], 'full_rom', 3, 3,
  ARRAY['cable']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['shoulder_impingement']::TEXT[], ARRAY['shoulder_impingement']::TEXT[],
  2.5, TRUE, TRUE, FALSE, FALSE,
  'Stoji između kablova, gurni ručke napred spajajući šake ispred grudi. Konstantan otpor.'),

('Push Up', 'Sklekovi', TRUE, 'push_horizontal', 'chest',
  ARRAY['triceps','shoulders','core_front']::TEXT[], 'mid_range', 2, 3,
  ARRAY['bodyweight']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['wrist_pain','shoulder_impingement']::TEXT[], ARRAY['shoulder_impingement']::TEXT[],
  0.0, TRUE, TRUE, TRUE, FALSE,
  'Na rukama i prstima nogu, spusti se dok grudi skoro ne dotaknu pod, pa se vrati gore.'),

('Decline Bench Press', 'Potisak na negativnoj klupi', TRUE, 'push_horizontal', 'chest',
  ARRAY['triceps','shoulders']::TEXT[], 'mid_range', 3, 3,
  ARRAY['barbell']::TEXT[], 'intermediate', FALSE,
  ARRAY['shoulder_impingement','lower_back_injury']::TEXT[], ARRAY[]::TEXT[],
  2.5, TRUE, TRUE, FALSE, FALSE,
  'Negativna klupa (glava niže). Gurni šipku od donjeg dela grudi. Fokus na donji deo grudnog koša.'),

('Cable Crossover', 'Kabel crossover', TRUE, 'push_horizontal', 'chest',
  ARRAY['shoulders']::TEXT[], 'shortened', 2, 2,
  ARRAY['cable']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['shoulder_impingement']::TEXT[], ARRAY[]::TEXT[],
  2.5, TRUE, FALSE, FALSE, FALSE,
  'Kablovi postavljeni visoko, povuci ih nadole ukrštajući ispred tela. Konstantna tenzija na grudima.'),

-- ============================================================================
-- UPPER BODY — PUSH VERTICAL (4 vežbi)
-- ============================================================================

('Dumbbell Shoulder Press', 'Potisak bučicama iznad glave', TRUE, 'push_vertical', 'shoulders',
  ARRAY['triceps']::TEXT[], 'mid_range', 3, 3,
  ARRAY['dumbbell']::TEXT[], 'intermediate', TRUE,
  ARRAY['shoulder_impingement']::TEXT[], ARRAY[]::TEXT[],
  2.0, TRUE, TRUE, FALSE, FALSE,
  'Sedi ili stoji sa bučicama na visini ramena. Gurni ih iznad glave do potpunog pružanja.'),

('Arnold Press', 'Arnold press', TRUE, 'push_vertical', 'shoulders',
  ARRAY['triceps','chest']::TEXT[], 'full_rom', 3, 3,
  ARRAY['dumbbell']::TEXT[], 'intermediate', TRUE,
  ARRAY['shoulder_impingement']::TEXT[], ARRAY[]::TEXT[],
  2.0, TRUE, TRUE, FALSE, FALSE,
  'Počni sa bučicama ispred lica. Rotiraj šake dok guriš gore. Rotirajući pokret aktivira sve delove ramena.'),

('Seated Machine Press', 'Mašinski potisak iznad glave', TRUE, 'push_vertical', 'shoulders',
  ARRAY['triceps']::TEXT[], 'mid_range', 3, 3,
  ARRAY['machine']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['shoulder_impingement']::TEXT[], ARRAY['shoulder_impingement']::TEXT[],
  5.0, TRUE, TRUE, FALSE, FALSE,
  'Sedi u mašinu za ramena. Gurni ručke iznad glave. Bezbedno za početnike, fiksira pokret.'),

('Pike Push Up', 'Sklekovi u V poziciji', TRUE, 'push_vertical', 'shoulders',
  ARRAY['triceps','core_front']::TEXT[], 'mid_range', 2, 3,
  ARRAY['bodyweight']::TEXT[], 'intermediate', FALSE,
  ARRAY['shoulder_impingement','wrist_pain']::TEXT[], ARRAY[]::TEXT[],
  0.0, TRUE, TRUE, FALSE, FALSE,
  'Telo u obliku slova V. Savij laktove spuštajući glavu između ruku. Radi deltoid bez opreme.'),

-- ============================================================================
-- UPPER BODY — PULL VERTICAL (4 vežbi)
-- ============================================================================

('Pull Up', 'Zgibovi', TRUE, 'pull_vertical', 'back',
  ARRAY['biceps','core_front']::TEXT[], 'mid_range', 4, 4,
  ARRAY['bodyweight']::TEXT[], 'advanced', TRUE,
  ARRAY['shoulder_impingement','elbow_pain']::TEXT[], ARRAY[]::TEXT[],
  0.0, TRUE, TRUE, FALSE, FALSE,
  'Visi na šipki, povuci se gore dok brada ne premaši šipku. Jedna od najtežih bodyweight vežbi.'),

('Assisted Pull Up', 'Zgib uz pomoć mašine', TRUE, 'pull_vertical', 'back',
  ARRAY['biceps']::TEXT[], 'mid_range', 2, 3,
  ARRAY['machine']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['shoulder_impingement']::TEXT[], ARRAY['elbow_pain']::TEXT[],
  5.0, TRUE, TRUE, FALSE, FALSE,
  'Kolena na jastučiću koji kompenzuje deo tvoje težine. Isti pokret kao zgib, lakši za početnike.'),

('Chin Up', 'Zgib uskim hvatom', TRUE, 'pull_vertical', 'back',
  ARRAY['biceps']::TEXT[], 'mid_range', 4, 4,
  ARRAY['bodyweight']::TEXT[], 'advanced', TRUE,
  ARRAY['shoulder_impingement','elbow_pain']::TEXT[], ARRAY[]::TEXT[],
  0.0, TRUE, TRUE, FALSE, FALSE,
  'Hvat ispod šipke (šake prema tebi). Lakši od klasičnog zgiba, više aktivira biceps.'),

('Single Arm Lat Pulldown', 'Lat pulldown jednom rukom', TRUE, 'pull_vertical', 'back',
  ARRAY['biceps']::TEXT[], 'mid_range', 2, 3,
  ARRAY['cable']::TEXT[], 'beginner_safe', TRUE,
  ARRAY['shoulder_impingement']::TEXT[], ARRAY[]::TEXT[],
  2.5, FALSE, TRUE, FALSE, FALSE,
  'Sedi i povuci ručku jednom rukom ka grudima. Koriguje neravnoteže između strana.'),

-- ============================================================================
-- UPPER BODY — PULL HORIZONTAL (4 vežbi)
-- ============================================================================

('Dumbbell Row', 'Veslanje bučicom', TRUE, 'pull_horizontal', 'back',
  ARRAY['biceps']::TEXT[], 'mid_range', 3, 3,
  ARRAY['dumbbell']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['lower_back_injury']::TEXT[], ARRAY[]::TEXT[],
  2.5, FALSE, TRUE, FALSE, FALSE,
  'Jednom rukom osloni se na klupu. Drugom rukom veslaj bučicu uz telo do kukova.'),

('Barbell Row', 'Veslanje sa šipkom', TRUE, 'pull_horizontal', 'back',
  ARRAY['biceps','lower_back']::TEXT[], 'mid_range', 4, 4,
  ARRAY['barbell']::TEXT[], 'intermediate', FALSE,
  ARRAY['lower_back_injury']::TEXT[], ARRAY[]::TEXT[],
  2.5, TRUE, TRUE, FALSE, FALSE,
  'Torzo nagnun napred, povuci šipku ka stomaku. Lopatice skupiti pri vrhu pokreta.'),

('Chest Supported Row', 'Veslanje osloncem na klupicu', TRUE, 'pull_horizontal', 'back',
  ARRAY['biceps']::TEXT[], 'mid_range', 3, 3,
  ARRAY['dumbbell']::TEXT[], 'beginner_safe', FALSE,
  ARRAY[]::TEXT[], ARRAY['lower_back_injury']::TEXT[],
  2.5, TRUE, TRUE, FALSE, FALSE,
  'Lezi grudima na nagnutu klupu. Vesla bučicama bez opterećenja donjeg dela leđa.'),

('Machine Row', 'Mašinsko veslanje', TRUE, 'pull_horizontal', 'back',
  ARRAY['biceps']::TEXT[], 'mid_range', 3, 3,
  ARRAY['machine']::TEXT[], 'beginner_safe', FALSE,
  ARRAY[]::TEXT[], ARRAY['lower_back_injury','shoulder_impingement']::TEXT[],
  5.0, TRUE, TRUE, FALSE, FALSE,
  'Sedi u mašinu za veslanje. Povuci ručku ka stomaku skupljajući lopatice. Dobro za početnike.'),

-- ============================================================================
-- IZOLACIJA — BICEPS (4 vežbi)
-- ============================================================================

('Barbell Curl', 'Pregib sa šipkom', TRUE, 'elbow_flexion', 'biceps',
  ARRAY['forearms']::TEXT[], 'mid_range', 2, 2,
  ARRAY['barbell']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['wrist_pain','elbow_pain']::TEXT[], ARRAY[]::TEXT[],
  2.5, TRUE, FALSE, FALSE, FALSE,
  'Stoji sa šipkom. Savij ruke u laktovima podižući šipku ka ramenima bez ljuljanja tela.'),

('Preacher Curl', 'Pregib na predikaču', TRUE, 'elbow_flexion', 'biceps',
  ARRAY[]::TEXT[], 'stretch', 2, 2,
  ARRAY['barbell','dumbbell']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['elbow_pain']::TEXT[], ARRAY[]::TEXT[],
  2.5, TRUE, FALSE, FALSE, FALSE,
  'Lakat oslonjen na nagnutu ploču. Savij ruku podižući teg. Izoluje biceps bez varanja.'),

('Incline Dumbbell Curl', 'Pregib na nagnutoj klupi', TRUE, 'elbow_flexion', 'biceps',
  ARRAY[]::TEXT[], 'stretch', 2, 2,
  ARRAY['dumbbell']::TEXT[], 'intermediate', FALSE,
  ARRAY['shoulder_impingement','elbow_pain']::TEXT[], ARRAY[]::TEXT[],
  2.0, FALSE, FALSE, FALSE, FALSE,
  'Sedi na nagnutoj klupi. Ruke vise slobodno iza. Daje veći isteg bicepsa u startu.'),

('Cable Curl', 'Pregib na kablovoj mašini', TRUE, 'elbow_flexion', 'biceps',
  ARRAY['forearms']::TEXT[], 'mid_range', 2, 2,
  ARRAY['cable']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['wrist_pain']::TEXT[], ARRAY['elbow_pain']::TEXT[],
  2.5, TRUE, FALSE, FALSE, FALSE,
  'Stoji ispred donjeg kabla. Povuci ručku ka ramenima. Kabel daje konstantnu tenziju kroz ceo pokret.'),

-- ============================================================================
-- IZOLACIJA — TRICEPS (4 vežbi)
-- ============================================================================

('Overhead Tricep Extension', 'Triceps iznad glave', TRUE, 'elbow_extension', 'triceps',
  ARRAY[]::TEXT[], 'stretch', 2, 2,
  ARRAY['dumbbell','cable']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['elbow_pain','shoulder_impingement']::TEXT[], ARRAY[]::TEXT[],
  2.0, TRUE, FALSE, FALSE, FALSE,
  'Drži teg ili kablovski prihvat iznad glave. Savij lakte spuštajući teg iza glave.'),

('Tricep Dip', 'Sklekovi na paralelnim šipkama', TRUE, 'elbow_extension', 'triceps',
  ARRAY['chest','shoulders']::TEXT[], 'mid_range', 3, 3,
  ARRAY['bodyweight']::TEXT[], 'intermediate', FALSE,
  ARRAY['shoulder_impingement','wrist_pain']::TEXT[], ARRAY[]::TEXT[],
  0.0, TRUE, TRUE, FALSE, FALSE,
  'Na paralelnim šipkama ili klupi. Spusti se savijajući lakte, pa se vrati gore.'),

('Cable Tricep Kickback', 'Opružanje tricepsa na kablovima', TRUE, 'elbow_extension', 'triceps',
  ARRAY[]::TEXT[], 'shortened', 2, 2,
  ARRAY['cable','dumbbell']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['elbow_pain']::TEXT[], ARRAY[]::TEXT[],
  2.5, FALSE, FALSE, FALSE, FALSE,
  'Torzo nagnun napred, lakat uz telo. Ispruži ruku unazad i zadrži sekund pri vrhu.'),

('Close Grip Bench Press', 'Potisak uskim hvatom', TRUE, 'elbow_extension', 'triceps',
  ARRAY['chest','shoulders']::TEXT[], 'mid_range', 3, 3,
  ARRAY['barbell']::TEXT[], 'intermediate', FALSE,
  ARRAY['wrist_pain','shoulder_impingement']::TEXT[], ARRAY[]::TEXT[],
  2.5, TRUE, TRUE, FALSE, FALSE,
  'Isti pokret kao potisak, ali šipka drži uže. Fokus prebaci sa grudi na triceps.'),

-- ============================================================================
-- IZOLACIJA — RAMENA (4 vežbi)
-- ============================================================================

('Rear Delt Fly', 'Razmak za zadnji deltoid', TRUE, 'shoulder_horizontal_abduction', 'shoulders',
  ARRAY['back']::TEXT[], 'mid_range', 2, 2,
  ARRAY['dumbbell','cable']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['shoulder_impingement']::TEXT[], ARRAY[]::TEXT[],
  1.0, TRUE, FALSE, FALSE, FALSE,
  'Torzo nagnun napred. Raširuj ruke u stranu i unazad. Aktivira zadnji deo deltoidnog mišića.'),

('Front Raise', 'Prednje podizanje ruku', TRUE, 'shoulder_flexion', 'shoulders',
  ARRAY[]::TEXT[], 'mid_range', 2, 2,
  ARRAY['dumbbell','barbell','cable']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['shoulder_impingement']::TEXT[], ARRAY[]::TEXT[],
  1.0, TRUE, FALSE, FALSE, FALSE,
  'Stoji, ruke spuštene. Podignisi ruke ispred sebe do visine ramena. Radi prednji deltoid.'),

('Cable Lateral Raise', 'Bočno podizanje na kablovima', TRUE, 'shoulder_abduction', 'shoulders',
  ARRAY[]::TEXT[], 'mid_range', 2, 2,
  ARRAY['cable']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['shoulder_impingement']::TEXT[], ARRAY[]::TEXT[],
  2.5, FALSE, FALSE, FALSE, FALSE,
  'Kabel uz telo. Podignisi ruku sa strane do visine ramena. Konstantna tenzija duž celog pokreta.'),

('Upright Row', 'Veslanje uspravno', TRUE, 'shoulder_abduction', 'shoulders',
  ARRAY['biceps','back']::TEXT[], 'mid_range', 3, 3,
  ARRAY['barbell','dumbbell','cable']::TEXT[], 'intermediate', FALSE,
  ARRAY['shoulder_impingement']::TEXT[], ARRAY[]::TEXT[],
  2.5, TRUE, TRUE, FALSE, FALSE,
  'Povuci šipku ili bučice uz telo do visine brade. Laktovi idu gore i u stranu.'),

-- ============================================================================
-- IZOLACIJA — LISTOVI (3 vežbi)
-- ============================================================================

('Seated Calf Raise', 'Podizanje na prste u sedećem položaju', TRUE, 'plantar_flexion', 'calves',
  ARRAY[]::TEXT[], 'full_rom', 2, 2,
  ARRAY['machine','dumbbell']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['ankle_instability']::TEXT[], ARRAY['ankle_instability']::TEXT[],
  5.0, TRUE, FALSE, FALSE, FALSE,
  'Sedi sa tegovima na kolenima. Podignise na prste. Radi soleus (spoljašnji list).'),

('Standing Calf Raise', 'Stojece podizanje na prste', TRUE, 'plantar_flexion', 'calves',
  ARRAY[]::TEXT[], 'full_rom', 2, 2,
  ARRAY['machine','bodyweight']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['ankle_instability']::TEXT[], ARRAY[]::TEXT[],
  5.0, TRUE, FALSE, FALSE, FALSE,
  'Stoji na ivici stepenika. Spusti pete, pa se podignisi što više na prste.'),

('Donkey Calf Raise', 'Donkey podizanje na prste', TRUE, 'plantar_flexion', 'calves',
  ARRAY[]::TEXT[], 'full_rom', 2, 2,
  ARRAY['machine','bodyweight']::TEXT[], 'intermediate', FALSE,
  ARRAY['lower_back_injury','ankle_instability']::TEXT[], ARRAY[]::TEXT[],
  5.0, TRUE, FALSE, FALSE, FALSE,
  'Torzo nagnut paralelno sa podom. Podignise na prste sa punim obimom pokreta.'),

-- ============================================================================
-- CORE (8 vežbi)
-- ============================================================================

('Dead Bug', 'Mrtva buba', TRUE, 'core_anti_extension', 'core_front',
  ARRAY['core_oblique']::TEXT[], 'mid_range', 2, 2,
  ARRAY['bodyweight']::TEXT[], 'beginner_safe', FALSE,
  ARRAY[]::TEXT[], ARRAY['lower_back_injury']::TEXT[],
  0.0, TRUE, FALSE, FALSE, FALSE,
  'Lezi na leđa, ruke gore, noge u 90 stepeni. Naizmenično pruži ruku i suprotnu nogu ka podu.'),

('Bird Dog', 'Ptičji pas', TRUE, 'core_anti_rotation', 'core_front',
  ARRAY['glutes','lower_back']::TEXT[], 'mid_range', 1, 2,
  ARRAY['bodyweight']::TEXT[], 'beginner_safe', FALSE,
  ARRAY[]::TEXT[], ARRAY['lower_back_injury','knee_pain']::TEXT[],
  0.0, TRUE, FALSE, FALSE, FALSE,
  'Na četiri oslonca. Ispruži suprotnu ruku i nogu istovremeno. Drži kičmu ravnom.'),

('Pallof Press', 'Pallof press', TRUE, 'core_anti_rotation', 'core_oblique',
  ARRAY['core_front']::TEXT[], 'mid_range', 2, 2,
  ARRAY['cable','resistance_band']::TEXT[], 'beginner_safe', FALSE,
  ARRAY[]::TEXT[], ARRAY['lower_back_injury']::TEXT[],
  2.5, TRUE, FALSE, FALSE, FALSE,
  'Stoji bočno uz kablove. Gurni ručku ispred sebe i vrati je. Otpor pokušava da te zarotira.'),

('Ab Wheel Rollout', 'Kotač za trbuh', TRUE, 'core_anti_extension', 'core_front',
  ARRAY['shoulders','triceps']::TEXT[], 'stretch', 3, 4,
  ARRAY['bodyweight']::TEXT[], 'advanced', FALSE,
  ARRAY['lower_back_injury','shoulder_impingement']::TEXT[], ARRAY[]::TEXT[],
  0.0, TRUE, FALSE, FALSE, FALSE,
  'Na kolenima, guraj kotač napred dok se ne ispravaš, pa se vrati. Jedna od najtežih core vežbi.'),

('Hanging Leg Raise', 'Podizanje nogu u visu', TRUE, 'core_flexion', 'core_front',
  ARRAY['hip_flexor']::TEXT[], 'mid_range', 3, 3,
  ARRAY['bodyweight']::TEXT[], 'advanced', TRUE,
  ARRAY['shoulder_impingement','lower_back_injury']::TEXT[], ARRAY[]::TEXT[],
  0.0, TRUE, FALSE, FALSE, FALSE,
  'Visi na šipki. Podignisi noge ravne ili savijene u kolenima do visine kukova ili više.'),

('Cable Crunch', 'Uvijanje na kablovima', TRUE, 'core_flexion', 'core_front',
  ARRAY[]::TEXT[], 'mid_range', 2, 2,
  ARRAY['cable']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['lower_back_injury']::TEXT[], ARRAY[]::TEXT[],
  5.0, TRUE, FALSE, FALSE, FALSE,
  'Klekni ispred kabla. Povuci ga niz glavu i uvij se ka podlakticama skupljajući trbuh.'),

('Bicycle Crunch', 'Trbušnjaci na biciklu', TRUE, 'core_rotation', 'core_oblique',
  ARRAY['core_front']::TEXT[], 'mid_range', 2, 3,
  ARRAY['bodyweight']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['lower_back_injury','neck_pain']::TEXT[], ARRAY[]::TEXT[],
  0.0, TRUE, FALSE, TRUE, FALSE,
  'Lezi na leđa, naizmenično dodiruj suprotno koleno laktom uz rotaciju trupa.'),

('Side Plank', 'Bočni plank', TRUE, 'core_anti_lateral_flexion', 'core_oblique',
  ARRAY['core_front','shoulders']::TEXT[], 'mid_range', 2, 2,
  ARRAY['bodyweight']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['shoulder_impingement','wrist_pain']::TEXT[], ARRAY['lower_back_injury']::TEXT[],
  0.0, FALSE, FALSE, FALSE, FALSE,
  'Telo ravno na jednoj podlaktici i strani stopala. Drži kuk podignut od poda.'),

-- ============================================================================
-- FINISHERI (7 vežbi)
-- ============================================================================

('Jump Squat', 'Skočni čučanj', TRUE, 'squat', 'quads',
  ARRAY['glutes','calves']::TEXT[], 'mid_range', 4, 4,
  ARRAY['bodyweight']::TEXT[], 'intermediate', FALSE,
  ARRAY['knee_pain','ankle_instability']::TEXT[], ARRAY[]::TEXT[],
  0.0, TRUE, TRUE, TRUE, FALSE,
  'Čučni do pola dubine pa eksplodivno skoči gore. Meki dočetak. Srce odmah radi.'),

('Box Jump', 'Skok na kutiju', TRUE, 'squat', 'quads',
  ARRAY['glutes','calves']::TEXT[], 'mid_range', 4, 4,
  ARRAY['bodyweight']::TEXT[], 'intermediate', FALSE,
  ARRAY['knee_pain','ankle_instability']::TEXT[], ARRAY[]::TEXT[],
  0.0, TRUE, TRUE, TRUE, FALSE,
  'Skoči na kutiju ili stepenicu eksplodivnim pokretom. Sadi meko, spusti se koračajući nazad.'),

('Battle Rope Waves', 'Talasi sa borbenim konopcem', TRUE, 'carry', 'shoulders',
  ARRAY['core_front','back']::TEXT[], 'mid_range', 3, 4,
  ARRAY['resistance_band']::TEXT[], 'intermediate', FALSE,
  ARRAY['shoulder_impingement']::TEXT[], ARRAY[]::TEXT[],
  0.0, TRUE, TRUE, TRUE, FALSE,
  'Drži konopac u svakoj ruci. Naizmenično ili simultano pravi talase što brže možeš.'),

('Sled Push', 'Guranje sanlica', TRUE, 'carry', 'quads',
  ARRAY['glutes','shoulders','core_front']::TEXT[], 'mid_range', 5, 5,
  ARRAY['machine']::TEXT[], 'intermediate', FALSE,
  ARRAY['lower_back_injury','shoulder_impingement']::TEXT[], ARRAY[]::TEXT[],
  0.0, TRUE, TRUE, TRUE, FALSE,
  'Guraji sanke sa teretom što brže možeš kroz prostor. Brutalno za noge i pluća.'),

('Tire Flip', 'Okretanje gume', TRUE, 'hinge', 'hamstrings',
  ARRAY['glutes','shoulders','core_front']::TEXT[], 'mid_range', 5, 5,
  ARRAY['bodyweight']::TEXT[], 'advanced', FALSE,
  ARRAY['lower_back_injury','shoulder_impingement']::TEXT[], ARRAY[]::TEXT[],
  0.0, TRUE, TRUE, TRUE, FALSE,
  'Podignisi veliku gumu od poda hinge pokretom, pa je odgurni da se prevrne.'),

('Farmer''s Walk', 'Hod farmera', TRUE, 'carry', 'forearms',
  ARRAY['core_front','shoulders','quads']::TEXT[], 'mid_range', 3, 4,
  ARRAY['dumbbell','kettlebell']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['lower_back_injury']::TEXT[], ARRAY[]::TEXT[],
  5.0, TRUE, TRUE, TRUE, FALSE,
  'Uzmi težak teret u svaku ruku i hodaj koliko god možeš. Radi celo telo i grip.'),

('Assault Bike Sprint', 'Sprint na assault biciklu', TRUE, 'carry', 'quads',
  ARRAY['shoulders','core_front']::TEXT[], 'mid_range', 5, 5,
  ARRAY['machine']::TEXT[], 'beginner_safe', FALSE,
  ARRAY[]::TEXT[], ARRAY['knee_pain','lower_back_injury']::TEXT[],
  0.0, TRUE, FALSE, TRUE, FALSE,
  'Pedaliraj i guraj ručice što brže možeš u kratkom intervalu. 20-30 sekundi je dovoljan.'),

-- ============================================================================
-- ACCESSORY / SCAPULAR / MOBILNOST (5 vežbi)
-- ============================================================================

('Band Pull Apart', 'Razdvajanje trake', TRUE, 'shoulder_horizontal_abduction', 'back',
  ARRAY['shoulders']::TEXT[], 'mid_range', 1, 1,
  ARRAY['resistance_band']::TEXT[], 'beginner_safe', FALSE,
  ARRAY[]::TEXT[], ARRAY['shoulder_impingement']::TEXT[],
  0.0, TRUE, FALSE, FALSE, FALSE,
  'Drži traku ispred sebe. Rastegni je razdvajajući ruke u stranu. Odlično za zdravlje ramena.'),

('Scapular Push Up', 'Lopaticastni sklekovi', TRUE, 'push_horizontal', 'back',
  ARRAY['shoulders']::TEXT[], 'mid_range', 1, 1,
  ARRAY['bodyweight']::TEXT[], 'beginner_safe', FALSE,
  ARRAY['wrist_pain']::TEXT[], ARRAY['shoulder_impingement']::TEXT[],
  0.0, TRUE, FALSE, FALSE, FALSE,
  'U poziciji za sklekove, skupi i razdvoji lopatice bez savijanja laktova. Aktivira serratus.'),

('Hip Circle', 'Krug kukovima', TRUE, 'hip_abduction', 'glutes',
  ARRAY['hip_abductor','hip_adductor']::TEXT[], 'full_rom', 1, 1,
  ARRAY['resistance_band','bodyweight']::TEXT[], 'beginner_safe', FALSE,
  ARRAY[]::TEXT[], ARRAY['hip_pain','knee_pain','lower_back_injury']::TEXT[],
  0.0, FALSE, FALSE, FALSE, TRUE,
  'Traka oko kolena. Pravi kružne pokrete kukom ili naizmenično otvaraj i zatvori kolena.'),

('Tibialis Raise', 'Podizanje na pete', TRUE, 'dorsiflexion', 'calves',
  ARRAY[]::TEXT[], 'mid_range', 1, 1,
  ARRAY['bodyweight']::TEXT[], 'beginner_safe', FALSE,
  ARRAY[]::TEXT[], ARRAY['ankle_instability']::TEXT[],
  0.0, TRUE, FALSE, FALSE, FALSE,
  'Nasloni se leđima uz zid. Podignisi prste ka sebi oslonjen na petama. Radi prednji list.'),

('Reverse Hyper', 'Reversna hiperekstenzija', TRUE, 'hip_extension', 'glutes',
  ARRAY['hamstrings','lower_back']::TEXT[], 'mid_range', 2, 2,
  ARRAY['machine']::TEXT[], 'intermediate', FALSE,
  ARRAY[]::TEXT[], ARRAY['lower_back_injury']::TEXT[],
  5.0, TRUE, FALSE, FALSE, TRUE,
  'Lezi na mašinu, noge vise dole. Podignisi ih do horizontale skupljajući gluteus.')

;
