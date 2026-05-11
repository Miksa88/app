// ============================================================================
// useUndoableAction — universal undo wrapper for destructive actions
// V3 audit §9 P0 #6 — citat: "It is 2025, why does the number one training
// software not have an undo button?"
// ============================================================================
//
// Pattern (optimistic):
//   1. Optimistically apply the action locally (mutation.mutate)
//   2. Show a Sonner toast with "Vrati" action button + 5s timer
//   3. If user taps Vrati BEFORE the toast dismisses → run revert callback
//   4. If toast dismisses without revert → action is final
//
// Example usage:
//   const undo = useUndoableAction();
//   undo.run({
//     title: t("clients.archivedSuccess"),
//     apply: () => archiveMutation.mutate(clientId),
//     revert: () => unarchiveMutation.mutate(clientId),
//   });
// ============================================================================

import { useCallback } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export interface UndoableActionConfig {
  /** Title shown in the toast (e.g. "Klijent arhiviran"). */
  title: string;
  /** Optional description below title. */
  description?: string;
  /** Runs immediately when the action fires (optimistic apply). */
  apply: () => void | Promise<void>;
  /** Runs if user taps Vrati within the duration window. */
  revert: () => void | Promise<void>;
  /** Toast duration in ms. Default 5000. */
  durationMs?: number;
}

export function useUndoableAction() {
  const { t } = useLanguage();

  const run = useCallback(
    async (config: UndoableActionConfig) => {
      const { title, description, apply, revert, durationMs = 5000 } = config;
      try {
        await apply();
      } catch (err) {
        toast.error(String((err as Error).message ?? err));
        return;
      }
      toast(title, {
        description,
        duration: durationMs,
        action: {
          label: t("common.undo"),
          onClick: () => {
            void Promise.resolve(revert()).catch((err) => {
              toast.error(String((err as Error).message ?? err));
            });
          },
        },
      });
    },
    [t],
  );

  return { run };
}
