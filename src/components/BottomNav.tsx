import { IOS_SPRING } from "@/lib/motion";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Dumbbell, UtensilsCrossed, TrendingUp, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";


const BottomNav = () => {
  const location = useLocation();
  const { t } = useLanguage();

  const tabs = [
    { path: "/home", icon: Home, label: t("nav.home") },
    { path: "/gym", icon: Dumbbell, label: t("nav.gym") },
    { path: "/food", icon: UtensilsCrossed, label: t("nav.food") },
    { path: "/progress", icon: TrendingUp, label: t("nav.progress") },
    { path: "/profile", icon: User, label: t("nav.profile") },
  ];

  // Apple-native: prikazuj BottomNav SAMO na 5 tab-root ruta. Svaki detail/editor
  // ("Back" screens) = bez nav-a (milestone, chat, workout, analysis, itd.)
  const tabRootPaths = ["/home", "/gym", "/food", "/progress", "/profile"];
  if (!tabRootPaths.includes(location.pathname)) return null;

  return (
    <>
      {/* Fade gradient overlay above nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-20 pointer-events-none z-40"
        style={{ background: "linear-gradient(to top, hsl(var(--background-secondary)) 0%, transparent 100%)" }}
      />
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 safe-bottom w-[calc(100%-32px)] max-w-[420px]">
        <nav className="liquid-glass-nav rounded-[28px] px-1.5 py-2">
          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient id="nav-active-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
                  className="relative flex-1 flex flex-col items-center gap-0.5 py-2 rounded-[22px] min-h-11"
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-[22px] liquid-glass-active"
                      transition={IOS_SPRING.snappy}
                    />
                  )}
                  <Icon
                    size={28}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className={`relative z-10 ${isActive ? "" : "text-muted-foreground"}`}
                    style={isActive ? { stroke: "url(#nav-active-gradient)" } : undefined}
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

export default BottomNav;
