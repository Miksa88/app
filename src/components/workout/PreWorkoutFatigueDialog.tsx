// ============================================================================
// PreWorkoutFatigueDialog — jedno pitanje pre treninga
// ============================================================================
//
// "Kako se osećaš?" — dva tap-a:
//   😴 Umorna   → algoritam forsira MAINTAIN (bez progressive overload)
//   💪 Odmorna  → standardni progressive overload
//
// Klijent NE razmišlja o RPE/recovery — samo bira jedno lice. Algoritam radi
// sve u pozadini. Daily check-in je uklonjen — ovo je jedini dnevni signal.
//
// UX: izbor zatvara dijalog ODMAH (optimistički) — save ide u pozadini,
// toast samo na grešku. Parent (ActiveWorkout) preko `fatigueDialogResolved`
// garantuje da se dijalog ne otvara ponovo u istom mount-u.
// ============================================================================

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TAP_SCALE } from '@/lib/motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { saveFatigueSignal } from '@/services/biofeedbackService';
import { toast } from 'sonner';

export interface PreWorkoutFatigueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  /** Callback kad korisnik odgovori — parent može da proceedije u workout */
  onAnswered: (fatigued: boolean) => void;
  /** Posle USPEŠNOG snimanja u DB — parent osvežava user status */
  onSaved?: () => void;
}

export default function PreWorkoutFatigueDialog({
  open,
  onOpenChange,
  clientId,
  onAnswered,
  onSaved,
}: PreWorkoutFatigueDialogProps) {
  const { t } = useLanguage();
  // Guard protiv duplog tap-a u prozoru pre nego što se dijalog zatvori
  const answeredRef = useRef(false);

  // Reset guard-a pri svakom novom otvaranju (novi dan / novi mount)
  useEffect(() => {
    if (open) answeredRef.current = false;
  }, [open]);

  const handleAnswer = (fatigued: boolean) => {
    if (answeredRef.current) return;
    answeredRef.current = true;

    // Optimistički: zatvori odmah — korisnica ne čeka mrežu.
    onAnswered(fatigued);
    onOpenChange(false);

    // Save u pozadini; toast samo na grešku.
    void saveFatigueSignal(clientId, fatigued)
      .then(() => onSaved?.())
      .catch((err: unknown) => {
        toast.error(
          err instanceof Error ? err.message : t('workout.fatigueSaveError'),
        );
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-headline">
            {t('workout.fatigueTitle')}
          </DialogTitle>
          <DialogDescription className="text-center text-footnote text-muted-foreground">
            {t('workout.fatigueDesc')}
          </DialogDescription>
        </DialogHeader>

        {/* Neutralna vizuelna težina za oba — bez nudge-a ka "Odmorna" */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <motion.button
            whileTap={{ scale: TAP_SCALE.primary }}
            onClick={() => handleAnswer(true)}
            aria-label={t('workout.fatigueTiredAria')}
            className="min-h-[120px] rounded-2xl bg-card card-shadow border-2 border-transparent transition-all flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="text-4xl" aria-hidden="true">😴</span>
            <span className="text-subhead font-semibold text-foreground">
              {t('workout.fatigueTired')}
            </span>
            <span className="text-caption-2 text-muted-foreground px-2 text-center">
              {t('workout.fatigueTiredHint')}
            </span>
          </motion.button>

          <motion.button
            whileTap={{ scale: TAP_SCALE.primary }}
            onClick={() => handleAnswer(false)}
            aria-label={t('workout.fatigueRestedAria')}
            className="min-h-[120px] rounded-2xl bg-card card-shadow border-2 border-transparent transition-all flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="text-4xl" aria-hidden="true">💪</span>
            <span className="text-subhead font-semibold text-foreground">
              {t('workout.fatigueRested')}
            </span>
            <span className="text-caption-2 text-muted-foreground px-2 text-center">
              {t('workout.fatigueRestedHint')}
            </span>
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
