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

export const MOCK_CLIENTS: ClientData[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    avatar: null,
    status: 'active',
    type: 'online',
    startDate: '2026-02-15',
    endDate: null,
    pausedAt: null,
    programWeek: 5,
    programTotalWeeks: 14,
    trialDaysTotal: 14,
    trialDaysRemaining: 0,
    dateOfBirth: '1995-03-15',
    weight: 62,
    height: 168,
    goals: ['Fat loss', 'Glute growth'],
    injuries: 'Lower back pain',
    allergies: ['lactose'],
    foodDislikes: ['Mushrooms', 'Olives'],
    metabolicProfile: ['none'],
    sleepQuality: 7,
    stressLevel: 4,
    jobType: 'sedentary',
    workSchedule: 'morning',
    trainingExperience: 'intermediate',
    workoutFrequency: 4,
    assignedProgramId: '1',
    assignedNutritionTemplateId: '1',
    streak: 14,
    level: 'Warrior',
    totalWorkoutsCompleted: 42,
    lastActiveAt: '2026-04-11T14:30:00Z',
    lastCheckInAt: '2026-04-11T12:00:00Z',
    progress: 68,
  },
  {
    id: '2',
    name: 'Ana Petrović',
    email: 'ana@example.com',
    avatar: null,
    status: 'active',
    type: 'in_person',
    startDate: '2026-03-10',
    endDate: null,
    pausedAt: null,
    programWeek: 7,
    programTotalWeeks: 13,
    trialDaysTotal: 14,
    trialDaysRemaining: 0,
    dateOfBirth: '1998-07-22',
    weight: 70,
    height: 172,
    goals: ['Fat loss', 'Strength'],
    injuries: 'Knee injury (ACL)',
    allergies: ['gluten'],
    foodDislikes: ['Seafood'],
    metabolicProfile: ['insulin_resistance'],
    sleepQuality: 5,
    stressLevel: 7,
    jobType: 'active',
    workSchedule: 'afternoon',
    trainingExperience: 'intermediate',
    workoutFrequency: 4,
    assignedProgramId: '2',
    assignedNutritionTemplateId: '1',
    streak: 7,
    level: 'Fighter',
    totalWorkoutsCompleted: 22,
    lastActiveAt: '2026-04-11T16:00:00Z',
    lastCheckInAt: '2026-04-10T09:00:00Z',
    progress: 42,
  },
  {
    id: '3',
    name: 'Mia Nikolić',
    email: 'mia@example.com',
    avatar: null,
    status: 'trial',
    type: 'online',
    startDate: '2026-04-09',
    endDate: null,
    pausedAt: null,
    programWeek: 1,
    programTotalWeeks: 8,
    trialDaysTotal: 14,
    trialDaysRemaining: 12,
    dateOfBirth: '2000-11-08',
    weight: 58,
    height: 165,
    goals: ['Health', 'Flexibility'],
    injuries: 'None',
    allergies: [],
    foodDislikes: ['Broccoli'],
    metabolicProfile: ['none'],
    sleepQuality: 8,
    stressLevel: 3,
    jobType: 'sedentary',
    workSchedule: 'flexible',
    trainingExperience: 'beginner',
    workoutFrequency: 3,
    assignedProgramId: '3',
    assignedNutritionTemplateId: '2',
    streak: 3,
    level: 'Beginner',
    totalWorkoutsCompleted: 3,
    lastActiveAt: '2026-04-11T10:00:00Z',
    lastCheckInAt: '2026-04-11T08:00:00Z',
    progress: 15,
  },
  {
    id: '4',
    name: 'Jovana Ilić',
    email: 'jovana@example.com',
    avatar: null,
    status: 'active',
    type: 'hybrid',
    startDate: '2026-01-06',
    endDate: null,
    pausedAt: null,
    programWeek: 12,
    programTotalWeeks: 13,
    trialDaysTotal: 14,
    trialDaysRemaining: 0,
    dateOfBirth: '1993-01-30',
    weight: 65,
    height: 170,
    goals: ['Muscle gain', 'Strength'],
    injuries: 'Shoulder impingement',
    allergies: ['lactose', 'nuts'],
    foodDislikes: ['Tofu', 'Eggplant'],
    metabolicProfile: ['pcos'],
    sleepQuality: 6,
    stressLevel: 5,
    jobType: 'mixed',
    workSchedule: 'morning',
    trainingExperience: 'advanced',
    workoutFrequency: 5,
    assignedProgramId: '4',
    assignedNutritionTemplateId: '3',
    streak: 30,
    level: 'Champion',
    totalWorkoutsCompleted: 156,
    lastActiveAt: '2026-04-11T18:00:00Z',
    lastCheckInAt: '2026-04-11T17:00:00Z',
    progress: 91,
  },
  {
    id: '5',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: null,
    status: 'paused',
    type: 'online',
    startDate: '2026-01-15',
    endDate: null,
    pausedAt: '2026-03-28',
    programWeek: 10,
    programTotalWeeks: 13,
    trialDaysTotal: 14,
    trialDaysRemaining: 0,
    dateOfBirth: '1990-06-20',
    weight: 85,
    height: 180,
    goals: ['Fat loss'],
    injuries: 'None',
    allergies: [],
    foodDislikes: [],
    metabolicProfile: ['insulin_resistance', 'thyroid'],
    sleepQuality: 4,
    stressLevel: 8,
    jobType: 'sedentary',
    workSchedule: 'morning',
    trainingExperience: 'intermediate',
    workoutFrequency: 3,
    assignedProgramId: '1',
    assignedNutritionTemplateId: '1',
    streak: 0,
    level: 'Fighter',
    totalWorkoutsCompleted: 35,
    lastActiveAt: '2026-03-28T12:00:00Z',
    lastCheckInAt: '2026-03-25T09:00:00Z',
    progress: 55,
  },
  {
    id: '6',
    name: 'Milica Savić',
    email: 'milica@example.com',
    avatar: null,
    status: 'trial',
    type: 'online',
    startDate: '2026-04-10',
    endDate: null,
    pausedAt: null,
    programWeek: 1,
    programTotalWeeks: 8,
    trialDaysTotal: 14,
    trialDaysRemaining: 13,
    dateOfBirth: '2001-09-03',
    weight: 73,
    height: 160,
    goals: ['Fat loss', 'Flexibility'],
    injuries: 'Plantar fasciitis',
    allergies: ['nuts'],
    foodDislikes: ['Spinach', 'Avocado'],
    metabolicProfile: ['none'],
    sleepQuality: 7,
    stressLevel: 4,
    jobType: 'sedentary',
    workSchedule: 'flexible',
    trainingExperience: 'beginner',
    workoutFrequency: 3,
    assignedProgramId: '3',
    assignedNutritionTemplateId: '2',
    streak: 1,
    level: 'Beginner',
    totalWorkoutsCompleted: 1,
    lastActiveAt: '2026-04-11T09:00:00Z',
    lastCheckInAt: null,
    progress: 8,
  },
  {
    id: '7',
    name: 'Arnold Schwarzenegger',
    email: 'arnold@example.com',
    avatar: null,
    status: 'finished',
    type: 'in_person',
    startDate: '2025-10-01',
    endDate: '2026-01-15',
    pausedAt: null,
    programWeek: 13,
    programTotalWeeks: 13,
    trialDaysTotal: 14,
    trialDaysRemaining: 0,
    dateOfBirth: '1988-04-12',
    weight: 90,
    height: 185,
    goals: ['Muscle gain', 'Strength'],
    injuries: 'None',
    allergies: [],
    foodDislikes: [],
    metabolicProfile: ['none'],
    sleepQuality: 9,
    stressLevel: 2,
    jobType: 'active',
    workSchedule: 'morning',
    trainingExperience: 'advanced',
    workoutFrequency: 5,
    assignedProgramId: null,
    assignedNutritionTemplateId: null,
    streak: 0,
    level: 'Legend',
    totalWorkoutsCompleted: 195,
    lastActiveAt: '2026-01-15T18:00:00Z',
    lastCheckInAt: '2026-01-14T09:00:00Z',
    progress: 100,
  },
];

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

// ── Workout data ──

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

export interface WorkoutTemplate {
  id: number;
  name: string;
  exercises: WorkoutExercise[];
}

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 1, name: "PPL Push Day",
    exercises: [
      { id: 1, name: "Bench Press", sets: 4, reps: "8-10", rest: "90s", notes: "" },
      { id: 2, name: "Overhead Press", sets: 3, reps: "10-12", rest: "60s", notes: "" },
      { id: 3, name: "Tricep Pushdown", sets: 3, reps: "12-15", rest: "45s", notes: "" },
      { id: 4, name: "Face Pull", sets: 3, reps: "15", rest: "45s", notes: "Slow & controlled" },
    ],
  },
  {
    id: 2, name: "Glute Focus",
    exercises: [
      { id: 1, name: "Hip Thrust", sets: 4, reps: "10-12", rest: "90s", notes: "Squeeze at top" },
      { id: 2, name: "Bulgarian Split Squat", sets: 3, reps: "10", rest: "60s", notes: "" },
      { id: 3, name: "Cable Kickback", sets: 3, reps: "12-15", rest: "45s", notes: "" },
      { id: 4, name: "Glute Bridge", sets: 3, reps: "15", rest: "45s", notes: "Pause 2s at top" },
    ],
  },
  {
    id: 3, name: "Full Body Beginner",
    exercises: [
      { id: 1, name: "Goblet Squat", sets: 3, reps: "12", rest: "60s", notes: "" },
      { id: 2, name: "Lat Pulldown", sets: 3, reps: "12", rest: "60s", notes: "" },
      { id: 3, name: "Bench Press", sets: 3, reps: "10", rest: "60s", notes: "" },
      { id: 4, name: "Plank", sets: 3, reps: "30s", rest: "30s", notes: "" },
    ],
  },
];

export interface DaySchedule {
  name: string;
  isRest: boolean;
  exercises: WorkoutExercise[];
}

export const CLIENT_WORKOUTS: Record<string, { title: string; day: string; exercises: WorkoutExercise[]; weekSchedule?: Record<string, DaySchedule> }> = {
  '1': {
    title: "Glute & Hamstring Day",
    day: "monday",
    exercises: [
      { id: 1, name: "Hip Thrust", sets: 4, reps: "10-12", rest: "90s", notes: "Squeeze at top" },
      { id: 2, name: "Romanian Deadlift", sets: 4, reps: "8-10", rest: "90s", notes: "" },
      { id: 3, name: "Bulgarian Split Squat", sets: 3, reps: "10", rest: "60s", notes: "" },
      { id: 4, name: "Leg Curl", sets: 3, reps: "12-15", rest: "45s", notes: "" },
      { id: 5, name: "Glute Bridge", sets: 3, reps: "15", rest: "45s", notes: "Pause 2s" },
    ],
  },
  '2': {
    title: "Upper Body Strength",
    day: "tuesday",
    exercises: [
      { id: 1, name: "Bench Press", sets: 4, reps: "6-8", rest: "120s", notes: "" },
      { id: 2, name: "Cable Row", sets: 4, reps: "8-10", rest: "90s", notes: "" },
      { id: 3, name: "Overhead Press", sets: 3, reps: "8-10", rest: "90s", notes: "" },
    ],
  },
  '4': {
    title: "Legs & Glutes Power",
    day: "wednesday",
    exercises: [
      { id: 1, name: "Barbell Squat", sets: 5, reps: "5", rest: "180s", notes: "Heavy" },
      { id: 2, name: "Hip Thrust", sets: 4, reps: "8-10", rest: "90s", notes: "" },
      { id: 3, name: "Leg Press", sets: 4, reps: "10-12", rest: "90s", notes: "" },
      { id: 4, name: "Lunges", sets: 3, reps: "12", rest: "60s", notes: "" },
    ],
  },
  '5': {
    title: "Fat Loss Circuit",
    day: "monday",
    exercises: [
      { id: 1, name: "Goblet Squat", sets: 4, reps: "15", rest: "30s", notes: "" },
      { id: 2, name: "Lat Pulldown", sets: 3, reps: "12", rest: "30s", notes: "" },
      { id: 3, name: "Step Up", sets: 3, reps: "12", rest: "30s", notes: "" },
    ],
  },
};

// ── Meal data ──

export interface MealItem {
  id: number;
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  foods: string[];
}

export const CLIENT_MEAL_PLANS: Record<string, { title: string; meals: MealItem[] }> = {
  '1': {
    title: "Cut Plan 2000kcal",
    meals: [
      { id: 1, name: "Doručak", time: "08:00", calories: 450, protein: 35, carbs: 45, fats: 15, foods: ["Ovsene pahuljice", "Banana", "Whey protein"] },
      { id: 2, name: "Užina", time: "10:30", calories: 200, protein: 20, carbs: 15, fats: 8, foods: ["Greek yogurt", "Berries"] },
      { id: 3, name: "Ručak", time: "13:00", calories: 550, protein: 40, carbs: 55, fats: 18, foods: ["Piletina", "Pirinač", "Salata"] },
      { id: 4, name: "Večera", time: "19:00", calories: 500, protein: 35, carbs: 40, fats: 20, foods: ["Losos", "Krompir", "Brokoli"] },
    ],
  },
  '4': {
    title: "Bulk Plan 2400kcal",
    meals: [
      { id: 1, name: "Doručak", time: "07:30", calories: 600, protein: 40, carbs: 70, fats: 20, foods: ["Jaja", "Tost", "Avokado"] },
      { id: 2, name: "Užina", time: "10:00", calories: 300, protein: 25, carbs: 30, fats: 10, foods: ["Protein bar", "Banana"] },
      { id: 3, name: "Ručak", time: "13:00", calories: 700, protein: 50, carbs: 70, fats: 25, foods: ["Govedina", "Krompir", "Povrće"] },
      { id: 4, name: "Večera", time: "19:00", calories: 600, protein: 40, carbs: 50, fats: 25, foods: ["Piletina", "Pasta", "Salata"] },
    ],
  },
};

// ── Nutrition Templates ──

export interface NutritionTemplateData {
  id: string;
  name: string;
  description: string;
  goalType: 'cut' | 'bulk' | 'maintain' | 'health';
  macroRatio: { protein: number; carbs: number; fat: number };
  calorieStrategy: 'auto' | 'fixed' | 'range';
  fixedCalories?: number;
  calorieRange?: { min: number; max: number };
  trainingDayModifier?: number;
  restDayModifier?: number;
  restrictions: string[];
  tags: string[];
  isFreeTrial: boolean;
  mealCount: number;
  mealSlots: { id: string; order: number; type: string; label: string; caloriePercentage: number; minProteinGrams: number }[];
}

export const MOCK_NUTRITION_TEMPLATES: NutritionTemplateData[] = [
  {
    id: 'nt1',
    name: 'Fat Loss Starter',
    description: 'Moderate deficit for beginners starting their fat loss journey',
    goalType: 'cut',
    macroRatio: { protein: 40, carbs: 35, fat: 25 },
    calorieStrategy: 'auto',
    trainingDayModifier: 150,
    restDayModifier: -100,
    restrictions: [],
    tags: ['beginner', 'fat_loss', '3_days_week'],
    isFreeTrial: true,
    mealCount: 5,
    mealSlots: [
      { id: '1', order: 1, type: 'breakfast', label: 'Doručak', caloriePercentage: 25, minProteinGrams: 30 },
      { id: '2', order: 2, type: 'morning_snack', label: 'Užina', caloriePercentage: 10, minProteinGrams: 15 },
      { id: '3', order: 3, type: 'lunch', label: 'Ručak', caloriePercentage: 30, minProteinGrams: 30 },
      { id: '4', order: 4, type: 'afternoon_snack', label: 'Užina', caloriePercentage: 10, minProteinGrams: 15 },
      { id: '5', order: 5, type: 'dinner', label: 'Večera', caloriePercentage: 25, minProteinGrams: 30 },
    ],
  },
  {
    id: 'nt2',
    name: 'Balanced Maintenance',
    description: 'Maintain weight with balanced macros',
    goalType: 'maintain',
    macroRatio: { protein: 30, carbs: 40, fat: 30 },
    calorieStrategy: 'auto',
    trainingDayModifier: 100,
    restDayModifier: 0,
    restrictions: [],
    tags: ['intermediate', 'maintain', '4_days_week'],
    isFreeTrial: false,
    mealCount: 5,
    mealSlots: [
      { id: '1', order: 1, type: 'breakfast', label: 'Doručak', caloriePercentage: 25, minProteinGrams: 30 },
      { id: '2', order: 2, type: 'morning_snack', label: 'Užina', caloriePercentage: 10, minProteinGrams: 15 },
      { id: '3', order: 3, type: 'lunch', label: 'Ručak', caloriePercentage: 30, minProteinGrams: 30 },
      { id: '4', order: 4, type: 'afternoon_snack', label: 'Užina', caloriePercentage: 10, minProteinGrams: 15 },
      { id: '5', order: 5, type: 'dinner', label: 'Večera', caloriePercentage: 25, minProteinGrams: 30 },
    ],
  },
  {
    id: 'nt3',
    name: 'Lean Bulk',
    description: 'Controlled surplus for muscle growth',
    goalType: 'bulk',
    macroRatio: { protein: 35, carbs: 40, fat: 25 },
    calorieStrategy: 'auto',
    trainingDayModifier: 200,
    restDayModifier: 50,
    restrictions: [],
    tags: ['advanced', 'muscle_gain', '5_days_week'],
    isFreeTrial: false,
    mealCount: 6,
    mealSlots: [
      { id: '1', order: 1, type: 'breakfast', label: 'Doručak', caloriePercentage: 20, minProteinGrams: 25 },
      { id: '2', order: 2, type: 'morning_snack', label: 'Užina', caloriePercentage: 10, minProteinGrams: 15 },
      { id: '3', order: 3, type: 'lunch', label: 'Ručak', caloriePercentage: 25, minProteinGrams: 30 },
      { id: '4', order: 4, type: 'afternoon_snack', label: 'Užina', caloriePercentage: 10, minProteinGrams: 15 },
      { id: '5', order: 5, type: 'dinner', label: 'Večera', caloriePercentage: 25, minProteinGrams: 25 },
      { id: '6', order: 6, type: 'evening_snack', label: 'Večernja užina', caloriePercentage: 10, minProteinGrams: 15 },
    ],
  },
];

// Mock activity log for clients
export interface ActivityLogItem {
  icon: string;
  description: string;
  time: string;
}

export const MOCK_ACTIVITY_LOG: Record<string, ActivityLogItem[]> = {
  '1': [
    { icon: '✅', description: 'Completed Push Day workout', time: '2h ago' },
    { icon: '📝', description: 'Submitted weekly check-in', time: '3h ago' },
    { icon: '🥗', description: 'Logged 5/5 meals', time: 'yesterday' },
    { icon: '📸', description: 'Added progress photo', time: '2 days ago' },
    { icon: '✅', description: 'Completed Pull Day workout', time: '2 days ago' },
  ],
  '2': [
    { icon: '✅', description: 'Completed Upper Body workout', time: '4h ago' },
    { icon: '🥗', description: 'Logged 4/5 meals', time: 'yesterday' },
  ],
  '3': [
    { icon: '✅', description: 'Completed Full Body workout', time: '1h ago' },
    { icon: '📝', description: 'Submitted first check-in', time: '5h ago' },
  ],
};

// Mock notes for clients
export interface ClientNote {
  id: string;
  text: string;
  date: string;
}

export const MOCK_CLIENT_NOTES: Record<string, ClientNote[]> = {
  '1': [
    { id: 'n1', text: 'Wants to focus on glute growth. Lower back sensitivity — avoid heavy deadlifts.', date: '2026-03-15' },
    { id: 'n2', text: 'Started new job, available only evenings now.', date: '2026-03-02' },
  ],
  '4': [
    { id: 'n3', text: 'Almost done with program. Discuss next phase.', date: '2026-04-08' },
  ],
};
