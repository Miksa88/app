import { useLanguage } from "@/contexts/LanguageContext";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

/**
 * Skip-to-content link za keyboard korisnike.
 * Prvi tab-stop na stranici — omogućava preskakanje nav-a do glavnog sadržaja.
 * Vidljiv samo kad je fokusiran. WCAG 2.1 SC 2.4.1 "Bypass Blocks".
 */
export const SkipToContent = () => {
  const { t } = useLanguage();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-toast focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-xl focus:shadow-elevated focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {t("common.skipToContent")}
    </a>
  );
};

/**
 * ScrollManager — aktivira scroll restoration hook.
 * Mora biti unutar BrowserRouter jer koristi useLocation/useNavigationType.
 */
export const ScrollManager = () => {
  useScrollRestoration();
  return null;
};
