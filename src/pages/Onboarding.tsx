import { useState, useCallback } from "react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Info, X } from "lucide-react";
import GradientButton from "@/components/GradientButton";
import { useLanguage } from "@/contexts/LanguageContext";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { shouldReduceMotion, MOTION_DURATION, MOTION_EASE } from "@/lib/motion";
import ProcessingScreen from "@/components/onboarding/ProcessingScreen";
import SignUpSheet from "@/components/onboarding/SignUpSheet";
import PaywallScreen from "@/components/onboarding/PaywallScreen";
import PermissionsScreen from "@/components/onboarding/PermissionsScreen";
import WelcomeScreen from "@/components/onboarding/WelcomeScreen";
import DateOfBirthStep from "@/components/onboarding/DateOfBirthStep";
import HeightWeightStep from "@/components/onboarding/HeightWeightStep";
import GoalStep from "@/components/onboarding/GoalStep";
import MetabolicStep from "@/components/onboarding/MetabolicStep";
import AllergiesStep from "@/components/onboarding/AllergiesStep";
import LimitationsStep from "@/components/onboarding/LimitationsStep";
import SleepStep from "@/components/onboarding/SleepStep";
import StressStep from "@/components/onboarding/StressStep";
import ExperienceStep from "@/components/onboarding/ExperienceStep";
import FrequencyStep from "@/components/onboarding/FrequencyStep";
import CycleTrackerStep from "@/components/onboarding/CycleTrackerStep";

type Phase = "quiz" | "processing" | "signup" | "paywall" | "permissions" | "welcome";

interface StepConfig {
  title: string;
  subtitle: string;
  required: boolean;
  whyWeAsk: string;
}

const Onboarding = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [phase, setPhase] = useState<Phase>("quiz");
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showWhyWeAsk, setShowWhyWeAsk] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [metabolicProfile, setMetabolicProfile] = useState<string[]>([]);
  const [foodAllergies, setFoodAllergies] = useState<string[]>([]);
  const [physicalLimitations, setPhysicalLimitations] = useState<string[]>([]);
  const [sleepQuality, setSleepQuality] = useState(0);
  const [stressLevel, setStressLevel] = useState(0);
  const [trainingExperience, setTrainingExperience] = useState("");
  const [workoutFrequency, setWorkoutFrequency] = useState(0);
  // Cycle Tracker (Spec 02 Sekcija 2.2 — POSLEDNJI korak)
  const [cycleTrackingEnabled, setCycleTrackingEnabled] = useState(false);
  const [lastPeriodStart, setLastPeriodStart] = useState("");

  const STEPS: StepConfig[] = [
    { title: t("onboarding.step1Title"), subtitle: t("onboarding.step1Sub"), required: true, whyWeAsk: t("onboarding.why.name") },
    { title: t("onboarding.step2Title"), subtitle: t("onboarding.step2Sub"), required: true, whyWeAsk: t("onboarding.why.age") },
    { title: t("onboarding.stepMetricsTitle"), subtitle: t("onboarding.stepMetricsSub"), required: true, whyWeAsk: t("onboarding.why.metrics") },
    { title: t("onboarding.stepGoalTitle"), subtitle: t("onboarding.stepGoalSub"), required: true, whyWeAsk: t("onboarding.why.goal") },
    { title: t("onboarding.stepMetabolicTitle"), subtitle: t("onboarding.stepMetabolicSub"), required: false, whyWeAsk: t("onboarding.why.metabolic") },
    { title: t("onboarding.stepAllergiesTitle"), subtitle: t("onboarding.stepAllergiesSub"), required: false, whyWeAsk: t("onboarding.why.allergies") },
    { title: t("onboarding.stepLimitationsTitle"), subtitle: t("onboarding.stepLimitationsSub"), required: true, whyWeAsk: t("onboarding.why.limitations") },
    { title: t("onboarding.stepSleepTitle"), subtitle: t("onboarding.stepSleepSub"), required: false, whyWeAsk: t("onboarding.why.sleep") },
    { title: t("onboarding.stepStressTitle"), subtitle: t("onboarding.stepStressSub"), required: false, whyWeAsk: t("onboarding.why.stress") },
    { title: t("onboarding.stepExperienceTitle"), subtitle: t("onboarding.stepExperienceSub"), required: true, whyWeAsk: t("onboarding.why.experience") },
    { title: t("onboarding.stepFrequencyTitle"), subtitle: t("onboarding.stepFrequencySub"), required: true, whyWeAsk: t("onboarding.why.frequency") },
    // Step 11: Cycle Tracker — POSLEDNJI (Spec 02 Sekcija 2.2)
    {
      title: t("onboarding.stepCycleTitle") !== "onboarding.stepCycleTitle"
        ? t("onboarding.stepCycleTitle")
        : "Praćenje ciklusa",
      subtitle: t("onboarding.stepCycleSub") !== "onboarding.stepCycleSub"
        ? t("onboarding.stepCycleSub")
        : "Hormoni menjaju kako telo procesira hranu i regeneriše se.",
      required: false,
      whyWeAsk: t("onboarding.why.cycle") !== "onboarding.why.cycle"
        ? t("onboarding.why.cycle")
        : "Sa datumom poslednjeg ciklusa, algoritam dodaje +150 kcal carbs u lutealnoj fazi i smanjuje volumen treninga u menstrualnoj — direktno usklađen sa tvojim hormonima.",
    },
  ];

  const TOTAL = STEPS.length;

  // Check if current step is complete (for required steps)
  const isStepComplete = useCallback((): boolean => {
    const current = STEPS[step];
    if (!current.required) return true; // optional steps always allow continue

    switch (step) {
      case 0: return firstName.trim().length > 0;
      case 1: return dob.length > 0;
      case 2: return height.length > 0 && weight.length > 0;
      case 3: return primaryGoal.length > 0;
      case 6: return physicalLimitations.length > 0 || physicalLimitations.length === 0; // "No Pain" is visually selected when empty
      case 9: return trainingExperience.length > 0;
      case 10: return workoutFrequency > 0;
      case 11: return true; // cycle tracker je opcioni
      default: return true;
    }
  }, [step, firstName, dob, height, weight, primaryGoal, physicalLimitations, trainingExperience, workoutFrequency]);

  const isOptional = !STEPS[step]?.required;

  // Step 10 = frequency picker. Pocetnice (beginner) imaju FIKSNIH 3 dana
  // (Spec 01 §3 + odluka 2026-05-06): nema biranja, korak se preskace.
  const FREQUENCY_STEP_INDEX = 10;
  const shouldSkipFrequency = trainingExperience === 'beginner';

  const next = () => {
    setDirection(1);
    let nextStep = step + 1;
    if (nextStep === FREQUENCY_STEP_INDEX && shouldSkipFrequency) {
      if (workoutFrequency !== 3) setWorkoutFrequency(3);
      nextStep = FREQUENCY_STEP_INDEX + 1;
    }
    if (nextStep < TOTAL) setStep(nextStep);
    else setPhase("processing");
  };

  const back = () => {
    setDirection(-1);
    let prevStep = step - 1;
    if (prevStep === FREQUENCY_STEP_INDEX && shouldSkipFrequency) {
      prevStep = FREQUENCY_STEP_INDEX - 1;
    }
    if (prevStep >= 0) setStep(prevStep);
    else navigate("/");
  };

  const progress = ((step + 1) / TOTAL) * 100;

  // WS-8 v8.2 D16 — reduced-motion respect: statički fade umesto slide
  const reduce = shouldReduceMotion();
  const slideVariants = reduce
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
      };

  const inputClass =
    "w-full bg-transparent text-foreground placeholder:text-muted-foreground px-4 py-4 text-body focus:outline-none min-h-11";

  const toggleMultiSelect = (list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (item === "none") {
      setter(["none"]);
    } else {
      setter(prev => {
        const without = prev.filter(i => i !== "none");
        return without.includes(item) ? without.filter(i => i !== item) : [...without, item];
      });
    }
  };

  // Phase rendering
  if (phase === "processing") {
    return <ProcessingScreen firstName={firstName} onComplete={() => setPhase("signup")} />;
  }
  if (phase === "signup") {
    return <SignUpSheet onComplete={() => navigate("/analysis", {
      state: {
        firstName, lastName, weight, height,
        age: dob, dateOfBirth: dob,
        stressLevel,
        experience: trainingExperience,
        limitations: physicalLimitations,
        injuries: physicalLimitations,
        metabolicProfile,
        allergies: foodAllergies,
        sleepQuality,
        frequency: workoutFrequency,
        goal: primaryGoal,
        // Cycle Tracker (Spec 02 Sekcija 2.2)
        cycleTrackingEnabled,
        lastPeriodStart: cycleTrackingEnabled ? lastPeriodStart : undefined,
      }
    })} onBack={() => setPhase("processing")} />;
  }
  if (phase === "paywall") {
    return <PaywallScreen onComplete={() => setPhase("permissions")} onBack={() => setPhase("signup")} />;
  }
  if (phase === "permissions") {
    return <PermissionsScreen onComplete={() => setPhase("welcome")} />;
  }
  if (phase === "welcome") {
    return <WelcomeScreen firstName={firstName} onComplete={() => navigate("/home")} />;
  }

  // Quiz phase
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header — fixed position */}
      <div className="px-5 pt-14 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <button onClick={back} className="min-w-11 min-h-11 flex items-center justify-center -ml-2">
            <ArrowLeft size={ICON_SIZE.lg} className="text-foreground" />
          </button>
          <span className="text-caption-1 text-muted-foreground">
            {step + 1} {t("onboarding.of")} {TOTAL}
          </span>
          {isOptional ? (
            <button onClick={next} className="text-subhead text-muted-foreground min-w-11 min-h-11 flex items-center justify-end">
              {t("onboarding.skip")}
            </button>
          ) : (
            <div className="min-w-11" />
          )}
        </div>

        {/* Ultra-thin progress bar */}
        <div className="w-full h-[2px] bg-muted rounded-full overflow-hidden mb-6">
          <motion.div
            className="h-full gradient-primary rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE.easeOut }}
          />
        </div>

        {/* Title + Why we ask */}
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: MOTION_DURATION.base }}>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <h1 className="text-title-1 text-foreground">{STEPS[step].title}</h1>
              <p className="text-subhead text-muted-foreground mt-1">{STEPS[step].subtitle}</p>
            </div>
            <button
              onClick={() => setShowWhyWeAsk(true)}
              className="min-w-[36px] min-h-11 flex items-center justify-center mt-0.5"
            >
              <Info size={ICON_SIZE.md} className="text-muted-foreground/60" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Content — scrollable middle area with fixed spacing */}
      <div className="flex-1 px-5 pt-6 pb-6 overflow-y-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduce ? 0.01 : 0.3, ease: MOTION_EASE.easeInOut }}
          >
            {/* Step 0: Name */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="bg-card rounded-xl card-shadow overflow-hidden">
                  <label htmlFor="onboarding-firstname" className="sr-only">{t("onboarding.firstNamePlaceholder")}</label>
                  <input
                    id="onboarding-firstname"
                    type="text"
                    autoComplete="given-name"
                    placeholder={t("onboarding.firstNamePlaceholder")}
                    aria-label={t("onboarding.firstNamePlaceholder")}
                    aria-required="true"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClass}
                    autoFocus
                  />
                  <div className="separator-ios ml-4" />
                  <label htmlFor="onboarding-lastname" className="sr-only">{t("onboarding.lastNamePlaceholder")}</label>
                  <input
                    id="onboarding-lastname"
                    type="text"
                    autoComplete="family-name"
                    placeholder={t("onboarding.lastNamePlaceholder")}
                    aria-label={t("onboarding.lastNamePlaceholder")}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* Step 1: DOB */}
            {step === 1 && <DateOfBirthStep dob={dob} onDobChange={setDob} />}

            {/* Step 2: Height & Weight */}
            {step === 2 && (
              <HeightWeightStep height={height} weight={weight} onHeightChange={setHeight} onWeightChange={setWeight} />
            )}

            {/* Step 3: Primary Goal */}
            {step === 3 && <GoalStep selected={primaryGoal} onSelect={setPrimaryGoal} />}

            {/* Step 4: Metabolic Profile */}
            {step === 4 && (
              <MetabolicStep
                selected={metabolicProfile}
                onToggle={(item) => toggleMultiSelect(metabolicProfile, setMetabolicProfile, item)}
              />
            )}

            {/* Step 5: Food Allergies */}
            {step === 5 && (
              <AllergiesStep
                selected={foodAllergies}
                onToggle={(item) => toggleMultiSelect(foodAllergies, setFoodAllergies, item)}
              />
            )}

            {/* Step 6: Physical Limitations */}
            {step === 6 && (
              <LimitationsStep
                selected={physicalLimitations}
                onToggle={(item) => toggleMultiSelect(physicalLimitations, setPhysicalLimitations, item)}
              />
            )}

            {/* Step 7: Sleep Quality */}
            {step === 7 && <SleepStep rating={sleepQuality} onRate={setSleepQuality} />}

            {/* Step 8: Stress Level */}
            {step === 8 && <StressStep level={stressLevel} onLevelChange={setStressLevel} />}

            {/* Step 9: Training Experience */}
            {step === 9 && <ExperienceStep selected={trainingExperience} onSelect={setTrainingExperience} />}

            {/* Step 10: Workout Frequency — conditional branching (Spec 01 Sekcija 3) */}
            {step === 10 && (
              <FrequencyStep
                selected={workoutFrequency}
                onSelect={setWorkoutFrequency}
                experienceLevel={
                  trainingExperience === 'beginner' ? 'beginner'
                  : (trainingExperience === 'intermediate' || trainingExperience === 'advanced') ? 'intermediate'
                  : undefined
                }
              />
            )}

            {/* Step 11: Cycle Tracker — POSLEDNJI (Spec 02 Sekcija 2.2) */}
            {step === 11 && (
              <CycleTrackerStep
                enabled={cycleTrackingEnabled}
                lastPeriodStart={lastPeriodStart}
                onEnabledChange={setCycleTrackingEnabled}
                onDateChange={setLastPeriodStart}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA — fixed with consistent spacing */}
      <div className="shrink-0 px-5 pb-10 pt-6 bg-background">
        <div className="max-w-lg mx-auto">
          <GradientButton
            onClick={next}
            className="w-full"
            size="lg"
            disabled={STEPS[step]?.required && !isStepComplete()}
          >
            <span className="flex items-center justify-center gap-2">
              {step === TOTAL - 1 ? t("onboarding.finish") : t("onboarding.continue")}
              <ArrowRight size={ICON_SIZE.md} aria-hidden="true" />
            </span>
          </GradientButton>
          {STEPS[step]?.required && !isStepComplete() && (
            <p
              role="status"
              aria-live="polite"
              className="text-caption-1 text-muted-foreground text-center mt-3"
            >
              {t("onboarding.fillToContinue")}
            </p>
          )}
        </div>
      </div>

      {/* Why we ask popup */}
      <BottomSheet
        open={showWhyWeAsk}
        onOpenChange={setShowWhyWeAsk}
        title={t("onboarding.whyWeAskTitle")}
      >
        <p className="text-subhead text-muted-foreground leading-relaxed pb-2">
          {STEPS[step]?.whyWeAsk}
        </p>
      </BottomSheet>
    </div>
  );
};

export default Onboarding;
