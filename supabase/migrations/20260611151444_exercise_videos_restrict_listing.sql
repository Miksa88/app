-- ============================================================================
-- Security advisor: public_bucket_allows_listing (exercise-videos)
-- ============================================================================
-- Bucket je public — klijenti gledaju video preko public URL-a (getPublicUrl),
-- na šta se RLS ne primenjuje. Široka SELECT polisa za sve authenticated
-- korisnike omogućavala je listanje celog bucket-a, što app ne koristi
-- (exerciseVideoService.ts radi samo upload/remove/getPublicUrl).
DROP POLICY IF EXISTS "Authenticated read exercise videos" ON storage.objects;

-- SELECT ostaje samo treneru: supabase-js remove() zahteva SELECT + DELETE
-- polisu, a trener je jedini koji briše/upravlja video fajlovima.
CREATE POLICY "Trener read exercise videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exercise-videos' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );
