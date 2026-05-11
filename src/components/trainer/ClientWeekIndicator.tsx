// ============================================================================
// ClientWeekIndicator — pocetnici.md week N/M indicator za trener dashboard
// ============================================================================
//
// Prikazuje "Mezo M, Nedelja N/7" + sledeći milestone (Overreach W6 ili
// Deload W7). Trener može da scan-uje listu klijentkinja i odmah vidi gde je
// svako u 7-week ciklusu.
//
// Pure presentational. Konzumira:
//   - mesocycleIndex
//   - currentMicrocycleIndex
//   - totalWeeksInMesocycle
// ============================================================================

import { Calendar, Flame, Snowflake } from 'lucide-react';

interface ClientWeekIndicatorProps {
  mesocycleIndex: number;            // 1-based
  currentMicrocycleIndex: number;    // 0-based
  totalWeeksInMesocycle: number;     // 7 default
  hasHashimoto?: boolean;
  className?: string;
}

export default function ClientWeekIndicator({
  mesocycleIndex,
  currentMicrocycleIndex,
  totalWeeksInMesocycle,
  hasHashimoto,
  className = '',
}: ClientWeekIndicatorProps) {
  const weekN = currentMicrocycleIndex + 1;
  const isOverreach = currentMicrocycleIndex === totalWeeksInMesocycle - 2;
  const isDeload = currentMicrocycleIndex === totalWeeksInMesocycle - 1;

  let phaseLabel = 'Akumulacija';
  let icon = <Calendar size={16} className="text-muted-foreground" />;
  let toneClass = 'text-foreground';

  if (currentMicrocycleIndex === 0) {
    phaseLabel = 'Kalibracija';
  } else if (isOverreach) {
    phaseLabel = hasHashimoto ? 'Overreach (RPE 8 cap)' : 'Overreach';
    icon = <Flame size={16} className="text-warning" />;
    toneClass = 'text-warning';
  } else if (isDeload) {
    phaseLabel = 'Deload';
    icon = <Snowflake size={16} className="text-info" />;
    toneClass = 'text-info';
  }

  // Next milestone hint
  let nextMilestone = '';
  if (!isOverreach && !isDeload) {
    const weeksToOverreach = (totalWeeksInMesocycle - 2) - currentMicrocycleIndex;
    if (weeksToOverreach > 0) {
      nextMilestone = `Overreach za ${weeksToOverreach} ned`;
    }
  } else if (isOverreach) {
    nextMilestone = 'Deload sledeća nedelja';
  } else if (isDeload) {
    nextMilestone = 'Nedelja 8 evaluacija → novi mezo';
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {icon}
      <div className="flex flex-col">
        <span className={`text-footnote font-semibold ${toneClass}`}>
          Mezo {mesocycleIndex}, Nedelja {weekN}/{totalWeeksInMesocycle} · {phaseLabel}
        </span>
        {nextMilestone && (
          <span className="text-caption-2 text-muted-foreground">
            {nextMilestone}
          </span>
        )}
      </div>
    </div>
  );
}
