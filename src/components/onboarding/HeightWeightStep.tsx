import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { IOS_SWITCH } from "@/lib/design-tokens";
import ScrollWheelPicker from "./ScrollWheelPicker";

interface HeightWeightStepProps {
  height: string;
  weight: string;
  onHeightChange: (h: string) => void;
  onWeightChange: (w: string) => void;
}

const HeightWeightStep = ({
  height,
  weight,
  onHeightChange,
  onWeightChange,
}: HeightWeightStepProps) => {
  const { t } = useLanguage();
  const [isMetric, setIsMetric] = useState(true);

  // Metric values
  const heights = useMemo(
    () => Array.from({ length: 81 }, (_, i) => `${140 + i}`), // 140-220 cm
    []
  );
  const weights = useMemo(
    () => Array.from({ length: 121 }, (_, i) => `${40 + i}`), // 40-160 kg
    []
  );

  // Imperial values
  const feet = useMemo(() => Array.from({ length: 5 }, (_, i) => `${3 + i} ft`), []);
  const inches = useMemo(() => Array.from({ length: 12 }, (_, i) => `${i} in`), []);
  const lbs = useMemo(
    () => Array.from({ length: 261 }, (_, i) => `${80 + i} lb`), // 80-340 lb
    []
  );

  // Parse current values
  const heightIdx = useMemo(() => {
    if (!height) return 25; // default ~165cm
    const val = parseInt(height, 10);
    return Math.max(0, Math.min(val - 140, heights.length - 1));
  }, [height, heights.length]);

  const weightIdx = useMemo(() => {
    if (!weight) return 20; // default ~60kg
    const val = parseInt(weight, 10);
    return Math.max(0, Math.min(val - 40, weights.length - 1));
  }, [weight, weights.length]);

  const [feetIdx, setFeetIdx] = useState(2); // 5ft
  const [inchesIdx, setInchesIdx] = useState(6); // 6in
  const [lbsIdx, setLbsIdx] = useState(40); // 120lb

  return (
    <div className="space-y-8 pt-4">
      {/* Imperial / Metric toggle */}
      <div className="flex items-center justify-center gap-4">
        <span
          className={`text-subhead font-semibold transition-colors ${
            !isMetric ? "text-foreground" : "text-muted-foreground/50"
          }`}
        >
          Imperial
        </span>
        <button
          onClick={() => setIsMetric(!isMetric)}
          className={`relative ${IOS_SWITCH.track} rounded-full transition-colors duration-fast ${
            isMetric ? "bg-primary" : "bg-muted-foreground/30"
          }`}
        >
          <div
            className={`absolute top-[2px] ${IOS_SWITCH.thumb} rounded-full bg-white shadow-md transition-transform duration-fast ${
              isMetric ? "translate-x-[22px]" : "translate-x-[2px]"
            }`}
          />
        </button>
        <span
          className={`text-subhead font-semibold transition-colors ${
            isMetric ? "text-foreground" : "text-muted-foreground/50"
          }`}
        >
          Metric
        </span>
      </div>

      {/* Labels */}
      <div className={`grid ${isMetric ? "grid-cols-2" : "grid-cols-3"} gap-2 max-w-[340px] mx-auto`}>
        <div className={`text-center ${!isMetric ? "col-span-2" : ""}`}>
          <span className="text-subhead font-semibold text-foreground">
            {t("onboarding.height") || (isMetric ? "Height" : "Height")}
          </span>
        </div>
        <div className="text-center">
          <span className="text-subhead font-semibold text-foreground">
            {t("onboarding.weight") || (isMetric ? "Weight" : "Weight")}
          </span>
        </div>
      </div>

      {/* Pickers */}
      <div className={`grid ${isMetric ? "grid-cols-2" : "grid-cols-3"} gap-2 max-w-[340px] mx-auto`}>
        {isMetric ? (
          <>
            {/* Height cm */}
            <ScrollWheelPicker
              items={heights.map((h) => `${h} cm`)}
              selectedIndex={heightIdx}
              onSelect={(i) => onHeightChange(String(140 + i))}
            />
            {/* Weight kg */}
            <ScrollWheelPicker
              items={weights.map((w) => `${w} kg`)}
              selectedIndex={weightIdx}
              onSelect={(i) => onWeightChange(String(40 + i))}
            />
          </>
        ) : (
          <>
            {/* Feet */}
            <ScrollWheelPicker
              items={feet}
              selectedIndex={feetIdx}
              onSelect={setFeetIdx}
            />
            {/* Inches */}
            <ScrollWheelPicker
              items={inches}
              selectedIndex={inchesIdx}
              onSelect={setInchesIdx}
            />
            {/* Pounds */}
            <ScrollWheelPicker
              items={lbs}
              selectedIndex={lbsIdx}
              onSelect={setLbsIdx}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default HeightWeightStep;
