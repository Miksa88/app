import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import TrainerBottomNav from "@/components/TrainerBottomNav";
import { SkipToContent, ScrollManager } from "@/components/SkipToContent";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { HealthProvider } from "@/contexts/HealthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
// Login + Home su eager (entry points) — brža initial paint
import Login from "./pages/Login";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// Lazy-loaded routes — smanjuje initial bundle za ~70%
const Gym = lazy(() => import("./pages/Gym"));
const ActiveWorkout = lazy(() => import("./pages/ActiveWorkout"));
const PostWorkout = lazy(() => import("./pages/PostWorkout"));
const Food = lazy(() => import("./pages/Food"));
const Chat = lazy(() => import("./pages/Chat"));
const Profile = lazy(() => import("./pages/Profile"));
const Progress = lazy(() => import("./pages/Progress"));
const Milestones = lazy(() => import("./pages/Milestones"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const AnalysisReport = lazy(() => import("./pages/AnalysisReport"));
const WeeklyCheckIn = lazy(() => import("./pages/WeeklyCheckIn"));

// Trainer routes — zasebni chunk
const TrainerDashboard = lazy(() => import("./pages/trainer/TrainerDashboard"));
const TrainerClients = lazy(() => import("./pages/trainer/TrainerClients"));
const ClientProfile = lazy(() => import("./pages/trainer/ClientProfile"));
const TrainerTraining = lazy(() => import("./pages/trainer/TrainerTraining"));
const ExerciseDetail = lazy(() => import("./pages/trainer/ExerciseDetail"));
const WorkoutEditor = lazy(() => import("./pages/trainer/WorkoutEditor"));
const ProgramEditor = lazy(() => import("./pages/trainer/ProgramEditor"));
const AssignProgram = lazy(() => import("./pages/trainer/AssignProgram"));
const AddClient = lazy(() => import("./pages/trainer/AddClient"));
const TrainerMessages = lazy(() => import("./pages/trainer/TrainerMessages"));
const TrainerAnalytics = lazy(() => import("./pages/trainer/TrainerAnalytics"));
const TrainerPayments = lazy(() => import("./pages/trainer/TrainerPayments"));
const TrainerProfile = lazy(() => import("./pages/trainer/TrainerProfile"));
const TrainerNutrition = lazy(() => import("./pages/trainer/TrainerNutrition"));
const NutritionTemplateEditor = lazy(() => import("./pages/trainer/NutritionTemplateEditor"));
const MealPicker = lazy(() => import("./pages/trainer/MealPicker"));
const TrainerPackages = lazy(() => import("./pages/trainer/TrainerPackages"));
const PackageEditor = lazy(() => import("./pages/trainer/PackageEditor"));
const TrainerFreeTrial = lazy(() => import("./pages/trainer/TrainerFreeTrial"));

const queryClient = new QueryClient();

// Lightweight fallback — izbegava skeleton FOUC; puni skeleton dolazi unutar svake stranice
const RouteFallback = () => (
  <div className="min-h-screen bg-background-secondary" aria-busy="true" aria-label="Loading" />
);

/**
 * Route wrapper — per-route ErrorBoundary (WS-8.5 D27).
 * Ako jedan screen crash-uje, ostatak app-a ostaje radni.
 * ErrorBoundary fallback ima retry + home button-e.
 */
const RouteGuard = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary>{children}</ErrorBoundary>
);

/**
 * AnimatedRoutes — wrap oko Routes sa AnimatePresence za cross-route layoutId.
 * WS-8 v8.2 D20: omogućava UserAvatar layoutId morphing između TrainerClients liste
 * i ClientProfile hero-a. Koristi popLayout mode — staro DOM-removed iz layout-a,
 * ali briefly visible za morph animaciju.
 * WS-8.5 D27: svaki Route obavljen sa <RouteGuard> za per-route ErrorBoundary.
 */
const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="popLayout">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<RouteGuard><Login /></RouteGuard>} />
        <Route path="/onboarding" element={<RouteGuard><Onboarding /></RouteGuard>} />
        <Route path="/analysis" element={<RouteGuard><AnalysisReport /></RouteGuard>} />
        <Route path="/home" element={<RouteGuard><Home /></RouteGuard>} />
        <Route path="/gym" element={<RouteGuard><Gym /></RouteGuard>} />
        <Route path="/workout/active" element={<RouteGuard><ActiveWorkout /></RouteGuard>} />
        <Route path="/workout/complete" element={<RouteGuard><PostWorkout /></RouteGuard>} />
        <Route path="/food" element={<RouteGuard><Food /></RouteGuard>} />
        <Route path="/chat" element={<RouteGuard><Chat /></RouteGuard>} />
        <Route path="/profile" element={<RouteGuard><Profile /></RouteGuard>} />
        <Route path="/progress" element={<RouteGuard><Progress /></RouteGuard>} />
        <Route path="/milestones" element={<RouteGuard><Milestones /></RouteGuard>} />
        <Route path="/weekly-check-in" element={<RouteGuard><WeeklyCheckIn /></RouteGuard>} />
        {/* Trainer routes */}
        <Route path="/trainer" element={<RouteGuard><TrainerDashboard /></RouteGuard>} />
        <Route path="/trainer/clients" element={<RouteGuard><TrainerClients /></RouteGuard>} />
        <Route path="/trainer/client/add" element={<RouteGuard><AddClient /></RouteGuard>} />
        <Route path="/trainer/client/:id" element={<RouteGuard><ClientProfile /></RouteGuard>} />
        <Route path="/trainer/training" element={<RouteGuard><TrainerTraining /></RouteGuard>} />
        <Route path="/trainer/exercise/:id" element={<RouteGuard><ExerciseDetail /></RouteGuard>} />
        <Route path="/trainer/exercise/new" element={<RouteGuard><ExerciseDetail /></RouteGuard>} />
        <Route path="/trainer/workout/:id" element={<RouteGuard><WorkoutEditor /></RouteGuard>} />
        <Route path="/trainer/workout/new" element={<RouteGuard><WorkoutEditor /></RouteGuard>} />
        <Route path="/trainer/program/:id" element={<RouteGuard><ProgramEditor /></RouteGuard>} />
        <Route path="/trainer/program/new" element={<RouteGuard><ProgramEditor /></RouteGuard>} />
        <Route path="/trainer/program/:id/assign" element={<RouteGuard><AssignProgram /></RouteGuard>} />
        {/* Nutrition routes */}
        <Route path="/trainer/nutrition" element={<RouteGuard><TrainerNutrition /></RouteGuard>} />
        <Route path="/trainer/nutrition-template/:id" element={<RouteGuard><NutritionTemplateEditor /></RouteGuard>} />
        <Route path="/trainer/nutrition-template/new" element={<RouteGuard><NutritionTemplateEditor /></RouteGuard>} />
        <Route path="/trainer/client/:id/meal-picker" element={<RouteGuard><MealPicker /></RouteGuard>} />
        <Route path="/trainer/messages" element={<RouteGuard><TrainerMessages /></RouteGuard>} />
        <Route path="/trainer/analytics" element={<RouteGuard><TrainerAnalytics /></RouteGuard>} />
        <Route path="/trainer/payments" element={<RouteGuard><TrainerPayments /></RouteGuard>} />
        <Route path="/trainer/profile" element={<RouteGuard><TrainerProfile /></RouteGuard>} />
        <Route path="/trainer/packages" element={<RouteGuard><TrainerPackages /></RouteGuard>} />
        <Route path="/trainer/package/:id" element={<RouteGuard><PackageEditor /></RouteGuard>} />
        <Route path="/trainer/package/new" element={<RouteGuard><PackageEditor /></RouteGuard>} />
        <Route path="/trainer/free-trial" element={<RouteGuard><TrainerFreeTrial /></RouteGuard>} />
        <Route path="/subscription" element={<RouteGuard><Subscription /></RouteGuard>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
      <AuthProvider>
      <HealthProvider>
      <TooltipProvider>
        <Toaster position="top-center" richColors closeButton />
        <BrowserRouter>
          <ScrollManager />
          <SkipToContent />
          <div className="max-w-lg mx-auto min-h-screen relative">
            <main id="main-content" tabIndex={-1} className="outline-none">
            <Suspense fallback={<RouteFallback />}>
              <AnimatedRoutes />
            </Suspense>
            </main>
            <BottomNav />
            <TrainerBottomNav />
          </div>
        </BrowserRouter>
      </TooltipProvider>
      </HealthProvider>
      </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
