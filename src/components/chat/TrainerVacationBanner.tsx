// ============================================================================
// TrainerVacationBanner — vidljiv klijentu kad je trener na vacation
// V3 §12
// ============================================================================

import { Plane } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotificationPreferences } from "@/hooks/useUserPreferences";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getActiveVacation,
} from "@/services/userPreferencesService";

interface Props {
  trainerId: string | null;
}

const TrainerVacationBanner = ({ trainerId }: Props) => {
  const { t } = useLanguage();
  const { data: prefs = DEFAULT_NOTIFICATION_PREFERENCES } =
    useNotificationPreferences(trainerId);

  const active = getActiveVacation(prefs);
  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-5 mb-3 rounded-2xl bg-info/10 border border-info/30 p-3 flex items-start gap-3"
    >
      <div className="w-8 h-8 rounded-xl bg-info/15 flex items-center justify-center shrink-0">
        <Plane size={16} className="text-info" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-subhead font-semibold text-foreground">
          {t("chat.trainerOnVacation")}
        </p>
        {active.until && (
          <p className="text-caption-1 text-muted-foreground">
            {t("chat.trainerOnVacationUntil").replace("{date}", active.until)}
          </p>
        )}
        {active.message && (
          <p className="text-caption-1 text-muted-foreground italic mt-1">
            "{active.message}"
          </p>
        )}
      </div>
    </div>
  );
};

export default TrainerVacationBanner;
