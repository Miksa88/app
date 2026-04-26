// ============================================================================
// exerciseVideoService — upload + persist video za exercises
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

const BUCKET = "exercise-videos";

export interface UploadVideoInput {
  trainerId: string;
  exerciseId: string;
  file: File;
}

export interface UploadVideoResult {
  publicUrl: string;
  storagePath: string;
}

/**
 * Upload video u bucket i vraća public URL.
 * Path: <trainerId>/<exerciseId>-<timestamp>.<ext>
 */
export async function uploadExerciseVideo(
  input: UploadVideoInput,
): Promise<UploadVideoResult> {
  const ext = input.file.name.split(".").pop()?.toLowerCase() ?? "mp4";
  const path = `${input.trainerId}/${input.exerciseId}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, input.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: input.file.type,
    });

  if (uploadErr) {
    throw new Error(`uploadExerciseVideo: ${uploadErr.message}`);
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    publicUrl: publicData.publicUrl,
    storagePath: path,
  };
}

/**
 * Briši video iz bucket-a.
 */
export async function deleteExerciseVideo(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw new Error(`deleteExerciseVideo: ${error.message}`);
}

/**
 * Persist video URL u exercises tabeli.
 */
export async function persistExerciseVideoUrl(
  exerciseId: string,
  videoUrl: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("exercises")
    .update({ video_url: videoUrl })
    .eq("id", exerciseId);
  if (error) throw new Error(`persistExerciseVideoUrl: ${error.message}`);
}

/**
 * Pomocna: parse storage path iz public URL-a (za delete posle upload-a).
 */
export function pathFromPublicUrl(publicUrl: string): string | null {
  const match = publicUrl.match(/exercise-videos\/(.+?)(?:\?|$)/);
  return match ? match[1] : null;
}
