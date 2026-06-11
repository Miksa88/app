-- Migracija: client_exercise_swaps — trajne zamene vežbi po klijentu
-- Spec referenca: MVP_PRESET gap #2 — klijent-facing exercise substitution
-- (11.599 glasova). "Zameni trajno" toggle u SwapExerciseSheet.

-- ============================================================================
-- KORAK 1: CREATE TABLE
-- ============================================================================

CREATE TABLE public.client_exercise_swaps (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_exercise_id UUID        NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  to_exercise_id   UUID        NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Jedna trajna zamena po (klijent, izvorna vežba); novi pick je upsert.
  CONSTRAINT client_exercise_swaps_unique UNIQUE (client_id, from_exercise_id)
);

COMMENT ON TABLE public.client_exercise_swaps IS
  'Trajne zamene vežbi po klijentu: from_exercise_id se pri rezoluciji sesije '
  'zamenjuje sa to_exercise_id u svim budućim treninzima. Per-session override '
  'ostaje lokalni mehanizam (ne piše ovde).';

-- ============================================================================
-- KORAK 2: INDEXES
-- ============================================================================

-- Hot path: učitavanje svih zamena za klijenta pri rezoluciji sesije.
-- UNIQUE (client_id, from_exercise_id) već pokriva taj prefix lookup.
-- FK indeksi (performance advisor higijena):
CREATE INDEX idx_client_exercise_swaps_from_exercise
  ON public.client_exercise_swaps (from_exercise_id);
CREATE INDEX idx_client_exercise_swaps_to_exercise
  ON public.client_exercise_swaps (to_exercise_id);

-- ============================================================================
-- KORAK 3: RLS
-- ============================================================================

ALTER TABLE public.client_exercise_swaps ENABLE ROW LEVEL SECURITY;

-- Klijentkinja čita svoje zamene.
CREATE POLICY "Klijentkinja čita svoje exercise swaps"
  ON public.client_exercise_swaps FOR SELECT
  TO authenticated
  USING (client_id = (SELECT auth.uid()));

-- Klijentkinja pravi svoje zamene (bez podmetanja tuđih redova).
CREATE POLICY "Klijentkinja pravi svoje exercise swaps"
  ON public.client_exercise_swaps FOR INSERT
  TO authenticated
  WITH CHECK (client_id = (SELECT auth.uid()));

-- Klijentkinja menja svoje zamene (upsert path).
CREATE POLICY "Klijentkinja menja svoje exercise swaps"
  ON public.client_exercise_swaps FOR UPDATE
  TO authenticated
  USING (client_id = (SELECT auth.uid()))
  WITH CHECK (client_id = (SELECT auth.uid()));

-- Klijentkinja briše svoje zamene.
CREATE POLICY "Klijentkinja briše svoje exercise swaps"
  ON public.client_exercise_swaps FOR DELETE
  TO authenticated
  USING (client_id = (SELECT auth.uid()));

-- Trener vidi sve zamene (coaching uvid).
CREATE POLICY "Treneri čitaju sve exercise swaps"
  ON public.client_exercise_swaps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'trainer'
    )
  );

-- Trener može da ukloni neadekvatnu zamenu.
CREATE POLICY "Treneri brišu exercise swaps"
  ON public.client_exercise_swaps FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'trainer'
    )
  );
