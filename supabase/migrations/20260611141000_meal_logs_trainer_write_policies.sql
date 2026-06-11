-- ============================================================================
-- Migracija: Trener UPDATE/DELETE policy-ji na meal_logs (Task 1.8)
-- Spec referenca: PLAN_RADA_WHITELABEL.md Task 1.8 — trener mora moći da
-- koriguje (UPDATE) i briše (DELETE) meal log unose klijentkinja.
--
-- Dopunjuje RLS set iz 20260419180100 (klijentkinja CRUD svoje, trener SELECT
-- sve) — dodaje trenerska write prava po istom EXISTS profiles.role obrascu.
-- ============================================================================

CREATE POLICY "Trener koriguje meal log-ove"
  ON public.meal_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'trainer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'trainer'
    )
  );

CREATE POLICY "Trener briše meal log-ove"
  ON public.meal_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'trainer'
    )
  );
