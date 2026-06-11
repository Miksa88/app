import { motion } from "framer-motion";
import { IOS_SWITCH } from "@/lib/design-tokens";
import { IOS_SPRING } from "@/lib/motion";
import { useLanguage } from "@/contexts/LanguageContext";
import QuietHoursPicker from "@/components/profile/QuietHoursPicker";

// Notifikacije — sub-page izdvojen iz Profile.tsx (verbatim JSX, state ostaje u Profile)
type NotifCategories = {
  workout: boolean;
  meals: boolean;
  chat: boolean;
  system: boolean;
  achievement: boolean;
};

interface NotificationsPageProps {
  notifs: NotifCategories;
  toggleNotif: (key: keyof NotifCategories) => void;
}

const NotificationsPage = ({ notifs, toggleNotif }: NotificationsPageProps) => {
  const { t } = useLanguage();

  return (
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
  );
};

export default NotificationsPage;
