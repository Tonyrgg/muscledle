import { headers } from "next/headers";
import { trackEvent } from "@/lib/analytics/track";
import { gameDateRome } from "@/lib/game/date";
import { AuthRequiredError } from "@/lib/game/shared";
import {
  buildLiftGridPuzzle,
  toLiftGridExercise,
  validateLiftGridGuess,
  type LiftGridExercise,
  type LiftGridPuzzle,
} from "@/lib/liftgrid/puzzle";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { Exercise } from "@/types/exercise";
import type {
  LiftGridEventInput,
  LiftGridFeedbackChoice,
  LiftGridGuessResponse,
  LiftGridPublicState,
  LiftGridSolvedCell,
  PublicLiftGridStats,
  PublicLiftGridStatsPoint,
} from "@/types/liftgrid";

type LiftGridResultRow = {
  id: string;
  game_date: string;
  user_id: string | null;
  session_public_id: string | null;
  solved_cells: LiftGridSolvedCell[] | null;
  completed_count: number | null;
  status: "in_progress" | "completed";
};

type LiftGridAttemptInsertRow = {
  id: string;
};

type LiftGridExerciseRow = Exercise;

type LiftGridStatsRow = {
  game_date: string;
  status: "in_progress" | "completed";
  completed_count: number | null;
};

function parseDateKey(input: string): number {
  const [year, month, day] = input.split("-").map((value) => Number(value));
  return Date.UTC(year, month - 1, day);
}

function dayDiff(from: string, to: string): number {
  const deltaMs = parseDateKey(to) - parseDateKey(from);
  return Math.round(deltaMs / 86400000);
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}

function normalizeSolvedCells(
  solvedCells: LiftGridSolvedCell[] | null | undefined,
  puzzle: LiftGridPuzzle,
  exercises: LiftGridExercise[],
) {
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const seenCellKeys = new Set<string>();
  const seenExerciseIds = new Set<string>();
  const normalized: LiftGridSolvedCell[] = [];

  for (const cell of solvedCells ?? []) {
    const rowIndex = Math.trunc(cell.rowIndex);
    const columnIndex = Math.trunc(cell.columnIndex);

    if (
      !Number.isInteger(rowIndex) ||
      !Number.isInteger(columnIndex) ||
      rowIndex < 0 ||
      columnIndex < 0 ||
      rowIndex >= puzzle.rowValues.length ||
      columnIndex >= puzzle.columnValues.length
    ) {
      continue;
    }

    const key = `${rowIndex}:${columnIndex}`;
    if (seenCellKeys.has(key) || seenExerciseIds.has(cell.exerciseId)) {
      continue;
    }

    const exercise = exerciseById.get(cell.exerciseId);
    if (!exercise) {
      continue;
    }

    const rowValue = puzzle.rowValues[rowIndex];
    const columnValue = puzzle.columnValues[columnIndex];
    const validation = validateLiftGridGuess({
      exercises,
      puzzle,
      solvedCells: normalized,
      guess: exercise.display_name,
    });

    if (
      !validation.correct ||
      !validation.solvedCell ||
      validation.solvedCell.rowIndex !== rowIndex ||
      validation.solvedCell.columnIndex !== columnIndex
    ) {
      const exerciseRowValues = exercise.muscle_group
        .split(/[\/,&|]+/g)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
      const exerciseColumnValues = exercise.equipment.map((entry) => entry.trim().toLowerCase());

      if (!exerciseRowValues.includes(rowValue) || !exerciseColumnValues.includes(columnValue)) {
        continue;
      }
    }

    seenCellKeys.add(key);
    seenExerciseIds.add(cell.exerciseId);
    normalized.push({
      rowIndex,
      columnIndex,
      exerciseId: cell.exerciseId,
      exerciseName: exercise.display_name,
    });
  }

  return normalized;
}

async function persistNormalizedResult(args: {
  resultId: string;
  solvedCells: LiftGridSolvedCell[];
  totalCells: number;
}) {
  const admin = createAdminClient();
  const completedCount = args.solvedCells.length;
  const status = completedCount === args.totalCells ? "completed" : "in_progress";
  const { error } = await admin
    .from("liftgrid_results")
    .update({
      solved_cells: args.solvedCells,
      completed_count: completedCount,
      status,
      finished_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", args.resultId);

  if (error) {
    throw new Error(`Failed to normalize LiftGrid result: ${error.message}`);
  }
}

function isUniqueViolation(error: { code?: string | null; message?: string | null } | null | undefined) {
  if (!error) return false;
  return error.code === "23505" || error.message?.toLowerCase().includes("duplicate key") === true;
}

function cleanPublicId(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 200);
}

async function getViewerIdentity() {
  const headerStore = await headers();
  const sessionPublicId = cleanPublicId(headerStore.get("x-liftdle-session-id"));
  const visitorPublicId = cleanPublicId(headerStore.get("x-liftdle-visitor-id"));
  const language = cleanPublicId(headerStore.get("accept-language"));
  const userAgent = cleanPublicId(headerStore.get("user-agent"));

  let userId: string | null = null;
  try {
    const user = await getAuthenticatedUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  return {
    userId,
    sessionPublicId,
    visitorPublicId,
    language,
    userAgent,
  };
}

async function getLiftGridExercises() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exercises")
    .select("id, slug, name, aliases, muscle_group, muscle, equipment, movement, pattern, reps, goal, ego, is_live")
    .eq("is_live", true)
    .order("name", { ascending: true })
    .returns<LiftGridExerciseRow[]>();

  if (error) {
    throw new Error(`Failed to load LiftGrid exercises: ${error.message}`);
  }

  return (data ?? [])
    .map(toLiftGridExercise)
    .filter((exercise): exercise is NonNullable<typeof exercise> => exercise !== null);
}

async function loadExistingResult(args: {
  gameDate: string;
  userId: string | null;
  sessionPublicId: string | null;
}) {
  const admin = createAdminClient();
  let query = admin
    .from("liftgrid_results")
    .select("id, game_date, user_id, session_public_id, solved_cells, completed_count, status")
    .eq("game_date", args.gameDate);

  if (args.userId) {
    query = query.eq("user_id", args.userId);
  } else if (args.sessionPublicId) {
    query = query.is("user_id", null).eq("session_public_id", args.sessionPublicId);
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle<LiftGridResultRow>();

  if (error) {
    throw new Error(`Failed to load LiftGrid result: ${error.message}`);
  }

  return data;
}

async function createResultRow(args: {
  gameDate: string;
  userId: string | null;
  sessionPublicId: string | null;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("liftgrid_results")
    .insert({
      game_date: args.gameDate,
      user_id: args.userId,
      session_public_id: args.sessionPublicId,
      solved_cells: [],
      completed_count: 0,
      status: "in_progress",
    })
    .select("id, game_date, user_id, session_public_id, solved_cells, completed_count, status")
    .single<LiftGridResultRow>();

  if (error) {
    if (isUniqueViolation(error)) {
      const existing = await loadExistingResult(args);
      if (existing) {
        return existing;
      }
    }

    throw new Error(`Failed to create LiftGrid result: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to create LiftGrid result: unknown error");
  }

  return data;
}

async function getOrCreateLiftGridResult(args: {
  gameDate: string;
  userId: string | null;
  sessionPublicId: string | null;
}) {
  const existing = await loadExistingResult(args);
  if (existing) return existing;

  if (!args.userId && !args.sessionPublicId) {
    return null;
  }

  return createResultRow(args);
}

export async function getLiftGridStats(): Promise<PublicLiftGridStats> {
  const viewer = await getViewerIdentity();
  if (!viewer.userId && !viewer.sessionPublicId) {
    throw new AuthRequiredError();
  }

  const admin = createAdminClient();
  let query = admin
    .from("liftgrid_results")
    .select("game_date, status, completed_count")
    .order("game_date", { ascending: true });

  if (viewer.userId) {
    query = query.eq("user_id", viewer.userId);
  } else {
    query = query.is("user_id", null).eq("session_public_id", viewer.sessionPublicId);
  }

  const { data, error } = await query.returns<LiftGridStatsRow[]>();
  if (error) {
    throw new Error(`Failed to load LiftGrid stats: ${error.message}`);
  }

  const rows = (data ?? []).filter(
    (row) => (row.completed_count ?? 0) > 0 || row.status === "completed",
  );
  const gamesPlayed = rows.length;
  const wins = rows.filter((row) => row.status === "completed");
  const gamesWon = wins.length;
  const winRate = gamesPlayed > 0 ? round1((gamesWon / gamesPlayed) * 100) : 0;
  const averageCompletedCells =
    gamesPlayed > 0
      ? round1(rows.reduce((sum, row) => sum + (row.completed_count ?? 0), 0) / gamesPlayed)
      : 0;
  const averageCompletionRate =
    gamesPlayed > 0 ? round1((averageCompletedCells / 9) * 100) : 0;

  let maxStreak = 0;
  let runningStreak = 0;
  let currentStreak = 0;
  let lastWinDate: string | null = null;
  let prevDate: string | null = null;
  let prevWasWin = false;
  const todayGameDate = gameDateRome();

  for (const row of rows) {
    const isPendingToday = row.status === "in_progress" && row.game_date === todayGameDate;
    if (isPendingToday) {
      continue;
    }

    const isWin = row.status === "completed";
    if (!isWin) {
      runningStreak = 0;
      currentStreak = 0;
      prevDate = row.game_date;
      prevWasWin = false;
      continue;
    }

    if (prevDate !== null && prevWasWin && dayDiff(prevDate, row.game_date) === 1) {
      runningStreak += 1;
    } else {
      runningStreak = 1;
    }

    if (runningStreak > maxStreak) {
      maxStreak = runningStreak;
    }

    currentStreak = runningStreak;
    lastWinDate = row.game_date;
    prevDate = row.game_date;
    prevWasWin = true;
  }

  if (currentStreak > 0 && lastWinDate !== null && dayDiff(lastWinDate, todayGameDate) > 1) {
    currentStreak = 0;
  }

  const completionHistory: PublicLiftGridStatsPoint[] = rows.slice(-30).map((row) => ({
    gameDate: row.game_date,
    completedCount: row.completed_count ?? 0,
    status: row.status,
  }));

  return {
    gamesPlayed,
    gamesWon,
    winRate,
    averageCompletedCells,
    averageCompletionRate,
    currentStreak,
    maxStreak,
    completionHistory,
  };
}

function cleanText(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

function cleanInteger(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

function cleanMetadata(value: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value;
}

export async function recordLiftGridEvent(input: LiftGridEventInput) {
  const identity = await getViewerIdentity();
  const admin = createAdminClient();
  const gameDate = cleanText(input.gameDate ?? gameDateRome(), 20);
  const result = gameDate
    ? await loadExistingResult({
        gameDate,
        userId: identity.userId,
        sessionPublicId: identity.sessionPublicId,
      })
    : null;

  const { error } = await admin.from("liftgrid_event_log").insert({
    user_id: identity.userId,
    session_public_id: identity.sessionPublicId,
    visitor_public_id: identity.visitorPublicId,
    result_id: cleanText(input.resultId, 80) ?? result?.id ?? null,
    attempt_id: cleanText(input.attemptId, 80),
    game_date: gameDate,
    daily_number: cleanInteger(input.dailyNumber),
    event_name: input.eventName,
    event_source: input.eventSource ?? "client",
    ui_surface: cleanText(input.uiSurface, 80),
    action_target: cleanText(input.actionTarget, 120),
    row_index: cleanInteger(input.rowIndex),
    column_index: cleanInteger(input.columnIndex),
    row_label: cleanText(input.rowLabel, 80),
    column_label: cleanText(input.columnLabel, 80),
    cell_key: cleanText(input.cellKey, 40),
    input_value: cleanText(input.inputValue, 240),
    input_length: cleanInteger(input.inputLength),
    normalized_guess_text: cleanText(input.normalizedGuessText, 240),
    matched_exercise_id: cleanText(input.matchedExerciseId, 80),
    matched_exercise_name: cleanText(input.matchedExerciseName, 160),
    is_correct: typeof input.isCorrect === "boolean" ? input.isCorrect : null,
    failure_reason: input.failureReason ?? null,
    completed_count: cleanInteger(input.completedCount),
    total_cells: cleanInteger(input.totalCells),
    feedback_choice: input.feedbackChoice ?? null,
    share_text: cleanText(input.shareText, 1200),
    page_path: cleanText(input.pagePath, 400),
    referrer: cleanText(input.referrer, 1000),
    viewport_width: cleanInteger(input.viewportWidth),
    viewport_height: cleanInteger(input.viewportHeight),
    timezone: cleanText(input.timezone, 120),
    language: cleanText(input.language, 120) ?? identity.language,
    user_agent: identity.userAgent,
    metadata: cleanMetadata(input.metadata),
  });

  if (error) {
    throw new Error(`Failed to store LiftGrid event: ${error.message}`);
  }
}

export async function getLiftGridTodayState(): Promise<LiftGridPublicState> {
  const gameDate = gameDateRome();
  const [identity, exercises] = await Promise.all([getViewerIdentity(), getLiftGridExercises()]);
  const puzzle = buildLiftGridPuzzle(exercises, gameDate);
  const result = await getOrCreateLiftGridResult({
    gameDate,
    userId: identity.userId,
    sessionPublicId: identity.sessionPublicId,
  });

  const totalCells = puzzle.rowValues.length * puzzle.columnValues.length;
  const solvedCells = normalizeSolvedCells(result?.solved_cells, puzzle, exercises);
  const storedCompletedCount = result?.completed_count ?? 0;

  if (
    result &&
    (solvedCells.length !== (result.solved_cells ?? []).length ||
      storedCompletedCount !== solvedCells.length ||
      (result.status === "completed") !== (solvedCells.length === totalCells))
  ) {
    await persistNormalizedResult({
      resultId: result.id,
      solvedCells,
      totalCells,
    });
  }

  return {
    gameDate,
    dailyNumber: puzzle.dailyNumber,
    rowCategoryKey: puzzle.rowCategoryKey,
    columnCategoryKey: puzzle.columnCategoryKey,
    rows: puzzle.rowLabels,
    columns: puzzle.columnLabels,
    solvedCells,
    completedCount: solvedCells.length,
    totalCells,
    isComplete: solvedCells.length === totalCells,
  };
}

export async function submitLiftGridGuess(input: {
  guess: string;
}): Promise<LiftGridGuessResponse> {
  const gameDate = gameDateRome();
  const [identity, exercises] = await Promise.all([getViewerIdentity(), getLiftGridExercises()]);
  const puzzle = buildLiftGridPuzzle(exercises, gameDate);
  const result = await getOrCreateLiftGridResult({
    gameDate,
    userId: identity.userId,
    sessionPublicId: identity.sessionPublicId,
  });
  const totalCells = puzzle.rowValues.length * puzzle.columnValues.length;
  const solvedCells = normalizeSolvedCells(result?.solved_cells, puzzle, exercises);

  if (
    result &&
    (solvedCells.length !== (result.solved_cells ?? []).length ||
      (result.completed_count ?? 0) !== solvedCells.length ||
      (result.status === "completed") !== (solvedCells.length === totalCells))
  ) {
    await persistNormalizedResult({
      resultId: result.id,
      solvedCells,
      totalCells,
    });
  }

  const validation = validateLiftGridGuess({
    exercises,
    puzzle,
    solvedCells,
    guess: input.guess,
  });

  if (!result) {
    return {
      ...validation,
      completedCount: solvedCells.length + (validation.correct ? 1 : 0),
      totalCells,
      isComplete: solvedCells.length + (validation.correct ? 1 : 0) === totalCells,
    };
  }

  const admin = createAdminClient();
  const nextSolvedCells = validation.correct && validation.solvedCell
    ? [...solvedCells, validation.solvedCell]
    : solvedCells;
  const nextCompletedCount = nextSolvedCells.length;
  const nextStatus = nextCompletedCount === totalCells ? "completed" : "in_progress";

  const { data: insertedAttempt, error: attemptError } = await admin
    .from("liftgrid_attempts")
    .insert({
      result_id: result.id,
      row_index: validation.solvedCell?.rowIndex ?? -1,
      column_index: validation.solvedCell?.columnIndex ?? -1,
      guess_text: input.guess.trim(),
      normalized_guess_text: input.guess.trim().toLowerCase(),
      matched_exercise_id: validation.solvedCell?.exerciseId ?? null,
      matched_exercise_name: validation.normalizedExerciseName,
      is_correct: validation.correct,
      failure_reason: validation.reason,
    })
    .select("id")
    .single<LiftGridAttemptInsertRow>();

  if (attemptError || !insertedAttempt) {
    throw new Error(`Failed to store LiftGrid attempt: ${attemptError?.message ?? "unknown error"}`);
  }

  if (validation.correct) {
    const { error: updateError } = await admin
      .from("liftgrid_results")
      .update({
        solved_cells: nextSolvedCells,
        completed_count: nextCompletedCount,
        status: nextStatus,
        finished_at: nextStatus === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", result.id);

    if (updateError) {
      throw new Error(`Failed to update LiftGrid result: ${updateError.message}`);
    }

    await trackEvent({
      userId: identity.userId,
      sessionId: identity.sessionPublicId,
      eventName: "liftgrid_guess_correct",
      payload: {
        gameDate,
        rowIndex: validation.solvedCell?.rowIndex ?? null,
        columnIndex: validation.solvedCell?.columnIndex ?? null,
        completedCount: nextCompletedCount,
      },
    });

    if (nextStatus === "completed") {
      await trackEvent({
        userId: identity.userId,
        sessionId: identity.sessionPublicId,
        eventName: "liftgrid_completed",
        payload: {
          gameDate,
          completedCount: nextCompletedCount,
        },
      });
    }

    await recordLiftGridEvent({
      eventName: nextStatus === "completed" ? "grid_completed" : "guess_recorded",
      eventSource: "server",
      gameDate,
      dailyNumber: puzzle.dailyNumber,
      resultId: result.id,
      attemptId: insertedAttempt.id,
      completedCount: nextCompletedCount,
      totalCells,
      rowIndex: validation.solvedCell?.rowIndex ?? null,
      columnIndex: validation.solvedCell?.columnIndex ?? null,
      rowLabel:
        validation.solvedCell ? puzzle.rowLabels[validation.solvedCell.rowIndex] ?? null : null,
      columnLabel:
        validation.solvedCell
          ? puzzle.columnLabels[validation.solvedCell.columnIndex] ?? null
          : null,
      cellKey: validation.solvedCell
        ? `${validation.solvedCell.rowIndex}:${validation.solvedCell.columnIndex}`
        : null,
      inputValue: input.guess,
      inputLength: input.guess.trim().length,
      normalizedGuessText: input.guess.trim().toLowerCase(),
      matchedExerciseId: validation.solvedCell?.exerciseId ?? null,
      matchedExerciseName: validation.normalizedExerciseName,
      isCorrect: true,
      pagePath: "/liftgrid",
      metadata: {
        status: nextStatus,
        solvedCell: validation.solvedCell,
      },
    });
  } else {
    await trackEvent({
      userId: identity.userId,
      sessionId: identity.sessionPublicId,
      eventName: "liftgrid_guess_rejected",
      payload: {
        gameDate,
        rowIndex: null,
        columnIndex: null,
        reason: validation.reason,
      },
    });

    await recordLiftGridEvent({
      eventName: "guess_rejected",
      eventSource: "server",
      gameDate,
      dailyNumber: puzzle.dailyNumber,
      resultId: result.id,
      attemptId: insertedAttempt.id,
      completedCount: nextCompletedCount,
      totalCells,
      rowIndex: null,
      columnIndex: null,
      rowLabel: null,
      columnLabel: null,
      cellKey: null,
      inputValue: input.guess,
      inputLength: input.guess.trim().length,
      normalizedGuessText: input.guess.trim().toLowerCase(),
      isCorrect: false,
      failureReason: validation.reason,
      pagePath: "/liftgrid",
    });
  }

  return {
    ...validation,
    completedCount: nextCompletedCount,
    totalCells,
    isComplete: nextCompletedCount === totalCells,
  };
}

export async function submitLiftGridFeedback(choice: LiftGridFeedbackChoice) {
  const identity = await getViewerIdentity();

  await trackEvent({
    userId: identity.userId,
    sessionId: identity.sessionPublicId,
    eventName: "liftgrid_feedback_submitted",
    payload: {
      gameDate: gameDateRome(),
      choice,
    },
  });

  await recordLiftGridEvent({
    eventName: "feedback_recorded",
    eventSource: "server",
    gameDate: gameDateRome(),
    feedbackChoice: choice,
    pagePath: "/liftgrid",
    metadata: {
      choice,
    },
  });
}

export async function resetLiftGridForViewer(): Promise<LiftGridPublicState> {
  const gameDate = gameDateRome();
  const identity = await getViewerIdentity();
  const result = await getOrCreateLiftGridResult({
    gameDate,
    userId: identity.userId,
    sessionPublicId: identity.sessionPublicId,
  });

  if (result) {
    const admin = createAdminClient();

    const { error: attemptsError } = await admin
      .from("liftgrid_attempts")
      .delete()
      .eq("result_id", result.id);

    if (attemptsError) {
      throw new Error(`Failed to clear LiftGrid attempts: ${attemptsError.message}`);
    }

    const { error: resultError } = await admin
      .from("liftgrid_results")
      .update({
        solved_cells: [],
        completed_count: 0,
        status: "in_progress",
        finished_at: null,
      })
      .eq("id", result.id);

    if (resultError) {
      throw new Error(`Failed to reset LiftGrid result: ${resultError.message}`);
    }

    await recordLiftGridEvent({
      eventName: "board_rendered",
      eventSource: "server",
      gameDate,
      resultId: result.id,
      completedCount: 0,
      totalCells: 9,
      pagePath: "/liftgrid",
      metadata: {
        action: "debug_reset",
      },
    });
  }

  return getLiftGridTodayState();
}
