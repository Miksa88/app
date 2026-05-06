// ============================================================================
// CycleTrackerStep — POSLEDNJI onboarding korak
// Spec: 02_NUTRITION_FLOW_MASTER.md Sekcija 2.2 (Hormonal_Aware_Mode)
// ============================================================================
//
// Spec citat: "Da bismo precizno uskladili tvoj metabolizam sa tvojim hormonima,
// unesi datum poslednjeg ciklusa." [Date picker] [Preskočiti za sada →]
//
// Aplikacija je iskljucivo za zene — ovo je USP. Ako klijentkinja preskoci,
// algoritam radi BEZ hormonalnih modifikatora i ona moze kasnije da aktivira
// Cycle Tracker kroz Profile.
// ============================================================================

import { motion, AnimatePresence } from 'framer-motion';
import { ICON_SIZE } from "@/lib/design-tokens";
import { Calendar, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { MOTION_DURATION } from "@/lib/motion";
import { Card } from "@/components/ui/card";

interface CycleTrackerStepProps {
  enabled: boolean;
  lastPeriodStart: string;          // YYYY-MM-DD ili ''
  onEnabledChange: (enabled: boolean) => void;
  onDateChange: (isoDate: string) => void;
}

const CycleTrackerStep = ({
  enabled,
  lastPeriodStart,
  onEnabledChange,
  onDateChange,
}: CycleTrackerStepProps) => {
  const { t } = useLanguage();

  // Locale fallback — ako prevod nije dodat, koristimo srpski default
  const tFallback = (key: string, fallback: string) => {
    const translated = t(key);
    return translated !== key ? translated : fallback;
  };

  return (
    <div className="pt-6 space-y-6">
      <Card className="p-5 flex gap-3 items-start">
        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
          <Sparkles size={ICON_SIZE.md} className="text-primary-foreground" />
        </div>
        <p className="text-subhead text-foreground/80 leading-relaxed">
          {tFallback(
            'onboarding.cycleExplain',
            'Hormonalna faza menja kako tvoje telo procesira hranu i regenerira se. Sa datumom poslednjeg ciklusa, algoritam dodaje carbs u lutealnoj fazi i smanjuje volumen treninga u menstrualnoj.',
          )}
        </p>
      </Card>

      <AnimatePresence mode="wait">
        {enabled ? (
          <motion.div
            key="enabled"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: MOTION_DURATION.base }}
            className="space-y-3"
          >
            <label className="block">
              <span className="text-footnote font-semibold uppercase tracking-wider text-muted-foreground">
                {tFallback('onboarding.lastPeriodLabel', 'Datum poslednjeg ciklusa')}
              </span>
              <Card className="mt-2 p-4 flex items-center gap-3">
                <Calendar size={ICON_SIZE.md} className="text-muted-foreground" />
                <input
                  type="date"
                  value={lastPeriodStart}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="flex-1 bg-transparent text-foreground text-body focus:outline-none"
                  autoFocus
                />
              </Card>
            </label>

            <button
              onClick={() => {
                onEnabledChange(false);
                onDateChange('');
              }}
              className="text-footnote text-muted-foreground underline underline-offset-2"
            >
              {tFallback('onboarding.cycleSkipNow', 'Preskočiti za sada')}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="disabled"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: MOTION_DURATION.base }}
            className="space-y-3"
          >
            <button
              onClick={() => onEnabledChange(true)}
              className="w-full bg-card rounded-2xl card-shadow p-5 flex items-center justify-between text-left min-h-[64px]"
            >
              <div>
                <p className="text-body font-semibold text-foreground">
                  {tFallback('onboarding.activateCycleTracker', 'Aktiviraj Cycle Tracker')}
                </p>
                <p className="text-footnote text-muted-foreground mt-0.5">
                  {tFallback(
                    'onboarding.cyclePrompt',
                    'Unesi datum poslednjeg ciklusa za personalizovan plan',
                  )}
                </p>
              </div>
              <Calendar size={20} className="text-primary shrink-0 ml-3" />
            </button>

            <p className="text-footnote text-muted-foreground text-center">
              {tFallback(
                'onboarding.cycleSkipFooter',
                'Možeš ovo aktivirati kasnije kroz Profil.',
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CycleTrackerStep;
