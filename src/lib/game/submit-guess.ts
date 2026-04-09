import { trackEvent } from "@/lib/analytics/track";
import { evaluateGuess, isCorrectGuess } from "@/lib/exercises/evaluate";
import { resolveDailySelection } from "@/lib/game/daily-target";
import { gameDateRome } from "@/lib/game/date";
import { getTodayGameState } from "@/lib/game/bootstrap";
import { AuthRequiredError, GameConflictError } from "@/lib/game/shared";
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Exercise } from "@/types/exercise";
import type { PublicTodayGameState } from "@/types/game";

type UserDailyGameRow = {
  id: string;
  user_id: string;
  game_date: string;
  status: "in_progress" | "won" | "lost";
  guess_count: number;
  max_guesses: number | null;
};

const TECHNICAL_MAX_GUESSES = 2147483647;

async function getOrCreateUserDailyGame(userId: string, gameDate: string): Promise<UserDailyGameRow> {
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
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
      const { data: reopened, error: reopenError } = await admin
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

  const { data: created, error: createError } = await admin
    .from("user_daily_games")
    .insert({
      user_id: userId,
      game_date: gameDate,
      status: "in_progress",
      guess_count: 0,
      max_guesses: TECHNICAL_MAX_GUESSES,
    })
    .select("id, user_id, game_date, status, guess_count, max_guesses")
    .single<UserDailyGameRow>();

  if (createError) {
    throw new Error(`Failed to create user daily game: ${createError.message}`);
  }

  await trackEvent({
    userId,
    eventName: "daily_game_created",
    payload: { gameDate },
  });

  return created;
}

export async function submitGuess(input: {
  guessExerciseId: string;
}): Promise<PublicTodayGameState> {
  await createClient();
  const admin = createAdminClient();
  const gameDate = gameDateRome();

  const user = await getAuthenticatedUser();

  if (!user) {
    throw new AuthRequiredError();
  }

  const dailySelection = await resolveDailySelection(gameDate);

  const userDailyGame = await getOrCreateUserDailyGame(user.id, gameDate);

  if (userDailyGame.status !== "in_progress") {
    throw new GameConflictError("Game is already finished for today.");
  }

  const { data: guessedExercise, error: guessError } = await admin
    .from("exercises")
    .select("*")
    .eq("id", input.guessExerciseId)
    .eq("is_live", true)
    .maybeSingle<Exercise>();

  if (guessError) {
    throw new Error(`Failed to load guessed exercise: ${guessError.message}`);
  }

  if (!guessedExercise) {
    throw new GameConflictError("Guessed exercise does not exist or is not live.");
  }

  const { data: targetExercise, error: targetError } = await admin
    .from("exercises")
    .select("*")
    .eq("id", dailySelection.exerciseId)
    .maybeSingle<Exercise>();

  if (targetError) {
    throw new Error(`Failed to load target exercise: ${targetError.message}`);
  }

  if (!targetExercise) {
    throw new GameConflictError(`Daily target exercise is missing for ${gameDate}.`);
  }

  const feedback = evaluateGuess(guessedExercise, targetExercise);
  const correct = isCorrectGuess(feedback);
  const newGuessCount = userDailyGame.guess_count + 1;

  let nextStatus: "in_progress" | "won" | "lost" = "in_progress";

  if (correct) {
    nextStatus = "won";
  }

  const nowIso = new Date().toISOString();

  const { error: attemptError } = await admin.from("game_attempts").insert({
    user_id: user.id,
    game_date: gameDate,
    user_daily_game_id: userDailyGame.id,
    guess_index: newGuessCount,
    guess_exercise_id: input.guessExerciseId,
    feedback,
    is_correct: correct,
  });

  if (attemptError) {
    throw new Error(`Failed to write game attempt: ${attemptError.message}`);
  }

  const updatePayload: {
    guess_count: number;
    last_guess_at: string;
    status: "in_progress" | "won" | "lost";
    finished_at?: string;
  } = {
    guess_count: newGuessCount,
    last_guess_at: nowIso,
    status: nextStatus,
  };

  if (nextStatus !== "in_progress") {
    updatePayload.finished_at = nowIso;
  }

  const { error: updateGameError } = await admin
    .from("user_daily_games")
    .update(updatePayload)
    .eq("id", userDailyGame.id);

  if (updateGameError) {
    throw new Error(`Failed to update daily game state: ${updateGameError.message}`);
  }

  await trackEvent({
    userId: user.id,
    eventName: "guess_submitted",
    payload: {
      gameDate,
      guessExerciseId: input.guessExerciseId,
      guessCount: newGuessCount,
      isCorrect: correct,
    },
  });

  if (nextStatus === "won") {
    await trackEvent({
      userId: user.id,
      eventName: "game_won",
      payload: { gameDate, guessCount: newGuessCount },
    });
  }

  return getTodayGameState();
}
