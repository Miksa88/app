import { useNavigate } from "react-router-dom";
import { ICON_SIZE, IOS_SWITCH } from "@/lib/design-tokens";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp , IOS_SPRING} from "@/lib/motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronRight, LogOut, Target, Bell, Palette, Salad, Sun, Moon, Monitor, Check, Crown, Heart, Globe, User, FileText, Shield, Mail, Instagram, Music, Trash2, Scale, Pencil, Flame, Footprints, HeartPulse, Bed, Plane, Ruler, type LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useHealth } from "@/contexts/HealthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfileFields } from "@/services/profileService";
import { ArrowLeft } from "lucide-react";
import { SectionLabel } from "@/components/ui/section-label";
import { PrivacyBadge } from "@/components/ui/privacy-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHaptic } from "@/hooks/useHaptic";
import QuickPauseSheet from "@/components/home/QuickPauseSheet";
import TierBadge from "@/components/profile/TierBadge";
import QuietHoursPicker from "@/components/profile/QuietHoursPicker";
import UnitsPicker from "@/components/profile/UnitsPicker";
import { PageTitle } from "@/components/PageTitle";
import type { PackageTier } from "@/services/packageService";
import {
  useNotificationPreferences,
  useSetNotificationPreferences,
} from "@/hooks/useUserPreferences";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/services/userPreferencesService";
import { useUndoableAction } from "@/hooks/useUndoableAction";

type SettingsPage = null | "goals" | "allergies" | "notifications" | "appearance" | "subscription" | "health" | "language" | "personal" | "weightHistory" | "analysis" | "units";

const Profile = () => {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState<SettingsPage>(null);
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut } = useAuth();
  const haptic = useHaptic();

  const displayName = user?.user_metadata?.first_name
    ? `${user.user_metadata.first_name}${user.user_metadata.last_name ? ` ${user.user_metadata.last_name}` : ""}`
    : user?.email?.split("@")[0].split("+")[0] ?? "";
  const displayEmail = user?.email ?? "";

  const [goals, setGoals] = useState(["Muscle gain", "Glute growth"]);
  const allGoals = ["Muscle gain", "Glute growth", "Fat loss", "Endurance", "Flexibility", "Strength"];
  const goalKeys: Record<string, string> = {
    "Muscle gain": "goals.muscleGain", "Glute growth": "goals.gluteGrowth", "Fat loss": "goals.fatLoss",
    "Endurance": "goals.endurance", "Flexibility": "goals.flexibility", "Strength": "goals.strength"
  };

  const [allergies, setAllergies] = useState(["Lactose free"]);
  const allAllergies = ["Lactose free", "Gluten free", "Vegan", "Vegetarian", "Nut free", "Soy free", "Keto", "Halal"];

  // Notif categories — persistent (V3 §14: workout / meals / chat / system / achievement).
  const { data: notifPrefs = DEFAULT_NOTIFICATION_PREFERENCES } = useNotificationPreferences(user?.id ?? null);
  const setNotifPrefsMutation = useSetNotificationPreferences(user?.id ?? null);
  const notifs = notifPrefs.categories;
  const undoNotif = useUndoableAction();
  const mutateNotif = (next: typeof notifPrefs): Promise<void> =>
    new Promise((resolve, reject) =>
      setNotifPrefsMutation.mutate(next, {
        onSuccess: () => resolve(),
        onError: (e) => reject(e),
      }),
    );
  const toggleNotif = (key: keyof typeof notifs) => {
    const previousValue = notifs[key];
    const next = {
      ...notifPrefs,
      categories: { ...notifs, [key]: !previousValue },
    };
    void undoNotif.run({
      title: t(previousValue ? "notifications.disabled" : "notifications.enabled"),
      apply: () => mutateNotif(next),
      revert: () =>
        mutateNotif({
          ...notifPrefs,
          categories: { ...notifs, [key]: previousValue },
        }),
    });
  };
  const [confirmAction, setConfirmAction] = useState<"logout" | "delete" | null>(null);
  const [showPauseSheet, setShowPauseSheet] = useState(false);
  const [tier, setTier] = useState<PackageTier | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("assigned_tier")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && data?.assigned_tier) {
        setTier(data.assigned_tier);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const toggleGoal = (g: string) => setGoals((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  const toggleAllergy = (a: string) => setAllergies((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  // TODO: zameniti pravim subscription query-jem (Stripe / Supabase) u IT-25.
  // Za beta — niko nema aktivnu pretplatu, "Manage" ulazi u plan landing.
  const subscriptionFeatures = [
    "sub.personalizedPlan", "sub.allExercises", "sub.progressTracking",
    "sub.mealPlan", "sub.trainerChat", "sub.weeklyCheckin", "sub.monthlyVideo",
  ];

  const [personalDetails, setPersonalDetails] = useState<{
    goalWeight: number | "";
    currentWeight: number | "";
    height: number | "";
    dateOfBirth: string;
    gender: string;
    dailyStepGoal: number;
  }>({
    goalWeight: "",
    currentWeight: "",
    height: "",
    dateOfBirth: "",
    gender: t("personal.female"),
    dailyStepGoal: 10000,
  });
  const [editingField, setEditingField] = useState<string | null>(null);

  // Učitaj profile iz Supabase profiles tabele
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("current_weight, height, date_of_birth, allergies, primary_goal")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || error || !data) return;
      setPersonalDetails((prev) => ({
        ...prev,
        currentWeight: data.current_weight ?? "",
        height: data.height ?? "",
        dateOfBirth: data.date_of_birth
          ? new Date(data.date_of_birth).toLocaleDateString(language === "sr" ? "sr-RS" : "en-GB")
          : "",
      }));
      if (Array.isArray(data.allergies) && data.allergies.length > 0) {
        setAllergies(data.allergies);
      }
      // primary_goal je single-value u DB-u; mapiraj na multi-select label.
      const PRIMARY_GOAL_TO_LABEL: Record<string, string> = {
        muscle_gain: "Muscle gain",
        glute_growth: "Glute growth",
        fat_loss: "Fat loss",
        endurance: "Endurance",
        flexibility: "Flexibility",
        strength: "Strength",
      };
      if (data.primary_goal && PRIMARY_GOAL_TO_LABEL[data.primary_goal]) {
        setGoals([PRIMARY_GOAL_TO_LABEL[data.primary_goal]]);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, language]);

  // Persist allergies (text[] array) na svaku promenu — debounced via React batching.
  useEffect(() => {
    if (!user?.id) return;
    const timer = setTimeout(() => {
      void supabase
        .from("profiles")
        .update({ allergies })
        .eq("id", user.id);
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allergies.join("|"), user?.id]);

  // Persist primary_goal (uzimamo prvi goal kao primary; multi-select je UI-only).
  useEffect(() => {
    if (!user?.id || goals.length === 0) return;
    const LABEL_TO_PRIMARY_GOAL: Record<string, string> = {
      "Muscle gain": "muscle_gain",
      "Glute growth": "glute_growth",
      "Fat loss": "fat_loss",
      "Endurance": "endurance",
      "Flexibility": "flexibility",
      "Strength": "strength",
    };
    const enumValue = LABEL_TO_PRIMARY_GOAL[goals[0]];
    if (!enumValue) return;
    const timer = setTimeout(() => {
      void updateProfileFields(user.id, { primary_goal: enumValue }).catch(() => {
        // Silent — autosave gola je best-effort, kao i pre refaktora
      });
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals.join("|"), user?.id]);

  const persistProfileField = async (key: string, value: number | string): Promise<void> => {
    if (!user?.id) return;
    const update: Record<string, number | string | null> = {};
    if (key === "currentWeight") update.current_weight = typeof value === "number" ? value : null;
    else if (key === "height") update.height = typeof value === "number" ? value : null;
    else return; // dateOfBirth/gender/dailyStepGoal stay local for now
    await updateProfileFields(user.id, update).catch(() => {
      // Silent — isto ponašanje kao pre refaktora (supabase error se ignorisao)
    });
  };
  const [editValue, setEditValue] = useState("");

  const { healthConnected, setHealthConnected } = useHealth();

  const slideIn = {
    initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" },
    transition: IOS_SPRING.medium
  };

  // Grouped sections like Cal.ai
  const accountItems = [
    { icon: Crown, label: t("profile.subscription"), sub: t("subscription.manage"), page: "subscription" as SettingsPage },
    { icon: Palette, label: t("profile.appearance"), sub: theme === "system" ? t("appearance.system") : theme === "dark" ? t("appearance.dark") : t("appearance.light"), page: "appearance" as SettingsPage },
    { icon: Globe, label: t("profile.language"), sub: language === "sr" ? "Srpski" : "English", page: "language" as SettingsPage },
  ];

  const goalsTrackingItems = [
    { icon: Heart, label: t("profile.appleHealth"), sub: healthConnected ? t("profile.connected") : t("profile.notConnected"), page: "health" as SettingsPage },
    { icon: Target, label: t("profile.myGoals"), sub: goals.map((g) => t(goalKeys[g] || g)).join(", ") || t("profile.notSet"), page: "goals" as SettingsPage },
    { icon: Salad, label: t("profile.allergies"), sub: allergies.join(", ") || t("profile.none"), page: "allergies" as SettingsPage },
    { icon: Bell, label: t("profile.notifications"), sub: Object.values(notifs).some(Boolean) ? t("profile.enabled") : t("profile.disabled"), page: "notifications" as SettingsPage },
    { icon: Ruler, label: t("settings.units.title"), sub: "", page: "units" as SettingsPage },
    { icon: Scale, label: t("profile.weightHistory"), sub: "", page: "weightHistory" as SettingsPage },
  ];

  const supportLegalItems = [
    { icon: Mail, label: t("profile.supportEmail"), page: null as SettingsPage },
    { icon: FileText, label: t("profile.termsConditions"), page: null as SettingsPage },
    { icon: Shield, label: t("profile.privacyPolicy"), page: null as SettingsPage },
  ];

  const followUsItems = [
    { icon: Instagram, label: t("profile.instagram"), page: null as SettingsPage },
    { icon: Music, label: t("profile.tiktok"), page: null as SettingsPage },
  ];

  const renderSettingsGroup = (items: Array<{ icon: React.ComponentType<LucideProps>; label: string; sub?: string; page: SettingsPage }>) => (
    <Card className="overflow-hidden">
      {items.map(({ icon: Icon, label, sub, page }, i) => (
        <button key={label}
          onClick={() => { if (page === "analysis") { navigate("/analysis"); } else if (page) { setActivePage(page); } }}
          className={`w-full flex items-center gap-4 px-4 py-3 text-left ios-row-h ${i < items.length - 1 ? "border-b border-border" : ""}`}>
          <Icon size={20} className="text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-body text-foreground">{label}</p>
            {sub && <p className="text-footnote text-muted-foreground truncate">{sub}</p>}
          </div>
          <ChevronRight size={16} className="text-muted-foreground/30 shrink-0" />
        </button>
      ))}
    </Card>
  );

  const renderSectionHeader = (title: string) => <SectionLabel>{title}</SectionLabel>;

  return (
    <motion.div {...fadeUp()} className={`min-h-screen bg-background-secondary pb-32 relative ${activePage ? "overflow-hidden h-screen" : ""}`}>
      <PageTitle title={t("profile.title")} />

      <div className="px-5 mt-3 space-y-5">
        {/* Profile card */}
        <motion.button initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          onClick={() => setActivePage("personal")}
          className="w-full bg-card rounded-2xl card-shadow p-4 flex items-center gap-4 text-left">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User size={24} className="text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {tier ? (
                <TierBadge tier={tier} />
              ) : (
                <span className="inline-flex items-center gap-1 text-caption-2 text-muted-foreground font-medium">
                  <Crown size={ICON_SIZE.xs} aria-hidden="true" /> Beta
                </span>
              )}
            </div>
            <h2 className="text-headline text-foreground">{displayName || t("profile.title")}</h2>
            <p className="text-footnote text-muted-foreground">{displayEmail}</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground/30 shrink-0" />
        </motion.button>

        {/* Quick pause action — putovanje/bolest */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => setShowPauseSheet(true)}
          className="w-full bg-card rounded-2xl card-shadow p-4 flex items-center gap-4 text-left"
          aria-label={t("profile.quickPause")}
        >
          <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center shrink-0">
            <Plane size={20} className="text-warning" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body font-semibold text-foreground">{t("profile.quickPause")}</p>
            <p className="text-caption-1 text-muted-foreground mt-0.5">{t("profile.quickPauseSub")}</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground/30 shrink-0" />
        </motion.button>

        {/* Account */}
        <div>
          {renderSectionHeader(t("profile.account"))}
          {renderSettingsGroup(accountItems)}
        </div>

        {/* Goals & Tracking */}
        <div>
          {renderSectionHeader(t("profile.goalsTracking"))}
          {renderSettingsGroup(goalsTrackingItems)}
        </div>

        {/* Support & Legal */}
        <div>
          {renderSectionHeader(t("profile.supportLegal"))}
          {renderSettingsGroup(supportLegalItems)}
        </div>

        {/* Follow Us */}
        <div>
          {renderSectionHeader(t("profile.followUs"))}
          {renderSettingsGroup(followUsItems)}
        </div>

        {/* Privacy & data — WS-8 G3 */}
        <div>
          {renderSectionHeader(t("privacy.sectionTitle"))}
          <PrivacyBadge
            label={t("privacy.sectionTitle")}
            sublabel={t("privacy.sectionBody")}
          />
        </div>

        {/* Account Actions */}
        <div>
          {renderSectionHeader(t("profile.accountActions"))}
          <Card className="overflow-hidden">
            <button onClick={() => setConfirmAction("logout")}
              className="w-full flex items-center gap-4 px-4 py-3 text-left ios-row-h border-b border-border">
              <LogOut size={20} className="text-muted-foreground" aria-hidden="true" />
              <p className="text-body text-foreground flex-1">{t("profile.logOut")}</p>
              <ChevronRight size={16} className="text-muted-foreground/30 shrink-0" aria-hidden="true" />
            </button>
            <button
              onClick={() => setConfirmAction("delete")}
              className="w-full flex items-center gap-4 px-4 py-3 text-left ios-row-h"
            >
              <Trash2 size={20} className="text-destructive" aria-hidden="true" />
              <p className="text-body text-destructive flex-1">{t("profile.deleteAccount")}</p>
              <ChevronRight size={16} className="text-muted-foreground/30 shrink-0" aria-hidden="true" />
            </button>
          </Card>
        </div>

        <div className="h-4" />
      </div>

      {/* Sub-pages overlay */}
      <AnimatePresence>
        {activePage &&
          <motion.div {...slideIn} className="fixed inset-0 z-50 bg-background-secondary overflow-y-auto">
            <div className="px-5 pb-4 flex items-center gap-3 sticky top-0 z-10 pt-4 bg-background-secondary/95 backdrop-blur-md">
              <button onClick={() => setActivePage(null)} className="text-primary min-w-11 min-h-11 flex items-center gap-1">
                <ArrowLeft size={20} />
                <span className="text-body">{t("profile.back")}</span>
              </button>
            </div>

            <div className="px-5 pb-32">
              {/* PERSONAL DETAILS */}
              {activePage === "personal" &&
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
              }

              {/* MY GOALS */}
              {activePage === "goals" &&
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-title-2 text-foreground mb-2">{t("goals.title")}</h2>
                  <p className="text-subhead text-muted-foreground mb-6">{t("goals.subtitle")}</p>
                  <div className="space-y-2">
                    {allGoals.map((g) => {
                      const selected = goals.includes(g);
                      return (
                        <button key={g} onClick={() => toggleGoal(g)}
                          className={`w-full flex items-center justify-between px-4 py-4 rounded-xl min-h-11 transition-colors ${selected ? "bg-primary/10 border-2 border-primary" : "bg-card card-shadow border-2 border-transparent"}`}>
                          <span className={`text-body ${selected ? "text-primary font-semibold" : "text-foreground"}`}>{t(goalKeys[g] || g)}</span>
                          {selected && <Check size={20} className="text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              }

              {/* ALLERGIES */}
              {activePage === "allergies" &&
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-title-2 text-foreground mb-2">{t("allergies.title")}</h2>
                  <p className="text-subhead text-muted-foreground mb-6">{t("allergies.subtitle")}</p>
                  <div className="flex flex-wrap gap-2">
                    {allAllergies.map((a) => {
                      const selected = allergies.includes(a);
                      return (
                        <button key={a} onClick={() => toggleAllergy(a)}
                          className={`px-4 py-3 rounded-full min-h-11 transition-colors text-body ${selected ? "gradient-primary text-primary-foreground font-semibold" : "bg-card card-shadow text-foreground"}`}>
                          {a}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              }

              {/* NOTIFICATIONS */}
              {activePage === "notifications" &&
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-title-2 text-foreground mb-2">{t("notifications.title")}</h2>
                  <p className="text-subhead text-muted-foreground mb-6">{t("notifications.subtitle")}</p>
                  <div className="bg-card rounded-xl card-shadow overflow-hidden">
                    {[
                      { key: "workout" as const, label: t("notifications.workoutReminders"), desc: t("notifications.workoutRemindersDesc") },
                      { key: "meals" as const, label: t("notifications.mealReminders"), desc: t("notifications.mealRemindersDesc") },
                      { key: "chat" as const, label: t("notifications.chatMessages"), desc: t("notifications.chatMessagesDesc") },
                      { key: "system" as const, label: t("notifications.systemMessages"), desc: t("notifications.systemMessagesDesc") },
                      { key: "achievement" as const, label: t("notifications.achievements"), desc: t("notifications.achievementsDesc") },
                    ].map(({ key, label, desc }, i, arr) => (
                      <button
                        key={key}
                        onClick={() => toggleNotif(key)}
                        role="switch"
                        aria-checked={notifs[key]}
                        aria-label={label}
                        aria-describedby={`notif-desc-${key}`}
                        className={`w-full flex items-center justify-between px-4 py-4 min-h-14 text-left ${i < arr.length - 1 ? "border-b border-border" : ""}`}
                      >
                        <div>
                          <p className="text-body text-foreground">{label}</p>
                          <p id={`notif-desc-${key}`} className="text-footnote text-muted-foreground">{desc}</p>
                        </div>
                        <div className={`${IOS_SWITCH.track} rounded-full p-[2px] transition-colors duration-base shrink-0 ${notifs[key] ? "bg-success" : "bg-muted"}`} aria-hidden="true">
                          <motion.div layout transition={IOS_SPRING.precise}
                            className={`${IOS_SWITCH.thumb} rounded-full bg-white shadow-sm ${notifs[key] ? "ml-auto" : "ml-0"}`} />
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="bg-card rounded-xl card-shadow p-4 mt-4">
                    <QuietHoursPicker />
                  </div>
                </motion.div>
              }

              {/* UNITS */}
              {activePage === "units" &&
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="bg-card rounded-xl card-shadow p-4">
                    <UnitsPicker />
                  </div>
                </motion.div>
              }

              {/* SUBSCRIPTION */}
              {activePage === "subscription" &&
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-title-2 text-foreground mb-2">{t("subscription.title")}</h2>
                  <p className="text-subhead text-muted-foreground mb-6">{t("subscription.subtitle")}</p>
                  <Card className="p-5 mb-4">
                    <SectionLabel className="!px-0">{t("subscription.included")}</SectionLabel>
                    <div className="space-y-3">
                      {subscriptionFeatures.map((f) => (
                        <div key={f} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center shrink-0">
                            <Check size={ICON_SIZE.xs} className="text-primary-foreground" />
                          </div>
                          <span className="text-body text-foreground">{t(f)}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Button onClick={() => navigate("/subscription")} variant="cta" size="xl">
                    {t("subscription.changePlan")}
                  </Button>
                  <Button variant="link" className="w-full text-destructive mt-2 min-h-11 hover:no-underline">{t("subscription.cancel")}</Button>
                </motion.div>
              }

              {/* APPLE HEALTH */}
              {activePage === "health" &&
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-title-2 text-foreground mb-2">{t("health.title")}</h2>
                  <p className="text-subhead text-muted-foreground mb-6">{t("health.subtitle")}</p>
                  <div className="bg-card rounded-xl card-shadow p-4 mb-4">
                    <button
                      onClick={() => setHealthConnected(!healthConnected)}
                      role="switch"
                      aria-checked={healthConnected}
                      aria-label={t("health.title")}
                      className="w-full flex items-center justify-between min-h-14"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${healthConnected ? "bg-success/15" : "bg-muted"}`}>
                          <Heart size={20} className={healthConnected ? "text-success" : "text-muted-foreground"} aria-hidden="true" />
                        </div>
                        <div className="text-left">
                          <p className="text-body text-foreground font-medium">{t("health.title")}</p>
                          <p className="text-footnote text-muted-foreground">{healthConnected ? t("health.connectedSync") : t("profile.notConnected")}</p>
                        </div>
                      </div>
                      <div className={`${IOS_SWITCH.track} rounded-full p-[2px] transition-colors duration-base shrink-0 ${healthConnected ? "bg-success" : "bg-muted"}`} aria-hidden="true">
                        <motion.div layout transition={IOS_SPRING.precise} className={`${IOS_SWITCH.thumb} rounded-full bg-white shadow-sm ${healthConnected ? "ml-auto" : "ml-0"}`} />
                      </div>
                    </button>
                  </div>
                  {healthConnected &&
                    <div className="bg-card rounded-xl card-shadow overflow-hidden">
                      <div className="px-4 pt-4 pb-2">
                        <SectionLabel className="!px-0 !mb-0">{t("health.syncingData")}</SectionLabel>
                      </div>
                      {([
                        { icon: Flame, iconColor: "text-warning", label: t("health.calories"), desc: t("health.caloriesDesc"), enabled: true },
                        { icon: Footprints, iconColor: "text-info", label: t("health.stepsDistance"), desc: t("health.stepsDistanceDesc"), enabled: true },
                        { icon: HeartPulse, iconColor: "text-destructive", label: t("health.heartRate"), desc: t("health.heartRateDesc"), enabled: true },
                        { icon: Bed, iconColor: "text-primary", label: t("health.sleep"), desc: t("health.sleepDesc"), enabled: false },
                        { icon: Scale, iconColor: "text-success", label: t("health.weight"), desc: t("health.weightDesc"), enabled: true },
                      ] as Array<{ icon: ComponentType<LucideProps>; iconColor: string; label: string; desc: string; enabled: boolean }>).map((item, i, arr) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.label} className={`flex items-center gap-3 px-4 py-4 min-h-14 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                            <Icon size={ICON_SIZE.lg} className={item.iconColor} aria-hidden="true" />
                            <div className="flex-1">
                              <p className="text-body text-foreground">{item.label}</p>
                              <p className="text-footnote text-muted-foreground">{item.desc}</p>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${item.enabled ? "bg-success" : "bg-muted-foreground/30"}`} />
                          </div>
                        );
                      })}
                    </div>
                  }
                  {!healthConnected &&
                    <div className="bg-card rounded-xl card-shadow p-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Heart size={28} className="text-primary" />
                      </div>
                      <h3 className="text-title-3 text-foreground mb-2">{t("health.connectTitle")}</h3>
                      <p className="text-subhead text-muted-foreground mb-4">{t("health.connectDesc")}</p>
                      <Button onClick={() => setHealthConnected(true)} variant="cta" size="xl">
                        {t("health.connectNow")}
                      </Button>
                    </div>
                  }
                </motion.div>
              }

              {/* APPEARANCE */}
              {activePage === "appearance" &&
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-title-2 text-foreground mb-2">{t("appearance.title")}</h2>
                  <p className="text-subhead text-muted-foreground mb-6">{t("appearance.subtitle")}</p>
                  <div className="space-y-2">
                    {[
                      { value: "light" as const, icon: Sun, label: t("appearance.light"), desc: t("appearance.lightDesc") },
                      { value: "dark" as const, icon: Moon, label: t("appearance.dark"), desc: t("appearance.darkDesc") },
                      { value: "system" as const, icon: Monitor, label: t("appearance.system"), desc: t("appearance.systemDesc") },
                    ].map(({ value, icon: Icon, label, desc }) => {
                      const selected = theme === value;
                      return (
                        <button key={value} onClick={() => setTheme(value)}
                          className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl min-h-14 transition-all ${selected ? "bg-primary/10 border-2 border-primary" : "bg-card card-shadow border-2 border-transparent"}`}>
                          <Icon size={ICON_SIZE.lg} className={selected ? "text-primary" : "text-muted-foreground"} />
                          <div className="flex-1 text-left">
                            <p className={`text-body ${selected ? "text-primary font-semibold" : "text-foreground"}`}>{label}</p>
                            <p className="text-footnote text-muted-foreground">{desc}</p>
                          </div>
                          {selected &&
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={IOS_SPRING.precise}>
                              <Check size={20} className="text-primary" />
                            </motion.div>
                          }
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              }

              {/* LANGUAGE */}
              {activePage === "language" &&
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-title-2 text-foreground mb-2">{t("language.title")}</h2>
                  <p className="text-subhead text-muted-foreground mb-6">{t("language.subtitle")}</p>
                  <div className="space-y-2">
                    {[
                      { value: "en" as const, flag: "🇬🇧", label: t("language.english"), desc: t("language.englishDesc") },
                      { value: "sr" as const, flag: "🇷🇸", label: t("language.serbian"), desc: t("language.serbianDesc") },
                    ].map(({ value, flag, label, desc }) => {
                      const selected = language === value;
                      return (
                        <button key={value} onClick={() => setLanguage(value)}
                          className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl min-h-14 transition-all ${selected ? "bg-primary/10 border-2 border-primary" : "bg-card card-shadow border-2 border-transparent"}`}>
                          <span className="text-title-3" aria-hidden="true">{flag}</span>
                          <div className="flex-1 text-left">
                            <p className={`text-body ${selected ? "text-primary font-semibold" : "text-foreground"}`}>{label}</p>
                            <p className="text-footnote text-muted-foreground">{desc}</p>
                          </div>
                          {selected &&
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={IOS_SPRING.precise}>
                              <Check size={20} className="text-primary" />
                            </motion.div>
                          }
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              }

              {/* WEIGHT HISTORY */}
              {activePage === "weightHistory" &&
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-title-2 text-foreground mb-2">{t("profile.weightHistory")}</h2>
                  <p className="text-subhead text-muted-foreground mb-6">{language === "sr" ? "Prati promene težine tokom vremena" : "Track your weight changes over time"}</p>
                  <div className="bg-card rounded-xl card-shadow p-5 text-center">
                    <Scale size={32} className="text-muted-foreground mx-auto mb-3" />
                    <p className="text-body text-muted-foreground">{language === "sr" ? "Istorija težine će se pojaviti ovde" : "Weight history will appear here"}</p>
                  </div>
                </motion.div>
              }
            </div>
          </motion.div>
        }
      </AnimatePresence>

      <QuickPauseSheet open={showPauseSheet} onOpenChange={setShowPauseSheet} />

      {/* Destructive confirmation dialogs (WS-3) */}
      <AlertDialog open={confirmAction === "logout"} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("profile.logOut")}</AlertDialogTitle>
            <AlertDialogDescription>{t("profile.logoutConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-3">
            <AlertDialogCancel className="flex-1 min-h-11 rounded-xl">
              {t("unsaved.stay")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { setConfirmAction(null); await signOut(); navigate("/"); }}
              className="flex-1 min-h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("profile.logOut")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === "delete"} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("profile.deleteAccount")}</AlertDialogTitle>
            <AlertDialogDescription>{t("profile.deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-3">
            <AlertDialogCancel className="flex-1 min-h-11 rounded-xl">
              {t("unsaved.stay")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { haptic("heavy"); setConfirmAction(null); navigate("/"); }}
              className="flex-1 min-h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default Profile;
