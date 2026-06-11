import { motion } from "framer-motion";
import { Check, Pencil } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHaptic } from "@/hooks/useHaptic";
import { PrivacyBadge } from "@/components/ui/privacy-badge";

// Lični podaci — sub-page izdvojen iz Profile.tsx (verbatim JSX, state ostaje u Profile)
export interface PersonalDetails {
  goalWeight: number | "";
  currentWeight: number | "";
  height: number | "";
  dateOfBirth: string;
  gender: string;
  dailyStepGoal: number;
}

interface PersonalDetailsPageProps {
  personalDetails: PersonalDetails;
  setPersonalDetails: React.Dispatch<React.SetStateAction<PersonalDetails>>;
  editingField: string | null;
  setEditingField: (field: string | null) => void;
  editValue: string;
  setEditValue: (value: string) => void;
  persistProfileField: (key: string, value: number | string) => Promise<void>;
}

const PersonalDetailsPage = ({
  personalDetails, setPersonalDetails,
  editingField, setEditingField,
  editValue, setEditValue,
  persistProfileField,
}: PersonalDetailsPageProps) => {
  const { language, t } = useLanguage();
  const haptic = useHaptic();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-title-2 text-foreground mb-2 text-center">{t("profile.personalDetails")}</h2>
      <div className="flex justify-center mb-6">
        <PrivacyBadge variant="compact" />
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        {([
          { key: "currentWeight" as const, label: t("personal.currentWeight"), value: personalDetails.currentWeight, suffix: "kg", type: "number" as const },
          { key: "height" as const, label: t("personal.height"), value: personalDetails.height, suffix: "cm", type: "number" as const },
          { key: "dateOfBirth" as const, label: t("personal.dateOfBirth"), value: personalDetails.dateOfBirth, suffix: "", type: "text" as const },
          { key: "gender" as const, label: t("personal.gender"), value: personalDetails.gender, suffix: "", type: "select" as const },
          { key: "dailyStepGoal" as const, label: t("personal.dailyStepGoal"), value: personalDetails.dailyStepGoal, suffix: t("personal.steps"), type: "number" as const },
        ] as const).map(({ key, label, value, suffix, type }, i, arr) => {
          const isEditing = editingField === key;
          return (
            <div key={key} className={`flex items-center justify-between px-4 py-4 ios-row-h ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
              <span className="text-body text-foreground">{label}</span>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    {type === "select" ? (
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="bg-muted rounded-lg px-3 py-2 text-body text-foreground font-semibold text-right focus:outline-none focus:ring-2 focus:ring-primary min-h-11"
                      >
                        <option value={t("personal.female")}>{t("personal.female")}</option>
                        <option value={language === "sr" ? "Muški" : "Male"}>{language === "sr" ? "Muški" : "Male"}</option>
                      </select>
                    ) : (
                      <input
                        type={type === "number" ? "number" : "text"}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                        className="bg-muted rounded-lg px-3 py-2 text-body text-foreground font-semibold text-right focus:outline-none focus:ring-2 focus:ring-primary w-24 min-h-11"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const nextVal = type === "number" ? Number(editValue) : editValue;
                            setPersonalDetails(prev => ({ ...prev, [key]: nextVal }));
                            void persistProfileField(key, nextVal);
                            setEditingField(null);
                            haptic("medium");
                          }
                        }}
                      />
                    )}
                    {suffix && <span className="text-footnote text-muted-foreground">{suffix}</span>}
                    <button onClick={() => {
                      const nextVal = type === "number" ? Number(editValue) : editValue;
                      setPersonalDetails(prev => ({ ...prev, [key]: nextVal }));
                      void persistProfileField(key, nextVal);
                      setEditingField(null);
                      haptic("medium");
                    }}
                      className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full bg-primary/10">
                      <Check size={16} className="text-primary" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-body text-foreground font-semibold">{value === "" ? "—" : value} {value !== "" && suffix}</span>
                    <button onClick={() => { setEditingField(key); setEditValue(String(value)); }}
                      className="text-muted-foreground/50 min-w-[32px] min-h-[32px] flex items-center justify-center">
                      <Pencil size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default PersonalDetailsPage;
