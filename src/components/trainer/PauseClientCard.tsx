// ============================================================================
// PauseClientCard — trener-side Pause/Freeze klijenta
// V3 §10 — "Pause/Freeze klijenta — Saved client = saved revenue"
// ============================================================================

import { Loader2, Pause, Play, Snowflake } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useHaptic } from "@/hooks/useHaptic";
import GradientButton from "@/components/GradientButton";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import {
  useClientPause,
  usePauseClient,
  useResumeClient,
} from "@/hooks/useClientPause";

interface Props {
  clientId: string;
}

const PauseClientCard = ({ clientId }: Props) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const haptic = useHaptic();
  const { data: pauseState, isLoading } = useClientPause(clientId);
  const pauseMutation = usePauseClient(clientId);
  const resumeMutation = useResumeClient(clientId);
  const undo = useUndoableAction();

  const [showForm, setShowForm] = useState(false);
  const [pauseUntil, setPauseUntil] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const isPaused = !!pauseState;

  const onSubmitPause = () => {
    if (!user?.id || pauseMutation.isPending) return;
    haptic("medium");
    void undo.run({
      title: t("trainer.pause.statusPaused"),
      description: pauseUntil
        ? t("trainer.pause.until").replace("{date}", pauseUntil)
        : undefined,
      apply: () =>
        new Promise<void>((resolve, reject) => {
          pauseMutation.mutate(
            {
              trainerId: user.id,
              pauseUntil: pauseUntil || null,
              reason: reason || null,
            },
            {
              onSuccess: () => {
                setShowForm(false);
                setPauseUntil("");
                setReason("");
                resolve();
              },
              onError: (e) => reject(e),
            },
          );
        }),
      revert: () =>
        new Promise<void>((resolve, reject) => {
          resumeMutation.mutate(undefined, {
            onSuccess: () => resolve(),
            onError: (e) => reject(e),
          });
        }),
    });
  };

  const onResume = () => {
    if (resumeMutation.isPending) return;
    haptic("medium");
    resumeMutation.mutate();
  };

  return (
    <section className="space-y-3" aria-labelledby="pause-card-title">
      <div className="flex items-center gap-2">
        <Snowflake size={16} className="text-muted-foreground" aria-hidden="true" />
        <h3 id="pause-card-title" className="text-headline font-semibold text-foreground">
          {t("trainer.pause.title")}
        </h3>
      </div>
      <p className="text-footnote text-muted-foreground">
        {t("trainer.pause.hint")}
      </p>

      {isLoading ? (
        <div className="h-12 bg-muted/40 rounded-xl animate-pulse" />
      ) : isPaused ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-warning/10 border border-warning/30">
            <div className="flex-1 min-w-0">
              <p className="text-subhead font-semibold text-warning">
                {t("trainer.pause.statusPaused")}
              </p>
              {pauseState?.pause_until && (
                <p className="text-caption-1 text-muted-foreground">
                  {t("trainer.pause.until").replace("{date}", pauseState.pause_until)}
                </p>
              )}
              {pauseState?.reason && (
                <p className="text-caption-1 text-muted-foreground italic mt-0.5 truncate">
                  {pauseState.reason}
                </p>
              )}
            </div>
          </div>
          <GradientButton
            onClick={onResume}
            disabled={resumeMutation.isPending}
            loading={resumeMutation.isPending}
            size="lg"
            className="w-full"
          >
            <Play size={16} aria-hidden="true" />
            {t("trainer.pause.actionResume")}
          </GradientButton>
        </div>
      ) : showForm ? (
        <div className="space-y-3">
          <div>
            <label className="text-caption-2 text-muted-foreground mb-1.5 block">
              {t("trainer.pause.resumeOn")}
            </label>
            <input
              type="date"
              value={pauseUntil}
              onChange={(e) => setPauseUntil(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-body min-h-12 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-caption-2 text-muted-foreground mt-1">
              {t("trainer.pause.indefinite")}
            </p>
          </div>
          <div>
            <label className="text-caption-2 text-muted-foreground mb-1.5 block">
              {t("trainer.pause.reason")}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-body resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder=""
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setPauseUntil("");
                setReason("");
              }}
              className="py-3 rounded-xl bg-card border border-border text-foreground text-body font-semibold min-h-12"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={onSubmitPause}
              disabled={pauseMutation.isPending}
              className="py-3 rounded-xl bg-warning/15 border border-warning/30 text-warning text-body font-semibold flex items-center justify-center gap-2 min-h-12 disabled:opacity-40"
            >
              {pauseMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Pause size={16} aria-hidden="true" />
              )}
              {t("trainer.pause.actionPause")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-xl bg-card border border-border text-foreground text-body font-semibold flex items-center justify-center gap-2 min-h-12 hover:bg-muted/40"
        >
          <Pause size={16} aria-hidden="true" />
          {t("trainer.pause.actionPause")}
        </button>
      )}
    </section>
  );
};

export default PauseClientCard;
