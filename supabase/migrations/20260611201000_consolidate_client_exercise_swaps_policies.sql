-- Konsolidacija RLS politika za client_exercise_swaps — advisor higijena:
-- multiple_permissive_policies (SELECT/DELETE imali po 2 permissive politike).
-- Klijent + trener uslovi spojeni u jednu politiku po akciji.

DROP POLICY "Klijentkinja čita svoje exercise swaps" ON public.client_exercise_swaps;
DROP POLICY "Treneri čitaju sve exercise swaps" ON public.client_exercise_swaps;
DROP POLICY "Klijentkinja briše svoje exercise swaps" ON public.client_exercise_swaps;
DROP POLICY "Treneri brišu exercise swaps" ON public.client_exercise_swaps;

-- SELECT: klijentkinja svoje, trener sve.
CREATE POLICY "Klijentkinja čita svoje, trener sve exercise swaps"
  ON public.client_exercise_swaps FOR SELECT
  TO authenticated
  USING (
    client_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'trainer'
    )
  );

-- DELETE: klijentkinja svoje, trener sve.
CREATE POLICY "Klijentkinja briše svoje, trener sve exercise swaps"
  ON public.client_exercise_swaps FOR DELETE
  TO authenticated
  USING (
    client_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'trainer'
    )
  );
