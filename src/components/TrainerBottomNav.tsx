import { IOS_SPRING } from "@/lib/motion";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Users, Dumbbell, UtensilsCrossed, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";


const TrainerBottomNav = () => {
  const location = useLocation();
  const { t } = useLanguage();

  const tabs = [
    { path: "/trainer", icon: Home, label: t("nav.home") },
    { path: "/trainer/clients", icon: Users, label: t("clients.title") },
    { path: "/trainer/training", icon: Dumbbell, label: t("nav.training") },
    { path: "/trainer/nutrition", icon: UtensilsCrossed, label: t("nutrition.title") },
    { path: "/trainer/messages", icon: MessageCircle, label: t("nav.messages") },
  ];

  // Apple-native pattern: svaki "Back" screen sakriva BottomNav (uniforma kroz app).
  // Prikazuje se samo na 5 tab-root ruta: /trainer, /trainer/clients, /trainer/training,
  // /trainer/nutrition, /trainer/messages. Sve ostalo = detail/editor → nema nav-a.
  const tabRootPaths = ["/trainer", "/trainer/clients", "/trainer/training", "/trainer/nutrition", "/trainer/messages"];
  if (!location.pathname.startsWith("/trainer")) return null;
  if (!tabRootPaths.includes(location.pathname)) return null;
  // Hide when in active chat (detected by query or state - we use a data attribute approach)
  if (location.pathname === "/trainer/messages" && document.querySelector('[data-trainer-chat-active="true"]')) return null;

  return (
    <>
      {/* Fade gradient overlay above nav. z-30 (ispod sheet z-50) tako da bottom sheets pokrivaju. */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-20 pointer-events-none z-30"
        style={{ background: "linear-gradient(to top, hsl(var(--background-secondary)) 0%, transparent 100%)" }}
      />
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-40 safe-bottom w-[calc(100%-32px)] max-w-[420px]">
        <nav className="liquid-glass-nav rounded-full px-1.5 py-2" aria-label={t("a11y.trainerNav")}>
          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient id="trainer-nav-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--secondary))" />
              </linearGradient>
            </defs>
          </svg>
          <div className="flex items-center">
            {tabs.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <NavLink
                  key={path}
                  to={path}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={label}
                  className="relative flex-1 flex flex-col items-center gap-0.5 py-2 rounded-full min-h-11"
                >
                  {isActive && (
                    <motion.div
                      layoutId="trainer-nav-active-pill"
                      className="absolute inset-0 rounded-full liquid-glass-active"
                      transition={IOS_SPRING.snappy}
                    />
                  )}
                  <Icon
                    size={28}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className={`relative z-10 ${isActive ? "" : "text-muted-foreground"}`}
                    style={isActive ? { stroke: "url(#trainer-nav-gradient)" } : undefined}
                    aria-hidden="true"
                  />
                  <span
                    className={`relative z-10 text-caption-2 leading-tight ${
                      isActive ? "gradient-text font-semibold" : "text-muted-foreground font-medium"
                    }`}
                  >
                    {label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
};

export default TrainerBottomNav;
