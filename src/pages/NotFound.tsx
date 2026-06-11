import { logger } from "@/lib/logger";
import { useLocation, useNavigate } from "react-router-dom";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useEffect } from "react";
import { Home, ArrowLeft, Compass } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    logger.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      role="main"
      className="flex min-h-screen items-center justify-center bg-background-secondary px-6"
    >
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <Compass size={36} className="text-primary" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-large-title text-foreground">404</h1>
        <p className="mb-2 text-title-3 text-foreground">{t("notFound.title")}</p>
        <p className="mb-8 text-body text-muted-foreground">
          {t("notFound.description")}
        </p>
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => navigate("/home")}
            variant="cta"
            size="xl"
          >
            <Home size={ICON_SIZE.md} aria-hidden="true" />
            {t("notFound.goHome")}
          </Button>
          <Button
            onClick={() => navigate(-1)}
            variant="secondary"
            size="xl"
            className="bg-card hover:bg-card/90 card-shadow"
          >
            <ArrowLeft size={ICON_SIZE.md} aria-hidden="true" />
            {t("common.back")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
