-- Migracija: weekly_check_ins + pause_events + water_logs
-- Spec referenca: 02_NUTRITION_FLOW_MASTER.md §10 (weekly check-in + identity score)
--                 01_TRAINING_FLOW_MASTER.md §4.8 (Pauza modul)
--                 02_NUTRITION_FLOW_MASTER.md §8.1 + 03_INTEGRATION_LAYER.md §6.5 (water logs)
-- Commit: IT-2

-- ============================================================================
-- KORAK 1: CREATE TYPE pause_type (ENUM)
-- ============================================================================

CREATE TYPE public.pause_type AS ENUM ('illness', 'travel');

-- ============================================================================
-- KORAK 2: CREATE TABLE weekly_check_ins
-- ============================================================================

CREATE TABLE public.weekly_check_ins (
  id               UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start_date  DATE         NOT NULL,
  weight_avg_kg    NUMERIC(5,2) CHECK (weight_avg_kg BETWEEN 20 AND 300),
  waist_cm         NUMERIC(5,1) CHECK (waist_cm BETWEEN 40 AND 200),
  hip_cm           NUMERIC(5,1) CHECK (hip_cm BETWEEN 40 AND 200),
  thigh_cm         NUMERIC(5,1) CHECK (thigh_cm BETWEEN 20 AND 100),
  energy_avg       NUMERIC(3,1) CHECK (energy_avg BETWEEN 1 AND 10),
  identity_score   SMALLINT     CHECK (identity_score BETWEEN 1 AND 5),
  notes            TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- Jedan weekly check-in po nedelji po korisniku
  CONSTRAINT uq_weekly_check_ins_user_week UNIQUE (user_id, week_start_date)
);

-- ============================================================================
-- KORAK 3: INDEXES — weekly_check_ins
-- ============================================================================

CREATE INDEX idx_weekly_check_ins_user_date
  ON public.weekly_check_ins (user_id, week_start_date DESC);

-- ============================================================================
-- KORAK 4: updated_at TRIGGER — weekly_check_ins
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_weekly_check_ins_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER weekly_check_ins_set_timestamp
  BEFORE UPDATE ON public.weekly_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_weekly_check_ins_timestamp();

-- ============================================================================
-- KORAK 5: RLS — weekly_check_ins
-- ============================================================================

ALTER TABLE public.weekly_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Klijentkinja CRUD svoje weekly_check_ins"
  ON public.weekly_check_ins FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Treneri čitaju sve weekly_check_ins"
  ON public.weekly_check_ins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );

-- ============================================================================
-- KORAK 6: CREATE TABLE pause_events
-- ============================================================================

CREATE TABLE public.pause_events (
  id                         UUID             NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                    UUID             NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pause_type                 public.pause_type NOT NULL,
  start_date                 DATE             NOT NULL,
  end_date                   DATE,
  is_active                  BOOLEAN          NOT NULL DEFAULT TRUE,
  recovery_penalty           NUMERIC(3,2)     NOT NULL DEFAULT 0
                               CHECK (recovery_penalty BETWEEN -0.5 AND 0),
  penalty_sessions_remaining SMALLINT         NOT NULL DEFAULT 0
                               CHECK (penalty_sessions_remaining >= 0),
  notes                      TEXT,
  created_at                 TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- ============================================================================
-- KORAK 7: INDEXES — pause_events
-- ============================================================================

-- Aktivna pauza lookup po korisniku
CREATE INDEX idx_pause_events_user_active_date
  ON public.pause_events (user_id, is_active, start_date DESC);

-- Parcijalni UNIQUE: samo jedna aktivna pauza po korisniku u isto vreme
CREATE UNIQUE INDEX idx_pause_events_one_active_per_user
  ON public.pause_events (user_id) WHERE is_active = TRUE;

-- ============================================================================
-- KORAK 8: updated_at TRIGGER — pause_events
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_pause_events_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER pause_events_set_timestamp
  BEFORE UPDATE ON public.pause_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pause_events_timestamp();

-- ============================================================================
-- KORAK 9: RLS — pause_events
-- ============================================================================

ALTER TABLE public.pause_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Klijentkinja CRUD svoje pause_events"
  ON public.pause_events FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Treneri čitaju sve pause_events"
  ON public.pause_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );

-- ============================================================================
-- KORAK 10: CREATE TABLE water_logs (append-only)
-- ============================================================================

CREATE TABLE public.water_logs (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ml_added   INTEGER     NOT NULL
               CHECK (ml_added > 0 AND ml_added <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Nema updated_at: append-only pattern po dizajnu (spec 02 §8.1 + 03 §6.5)
);

-- ============================================================================
-- KORAK 11: INDEXES — water_logs
-- ============================================================================

-- Dnevni rollup lookup
CREATE INDEX idx_water_logs_user_logged_at
  ON public.water_logs (user_id, logged_at DESC);

-- ============================================================================
-- KORAK 12: RLS — water_logs (append-only; nema UPDATE policy)
-- ============================================================================

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Klijentkinja INSERT svoje water_logs"
  ON public.water_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Klijentkinja SELECT svoje water_logs"
  ON public.water_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Klijentkinja DELETE svoje water_logs"
  ON public.water_logs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- NEMA UPDATE policy — append-only pattern; greška se ispravlja DELETE + novi INSERT

CREATE POLICY "Treneri čitaju sve water_logs"
  ON public.water_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );
