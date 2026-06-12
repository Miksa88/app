import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, TAP_SCALE, MOTION_EASE } from "@/lib/motion";
import { PageHeader } from "@/components/PageHeader";
import { PageTitle } from "@/components/PageTitle";
import { MotionButton } from "@/components/ui/motion-button";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import { Input } from "@/components/ui/input";
import { inviteClient } from "@/services/clientInvitationService";

const GOAL_OPTIONS = [
  "addClient.goalWeightLoss",
  "addClient.goalMuscleMass",
  "addClient.goalStrength",
  "addClient.goalEndurance",
  "addClient.goalFlexibility",
  "addClient.goalGlutes",
  "addClient.goalGeneralFitness",
];

const JOB_TYPES = ["addClient.jobOffice", "addClient.jobActive", "addClient.jobStudent", "addClient.jobMixed"];
const SCHEDULES = ["addClient.scheduleMorning", "addClient.scheduleAfternoon", "addClient.scheduleNight", "addClient.scheduleFlexible"];

const AddClient = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { markChanged, guardNavigation, showDialog, confirmLeave, cancelLeave } = useUnsavedChanges();

  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    weight: "", height: "", dateOfBirth: "",
    goals: [] as string[],
    injuries: "", allergies: "", foodDislikes: "",
    jobType: "", workSchedule: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    markChanged();
  };

  const toggleGoal = (goal: string) => {
    setForm(prev => ({
      ...prev,
      goals: prev.goals.includes(goal) ? prev.goals.filter(g => g !== goal) : [...prev.goals, goal],
    }));
    markChanged();
  };

  const validate = () => {
    const newErrors: Record<string, boolean> = {};
    if (!form.name.trim()) newErrors.name = true;
    if (!form.email.trim() || !form.email.includes("@")) newErrors.email = true;
    if (!form.weight.trim()) newErrors.weight = true;
    if (!form.height.trim()) newErrors.height = true;
    if (!form.dateOfBirth.trim()) newErrors.dateOfBirth = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      const [firstName, ...rest] = form.name.trim().split(/\s+/);
      const lastName = rest.join(" ") || null;
      const splitList = (v: string) =>
        v.split(",").map(s => s.trim()).filter(Boolean);
      await inviteClient({
        email: form.email.trim().toLowerCase(),
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        height: form.height ? Number(form.height) : undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        primaryGoal: form.goals[0] || undefined,
        jobType: form.jobType || undefined,
        workSchedule: form.workSchedule || undefined,
        injuries: form.injuries ? splitList(form.injuries) : undefined,
        allergies: form.allergies ? splitList(form.allergies) : undefined,
        foodDislikes: form.foodDislikes ? splitList(form.foodDislikes) : undefined,
      });
      toast({ title: `${t("addClient.saved")} ✓` });
      navigate("/trainer");
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : t("trainer.inviteFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = (field: string) =>
    errors[field] ? "ring-2 ring-destructive" : "";

  return (
    <div className="min-h-screen bg-background-secondary pb-24">
      <PageHeader
        title={t("addClient.title")}
        onBack={() => guardNavigation(() => navigate(-1))}
        backLabel={t("clients.title")}
      />

      {/* PageHeader ne renderuje naslov (2026-04-23 policy) — vidljivi H1 ide ovde */}
      <PageTitle title={t("addClient.title")} compact />

      <div className="px-5 space-y-4 pt-3">
        {/* Basic info */}
        <motion.div {...fadeUp(0)} className="space-y-3">
          <div>
            <label className="text-caption-1 text-muted-foreground mb-1 block">{t("addClient.name")} *</label>
            <Input value={form.name} onChange={e => handleChange("name", e.target.value)} placeholder={t("addClient.namePlaceholder")} className={inputClass("name")} />
            {errors.name && <p className="text-caption-2 text-destructive mt-1">{t("addClient.nameRequired")}</p>}
          </div>
          <div>
            <label className="text-caption-1 text-muted-foreground mb-1 block">{t("addClient.email")} *</label>
            <Input type="email" value={form.email} onChange={e => handleChange("email", e.target.value)} placeholder="email@example.com" className={inputClass("email")} />
            {errors.email && <p className="text-caption-2 text-destructive mt-1">{t("addClient.emailRequired")}</p>}
          </div>
          <div>
            <label className="text-caption-1 text-muted-foreground mb-1 block">{t("addClient.phone")}</label>
            <Input value={form.phone} onChange={e => handleChange("phone", e.target.value)} placeholder="+381..." className={inputClass("phone")} />
          </div>
        </motion.div>

        {/* Physical data */}
        <motion.div {...fadeUp(0.05)} className="space-y-3">
          <h3 className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide">{t("addClient.physicalData")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-caption-1 text-muted-foreground mb-1 block">{t("addClient.weight")} *</label>
              <Input type="number" value={form.weight} onChange={e => handleChange("weight", e.target.value)} placeholder="65" className={inputClass("weight")} />
              {errors.weight && <p className="text-caption-2 text-destructive mt-1">{t("addClient.required")}</p>}
            </div>
            <div>
              <label className="text-caption-1 text-muted-foreground mb-1 block">{t("addClient.height")} *</label>
              <Input type="number" value={form.height} onChange={e => handleChange("height", e.target.value)} placeholder="170" className={inputClass("height")} />
              {errors.height && <p className="text-caption-2 text-destructive mt-1">{t("addClient.required")}</p>}
            </div>
          </div>
          <div>
            <label className="text-caption-1 text-muted-foreground mb-1 block">{t("addClient.dateOfBirth")} *</label>
            <Input type="date" value={form.dateOfBirth} onChange={e => handleChange("dateOfBirth", e.target.value)} className={inputClass("dateOfBirth")} />
            {errors.dateOfBirth && <p className="text-caption-2 text-destructive mt-1">{t("addClient.required")}</p>}
          </div>
        </motion.div>

        {/* Goals */}
        <motion.div {...fadeUp(0.1)}>
          <h3 className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("addClient.goals")}</h3>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map(g => (
              <button key={g} onClick={() => toggleGoal(g)}
                className={`px-4 py-3 rounded-full text-footnote min-h-11 transition-colors ${
                  form.goals.includes(g) ? "gradient-primary text-primary-foreground font-semibold" : "bg-card card-shadow text-foreground"
                }`}>
                {t(g)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Health */}
        <motion.div {...fadeUp(0.15)} className="space-y-3">
          <h3 className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide">{t("addClient.healthSection")}</h3>
          <div>
            <label className="text-caption-1 text-muted-foreground mb-1 block">{t("addClient.injuries")}</label>
            <Input value={form.injuries} onChange={e => handleChange("injuries", e.target.value)} placeholder={t("addClient.injuriesPlaceholder")} className={inputClass("injuries")} />
          </div>
          <div>
            <label className="text-caption-1 text-muted-foreground mb-1 block">{t("addClient.allergies")}</label>
            <Input value={form.allergies} onChange={e => handleChange("allergies", e.target.value)} placeholder={t("addClient.allergiesPlaceholder")} className={inputClass("allergies")} />
          </div>
          <div>
            <label className="text-caption-1 text-muted-foreground mb-1 block">{t("addClient.foodDislikes")}</label>
            <Input value={form.foodDislikes} onChange={e => handleChange("foodDislikes", e.target.value)} placeholder={t("addClient.foodDislikesPlaceholder")} className={inputClass("foodDislikes")} />
          </div>
        </motion.div>

        {/* Lifestyle */}
        <motion.div {...fadeUp(0.2)} className="space-y-3">
          <h3 className="text-footnote font-semibold text-muted-foreground uppercase tracking-wide">{t("addClient.lifestyleSection")}</h3>
          <div>
            <label className="text-caption-1 text-muted-foreground mb-1 block">{t("addClient.jobType")}</label>
            <div className="relative">
              <select value={form.jobType} onChange={e => handleChange("jobType", e.target.value)}
                className="w-full bg-card text-foreground rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary/30 card-shadow appearance-none">
                <option value="">{t("addClient.selectOption")}</option>
                {JOB_TYPES.map(j => <option key={j} value={j}>{t(j)}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-caption-1 text-muted-foreground mb-1 block">{t("addClient.workSchedule")}</label>
            <div className="relative">
              <select value={form.workSchedule} onChange={e => handleChange("workSchedule", e.target.value)}
                className="w-full bg-card text-foreground rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary/30 card-shadow appearance-none">
                <option value="">{t("addClient.selectOption")}</option>
                {SCHEDULES.map(s => <option key={s} value={s}>{t(s)}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </motion.div>

        {/* Save button */}
        <MotionButton
          {...fadeUp(0.25)}
          variant="cta"
          size="xl"
          disabled={isSaving}
          onClick={handleSave}
          aria-busy={isSaving}
        >
          {isSaving ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: MOTION_EASE.linear }}
              className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : (
            t("addClient.save")
          )}
        </MotionButton>
      </div>

      <UnsavedChangesDialog open={showDialog} onStay={cancelLeave} onLeave={confirmLeave} />
    </div>
  );
};

export default AddClient;
