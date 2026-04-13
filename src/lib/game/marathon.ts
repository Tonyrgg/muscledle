import { evaluateGuess, isCorrectGuess } from "@/lib/exercises/evaluate";
import { trackEvent } from "@/lib/analytics/track";
import { AuthRequiredError, GameConflictError, normalizeFeedback } from "@/lib/game/shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { Exercise } from "@/types/exercise";
import type { PublicGameAttempt, PublicMarathonState, SubmitMarathonGuessResponse } from "@/types/game";

type MarathonRunRow = {
  id: string;
  user_id: string;
  status: "in_progress" | "won" | "lost";
  score: number;
  current_index: number;
  max_attempts_per_round: number;
  exercise_order_ids: string[];
  run_seed: number | null;
};

type MarathonAttemptRow = {
  id: string;
  round_index: number;
  guess_index: number;
  guess_exercise_id: string;
  feedback: unknown;
  is_correct: boolean;
};

type ExerciseDetailsRow = {
  id: string;
  slug: string;
  name: string;
  muscle_group: string | null;
  muscle: string[];
  equipment: string[];
  movement: string[];
  pattern: string[];
  reps: string[];
  goal: string[];
  ego: string[];
};

function toPublicAttempt(row: MarathonAttemptRow, detailsById: Map<string, ExerciseDetailsRow>): PublicGameAttempt {
  const details = detailsById.get(row.guess_exercise_id);

  return {
    id: row.id,
    guessExerciseId: row.guess_exercise_id,
    guessSlug: details?.slug ?? "",
    guessName: details?.name ?? "Unknown Exercise",
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
    feedback: normalizeFeedback(row.feedback),
    isCorrect: row.is_correct,
  };
}

function toExerciseModel(row: ExerciseDetailsRow): Exercise {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    aliases: [],
    muscle: row.muscle as Exercise["muscle"],
    equipment: row.equipment as Exercise["equipment"],
    movement: row.movement as Exercise["movement"],
    pattern: row.pattern as Exercise["pattern"],
    reps: row.reps as Exercise["reps"],
    goal: row.goal as Exercise["goal"],
    ego: row.ego as Exercise["ego"],
    muscle_group: (row.muscle_group ?? "core") as Exercise["muscle_group"],
    is_live: true,
  };
}

function toPublicState(run: MarathonRunRow | null, attempts: PublicGameAttempt[]): PublicMarathonState {
  if (!run) {
    return {
      status: "not_started",
      score: 0,
      currentIndex: 0,
      attempts: [],
      maxAttemptsPerRound: 10,
      exerciseOrderIds: [],
      runSeed: null,
    };
  }

  return {
    status: run.status,
    score: run.score,
    currentIndex: run.current_index,
    attempts,
    maxAttemptsPerRound: run.max_attempts_per_round,
    exerciseOrderIds: run.exercise_order_ids ?? [],
    runSeed: run.run_seed ?? null,
  };
}

function shuffleIds(ids: string[]): string[] {
  const output = [...ids];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = output[i];
    output[i] = output[j];
    output[j] = tmp;
  }
  return output;
}

async function getActiveRun(userId: string): Promise<MarathonRunRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("marathon_runs")
    .select("id, user_id, status, score, current_index, max_attempts_per_round, exercise_order_ids, run_seed")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .maybeSingle<MarathonRunRow>();

  if (error) {
    throw new Error(`Failed to load active marathon run: ${error.message}`);
  }

  return data ?? null;
}

async function getRoundAttempts(runId: string, roundIndex: number): Promise<MarathonAttemptRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("marathon_attempts")
    .select("id, round_index, guess_index, guess_exercise_id, feedback, is_correct")
    .eq("run_id", runId)
    .eq("round_index", roundIndex)
    .order("guess_index", { ascending: false })
    .returns<MarathonAttemptRow[]>();

  if (error) {
    throw new Error(`Failed to load marathon attempts: ${error.message}`);
  }

  return data ?? [];
}

async function getExerciseDetailsByIds(ids: string[]): Promise<Map<string, ExerciseDetailsRow>> {
  if (ids.length === 0) return new Map();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exercises")
    .select("id, slug, name, muscle_group, muscle, equipment, movement, pattern, reps, goal, ego")
    .in("id", ids)
    .returns<ExerciseDetailsRow[]>();

  if (error) {
    throw new Error(`Failed to load exercise details: ${error.message}`);
  }

  return new Map((data ?? []).map((row) => [row.id, row]));
}

async function getLiveExerciseIds(): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exercises")
    .select("id")
    .eq("is_live", true)
    .returns<Array<{ id: string }>>();

  if (error) {
    throw new Error(`Failed to load live exercises: ${error.message}`);
  }

  return (data ?? []).map((row) => row.id);
}

async function getAuthenticatedUserId(): Promise<string> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new AuthRequiredError();
  }
  return user.id;
}

export async function getMarathonState(): Promise<PublicMarathonState> {
  const userId = await getAuthenticatedUserId();
  const run = await getActiveRun(userId);

  if (!run) {
    return toPublicState(null, []);
  }

  const attemptRows = await getRoundAttempts(run.id, run.current_index);
  const detailsById = await getExerciseDetailsByIds(attemptRows.map((row) => row.guess_exercise_id));
  const attempts = attemptRows.map((row) => toPublicAttempt(row, detailsById));

  return toPublicState(run, attempts);
}

export async function startMarathonRun(): Promise<PublicMarathonState> {
  const userId = await getAuthenticatedUserId();
  const admin = createAdminClient();

  await admin
    .from("marathon_runs")
    .update({
      status: "lost",
      finished_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "in_progress");

  const exerciseIds = await getLiveExerciseIds();
  if (exerciseIds.length === 0) {
    throw new GameConflictError("No live exercises available for marathon.");
  }

  const runSeed = Date.now();
  const order = shuffleIds(exerciseIds);

  const { data: created, error: createError } = await admin
    .from("marathon_runs")
    .insert({
      user_id: userId,
      status: "in_progress",
      score: 0,
      current_index: 0,
      max_attempts_per_round: 10,
      exercise_order_ids: order,
      run_seed: runSeed,
      started_at: new Date().toISOString(),
      finished_at: null,
    })
    .select("id, user_id, status, score, current_index, max_attempts_per_round, exercise_order_ids, run_seed")
    .single<MarathonRunRow>();

  if (createError || !created) {
    throw new Error(`Failed to create marathon run: ${createError?.message ?? "unknown error"}`);
  }

  void trackEvent({
    userId,
    eventName: "marathon_started",
    payload: {
      runSeed,
      exerciseCount: order.length,
    },
  });

  return toPublicState(created, []);
}

export async function resetMarathonRun(): Promise<PublicMarathonState> {
  const userId = await getAuthenticatedUserId();
  const admin = createAdminClient();

  await admin
    .from("marathon_runs")
    .update({
      status: "lost",
      finished_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "in_progress");

  return toPublicState(null, []);
}

export async function submitMarathonGuess(input: { guessExerciseId: string }): Promise<SubmitMarathonGuessResponse> {
  const userId = await getAuthenticatedUserId();
  const admin = createAdminClient();

  const run = await getActiveRun(userId);
  if (!run) {
    throw new GameConflictError("No active marathon run. Start a run first.");
  }

  const targetExerciseId = run.exercise_order_ids[run.current_index];
  if (!targetExerciseId) {
    throw new GameConflictError("Marathon run has no target exercise.");
  }

  const [guessRows, currentAttemptRows] = await Promise.all([
    getExerciseDetailsByIds([input.guessExerciseId, targetExerciseId]),
    getRoundAttempts(run.id, run.current_index),
  ]);

  const guessedRow = guessRows.get(input.guessExerciseId);
  const targetRow = guessRows.get(targetExerciseId);

  if (!guessedRow || !targetRow) {
    throw new GameConflictError("Guessed exercise or target exercise not found.");
  }

  if (currentAttemptRows.some((row) => row.guess_exercise_id === input.guessExerciseId)) {
    throw new GameConflictError("You already guessed this exercise in this round.");
  }

  const guessedModel = toExerciseModel(guessedRow);
  const targetModel = toExerciseModel(targetRow);
  const feedback = evaluateGuess(guessedModel, targetModel);
  const correct = isCorrectGuess(feedback);
  const guessIndex = currentAttemptRows.length + 1;

  const { data: insertedAttempt, error: attemptError } = await admin
    .from("marathon_attempts")
    .insert({
      run_id: run.id,
      user_id: userId,
      round_index: run.current_index,
      guess_index: guessIndex,
      guess_exercise_id: input.guessExerciseId,
      feedback,
      is_correct: correct,
    })
    .select("id, round_index, guess_index, guess_exercise_id, feedback, is_correct")
    .single<MarathonAttemptRow>();

  if (attemptError || !insertedAttempt) {
    throw new Error(`Failed to save marathon attempt: ${attemptError?.message ?? "unknown error"}`);
  }

  let nextScore = run.score;
  let nextIndex = run.current_index;
  let nextStatus: MarathonRunRow["status"] = run.status;
  let pointsEarned = 0;

  if (correct) {
    pointsEarned = Math.max(1, run.max_attempts_per_round - guessIndex + 1);
    nextScore = run.score + pointsEarned;
    nextIndex = run.current_index + 1;
    nextStatus = nextIndex >= run.exercise_order_ids.length ? "won" : "in_progress";
  } else if (guessIndex >= run.max_attempts_per_round) {
    nextStatus = "lost";
  }

  const { data: updatedRun, error: runUpdateError } = await admin
    .from("marathon_runs")
    .update({
      score: nextScore,
      current_index: nextIndex,
      status: nextStatus,
      finished_at: nextStatus === "in_progress" ? null : new Date().toISOString(),
    })
    .eq("id", run.id)
    .select("id, user_id, status, score, current_index, max_attempts_per_round, exercise_order_ids, run_seed")
    .single<MarathonRunRow>();

  if (runUpdateError || !updatedRun) {
    throw new Error(`Failed to update marathon run: ${runUpdateError?.message ?? "unknown error"}`);
  }

  const currentRoundAttempts =
    updatedRun.status === "in_progress"
      ? await getRoundAttempts(updatedRun.id, updatedRun.current_index)
      : [];
  const detailsById = await getExerciseDetailsByIds(
    Array.from(new Set([insertedAttempt.guess_exercise_id, ...currentRoundAttempts.map((row) => row.guess_exercise_id)])),
  );
  const attempt = toPublicAttempt(insertedAttempt, detailsById);
  const attempts = currentRoundAttempts.map((row) => toPublicAttempt(row, detailsById));

  void trackEvent({
    userId,
    eventName: "marathon_guess_submitted",
    payload: {
      runId: run.id,
      roundIndex: run.current_index,
      guessExerciseId: input.guessExerciseId,
      guessIndex,
      isCorrect: correct,
      pointsEarned,
      status: updatedRun.status,
    },
  });

  return {
    state: toPublicState(updatedRun, attempts),
    attempt,
    pointsEarned,
    acceptedFamilyMatch: correct && insertedAttempt.guess_exercise_id !== targetExerciseId,
  };
}
