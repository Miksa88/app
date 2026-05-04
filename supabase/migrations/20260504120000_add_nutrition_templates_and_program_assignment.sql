-- Migracija: nutrition_templates + assigned_program_id
-- W-7: trener nutrition template CRUD (paralel sa W-2 programs/workouts)
-- W-8: AssignProgram write-side (dodaje FK kolonu na client_template_assignments)

-- ============================================================================
-- KORAK 1: CREATE TABLE nutrition_templates
-- ============================================================================

CREATE TABLE public.nutrition_templates (
  id                        UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                      TEXT        NOT NULL,
  description               TEXT,
  goal_type                 TEXT        NOT NULL CHECK (goal_type IN ('cut','bulk','maintain','health')),
  macro_ratio               JSONB       NOT NULL DEFAULT '{"protein":30,"carbs":40,"fat":30}'::jsonb,
  macro_preset              TEXT        NOT NULL DEFAULT 'balanced',
  calorie_strategy          TEXT        NOT NULL DEFAULT 'auto' CHECK (calorie_strategy IN ('auto','fixed','range')),
  fixed_calories            INTEGER,
  calorie_range             JSONB,
  training_day_modifier     NUMERIC(5,2),
  rest_day_modifier         NUMERIC(5,2),
  different_on_training_days BOOLEAN    NOT NULL DEFAULT false,
  restrictions              TEXT[]      NOT NULL DEFAULT '{}',
  tags                      TEXT[]      NOT NULL DEFAULT '{}',
  meal_count                INTEGER     NOT NULL DEFAULT 5,
  meal_slots                JSONB       NOT NULL DEFAULT '[]'::jsonb,
  is_archived               BOOLEAN     NOT NULL DEFAULT false,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.nutrition_templates IS
  'Trainer-authored nutrition templates (macros + meal slot allocation + restrictions). Distinct from session_templates (training-side).';

CREATE INDEX idx_nutrition_templates_trainer_active
  ON public.nutrition_templates (trainer_id, is_archived)
  WHERE is_archived = false;

-- ============================================================================
-- KORAK 2: updated_at TRIGGER (sa SET search_path = public)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_nutrition_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER nutrition_templates_set_timestamp
  BEFORE UPDATE ON public.nutrition_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nutrition_templates_timestamp();

-- ============================================================================
-- KORAK 3: RLS — trainer owns + clients read active
-- ============================================================================

ALTER TABLE public.nutrition_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trener čita svoje nutrition_templates"
  ON public.nutrition_templates FOR SELECT
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'trainer')
  );

CREATE POLICY "Klijent čita aktivne nutrition_templates"
  ON public.nutrition_templates FOR SELECT
  TO authenticated
  USING (
    is_archived = false AND
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'client')
  );

CREATE POLICY "Trener pravi nutrition_templates"
  ON public.nutrition_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    trainer_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'trainer')
  );

CREATE POLICY "Trener menja svoje nutrition_templates"
  ON public.nutrition_templates FOR UPDATE
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'trainer')
  )
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trener briše svoje nutrition_templates"
  ON public.nutrition_templates FOR DELETE
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'trainer')
  );

-- ============================================================================
-- KORAK 4: W-8 — assigned_program_id na client_template_assignments
-- ============================================================================
-- Dodaje opcionu kolonu da povezuje klijentkinju sa programs.id (multi-day
-- raspored). FK je NULL kada nema programa. ON DELETE SET NULL preserve-uje
-- klijenta čak i ako trener obriše program.

ALTER TABLE public.client_template_assignments
  ADD COLUMN assigned_program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.client_template_assignments.assigned_program_id IS
  'Optional FK to programs.id — trener-authored multi-day workout schedule assigned to this client. NULL = no program assigned (klijent radi po skeleton template-u bez ekstra rasporeda).';

CREATE INDEX idx_client_template_assignments_program
  ON public.client_template_assignments (assigned_program_id)
  WHERE assigned_program_id IS NOT NULL;
