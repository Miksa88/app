-- ============================================================================
-- Exercise videos storage bucket + policies
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-videos',
  'exercise-videos',
  true,
  104857600,  -- 100 MB
  ARRAY['video/mp4','video/quicktime','video/webm','video/x-matroska']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Trener upload exercise videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'exercise-videos' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );

CREATE POLICY "Trener update exercise videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'exercise-videos' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );

CREATE POLICY "Trener delete exercise videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'exercise-videos' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
  );

CREATE POLICY "Authenticated read exercise videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'exercise-videos');
