// ============================================================================
// autoPilotSignals — pure analyzers za auto-pilot trener notifikacije
// Spec: roadmap Faza E
// ============================================================================
//
// Koristi se u trener dashboard-u + Home klijent banner-ima:
//   - Plateau detector: weight stagnant 3+ nedelja na fat_loss → upozori
//   - Beginner→Intermediate promote: N consecutive top-of-rep sessions
//   - Missing video signal: vežba u queue-u bez video URL-a
// ============================================================================

// Red iz exercise_progress — isti shape kao ExerciseHistoryRow (alias zadržan
// zbog postojećih internih referenci u ovom modulu).
import type { ExerciseHistoryRow as ExerciseHistorySample } from "@/utils/db/exerciseHistory";

// ============================================================================
// 1. Plateau detector
// ============================================================================

export interface WeeklyTrendSample {
  weekStartDate: string;       // YYYY-MM-DD
  weightAvgKg: number | null;  // może biti null ako klijent nije meren
}

export type PlateauVerdict =
  | { kind: "no_data"; reason: string }
  | { kind: "no_plateau"; weeksObserved: number; trendKgPerWeek: number }
  | { kind: "plateau"; weeksObserved: number; trendKgPerWeek: number; suggestion: string };

const PLATEAU_THRESHOLD_KG = 0.15;  // <0.15kg/week change = plateau
const MIN_WEEKS_FOR_DETECTION = 3;

/**
 * Detects fat-loss plateau: weight stable for 3+ weeks while client is on
 * deficit mode. Trener vidi signal da intervene-uje.
 */
export function detectPlateau(
  weeklyChecks: WeeklyTrendSample[],
  targetMode: "deficit" | "recomposition" | "lean_bulk" | "maintenance",
): PlateauVerdict {
  // Plateau je relevantan samo za deficit + recomposition
  if (targetMode !== "deficit" && targetMode !== "recomposition") {
    return { kind: "no_data", reason: "mode_not_applicable" };
  }

  const validSamples = weeklyChecks
    .filter((s) => s.weightAvgKg !== null && s.weightAvgKg > 0)
    .sort(
      (a, b) =>
        new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime(),
    );

  if (validSamples.length < MIN_WEEKS_FOR_DETECTION) {
    return { kind: "no_data", reason: "insufficient_weeks" };
  }

  const recent = validSamples.slice(-MIN_WEEKS_FOR_DETECTION);
  const first = recent[0].weightAvgKg!;
  const last = recent[recent.length - 1].weightAvgKg!;
  const totalDelta = last - first;
  const trendKgPerWeek = totalDelta / (recent.length - 1);

  if (Math.abs(trendKgPerWeek) < PLATEAU_THRESHOLD_KG) {
    const suggestion =
      targetMode === "deficit"
        ? "Telo se prilagodilo deficitu. Razmotri refeed dan ili 1 nedelja maintenance."
        : "Stagnacija u recomposition-u — proveri kompletnost tracking-a obroka.";
    return {
      kind: "plateau",
      weeksObserved: recent.length,
      trendKgPerWeek,
      suggestion,
    };
  }

  return {
    kind: "no_plateau",
    weeksObserved: recent.length,
    trendKgPerWeek,
  };
}

// ============================================================================
// 2. Beginner → Intermediate auto-promote signal
// ============================================================================

export type PromoteVerdict =
  | { kind: "stay"; reason: string }
  | { kind: "promote"; consecutiveSuccessful: number; suggestion: string };

const PROMOTE_THRESHOLD_SESSIONS = 8;

/**
 * Counts consecutive sessions where client hit top-of-rep-range.
 * If >=8 consecutive, suggest promotion to intermediate (Spec 01 Sekcija 3).
 *
 * Input: history samples DESC po completed_at, plus per-exercise rep-range top.
 */
export interface SessionCompletion {
  sessionId: string;
  completedAt: string;
  exercises: Array<{
    exerciseId: string;
    repsHit: number;
    repRangeTop: number;  // ono što slot.repRange[1] daje
  }>;
}

export function checkBeginnerPromoteSignal(
  recentSessions: SessionCompletion[],
  currentExperience: "beginner" | "intermediate",
): PromoteVerdict {
  if (currentExperience !== "beginner") {
    return { kind: "stay", reason: "already_intermediate_or_above" };
  }
  if (recentSessions.length < PROMOTE_THRESHOLD_SESSIONS) {
    return { kind: "stay", reason: "insufficient_sessions" };
  }

  // Sort DESC po completed_at
  const sorted = [...recentSessions].sort(
    (a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );

  let consecutive = 0;
  for (const session of sorted) {
    // Sesija je "successful" ako je svaka vežba pogodila top of rep range
    const allHit = session.exercises.every(
      (ex) => ex.repsHit >= ex.repRangeTop,
    );
    if (allHit) {
      consecutive += 1;
      if (consecutive >= PROMOTE_THRESHOLD_SESSIONS) {
        return {
          kind: "promote",
          consecutiveSuccessful: consecutive,
          suggestion:
            "Klijentkinja je pogodila top of rep range u 8+ uzastopnih sesija. Predlaže se promocija na intermediate template.",
        };
      }
    } else {
      break;  // streak broken
    }
  }

  return { kind: "stay", reason: `consecutive_${consecutive}` };
}

// ============================================================================
// 3. Missing-video signal (trener notification)
// ============================================================================

export interface QueuedExercise {
  id: string;
  name: string;
  videoUrl: string | null;
}

export interface MissingVideoVerdict {
  hasMissing: boolean;
  exercises: QueuedExercise[];
}

/**
 * Detects exercises u upcoming queue koji nemaju video. Trener vidi
 * notifikaciju "Treba mi video za hip thrust, leg press, ..." pa može
 * dnevno upload-ovati kako klijenti dolaze do tih vežbi.
 */
export function checkMissingVideos(
  upcomingExercises: QueuedExercise[],
): MissingVideoVerdict {
  const missing = upcomingExercises.filter((ex) => !ex.videoUrl);
  return {
    hasMissing: missing.length > 0,
    exercises: missing,
  };
}

// ============================================================================
// 4. Aggregate trend helper (volume / RIR drift)
// ============================================================================
//
// Korisno za trener dashboard "summary card" — pokazuje da li se klijent
// kreće, stoji ili regredira po trenažnom volumenu poslednjih N nedelja.

export interface VolumeSample {
  date: string;
  totalVolume: number;  // sum of weight_kg × reps over session
}

export function summarizeVolumeDelta(
  samples: VolumeSample[],
): { kind: "growth" | "flat" | "decline"; deltaPct: number } | null {
  if (samples.length < 2) return null;
  const sorted = [...samples].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const first = sorted[0].totalVolume;
  const last = sorted[sorted.length - 1].totalVolume;
  if (first === 0) return null;
  const deltaPct = ((last - first) / first) * 100;
  const kind = deltaPct > 5 ? "growth" : deltaPct < -5 ? "decline" : "flat";
  return { kind, deltaPct: Math.round(deltaPct) };
}

// ============================================================================
// Helper: derive sessionCompletions iz exercise_progress rows
// ============================================================================

export function groupHistoryBySession(
  history: ExerciseHistorySample[],
  repRangeTopByExercise: Map<string, number>,
): SessionCompletion[] {
  // Group by completed_at date (YYYY-MM-DD = jedna sesija po danu)
  const byDate = new Map<string, ExerciseHistorySample[]>();
  for (const sample of history) {
    const date = sample.completed_at.split("T")[0];
    const list = byDate.get(date) ?? [];
    list.push(sample);
    byDate.set(date, list);
  }

  const sessions: SessionCompletion[] = [];
  for (const [date, samples] of byDate) {
    // Group by exercise_id within this date
    const byExercise = new Map<string, ExerciseHistorySample[]>();
    for (const s of samples) {
      const list = byExercise.get(s.set_number.toString()) ?? [];
      list.push(s);
      byExercise.set(s.set_number.toString(), list);
    }

    // Take max reps per exercise within session
    const exercises: SessionCompletion["exercises"] = [];
    for (const [exId, sets] of byExercise) {
      const maxReps = Math.max(...sets.map(s => s.reps));
      exercises.push({
        exerciseId: exId,
        repsHit: maxReps,
        repRangeTop: repRangeTopByExercise.get(exId) ?? 12,  // fallback
      });
    }

    sessions.push({
      sessionId: `session_${date}`,
      completedAt: date,
      exercises,
    });
  }

  return sessions;
}
