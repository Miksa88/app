-- Migracija: workouts, programs, client_notes — trainer UI persistence
-- Spec referenca: Wire-up phase (post IT-22) — trainer-side UIs
-- Commit: wire-up

-- ============================================================================
-- KORAK 1: CREATE TABLE workouts
-- ============================================================================
-- Concrete workout sessions authored by the trainer, reusable across programs.
-- DISTINCT from session_templates (biological skeleton with movementPattern
-- slots used by the program generator). Workouts hold named sections with
-- concrete exercises (sets/reps/weight/rest).

CREATE TABLE public.workouts (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  description   TEXT,
  -- Array of { id, name, type: 'regular'|'warmup'|'cooldown'|'superset'|'circuit'|'amrap'|'interval',
  --            exercises: [{ id, exerciseId, name, sets, reps, weight, rest, notes, order }] }
  sections      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  is_archived   BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workouts IS
  'Trainer-authored concrete workout sessions with sections and exercises. '
  'Reusable across programs. Distinct from session_templates (biological skeleton).';

COMMENT ON COLUMN public.workouts.sections IS
  'JSONB array of { id, name, type, exercises: [{ id, exerciseId, name, sets, reps, weight, rest, notes, order }] }. '
  'type: regular | warmup | cooldown | superset | circuit | amrap | interval.';

-- ============================================================================
-- KORAK 2: CREATE TABLE programs
-- ============================================================================
-- Multi-day workout schedules. Trainer assigns to a client. workout_days
-- references workouts by id in JSON but NO FK is enforced — allows draft days
-- where workout hasn't been created yet, and survives workout deletion gracefully.

CREATE TABLE public.programs (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  description   TEXT,
  type          TEXT        NOT NULL CHECK (type IN ('fixed', 'calendar')),
  tags          TEXT[]      NOT NULL DEFAULT '{}',
  -- Array of { id, dayNumber, workoutId: uuid|null, workoutName: text, isRest: boolean }
  -- workoutId is intentionally NOT a DB FK — see table comment above.
  workout_days  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  is_archived   BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.programs IS
  'Multi-day workout schedules (fixed or calendar). Trainer assigns to clients. '
  'workout_days.workoutId references workouts.id but FK is intentionally not enforced '
  'to allow draft days and graceful survival of workout deletion.';

COMMENT ON COLUMN public.programs.workout_days IS
  'JSONB array of { id, dayNumber, workoutId: uuid|null, workoutName: text, isRest: boolean }.';

-- ============================================================================
-- KORAK 3: CREATE TABLE client_notes
-- ============================================================================
-- Per-client trainer notes shown in ClientProfile.tsx. Trainer is the sole author.
-- Clients do NOT read these notes (trainer-only visibility).

CREATE TABLE public.client_notes (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT        NOT NULL CHECK (length(trim(body)) > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.client_notes IS
  'Trainer notes about a specific client. Trainer-only visibility — clients '
  'cannot read notes written about them. Shown in ClientProfile.tsx notes section.';

-- ============================================================================
-- KORAK 4: INDEXES
-- ============================================================================

-- workouts: hot path = trainer's active (non-archived) workouts list
CREATE INDEX idx_workouts_trainer_active
  ON public.workouts (trainer_id, is_archived)
  WHERE is_archived = false;

-- programs: hot path = trainer's active (non-archived) programs list
CREATE INDEX idx_programs_trainer_active
  ON public.programs (trainer_id, is_archived)
  WHERE is_archived = false;

-- client_notes: hot path = latest notes per client
CREATE INDEX idx_client_notes_client_date
  ON public.client_notes (client_id, created_at DESC);

-- client_notes: secondary — trainer sees all notes they wrote
CREATE INDEX idx_client_notes_trainer
  ON public.client_notes (trainer_id);

-- ============================================================================
-- KORAK 5: updated_at TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_workouts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workouts_set_timestamp
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_workouts_timestamp();

-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_programs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER programs_set_timestamp
  BEFORE UPDATE ON public.programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_programs_timestamp();

-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_client_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_notes_set_timestamp
  BEFORE UPDATE ON public.client_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_notes_timestamp();

-- ============================================================================
-- KORAK 6: RLS — workouts
-- ============================================================================

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Trainer reads own workouts only.
-- COMMENT ON POLICY: trainer sees only workouts they created; no cross-trainer leakage.
CREATE POLICY "Trener čita svoje workouts"
  ON public.workouts FOR SELECT
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );

-- Clients read ALL non-archived workouts owned by authenticated trainers.
-- App-layer filtering (by assigned trainer) is applied on top.
-- COMMENT ON POLICY: broad client read is acceptable; actual filtering is app-side.
CREATE POLICY "Klijent čita aktivne workouts"
  ON public.workouts FOR SELECT
  TO authenticated
  USING (
    is_archived = false AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'client'
    )
  );

-- Trainer INSERT: must own the row (trainer_id = their uid) and be a trainer.
-- COMMENT ON POLICY: prevents non-trainers from inserting, and prevents row smuggling.
CREATE POLICY "Trener pravi workouts"
  ON public.workouts FOR INSERT
  TO authenticated
  WITH CHECK (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );

-- Trainer UPDATE: only own rows.
-- COMMENT ON POLICY: trainer can only mutate workouts they created.
CREATE POLICY "Trener menja svoje workouts"
  ON public.workouts FOR UPDATE
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  )
  WITH CHECK (
    trainer_id = auth.uid()
  );

-- Trainer DELETE: only own rows.
-- COMMENT ON POLICY: trainer can delete only workouts they created.
CREATE POLICY "Trener briše svoje workouts"
  ON public.workouts FOR DELETE
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );

-- ============================================================================
-- KORAK 7: RLS — programs
-- ============================================================================

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Trainer reads own programs only.
-- COMMENT ON POLICY: trainer sees only programs they created.
CREATE POLICY "Trener čita svoje programs"
  ON public.programs FOR SELECT
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );

-- Clients read ALL non-archived programs. App-layer filters by assigned program.
-- COMMENT ON POLICY: broad read for clients; assigned-program filtering is app-side.
CREATE POLICY "Klijent čita aktivne programs"
  ON public.programs FOR SELECT
  TO authenticated
  USING (
    is_archived = false AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'client'
    )
  );

-- Trainer INSERT: must own the row and be a trainer.
-- COMMENT ON POLICY: prevents non-trainers from inserting, and prevents row smuggling.
CREATE POLICY "Trener pravi programs"
  ON public.programs FOR INSERT
  TO authenticated
  WITH CHECK (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );

-- Trainer UPDATE: only own rows.
-- COMMENT ON POLICY: trainer can only mutate programs they created.
CREATE POLICY "Trener menja svoje programs"
  ON public.programs FOR UPDATE
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  )
  WITH CHECK (
    trainer_id = auth.uid()
  );

-- Trainer DELETE: only own rows.
-- COMMENT ON POLICY: trainer can delete only programs they created.
CREATE POLICY "Trener briše svoje programs"
  ON public.programs FOR DELETE
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );

-- ============================================================================
-- KORAK 8: RLS — client_notes
-- ============================================================================

ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- Trainer SELECT: reads only notes they wrote.
-- COMMENT ON POLICY: trainer sees notes for all their clients, but not other trainers' notes.
CREATE POLICY "Trener čita svoje client_notes"
  ON public.client_notes FOR SELECT
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );

-- Clients have NO SELECT policy — they cannot read notes written about them.
-- service_role can read everything (no restriction on service_role by design).

-- Trainer INSERT: trainer_id must equal auth.uid(); must be a trainer.
-- COMMENT ON POLICY: prevents non-trainers from inserting, and prevents row smuggling.
CREATE POLICY "Trener pravi client_notes"
  ON public.client_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );

-- Trainer UPDATE: only own notes.
-- COMMENT ON POLICY: trainer can only edit notes they created.
CREATE POLICY "Trener menja svoje client_notes"
  ON public.client_notes FOR UPDATE
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  )
  WITH CHECK (
    trainer_id = auth.uid()
  );

-- Trainer DELETE: only own notes.
-- COMMENT ON POLICY: trainer can delete only notes they created.
CREATE POLICY "Trener briše svoje client_notes"
  ON public.client_notes FOR DELETE
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );
