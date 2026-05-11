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
// ============================================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TAP_SCALE } from '@/lib/motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PreWorkoutFatigueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  /** Callback kad korisnik odgovori — parent može da proceedije u workout */
  onAnswered: (fatigued: boolean) => void;
}

async function saveFatigueSignal(clientId: string, fatigued: boolean): Promise<void> {
  // Direct patch na user_status.status_json — bio.preWorkoutFatigue + answeredAt.
  const { data, error: readErr } = await supabase
    .from('user_status')
    .select('status_json')
    .eq('client_id', clientId)
    .single();
  if (readErr) throw new Error(`saveFatigueSignal read: ${readErr.message}`);

  const status = (data?.status_json ?? {}) as Record<string, unknown>;
  const bio = (status.bio ?? {}) as Record<string, unknown>;
  const newStatus = {
    ...status,
    bio: {
      ...bio,
      preWorkoutFatigue: fatigued,
      preWorkoutFatigueAnsweredAt: new Date().toISOString(),
    },
  };

  const { error: writeErr } = await supabase
    .from('user_status')
    .update({ status_json: newStatus, last_updated_at: new Date().toISOString() })
    .eq('client_id', clientId);
  if (writeErr) throw new Error(`saveFatigueSignal write: ${writeErr.message}`);
}

export default function PreWorkoutFatigueDialog({
  open,
  onOpenChange,
  clientId,
  onAnswered,
}: PreWorkoutFatigueDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleAnswer = async (fatigued: boolean) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await saveFatigueSignal(clientId, fatigued);
      onAnswered(fatigued);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Greška pri snimanju');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-headline">
            Kako se osećaš?
          </DialogTitle>
          <DialogDescription className="text-center text-footnote text-muted-foreground">
            Pre nego što počneš trening — samo da algoritam zna.
          </DialogDescription>
        </DialogHeader>

        {/* Neutralna vizuelna težina za oba — bez nudge-a ka "Odmorna" */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <motion.button
            whileTap={{ scale: TAP_SCALE.primary }}
            onClick={() => handleAnswer(true)}
            disabled={submitting}
            aria-label="Umorna — lakši trening danas"
            className="min-h-[120px] rounded-2xl bg-card card-shadow border-2 border-transparent transition-all flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-4xl" aria-hidden="true">😴</span>
            <span className="text-subhead font-semibold text-foreground">
              Umorna
            </span>
            <span className="text-caption-2 text-muted-foreground px-2 text-center">
              Lakši trening
            </span>
          </motion.button>

          <motion.button
            whileTap={{ scale: TAP_SCALE.primary }}
            onClick={() => handleAnswer(false)}
            disabled={submitting}
            aria-label="Odmorna — standardni trening"
            className="min-h-[120px] rounded-2xl bg-card card-shadow border-2 border-transparent transition-all flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-4xl" aria-hidden="true">💪</span>
            <span className="text-subhead font-semibold text-foreground">
              Odmorna
            </span>
            <span className="text-caption-2 text-muted-foreground px-2 text-center">
              Standardni
            </span>
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
