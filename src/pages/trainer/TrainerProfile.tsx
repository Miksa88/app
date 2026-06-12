import { IOS_SPRING } from "@/lib/motion";
import { Input } from "@/components/ui/input";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, LogOut, Bell, Palette, Sun, Moon, Monitor, Check, Users, Clock, Briefcase, Globe, ChevronDown, Plane } from "lucide-react";
import VacationModeCard from "@/components/trainer/VacationModeCard";
import { IOS_SWITCH } from "@/lib/design-tokens";
import { PageHeader } from "@/components/PageHeader";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTrainerClients } from "@/hooks/useTrainerClients";
import trainerAvatar from "@/assets/trainer-avatar.jpg";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Card } from "@/components/ui/card";
import { useHaptic } from "@/hooks/useHaptic";
import { tenantConfig } from "@/tenant.config";

type SettingsPage = null | "business" | "availability" | "notifications" | "appearance" | "language" | "workingHours" | "brand" | "defaults" | "vacation";

const TrainerProfile = () => {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState<SettingsPage>(null);
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const haptic = useHaptic();
  const { user } = useAuth();
  const { clients: trainerClients } = useTrainerClients();
  const displayName = (user?.user_metadata?.first_name && user?.user_metadata?.last_name)
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
    : (user?.user_metadata?.first_name as string | undefined)
      ?? user?.email?.split("@")[0]
      ?? t("trainer.trainerFallback");
  const displayEmail = user?.email ?? "";
  const realClientCount = trainerClients.length;

  const [businessInfo, setBusinessInfo] = useState({
    specialty: t("trainerProfile.specialtyDefault"),
    experience: t("trainerProfile.experienceDefault"),
    certifications: ["NASM CPT", "Precision Nutrition L1"],
  });

  const [availability, setAvailability] = useState({
    monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false
  });

  const [notifs, setNotifs] = useState({
    push: true, newClient: true, clientCompletedWorkout: true, clientMissed3Days: true, newMessage: true, paymentReceived: true,
  });

  const [workingHours, setWorkingHours] = useState({
    from: "09:00", to: "21:00", weekend: false,
  });

  // Mapping za PageHeader largeTitle na sub-pages (Apple collapsing nav pattern)
  const SUB_PAGE_TITLES: Record<NonNullable<SettingsPage>, { title: string; subtitle?: string }> = {
    business: { title: t("trainerProfile.businessInfo"), subtitle: t("trainerProfile.yourDetails") },
    availability: { title: t("trainerProfile.availability") },
    notifications: { title: t("trainerProfile.notifications") },
    workingHours: { title: t("trainerProfile.workingHours"), subtitle: t("trainerProfile.availableForMessages") },
    appearance: { title: t("profile.appearance") },
    language: { title: t("profile.language") },
    brand: { title: t("trainerProfile.brand") },
    defaults: { title: t("defaults.title") },
    vacation: { title: t("trainer.vacation.title") },
  };

  const SETTINGS = [
    { icon: Briefcase, label: t("trainerProfile.businessInfo"), sub: businessInfo.specialty, page: "business" as const },
    { icon: Clock, label: t("trainerProfile.availability"), sub: `${Object.values(availability).filter(Boolean).length} ${t("trainerProfile.daysWeek")}`, page: "availability" as const },
    { icon: Bell, label: t("trainerProfile.notifications"), sub: Object.values(notifs).some(Boolean) ? t("profile.enabled") : t("profile.disabled"), page: "notifications" as const },
    { icon: Clock, label: t("trainerProfile.workingHours"), sub: `${workingHours.from} - ${workingHours.to}`, page: "workingHours" as const },
    { icon: Palette, label: t("profile.appearance"), sub: theme === "system" ? t("appearance.system") : theme === "dark" ? t("appearance.dark") : t("appearance.light"), page: "appearance" as const },
    { icon: Globe, label: t("profile.language"), sub: language === "sr" ? "Srpski" : "English", page: "language" as const },
    { icon: Palette, label: t("trainerProfile.brand"), sub: tenantConfig.appName, page: "brand" as const },
    { icon: Briefcase, label: t("defaults.title"), sub: t("overload.moderate"), page: "defaults" as const },
    { icon: Plane, label: t("trainer.vacation.title"), sub: "", page: "vacation" as const },
  ];

  const slideIn = {
    initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" },
    transition: IOS_SPRING.medium
  };

  const DAYS = [
    { key: "monday" as const, tKey: "day.monday" },
    { key: "tuesday" as const, tKey: "day.tuesday" },
    { key: "wednesday" as const, tKey: "day.wednesday" },
    { key: "thursday" as const, tKey: "day.thursday" },
    { key: "friday" as const, tKey: "day.friday" },
    { key: "saturday" as const, tKey: "day.saturday" },
    { key: "sunday" as const, tKey: "day.sunday" },
  ];

  const ToggleSwitch = ({ value, onToggle }: { value: boolean; onToggle: () => void }) => (
    <button
      onClick={() => { haptic("medium"); onToggle(); }}
      role="switch"
      aria-checked={value}
      className={`${IOS_SWITCH.track} rounded-full p-[2px] transition-colors duration-base shrink-0 focus-ring-default ${value ? "bg-success" : "bg-muted"}`}
    >
      <motion.div layout transition={IOS_SPRING.precise}
        className={`${IOS_SWITCH.thumb} rounded-full bg-white shadow-sm ${value ? "ml-auto" : "ml-0"}`} />
    </button>
  );

  return (
    <div className={`min-h-screen bg-background-secondary pb-32 relative ${activePage ? "overflow-hidden h-screen" : ""}`}>
      {/* Identity page — samo sticky Liquid Glass back. Ime je ispod avatar-a. */}
      <PageHeader onBack={() => navigate(-1)} backLabel={t("nav.trainerHome")} />

      <div className="px-5 pt-3">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-6">
          <UserAvatar imageUrl={trainerAvatar} alt={displayName} size="xl" className="mb-3" />
          <h2 className="text-title-3 text-foreground">{displayName}</h2>
          {displayEmail && <p className="text-subhead text-muted-foreground">{displayEmail}</p>}
          <div className="flex items-center gap-2 mt-3">
            <div className="bg-primary/10 rounded-full px-4 py-2 text-caption-1 text-primary font-semibold">{t("trainerProfile.proBadge")}</div>
            <div className="flex items-center gap-1 bg-card px-3 py-2 rounded-full card-shadow">
              <Users size={ICON_SIZE.xs} className="text-primary" />
              <span className="text-caption-1 font-semibold text-foreground tabular-nums">{realClientCount} {t("trainerProfile.clients")}</span>
            </div>
          </div>
        </motion.div>

        <div className="bg-card rounded-xl card-shadow overflow-hidden mt-2">
          {SETTINGS.map(({ icon: Icon, label, sub, page }, i) => (
            <motion.button key={page} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              onClick={() => setActivePage(page)}
              className={`w-full flex items-center gap-4 px-4 py-3 text-left min-h-14 ${i < SETTINGS.length - 1 ? "border-b border-border" : ""}`}>
              <Icon size={20} className="text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-body text-foreground">{label}</p>
                <p className="text-footnote text-muted-foreground truncate">{sub}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground/40 shrink-0" />
            </motion.button>
          ))}
        </div>

        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          onClick={() => navigate("/")}
          className="w-full flex items-center justify-center gap-2 mt-8 py-3 text-destructive text-body font-medium min-h-11">
          <LogOut size={ICON_SIZE.md} />
          {t("profile.logOut")}
        </motion.button>
      </div>

      {/* Sub-pages */}
      <AnimatePresence>
        {activePage && (
          <motion.div {...slideIn} className="fixed inset-0 z-50 bg-background-secondary overflow-y-auto">
            {/* Apple iOS premium nav — collapsing Large Title pattern */}
            <PageHeader
              largeTitle={SUB_PAGE_TITLES[activePage]?.title ?? ""}
              subtitle={SUB_PAGE_TITLES[activePage]?.subtitle}
              backLabel={t("trainerProfile.title")}
              onBack={() => setActivePage(null)}
              hideInlineTitle
            />

            <div className="px-5 pb-32 pt-2">
              {/* BUSINESS INFO */}
              {activePage === "business" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="space-y-4">
                    {/* iOS Settings-style grouped list: outer Card grup, inline inputs bez dodatnog bg */}
                    <Card className="overflow-hidden p-0">
                      <div className="px-4 py-3 border-b border-border">
                        <label htmlFor="specialty" className="text-caption-1 text-muted-foreground block">{t("trainerProfile.specialty")}</label>
                        <Input
                          id="specialty"
                          value={businessInfo.specialty}
                          onChange={(e) => setBusinessInfo(prev => ({ ...prev, specialty: e.target.value }))}
                          className="bg-transparent rounded-none px-0 h-auto min-h-0 py-1 mt-0.5 focus-visible:ring-0"
                        />
                      </div>
                      <div className="px-4 py-3">
                        <label htmlFor="experience" className="text-caption-1 text-muted-foreground block">{t("trainerProfile.experience")}</label>
                        <Input
                          id="experience"
                          value={businessInfo.experience}
                          onChange={(e) => setBusinessInfo(prev => ({ ...prev, experience: e.target.value }))}
                          className="bg-transparent rounded-none px-0 h-auto min-h-0 py-1 mt-0.5 focus-visible:ring-0"
                        />
                      </div>
                    </Card>
                    <Card className="p-4">
                      <label className="text-caption-1 text-muted-foreground mb-2 block">{t("trainerProfile.certifications")}</label>
                      <div className="flex flex-wrap gap-2">
                        {businessInfo.certifications.map(cert => (
                          <span key={cert} className="bg-primary/10 text-primary text-caption-1 font-medium px-3 py-2 rounded-lg">{cert}</span>
                        ))}
                      </div>
                    </Card>
                  </div>
                </motion.div>
              )}

              {/* AVAILABILITY */}
              {activePage === "availability" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="bg-card rounded-xl card-shadow overflow-hidden">
                    {DAYS.map(({ key, tKey }, i) => (
                      <button key={key} onClick={() => setAvailability(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`w-full flex items-center justify-between px-4 py-4 min-h-14 text-left ${i < DAYS.length - 1 ? "border-b border-border" : ""}`}>
                        <span className="text-body text-foreground">{t(tKey)}</span>
                        <ToggleSwitch value={availability[key]} onToggle={() => setAvailability(prev => ({ ...prev, [key]: !prev[key] }))} />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* NOTIFICATIONS */}
              {activePage === "notifications" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="bg-card rounded-xl card-shadow overflow-hidden">
                    {([
                      { key: "push" as const, label: t("trainerProfile.pushNotifications") },
                      { key: "newClient" as const, label: t("trainerProfile.newClientRegistered") },
                      { key: "clientCompletedWorkout" as const, label: t("trainerProfile.clientCompletedWorkout") },
                      { key: "clientMissed3Days" as const, label: t("trainerProfile.clientMissed3Days") },
                      { key: "newMessage" as const, label: t("trainerProfile.newMessage") },
                      { key: "paymentReceived" as const, label: t("trainerProfile.paymentReceived") },
                    ]).map(({ key, label }, i, arr) => (
                      <button key={key} onClick={() => setNotifs(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`w-full flex items-center justify-between px-4 py-4 min-h-14 text-left ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                        <span className="text-body text-foreground">{label}</span>
                        <ToggleSwitch value={notifs[key]} onToggle={() => setNotifs(prev => ({ ...prev, [key]: !prev[key] }))} />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* WORKING HOURS */}
              {activePage === "workingHours" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="bg-card rounded-xl card-shadow p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-caption-1 text-muted-foreground mb-1 block">{t("trainerProfile.from")}</label>
                        <Input type="time" value={workingHours.from} onChange={e => setWorkingHours(prev => ({ ...prev, from: e.target.value }))}
                          className="bg-muted card-shadow-none shadow-none rounded-lg" />
                      </div>
                      <div>
                        <label className="text-caption-1 text-muted-foreground mb-1 block">{t("trainerProfile.to")}</label>
                        <Input type="time" value={workingHours.to} onChange={e => setWorkingHours(prev => ({ ...prev, to: e.target.value }))}
                          className="bg-muted card-shadow-none shadow-none rounded-lg" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-body text-foreground">{t("trainerProfile.weekend")}</span>
                      <ToggleSwitch value={workingHours.weekend} onToggle={() => setWorkingHours(prev => ({ ...prev, weekend: !prev.weekend }))} />
                    </div>
                  </div>
                  <p className="text-caption-1 text-muted-foreground mt-3 px-1">
                    {t("trainerProfile.offlineMessage")}
                  </p>
                </motion.div>
              )}

              {/* BRAND */}
              {activePage === "brand" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="bg-card rounded-xl card-shadow p-4 space-y-4 mt-4">
                    <div>
                      <label className="text-caption-1 text-muted-foreground">{t("trainerProfile.appName")}</label>
                      {/* White-label: ime i boja dolaze iz tenant configa, ne iz prevoda */}
                      <p className="text-body text-foreground mt-1">{tenantConfig.appName}</p>
                    </div>
                    <div className="separator-ios" />
                    <div>
                      <label className="text-caption-1 text-muted-foreground">{t("trainerProfile.primaryColor")}</label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-6 h-6 rounded-full gradient-primary" />
                        <p className="text-body text-foreground tabular-nums">{`hsl(${tenantConfig.colors.primary})`}</p>
                      </div>
                    </div>
                    <div className="separator-ios" />
                    <div>
                      <label className="text-caption-1 text-muted-foreground">{t("trainerProfile.appStatus")}</label>
                      <div className="mt-1 space-y-1">
                        <p className="text-body text-foreground">iOS <span className="text-success">● {t("trainerProfile.statusLive")}</span> v2.1</p>
                        <p className="text-body text-foreground">Android <span className="text-success">● {t("trainerProfile.statusLive")}</span> v2.1</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* APPEARANCE */}
              {activePage === "appearance" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="space-y-2">
                    {([
                      { value: "light" as const, icon: Sun, label: t("appearance.light"), desc: t("appearance.lightDesc") },
                      { value: "dark" as const, icon: Moon, label: t("appearance.dark"), desc: t("appearance.darkDesc") },
                      { value: "system" as const, icon: Monitor, label: t("appearance.system"), desc: t("appearance.systemDesc") },
                    ]).map(({ value, icon: Icon, label, desc }) => {
                      const selected = theme === value;
                      return (
                        <button key={value} onClick={() => setTheme(value)}
                          className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl min-h-14 transition active:scale-[0.97] ${
                            selected ? "bg-primary/10 border-2 border-primary" : "bg-card card-shadow border-2 border-transparent"
                          }`}>
                          <Icon size={ICON_SIZE.lg} className={selected ? "text-primary" : "text-muted-foreground"} />
                          <div className="flex-1 text-left">
                            <p className={`text-body ${selected ? "text-primary font-semibold" : "text-foreground"}`}>{label}</p>
                            <p className="text-footnote text-muted-foreground">{desc}</p>
                          </div>
                          {selected && (
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={IOS_SPRING.precise}>
                              <Check size={20} className="text-primary" />
                            </motion.div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* DEFAULTS */}
              {activePage === "defaults" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="bg-card rounded-xl card-shadow p-4 space-y-4 mt-4">
                    <div>
                      <label className="text-caption-1 text-muted-foreground">{t("overload.label")}</label>
                      <select className="w-full bg-muted text-foreground rounded-lg px-3 py-3 text-body focus:outline-none mt-1 appearance-none">
                        <option>{t("overload.moderate")}</option>
                        <option>{t("overload.conservative")}</option>
                        <option>{t("overload.aggressive")}</option>
                      </select>
                    </div>
                    <div className="separator-ios" />
                    <div>
                      <label className="text-caption-1 text-muted-foreground">{t("nutrition.autoAdjust")}</label>
                      <select className="w-full bg-muted text-foreground rounded-lg px-3 py-3 text-body focus:outline-none mt-1 appearance-none">
                        <option>{t("overload.moderate")}</option>
                        <option>{t("overload.conservative")}</option>
                        <option>{t("overload.aggressive")}</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* LANGUAGE */}
              {activePage === "language" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="space-y-2">
                    {([
                      { value: "en" as const, flag: "🇬🇧", label: t("language.english"), desc: t("language.englishDesc") },
                      { value: "sr" as const, flag: "🇷🇸", label: t("language.serbian"), desc: t("language.serbianDesc") },
                    ]).map(({ value, flag, label, desc }) => {
                      const selected = language === value;
                      return (
                        <button key={value} onClick={() => setLanguage(value)}
                          className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl min-h-14 transition active:scale-[0.97] ${
                            selected ? "bg-primary/10 border-2 border-primary" : "bg-card card-shadow border-2 border-transparent"
                          }`}>
                          <span className="text-title-3" aria-hidden="true">{flag}</span>
                          <div className="flex-1 text-left">
                            <p className={`text-body ${selected ? "text-primary font-semibold" : "text-foreground"}`}>{label}</p>
                            <p className="text-footnote text-muted-foreground">{desc}</p>
                          </div>
                          {selected && (
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={IOS_SPRING.precise}>
                              <Check size={20} className="text-primary" />
                            </motion.div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* VACATION MODE */}
              {activePage === "vacation" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="bg-card rounded-xl card-shadow p-4">
                    <VacationModeCard />
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrainerProfile;
