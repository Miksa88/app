// useExerciseNote — load/save per-client per-exercise note
//
// User-voice (10,841 votes): "Custom text notes per exercise" — klijentkinja
// može da napiše nešto o vežbi (forma, težina koja je radila, ono što treba
// pamtiti) i to vidi sledeći put kad opet izvodi tu vežbu.
//
// API:
//   const { note, save, isLoading, isSaving } = useExerciseNote(exerciseId);
// Save je debounced — pozovi na blur ili ručno; hook drži lokalni draft.

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useExerciseNote(exerciseId: string | null | undefined) {
  const { clientId } = useAuth();
  const [note, setNote] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const lastSavedRef = useRef<string>("");

  // Učitaj postojeću belešku kad se exercise promeni
  useEffect(() => {
    if (!clientId || !exerciseId) {
      setNote("");
      lastSavedRef.current = "";
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from("exercise_notes")
        .select("note")
        .eq("user_id", clientId)
        .eq("exercise_id", exerciseId)
        .maybeSingle();
      if (cancelled) return;
      const value = !error && data?.note ? data.note : "";
      setNote(value);
      lastSavedRef.current = value;
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clientId, exerciseId]);

  // Persist — upsert. Skip ako se nije menjalo od poslednjeg save-a.
  const save = async (next?: string): Promise<void> => {
    if (!clientId || !exerciseId) return;
    const value = (next ?? note).trim();
    if (value === lastSavedRef.current) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("exercise_notes")
      .upsert(
        { user_id: clientId, exercise_id: exerciseId, note: value },
        { onConflict: "user_id,exercise_id" },
      );
    if (!error) lastSavedRef.current = value;
    setIsSaving(false);
  };

  return { note, setNote, save, isLoading, isSaving };
}
