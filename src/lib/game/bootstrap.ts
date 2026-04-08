import { trackEvent } from "@/lib/analytics/track";
import { gameDateRome } from "@/lib/game/date";
import { AuthRequiredError, GameConflictError, normalizeFeedback } from "@/lib/game/shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PublicTodayGameState } from "@/types/game";

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
  max_guesses: number | null;
};

type GameAttemptRow = {
  id: string;
  guess_exercise_id: string;
  feedback: unknown;
  is_correct: boolean;
  created_at: string;
};

type ExerciseNameRow = {
  id: string;
  name: string;
  muscle: string[];
  equipment: string[];
  movement: string[];
  pattern: string[];
  reps: string[];
  goal: string[];
  ego: string[];
};

const DEFAULT_MAX_GUESSES = 6;

async function ensureUserDailyGame(userId: string, gameDate: string): Promise<UserDailyGameRow> {
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("user_daily_games")
    .select("id, user_id, game_date, status, guess_count, max_guesses")
    .eq("user_id", userId)
    .eq("game_date", gameDate)
    .maybeSingle<UserDailyGameRow>();

  if (existingError) {
    throw new Error(`Failed to load user daily game: ${existingError.message}`);
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: createError } = await supabase
    .from("user_daily_games")
    .insert({
      user_id: userId,
      game_date: gameDate,
      status: "in_progress",
      guess_count: 0,
      max_guesses: DEFAULT_MAX_GUESSES,
    })
    .select("id, user_id, game_date, status, guess_count, max_guesses")
    .single<UserDailyGameRow>();

  if (createError) {
    throw new Error(`Failed to create user daily game: ${createError.message}`);
  }

  await supabase.from("user_stats").upsert({ user_id: userId }, { onConflict: "user_id" });

  await trackEvent({
    userId,
    eventName: "daily_game_created",
    payload: { gameDate },
  });

  return created;
}

async function getTodayDailyExercise(gameDate: string): Promise<DailyExerciseRow> {
  const admin = createAdminClient();

  const { data: dailyExercise, error: dailyExerciseError } = await admin
    .from("daily_exercises")
    .select("game_date, exercise_id")
    .eq("game_date", gameDate)
    .maybeSingle<DailyExerciseRow>();

  if (dailyExerciseError) {
    throw new Error(`Failed to load daily exercise: ${dailyExerciseError.message}`);
  }

  if (!dailyExercise?.exercise_id) {
    throw new GameConflictError(`No daily exercise configured for ${gameDate}.`);
  }

  return dailyExercise;
}

export async function getTodayGameState(): Promise<PublicTodayGameState> {
  const supabase = await createClient();
  const gameDate = gameDateRome();

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Failed to load authenticated user: ${userError.message}`);
  }

  const user = userData.user;

  if (!user) {
    throw new AuthRequiredError();
  }

  await getTodayDailyExercise(gameDate);

  const game = await ensureUserDailyGame(user.id, gameDate);

  const { data: attemptRows, error: attemptsError } = await supabase
    .from("game_attempts")
    .select("id, guess_exercise_id, feedback, is_correct, created_at")
    .eq("user_daily_game_id", game.id)
    .order("created_at", { ascending: true })
    .returns<GameAttemptRow[]>();

  if (attemptsError) {
    throw new Error(`Failed to load game attempts: ${attemptsError.message}`);
  }

  const guessIds = (attemptRows ?? []).map((row) => row.guess_exercise_id);

  let namesById = new Map<string, string>();

  if (guessIds.length > 0) {
    const { data: exerciseRows, error: exercisesError } = await supabase
      .from("exercises")
      .select("id, name, muscle, equipment, movement, pattern, reps, goal, ego")
      .in("id", guessIds)
      .returns<ExerciseNameRow[]>();

    if (exercisesError) {
      throw new Error(`Failed to resolve guessed exercise names: ${exercisesError.message}`);
    }

    namesById = new Map((exerciseRows ?? []).map((row) => [row.id, row.name]));
    const detailsById = new Map((exerciseRows ?? []).map((row) => [row.id, row]));

    const attempts = (attemptRows ?? []).map((row) => {
      const details = detailsById.get(row.guess_exercise_id);

      return {
        id: row.id,
        guessExerciseId: row.guess_exercise_id,
        guessName: namesById.get(row.guess_exercise_id) ?? "Unknown Exercise",
        values: {
          muscle: details?.muscle.join(" / ") ?? "-",
          equipment: details?.equipment.join(" / ") ?? "-",
          movement: details?.movement.join(" / ") ?? "-",
          pattern: details?.pattern.join(" / ") ?? "-",
          reps: details?.reps.join(" / ") ?? "-",
          goal: details?.goal.join(" / ") ?? "-",
          ego: details?.ego.join(" / ") ?? "-",
        },
        feedback: normalizeFeedback(row.feedback),
        isCorrect: row.is_correct,
      };
    });

    return {
      gameDate,
      status: game.status,
      guessCount: game.guess_count,
      maxGuesses: game.max_guesses ?? DEFAULT_MAX_GUESSES,
      attempts,
    };
  }

  const attempts = (attemptRows ?? []).map((row) => ({
    id: row.id,
    guessExerciseId: row.guess_exercise_id,
    guessName: namesById.get(row.guess_exercise_id) ?? "Unknown Exercise",
    values: {
      muscle: "-",
      equipment: "-",
      movement: "-",
      pattern: "-",
      reps: "-",
      goal: "-",
      ego: "-",
    },
    feedback: normalizeFeedback(row.feedback),
    isCorrect: row.is_correct,
  }));

  return {
    gameDate,
    status: game.status,
    guessCount: game.guess_count,
    maxGuesses: game.max_guesses ?? DEFAULT_MAX_GUESSES,
    attempts,
  };
}
