// ── Workout types ──

export interface WorkoutExerciseItem {
  id: string;
  exerciseId: number;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  rest: string;
  notes: string;
  order: number;
}

export interface WorkoutSection {
  id: string;
  name: string;
  type: 'regular' | 'warmup' | 'cooldown' | 'superset' | 'circuit' | 'amrap' | 'interval';
  exercises: WorkoutExerciseItem[];
}

export interface Workout {
  id: string;
  name: string;
  description: string;
  sections: WorkoutSection[];
  tags: string[];
  createdAt: string;
}

export type MesoProgression = 'linear' | 'double' | 'rpe' | 'percentage';
export type MesoDeload = 'auto' | 'off';
export type MesoPeriodization = 'linear' | 'undulating' | 'block' | 'dup';

export interface MesocycleConfig {
  /** Trener-ručno ime, npr. "Akumulacija" / "Intenzifikacija". Default: "Mezociklus N". */
  name?: string;
  /** Trajanje mezo bloka u nedeljama. Master spec: 7 (beginner) / 6 (intermediate). */
  weeks?: 4 | 5 | 6 | 7;
  /** Pravilo overload-a — algoritam interpretira pri generaciji sesija. */
  progression?: MesoProgression;
  /** Deload režim — `auto` smanjuje volumen u poslednjoj nedelji, `off` skipa. */
  deload?: MesoDeload;
  /** Periodizacioni model — block/DUP/undulating/linear. */
  periodization?: MesoPeriodization;
}

export interface ProgramDay {
  id: string;
  dayNumber: number;
  workoutId: string | null;
  workoutName: string;
  isRest: boolean;
  /** Marker — true ako ovaj dan startuje novi mezociklus (visually rendered kao
   *  "X. Mezociklus" banner iznad). Prvi dan je implicitno mezo 1. */
  mesocycleStart?: boolean;
  /** Konfiguracija mezo bloka — postoji samo na danu sa `mesocycleStart=true`
   *  ili na prvom danu programa (implicitan mezo 1). Algoritam čita ovo da
   *  generise periodizaciju, RIR ramp, deload, itd. */
  mesocycleConfig?: MesocycleConfig;
}

export interface Program {
  id: string;
  name: string;
  description: string;
  type: 'fixed' | 'calendar';
  tags: string[];
  workoutDays: ProgramDay[];
  createdAt: string;
}

// ── Tag color helpers ──

export function getTagColor(tag: string): string {
  const t = tag.toLowerCase();
  if (t === "free trial") return "bg-success/10 text-success";
  if (t === "beginner") return "bg-info/10 text-info";
  if (t === "intermediate") return "bg-warning/10 text-warning";
  if (t === "advanced") return "bg-destructive/10 text-destructive";
  if (["fat loss", "figure", "health", "muscle gain"].includes(t)) return "bg-primary/10 text-primary";
  if (t.includes("days/week")) return "bg-muted text-muted-foreground";
  if (["no lower back exercises", "no knee stress", "shoulder-safe"].includes(t)) return "bg-warning/10 text-warning";
  return "bg-muted text-muted-foreground";
}

// ── Section type config ──

export const SECTION_TYPES = [
  { value: "regular", label: "Regular" },
  { value: "warmup", label: "Warmup" },
  { value: "cooldown", label: "Cooldown" },
  { value: "superset", label: "Superset" },
  { value: "circuit", label: "Circuit" },
  { value: "amrap", label: "AMRAP" },
  { value: "interval", label: "Interval" },
] as const;

export const PROGRAM_TAGS = {
  audience: ["Free Trial", "Beginner", "Intermediate", "Advanced"],
  goals: ["Fat Loss", "Figure", "Health", "Muscle Gain"],
  frequency: ["3 days/week", "4 days/week", "5 days/week"],
  limitations: ["No lower back exercises", "No knee stress", "Shoulder-safe"],
};
