"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { fetchLiveExercises, type LiveExerciseSuggestion } from "@/lib/game/client";
import { getMuscleGroupIconKey, getMuscleGroupIconPath } from "@/lib/exercises/icons";
import {
  getCachedExerciseMediaUrl,
  isExerciseMediaReadyForSlug,
  markExerciseMediaLoaded,
  preloadExerciseMedia,
  resolveExerciseMediaUrl,
} from "@/lib/game/exercise-media-client";
import {
  buildLiftGridShareText,
} from "@/lib/liftgrid/puzzle";
import {
  fetchLiftGridToday,
  resetLiftGridRequest,
  submitLiftGridFeedbackRequest,
  submitLiftGridGuessRequest,
  trackLiftGridEventRequest,
} from "@/lib/liftgrid/client";
import { GuessInput } from "@/components/game/guess-input";
import { DailyCelebration } from "@/components/game/daily-celebration";
import { ModeIconNav } from "@/components/modes/mode-icon-nav";
import { ModePageShell } from "@/components/modes/mode-page-shell";
import type { LiftGridEventInput, LiftGridFeedbackChoice, LiftGridPublicState, LiftGridSolvedCell } from "@/types/liftgrid";

const FEEDBACK_OPTIONS: Array<{ label: string; value: LiftGridFeedbackChoice }> = [
  { label: "Yes, make it", value: "yes_make_it" },
  { label: "Maybe", value: "maybe" },
  { label: "Not for me", value: "not_for_me" },
];

const LIFTGRID_BATTLE_FEEDBACK_STORAGE_KEY = "liftdle:liftgrid:battle-feedback:v1";

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

function shuffleArray<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function getSolvedCell(
  solvedCells: LiftGridSolvedCell[],
  rowIndex: number,
  columnIndex: number,
) {
  return solvedCells.find((cell) => cell.rowIndex === rowIndex && cell.columnIndex === columnIndex) ?? null;
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

function getMsUntilNextRomeMidnight(now: Date): number {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((item) => item.type === type)?.value ?? "0");

  const year = read("year");
  const month = read("month");
  const day = read("day");
  const hour = read("hour");
  const minute = read("minute");
  const second = read("second");

  const currentPseudoUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const nextMidnightPseudoUtc = Date.UTC(year, month - 1, day + 1, 0, 0, 0);

  return Math.max(0, nextMidnightPseudoUtc - currentPseudoUtc);
}

function formatCountdown(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getExerciseCategoryValues(
  exercise: LiveExerciseSuggestion,
  categoryKey: LiftGridPublicState["rowCategoryKey"] | LiftGridPublicState["columnCategoryKey"],
) {
  if (categoryKey === "muscle_group") {
    const values = new Set<string>();
    const addValue = (value: string | null | undefined) => {
      if (!value) return;
      for (const part of value
        .split(/[\/,&|]+/g)
        .map((entry) => normalize(entry))
        .filter(Boolean)) {
        values.add(part);
      }
    };

    addValue(exercise.muscle_group);
    for (const muscle of exercise.muscle ?? []) {
      addValue(muscle);
    }

    return [...values];
  }

  const rawValue = exercise[categoryKey];
  const values = Array.isArray(rawValue) ? rawValue : [rawValue];
  return values.map((value) => normalize(String(value))).filter(Boolean);
}

function matchesExerciseCategory(
  exercise: LiveExerciseSuggestion,
  categoryKey: LiftGridPublicState["rowCategoryKey"] | LiftGridPublicState["columnCategoryKey"],
  categoryLabel: string,
) {
  const normalizedLabel = normalize(categoryLabel);
  return getExerciseCategoryValues(exercise, categoryKey).includes(normalizedLabel);
}

type LiftGridExerciseMediaProps = {
  exercise: LiveExerciseSuggestion | null;
  fallbackIconPath: string;
};

function LiftGridExerciseMedia({ exercise, fallbackIconPath }: LiftGridExerciseMediaProps) {
  const slug = exercise?.slug ?? "";
  const cachedUrl = slug ? getCachedExerciseMediaUrl(slug) ?? null : null;
  const [mediaUrl, setMediaUrl] = useState<string | null>(cachedUrl);
  const [loadedMediaUrl, setLoadedMediaUrl] = useState<string | null>(() =>
    slug && isExerciseMediaReadyForSlug(slug) && cachedUrl ? cachedUrl : null,
  );

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
        if (!cancelled && isExerciseMediaReadyForSlug(slug)) {
          setLoadedMediaUrl(resolved);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cachedUrl, slug]);

  const mediaReady = mediaUrl !== null && loadedMediaUrl === mediaUrl;
  const shouldShowFallback = !mediaReady;

  return (
    <div className="liftgrid-cell__media-wrap" aria-hidden="true">
      {mediaUrl ? (
        <img
          src={mediaUrl}
          alt=""
          className={`liftgrid-cell__gif ${mediaReady ? "liftgrid-cell__gif--ready" : "liftgrid-cell__gif--loading"}`}
          loading="lazy"
          onLoad={() => {
            markExerciseMediaLoaded(mediaUrl);
            setLoadedMediaUrl(mediaUrl);
          }}
          onError={() => {
            setMediaUrl(null);
            setLoadedMediaUrl(null);
          }}
        />
      ) : null}

      {shouldShowFallback ? (
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
  const [localSolvedCells, setLocalSolvedCells] = useState<LiftGridSolvedCell[] | null>(null);
  const [exercises, setExercises] = useState<LiveExerciseSuggestion[]>([]);
  const [query, setQuery] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackChoice, setFeedbackChoice] = useState<LiftGridFeedbackChoice | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [hasStoredBattleFeedback, setHasStoredBattleFeedback] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBoardShaking, setIsBoardShaking] = useState(false);
  const [showVictoryCelebration, setShowVictoryCelebration] = useState(false);
  const [showVictoryCard, setShowVictoryCard] = useState(false);
  const [victoryCelebrationSeed, setVictoryCelebrationSeed] = useState(0);
  const [resettingDebugGrid, setResettingDebugGrid] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const [countdown, setCountdown] = useState("00:00:00");
  const [showSurrenderDialog, setShowSurrenderDialog] = useState(false);
  const [isSurrendering, setIsSurrendering] = useState(false);
  const [gameOutcome, setGameOutcome] = useState<"win" | "lose" | null>(null);
  const [revealedCellKeys, setRevealedCellKeys] = useState<string[]>([]);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  const stateRef = useRef<LiftGridPublicState | null>(null);
  const previousCompleteRef = useRef(false);
  const completionStateInitializedRef = useRef(false);
  const victoryCardRef = useRef<HTMLElement | null>(null);
  const liftgridInputRef = useRef<HTMLInputElement | null>(null);
  const boardRenderedRef = useRef(false);
  const suggestionSignatureRef = useRef<string>("");
  const queryChangeTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    setLocalSolvedCells(null);
  }, [state?.gameDate]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(LIFTGRID_BATTLE_FEEDBACK_STORAGE_KEY);
    if (!stored) {
      return;
    }

    if (stored === "yes_make_it" || stored === "maybe" || stored === "not_for_me") {
      setFeedbackChoice(stored);
      setHasStoredBattleFeedback(true);
      setFeedbackStatus("done");
    }
  }, []);

  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(formatCountdown(getMsUntilNextRomeMidnight(new Date())));
    };

    const kickoff = window.setTimeout(updateCountdown, 0);
    const timer = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (shakeTimerRef.current !== null) {
        window.clearTimeout(shakeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (shareStatus !== "copied") {
      return;
    }

    const timer = window.setTimeout(() => {
      setShareStatus("idle");
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [shareStatus]);

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

  useEffect(() => {
    if (query.trim().toLowerCase() !== "secret-debuggerxvii") {
      return;
    }

    setShowDebugOverlay(true);
    setQuery("");
    setSelectedExerciseId(null);
    setFocusTick((current) => current + 1);
    emitEvent({
      eventName: "interactive_click",
      uiSurface: "debug",
      actionTarget: "open-secret-debugger",
    });
  }, [emitEvent, query]);

  const effectiveSolvedCells = useMemo(
    () => localSolvedCells ?? state?.solvedCells ?? [],
    [localSolvedCells, state],
  );
  const effectiveCompletedCount = effectiveSolvedCells.length;
  const effectiveIsComplete = state ? effectiveCompletedCount === state.totalCells : false;
  const didSurrender = gameOutcome === "lose";
  const completedBeforeSurrender = didSurrender
    ? Math.max(0, effectiveSolvedCells.length - revealedCellKeys.length)
    : effectiveCompletedCount;

  const shareText = useMemo(() => {
    if (!state) return "";
    if (gameOutcome !== "lose") {
      return buildLiftGridShareText({
        dailyNumber: state.dailyNumber,
        rows: state.rows.length,
        columns: state.columns.length,
        solvedCells: effectiveSolvedCells,
        totalCells: state.totalCells,
      });
    }

    const solvedBeforeSurrender = new Set(
      effectiveSolvedCells
        .filter((cell) => !revealedCellKeys.includes(cellKey(cell.rowIndex, cell.columnIndex)))
        .map((cell) => cellKey(cell.rowIndex, cell.columnIndex)),
    );
    const revealedSet = new Set(revealedCellKeys);
    const lines: string[] = [];

    for (let rowIndex = 0; rowIndex < state.rows.length; rowIndex += 1) {
      let line = "";
      for (let columnIndex = 0; columnIndex < state.columns.length; columnIndex += 1) {
        const key = cellKey(rowIndex, columnIndex);
        line += solvedBeforeSurrender.has(key) ? "\u{1F7E9}" : revealedSet.has(key) ? "\u{1F7E5}" : "\u2B1B";
      }
      lines.push(line);
    }

    return `LIFTGRID #${state.dailyNumber}\n${lines.join("\n")}\nSurrendered after ${completedBeforeSurrender}/${state.totalCells}`;
  }, [completedBeforeSurrender, effectiveSolvedCells, gameOutcome, revealedCellKeys, state]);

  useEffect(() => {
    if (focusTick === 0 || submitting || effectiveIsComplete) {
      return;
    }

    const focusInput = () => {
      liftgridInputRef.current?.focus();
      liftgridInputRef.current?.select();
    };

    const frame = window.requestAnimationFrame(focusInput);
    const timer = window.setTimeout(focusInput, 40);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [effectiveIsComplete, focusTick, submitting]);

  useEffect(() => {
    if (!completionStateInitializedRef.current) {
      completionStateInitializedRef.current = true;
      previousCompleteRef.current = effectiveIsComplete;
      setShowVictoryCard(effectiveIsComplete);
      return;
    }

    const justCompleted = effectiveIsComplete && !previousCompleteRef.current;
    previousCompleteRef.current = effectiveIsComplete;

    if (!effectiveIsComplete) {
      setShowVictoryCard(false);
      return;
    }

    if (!justCompleted) {
      return;
    }

    if (didSurrender) {
      const timer = window.setTimeout(() => {
        setShowVictoryCelebration(false);
        setShowVictoryCard(true);
        window.requestAnimationFrame(() => {
          victoryCardRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest",
          });
        });
      }, 1000);

      return () => {
        window.clearTimeout(timer);
      };
    }

    setShowVictoryCard(false);
    setVictoryCelebrationSeed((current) => current + 1);
    setShowVictoryCelebration(true);

    const timer = window.setTimeout(() => {
      setShowVictoryCelebration(false);
      setShowVictoryCard(true);
      window.requestAnimationFrame(() => {
        victoryCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        });
      });
    }, 2000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [didSurrender, effectiveIsComplete]);

  const debugSolutions = useMemo(() => {
    if (!state) return [];

    return state.rows.map((rowLabel, rowIndex) =>
      state.columns.map((columnLabel, columnIndex) => {
        const matches = exercises
          .filter(
            (exercise) =>
              matchesExerciseCategory(exercise, state.rowCategoryKey, rowLabel) &&
              matchesExerciseCategory(exercise, state.columnCategoryKey, columnLabel),
          )
          .map((exercise) => exercise.display_name)
          .slice(0, 6);

        return {
          rowIndex,
          columnIndex,
          rowLabel,
          columnLabel,
          matches,
        };
      }),
    );
  }, [exercises, state]);

  const solutionCandidatesByCell = useMemo(() => {
    if (!state) {
      return new Map<string, LiveExerciseSuggestion[]>();
    }

    const next = new Map<string, LiveExerciseSuggestion[]>();
    for (let rowIndex = 0; rowIndex < state.rows.length; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < state.columns.length; columnIndex += 1) {
        const rowLabel = state.rows[rowIndex];
        const columnLabel = state.columns[columnIndex];
        const matches = exercises.filter(
          (exercise) =>
            matchesExerciseCategory(exercise, state.rowCategoryKey, rowLabel) &&
            matchesExerciseCategory(exercise, state.columnCategoryKey, columnLabel),
        );
        next.set(cellKey(rowIndex, columnIndex), matches);
      }
    }

    return next;
  }, [exercises, state]);

  const dailyRelevantExerciseSlugs = useMemo(() => {
    if (!state) return [];

    return [...new Set(
      exercises
        .filter(
          (exercise) =>
            state.rows.some((rowLabel) =>
              matchesExerciseCategory(exercise, state.rowCategoryKey, rowLabel),
            ) &&
            state.columns.some((columnLabel) =>
              matchesExerciseCategory(exercise, state.columnCategoryKey, columnLabel),
            ),
        )
        .map((exercise) => exercise.slug)
        .filter(Boolean),
    )];
  }, [exercises, state]);

  useEffect(() => {
    if (dailyRelevantExerciseSlugs.length === 0) {
      return;
    }

    for (const slug of dailyRelevantExerciseSlugs) {
      void preloadExerciseMedia(slug);
    }
  }, [dailyRelevantExerciseSlugs]);

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

  function showRejectedGuessFeedback(message = "Exercise not present in grid") {
    setToastMessage(message);
    setIsBoardShaking(true);

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    if (shakeTimerRef.current !== null) {
      window.clearTimeout(shakeTimerRef.current);
    }

    shakeTimerRef.current = window.setTimeout(() => {
      setIsBoardShaking(false);
      shakeTimerRef.current = null;
    }, 420);

    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2200);
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
    setToastMessage(null);
    try {
      const response = await submitLiftGridGuessRequest({
        guess: nextGuess,
      });

      if (!response.correct) {
        showRejectedGuessFeedback();
        emitEvent({
          eventName: "guess_result_rendered",
          uiSurface: "entry",
          inputValue: nextGuess,
          inputLength: nextGuess.length,
          isCorrect: false,
          failureReason: response.reason,
          metadata: { message: "Exercise not present in grid" },
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
      setLocalSolvedCells((current) => (current ? [...current, solvedCell] : current));
      setQuery("");
      setSelectedExerciseId(null);
      setShareStatus("idle");
      setGameOutcome(response.isComplete ? "win" : null);
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
      showRejectedGuessFeedback();
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
      if (!effectiveIsComplete) {
        setFocusTick((current) => current + 1);
      }
    }
  }

  async function handleConfirmSurrender() {
    if (!state || isSurrendering) return;

    const solvedSet = new Set(effectiveSolvedCells.map((cell) => cellKey(cell.rowIndex, cell.columnIndex)));
    const usedExerciseIds = new Set(effectiveSolvedCells.map((cell) => cell.exerciseId));
    const pendingCells: Array<{ rowIndex: number; columnIndex: number; key: string }> = [];

    for (let rowIndex = 0; rowIndex < state.rows.length; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < state.columns.length; columnIndex += 1) {
        const key = cellKey(rowIndex, columnIndex);
        if (!solvedSet.has(key)) {
          pendingCells.push({ rowIndex, columnIndex, key });
        }
      }
    }

    const sortedPending = [...pendingCells].sort((left, right) => {
      const leftCount = solutionCandidatesByCell.get(left.key)?.length ?? Number.MAX_SAFE_INTEGER;
      const rightCount = solutionCandidatesByCell.get(right.key)?.length ?? Number.MAX_SAFE_INTEGER;
      return leftCount - rightCount;
    });

    const assigned = new Map<string, LiveExerciseSuggestion>();

    const assignSolutions = (index: number): boolean => {
      if (index >= sortedPending.length) {
        return true;
      }

      const cell = sortedPending[index];
      const candidates = solutionCandidatesByCell.get(cell.key) ?? [];

      for (const exercise of candidates) {
        if (usedExerciseIds.has(exercise.id)) {
          continue;
        }

        usedExerciseIds.add(exercise.id);
        assigned.set(cell.key, exercise);

        if (assignSolutions(index + 1)) {
          return true;
        }

        assigned.delete(cell.key);
        usedExerciseIds.delete(exercise.id);
      }

      return false;
    };

    if (!assignSolutions(0)) {
      showRejectedGuessFeedback("Could not reveal the remaining grid");
      setShowSurrenderDialog(false);
      return;
    }

    emitEvent({
      eventName: "interactive_click",
      uiSurface: "entry",
      actionTarget: "confirm-surrender",
      metadata: {
        remainingCells: pendingCells.length,
      },
    });

    setIsSurrendering(true);
    setShowSurrenderDialog(false);
    setShowVictoryCard(false);
    setShowVictoryCelebration(false);
    setShareStatus("idle");
    setQuery("");
    setSelectedExerciseId(null);
    setGameOutcome("lose");

    const revealOrder = shuffleArray(pendingCells);
    const revealDelayMs = 110;

    revealOrder.forEach((cell, index) => {
      window.setTimeout(() => {
        const exercise = assigned.get(cell.key);
        if (!exercise) {
          return;
        }

        const solvedCell: LiftGridSolvedCell = {
          rowIndex: cell.rowIndex,
          columnIndex: cell.columnIndex,
          exerciseId: exercise.id,
          exerciseName: exercise.display_name,
        };

        setLocalSolvedCells((current) => {
          const existing = current ?? state.solvedCells;
          if (existing.some((entry) => entry.rowIndex === cell.rowIndex && entry.columnIndex === cell.columnIndex)) {
            return existing;
          }
          return [...existing, solvedCell];
        });
        setRevealedCellKeys((current) => [...current, cell.key]);

        if (index === revealOrder.length - 1) {
          window.setTimeout(() => {
            setIsSurrendering(false);
          }, 20);
        }
      }, revealDelayMs * index);
    });
  }

  async function handleFeedback(choice: LiftGridFeedbackChoice) {
    if (feedbackStatus === "submitting" || hasStoredBattleFeedback) return;
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
      setHasStoredBattleFeedback(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LIFTGRID_BATTLE_FEEDBACK_STORAGE_KEY, choice);
      }
    } catch {
      setFeedbackStatus("idle");
    }
  }

  async function handleCopyShare() {
    if (!shareText) return;
    const copyText =
      typeof window === "undefined"
        ? `${shareText}\nhttps://liftdle.vercel.app/liftgrid`
        : `${shareText}\n${window.location.origin}/liftgrid`;
    emitEvent({
      eventName: "share_copy_clicked",
      uiSurface: "share",
      shareText: copyText,
    });

    try {
      await navigator.clipboard.writeText(copyText);
      setShareStatus("copied");
      emitEvent({
        eventName: "share_copy_result",
        uiSurface: "share",
        shareText: copyText,
        metadata: {
          status: "copied",
        },
      });
    } catch {
      setShareStatus("error");
      emitEvent({
        eventName: "share_copy_result",
        uiSurface: "share",
        shareText: copyText,
        metadata: {
          status: "error",
        },
      });
    }
  }

  async function handleDebugReset() {
    setResettingDebugGrid(true);
    setToastMessage(null);
    setShowVictoryCelebration(false);

    try {
      const nextState = await resetLiftGridRequest();
      setState(nextState);
      setLocalSolvedCells(null);
      setRevealedCellKeys([]);
      setQuery("");
      setSelectedExerciseId(null);
      setShareStatus("idle");
      setIsBoardShaking(false);
      setShowVictoryCard(false);
      setShowSurrenderDialog(false);
      setIsSurrendering(false);
      setGameOutcome(null);
      emitEvent({
        eventName: "interactive_click",
        uiSurface: "debug",
        actionTarget: "reset-grid-server",
      });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Failed to reset grid.";
      setToastMessage(message);
    } finally {
      setResettingDebugGrid(false);
    }
  }

  function handleShareOnX() {
    if (!shareText) return;
    const shareUrl =
      typeof window === "undefined" ? "https://liftdle.vercel.app/liftgrid" : `${window.location.origin}/liftgrid`;
    const xText = `${shareText}\n${shareUrl}`;
    const intentUrl = `https://x.com/intent/tweet?${new URLSearchParams({ text: xText }).toString()}`;
    window.open(intentUrl, "_blank", "noopener,noreferrer");
  }

  const exercisesById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  );

  return (
    <ModePageShell className="liftgrid-page">
      {showVictoryCelebration ? (
        <DailyCelebration
          key={`liftgrid-celebration-${victoryCelebrationSeed}`}
          durationMs={2800}
          powerMultiplier={1}
        />
      ) : null}
      <div className="mode-shell">
        <section className="liftgrid-panel">
          <ModeIconNav activeMode="liftgrid" className="liftgrid-mode-nav" />
          <div onClickCapture={handleTrackedClickCapture} className="liftgrid-panel__interaction-layer">
          {loading ? (
            <div className="liftgrid-loading">
              <div className="liftgrid-loading__inner" aria-hidden="true">
                <div className="liftgrid-loading__topline">
                  <span className="liftgrid-loading__badge" />
                  <span className="liftgrid-loading__title" />
                </div>
                <div className="liftgrid-loading__mockboard">
                  <span className="liftgrid-loading__cell liftgrid-loading__cell--corner" />
                  {Array.from({ length: 3 }, (_, index) => (
                    <span
                      key={`liftgrid-loading-column-${index}`}
                      className="liftgrid-loading__cell liftgrid-loading__cell--header"
                    />
                  ))}
                  {Array.from({ length: 3 }, (_, rowIndex) => (
                    <div
                      key={`liftgrid-loading-row-${rowIndex}`}
                      className="liftgrid-loading__mockrow"
                    >
                      <span className="liftgrid-loading__cell liftgrid-loading__cell--header" />
                      {Array.from({ length: 3 }, (_, columnIndex) => (
                        <span
                          key={`liftgrid-loading-body-${rowIndex}-${columnIndex}`}
                          className={`liftgrid-loading__cell ${
                            (rowIndex + columnIndex) % 2 === 0
                              ? "liftgrid-loading__cell--light"
                              : "liftgrid-loading__cell--dark"
                          }`.trim()}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
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
              <div
                className={`liftgrid-board-wrap ${isBoardShaking ? "liftgrid-board-wrap--shake" : ""}`.trim()}
              >
                {showDebugOverlay ? (
                  <aside className="liftgrid-debug-overlay" aria-label="LiftGrid debug solutions">
                    <div className="liftgrid-debug-overlay__head">
                      <strong>Debug solutions</strong>
                      <div className="liftgrid-debug-overlay__actions">
                        <button
                          type="button"
                          className="liftgrid-debug-overlay__reset"
                          onClick={() => void handleDebugReset()}
                          disabled={resettingDebugGrid}
                        >
                          {resettingDebugGrid ? "Resetting..." : "Reset grid"}
                        </button>
                        <button
                          type="button"
                          className="liftgrid-debug-overlay__close"
                          aria-label="Close debugger"
                          onClick={() => {
                            setShowDebugOverlay(false);
                            emitEvent({
                              eventName: "interactive_click",
                              uiSurface: "debug",
                              actionTarget: "close-secret-debugger",
                            });
                          }}
                        >
                          X
                        </button>
                      </div>
                    </div>
                    <div className="liftgrid-debug-overlay__grid">
                      {debugSolutions.flat().map((cell) => (
                        <div
                          key={`${cell.rowIndex}:${cell.columnIndex}`}
                          className="liftgrid-debug-overlay__cell"
                        >
                          <div className="liftgrid-debug-overlay__label">
                            {cell.rowLabel} / {cell.columnLabel}
                          </div>
                          <div className="liftgrid-debug-overlay__value">
                            {cell.matches.length > 0 ? cell.matches.join(", ") : "No match"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </aside>
                ) : null}
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
                      const solvedCell = getSolvedCell(effectiveSolvedCells, rowIndex, columnIndex);
                      const solvedExercise = solvedCell
                        ? exercisesById.get(solvedCell.exerciseId) ?? null
                        : null;

                      return (
                        <div
                          key={cellKey(rowIndex, columnIndex)}
                          className={`liftgrid-cell ${
                            (rowIndex + columnIndex) % 2 === 0
                              ? "liftgrid-cell--tone-light"
                              : "liftgrid-cell--tone-dark"
                          } ${solvedCell ? "liftgrid-cell--solved" : ""} ${
                            revealedCellKeys.includes(cellKey(rowIndex, columnIndex)) ? "liftgrid-cell--revealed" : ""
                          }`.trim()}
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
                                <span className="liftgrid-cell__placeholder-copy">Choose the exercise</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                </div>

                {showSurrenderDialog ? (
                  <div className="liftgrid-surrender" role="dialog" aria-modal="true" aria-label="Surrender LiftGrid">
                    <div className="liftgrid-surrender__panel">
                      <p className="liftgrid-surrender__title">Are you sure you want to surrender this grid?</p>
                      <div className="liftgrid-surrender__actions">
                        <button
                          type="button"
                          className="exercise-media-modal__close victory-panel__action"
                          onClick={() => {
                            setShowSurrenderDialog(false);
                          }}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          className="exercise-media-modal__close victory-panel__action"
                          onClick={() => void handleConfirmSurrender()}
                        >
                          Yes, surrender
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
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
                    className="liftgrid-guess-input"
                    query={query}
                    selectedExerciseId={selectedExerciseId}
                    exercises={exercises}
                    loadingExercises={loading && exercises.length === 0}
                    disabled={effectiveIsComplete || isSurrendering}
                    submitting={submitting}
                    autoDropdownPlacement
                    preferredDropdownPlacement="up"
                    inputElementRef={liftgridInputRef}
                    secondaryAction={{
                      ariaLabel: "Surrender grid",
                      disabled: effectiveIsComplete || isSurrendering,
                      icon: (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 3v18" />
                          <path d="M5 4h10l-1.6 3L15 10H5" />
                        </svg>
                      ),
                      onClick: () => {
                        emitEvent({
                          eventName: "interactive_click",
                          uiSurface: "entry",
                          actionTarget: "open-surrender-dialog",
                        });
                        setShowSurrenderDialog(true);
                      },
                    }}
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

              </div>
              {showVictoryCard && effectiveIsComplete ? (
                <section
                  ref={victoryCardRef}
                  className="victory-panel liftgrid-victory-card"
                  aria-label="LiftGrid victory card"
                >
                  <div className="victory-panel__head">
                    <p className="victory-panel__kicker">{didSurrender ? "Defeat" : "Victory"}</p>
                    <h3 className="victory-panel__title">{didSurrender ? "You'll get it next time" : "You win"}</h3>
                  </div>

                  <div className="victory-panel__stats">
                    <p className="victory-panel__stat-line">
                      Completed: <span>{completedBeforeSurrender}</span> / <span>{state.totalCells}</span>
                    </p>
                    <p className="victory-panel__countdown">{countdown}</p>
                    <p className="victory-panel__timezone">Europe/Rome (midnight reset)</p>
                  </div>

                  <div className="victory-panel__share-card">
                    <p className="victory-panel__share-text">Share result</p>
                    <pre className="liftgrid-share__preview">{shareText}</pre>
                    <div className="victory-panel__actions">
                      <button
                        type="button"
                        className="exercise-media-modal__close victory-panel__action"
                        onClick={() => void handleCopyShare()}
                        data-liftgrid-action="copy-share"
                        data-liftgrid-surface="share"
                      >
                        {shareStatus === "copied"
                          ? "Result copied"
                          : shareStatus === "error"
                            ? "Copy failed"
                            : "Copy result"}
                      </button>
                      <button
                        type="button"
                        className="exercise-media-modal__close victory-panel__action"
                        onClick={handleShareOnX}
                        data-liftgrid-action="share-on-x"
                        data-liftgrid-surface="share"
                      >
                        Share on X
                      </button>
                    </div>
                  </div>

                  {!hasStoredBattleFeedback ? (
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
                            disabled={feedbackStatus === "submitting" || hasStoredBattleFeedback}
                            data-liftgrid-action={`feedback-${option.value}`}
                            data-liftgrid-surface="feedback"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </>
          ) : null}
          {toastMessage ? (
            <div className="liftgrid-toast" aria-live="polite" role="status">
              {toastMessage}
            </div>
          ) : null}
          </div>
        </section>
      </div>
    </ModePageShell>
  );
}
