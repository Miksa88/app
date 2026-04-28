-- ============================================================================
-- Fix: user_status nema INSERT/UPDATE policies — saveUserStatus puca posle
-- onboarding-a (RLS denial). Klijent treba da može da CRUD-uje svoj status,
-- trener može da menja sve (clientOverrides flow).
-- ============================================================================

CREATE POLICY "Klijentkinja kreira svoj status"
  ON public.user_status FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Klijentkinja menja svoj status"
  ON public.user_status FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Trener menja status klijenta"
  ON public.user_status FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );
