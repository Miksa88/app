import { EXERCISE_LIBRARY } from "./trainerMockData";

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

export interface ProgramDay {
  id: string;
  dayNumber: number;
  workoutId: string | null;
  workoutName: string;
  isRest: boolean;
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

// ── Mock Workouts ──

export const MOCK_WORKOUTS: Workout[] = [
  {
    id: "w1",
    name: "Push Day",
    description: "Chest, shoulders, and triceps focused session",
    tags: ["upper", "push"],
    createdAt: "2026-03-01",
    sections: [
      {
        id: "s1-1", name: "Warmup", type: "warmup",
        exercises: [
          { id: "e1", exerciseId: 27, name: "Lateral Raise", sets: 2, reps: "15", weight: "3", rest: "30s", notes: "Light warmup", order: 0 },
        ],
      },
      {
        id: "s1-2", name: "Main", type: "regular",
        exercises: [
          { id: "e2", exerciseId: 6, name: "Bench Press", sets: 4, reps: "8-10", weight: "40", rest: "90s", notes: "", order: 0 },
          { id: "e3", exerciseId: 25, name: "Incline Bench Press", sets: 3, reps: "10-12", weight: "30", rest: "75s", notes: "", order: 1 },
          { id: "e4", exerciseId: 7, name: "Overhead Press", sets: 3, reps: "10-12", weight: "25", rest: "60s", notes: "", order: 2 },
          { id: "e5", exerciseId: 26, name: "Dumbbell Fly", sets: 3, reps: "12-15", weight: "10", rest: "60s", notes: "", order: 3 },
          { id: "e6", exerciseId: 11, name: "Tricep Pushdown", sets: 3, reps: "12-15", weight: "15", rest: "45s", notes: "", order: 4 },
        ],
      },
    ],
  },
  {
    id: "w2",
    name: "Pull Day",
    description: "Back and biceps focused session",
    tags: ["upper", "pull"],
    createdAt: "2026-03-01",
    sections: [
      {
        id: "s2-1", name: "Main", type: "regular",
        exercises: [
          { id: "e7", exerciseId: 8, name: "Lat Pulldown", sets: 4, reps: "10-12", weight: "40", rest: "75s", notes: "", order: 0 },
          { id: "e8", exerciseId: 9, name: "Cable Row", sets: 4, reps: "10-12", weight: "35", rest: "75s", notes: "", order: 1 },
          { id: "e9", exerciseId: 12, name: "Face Pull", sets: 3, reps: "15", weight: "10", rest: "45s", notes: "Slow & controlled", order: 2 },
          { id: "e10", exerciseId: 10, name: "Bicep Curl", sets: 3, reps: "12", weight: "10", rest: "45s", notes: "", order: 3 },
          { id: "e11", exerciseId: 28, name: "Hammer Curl", sets: 3, reps: "12", weight: "10", rest: "45s", notes: "", order: 4 },
        ],
      },
    ],
  },
  {
    id: "w3",
    name: "Leg Day",
    description: "Quads, hamstrings, and glutes",
    tags: ["lower", "legs"],
    createdAt: "2026-03-02",
    sections: [
      {
        id: "s3-1", name: "Warmup", type: "warmup",
        exercises: [
          { id: "e12", exerciseId: 14, name: "Glute Bridge", sets: 2, reps: "15", weight: "0", rest: "30s", notes: "Activation", order: 0 },
        ],
      },
      {
        id: "s3-2", name: "Main", type: "regular",
        exercises: [
          { id: "e13", exerciseId: 1, name: "Barbell Squat", sets: 4, reps: "8-10", weight: "50", rest: "120s", notes: "", order: 0 },
          { id: "e14", exerciseId: 2, name: "Romanian Deadlift", sets: 4, reps: "10-12", weight: "40", rest: "90s", notes: "", order: 1 },
          { id: "e15", exerciseId: 5, name: "Leg Press", sets: 3, reps: "12-15", weight: "80", rest: "75s", notes: "", order: 2 },
          { id: "e16", exerciseId: 15, name: "Leg Curl", sets: 3, reps: "12-15", weight: "25", rest: "60s", notes: "", order: 3 },
          { id: "e17", exerciseId: 32, name: "Calf Raise", sets: 3, reps: "15-20", weight: "30", rest: "45s", notes: "", order: 4 },
        ],
      },
      {
        id: "s3-3", name: "Cooldown", type: "cooldown",
        exercises: [
          { id: "e18", exerciseId: 19, name: "Plank", sets: 2, reps: "45s", weight: "0", rest: "30s", notes: "", order: 0 },
        ],
      },
    ],
  },
  {
    id: "w4",
    name: "Full Body Beginner",
    description: "Complete full body workout for beginners",
    tags: ["full body", "beginner"],
    createdAt: "2026-03-05",
    sections: [
      {
        id: "s4-1", name: "Main", type: "regular",
        exercises: [
          { id: "e19", exerciseId: 22, name: "Goblet Squat", sets: 3, reps: "12", weight: "10", rest: "60s", notes: "", order: 0 },
          { id: "e20", exerciseId: 8, name: "Lat Pulldown", sets: 3, reps: "12", weight: "25", rest: "60s", notes: "", order: 1 },
          { id: "e21", exerciseId: 6, name: "Bench Press", sets: 3, reps: "10", weight: "20", rest: "60s", notes: "", order: 2 },
          { id: "e22", exerciseId: 14, name: "Glute Bridge", sets: 3, reps: "15", weight: "0", rest: "45s", notes: "", order: 3 },
          { id: "e23", exerciseId: 19, name: "Plank", sets: 3, reps: "30s", weight: "0", rest: "30s", notes: "", order: 4 },
        ],
      },
    ],
  },
  {
    id: "w5",
    name: "HIIT Circuit",
    description: "High-intensity interval training circuit",
    tags: ["hiit", "cardio", "circuit"],
    createdAt: "2026-03-08",
    sections: [
      {
        id: "s5-1", name: "Circuit A", type: "circuit",
        exercises: [
          { id: "e24", exerciseId: 31, name: "Burpees", sets: 4, reps: "10", weight: "0", rest: "15s", notes: "", order: 0 },
          { id: "e25", exerciseId: 30, name: "Mountain Climbers", sets: 4, reps: "20", weight: "0", rest: "15s", notes: "", order: 1 },
          { id: "e26", exerciseId: 22, name: "Goblet Squat", sets: 4, reps: "15", weight: "8", rest: "15s", notes: "", order: 2 },
          { id: "e27", exerciseId: 35, name: "Kettlebell Swing", sets: 4, reps: "15", weight: "12", rest: "60s", notes: "Rest between rounds", order: 3 },
        ],
      },
    ],
  },
  {
    id: "w6",
    name: "Glute Focus",
    description: "Targeted glute activation and growth",
    tags: ["lower", "glutes"],
    createdAt: "2026-03-10",
    sections: [
      {
        id: "s6-1", name: "Activation", type: "warmup",
        exercises: [
          { id: "e28", exerciseId: 14, name: "Glute Bridge", sets: 3, reps: "15", weight: "0", rest: "30s", notes: "Squeeze at top", order: 0 },
        ],
      },
      {
        id: "s6-2", name: "Main", type: "regular",
        exercises: [
          { id: "e29", exerciseId: 3, name: "Hip Thrust", sets: 4, reps: "10-12", weight: "50", rest: "90s", notes: "Squeeze 2s at top", order: 0 },
          { id: "e30", exerciseId: 4, name: "Bulgarian Split Squat", sets: 3, reps: "10", weight: "12", rest: "60s", notes: "", order: 1 },
          { id: "e31", exerciseId: 18, name: "Cable Kickback", sets: 3, reps: "12-15", weight: "10", rest: "45s", notes: "", order: 2 },
          { id: "e32", exerciseId: 21, name: "Sumo Squat", sets: 3, reps: "12", weight: "16", rest: "60s", notes: "", order: 3 },
          { id: "e33", exerciseId: 23, name: "Step Up", sets: 3, reps: "12", weight: "8", rest: "45s", notes: "", order: 4 },
        ],
      },
    ],
  },
];

// ── Mock Programs ──

export const MOCK_PROGRAMS: Program[] = [
  {
    id: "p1",
    name: "PPL Split — 12 Weeks",
    description: "Classic push/pull/legs split for intermediate lifters",
    type: "fixed",
    tags: ["Intermediate", "Muscle Gain", "4 days/week"],
    createdAt: "2026-02-15",
    workoutDays: [
      { id: "pd1", dayNumber: 1, workoutId: "w1", workoutName: "Push Day", isRest: false },
      { id: "pd2", dayNumber: 2, workoutId: "w2", workoutName: "Pull Day", isRest: false },
      { id: "pd3", dayNumber: 3, workoutId: "w3", workoutName: "Leg Day", isRest: false },
      { id: "pd4", dayNumber: 4, workoutId: null, workoutName: "Rest", isRest: true },
      { id: "pd5", dayNumber: 5, workoutId: "w1", workoutName: "Push Day", isRest: false },
      { id: "pd6", dayNumber: 6, workoutId: "w2", workoutName: "Pull Day", isRest: false },
      { id: "pd7", dayNumber: 7, workoutId: "w3", workoutName: "Leg Day", isRest: false },
    ],
  },
  {
    id: "p2",
    name: "Beginner Full Body",
    description: "Full body program for beginners starting their journey",
    type: "fixed",
    tags: ["Free Trial", "Beginner", "Health", "3 days/week", "Shoulder-safe"],
    createdAt: "2026-03-01",
    workoutDays: [
      { id: "pd8", dayNumber: 1, workoutId: "w4", workoutName: "Full Body Beginner", isRest: false },
      { id: "pd9", dayNumber: 2, workoutId: null, workoutName: "Rest", isRest: true },
      { id: "pd10", dayNumber: 3, workoutId: "w4", workoutName: "Full Body Beginner", isRest: false },
      { id: "pd11", dayNumber: 4, workoutId: null, workoutName: "Rest", isRest: true },
      { id: "pd12", dayNumber: 5, workoutId: "w4", workoutName: "Full Body Beginner", isRest: false },
      { id: "pd13", dayNumber: 6, workoutId: null, workoutName: "Rest", isRest: true },
      { id: "pd14", dayNumber: 7, workoutId: null, workoutName: "Rest", isRest: true },
    ],
  },
  {
    id: "p3",
    name: "Fat Loss HIIT",
    description: "Intensive fat loss program with HIIT and strength",
    type: "calendar",
    tags: ["Fat Loss", "Intermediate", "5 days/week"],
    createdAt: "2026-03-05",
    workoutDays: [
      { id: "pd15", dayNumber: 1, workoutId: "w5", workoutName: "HIIT Circuit", isRest: false },
      { id: "pd16", dayNumber: 2, workoutId: "w3", workoutName: "Leg Day", isRest: false },
      { id: "pd17", dayNumber: 3, workoutId: null, workoutName: "Rest", isRest: true },
      { id: "pd18", dayNumber: 4, workoutId: "w1", workoutName: "Push Day", isRest: false },
      { id: "pd19", dayNumber: 5, workoutId: "w2", workoutName: "Pull Day", isRest: false },
      { id: "pd20", dayNumber: 6, workoutId: "w5", workoutName: "HIIT Circuit", isRest: false },
      { id: "pd21", dayNumber: 7, workoutId: null, workoutName: "Rest", isRest: true },
    ],
  },
  {
    id: "p4",
    name: "Glute Focus 8-Week",
    description: "Targeted glute development program",
    type: "fixed",
    tags: ["Figure", "Beginner", "4 days/week", "No knee stress"],
    createdAt: "2026-03-10",
    workoutDays: [
      { id: "pd22", dayNumber: 1, workoutId: "w6", workoutName: "Glute Focus", isRest: false },
      { id: "pd23", dayNumber: 2, workoutId: "w1", workoutName: "Push Day", isRest: false },
      { id: "pd24", dayNumber: 3, workoutId: null, workoutName: "Rest", isRest: true },
      { id: "pd25", dayNumber: 4, workoutId: "w6", workoutName: "Glute Focus", isRest: false },
      { id: "pd26", dayNumber: 5, workoutId: "w3", workoutName: "Leg Day", isRest: false },
      { id: "pd27", dayNumber: 6, workoutId: null, workoutName: "Rest", isRest: true },
      { id: "pd28", dayNumber: 7, workoutId: null, workoutName: "Rest", isRest: true },
    ],
  },
];

// ── Program Matching Logic ──

export function findMatchingPrograms(
  clientProfile: {
    goal: string;
    experience: string;
    frequency: number;
    limitations: string[];
  },
  programs: Program[]
): Program[] {
  return programs
    .map((program) => {
      let score = 0;
      const tags = program.tags.map((t) => t.toLowerCase());

      // Goal match (+3 points)
      if (clientProfile.goal === "fat_loss" && tags.includes("fat loss")) score += 3;
      if (clientProfile.goal === "figure" && tags.includes("figure")) score += 3;
      if (clientProfile.goal === "health" && tags.includes("health")) score += 3;

      // Experience match (+2 points)
      if (tags.includes(clientProfile.experience.toLowerCase())) score += 2;

      // Frequency match (+2 points)
      if (tags.includes(`${clientProfile.frequency} days/week`)) score += 2;

      // Limitation compatibility (+1 point per matching limitation tag)
      if (clientProfile.limitations.includes("lower_back") && tags.includes("no lower back exercises")) score += 1;
      if (clientProfile.limitations.includes("knees") && tags.includes("no knee stress")) score += 1;
      if (clientProfile.limitations.includes("shoulders") && tags.includes("shoulder-safe")) score += 1;

      // Free trial tag (+1 bonus for new clients)
      if (tags.includes("free trial")) score += 1;

      return { program, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.program);
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
