-- Migracija: weight_logs + daily_check_ins
-- Spec referenca: 03_INTEGRATION_LAYER.md §3.1 (DailyCheckIn flow)
--                 02_NUTRITION_FLOW_MASTER.md §10 (MA5 weight trendline)
-- Commit: IT-1

-- ============================================================================
-- KORAK 1: CREATE TABLE weight_logs
-- ============================================================================

CREATE TABLE public.weight_logs (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weight_kg  NUMERIC(5,2) NOT NULL CHECK (weight_kg BETWEEN 20 AND 300),
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  source     TEXT        NOT NULL DEFAULT 'manual'
               CHECK (source IN ('auto', 'manual', 'wearable')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- KORAK 2: INDEXES — weight_logs
-- ============================================================================

-- MA5 lookup: poslednjih 5 unosa po korisniku sortirano po datumu
CREATE INDEX idx_weight_logs_user_date
  ON public.weight_logs (user_id, logged_at DESC);

-- ============================================================================
-- KORAK 3: updated_at TRIGGER — weight_logs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_weight_logs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER weight_logs_set_timestamp
  BEFORE UPDATE ON public.weight_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_weight_logs_timestamp();

-- ============================================================================
-- KORAK 4: RLS — weight_logs
-- ============================================================================

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Klijentkinja CRUD svoje weight_logs"
  ON public.weight_logs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Treneri čitaju sve weight_logs"
  ON public.weight_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );

-- ============================================================================
-- KORAK 5: CREATE TABLE daily_check_ins
-- ============================================================================

CREATE TABLE public.daily_check_ins (
  id              UUID      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID      NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date            DATE      NOT NULL,
  sleep_hours     NUMERIC(3,1) CHECK (sleep_hours BETWEEN 0 AND 14),
  stress_level    SMALLINT  CHECK (stress_level BETWEEN 1 AND 5),
  energy_level    SMALLINT  CHECK (energy_level BETWEEN 1 AND 10),
  water_intake_ml INTEGER   CHECK (water_intake_ml >= 0),
  cycle_day       SMALLINT  CHECK (cycle_day BETWEEN 1 AND 45),  -- nullable per spec
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Jedan check-in po danu po korisniku
  CONSTRAINT uq_daily_check_ins_user_date UNIQUE (user_id, date)
);

-- ============================================================================
-- KORAK 6: INDEXES — daily_check_ins
-- ============================================================================

CREATE INDEX idx_daily_checkins_user_date
  ON public.daily_check_ins (user_id, date DESC);

-- ============================================================================
-- KORAK 7: updated_at TRIGGER — daily_check_ins
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_daily_check_ins_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER daily_check_ins_set_timestamp
  BEFORE UPDATE ON public.daily_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_check_ins_timestamp();

-- ============================================================================
-- KORAK 8: RLS — daily_check_ins
-- ============================================================================

ALTER TABLE public.daily_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Klijentkinja CRUD svoje daily_check_ins"
  ON public.daily_check_ins FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Treneri čitaju sve daily_check_ins"
  ON public.daily_check_ins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );
