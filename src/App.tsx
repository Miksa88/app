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
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
const MealPlanPage = lazy(() => import("./pages/MealPlan"));
const ShoppingPage = lazy(() => import("./pages/Shopping"));

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
 * AuthGuard — kombinuje ErrorBoundary + ProtectedRoute.
 * Koristi se za sve rute koje zahtevaju ulogovanog korisnika
 * (sve osim Login i Onboarding).
 */
const AuthGuard = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute>
    <ErrorBoundary>{children}</ErrorBoundary>
  </ProtectedRoute>
);

/**
 * TrainerGuard — kao AuthGuard ali zahteva profile.role = 'trainer'.
 * Klijent koji direktno ukuca /trainer/* URL biće redirected na /home.
 */
const TrainerGuard = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute requireRole="trainer">
    <ErrorBoundary>{children}</ErrorBoundary>
  </ProtectedRoute>
);

/**
 * AnimatedRoutes — wrap oko Routes sa AnimatePresence za page transitions.
 *
 * **Mode policy (Mihajlo, 2026-04-26):**
 * `mode="wait"` — stara stranica izađe potpuno pre nego što se pojavi nova.
 * Razlog promene sa `popLayout` na `wait`:
 *   - `popLayout` je pretvarao izlazeći route u position:absolute, što je
 *     slamalo sticky header (PageHeader) — back dugme padalo bi na dno
 *     ekrana tokom morph faze (vidljivo u ClientProfile → back glitch).
 *   - `layoutId` cross-route morphing (UserAvatar) je nice-to-have ali pravi
 *     vizuelne glitchove na većini ruta. Bolje: konzistentna fade tranzicija
 *     bez morph efekata.
 *
 * Stranice koje žele exit animation: dodaju `exit` varijantu na svoj root
 * motion.div (videti fadeUp() helper u src/lib/motion.ts).
 * WS-8.5 D27: svaki Route obavljen sa <RouteGuard> za per-route ErrorBoundary.
 */
const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<RouteGuard><Login /></RouteGuard>} />
        <Route path="/onboarding" element={<RouteGuard><Onboarding /></RouteGuard>} />
        <Route path="/analysis" element={<RouteGuard><AnalysisReport /></RouteGuard>} />

        {/* Authenticated client routes */}
        <Route path="/home" element={<AuthGuard><Home /></AuthGuard>} />
        <Route path="/gym" element={<AuthGuard><Gym /></AuthGuard>} />
        <Route path="/workout/active" element={<AuthGuard><ActiveWorkout /></AuthGuard>} />
        <Route path="/workout/complete" element={<AuthGuard><PostWorkout /></AuthGuard>} />
        <Route path="/food" element={<AuthGuard><Food /></AuthGuard>} />
        <Route path="/chat" element={<AuthGuard><Chat /></AuthGuard>} />
        <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
        <Route path="/progress" element={<AuthGuard><Progress /></AuthGuard>} />
        <Route path="/milestones" element={<AuthGuard><Milestones /></AuthGuard>} />
        <Route path="/weekly-check-in" element={<AuthGuard><WeeklyCheckIn /></AuthGuard>} />
        <Route path="/meal-plan" element={<AuthGuard><MealPlanPage /></AuthGuard>} />
        <Route path="/shopping" element={<AuthGuard><ShoppingPage /></AuthGuard>} />

        {/* Trainer routes */}
        <Route path="/trainer" element={<TrainerGuard><TrainerDashboard /></TrainerGuard>} />
        <Route path="/trainer/clients" element={<TrainerGuard><TrainerClients /></TrainerGuard>} />
        <Route path="/trainer/client/add" element={<TrainerGuard><AddClient /></TrainerGuard>} />
        <Route path="/trainer/client/:id" element={<TrainerGuard><ClientProfile /></TrainerGuard>} />
        <Route path="/trainer/training" element={<TrainerGuard><TrainerTraining /></TrainerGuard>} />
        <Route path="/trainer/exercise/:id" element={<TrainerGuard><ExerciseDetail /></TrainerGuard>} />
        <Route path="/trainer/exercise/new" element={<TrainerGuard><ExerciseDetail /></TrainerGuard>} />
        <Route path="/trainer/workout/:id" element={<TrainerGuard><WorkoutEditor /></TrainerGuard>} />
        <Route path="/trainer/workout/new" element={<TrainerGuard><WorkoutEditor /></TrainerGuard>} />
        <Route path="/trainer/program/:id" element={<TrainerGuard><ProgramEditor /></TrainerGuard>} />
        <Route path="/trainer/program/new" element={<TrainerGuard><ProgramEditor /></TrainerGuard>} />
        <Route path="/trainer/program/:id/assign" element={<TrainerGuard><AssignProgram /></TrainerGuard>} />
        {/* Nutrition routes */}
        <Route path="/trainer/nutrition" element={<TrainerGuard><TrainerNutrition /></TrainerGuard>} />
        <Route path="/trainer/nutrition-template/:id" element={<TrainerGuard><NutritionTemplateEditor /></TrainerGuard>} />
        <Route path="/trainer/nutrition-template/new" element={<TrainerGuard><NutritionTemplateEditor /></TrainerGuard>} />
        <Route path="/trainer/client/:id/meal-picker" element={<TrainerGuard><MealPicker /></TrainerGuard>} />
        <Route path="/trainer/messages" element={<TrainerGuard><TrainerMessages /></TrainerGuard>} />
        <Route path="/trainer/analytics" element={<TrainerGuard><TrainerAnalytics /></TrainerGuard>} />
        <Route path="/trainer/payments" element={<TrainerGuard><TrainerPayments /></TrainerGuard>} />
        <Route path="/trainer/profile" element={<TrainerGuard><TrainerProfile /></TrainerGuard>} />
        <Route path="/trainer/packages" element={<TrainerGuard><TrainerPackages /></TrainerGuard>} />
        <Route path="/trainer/package/:id" element={<TrainerGuard><PackageEditor /></TrainerGuard>} />
        <Route path="/trainer/package/new" element={<TrainerGuard><PackageEditor /></TrainerGuard>} />
        <Route path="/trainer/free-trial" element={<TrainerGuard><TrainerFreeTrial /></TrainerGuard>} />
        <Route path="/subscription" element={<AuthGuard><Subscription /></AuthGuard>} />
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
