-- ============================================================================
-- Migracija: usage_events — lagana self-hosted analitika korišćenja (Faza 4.2)
-- Spec referenca: PLAN_RADA_WHITELABEL.md Faza 4.2 — MVP pitanje "šta se
-- koristi" bez third-party servisa (privacy + white-label kopija-po-treneru).
--
-- Minimalan footprint po dizajnu:
--   - BEZ payload JSONB kolone → nema mesta za PII curenje
--   - event_type ograničen CHECK-om na poznate vrednosti
--   - append-only: klijent sme samo INSERT svojih, trener samo SELECT;
--     UPDATE/DELETE policy-ji namerno NE postoje (default deny)
-- ============================================================================

CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 'page_view' (event_name = path, npr. '/food') ili
  -- 'feature_use' (event_name = feature, npr. 'meal_swap')
  event_type text NOT NULL CHECK (event_type IN ('page_view', 'feature_use')),
  event_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Korisnica upisuje isključivo svoje evente
CREATE POLICY "Korisnik beleži svoje usage evente"
  ON public.usage_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Samo trener čita agregate (isti EXISTS profiles.role obrazac kao meal_logs)
CREATE POLICY "Trener čita usage evente"
  ON public.usage_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'trainer'
    )
  );

-- Index za getUsageSummary upit (group by event_name u vremenskom prozoru)
CREATE INDEX idx_usage_events_name_created
  ON public.usage_events (event_name, created_at);
