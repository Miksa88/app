import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, TAP_SCALE } from "@/lib/motion";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Video, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useExercise } from "@/hooks/useExercises";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  uploadExerciseVideo,
  persistExerciseVideoUrl,
  pathFromPublicUrl,
  deleteExerciseVideo,
} from "@/services/exerciseVideoService";
import { upsertExercise } from "@/services/exerciseUpsertService";

const EQUIPMENT_OPTIONS = ["Barbell", "Dumbbell", "Machine", "Cable Machine", "Bodyweight", "Kettlebell", "Bench", "Rack"];
const FOCUS_OPTIONS = ["Noge", "Grudi", "Leđa", "Ramena", "Ruke", "Core", "Kardio", "Full Body"];
const LEVEL_OPTIONS = ["beginner", "intermediate", "advanced"];
const TYPE_OPTIONS = ["Strength", "Cardio", "HIIT", "Flexibility"];

const ExerciseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { clientId: trainerId } = useAuth();
  const isNew = id === "new" || !id;
  // ID iz URL-a može biti broj (hashed UUID int) ili UUID string iz baze.
  // useExercise hook prima oba formata i traži po hashUuidToInt mapiranju.
  const { data: existing } = useExercise(!isNew ? id : null);
  const isPersistedExercise = !isNew && id && id.length > 10 && !Number.isInteger(Number(id));

  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [equipment, setEquipment] = useState("");
  const [focus, setFocus] = useState("");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [type, setType] = useState("Strength");

  // Video upload — Supabase Storage (real persistence) + lokalni blob preview
  // dok se ne završi upload. Ako vežba nije persistirana u DB-u (legacy MOCK
  // library sa numeric ID), fallback na lokalni blob bez upload-a.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Hidrirati form kada `existing` dođe iz async query-ja (W-1 wire-up).
  // Guard da ne pregazi user edit-e kasnije: hidriramo samo dok je form prazan
  // (initial mount) — jednostavna logika sa initialized ref-om.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!existing || hydratedRef.current) return;
    hydratedRef.current = true;
    setName(existing.name || "");
    setInstructions(existing.instructions || "");
    setEquipment(existing.equipment?.[0] || "");
    setFocus(existing.category || "");
    const exLevel = existing.difficulty;
    if (exLevel === "beginner" || exLevel === "intermediate" || exLevel === "advanced") {
      setLevel(exLevel);
    }
    setVideoUrl(existing.videoUrl || null);
  }, [existing]);

  // Otpusti blob URL na unmount da ne curi memory.
  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const handlePickVideo = () => {
    fileInputRef.current?.click();
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast({ title: t("training.videoTypeError"), variant: "destructive" });
      return;
    }
    const MAX_BYTES = 100 * 1024 * 1024; // 100 MB
    if (file.size > MAX_BYTES) {
      toast({ title: t("training.videoSizeError"), variant: "destructive" });
      return;
    }
    if (videoUrl && videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    const localUrl = URL.createObjectURL(file);
    setVideoUrl(localUrl);
    setVideoFileName(file.name);
    e.target.value = "";

    // Ako vežba postoji u DB (UUID id), upload na Supabase Storage + persist URL
    if (isPersistedExercise && id && trainerId) {
      setUploading(true);
      try {
        const { publicUrl } = await uploadExerciseVideo({
          trainerId,
          exerciseId: id,
          file,
        });
        await persistExerciseVideoUrl(id, publicUrl);
        URL.revokeObjectURL(localUrl);
        setVideoUrl(publicUrl);
        toast({ title: t("training.videoUploaded") });
      } catch (err) {
        toast({
          title: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    } else {
      // Legacy MOCK exercise — local blob, neće preživeti reload
      toast({ title: t("training.videoSelected") });
    }
  };

  const handleRemoveVideo = async () => {
    const oldUrl = videoUrl;
    if (videoUrl && videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideoFileName(null);

    // Ako je persistirano, briši iz storage-a + iz exercises tabele
    if (isPersistedExercise && id && oldUrl && !oldUrl.startsWith("blob:")) {
      try {
        const path = pathFromPublicUrl(oldUrl);
        if (path) await deleteExerciseVideo(path);
        await persistExerciseVideoUrl(id, null);
      } catch {
        // silent — ako ne uspe brisanje, korisnik neće videti grešku
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: t("training.nameRequired"), variant: "destructive" });
      return;
    }
    if (!trainerId) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }
    // Map UI focus (Serbian category) → movement_pattern; UI level → DB difficulty.
    const FOCUS_TO_PATTERN: Record<string, string> = {
      'Noge': 'knee_dominant',
      'Grudi': 'horizontal_push',
      'Leđa': 'horizontal_pull',
      'Ramena': 'vertical_push',
      'Ruke': 'isolation_biceps',
      'Core': 'core_antirotation',
      'Kardio': 'cardio_liss',
      'Full Body': 'carry',
    };
    const FOCUS_TO_MUSCLE: Record<string, string> = {
      'Noge': 'quads',
      'Grudi': 'chest',
      'Leđa': 'back_lats',
      'Ramena': 'shoulders_side',
      'Ruke': 'biceps',
      'Core': 'core',
      'Kardio': 'full_body',
      'Full Body': 'full_body',
    };
    const difficulty = level === 'beginner' ? 'beginner_safe' : level;
    try {
      await upsertExercise(
        {
          id: isPersistedExercise ? id! : undefined,
          name,
          nameSr: name,
          movementPattern: FOCUS_TO_PATTERN[focus] ?? 'knee_dominant',
          primaryMuscle: FOCUS_TO_MUSCLE[focus] ?? 'full_body',
          difficulty: difficulty as 'beginner_safe' | 'intermediate' | 'advanced',
          equipment: equipment ? [equipment] : [],
          instructions,
          videoUrl: videoUrl && !videoUrl.startsWith("blob:") ? videoUrl : null,
        },
        trainerId,
      );
      toast({ title: t("training.exerciseSaved") });
      navigate(-1);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Save failed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background-secondary pb-8">
      {/* Editor: sticky back + Save gore (match Workout pattern). Naziv exercise-a je FIXED H1 ispod. */}
      <PageHeader
        onBack={() => navigate(-1)}
        backLabel={t("training.title")}
        rightAction={
          <button
            onClick={handleSave}
            className="text-primary font-semibold text-body px-3 py-2 min-h-11 flex items-center active:opacity-60"
          >
            {t("training.save")}
          </button>
        }
      />

      <div className="px-5 pt-4 space-y-4">
        {/* Info banner for default exercises */}
        {existing && (
          <motion.div {...fadeUp()} className="bg-info/10 rounded-xl p-3">
            <p className="text-caption-1 text-info">{t("training.defaultExerciseBanner")}</p>
          </motion.div>
        )}

        {/* Video area — klik otvara file picker; upload on save (TODO Supabase Storage) */}
        <motion.div {...fadeUp(0.05)} className="bg-card rounded-xl card-shadow overflow-hidden">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoChange}
            className="hidden"
            aria-label={t("training.uploadVideo")}
          />
          {videoUrl ? (
            <div className="relative">
              <video
                src={videoUrl}
                controls
                playsInline
                className="w-full h-[220px] bg-black object-contain"
              >
                <track kind="captions" />
              </video>
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="bg-card/90 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 size={16} className="text-primary animate-spin" aria-hidden="true" />
                    <span className="text-caption-1 font-semibold text-foreground">
                      {t("training.uploading")}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Video size={16} className="text-muted-foreground shrink-0" aria-hidden="true" />
                  <span className="text-caption-1 text-muted-foreground truncate">
                    {videoFileName ?? t("training.videoAttached")}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <motion.button
                    whileTap={{ scale: TAP_SCALE.icon }}
                    onClick={handlePickVideo}
                    className="text-primary text-caption-1 font-semibold px-3 min-h-11 flex items-center"
                    aria-label={t("training.replaceVideo")}
                  >
                    {t("training.replaceVideo")}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: TAP_SCALE.icon }}
                    onClick={handleRemoveVideo}
                    className="text-destructive min-h-11 min-w-11 flex items-center justify-center"
                    aria-label={t("training.removeVideo")}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </motion.button>
                </div>
              </div>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: TAP_SCALE.secondary }}
              onClick={handlePickVideo}
              className="w-full h-[200px] bg-muted flex flex-col items-center justify-center gap-3 transition-colors hover:bg-muted/70"
              aria-label={t("training.uploadVideo")}
            >
              <Upload size={28} className="text-muted-foreground" aria-hidden="true" />
              <p className="text-subhead text-muted-foreground font-medium">{t("training.uploadVideo")}</p>
              <p className="text-caption-2 text-muted-foreground/70">{t("training.uploadVideoHint")}</p>
            </motion.button>
          )}
        </motion.div>

        {/* Name */}
        <motion.div {...fadeUp(0.1)}>
          <label className="text-caption-1 text-muted-foreground font-medium mb-1.5 block">{t("training.exerciseName")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("training.exerciseNamePlaceholder")}
            className="w-full bg-card text-foreground rounded-xl px-4 py-3 text-body card-shadow focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </motion.div>

        {/* Instructions */}
        <motion.div {...fadeUp(0.15)}>
          <label className="text-caption-1 text-muted-foreground font-medium mb-1.5 block">{t("training.instructions")}</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            placeholder={t("training.instructionsPlaceholder")}
            className="w-full bg-card text-foreground rounded-xl px-4 py-3 text-body card-shadow focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </motion.div>

        {/* Equipment */}
        <motion.div {...fadeUp(0.2)}>
          <label className="text-caption-1 text-muted-foreground font-medium mb-1.5 block">{t("training.equipment")}</label>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className="w-full bg-card text-foreground rounded-xl px-4 py-3 text-body card-shadow focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t("training.selectEquipment")}</option>
            {EQUIPMENT_OPTIONS.map((eq) => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>
        </motion.div>

        {/* Primary Focus */}
        <motion.div {...fadeUp(0.25)}>
          <label className="text-caption-1 text-muted-foreground font-medium mb-1.5 block">{t("training.primaryFocus")}</label>
          <select
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            className="w-full bg-card text-foreground rounded-xl px-4 py-3 text-body card-shadow focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t("training.selectFocus")}</option>
            {FOCUS_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </motion.div>

        {/* Level */}
        <motion.div {...fadeUp(0.3)}>
          <label className="text-caption-1 text-muted-foreground font-medium mb-1.5 block">{t("training.level")}</label>
          <div className="flex gap-2">
            {LEVEL_OPTIONS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l as 'beginner' | 'intermediate' | 'advanced')}
                className={`flex-1 py-3 rounded-xl text-footnote font-semibold transition-all ${
                  level === l ? "gradient-primary text-primary-foreground shadow-fab" : "bg-card text-muted-foreground card-shadow"
                }`}
              >
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Type */}
        <motion.div {...fadeUp(0.35)}>
          <label className="text-caption-1 text-muted-foreground font-medium mb-1.5 block">{t("training.type")}</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-card text-foreground rounded-xl px-4 py-3 text-body card-shadow focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {TYPE_OPTIONS.map((ty) => (
              <option key={ty} value={ty}>{ty}</option>
            ))}
          </select>
        </motion.div>

        {/* Save button */}
        <motion.div {...fadeUp(0.4)} className="pt-4 pb-4">
          <Button
            onClick={handleSave}
            variant="cta"
            size="xl"
          >
            {t("training.saveChanges")}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default ExerciseDetail;
