import { Flame, Footprints, Dumbbell, Home, UtensilsCrossed, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// ============================================================================
// PhoneHeroMockup — hero mockup telefona na Login ekranu.
//
// Zamenjuje stari `iphone-mockup.png` koji je imao POTPUNO prazan beli ekran
// (izgledao je slomljeno). Umesto slike: čist DOM — okvir telefona + statički
// mini "Home" ekran sa fiksnim mock podacima. Pošto koristi design tokene
// (bg-card, gradient-primary, text-*) i i18n home.* ključeve, uvek je u sync
// sa temom (dark/light), brendom i jezikom — bez asset maintenance-a.
//
// Dekorativan je: aria-hidden + pointer-events-none, screen reader korisnici
// dobijaju poruku kroz tagline ispod, ne kroz lažne podatke.
// ============================================================================

/** Mini stat pločica unutar mock ekrana (Kalorije / Koraci) */
const MockStatTile = ({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
}) => (
  <div className="bg-card rounded-xl p-2 flex flex-col gap-0.5 card-shadow">
    <div className="flex items-center gap-1 text-muted-foreground">
      {icon}
      <span className="text-caption-2 leading-none">{label}</span>
    </div>
    <p className="text-footnote font-bold text-foreground leading-tight">
      {value}
      {unit && <span className="text-caption-2 font-medium text-muted-foreground"> {unit}</span>}
    </p>
  </div>
);

const PhoneHeroMockup = () => {
  const { t } = useLanguage();

  return (
    <div aria-hidden="true" className="relative select-none pointer-events-none">
      {/* Brend glow iza telefona — vezuje hero za gradient identitet */}
      <div className="absolute -inset-8 gradient-primary opacity-20 blur-3xl rounded-full" />

      {/* Okvir telefona (bezel prati foreground token — taman u light, svetao u dark temi) */}
      <div className="relative w-44 aspect-[9/19] rounded-[2.5rem] border-4 border-foreground/80 bg-background-secondary shadow-elevated overflow-hidden">
        {/* Mini Home ekran */}
        <div className="absolute inset-0 flex flex-col px-2.5 pt-2 pb-2">
          {/* Status bar + Dynamic Island */}
          <div className="relative flex items-center justify-between mb-2">
            <span className="text-caption-2 font-semibold text-foreground pl-1">9:41</span>
            <div className="absolute left-1/2 -translate-x-1/2 w-12 h-3.5 rounded-full bg-foreground/80" />
            <div className="flex items-center gap-0.5 pr-1">
              <div className="w-2.5 h-1.5 rounded-sm bg-foreground/70" />
              <div className="w-3.5 h-1.5 rounded-sm bg-foreground/40" />
            </div>
          </div>

          {/* Pozdrav */}
          <p className="text-caption-2 text-muted-foreground uppercase tracking-wider leading-none mb-0.5">
            {t("home.todayLabel")}
          </p>
          <p className="text-footnote font-bold text-foreground mb-2">{t("home.goodMorning")}</p>

          {/* Stat pločice — kalorije + koraci */}
          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            <MockStatTile
              icon={<Flame size={10} className="text-primary shrink-0" />}
              label={t("home.calories")}
              value="1.430"
              unit="kcal"
            />
            <MockStatTile
              icon={<Footprints size={10} className="text-primary shrink-0" />}
              label={t("home.steps")}
              value="6.540"
            />
          </div>

          {/* Današnji trening — kartica sa gradient CTA */}
          <div className="bg-card rounded-xl p-2.5 card-shadow mb-1.5">
            <p className="text-caption-2 text-muted-foreground uppercase tracking-wider leading-none mb-1">
              {t("home.todaysWorkoutLabel")}
            </p>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                <Dumbbell size={12} className="text-primary-foreground" />
              </div>
              <p className="text-caption-1 font-semibold text-foreground leading-tight">
                {t("home.workoutDefault")} A
              </p>
            </div>
            {/* Progres serija — 3 popunjene od 5 */}
            <div className="flex gap-1">
              <div className="h-1 flex-1 rounded-full gradient-primary" />
              <div className="h-1 flex-1 rounded-full gradient-primary" />
              <div className="h-1 flex-1 rounded-full gradient-primary" />
              <div className="h-1 flex-1 rounded-full bg-muted" />
              <div className="h-1 flex-1 rounded-full bg-muted" />
            </div>
          </div>

          {/* Obroci — sažeta kartica */}
          <div className="bg-card rounded-xl p-2.5 card-shadow flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <UtensilsCrossed size={10} className="text-primary shrink-0" />
              <span className="text-caption-2 text-muted-foreground">{t("home.mealsLabel")}</span>
            </div>
            <span className="text-caption-2 font-bold text-foreground">2/4</span>
          </div>

          {/* Spacer + mini bottom nav */}
          <div className="flex-1" />
          <div className="flex items-center justify-around pt-1.5 border-t border-border/60">
            <Home size={12} className="text-primary" />
            <Dumbbell size={12} className="text-muted-foreground/60" />
            <UtensilsCrossed size={12} className="text-muted-foreground/60" />
            <User size={12} className="text-muted-foreground/60" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneHeroMockup;
