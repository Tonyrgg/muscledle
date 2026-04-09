import { trackEvent } from "@/lib/analytics/track";
import { resolveDailySelection, resolveYesterdaySelection } from "@/lib/game/daily-target";
import { gameDateRome } from "@/lib/game/date";
import { AuthRequiredError, normalizeFeedback } from "@/lib/game/shared";
import { createClient } from "@/lib/supabase/server";
import type { PublicTodayGameState } from "@/types/game";

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
  slug: string;
  name: string;
  muscle: string[];
  equipment: string[];
  movement: string[];
  pattern: string[];
  reps: string[];
  goal: string[];
  ego: string[];
};

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
    if (existing.status === "lost") {
      const { data: reopened, error: reopenError } = await supabase
        .from("user_daily_games")
        .update({
          status: "in_progress",
          finished_at: null,
        })
        .eq("id", existing.id)
        .select("id, user_id, game_date, status, guess_count, max_guesses")
        .single<UserDailyGameRow>();

      if (reopenError) {
        throw new Error(`Failed to reopen user daily game: ${reopenError.message}`);
      }

      return reopened;
    }

    return existing;
  }

  const { data: created, error: createError } = await supabase
    .from("user_daily_games")
    .insert({
      user_id: userId,
      game_date: gameDate,
      status: "in_progress",
      guess_count: 0,
      max_guesses: null,
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

  await resolveDailySelection(gameDate);
  const yesterdaySelection = await resolveYesterdaySelection(gameDate);

  const game = await ensureUserDailyGame(user.id, gameDate);

  const { data: attemptRows, error: attemptsError } = await supabase
    .from("game_attempts")
    .select("id, guess_exercise_id, feedback, is_correct, created_at")
    .eq("user_daily_game_id", game.id)
    .order("created_at", { ascending: false })
    .returns<GameAttemptRow[]>();

  if (attemptsError) {
    throw new Error(`Failed to load game attempts: ${attemptsError.message}`);
  }

  const guessIds = (attemptRows ?? []).map((row) => row.guess_exercise_id);

  let detailsById = new Map<string, ExerciseNameRow>();

  if (guessIds.length > 0) {
    const { data: exerciseRows, error: exercisesError } = await supabase
      .from("exercises")
      .select("id, slug, name, muscle, equipment, movement, pattern, reps, goal, ego")
      .in("id", guessIds)
      .returns<ExerciseNameRow[]>();

    if (exercisesError) {
      throw new Error(`Failed to resolve guessed exercise names: ${exercisesError.message}`);
    }

    detailsById = new Map((exerciseRows ?? []).map((row) => [row.id, row]));

    const attempts = (attemptRows ?? []).map((row) => {
      const details = detailsById.get(row.guess_exercise_id);

      return {
        id: row.id,
        guessExerciseId: row.guess_exercise_id,
        guessSlug: details?.slug ?? "",
        guessName: details?.name ?? "Unknown Exercise",
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
      yesterdayExerciseName: yesterdaySelection.exerciseName,
      status: game.status,
      guessCount: game.guess_count,
      attempts,
    };
  }

  const attempts = (attemptRows ?? []).map((row) => ({
    id: row.id,
    guessExerciseId: row.guess_exercise_id,
    guessSlug: detailsById.get(row.guess_exercise_id)?.slug ?? "",
    guessName: detailsById.get(row.guess_exercise_id)?.name ?? "Unknown Exercise",
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
    yesterdayExerciseName: yesterdaySelection.exerciseName,
    status: game.status,
    guessCount: game.guess_count,
    attempts,
  };
}
