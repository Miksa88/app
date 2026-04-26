-- ============================================================================
-- Migration: Packages + tier system (Faza D minus billing)
-- Spec: roadmap Faza D - 3-tier paketi (entry/mid/high) + auto-assignment
-- ============================================================================

CREATE TYPE public.package_tier AS ENUM ('entry', 'mid', 'high');
COMMENT ON TYPE public.package_tier IS
  'Entry = algoritam radi sve, sami self-serve. Mid = algoritam + trainer template. High = 1-on-1 trainer attention.';

CREATE TYPE public.package_target_experience AS ENUM ('beginner', 'intermediate', 'any');

CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tier public.package_tier NOT NULL,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  program_template_id UUID REFERENCES public.session_templates(id) ON DELETE SET NULL,
  nutrition_template_id UUID,
  default_workout_frequency INTEGER CHECK (default_workout_frequency BETWEEN 3 AND 5),
  target_experience public.package_target_experience NOT NULL DEFAULT 'any',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_packages_trainer ON public.packages(trainer_id) WHERE NOT is_archived;
CREATE INDEX idx_packages_tier ON public.packages(tier) WHERE is_active AND NOT is_archived;

COMMENT ON COLUMN public.packages.tier IS 'Entry/Mid/High tier — gates trainer attention level';
COMMENT ON COLUMN public.packages.features IS 'JSONB: trainingProgram, nutritionPlan, weeklyCheckins, directMessaging, progressPhotos, metricsTracking, videoCalls, videoCallFrequency';

ALTER TABLE public.profiles
  ADD COLUMN assigned_tier public.package_tier,
  ADD COLUMN assigned_package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  ADD COLUMN assigned_at TIMESTAMP WITH TIME ZONE;

CREATE TRIGGER packages_set_timestamp
  BEFORE UPDATE ON public.packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_meal_logs_timestamp();

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainer manages own packages"
  ON public.packages FOR ALL
  TO authenticated
  USING (
    auth.uid() = trainer_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  )
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Clients read active packages"
  ON public.packages FOR SELECT
  TO authenticated
  USING (is_active AND NOT is_archived);

ALTER PUBLICATION supabase_realtime ADD TABLE public.packages;
