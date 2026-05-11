-- Migracija: exercise_notes — per-client per-exercise persistent notes
-- Spec referenca: ActiveWorkout UX — "Custom text notes per exercise" (10,841 votes)
-- Commit: feature/exercise-notes

-- ============================================================================
-- KORAK 1: CREATE TABLE
-- ============================================================================

CREATE TABLE public.exercise_notes (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID        NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  note        TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT exercise_notes_user_exercise_unique UNIQUE (user_id, exercise_id)
);

COMMENT ON TABLE public.exercise_notes IS
  'One free-text note per client per exercise. Persists across sessions. '
  'Client writes/edits in ActiveWorkout; note surfaces on next visit to the same exercise.';

-- ============================================================================
-- KORAK 2: INDEXES
-- ============================================================================

-- Primary lookup: fetch note for a specific (user, exercise) pair — O(1) via UNIQUE index.
-- The UNIQUE constraint above already creates an index, so we name it explicitly here
-- only for the hot-path lookup pattern used by the app.
CREATE INDEX idx_exercise_notes_user_exercise
  ON public.exercise_notes (user_id, exercise_id);

-- ============================================================================
-- KORAK 3: updated_at TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_exercise_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exercise_notes_set_timestamp
  BEFORE UPDATE ON public.exercise_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_exercise_notes_timestamp();

-- ============================================================================
-- KORAK 4: RLS
-- ============================================================================

ALTER TABLE public.exercise_notes ENABLE ROW LEVEL SECURITY;

-- Client reads own notes only.
CREATE POLICY "Klijentkinja čita svoje exercise_notes"
  ON public.exercise_notes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Client inserts own notes only (no row smuggling).
CREATE POLICY "Klijentkinja pravi svoje exercise_notes"
  ON public.exercise_notes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Client updates own notes only.
CREATE POLICY "Klijentkinja menja svoje exercise_notes"
  ON public.exercise_notes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Client deletes own notes only.
CREATE POLICY "Klijentkinja briše svoje exercise_notes"
  ON public.exercise_notes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trainers can read all clients' exercise notes (read-only coaching visibility).
CREATE POLICY "Treneri čitaju sve exercise_notes"
  ON public.exercise_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );
