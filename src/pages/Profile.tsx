import { useNavigate } from "react-router-dom";
import { ICON_SIZE } from "@/lib/design-tokens";
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
import { ChevronRight, LogOut, Target, Bell, Palette, Salad, Crown, Heart, Globe, User, FileText, Shield, Mail, Instagram, Music, Trash2, Scale, Plane, Ruler, type LucideProps } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useHealth } from "@/contexts/HealthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfileFields, getProfilePersonalFields, getClientTier } from "@/services/profileService";
import { ArrowLeft } from "lucide-react";
import { SectionLabel } from "@/components/ui/section-label";
import { PrivacyBadge } from "@/components/ui/privacy-badge";
import { Card } from "@/components/ui/card";
import { useHaptic } from "@/hooks/useHaptic";
import QuickPauseSheet from "@/components/home/QuickPauseSheet";
import TierBadge from "@/components/profile/TierBadge";
import UnitsPicker from "@/components/profile/UnitsPicker";
// Sub-page komponente izdvojene iz ovog fajla (refactor — ponašanje identično)
import PersonalDetailsPage from "@/components/profile/PersonalDetailsPage";
import GoalsPage from "@/components/profile/GoalsPage";
import AllergiesPage from "@/components/profile/AllergiesPage";
import NotificationsPage from "@/components/profile/NotificationsPage";
import SubscriptionPage from "@/components/profile/SubscriptionPage";
import HealthPage from "@/components/profile/HealthPage";
import AppearancePage from "@/components/profile/AppearancePage";
import LanguagePage from "@/components/profile/LanguagePage";
import WeightHistoryPage from "@/components/profile/WeightHistoryPage";
import { PageTitle } from "@/components/PageTitle";
import type { PackageTier } from "@/services/packageService";
import {
  useNotificationPreferences,
  useSetNotificationPreferences,
} from "@/hooks/useUserPreferences";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/services/userPreferencesService";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import { tenantConfig, isFeatureEnabled } from "@/tenant.config";

type SettingsPage = null | "goals" | "allergies" | "notifications" | "appearance" | "subscription" | "health" | "language" | "personal" | "weightHistory" | "analysis" | "units";

const Profile = () => {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState<SettingsPage>(null);
  const { theme } = useTheme();
  const { language, t } = useLanguage();
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
      // Greška → null (servis throw se guta) — isto ponašanje kao raniji
      // direktni supabase poziv koji nije čitao error.
      const assignedTier = await getClientTier(user.id).catch(() => null);
      if (!cancelled && assignedTier) {
        setTier(assignedTier);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const toggleGoal = (g: string) => setGoals((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  const toggleAllergy = (a: string) => setAllergies((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

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
      const data = await getProfilePersonalFields(user.id);
      if (cancelled || !data) return;
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
      // Silent catch — raniji direktni supabase poziv je ignorisao error.
      void updateProfileFields(user.id, { allergies }).catch(() => {});
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

  const { healthConnected } = useHealth();

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
    // White-label (Faza 3.3): Apple Health red samo ako tenant koristi healthKit
    ...(isFeatureEnabled("healthKit")
      ? [{ icon: Heart, label: t("profile.appleHealth"), sub: healthConnected ? t("profile.connected") : t("profile.notConnected"), page: "health" as SettingsPage }]
      : []),
    { icon: Target, label: t("profile.myGoals"), sub: goals.map((g) => t(goalKeys[g] || g)).join(", ") || t("profile.notSet"), page: "goals" as SettingsPage },
    { icon: Salad, label: t("profile.allergies"), sub: allergies.join(", ") || t("profile.none"), page: "allergies" as SettingsPage },
    { icon: Bell, label: t("profile.notifications"), sub: Object.values(notifs).some(Boolean) ? t("profile.enabled") : t("profile.disabled"), page: "notifications" as SettingsPage },
    { icon: Ruler, label: t("settings.units.title"), sub: "", page: "units" as SettingsPage },
    { icon: Scale, label: t("profile.weightHistory"), sub: "", page: "weightHistory" as SettingsPage },
  ];

  // White-label (Faza 3.1): kontakt/social linkovi iz tenant configa.
  // Prazna vrednost u configu → red ostaje vidljiv ali bez akcije (kao do sada).
  const supportLegalItems = [
    { icon: Mail, label: t("profile.supportEmail"), page: null as SettingsPage, href: tenantConfig.contact.email ? `mailto:${tenantConfig.contact.email}` : undefined },
    { icon: FileText, label: t("profile.termsConditions"), page: null as SettingsPage },
    { icon: Shield, label: t("profile.privacyPolicy"), page: null as SettingsPage },
  ];

  const followUsItems = [
    { icon: Instagram, label: t("profile.instagram"), page: null as SettingsPage, href: tenantConfig.contact.instagram || undefined },
    { icon: Music, label: t("profile.tiktok"), page: null as SettingsPage, href: tenantConfig.contact.tiktok || undefined },
  ];

  const renderSettingsGroup = (items: Array<{ icon: React.ComponentType<LucideProps>; label: string; sub?: string; page: SettingsPage; href?: string }>) => (
    <Card className="overflow-hidden">
      {items.map(({ icon: Icon, label, sub, page, href }, i) => (
        <button key={label}
          onClick={() => { if (page === "analysis") { navigate("/analysis"); } else if (page) { setActivePage(page); } else if (href) { window.open(href, "_blank", "noopener,noreferrer"); } }}
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

        {/* Quick pause action — putovanje/bolest (feature flag: clientPause) */}
        {isFeatureEnabled("clientPause") && (
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
        )}

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
                <PersonalDetailsPage
                  personalDetails={personalDetails}
                  setPersonalDetails={setPersonalDetails}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  editValue={editValue}
                  setEditValue={setEditValue}
                  persistProfileField={persistProfileField}
                />
              }

              {/* MY GOALS */}
              {activePage === "goals" &&
                <GoalsPage goals={goals} allGoals={allGoals} goalKeys={goalKeys} toggleGoal={toggleGoal} />
              }

              {/* ALLERGIES */}
              {activePage === "allergies" &&
                <AllergiesPage allergies={allergies} allAllergies={allAllergies} toggleAllergy={toggleAllergy} />
              }

              {/* NOTIFICATIONS */}
              {activePage === "notifications" &&
                <NotificationsPage notifs={notifs} toggleNotif={toggleNotif} />
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
              {activePage === "subscription" && <SubscriptionPage />}

              {/* APPLE HEALTH */}
              {activePage === "health" && <HealthPage />}

              {/* APPEARANCE */}
              {activePage === "appearance" && <AppearancePage />}

              {/* LANGUAGE */}
              {activePage === "language" && <LanguagePage />}

              {/* WEIGHT HISTORY */}
              {activePage === "weightHistory" && <WeightHistoryPage />}
            </div>
          </motion.div>
        }
      </AnimatePresence>

      {isFeatureEnabled("clientPause") && (
        <QuickPauseSheet open={showPauseSheet} onOpenChange={setShowPauseSheet} />
      )}

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
