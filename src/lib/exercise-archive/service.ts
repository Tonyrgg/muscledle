import { createAdminClient } from "@/lib/supabase/admin";
import type { ExerciseArchiveRow } from "@/lib/exercise-archive/types";

type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
  aliases: string[] | null;
  muscle_group: string;
  muscle: string[];
  equipment: string[];
  movement: string[];
  pattern: string[];
  reps: string[];
  goal: string[];
  ego: string[];
  is_live: boolean;
};

type DailyExerciseRow = {
  game_date: string;
  exercise_id: string;
};

type UserDailyGameRow = {
  id: string;
  user_id: string;
  game_date: string;
  status: "in_progress" | "won" | "lost";
  guess_count: number;
};

type GameAttemptRow = {
  user_id: string;
  game_date: string;
  user_daily_game_id: string;
  guess_exercise_id: string;
  is_correct: boolean;
  created_at: string;
};

type ExerciseMediaRow = {
  exercise_slug: string;
  sync_status: "matched" | "not_found" | "no_gif" | "match_failed" | "db_error";
  provider_exercise_name: string | null;
  media_url: string | null;
  last_synced_at: string | null;
};

type ExerciseEnrichmentRow = {
  exercise_slug: string;
  enrichment_status: "pending" | "enriched" | "not_found" | "match_failed" | "provider_error" | "db_error";
  provider_exercise_name: string | null;
  normalized_muscle: string | null;
  normalized_equipment: string | null;
  normalized_movement: string | null;
  normalized_pattern: string | null;
  normalized_reps: string | null;
  normalized_goal: string | null;
  normalized_ego: string | null;
  last_enriched_at: string | null;
};

type TargetStats = {
  timesAsDailyTarget: number;
  winsWhenTarget: number;
  lossesWhenTarget: number;
  totalGuessesToSolve: number;
  solvedRounds: number;
  lastDailyTargetDate: string | null;
};

type GuessStats = {
  totalGuesses: number;
  correctGuesses: number;
  incorrectGuesses: number;
  uniqueGuessers: Set<string>;
  lastGuessedAt: string | null;
};

function createTargetStats(): TargetStats {
  return {
    timesAsDailyTarget: 0,
    winsWhenTarget: 0,
    lossesWhenTarget: 0,
    totalGuessesToSolve: 0,
    solvedRounds: 0,
    lastDailyTargetDate: null,
  };
}

function createGuessStats(): GuessStats {
  return {
    totalGuesses: 0,
    correctGuesses: 0,
    incorrectGuesses: 0,
    uniqueGuessers: new Set<string>(),
    lastGuessedAt: null,
  };
}

function maxDate(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return left > right ? left : right;
}

export async function listExerciseArchive(): Promise<ExerciseArchiveRow[]> {
  const admin = createAdminClient();

  const [exercisesRes, dailyRes, gamesRes, attemptsRes, mediaRes, enrichmentRes] = await Promise.all([
    admin
      .from("exercises")
      .select("id, slug, name, aliases, muscle_group, muscle, equipment, movement, pattern, reps, goal, ego, is_live")
      .order("name", { ascending: true })
      .returns<ExerciseRow[]>(),
    admin.from("daily_exercises").select("game_date, exercise_id").returns<DailyExerciseRow[]>(),
    admin
      .from("user_daily_games")
      .select("id, user_id, game_date, status, guess_count")
      .returns<UserDailyGameRow[]>(),
    admin
      .from("game_attempts")
      .select("user_id, game_date, user_daily_game_id, guess_exercise_id, is_correct, created_at")
      .returns<GameAttemptRow[]>(),
    admin
      .from("exercise_media")
      .select("exercise_slug, sync_status, provider_exercise_name, media_url, last_synced_at")
      .returns<ExerciseMediaRow[]>(),
    admin
      .from("exercise_enrichment")
      .select(
        "exercise_slug, enrichment_status, provider_exercise_name, normalized_muscle, normalized_equipment, normalized_movement, normalized_pattern, normalized_reps, normalized_goal, normalized_ego, last_enriched_at",
      )
      .returns<ExerciseEnrichmentRow[]>(),
  ]);

  if (exercisesRes.error) throw new Error(`Failed to load exercises: ${exercisesRes.error.message}`);
  if (dailyRes.error) throw new Error(`Failed to load daily targets: ${dailyRes.error.message}`);
  if (gamesRes.error) throw new Error(`Failed to load daily games: ${gamesRes.error.message}`);
  if (attemptsRes.error) throw new Error(`Failed to load attempts: ${attemptsRes.error.message}`);

  const exercises = exercisesRes.data ?? [];
  const dailyTargets = dailyRes.data ?? [];
  const games = gamesRes.data ?? [];
  const attempts = attemptsRes.data ?? [];
  // Keep archive page resilient if optional support tables are temporarily unavailable.
  const mediaRows = mediaRes.error ? [] : (mediaRes.data ?? []);
  const enrichmentRows = enrichmentRes.error ? [] : (enrichmentRes.data ?? []);

  const mediaBySlug = new Map(mediaRows.map((row) => [row.exercise_slug, row]));
  const enrichmentBySlug = new Map(enrichmentRows.map((row) => [row.exercise_slug, row]));
  const targetByDate = new Map<string, string>();
  for (const daily of dailyTargets) {
    targetByDate.set(daily.game_date, daily.exercise_id);
  }

  const targetStatsByExerciseId = new Map<string, TargetStats>();
  for (const daily of dailyTargets) {
    const bucket = targetStatsByExerciseId.get(daily.exercise_id) ?? createTargetStats();
    bucket.timesAsDailyTarget += 1;
    bucket.lastDailyTargetDate = maxDate(bucket.lastDailyTargetDate, daily.game_date);
    targetStatsByExerciseId.set(daily.exercise_id, bucket);
  }

  for (const game of games) {
    const targetExerciseId = targetByDate.get(game.game_date);
    if (!targetExerciseId) continue;

    const bucket = targetStatsByExerciseId.get(targetExerciseId) ?? createTargetStats();
    if (game.status === "won") {
      bucket.winsWhenTarget += 1;
      bucket.totalGuessesToSolve += game.guess_count;
      bucket.solvedRounds += 1;
    } else if (game.status === "lost") {
      bucket.lossesWhenTarget += 1;
    }
    targetStatsByExerciseId.set(targetExerciseId, bucket);
  }

  const guessStatsByExerciseId = new Map<string, GuessStats>();
  for (const attempt of attempts) {
    const bucket = guessStatsByExerciseId.get(attempt.guess_exercise_id) ?? createGuessStats();
    bucket.totalGuesses += 1;
    if (attempt.is_correct) bucket.correctGuesses += 1;
    else bucket.incorrectGuesses += 1;

    if (attempt.user_id) {
      bucket.uniqueGuessers.add(attempt.user_id);
    }
    bucket.lastGuessedAt = maxDate(bucket.lastGuessedAt, attempt.created_at);
    guessStatsByExerciseId.set(attempt.guess_exercise_id, bucket);
  }

  return exercises.map((exercise) => {
    const media = mediaBySlug.get(exercise.slug);
    const enrichment = enrichmentBySlug.get(exercise.slug);
    const targetStats = targetStatsByExerciseId.get(exercise.id) ?? createTargetStats();
    const guessStats = guessStatsByExerciseId.get(exercise.id) ?? createGuessStats();

    const avgGuessesToSolveWhenTarget =
      targetStats.solvedRounds > 0 ? Number((targetStats.totalGuessesToSolve / targetStats.solvedRounds).toFixed(2)) : null;

    const accuracy =
      guessStats.totalGuesses > 0 ? Number(((guessStats.correctGuesses / guessStats.totalGuesses) * 100).toFixed(2)) : null;

    return {
      id: exercise.id,
      slug: exercise.slug,
      name: exercise.name,
      aliases: exercise.aliases ?? [],
      muscleGroup: exercise.muscle_group,
      muscle: exercise.muscle ?? [],
      equipment: exercise.equipment ?? [],
      movement: exercise.movement ?? [],
      pattern: exercise.pattern ?? [],
      reps: exercise.reps ?? [],
      goal: exercise.goal ?? [],
      ego: exercise.ego ?? [],
      isLive: exercise.is_live,
      media: {
        syncStatus: media?.sync_status ?? null,
        providerExerciseName: media?.provider_exercise_name ?? null,
        mediaUrl: media?.media_url ?? null,
        lastSyncedAt: media?.last_synced_at ?? null,
      },
      enrichment: {
        status: enrichment?.enrichment_status ?? null,
        providerExerciseName: enrichment?.provider_exercise_name ?? null,
        normalizedMuscle: enrichment?.normalized_muscle ?? null,
        normalizedEquipment: enrichment?.normalized_equipment ?? null,
        normalizedMovement: enrichment?.normalized_movement ?? null,
        normalizedPattern: enrichment?.normalized_pattern ?? null,
        normalizedReps: enrichment?.normalized_reps ?? null,
        normalizedGoal: enrichment?.normalized_goal ?? null,
        normalizedEgo: enrichment?.normalized_ego ?? null,
        lastEnrichedAt: enrichment?.last_enriched_at ?? null,
      },
      stats: {
        timesAsDailyTarget: targetStats.timesAsDailyTarget,
        winsWhenTarget: targetStats.winsWhenTarget,
        lossesWhenTarget: targetStats.lossesWhenTarget,
        avgGuessesToSolveWhenTarget,
        totalGuesses: guessStats.totalGuesses,
        correctGuesses: guessStats.correctGuesses,
        incorrectGuesses: guessStats.incorrectGuesses,
        accuracy,
        uniqueGuessers: guessStats.uniqueGuessers.size,
        lastGuessedAt: guessStats.lastGuessedAt,
        lastDailyTargetDate: targetStats.lastDailyTargetDate,
      },
    };
  });
}
