-- pocetnici.md §4.2 — Mesečne slike (front, side, back) za poređenje (X-8, 2026-05-08)
CREATE TABLE IF NOT EXISTS public.progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  taken_at timestamptz NOT NULL DEFAULT now(),
  angle text NOT NULL CHECK (angle IN ('front', 'side', 'back')),
  storage_path text NOT NULL,
  notes text,
  week_number integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS progress_photos_user_taken_idx
  ON public.progress_photos (user_id, taken_at DESC);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own progress photos"
  ON public.progress_photos FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress photos"
  ON public.progress_photos FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own progress photos"
  ON public.progress_photos FOR DELETE
  USING (user_id = auth.uid());

INSERT INTO storage.buckets (id, name, public)
VALUES ('progress_photos', 'progress_photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own progress photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'progress_photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own progress photos files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'progress_photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own progress photos files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'progress_photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
