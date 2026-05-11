// ============================================================================
// trainerMockData — KANONSKI types + EXERCISE_LIBRARY (mock arrays uklonjeni)
// ============================================================================
// Zivi consumeri:
//   - ClientData / ClientStatus / ClientType → ClientProfile
//   - ExerciseItem / EXERCISE_LIBRARY / EXERCISE_CATEGORIES → useExercises hook
//   - WorkoutExercise → WorkoutEditor (i trainingMockData kompat)
//   - ClientNote → useClientNotes + clientNotesService
//
// Mock arrays uklonjeni (MOCK_CLIENTS, WORKOUT_TEMPLATES, CLIENT_WORKOUTS,
// CLIENT_MEAL_PLANS, MOCK_ACTIVITY_LOG, MOCK_CLIENT_NOTES) — svi su zamenjeni
// realnim Supabase query-jima u hooks/services.
// ============================================================================

export type ClientStatus = 'trial' | 'active' | 'paused' | 'finished';
export type ClientType = 'online' | 'in_person' | 'hybrid';

export interface ClientData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  status: ClientStatus;
  type: ClientType;
  startDate: string;
  endDate: string | null;
  pausedAt: string | null;
  programWeek: number;
  programTotalWeeks: number;
  trialDaysTotal: number;
  trialDaysRemaining: number;
  dateOfBirth: string;
  weight: number;
  height: number;
  goals: string[];
  injuries: string;
  allergies: string[];
  foodDislikes: string[];
  metabolicProfile: string[];
  sleepQuality: number;
  stressLevel: number;
  jobType: string;
  workSchedule: string;
  trainingExperience: string;
  workoutFrequency: number;
  assignedProgramId: string | null;
  assignedNutritionTemplateId: string | null;
  streak: number;
  level: string;
  totalWorkoutsCompleted: number;
  lastActiveAt: string;
  lastCheckInAt: string | null;
  // Legacy compat
  progress: number;
}

// ── Exercise Library ──

export interface ExerciseItem {
  id: number;
  name: string;
  category: string;
  subcategory: string;
  equipment: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  videoUrl: string | null;
  defaultVideoUrl: string;
  instructions: string;
}

export const EXERCISE_LIBRARY: ExerciseItem[] = [
  { id: 1, name: "Barbell Squat", category: "Noge", subcategory: "Kvadricepsi", equipment: ["Barbell", "Rack"], difficulty: "intermediate", videoUrl: null, defaultVideoUrl: "", instructions: "Stani sa šipkom na ramenima, spusti kukove do paralelne pozicije i vrati se gore." },
  { id: 2, name: "Romanian Deadlift", category: "Noge", subcategory: "Hamstringsi", equipment: ["Barbell"], difficulty: "intermediate", videoUrl: null, defaultVideoUrl: "", instructions: "Drži šipku ispred tela, savij kukove unazad sa blagim savijanjem kolena." },
  { id: 3, name: "Hip Thrust", category: "Noge", subcategory: "Gluteus", equipment: ["Barbell", "Bench"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Nasloni gornja leđa na klupu, stavi šipku preko kukova, podignise gore i stisni gluteus." },
  { id: 4, name: "Bulgarian Split Squat", category: "Noge", subcategory: "Kvadricepsi", equipment: ["Dumbbell", "Bench"], difficulty: "intermediate", videoUrl: null, defaultVideoUrl: "", instructions: "Jedna noga na klupi iza tebe, spusti se u čučanj na prednjoj nozi." },
  { id: 5, name: "Leg Press", category: "Noge", subcategory: "Kvadricepsi", equipment: ["Machine"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Sedi u mašinu, gurni platformu nogama i vrati kontrolisano." },
  { id: 6, name: "Bench Press", category: "Grudi", subcategory: "Srednji deo", equipment: ["Barbell", "Bench"], difficulty: "intermediate", videoUrl: null, defaultVideoUrl: "", instructions: "Lezi na klupu, spusti šipku do grudi i gurni gore." },
  { id: 7, name: "Overhead Press", category: "Ramena", subcategory: "Prednji delt", equipment: ["Barbell"], difficulty: "intermediate", videoUrl: null, defaultVideoUrl: "", instructions: "Stojeci, gurni šipku iznad glave do potpunog pružanja ruku." },
  { id: 8, name: "Lat Pulldown", category: "Leđa", subcategory: "Latisimus", equipment: ["Cable Machine"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Sedi u mašinu, povuci šipku do grudi i polako vrati." },
  { id: 9, name: "Cable Row", category: "Leđa", subcategory: "Gornja leđa", equipment: ["Cable Machine"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Sedi, povuci ručku ka stomaku stežući lopatice." },
  { id: 10, name: "Bicep Curl", category: "Ruke", subcategory: "Biceps", equipment: ["Dumbbell"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Stojeci, savij ruku u laktu podižući tegove ka ramenima." },
  { id: 11, name: "Tricep Pushdown", category: "Ruke", subcategory: "Triceps", equipment: ["Cable Machine"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Stojeci na kablovi, gurni ručku nadole pružajući ruke." },
  { id: 12, name: "Face Pull", category: "Ramena", subcategory: "Zadnji delt", equipment: ["Cable Machine"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Povuci konopac ka licu razdvajajući krajeve u stranu." },
  { id: 13, name: "Lunges", category: "Noge", subcategory: "Kvadricepsi", equipment: ["Dumbbell"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Korakni napred i spusti zadnje koleno ka podu." },
  { id: 14, name: "Glute Bridge", category: "Noge", subcategory: "Gluteus", equipment: ["Bodyweight"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Lezi na leđa, stopala na podu, podignise kukove stežući gluteus." },
  { id: 15, name: "Leg Curl", category: "Noge", subcategory: "Hamstringsi", equipment: ["Machine"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Lezi u mašinu, savij noge povlačeći jastučić ka sebi." },
  { id: 16, name: "Leg Extension", category: "Noge", subcategory: "Kvadricepsi", equipment: ["Machine"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Sedi u mašinu, ispruži noge podižući jastučić." },
  { id: 17, name: "Deadlift", category: "Noge", subcategory: "Hamstringsi", equipment: ["Barbell"], difficulty: "advanced", videoUrl: null, defaultVideoUrl: "", instructions: "Sa šipkom na podu, podignise je stoječi sa ravnim leđima." },
  { id: 18, name: "Cable Kickback", category: "Noge", subcategory: "Gluteus", equipment: ["Cable Machine"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Stani uz kablove, šutni nogu unazad stežući gluteus." },
  { id: 19, name: "Plank", category: "Core", subcategory: "Trbušnjaci", equipment: ["Bodyweight"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Drži telo ravno na podlakticama i prstima nogu." },
  { id: 20, name: "Russian Twist", category: "Core", subcategory: "Kosi mišići", equipment: ["Bodyweight"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Sedi sa savijenim kolenima, rotiraj trup levo-desno." },
  { id: 21, name: "Sumo Squat", category: "Noge", subcategory: "Kvadricepsi", equipment: ["Dumbbell"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Širok stav, drži teg ispred sebe, spusti se u čučanj." },
  { id: 22, name: "Goblet Squat", category: "Noge", subcategory: "Kvadricepsi", equipment: ["Dumbbell"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Drži teg ispred grudi, spusti se u dubok čučanj." },
  { id: 23, name: "Step Up", category: "Noge", subcategory: "Gluteus", equipment: ["Dumbbell", "Bench"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Stani na klupu jednom nogom, podignise se i spusti kontrolisano." },
  { id: 24, name: "Seated Row", category: "Leđa", subcategory: "Gornja leđa", equipment: ["Cable Machine"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Sedi, povuci ručku ka stomaku stežući lopatice zajedno." },
  { id: 25, name: "Incline Bench Press", category: "Grudi", subcategory: "Gornji deo", equipment: ["Barbell", "Bench"], difficulty: "intermediate", videoUrl: null, defaultVideoUrl: "", instructions: "Na koso postavljenoj klupi, spusti šipku do grudi i gurni gore." },
  { id: 26, name: "Dumbbell Fly", category: "Grudi", subcategory: "Srednji deo", equipment: ["Dumbbell", "Bench"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Lezi na klupu, raširuj tegove u stranu i vrati ih gore." },
  { id: 27, name: "Lateral Raise", category: "Ramena", subcategory: "Bočni delt", equipment: ["Dumbbell"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Stojeci, podignIi tegove u stranu do nivoa ramena." },
  { id: 28, name: "Hammer Curl", category: "Ruke", subcategory: "Biceps", equipment: ["Dumbbell"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Stojeci, savij ruke sa neutralnim hvatom (dlanova okrenutih jedno prema drugom)." },
  { id: 29, name: "Skull Crusher", category: "Ruke", subcategory: "Triceps", equipment: ["Barbell", "Bench"], difficulty: "intermediate", videoUrl: null, defaultVideoUrl: "", instructions: "Lezi na klupu, spusti šipku ka čelu savijajući laktove i vrati gore." },
  { id: 30, name: "Mountain Climbers", category: "Kardio", subcategory: "HIIT", equipment: ["Bodyweight"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "U poziciji za sklekove, naizmenično privlači kolena ka grudima brzo." },
  { id: 31, name: "Burpees", category: "Kardio", subcategory: "HIIT", equipment: ["Bodyweight"], difficulty: "intermediate", videoUrl: null, defaultVideoUrl: "", instructions: "Čučni, skoči u poziciju za sklekove, vrati se i skoči uvis." },
  { id: 32, name: "Calf Raise", category: "Noge", subcategory: "Listovi", equipment: ["Machine"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "Stani na ivicu stepenika, podignise na prste i spusti kontrolisano." },
  { id: 33, name: "Back Extension", category: "Leđa", subcategory: "Donja leđa", equipment: ["Machine"], difficulty: "beginner", videoUrl: null, defaultVideoUrl: "", instructions: "U mašini za hiperekstenzije, savij se napred i vrati u ravnu poziciju." },
  { id: 34, name: "Clean & Press", category: "Full Body", subcategory: "Olimpijski", equipment: ["Barbell"], difficulty: "advanced", videoUrl: null, defaultVideoUrl: "", instructions: "Podignni šipku sa poda do ramena, zatim gurni iznad glave." },
  { id: 35, name: "Kettlebell Swing", category: "Full Body", subcategory: "Funkcionalni", equipment: ["Kettlebell"], difficulty: "intermediate", videoUrl: null, defaultVideoUrl: "", instructions: "Zamahni kettlebell između nogu i podignise do nivoa ramena pokretom kukova." },
];

export const EXERCISE_CATEGORIES = [
  { name: "Noge", subcategories: ["Kvadricepsi", "Hamstringsi", "Gluteus", "Listovi"] },
  { name: "Grudi", subcategories: ["Gornji deo", "Srednji deo", "Donji deo"] },
  { name: "Leđa", subcategories: ["Gornja leđa", "Donja leđa", "Latisimus"] },
  { name: "Ramena", subcategories: ["Prednji delt", "Bočni delt", "Zadnji delt"] },
  { name: "Ruke", subcategories: ["Biceps", "Triceps"] },
  { name: "Core", subcategories: ["Trbušnjaci", "Kosi mišići"] },
  { name: "Kardio", subcategories: ["HIIT", "Steady state"] },
  { name: "Full Body", subcategories: ["Funkcionalni", "Olimpijski"] },
];

// ── Workout types (UI editor uses these; data comes from DB) ──

export interface WorkoutExercise {
  id: number;
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes: string;
  progressiveOverload?: string;
  hasVideo?: boolean;
}

// ── Client notes ──

export interface ClientNote {
  id: string;
  text: string;
  date: string;
}
