import { shiftIsoDate } from "@/lib/game/date";
import { GameConflictError } from "@/lib/game/shared";
import { createAdminClient } from "@/lib/supabase/admin";

type LiveExerciseRow = {
  id: string;
  name: string;
};

type DailyExerciseRow = {
  exercise_id: string;
};

type DailySelection = {
  exerciseId: string;
  exerciseName: string;
};

function toDayIndex(isoDate: string): number {
  const value = new Date(`${isoDate}T00:00:00Z`);
  return Math.floor(value.getTime() / 86400000);
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledIndexes(length: number, seed: number): number[] {
  const random = mulberry32(seed);
  const indexes = Array.from({ length }, (_, index) => index);

  for (let i = indexes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }

  return indexes;
}

async function getLiveExercises(): Promise<LiveExerciseRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("exercises")
    .select("id, name")
    .eq("is_live", true)
    .order("id", { ascending: true })
    .returns<LiveExerciseRow[]>();

  if (error) {
    throw new Error(`Failed to load live exercises for daily rotation: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new GameConflictError("No live exercises available for daily rotation.");
  }

  return data;
}

async function getConfiguredDailySelection(gameDate: string): Promise<DailySelection | null> {
  const admin = createAdminClient();

  const { data: configured, error: configuredError } = await admin
    .from("daily_exercises")
    .select("exercise_id")
    .eq("game_date", gameDate)
    .maybeSingle<DailyExerciseRow>();

  if (configuredError || !configured?.exercise_id) {
    return null;
  }

  const { data: exercise, error: exerciseError } = await admin
    .from("exercises")
    .select("id, name")
    .eq("id", configured.exercise_id)
    .maybeSingle<LiveExerciseRow>();

  if (exerciseError || !exercise?.id) {
    return null;
  }

  return { exerciseId: exercise.id, exerciseName: exercise.name };
}

function computeRotationSelection(gameDate: string, exercises: LiveExerciseRow[]): DailySelection {
  const dayIndex = toDayIndex(gameDate);
  const cycleSize = exercises.length;
  const cycleNumber = Math.floor(dayIndex / cycleSize);
  const indexInCycle = ((dayIndex % cycleSize) + cycleSize) % cycleSize;
  const seedBase = process.env.DAILY_ROTATION_SEED ?? "muscledle-rotation-v1";
  const seed = hashSeed(`${seedBase}:${cycleNumber}:${cycleSize}`);
  const order = shuffledIndexes(cycleSize, seed);
  const chosen = exercises[order[indexInCycle]];

  return {
    exerciseId: chosen.id,
    exerciseName: chosen.name,
  };
}

export async function resolveDailySelection(gameDate: string): Promise<DailySelection> {
  const configured = await getConfiguredDailySelection(gameDate);
  if (configured) {
    return configured;
  }

  const exercises = await getLiveExercises();
  return computeRotationSelection(gameDate, exercises);
}

export async function resolveYesterdaySelection(gameDate: string): Promise<DailySelection> {
  const yesterdayDate = shiftIsoDate(gameDate, -1);
  return resolveDailySelection(yesterdayDate);
}
