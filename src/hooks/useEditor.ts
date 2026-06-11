// ============================================================================
// useEditor — zajednički hook za trainer editore (Program / Workout / Nutrition)
// ============================================================================
//
// Pokriva genuinly-shared pattern sva tri editora:
//   1. Rezolucija ID-a iz rute: "new" / bez ID-a → nov entitet,
//      `default-*` → fork iz hardkodirane master liste (save pravi NOVI red),
//      ostalo → učitavanje postojećeg reda iz DB.
//   2. Hidracija lokalnog state-a kada se izvor (existing ili master) pojavi.
//   3. Dirty tracking — baseline fingerprint se snima posle hidracije,
//      `isDirty` poredi trenutni fingerprint sa baseline-om.
//   4. Save flow — validacija imena, upsert, success/error toast, navigacija.
//
// NE pokriva drag-reorder: Program reorder-uje scoped per mezo blok, Workout
// per sekciju — logika nije identična pa se NE izvlači (no force-fit).
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

// ----------------------------------------------------------------------------
// resolveEditorParams — čista funkcija (ne hook) da editor može da izračuna
// queryId PRE poziva svog data hook-a (useProgram/useWorkout/...).
// ----------------------------------------------------------------------------

export interface EditorParams {
  /** `default-master-*` ID → fork iz master template liste */
  isDefault: boolean;
  /** ID master template-a bez `default-` prefiksa (null ako nije master) */
  defaultSourceId: string | null;
  /** true → save pravi NOVI red (nov entitet ili fork master template-a) */
  isNew: boolean;
  /** ID za data hook — null kada nema šta da se učita iz DB */
  queryId: string | null;
}

export function resolveEditorParams(id: string | undefined): EditorParams {
  const isDefault = !!id?.startsWith("default-");
  const defaultSourceId = isDefault ? id!.replace(/^default-/, "") : null;
  const isNew = !id || id === "new" || isDefault;
  return { isDefault, defaultSourceId, isNew, queryId: isNew ? null : id! };
}

// ----------------------------------------------------------------------------
// useEditor
// ----------------------------------------------------------------------------

export interface UseEditorOptions<TExisting, TMaster> {
  /** Postojeći red iz DB (react-query data) */
  existing: TExisting | null | undefined;
  /** Master template iz hardkodirane liste (fork izvor) */
  master: TMaster | null | undefined;
  /** Hidracija lokalnog state-a iz izvora — poziva se kad se izvor pojavi */
  hydrate: (src: TExisting | TMaster) => void;
  /** Trenutna vrednost imena (za validaciju pri save-u) */
  name: string;
  /**
   * Fingerprint trenutnog editor state-a (serializable objekat).
   * Koristi se za isDirty — baseline se snima posle hidracije.
   */
  fingerprint: unknown;
  /** Persist — upsert mutacija (baca grešku pri neuspehu) */
  persist: () => Promise<unknown>;
  /** Toast naslov pri kreiranju novog entiteta */
  createdTitle: string;
  /** Toast naslov pri snimanju postojećeg */
  savedTitle: string;
  /** Fallback naslov error toast-a kada greška nije Error instanca */
  saveFailedTitle?: string;
  /** Navigacija posle uspešnog save-a */
  afterSave: () => void;
  /** true → save pravi novi red (iz resolveEditorParams) */
  isNew: boolean;
}

export interface UseEditorResult {
  /** Validira ime + upsert + toast + navigacija */
  handleSave: () => Promise<void>;
  /** Validacija imena bez save-a (npr. Assign CTA u ProgramEditor-u) */
  validateName: () => boolean;
  /** Da li je editor state promenjen u odnosu na hidrirani baseline */
  isDirty: boolean;
}

export function useEditor<TExisting, TMaster>({
  existing,
  master,
  hydrate,
  name,
  fingerprint,
  persist,
  createdTitle,
  savedTitle,
  saveFailedTitle,
  afterSave,
  isNew,
}: UseEditorOptions<TExisting, TMaster>): UseEditorResult {
  const { t } = useLanguage();
  const { toast } = useToast();

  // hydrate u ref-u — effect ne sme da se re-trigger-uje na novu closure referencu
  const hydrateRef = useRef(hydrate);
  hydrateRef.current = hydrate;

  // Tick koji označava da treba presnimiti baseline fingerprint.
  // Inicijalno 0 → baseline se snima i za nov entitet (početni prazan state).
  const [baselineTick, setBaselineTick] = useState(0);
  const [baseline, setBaseline] = useState<string | null>(null);
  const currentFp = JSON.stringify(fingerprint);
  const fpRef = useRef(currentFp);
  fpRef.current = currentFp;

  // Hidracija — kada DB red ili master template postanu dostupni.
  // setState pozivi iz hydrate() i setBaselineTick se batch-uju u isti commit,
  // pa baseline effect ispod vidi VEĆ hidrirani fingerprint.
  useEffect(() => {
    const src = existing ?? master;
    if (!src) return;
    hydrateRef.current(src);
    setBaselineTick((tick) => tick + 1);
  }, [existing, master]);

  // Snapshot baseline-a — posle mount-a i posle svake hidracije.
  useEffect(() => {
    setBaseline(fpRef.current);
  }, [baselineTick]);

  const isDirty = baseline !== null && baseline !== currentFp;

  const validateName = () => {
    if (!name.trim()) {
      toast({ title: t("training.nameRequired"), variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateName()) return;
    try {
      await persist();
      toast({ title: isNew ? createdTitle : savedTitle });
      afterSave();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : (saveFailedTitle ?? "Save failed"),
        variant: "destructive",
      });
    }
  };

  return { handleSave, validateName, isDirty };
}
