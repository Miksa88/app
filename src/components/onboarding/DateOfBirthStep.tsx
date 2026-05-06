import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import ScrollWheelPicker from "./ScrollWheelPicker";

interface DateOfBirthStepProps {
  dob: string; // YYYY-MM-DD
  onDobChange: (dob: string) => void;
}

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHS_SR = [
  "Januar", "Februar", "Mart", "April", "Maj", "Jun",
  "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
];

const DateOfBirthStep = ({ dob, onDobChange }: DateOfBirthStepProps) => {
  const { language } = useLanguage();
  const months = language === "sr" ? MONTHS_SR : MONTHS_EN;

  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: 80 }, (_, i) => String(currentYear - 10 - i)),
    [currentYear]
  );
  const days = useMemo(
    () => Array.from({ length: 31 }, (_, i) => String(i + 1)),
    []
  );

  // Parse existing dob or defaults
  const parsed = useMemo(() => {
    if (dob) {
      const [y, m, d] = dob.split("-");
      return {
        monthIdx: parseInt(m, 10) - 1,
        dayIdx: parseInt(d, 10) - 1,
        yearIdx: years.indexOf(y),
      };
    }
    return { monthIdx: 4, dayIdx: 0, yearIdx: 15 }; // defaults
  }, [dob, years]);

  const [monthIdx, setMonthIdx] = useState(parsed.monthIdx);
  const [dayIdx, setDayIdx] = useState(parsed.dayIdx);
  const [yearIdx, setYearIdx] = useState(parsed.yearIdx < 0 ? 15 : parsed.yearIdx);

  const updateDob = (mIdx: number, dIdx: number, yIdx: number) => {
    const month = String(mIdx + 1).padStart(2, "0");
    const day = String(dIdx + 1).padStart(2, "0");
    const year = years[yIdx] || String(currentYear - 25);
    onDobChange(`${year}-${month}-${day}`);
  };

  return (
    <div className="flex items-center justify-center pt-8">
      <div className="grid grid-cols-3 gap-2 w-full max-w-[340px]">
        {/* Month */}
        <div className="text-center">
          <ScrollWheelPicker
            items={months}
            selectedIndex={monthIdx}
            onSelect={(i) => {
              setMonthIdx(i);
              updateDob(i, dayIdx, yearIdx);
            }}
          />
        </div>

        {/* Day */}
        <div className="text-center">
          <ScrollWheelPicker
            items={days}
            selectedIndex={dayIdx}
            onSelect={(i) => {
              setDayIdx(i);
              updateDob(monthIdx, i, yearIdx);
            }}
          />
        </div>

        {/* Year */}
        <div className="text-center">
          <ScrollWheelPicker
            items={years}
            selectedIndex={yearIdx}
            onSelect={(i) => {
              setYearIdx(i);
              updateDob(monthIdx, dayIdx, i);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DateOfBirthStep;
