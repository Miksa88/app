// ============================================================================
// PackageEditor — kreiranje/editovanje tier paketa (Faza D, bez billing)
// ============================================================================

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, TAP_SCALE } from "@/lib/motion";
import { Sparkles, Crown, Zap, Trash2, Check } from "lucide-react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { PageHeader } from "@/components/PageHeader";
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  archivePackage,
  unarchivePackage,
  createPackage,
  getPackageById,
  updatePackage,
  type PackageFeatures,
  type PackageRecord,
  type PackageTargetExperience,
  type PackageTier,
} from "@/services/packageService";
import { toast } from "sonner";

const TIER_OPTIONS: Array<{
  value: PackageTier;
  icon: typeof Sparkles;
  bg: string;
  color: string;
}> = [
  { value: "entry", icon: Zap, bg: "bg-info/10", color: "text-info" },
  { value: "mid", icon: Sparkles, bg: "bg-primary/10", color: "text-primary" },
  { value: "high", icon: Crown, bg: "bg-warning/15", color: "text-warning" },
];

const inputClass =
  "w-full bg-card text-foreground rounded-xl px-4 py-3 text-body card-shadow focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-12";

const PackageEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { clientId } = useAuth();

  const isNew = !id || id === "new";
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<PackageRecord | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tier, setTier] = useState<PackageTier>("entry");
  const [defaultFrequency, setDefaultFrequency] = useState<string>("");
  const [targetExperience, setTargetExperience] = useState<PackageTargetExperience>("any");
  const [priceAmount, setPriceAmount] = useState<string>("");
  const [priceCurrency, setPriceCurrency] = useState<string>("EUR");
  const [durationDays, setDurationDays] = useState<string>("30");

  const [features, setFeatures] = useState<PackageFeatures>({
    trainingProgram: true,
    nutritionPlan: true,
    weeklyCheckins: true,
    directMessaging: false,
    progressPhotos: false,
    metricsTracking: true,
    videoCalls: false,
    videoCallFrequency: 0,
  });

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    void (async () => {
      try {
        const pkg = await getPackageById(id);
        if (cancelled || !pkg) return;
        setExisting(pkg);
        setName(pkg.name);
        setDescription(pkg.description ?? "");
        setTier(pkg.tier);
        setDefaultFrequency(
          pkg.defaultWorkoutFrequency ? String(pkg.defaultWorkoutFrequency) : "",
        );
        setTargetExperience(pkg.targetExperience);
        setFeatures(pkg.features);
        if (pkg.features.priceAmount !== undefined) setPriceAmount(String(pkg.features.priceAmount));
        if (pkg.features.priceCurrency) setPriceCurrency(pkg.features.priceCurrency);
        if (pkg.features.durationDays !== undefined) setDurationDays(String(pkg.features.durationDays));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isNew]);

  const toggleFeature = <K extends keyof PackageFeatures>(key: K) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!clientId || !name.trim()) {
      toast.error(t("packages.nameRequired") ?? "Naziv je obavezan");
      return;
    }
    setSaving(true);
    try {
      const featuresWithPricing: typeof features = {
        ...features,
        priceAmount: priceAmount ? Number(priceAmount) : undefined,
        priceCurrency: priceAmount ? priceCurrency : undefined,
        durationDays: durationDays ? Number(durationDays) : undefined,
      };
      const payload = {
        trainerId: clientId,
        name: name.trim(),
        description: description.trim() || undefined,
        tier,
        features: featuresWithPricing,
        defaultWorkoutFrequency: defaultFrequency ? Number(defaultFrequency) : undefined,
        targetExperience,
      };
      if (isNew) {
        await createPackage(payload);
        toast.success(t("packages.created") ?? "Paket napravljen");
      } else if (existing) {
        await updatePackage(existing.id, payload);
        toast.success(t("packages.saved") ?? "Sačuvano");
      }
      navigate("/trainer/packages");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!existing) return;
    setSaving(true);
    const packageId = existing.id;
    try {
      await archivePackage(packageId);
      // V3 §11: Undo toast — 5s window to un-archive.
      toast(t("packages.archived") ?? "Arhivirano", {
        duration: 5000,
        action: {
          label: t("common.undo"),
          onClick: () => {
            void unarchivePackage(packageId).catch((err) =>
              toast.error(err instanceof Error ? err.message : String(err)),
            );
          },
        },
      });
      navigate("/trainer/packages");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-secondary pb-32">
        <PageHeader onBack={() => navigate(-1)} backLabel={t("packages.title")} />
        <div className="flex flex-col items-center pt-16">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      <PageHeader
        onBack={() => navigate(-1)}
        backLabel={t("packages.title")}
        rightAction={
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="text-primary font-semibold text-body px-3 py-2 min-h-11 disabled:opacity-40"
          >
            {saving ? "..." : t("training.save")}
          </button>
        }
      />

      <PageTitle
        title={isNew ? t("trainerPackages.create") : (existing?.name ?? "")}
        compact
      />

      <div className="px-5 pt-4 space-y-4">
        <motion.div {...fadeUp(0.05)}>
          <p className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Tier
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TIER_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = tier === opt.value;
              return (
                <motion.button
                  key={opt.value}
                  whileTap={{ scale: TAP_SCALE.secondary }}
                  onClick={() => setTier(opt.value)}
                  aria-pressed={isSelected}
                  className={`p-3 rounded-2xl text-center transition ${
                    isSelected
                      ? "gradient-primary text-primary-foreground shadow-fab"
                      : "bg-card card-shadow"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl mx-auto mb-1.5 flex items-center justify-center ${
                    isSelected ? "bg-white/20" : opt.bg
                  }`}>
                    <Icon size={18} className={isSelected ? "text-primary-foreground" : opt.color} aria-hidden="true" />
                  </div>
                  <p className={`text-callout font-semibold ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                    {t(`tier.${opt.value}`)}
                  </p>
                  <p className={`text-caption-2 mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {t(`tier.${opt.value}Desc`)}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.08)}>
          <label className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            {t("packages.fieldName")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("packages.namePlaceholder")}
            className={inputClass}
          />
        </motion.div>

        <motion.div {...fadeUp(0.1)}>
          <label className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            {t("packages.fieldDescription")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t("packages.descriptionPlaceholder")}
            className={`${inputClass} resize-none`}
          />
        </motion.div>

        {/* Pricing & duration — JSONB stored u features (no DB migracija) */}
        <motion.div {...fadeUp(0.11)}>
          <Card className="p-4 space-y-3">
            <p className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider">
              {t("packages.pricingTitle")}
            </p>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-caption-2 text-muted-foreground mb-1 block">
                  {t("packages.priceLabel")}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-caption-2 text-muted-foreground mb-1 block">
                  {t("packages.currencyLabel")}
                </label>
                <div role="radiogroup" aria-label={t("packages.currencyLabel")} className="grid grid-cols-3 gap-1 bg-card rounded-xl p-1 card-shadow">
                  {(["EUR", "RSD", "USD"] as const).map((c) => {
                    const isActive = priceCurrency === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => setPriceCurrency(c)}
                        className={`min-h-11 rounded-lg text-caption-1 font-semibold transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label className="text-caption-2 text-muted-foreground mb-1 block">
                {t("packages.durationLabel")}
              </label>
              <div className="flex gap-2">
                {[
                  { value: "7", label: "7 d" },
                  { value: "30", label: "30 d" },
                  { value: "90", label: "3 m" },
                  { value: "180", label: "6 m" },
                  { value: "365", label: "1 g" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDurationDays(opt.value)}
                    aria-pressed={durationDays === opt.value}
                    className={`flex-1 py-2 rounded-xl text-callout font-semibold min-h-11 ${
                      durationDays === opt.value
                        ? "gradient-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-caption-2 text-muted-foreground/70 mt-1.5">
                {t("packages.durationHint")}
              </p>
            </div>
          </Card>
        </motion.div>

        <motion.div {...fadeUp(0.12)}>
          <Card className="p-4 space-y-3">
            <p className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider">
              Auto-assignment
            </p>

            <div>
              <label className="text-caption-2 text-muted-foreground mb-1 block">
                Default workout frequency
              </label>
              <div className="flex gap-2">
                {["", "3", "4", "5"].map((f) => (
                  <button
                    key={f || "any"}
                    onClick={() => setDefaultFrequency(f)}
                    aria-pressed={defaultFrequency === f}
                    className={`flex-1 py-2 rounded-xl text-callout font-semibold min-h-11 ${
                      defaultFrequency === f
                        ? "gradient-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {f === "" ? "any" : `${f}×`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-caption-2 text-muted-foreground mb-1 block">
                Target experience
              </label>
              <div className="flex gap-2">
                {(["any", "beginner", "intermediate"] as PackageTargetExperience[]).map((te) => (
                  <button
                    key={te}
                    onClick={() => setTargetExperience(te)}
                    aria-pressed={targetExperience === te}
                    className={`flex-1 py-2 rounded-xl text-callout font-semibold min-h-11 ${
                      targetExperience === te
                        ? "gradient-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {te}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div {...fadeUp(0.14)}>
          <Card className="p-4">
            <p className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Features
            </p>
            {([
              { key: "trainingProgram" as const, label: "Training program" },
              { key: "nutritionPlan" as const, label: "Nutrition plan" },
              { key: "weeklyCheckins" as const, label: "Weekly check-ins" },
              { key: "directMessaging" as const, label: "Direct messaging" },
              { key: "progressPhotos" as const, label: "Progress photos" },
              { key: "metricsTracking" as const, label: "Metrics tracking" },
              { key: "videoCalls" as const, label: "Video calls" },
            ]).map(({ key, label }, i, arr) => (
              <button
                key={key}
                onClick={() => toggleFeature(key)}
                role="switch"
                aria-checked={Boolean(features[key])}
                className={`w-full flex items-center justify-between py-3 min-h-12 ${
                  i < arr.length - 1 ? "border-b border-border/50" : ""
                }`}
              >
                <span className="text-body text-foreground">{label}</span>
                <div className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-base shrink-0 ${
                  features[key] ? "bg-primary" : "bg-muted"
                }`} aria-hidden="true">
                  <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                    features[key] ? "translate-x-5" : "translate-x-0"
                  }`} />
                </div>
              </button>
            ))}

            {features.videoCalls && (
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
                <span className="text-caption-1 text-muted-foreground">Sessions/month:</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={features.videoCallFrequency ?? 0}
                  onChange={(e) => setFeatures((prev) => ({
                    ...prev,
                    videoCallFrequency: Number(e.target.value),
                  }))}
                  className="w-20 bg-muted rounded-lg px-3 py-2 text-body text-foreground text-center"
                />
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div {...fadeUp(0.18)} className="pt-4 space-y-2">
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            variant="cta"
            size="xl"
          >
            <Check size={ICON_SIZE.sm} className="mr-2" />
            {saving ? "..." : (isNew ? t("trainerPackages.create") : t("training.save"))}
          </Button>

          {!isNew && existing && (
            <button
              onClick={handleArchive}
              className="w-full py-3 text-destructive text-body min-h-11 flex items-center justify-center gap-2"
            >
              <Trash2 size={ICON_SIZE.sm} aria-hidden="true" />
              Archive
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PackageEditor;
