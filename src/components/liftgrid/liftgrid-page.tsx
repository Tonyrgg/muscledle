"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { fetchLiveExercises, type LiveExerciseSuggestion } from "@/lib/game/client";
import { getMuscleGroupIconKey, getMuscleGroupIconPath } from "@/lib/exercises/icons";
import {
  getCachedExerciseMediaUrl,
  markExerciseMediaLoaded,
  preloadExerciseMedia,
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
import { GuessInput } from "@/components/game/guess-input";
import { ModeHeroHeader } from "@/components/modes/mode-hero-header";
import { ModePageShell } from "@/components/modes/mode-page-shell";
import { ModePanel } from "@/components/modes/mode-panel";
import type { LiftGridEventInput, LiftGridFeedbackChoice, LiftGridPublicState, LiftGridSolvedCell } from "@/types/liftgrid";

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
    case "no_matching_cell":
      return "That exercise does not fit any open cell in today's grid.";
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

  useEffect(() => {
    let cancelled = false;

    if (!slug) {
      return () => {
        cancelled = true;
      };
    }

    void resolveExerciseMediaUrl(slug).then(async (resolved) => {
      if (cancelled) return;
      setMediaUrl(resolved);
      if (resolved) {
        await preloadExerciseMedia(slug);
      }
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
          className="liftgrid-cell__gif"
          loading="lazy"
          onLoad={() => {
            markExerciseMediaLoaded(mediaUrl);
          }}
          onError={() => {
            setMediaUrl(null);
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
  const [query, setQuery] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackChoice, setFeedbackChoice] = useState<LiftGridFeedbackChoice | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
  const stateRef = useRef<LiftGridPublicState | null>(null);
  const boardRenderedRef = useRef(false);
  const suggestionSignatureRef = useRef<string>("");
  const queryChangeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const emitEvent = useCallback(
    (input: Omit<LiftGridEventInput, "eventSource">) => {
      const currentState = stateRef.current;
      const timezone =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : null;

      void trackLiftGridEventRequest({
        eventSource: "client",
        gameDate: currentState?.gameDate ?? null,
        dailyNumber: currentState?.dailyNumber ?? null,
        completedCount: currentState?.completedCount ?? null,
        totalCells: currentState?.totalCells ?? null,
        rowIndex: input.rowIndex ?? null,
        columnIndex: input.columnIndex ?? null,
        rowLabel: input.rowLabel ?? null,
        columnLabel: input.columnLabel ?? null,
        cellKey: input.cellKey ?? null,
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
    if (!state) return;
    const nextGuess = (guessValue ?? query).trim();
    if (!nextGuess) return;

    emitEvent({
      eventName: "guess_submit_clicked",
      uiSurface: "entry",
      inputValue: nextGuess,
      inputLength: nextGuess.length,
    });

    setSubmitting(true);
    setError(null);
    try {
      const response = await submitLiftGridGuessRequest({
        guess: nextGuess,
      });

      if (!response.correct) {
        const formattedError = formatGuessError(response.reason);
        setError(formattedError);
        emitEvent({
          eventName: "guess_result_rendered",
          uiSurface: "entry",
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
      setSelectedExerciseId(null);
      setShareStatus("idle");
      emitEvent({
        eventName: "guess_result_rendered",
        uiSurface: "entry",
        rowIndex: solvedCell.rowIndex,
        columnIndex: solvedCell.columnIndex,
        rowLabel: state.rows[solvedCell.rowIndex] ?? null,
        columnLabel: state.columns[solvedCell.columnIndex] ?? null,
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
                {state.columns.map((column) => (
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

                      return (
                        <div
                          key={cellKey(rowIndex, columnIndex)}
                          className={`liftgrid-cell ${solvedCell ? "liftgrid-cell--solved" : ""}`.trim()}
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
                              <>
                                <div className="liftgrid-cell__ghost-icon-wrap" aria-hidden="true">
                                  <img
                                    src={getMuscleIconPath(row)}
                                    alt=""
                                    className="liftgrid-cell__ghost-icon"
                                    loading="lazy"
                                  />
                                </div>
                                <span className="liftgrid-cell__placeholder">+</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="liftgrid-entry">
                <section
                  className="game-input-zone liftgrid-entry__guess-zone"
                  aria-label="Exercise input"
                  onFocusCapture={() =>
                    emitEvent({
                      eventName: "query_focused",
                      uiSurface: "entry",
                      inputValue: query,
                      inputLength: query.trim().length,
                    })}
                >
                  <GuessInput
                    query={query}
                    selectedExerciseId={selectedExerciseId}
                    exercises={exercises}
                    loadingExercises={loading && exercises.length === 0}
                    disabled={state.isComplete}
                    submitting={submitting}
                    onQueryChange={(value) => {
                      setSelectedExerciseId(null);
                      setQuery(value);
                    }}
                    onSelectExercise={(exercise) => {
                      emitEvent({
                        eventName: "suggestion_selected",
                        uiSurface: "suggestions",
                        actionTarget: exercise.id,
                        inputValue: exercise.display_name,
                        inputLength: exercise.display_name.length,
                        matchedExerciseId: exercise.id,
                        matchedExerciseName: exercise.display_name,
                      });
                      setSelectedExerciseId(exercise.id);
                      setQuery(exercise.display_name);
                    }}
                    onSubmit={(exercise) => {
                      void handleSubmitGuess(exercise?.display_name);
                    }}
                  />
                </section>

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
