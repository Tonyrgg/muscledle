import { trackEvent } from "@/lib/analytics/track";
import { resolveDailySelection, resolveYesterdaySelection } from "@/lib/game/daily-target";
import { gameDateRome } from "@/lib/game/date";
import { AuthRequiredError, normalizeFeedback } from "@/lib/game/shared";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getExerciseNaming } from "@/lib/exercises/naming";
import { getRepsDirection } from "@/lib/exercises/reps-direction";
import { getDailyViewerIdentity } from "@/lib/game/viewer";
import type { PublicTodayGameState } from "@/types/game";

type UserDailyGameRow = {
  id: string;
  user_id: string | null;
  session_public_id: string | null;
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
  muscle_group: string;
  muscle: string[];
  equipment: string[];
  movement: string[];
  pattern: string[];
  reps: string[];
  goal: string[];
  ego: string[];
};

const TECHNICAL_MAX_GUESSES = 2147483647;

async function ensureUserDailyGame(args: {
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

  if (args.userId) {
    await admin.from("user_stats").upsert({ user_id: args.userId }, { onConflict: "user_id" });
  }

  await trackEvent({
    userId: args.userId,
    sessionId: args.sessionPublicId,
    eventName: "daily_game_created",
    payload: { gameDate: args.gameDate },
  });

  return created;
}

export async function getTodayGameState(): Promise<PublicTodayGameState> {
  await createClient();
  const admin = createAdminClient();
  const gameDate = gameDateRome();

  const viewer = await getDailyViewerIdentity();
  if (!viewer.userId && !viewer.sessionPublicId) {
    throw new AuthRequiredError();
  }

  const dailySelection = await resolveDailySelection(gameDate);
  const yesterdaySelection = await resolveYesterdaySelection(gameDate);

  const game = await ensureUserDailyGame({
    userId: viewer.userId,
    sessionPublicId: viewer.sessionPublicId,
    gameDate,
  });

  const { data: attemptRows, error: attemptsError } = await admin
    .from("game_attempts")
    .select("id, guess_exercise_id, feedback, is_correct, created_at")
    .eq("user_daily_game_id", game.id)
    .order("created_at", { ascending: false })
    .returns<GameAttemptRow[]>();

  if (attemptsError) {
    throw new Error(`Failed to load game attempts: ${attemptsError.message}`);
  }

  const guessIds = (attemptRows ?? []).map((row) => row.guess_exercise_id);
  const lookupExerciseIds = guessIds.length > 0 ? Array.from(new Set([...guessIds, dailySelection.exerciseId])) : [];

  let detailsById = new Map<string, ExerciseNameRow>();

  if (lookupExerciseIds.length > 0) {
    const { data: exerciseRows, error: exercisesError } = await admin
      .from("exercises")
      .select("id, slug, name, muscle_group, muscle, equipment, movement, pattern, reps, goal, ego")
      .in("id", lookupExerciseIds)
      .returns<ExerciseNameRow[]>();

    if (exercisesError) {
      throw new Error(`Failed to resolve guessed exercise names: ${exercisesError.message}`);
    }

    detailsById = new Map((exerciseRows ?? []).map((row) => [row.id, row]));
    const targetDetails = detailsById.get(dailySelection.exerciseId);

    const attempts = (attemptRows ?? []).map((row) => {
      const details = detailsById.get(row.guess_exercise_id);

      return {
        id: row.id,
        guessExerciseId: row.guess_exercise_id,
        guessSlug: details?.slug ?? "",
        guessName: details
          ? getExerciseNaming(details.slug, details.name).display_name
          : "Unknown Exercise",
        guessMuscleGroup: details?.muscle_group ?? null,
        values: {
          muscle: details?.muscle.join(" / ") ?? "-",
          equipment: details?.equipment.join(" / ") ?? "-",
          movement: details?.movement.join(" / ") ?? "-",
          pattern: details?.pattern.join(" / ") ?? "-",
          reps: details?.reps.join(" / ") ?? "-",
          goal: details?.goal.join(" / ") ?? "-",
          ego: details?.ego.join(" / ") ?? "-",
        },
        repsDirection: details && targetDetails ? getRepsDirection(details.reps, targetDetails.reps) : null,
        feedback: normalizeFeedback(row.feedback),
        isCorrect: row.is_correct,
      };
    });

    return {
      gameDate,
      yesterdayExerciseName: yesterdaySelection.exerciseName,
      dailySecretExerciseId: dailySelection.exerciseId,
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
    guessMuscleGroup: detailsById.get(row.guess_exercise_id)?.muscle_group ?? null,
    values: {
      muscle: "-",
      equipment: "-",
      movement: "-",
      pattern: "-",
      reps: "-",
      goal: "-",
      ego: "-",
    },
    repsDirection: null,
    feedback: normalizeFeedback(row.feedback),
    isCorrect: row.is_correct,
  }));

  return {
    gameDate,
    yesterdayExerciseName: yesterdaySelection.exerciseName,
    dailySecretExerciseId: dailySelection.exerciseId,
    status: game.status,
    guessCount: game.guess_count,
    attempts,
  };
}
