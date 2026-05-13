import { trackEvent } from "@/lib/analytics/track";
import { evaluateGuess, isCorrectGuess } from "@/lib/exercises/evaluate";
import { getExerciseNaming, resolveMergedIntoSlug } from "@/lib/exercises/naming";
import { getRepsDirection } from "@/lib/exercises/reps-direction";
import { resolveDailySelection } from "@/lib/game/daily-target";
import { gameDateRome } from "@/lib/game/date";
import { AuthRequiredError, GameConflictError } from "@/lib/game/shared";
import { getDailyViewerIdentity } from "@/lib/game/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Exercise } from "@/types/exercise";
import type { PublicGameAttempt, SubmitGuessResponse } from "@/types/game";

type UserDailyGameRow = {
  id: string;
  user_id: string | null;
  session_public_id: string | null;
  game_date: string;
  status: "in_progress" | "won" | "lost";
  guess_count: number;
  max_guesses: number | null;
};

const TECHNICAL_MAX_GUESSES = 2147483647;

async function getOrCreateUserDailyGame(args: {
  userId: string | null;
  sessionPublicId: string | null;
  gameDate: string;
}): Promise<UserDailyGameRow> {
  if (!args.userId && !args.sessionPublicId) {
    throw new AuthRequiredError();
  }

  const admin = createAdminClient();

  let existingQuery = admin
    .from("user_daily_games")
    .select("id, user_id, session_public_id, game_date, status, guess_count, max_guesses")
    .eq("game_date", args.gameDate);

  if (args.userId) {
    existingQuery = existingQuery.eq("user_id", args.userId);
  } else {
    existingQuery = existingQuery.is("user_id", null).eq("session_public_id", args.sessionPublicId);
  }

  const { data: existing, error: existingError } = await existingQuery.maybeSingle<UserDailyGameRow>();

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
        .select("id, user_id, session_public_id, game_date, status, guess_count, max_guesses")
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
      user_id: args.userId,
      session_public_id: args.userId ? null : args.sessionPublicId,
      game_date: args.gameDate,
      status: "in_progress",
      guess_count: 0,
      max_guesses: TECHNICAL_MAX_GUESSES,
    })
    .select("id, user_id, session_public_id, game_date, status, guess_count, max_guesses")
    .single<UserDailyGameRow>();

  if (createError) {
    throw new Error(`Failed to create user daily game: ${createError.message}`);
  }

  await trackEvent({
    userId: args.userId,
    sessionId: args.sessionPublicId,
    eventName: "daily_game_created",
    payload: { gameDate: args.gameDate },
  });

  return created;
}

export async function submitGuess(input: {
  guessExerciseId: string;
}): Promise<SubmitGuessResponse> {
  const admin = createAdminClient();
  const gameDate = gameDateRome();

  const viewer = await getDailyViewerIdentity();
  if (!viewer.userId && !viewer.sessionPublicId) {
    throw new AuthRequiredError();
  }

  const [dailySelection, userDailyGame] = await Promise.all([
    resolveDailySelection(gameDate),
    getOrCreateUserDailyGame({
      userId: viewer.userId,
      sessionPublicId: viewer.sessionPublicId,
      gameDate,
    }),
  ]);

  if (userDailyGame.status !== "in_progress") {
    throw new GameConflictError("Game is already finished for today.");
  }

  const [{ data: guessedExerciseRaw, error: guessError }, { data: targetExercise, error: targetError }] =
    await Promise.all([
      admin
        .from("exercises")
        .select("*")
        .eq("id", input.guessExerciseId)
        .eq("is_live", true)
        .maybeSingle<Exercise>(),
      admin
        .from("exercises")
        .select("*")
        .eq("id", dailySelection.exerciseId)
        .maybeSingle<Exercise>(),
    ]);

  if (guessError) {
    throw new Error(`Failed to load guessed exercise: ${guessError.message}`);
  }

  if (!guessedExerciseRaw) {
    throw new GameConflictError("Guessed exercise does not exist or is not live.");
  }

  let guessedExercise = guessedExerciseRaw;
  const mergedIntoSlug = resolveMergedIntoSlug(guessedExerciseRaw.slug);
  if (mergedIntoSlug) {
    const { data: mergedTarget, error: mergedTargetError } = await admin
      .from("exercises")
      .select("*")
      .eq("slug", mergedIntoSlug)
      .eq("is_live", true)
      .maybeSingle<Exercise>();

    if (mergedTargetError) {
      throw new Error(`Failed to resolve merged guessed exercise: ${mergedTargetError.message}`);
    }

    if (mergedTarget) {
      guessedExercise = mergedTarget;
    }
  }

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

  const { data: insertedAttempt, error: attemptError } = await admin
    .from("game_attempts")
    .insert({
      user_id: viewer.userId,
      session_public_id: viewer.userId ? null : viewer.sessionPublicId,
      game_date: gameDate,
      user_daily_game_id: userDailyGame.id,
      guess_index: newGuessCount,
      guess_exercise_id: guessedExercise.id,
      feedback,
      is_correct: correct,
    })
    .select("id")
    .single<{ id: string }>();

  if (attemptError) {
    throw new Error(`Failed to write game attempt: ${attemptError.message}`);
  }

  if (!insertedAttempt?.id) {
    throw new Error("Failed to write game attempt: missing inserted attempt id.");
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

  const nextAttempt: PublicGameAttempt = {
    id: insertedAttempt.id,
    guessExerciseId: guessedExercise.id,
    guessSlug: guessedExercise.slug,
    guessName: getExerciseNaming(guessedExercise.slug, guessedExercise.name).display_name,
    guessMuscleGroup: guessedExercise.muscle_group ?? null,
    values: {
      muscle: guessedExercise.muscle.join(" / "),
      equipment: guessedExercise.equipment.join(" / "),
      movement: guessedExercise.movement.join(" / "),
      pattern: guessedExercise.pattern.join(" / "),
      reps: guessedExercise.reps.join(" / "),
      goal: guessedExercise.goal.join(" / "),
      ego: guessedExercise.ego.join(" / "),
    },
    repsDirection: getRepsDirection(guessedExercise.reps, targetExercise.reps),
    feedback,
    isCorrect: correct,
  };

  void trackEvent({
    userId: viewer.userId,
    sessionId: viewer.sessionPublicId,
    eventName: "guess_submitted",
    payload: {
      gameDate,
      guessExerciseId: guessedExercise.id,
      guessCount: newGuessCount,
      isCorrect: correct,
    },
  });

  if (nextStatus === "won") {
    void trackEvent({
      userId: viewer.userId,
      sessionId: viewer.sessionPublicId,
      eventName: "game_won",
      payload: { gameDate, guessCount: newGuessCount },
    });
  }

  return {
    gameDate,
    status: nextStatus,
    guessCount: newGuessCount,
    attempt: nextAttempt,
  };
}
