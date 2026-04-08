import { trackEvent } from "@/lib/analytics/track";
import { evaluateGuess, isCorrectGuess } from "@/lib/exercises/evaluate";
import { gameDateRome } from "@/lib/game/date";
import { getTodayGameState } from "@/lib/game/bootstrap";
import { AuthRequiredError, GameConflictError } from "@/lib/game/shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Exercise } from "@/types/exercise";
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

const DEFAULT_MAX_GUESSES = 6;

async function getOrCreateUserDailyGame(userId: string, gameDate: string): Promise<UserDailyGameRow> {
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
  console.log("SUBMIT_GUESS_START");
  console.log("input", input);
  console.log("guessExerciseId", input.guessExerciseId);

  const supabase = await createClient();
  const admin = createAdminClient();
  const gameDate = gameDateRome();

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Failed to load authenticated user: ${userError.message}`);
  }

  const user = userData.user;
  console.log("user.id", user?.id);

  if (!user) {
    throw new AuthRequiredError();
  }

  console.log("gameDate", gameDate);

  const { data: dailyExercise, error: dailyError } = await admin
    .from("daily_exercises")
    .select("game_date, exercise_id")
    .eq("game_date", gameDate)
    .maybeSingle<DailyExerciseRow>();

  if (dailyError) {
    throw new Error(`Failed to load today's daily exercise: ${dailyError.message}`);
  }

  console.log("dailyExercise", dailyExercise);

  if (!dailyExercise?.exercise_id) {
    throw new GameConflictError(`No daily exercise configured for ${gameDate}.`);
  }

  const userDailyGame = await getOrCreateUserDailyGame(user.id, gameDate);
  console.log("userDailyGame", userDailyGame);

  if (userDailyGame.status !== "in_progress") {
    throw new GameConflictError("Game is already finished for today.");
  }

  const maxGuesses = userDailyGame.max_guesses ?? DEFAULT_MAX_GUESSES;

  if (userDailyGame.guess_count >= maxGuesses) {
    throw new GameConflictError("Maximum guesses reached for today.");
  }

  const { data: guessedExercise, error: guessError } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", input.guessExerciseId)
    .eq("is_live", true)
    .maybeSingle<Exercise>();

  if (guessError) {
    throw new Error(`Failed to load guessed exercise: ${guessError.message}`);
  }

  console.log("guessedExercise", guessedExercise);

  if (!guessedExercise) {
    throw new GameConflictError("Guessed exercise does not exist or is not live.");
  }

  const { data: targetExercise, error: targetError } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", dailyExercise.exercise_id)
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
  } else if (newGuessCount >= maxGuesses) {
    nextStatus = "lost";
  }

  const nowIso = new Date().toISOString();

  console.log("inserting attempt...");
  const { error: attemptError } = await supabase.from("game_attempts").insert({
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

  console.log("updating user daily game...");
  const { error: updateGameError } = await supabase
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

  if (nextStatus === "lost") {
    await trackEvent({
      userId: user.id,
      eventName: "game_lost",
      payload: { gameDate, guessCount: newGuessCount },
    });
  }

  return getTodayGameState();
}
