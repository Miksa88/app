// ============================================================================
// AlgorithmStatusBanners — surfacing UserStatus na Home/Workout screen
// ============================================================================
//
// Renderuje banner-e po stanju iz UserStatus. Copy je dečji jezik — bez
// stručnih termina (RPE, Overreach, mTOR, NEAT). Korisnik treba da odmah
// razume šta da radi.
// ============================================================================

import { Calendar, Flame, Sparkles, Footprints, Coffee, Heart, Droplets, ShieldCheck, BatteryLow } from 'lucide-react';
import { motion } from 'framer-motion';

export interface AlgorithmStatusInput {
  // Mezociklus
  currentMicrocycleIndex: number;       // 0-based: 0=W1
  totalWeeksInMesocycle: number;        // 7 beginner / 6 intermediate
  isInDeload: boolean;
  hasHashimoto: boolean;

  // Smart Cut (4 steps za intermediate, 3 za beginner)
  currentSmartCutStep: 0 | 1 | 2 | 3 | 4;
  isIntermediate?: boolean;
  targetMode: string;

  // Refeed
  activeRefeedDay: boolean;

  // SREDNJE_NAPREDNE_V2 §5.4 Diet Break
  dietBreakActive: boolean;

  // pocetnici.md §5.3 Return from Break — vraćaš se posle pauze (4-7+ dana)
  isInReturnFromBreak: boolean;

  // NEAT
  neatDailyAvg: number | null;          // null = nema podataka

  // pocetnici.md §4.3 biofeedback flags (set by syncEngine on each tick)
  smartCutPaused?: boolean;             // libido <4 → STOP Smart Cut
  waterRetentionAlert?: boolean;        // waterRetention >7 → ne smanjuj hidrate

  // pocetnici.md §4.4 chronic DOMS: 2+ "Teško" zaredom → -1 set per vežba
  chronicHardWorkouts?: boolean;

  // Pre-workout "Umorna" — forsiraj MAINTAIN sledecu sesiju (bez progress overload)
  preWorkoutFatigue?: boolean;

  // Reduced motion
  prefersReducedMotion?: boolean;
}

const NEAT_GATE = 10000;

type MezoPhase = 'kalibracija' | 'akumulacija' | 'overreach' | 'deload';

function describeMezoPhase(input: AlgorithmStatusInput): MezoPhase {
  const { currentMicrocycleIndex: idx, totalWeeksInMesocycle: total } = input;
  if (idx === total - 1) return 'deload';
  if (idx === total - 2) return 'overreach';
  if (idx === 0) return 'kalibracija';
  return 'akumulacija';
}

function smartCutSimpleLabel(step: 0 | 1 | 2 | 3 | 4, isIntermediate: boolean): string {
  if (step === 1) return 'Manje masti u obrocima — telo se prilagođava.';
  if (step === 2) return 'Manje hidrata van treninga — energija ostaje gde treba.';
  if (step === 3) {
    return isIntermediate
      ? 'Manje hidrata u sredinskim obrocima.'
      : 'Poslednji korak — manje hidrata oko treninga.';
  }
  if (step === 4) return 'Poslednji korak — manje hidrata oko treninga.';
  return '';
}

// ============================================================================

export default function AlgorithmStatusBanners(props: AlgorithmStatusInput) {
  const banners: React.ReactNode[] = [];
  const motionProps = props.prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

  // Re-entry posle pauze — najviši prioritet kad je aktivan
  // (smanjene težine, lakša nedelja, kalorije malo niže za fat loss zaštitu)
  if (props.isInReturnFromBreak) {
    banners.push(
      <Banner
        key="returnFromBreak"
        tone="info"
        icon={<Heart size={20} />}
        title="Vraćaš se polako"
        subtitle="Tetive i CNS treba 1 nedelju da se priviknu. Ova nedelja je lakša — bez forsiranja."
        motionProps={motionProps}
      />
    );
  }

  // Diet Break — najviši prioritet (2 nedelje pauze od dijete)
  if (props.dietBreakActive) {
    banners.push(
      <Banner
        key="dietBreak"
        tone="success"
        icon={<Coffee size={20} />}
        title="Pauza od dijete — 2 nedelje"
        subtitle="Telu treba odmor od deficita. Jedi normalno, treniraj lakše. Posle ovoga ide sledeći blok."
        motionProps={motionProps}
      />
    );
  }

  // Mezociklus — samo Overreach i Deload se prikazuju (ostalo ne treba banner)
  const phase = describeMezoPhase(props);
  if (phase === 'overreach') {
    banners.push(
      <Banner
        key="mezo"
        tone="warning"
        icon={<Flame size={20} />}
        title="Najjača nedelja"
        subtitle="Težine na maksimumu. Posle ove dolazi pauza za oporavak — guraj još malo."
        motionProps={motionProps}
      />
    );
  } else if (phase === 'deload') {
    banners.push(
      <Banner
        key="mezo"
        tone="info"
        icon={<Calendar size={20} />}
        title="Lakša nedelja — odmor"
        subtitle="Trening je lagan, mišići se grade. Sledeća nedelja kreće jako."
        motionProps={motionProps}
      />
    );
  }

  // Refeed dan
  if (props.activeRefeedDay) {
    banners.push(
      <Banner
        key="refeed"
        tone="success"
        icon={<Sparkles size={20} />}
        title="Dan punjenja"
        subtitle="Više hidrata, manje masti — telo se puni gorivom. Sutra normalno."
        motionProps={motionProps}
      />
    );
  }

  // Smart Cut pauziran (libido pad signališe preagresivan deficit)
  // pocetnici.md §4.3: libido <4/10 → pauseSmartCut, povratak na maintenance
  if (props.smartCutPaused) {
    banners.push(
      <Banner
        key="smartCutPaused"
        tone="warning"
        icon={<ShieldCheck size={20} />}
        title="Pauza u smanjenju"
        subtitle="Telo daje signal da je dijeta prejaka. Vraćamo na održavanje dok se sve ne stabilizuje."
        motionProps={motionProps}
      />
    );
  } else if (props.currentSmartCutStep > 0) {
    // Smart Cut — samo prikazujemo da se nešto promenilo, bez tehničkih termina
    banners.push(
      <Banner
        key="smartCut"
        tone="primary"
        icon={<Sparkles size={20} />}
        title="Plan se prilagođava"
        subtitle={smartCutSimpleLabel(
          props.currentSmartCutStep,
          props.isIntermediate ?? false,
        )}
        motionProps={motionProps}
      />
    );
  }

  // Water retention alert (pocetnici.md §4.3 — kortizol/so/alkohol driven)
  if (props.waterRetentionAlert) {
    banners.push(
      <Banner
        key="waterRetention"
        tone="info"
        icon={<Droplets size={20} />}
        title="Telo zadržava vodu"
        subtitle="Nije problem hidrata — pregled soli, alkohola i sna. Za par dana se izbalansira."
        motionProps={motionProps}
      />
    );
  }

  // DOMS chronic (2+ "Teško" zaredom — volumen je smanjen za 1 seriju)
  if (props.chronicHardWorkouts) {
    banners.push(
      <Banner
        key="chronicHard"
        tone="info"
        icon={<Heart size={20} />}
        title="Manje serija ove sesije"
        subtitle="Pošto su zadnji treninzi bili teški, danas idemo lakše — oporavak je deo plana."
        motionProps={motionProps}
      />
    );
  }

  // Pre-workout fatigue ("Umorna" pre treninga → MAINTAIN sledeću sesiju)
  if (props.preWorkoutFatigue) {
    banners.push(
      <Banner
        key="preWorkoutFatigue"
        tone="muted"
        icon={<BatteryLow size={20} />}
        title="Lakša sesija — bez forsiranja"
        subtitle="Pošto si bila umorna, držimo težine na istom nivou. Bez progresije danas."
        motionProps={motionProps}
      />
    );
  }

  // NEAT — child-friendly call to action
  const isOnCut =
    props.targetMode === 'deficit' || props.targetMode === 'recomposition';
  if (isOnCut && props.neatDailyAvg !== null && props.neatDailyAvg < NEAT_GATE) {
    const stepsToGo = NEAT_GATE - Math.round(props.neatDailyAvg);
    banners.push(
      <Banner
        key="neat"
        tone="muted"
        icon={<Footprints size={20} />}
        title="Hodaj malo više"
        subtitle={`Još ~${stepsToGo.toLocaleString()} koraka do 10.000 — bolji rezultati bez gladovanja.`}
        motionProps={motionProps}
      />
    );
  }

  if (banners.length === 0) return null;

  return <div className="flex flex-col gap-2">{banners}</div>;
}

// ============================================================================
// Banner — internal pure presentational
// ============================================================================

type BannerTone = 'warning' | 'info' | 'success' | 'primary' | 'muted';

interface BannerProps {
  tone: BannerTone;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  motionProps: object;
}

const TONE_STYLES: Record<BannerTone, string> = {
  warning: 'bg-warning/10 text-warning-foreground border-warning/30',
  info: 'bg-info/10 text-info-foreground border-info/30',
  success: 'bg-success/10 text-success-foreground border-success/30',
  primary: 'bg-primary/10 text-primary-foreground border-primary/30',
  muted: 'bg-muted/40 text-foreground border-border',
};

const ICON_BG: Record<BannerTone, string> = {
  warning: 'bg-warning/20 text-warning',
  info: 'bg-info/20 text-info',
  success: 'bg-success/20 text-success',
  primary: 'bg-primary/20 text-primary',
  muted: 'bg-muted text-muted-foreground',
};

function Banner({ tone, icon, title, subtitle, motionProps }: BannerProps) {
  return (
    <motion.div
      {...motionProps}
      className={`rounded-2xl border p-4 flex items-start gap-3 ${TONE_STYLES[tone]}`}
      role="status"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ICON_BG[tone]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-subhead font-semibold leading-tight">{title}</p>
        <p className="text-footnote text-foreground/80 mt-1 leading-snug">{subtitle}</p>
      </div>
    </motion.div>
  );
}
