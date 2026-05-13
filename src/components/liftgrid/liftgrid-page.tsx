"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { fetchLiveExercises, type LiveExerciseSuggestion } from "@/lib/game/client";
import { getMuscleGroupIconKey, getMuscleGroupIconPath } from "@/lib/exercises/icons";
import {
  getCachedExerciseMediaUrl,
  markExerciseMediaLoaded,
  resolveExerciseMediaUrl,
} from "@/lib/game/exercise-media-client";
import {
  buildLiftGridShareText,
} from "@/lib/liftgrid/puzzle";
import {
  fetchLiftGridToday,
  submitLiftGridFeedbackRequest,
  submitLiftGridGuessRequest,
  trackLiftGridEventRequest,
} from "@/lib/liftgrid/client";
import { ModeHeroHeader } from "@/components/modes/mode-hero-header";
import { ModePageShell } from "@/components/modes/mode-page-shell";
import { ModePanel } from "@/components/modes/mode-panel";
import type { LiftGridEventInput, LiftGridFeedbackChoice, LiftGridPublicState, LiftGridSolvedCell } from "@/types/liftgrid";

type ActiveCell = {
  rowIndex: number;
  columnIndex: number;
};

const FEEDBACK_OPTIONS: Array<{ label: string; value: LiftGridFeedbackChoice }> = [
  { label: "Yes, make it", value: "yes_make_it" },
  { label: "Maybe", value: "maybe" },
  { label: "Not for me", value: "not_for_me" },
];

const EQUIPMENT_ICON_PATHS: Record<string, string> = {
  barbell: "/icons/barbell.svg",
  dumbbell: "/icons/dumbell.svg",
  dumbbells: "/icons/dumbell.svg",
  bodyweight: "/icons/bodyweight.svg",
  machine: "/icons/workout-machine.svg",
  cable: "/icons/cable.svg",
  kettlebell: "/icons/kettlebell.svg",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['''`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreExercise(query: string, exercise: LiveExerciseSuggestion) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return 0;

  const values = [
    exercise.display_name,
    exercise.canonical_name,
    exercise.name,
    ...exercise.aliases,
  ]
    .map(normalize)
    .filter(Boolean);

  if (values.some((value) => value === normalizedQuery)) return 100;
  if (values.some((value) => value.startsWith(normalizedQuery))) return 70;
  if (normalizedQuery.length >= 3 && values.some((value) => value.includes(normalizedQuery))) {
    return 40;
  }

  return -1;
}

function cellKey(rowIndex: number, columnIndex: number) {
  return `${rowIndex}:${columnIndex}`;
}

function getSolvedCell(
  solvedCells: LiftGridSolvedCell[],
  rowIndex: number,
  columnIndex: number,
) {
  return solvedCells.find((cell) => cell.rowIndex === rowIndex && cell.columnIndex === columnIndex) ?? null;
}

function formatGuessError(reason: string | null) {
  switch (reason) {
    case "unknown_exercise":
      return "That exercise is not in the current Liftdle dataset.";
    case "wrong_row_category":
      return "That exercise does not match the row category.";
    case "wrong_column_category":
      return "That exercise does not match the column category.";
    case "already_used":
      return "That exercise is already used elsewhere in this grid.";
    case "already_solved":
      return "That cell is already solved.";
    default:
      return "Guess rejected.";
  }
}

function parseOptionalIndex(value: string | undefined) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toEquipmentKey(label: string) {
  return normalize(label).replace(/\s+/g, "");
}

function getEquipmentIconPath(label: string) {
  return EQUIPMENT_ICON_PATHS[toEquipmentKey(label)] ?? "/icons/dumbell.svg";
}

function getMuscleIconPath(label: string) {
  return getMuscleGroupIconPath(getMuscleGroupIconKey(normalize(label)));
}

type LiftGridExerciseMediaProps = {
  exercise: LiveExerciseSuggestion | null;
  fallbackIconPath: string;
};

function LiftGridExerciseMedia({ exercise, fallbackIconPath }: LiftGridExerciseMediaProps) {
  const slug = exercise?.slug ?? "";
  const cachedUrl = slug ? getCachedExerciseMediaUrl(slug) ?? null : null;
  const [mediaUrl, setMediaUrl] = useState<string | null>(cachedUrl);
  const [ready, setReady] = useState(() => !slug || cachedUrl === null);

  useEffect(() => {
    let cancelled = false;

    if (!slug) {
      return () => {
        cancelled = true;
      };
    }

    void resolveExerciseMediaUrl(slug).then((resolved) => {
      if (cancelled) return;
      setMediaUrl(resolved);
      setReady(resolved === null);
    });

    return () => {
      cancelled = true;
    };
  }, [cachedUrl, slug]);

  return (
    <div className="liftgrid-cell__media-wrap" aria-hidden="true">
      {mediaUrl ? (
        <img
          src={mediaUrl}
          alt=""
          className={`liftgrid-cell__gif ${ready ? "liftgrid-cell__gif--ready" : "liftgrid-cell__gif--loading"}`}
          loading="lazy"
          onLoad={() => {
            markExerciseMediaLoaded(mediaUrl);
            setReady(true);
          }}
          onError={() => {
            setMediaUrl(null);
            setReady(true);
          }}
        />
      ) : null}

      {!mediaUrl ? (
        <img
          src={fallbackIconPath}
          alt=""
          className="liftgrid-cell__fallback-icon"
          loading="lazy"
        />
      ) : null}
    </div>
  );
}

export function LiftGridPage() {
  const [state, setState] = useState<LiftGridPublicState | null>(null);
  const [exercises, setExercises] = useState<LiveExerciseSuggestion[]>([]);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackChoice, setFeedbackChoice] = useState<LiftGridFeedbackChoice | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
  const stateRef = useRef<LiftGridPublicState | null>(null);
  const activeCellRef = useRef<ActiveCell | null>(null);
  const boardRenderedRef = useRef(false);
  const activeCellKeyRef = useRef<string | null>(null);
  const suggestionSignatureRef = useRef<string>("");
  const queryChangeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    activeCellRef.current = activeCell;
  }, [activeCell]);

  const emitEvent = useCallback(
    (input: Omit<LiftGridEventInput, "eventSource">) => {
      const currentState = stateRef.current;
      const currentActiveCell = activeCellRef.current;
      const timezone =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : null;
      const activeRow = currentActiveCell
        ? currentState?.rows[currentActiveCell.rowIndex] ?? null
        : null;
      const activeColumn = currentActiveCell
        ? currentState?.columns[currentActiveCell.columnIndex] ?? null
        : null;

      void trackLiftGridEventRequest({
        eventSource: "client",
        gameDate: currentState?.gameDate ?? null,
        dailyNumber: currentState?.dailyNumber ?? null,
        completedCount: currentState?.completedCount ?? null,
        totalCells: currentState?.totalCells ?? null,
        rowIndex: input.rowIndex ?? currentActiveCell?.rowIndex ?? null,
        columnIndex: input.columnIndex ?? currentActiveCell?.columnIndex ?? null,
        rowLabel: input.rowLabel ?? activeRow,
        columnLabel: input.columnLabel ?? activeColumn,
        cellKey:
          input.cellKey ??
          (currentActiveCell
            ? `${currentActiveCell.rowIndex}:${currentActiveCell.columnIndex}`
            : null),
        pagePath: "/liftgrid",
        referrer: typeof document !== "undefined" ? document.referrer || null : null,
        viewportWidth: typeof window !== "undefined" ? window.innerWidth : null,
        viewportHeight: typeof window !== "undefined" ? window.innerHeight : null,
        timezone,
        language: typeof navigator !== "undefined" ? navigator.language : null,
        ...input,
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setLoading(true);
        const [todayState, liveExercises] = await Promise.all([
          fetchLiftGridToday(),
          fetchLiveExercises(),
        ]);

        if (cancelled) return;

        setState(todayState);
        setExercises(liveExercises);
        emitEvent({
          eventName: "today_state_received",
          uiSurface: "page",
          metadata: {
            solvedCells: todayState.solvedCells.length,
            rowCount: todayState.rows.length,
            columnCount: todayState.columns.length,
            liveExerciseCount: liveExercises.length,
          },
        });
        setActiveCell(() => {
          for (let rowIndex = 0; rowIndex < todayState.rows.length; rowIndex += 1) {
            for (let columnIndex = 0; columnIndex < todayState.columns.length; columnIndex += 1) {
              if (!getSolvedCell(todayState.solvedCells, rowIndex, columnIndex)) {
                return { rowIndex, columnIndex };
              }
            }
          }
          return null;
        });
      } catch (caughtError) {
        if (!cancelled) {
          const message = caughtError instanceof Error ? caughtError.message : "Failed to load LiftGrid.";
          setError(message);
          emitEvent({
            eventName: "page_load_failed",
            uiSurface: "page",
            metadata: { message },
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [emitEvent]);

  useEffect(() => {
    if (loading || !state) return;
    emitEvent({
      eventName: "page_loaded",
      uiSurface: "page",
      metadata: {
        isComplete: state.isComplete,
      },
    });
  }, [emitEvent, loading, state]);

  useEffect(() => {
    if (!state || boardRenderedRef.current) return;
    boardRenderedRef.current = true;
    emitEvent({
      eventName: "board_rendered",
      uiSurface: "board",
      metadata: {
        rows: state.rows,
        columns: state.columns,
      },
    });
  }, [emitEvent, state]);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];

    return exercises
      .map((exercise) => ({ exercise, score: scoreExercise(query, exercise) }))
      .filter((entry) => entry.score >= 0)
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.exercise.display_name.localeCompare(right.exercise.display_name),
      )
      .slice(0, 8)
      .map((entry) => entry.exercise);
  }, [exercises, query]);

  useEffect(() => {
    const currentActiveCell = activeCell;
    const nextKey = currentActiveCell
      ? `${currentActiveCell.rowIndex}:${currentActiveCell.columnIndex}`
      : null;
    if (!nextKey || nextKey === activeCellKeyRef.current || !state || !currentActiveCell) return;
    activeCellKeyRef.current = nextKey;
    emitEvent({
      eventName: "active_cell_changed",
      uiSurface: "entry",
      rowIndex: currentActiveCell.rowIndex,
      columnIndex: currentActiveCell.columnIndex,
      rowLabel: state.rows[currentActiveCell.rowIndex] ?? null,
      columnLabel: state.columns[currentActiveCell.columnIndex] ?? null,
    });
  }, [activeCell, emitEvent, state]);

  useEffect(() => {
    if (!state || !query.trim()) return;

    if (queryChangeTimerRef.current !== null) {
      window.clearTimeout(queryChangeTimerRef.current);
    }

    queryChangeTimerRef.current = window.setTimeout(() => {
      emitEvent({
        eventName: "query_changed",
        uiSurface: "entry",
        inputValue: query,
        inputLength: query.trim().length,
        metadata: {
          suggestionCount: suggestions.length,
        },
      });
      queryChangeTimerRef.current = null;
    }, 450);

    return () => {
      if (queryChangeTimerRef.current !== null) {
        window.clearTimeout(queryChangeTimerRef.current);
        queryChangeTimerRef.current = null;
      }
    };
  }, [emitEvent, query, state, suggestions.length]);

  useEffect(() => {
    if (!query.trim() || !state) return;
    const signature = `${query.trim()}|${suggestions.map((entry) => entry.id).join(",")}`;
    if (signature === suggestionSignatureRef.current) return;
    suggestionSignatureRef.current = signature;
    emitEvent({
      eventName: "suggestions_rendered",
      uiSurface: "suggestions",
      inputValue: query,
      inputLength: query.trim().length,
      metadata: {
        suggestionCount: suggestions.length,
        suggestionIds: suggestions.map((entry) => entry.id),
      },
    });
  }, [emitEvent, query, state, suggestions]);

  const shareText = useMemo(() => {
    if (!state) return "";
    return buildLiftGridShareText({
      dailyNumber: state.dailyNumber,
      rows: state.rows.length,
      columns: state.columns.length,
      solvedCells: state.solvedCells,
      totalCells: state.totalCells,
    });
  }, [state]);

  function handleTrackedClickCapture(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement | null;
    const actionNode = target?.closest<HTMLElement>("[data-liftgrid-action]");
    if (!actionNode) return;

    emitEvent({
      eventName: "interactive_click",
      uiSurface: actionNode.dataset.liftgridSurface ?? "page",
      actionTarget: actionNode.dataset.liftgridAction ?? actionNode.tagName.toLowerCase(),
      rowIndex: parseOptionalIndex(actionNode.dataset.rowIndex),
      columnIndex: parseOptionalIndex(actionNode.dataset.columnIndex),
      rowLabel: actionNode.dataset.rowLabel ?? null,
      columnLabel: actionNode.dataset.columnLabel ?? null,
      cellKey: actionNode.dataset.cellKey ?? null,
      metadata: {
        text: actionNode.textContent?.trim().slice(0, 120) ?? null,
      },
    });
  }

  async function handleSubmitGuess(guessValue?: string) {
    if (!state || !activeCell) return;
    const nextGuess = (guessValue ?? query).trim();
    if (!nextGuess) return;

    emitEvent({
      eventName: "guess_submit_clicked",
      uiSurface: "entry",
      rowIndex: activeCell.rowIndex,
      columnIndex: activeCell.columnIndex,
      rowLabel: state.rows[activeCell.rowIndex] ?? null,
      columnLabel: state.columns[activeCell.columnIndex] ?? null,
      inputValue: nextGuess,
      inputLength: nextGuess.length,
    });

    setSubmitting(true);
    setError(null);
    try {
      const response = await submitLiftGridGuessRequest({
        rowIndex: activeCell.rowIndex,
        columnIndex: activeCell.columnIndex,
        guess: nextGuess,
      });

      if (!response.correct) {
        const formattedError = formatGuessError(response.reason);
        setError(formattedError);
        emitEvent({
          eventName: "guess_result_rendered",
          uiSurface: "entry",
          rowIndex: activeCell.rowIndex,
          columnIndex: activeCell.columnIndex,
          rowLabel: state.rows[activeCell.rowIndex] ?? null,
          columnLabel: state.columns[activeCell.columnIndex] ?? null,
          inputValue: nextGuess,
          inputLength: nextGuess.length,
          isCorrect: false,
          failureReason: response.reason,
          metadata: {
            message: formattedError,
          },
        });
        return;
      }

      const solvedCell = response.solvedCell;
      if (!solvedCell) {
        setError("LiftGrid returned an invalid solved cell.");
        return;
      }

      setState((current) =>
        current
          ? {
              ...current,
              solvedCells: [...current.solvedCells, solvedCell],
              completedCount: response.completedCount,
              isComplete: response.isComplete,
            }
          : current,
      );
      setQuery("");
      setShareStatus("idle");
      emitEvent({
        eventName: "guess_result_rendered",
        uiSurface: "entry",
        rowIndex: activeCell.rowIndex,
        columnIndex: activeCell.columnIndex,
        rowLabel: state.rows[activeCell.rowIndex] ?? null,
        columnLabel: state.columns[activeCell.columnIndex] ?? null,
        inputValue: nextGuess,
        inputLength: nextGuess.length,
        isCorrect: true,
        matchedExerciseId: solvedCell.exerciseId,
        matchedExerciseName: solvedCell.exerciseName,
        metadata: {
          completedCount: response.completedCount,
          isComplete: response.isComplete,
        },
      });
      setActiveCell((current) => {
        if (!state) return current;
        const nextSolved = [...state.solvedCells, solvedCell];
        for (let rowIndex = 0; rowIndex < state.rows.length; rowIndex += 1) {
          for (let columnIndex = 0; columnIndex < state.columns.length; columnIndex += 1) {
            if (!getSolvedCell(nextSolved, rowIndex, columnIndex)) {
              return { rowIndex, columnIndex };
            }
          }
        }
        return null;
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to submit guess.";
      setError(message);
      emitEvent({
        eventName: "guess_result_rendered",
        uiSurface: "entry",
        inputValue: nextGuess,
        inputLength: nextGuess.length,
        isCorrect: false,
        metadata: {
          message,
          kind: "request_error",
        },
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFeedback(choice: LiftGridFeedbackChoice) {
    if (feedbackStatus === "submitting" || feedbackChoice) return;
    emitEvent({
      eventName: "feedback_clicked",
      uiSurface: "feedback",
      feedbackChoice: choice,
    });
    setFeedbackStatus("submitting");

    try {
      await submitLiftGridFeedbackRequest(choice);
      setFeedbackChoice(choice);
      setFeedbackStatus("done");
    } catch {
      setFeedbackStatus("idle");
    }
  }

  async function handleCopyShare() {
    if (!shareText) return;
    emitEvent({
      eventName: "share_copy_clicked",
      uiSurface: "share",
      shareText,
    });

    try {
      await navigator.clipboard.writeText(shareText);
      setShareStatus("copied");
      emitEvent({
        eventName: "share_copy_result",
        uiSurface: "share",
        shareText,
        metadata: {
          status: "copied",
        },
      });
    } catch {
      setShareStatus("error");
      emitEvent({
        eventName: "share_copy_result",
        uiSurface: "share",
        shareText,
        metadata: {
          status: "error",
        },
      });
    }
  }

  const usedExerciseNames = useMemo(
    () => (state?.solvedCells ?? []).map((cell) => cell.exerciseName),
    [state],
  );
  const exercisesById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  );

  return (
    <ModePageShell className="liftgrid-page">
      <div className="mode-shell">
        <ModeHeroHeader
          titleParts={[
            { text: "LIFT" },
            { text: "GRID", accent: true },
          ]}
          className="liftgrid-hero"
        />

        <ModePanel className="liftgrid-panel">
          <div onClickCapture={handleTrackedClickCapture} className="liftgrid-panel__interaction-layer">
            <div className="liftgrid-panel__head">
              <h2 className="liftgrid-panel__title">FILL THE GRID. PROVE YOUR GYM BRAIN.</h2>
            </div>

          {loading ? (
            <div className="liftgrid-loading">
              <p className="liftgrid-loading__label">Loading today&apos;s grid...</p>
            </div>
          ) : null}

          {!loading && error && !state ? (
            <div className="liftgrid-error" aria-live="polite">
              {error}
            </div>
          ) : null}

          {!loading && state ? (
            <>
              <div className="liftgrid-board" role="grid" aria-label="LiftGrid daily board">
                <div className="liftgrid-board__corner liftgrid-board__corner--brand">
                  <span className="liftgrid-board__brand">
                    <span className="liftgrid-board__brand-main">LIFT</span>
                    <span className="liftgrid-board__brand-accent">DLE</span>
                  </span>
                </div>
                {state.columns.map((column, columnIndex) => (
                  <div key={column} className="liftgrid-board__header liftgrid-board__header--column">
                    <div className="liftgrid-board__header-icon-wrap">
                      <img
                        src={getEquipmentIconPath(column)}
                        alt=""
                        className="liftgrid-board__header-icon"
                        loading="lazy"
                      />
                    </div>
                    <span>{column}</span>
                    <small>Col {columnIndex + 1}</small>
                  </div>
                ))}

                {state.rows.map((row, rowIndex) => (
                  <div className="liftgrid-board__row" key={row}>
                    <div className="liftgrid-board__header liftgrid-board__header--row">
                      <div className="liftgrid-board__header-icon-wrap liftgrid-board__header-icon-wrap--row">
                        <img
                          src={getMuscleIconPath(row)}
                          alt=""
                          className="liftgrid-board__header-icon liftgrid-board__header-icon--row"
                          loading="lazy"
                        />
                      </div>
                      <span>{row}</span>
                    </div>
                    {state.columns.map((column, columnIndex) => {
                      const solvedCell = getSolvedCell(state.solvedCells, rowIndex, columnIndex);
                      const solvedExercise = solvedCell
                        ? exercisesById.get(solvedCell.exerciseId) ?? null
                        : null;
                      const isActive =
                        activeCell?.rowIndex === rowIndex &&
                        activeCell?.columnIndex === columnIndex &&
                        !solvedCell;

                      return (
                        <button
                          key={cellKey(rowIndex, columnIndex)}
                          type="button"
                          className={`liftgrid-cell ${
                            solvedCell ? "liftgrid-cell--solved" : ""
                          } ${isActive ? "liftgrid-cell--active" : ""}`.trim()}
                          onClick={() => {
                            if (solvedCell) return;
                            emitEvent({
                              eventName: "cell_selected",
                              uiSurface: "board",
                              rowIndex,
                              columnIndex,
                              rowLabel: row,
                              columnLabel: column,
                            });
                            setActiveCell({ rowIndex, columnIndex });
                            setError(null);
                          }}
                          disabled={Boolean(solvedCell) || state.isComplete}
                          aria-label={`${row} and ${column}`}
                          data-liftgrid-action={solvedCell ? "solved-cell" : "cell"}
                          data-liftgrid-surface="board"
                          data-row-index={rowIndex}
                          data-column-index={columnIndex}
                          data-row-label={row}
                          data-column-label={column}
                          data-cell-key={cellKey(rowIndex, columnIndex)}
                        >
                          <div className="liftgrid-cell__frame">
                            <div className="liftgrid-cell__corner liftgrid-cell__corner--row">
                              <img
                                src={getMuscleIconPath(row)}
                                alt=""
                                className="liftgrid-cell__corner-icon"
                                loading="lazy"
                              />
                            </div>
                            <div className="liftgrid-cell__corner liftgrid-cell__corner--column">
                              <img
                                src={getEquipmentIconPath(column)}
                                alt=""
                                className="liftgrid-cell__corner-icon"
                                loading="lazy"
                              />
                            </div>

                            {solvedCell ? (
                              <>
                                <LiftGridExerciseMedia
                                  key={solvedExercise?.slug ?? solvedCell.exerciseId}
                                  exercise={solvedExercise}
                                  fallbackIconPath={getMuscleIconPath(
                                    solvedExercise?.muscle_group ?? row,
                                  )}
                                />
                                <span className="liftgrid-cell__value">{solvedCell.exerciseName}</span>
                              </>
                            ) : (
                              <span className="liftgrid-cell__placeholder">
                                {isActive ? "Type exercise" : "Open cell"}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="liftgrid-entry">
                <div className="liftgrid-entry__meta">
                  <p className="liftgrid-entry__label">Active cell</p>
                  <p className="liftgrid-entry__target">
                    {activeCell
                      ? `${state.rows[activeCell.rowIndex]} x ${state.columns[activeCell.columnIndex]}`
                      : state.isComplete
                        ? "All cells solved"
                        : "Select a cell"}
                  </p>
                </div>

                <div className="liftgrid-entry__controls">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Type exercise"
                    className="liftgrid-entry__input"
                    disabled={!activeCell || state.isComplete || submitting}
                    onFocus={() =>
                      emitEvent({
                        eventName: "query_focused",
                        uiSurface: "entry",
                        inputValue: query,
                        inputLength: query.trim().length,
                      })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSubmitGuess();
                      }
                    }}
                    data-liftgrid-action="exercise-input"
                    data-liftgrid-surface="entry"
                  />
                  <button
                    type="button"
                    className="liftgrid-entry__submit"
                    onClick={() => void handleSubmitGuess()}
                    disabled={!activeCell || !query.trim() || state.isComplete || submitting}
                    data-liftgrid-action="submit-guess"
                    data-liftgrid-surface="entry"
                  >
                    {submitting ? "Checking..." : "Lock in"}
                  </button>
                </div>

                {suggestions.length > 0 && activeCell && !state.isComplete ? (
                  <div className="liftgrid-suggestions" role="listbox" aria-label="Exercise suggestions">
                    {suggestions.map((exercise) => (
                      <button
                        key={exercise.id}
                        type="button"
                        className="liftgrid-suggestions__option"
                        onClick={() => {
                          emitEvent({
                            eventName: "suggestion_selected",
                            uiSurface: "suggestions",
                            actionTarget: exercise.id,
                            inputValue: exercise.display_name,
                            inputLength: exercise.display_name.length,
                            matchedExerciseId: exercise.id,
                            matchedExerciseName: exercise.display_name,
                          });
                          setQuery(exercise.display_name);
                          void handleSubmitGuess(exercise.display_name);
                        }}
                        data-liftgrid-action="suggestion"
                        data-liftgrid-surface="suggestions"
                      >
                        {exercise.display_name}
                      </button>
                    ))}
                  </div>
                ) : null}

                {usedExerciseNames.length > 0 ? (
                  <div className="liftgrid-used">
                    <p className="liftgrid-used__label">Used</p>
                    <div className="liftgrid-used__list">
                      {usedExerciseNames.map((name) => (
                        <span key={name} className="liftgrid-used__chip">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {error && state ? (
                  <p className="liftgrid-entry__error" aria-live="polite">
                    {error}
                  </p>
                ) : null}
              </div>

              {state.isComplete ? (
                <div className="liftgrid-finish">
                  <div className="liftgrid-share">
                    <p className="liftgrid-finish__question">Would you play this as a 1v1 battle?</p>
                    <div className="liftgrid-finish__actions">
                      {FEEDBACK_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`liftgrid-finish__button ${
                            feedbackChoice === option.value
                              ? "liftgrid-finish__button--active"
                              : ""
                          }`.trim()}
                          onClick={() => void handleFeedback(option.value)}
                          disabled={feedbackStatus === "submitting" || feedbackChoice !== null}
                          data-liftgrid-action={`feedback-${option.value}`}
                          data-liftgrid-surface="feedback"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="liftgrid-share">
                    <p className="liftgrid-used__label">Share result</p>
                    <pre className="liftgrid-share__preview">{shareText}</pre>
                    <button
                      type="button"
                      className="liftgrid-entry__submit"
                      onClick={() => void handleCopyShare()}
                      data-liftgrid-action="copy-share"
                      data-liftgrid-surface="share"
                    >
                      Copy result
                    </button>
                    {shareStatus !== "idle" ? (
                      <p className="liftgrid-share__status" aria-live="polite">
                        {shareStatus === "copied"
                          ? "Share text copied."
                          : "Clipboard copy failed."}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
          </div>
        </ModePanel>
      </div>
    </ModePageShell>
  );
}
