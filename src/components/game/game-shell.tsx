'use client';

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnonymousAuthBootstrap } from "@/components/game/anonymous-auth-bootstrap";
import { AttemptsTable } from "@/components/game/attempts-table";
import { GuessInput } from "@/components/game/guess-input";
import { VictoryPanel } from "@/components/game/victory-panel";
import {
  fetchLiveExercises,
  fetchTodayGameState,
  submitGuessRequest,
  type LiveExerciseSuggestion,
} from "@/lib/game/client";
import { evaluateGuess } from "@/lib/exercises/evaluate";
import type { Exercise } from "@/types/exercise";
import type { PublicGameAttempt, PublicTodayGameState } from "@/types/game";

type GameShellProps = {
  initialState: PublicTodayGameState | null;
};

type ToastState = {
  id: number;
  message: string;
};

type GameMode = "daily" | "infinite";

type InfiniteStatus = "not_started" | "in_progress" | "lost" | "completed";

type InfiniteGameState = {
  status: InfiniteStatus;
  score: number;
  currentIndex: number;
  attempts: PublicGameAttempt[];
  maxAttemptsPerRound: number;
  exerciseOrderIds: string[];
  runSeed: number | null;
};

type MarathonTransitionState = {
  phase: "solved" | "next";
  exerciseName: string;
  score: number;
};

type FooterModal = "how-to-play" | "privacy" | null;

function toExerciseModel(exercise: LiveExerciseSuggestion): Exercise {
  return {
    id: exercise.id,
    slug: exercise.slug,
    name: exercise.name,
    aliases: exercise.aliases,
    muscle: exercise.muscle,
    equipment: exercise.equipment,
    movement: exercise.movement,
    pattern: exercise.pattern,
    reps: exercise.reps,
    goal: exercise.goal,
    ego: exercise.ego,
    muscle_group: exercise.muscle_group,
    is_live: true,
  };
}

function createInfiniteGameState(): InfiniteGameState {
  return {
    status: "not_started",
    score: 0,
    currentIndex: 0,
    attempts: [],
    maxAttemptsPerRound: 7,
    exerciseOrderIds: [],
    runSeed: null,
  };
}

function createShuffledExerciseOrder(exercises: LiveExerciseSuggestion[]): string[] {
  const ids = exercises.map((exercise) => exercise.id);

  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = ids[i];
    ids[i] = ids[j];
    ids[j] = tmp;
  }

  return ids;
}

function buildInfiniteAttempt(guess: LiveExerciseSuggestion, target: LiveExerciseSuggestion): PublicGameAttempt {
  const feedback = evaluateGuess(toExerciseModel(guess), toExerciseModel(target));
  // In infinite mode the win condition must be the exact exercise, not just matching attributes.
  const correct = guess.id === target.id;

  return {
    id: `inf-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    guessExerciseId: guess.id,
    guessSlug: guess.slug,
    guessName: guess.name,
    guessMuscleGroup: guess.muscle_group,
    values: {
      muscle: guess.muscle.join(" / "),
      equipment: guess.equipment.join(" / "),
      movement: guess.movement.join(" / "),
      pattern: guess.pattern.join(" / "),
      reps: guess.reps.join(" / "),
      goal: guess.goal.join(" / "),
      ego: guess.ego.join(" / "),
    },
    feedback,
    isCorrect: correct,
  };
}

export function GameShell({ initialState }: GameShellProps) {
  const [mode, setMode] = useState<GameMode>("daily");
  const [gameState, setGameState] = useState<PublicTodayGameState | null>(initialState);
  const [infiniteState, setInfiniteState] = useState<InfiniteGameState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exercises, setExercises] = useState<LiveExerciseSuggestion[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [revealingAttemptId, setRevealingAttemptId] = useState<string | null>(null);
  const [marathonTransition, setMarathonTransition] = useState<MarathonTransitionState | null>(null);
  const [footerModal, setFooterModal] = useState<FooterModal>(null);
  const toastIdRef = useRef(0);
  const revealTimeoutRef = useRef<number | null>(null);
  const marathonSolvedTimeoutRef = useRef<number | null>(null);
  const marathonNextTimeoutRef = useRef<number | null>(null);

  const exerciseById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises]);

  const activeInfiniteTarget = useMemo(() => {
    if (!infiniteState || infiniteState.status === "not_started") {
      return null;
    }

    const targetId = infiniteState.exerciseOrderIds[infiniteState.currentIndex];
    if (!targetId) {
      return null;
    }

    return exerciseById.get(targetId) ?? null;
  }, [exerciseById, infiniteState]);

  const activeAttempts = useMemo(
    () => (mode === "daily" ? gameState?.attempts ?? [] : infiniteState?.attempts ?? []),
    [gameState?.attempts, infiniteState?.attempts, mode],
  );

  const attemptedExerciseIds = useMemo(
    () => new Set(activeAttempts.map((attempt) => attempt.guessExerciseId)),
    [activeAttempts],
  );

  const selectableExercises = useMemo(
    () => exercises.filter((exercise) => !attemptedExerciseIds.has(exercise.id)),
    [attemptedExerciseIds, exercises],
  );

  const pushToast = useCallback((message: string) => {
    const id = ++toastIdRef.current;
    setToast({ id, message });

    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3600);
  }, []);

  useEffect(() => {
    if (!revealingAttemptId) {
      return;
    }

    if (revealTimeoutRef.current !== null) {
      window.clearTimeout(revealTimeoutRef.current);
    }

    revealTimeoutRef.current = window.setTimeout(() => {
      setRevealingAttemptId(null);
      revealTimeoutRef.current = null;
    }, 2600);

    return () => {
      if (revealTimeoutRef.current !== null) {
        window.clearTimeout(revealTimeoutRef.current);
        revealTimeoutRef.current = null;
      }
    };
  }, [revealingAttemptId]);

  useEffect(() => {
    return () => {
      if (marathonSolvedTimeoutRef.current !== null) {
        window.clearTimeout(marathonSolvedTimeoutRef.current);
      }

      if (marathonNextTimeoutRef.current !== null) {
        window.clearTimeout(marathonNextTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!footerModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFooterModal(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [footerModal]);

  const loadExercises = useCallback(async () => {
    if (exercises.length > 0) {
      return;
    }

    setLoadingExercises(true);

    try {
      const result = await fetchLiveExercises();
      setExercises(result);
      setInfiniteState(createInfiniteGameState());
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to load exercises.");
    } finally {
      setLoadingExercises(false);
    }
  }, [exercises.length, pushToast]);

  const loadTodayState = useCallback(async () => {
    setIsLoadingState(true);

    try {
      const state = await fetchTodayGameState();
      setGameState(state);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to load game state.");
    } finally {
      setIsLoadingState(false);
    }
  }, [pushToast]);

  const handleAuthReady = useCallback(() => {
    void loadExercises();

    if (!gameState) {
      void loadTodayState();
    }
  }, [gameState, loadExercises, loadTodayState]);

  const handleModeChange = useCallback((nextMode: GameMode) => {
    if (marathonSolvedTimeoutRef.current !== null) {
      window.clearTimeout(marathonSolvedTimeoutRef.current);
      marathonSolvedTimeoutRef.current = null;
    }

    if (marathonNextTimeoutRef.current !== null) {
      window.clearTimeout(marathonNextTimeoutRef.current);
      marathonNextTimeoutRef.current = null;
    }

    setMarathonTransition(null);
    setMode(nextMode);
    setQuery("");
    setSelectedExerciseId(null);
    setRevealingAttemptId(null);
  }, []);

  const startMarathonRun = useCallback(() => {
    if (exercises.length === 0) {
      pushToast("Exercises are still loading.");
      return;
    }

    if (marathonSolvedTimeoutRef.current !== null) {
      window.clearTimeout(marathonSolvedTimeoutRef.current);
      marathonSolvedTimeoutRef.current = null;
    }

    if (marathonNextTimeoutRef.current !== null) {
      window.clearTimeout(marathonNextTimeoutRef.current);
      marathonNextTimeoutRef.current = null;
    }

    const order = createShuffledExerciseOrder(exercises);
    const seed = Date.now();

    setInfiniteState({
      status: "in_progress",
      score: 0,
      currentIndex: 0,
      attempts: [],
      maxAttemptsPerRound: 7,
      exerciseOrderIds: order,
      runSeed: seed,
    });
    setMarathonTransition(null);
    setQuery("");
    setSelectedExerciseId(null);
    setRevealingAttemptId(null);
  }, [exercises, pushToast]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedExerciseId(null);
  }, []);

  const handleSelectExercise = useCallback((exercise: LiveExerciseSuggestion) => {
    setQuery(exercise.name);
    setSelectedExerciseId(exercise.id);
  }, []);

  const handleSubmitDaily = useCallback(async (overrideExerciseId?: string) => {
    const exerciseId = overrideExerciseId ?? selectedExerciseId;

    if (!exerciseId) {
      pushToast("Select an exercise from the dropdown first.");
      return;
    }

    if (attemptedExerciseIds.has(exerciseId)) {
      pushToast("You already guessed this exercise.");
      setSelectedExerciseId(null);
      return;
    }

    if (!gameState || gameState.status !== "in_progress") {
      return;
    }

    setIsSubmitting(true);

    try {
      const updated = await submitGuessRequest(exerciseId);
      setRevealingAttemptId(updated.attempt.id);
      setGameState((current) => {
        if (!current || current.gameDate !== updated.gameDate) {
          return current;
        }

        return {
          ...current,
          status: updated.status,
          guessCount: updated.guessCount,
          attempts: [updated.attempt, ...current.attempts],
        };
      });
      setQuery("");
      setSelectedExerciseId(null);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to submit guess.");
    } finally {
      setIsSubmitting(false);
    }
  }, [attemptedExerciseIds, gameState, pushToast, selectedExerciseId]);

  const handleSubmitInfinite = useCallback((overrideExerciseId?: string) => {
    const exerciseId = overrideExerciseId ?? selectedExerciseId;

    if (!exerciseId) {
      pushToast("Select an exercise from the dropdown first.");
      return;
    }

    if (!infiniteState || infiniteState.status !== "in_progress") {
      return;
    }

    if (marathonTransition) {
      return;
    }

    if (!activeInfiniteTarget) {
      pushToast("No target exercise available.");
      return;
    }

    if (attemptedExerciseIds.has(exerciseId)) {
      pushToast("You already guessed this exercise in this round.");
      setSelectedExerciseId(null);
      return;
    }

    const guessed = exerciseById.get(exerciseId);

    if (!guessed) {
      pushToast("Selected exercise is not available.");
      return;
    }

    const attempt = buildInfiniteAttempt(guessed, activeInfiniteTarget);
    const attempts = [attempt, ...infiniteState.attempts];
    const attemptsUsed = attempts.length;

    setRevealingAttemptId(attempt.id);
    setQuery("");
    setSelectedExerciseId(null);

    if (attempt.isCorrect) {
      const nextScore = infiniteState.score + 1;
      const nextIndex = infiniteState.currentIndex + 1;

      if (nextIndex >= infiniteState.exerciseOrderIds.length) {
        setInfiniteState({
          ...infiniteState,
          score: nextScore,
          currentIndex: nextIndex,
          attempts,
          status: "completed",
        });
        pushToast(`Perfect run completed. Final score: ${nextScore}.`);
        return;
      }

      setMarathonTransition({
        phase: "solved",
        exerciseName: activeInfiniteTarget.name,
        score: nextScore,
      });

      marathonSolvedTimeoutRef.current = window.setTimeout(() => {
        setMarathonTransition({
          phase: "next",
          exerciseName: activeInfiniteTarget.name,
          score: nextScore,
        });
        marathonSolvedTimeoutRef.current = null;

        marathonNextTimeoutRef.current = window.setTimeout(() => {
          setInfiniteState({
            ...infiniteState,
            score: nextScore,
            currentIndex: nextIndex,
            attempts: [],
          });
          setMarathonTransition(null);
          marathonNextTimeoutRef.current = null;
        }, 1500);
      }, 2200);

      return;
    }

    if (attemptsUsed >= infiniteState.maxAttemptsPerRound) {
      setInfiniteState({
        ...infiniteState,
        attempts,
        status: "lost",
      });
      pushToast("Run over. You used all 7 attempts.");
      return;
    }

    setInfiniteState({
      ...infiniteState,
      attempts,
    });
  }, [
    activeInfiniteTarget,
    attemptedExerciseIds,
    exerciseById,
    infiniteState,
    marathonTransition,
    pushToast,
    selectedExerciseId,
  ]);

  const handleSubmit = useCallback(async (exercise?: LiveExerciseSuggestion) => {
    const overrideExerciseId = exercise?.id;

    if (mode === "daily") {
      await handleSubmitDaily(overrideExerciseId);
      return;
    }

    handleSubmitInfinite(overrideExerciseId);
  }, [handleSubmitDaily, handleSubmitInfinite, mode]);

  const restartInfiniteMode = useCallback(() => {
    if (exercises.length === 0) {
      return;
    }

    if (marathonSolvedTimeoutRef.current !== null) {
      window.clearTimeout(marathonSolvedTimeoutRef.current);
      marathonSolvedTimeoutRef.current = null;
    }

    if (marathonNextTimeoutRef.current !== null) {
      window.clearTimeout(marathonNextTimeoutRef.current);
      marathonNextTimeoutRef.current = null;
    }

    setInfiniteState(createInfiniteGameState());
    setMarathonTransition(null);
    setQuery("");
    setSelectedExerciseId(null);
    setRevealingAttemptId(null);
  }, [exercises.length]);

  const isDailyWon = gameState?.status === "won";
  const winningAttempt = gameState?.attempts.find((attempt) => attempt.isCorrect) ?? null;
  const isMarathonStarted = infiniteState !== null && infiniteState.status !== "not_started";

  const infiniteAttemptsUsed = infiniteState?.attempts.length ?? 0;
  const infiniteAttemptsLeft = infiniteState ? Math.max(0, infiniteState.maxAttemptsPerRound - infiniteAttemptsUsed) : 0;
  const infiniteTotal =
    infiniteState && infiniteState.exerciseOrderIds.length > 0
      ? infiniteState.exerciseOrderIds.length
      : exercises.length;
  const infiniteRemaining = infiniteState ? Math.max(0, infiniteTotal - infiniteState.score) : infiniteTotal;
  const marathonProgressPct =
    infiniteTotal > 0 ? Math.min(100, Math.max(0, Math.round(((infiniteState?.score ?? 0) / infiniteTotal) * 100))) : 0;

  const disabled =
    mode === "daily"
      ? !gameState || gameState.status !== "in_progress" || isSubmitting
      : !infiniteState || infiniteState.status !== "in_progress" || marathonTransition !== null;

  return (
    <>
      <main className="game-page">
        <AnonymousAuthBootstrap onReady={handleAuthReady} />

        <section className="game-shell" aria-label="Muscledle gameplay">
          <header className="game-hero">
            <h1 className="game-hero__title">
              <span className="game-hero__title-main">MUSCLE</span>
              <span className="game-hero__title-accent">DLE</span>
            </h1>
            <p className="game-hero__subtitle">FIND TODAY&apos;S EXERCISE.</p>

            <div className="mode-switch" aria-label="Game mode switch">
              <button
                type="button"
                aria-pressed={mode === "daily"}
                className={`mode-switch__button ${mode === "daily" ? "mode-switch__button--active" : ""}`}
                onClick={() => handleModeChange("daily")}
              >
                Daily
              </button>
              <button
                type="button"
                aria-pressed={mode === "infinite"}
                className={`mode-switch__button ${mode === "infinite" ? "mode-switch__button--active" : ""}`}
                onClick={() => handleModeChange("infinite")}
              >
                Marathon
              </button>
            </div>

            {mode === "daily" && !isDailyWon ? (
              <div className="game-prompt-panel" role="status" aria-live="polite">
                <h2 className="game-prompt-panel__title">Guess today&apos;s Muscledle exercise.</h2>
                {(!gameState || gameState.guessCount === 0) ? (
                  <p className="game-prompt-panel__subtitle">Type any exercise name to begin.</p>
                ) : null}
              </div>
            ) : null}

            {mode === "infinite" ? (
              <div className="game-prompt-panel game-prompt-panel--infinite" role="status" aria-live="polite">
                <p className="marathon-hud__kicker">
                  {infiniteState?.status === "completed"
                    ? "Run Complete"
                    : infiniteState?.status === "lost"
                      ? "Run Failed"
                      : infiniteState?.status === "not_started"
                        ? "Get Ready"
                        : "Live Run"}
                </p>
                <h2 className="game-prompt-panel__title marathon-hud__title">
                  {infiniteState?.status === "completed"
                    ? "Marathon completed"
                    : infiniteState?.status === "lost"
                      ? "Marathon over"
                      : infiniteState?.status === "not_started"
                        ? "Marathon ready"
                      : "Marathon mode"}
                </h2>
                <div className="marathon-hud__bar-wrap" aria-label="Marathon progress">
                  <div className="marathon-hud__bar">
                    <span className="marathon-hud__bar-fill" style={{ width: `${marathonProgressPct}%` }} />
                  </div>
                  <p className="marathon-hud__bar-label">{marathonProgressPct}% complete</p>
                </div>
                <div className="marathon-hud__stats">
                  <p className="marathon-hud__stat">
                    <span className="marathon-hud__stat-label">Score</span>
                    <strong>{infiniteState?.score ?? 0}</strong>
                  </p>
                  <p className="marathon-hud__stat">
                    <span className="marathon-hud__stat-label">Attempts Left</span>
                    <strong>{infiniteAttemptsLeft}</strong>
                  </p>
                  <p className="marathon-hud__stat">
                    <span className="marathon-hud__stat-label">Remaining</span>
                    <strong>{infiniteRemaining}</strong>
                  </p>
                </div>
                {infiniteState?.status === "lost" || infiniteState?.status === "completed" ? (
                  <button
                    type="button"
                    className="exercise-media-modal__close game-prompt-panel__restart"
                    onClick={restartInfiniteMode}
                  >
                    Restart Run
                  </button>
                ) : null}
              </div>
            ) : null}
          </header>

          {mode === "infinite" && !isMarathonStarted ? (
            <section className="marathon-start-zone" aria-label="Start marathon">
              <button
                type="button"
                className="exercise-media-modal__close marathon-start-zone__button"
                onClick={startMarathonRun}
                disabled={loadingExercises || exercises.length === 0}
              >
                Start
              </button>
            </section>
          ) : null}

          {mode === "daily" && isDailyWon ? (
            <section className="game-win-zone" aria-label="Victory summary">
              <VictoryPanel
                gameDate={gameState?.gameDate ?? ""}
                guessCount={gameState?.guessCount ?? 0}
                winningAttempt={winningAttempt}
                attempts={gameState?.attempts ?? []}
              />
            </section>
          ) : null}

          {(mode === "daily" && !isDailyWon) || (mode === "infinite" && isMarathonStarted) ? (
            <section className="game-input-zone" aria-label="Guess input">
              <GuessInput
                query={query}
                selectedExerciseId={selectedExerciseId}
                exercises={selectableExercises}
                loadingExercises={loadingExercises}
                disabled={disabled}
                submitting={isSubmitting}
                onQueryChange={handleQueryChange}
                onSelectExercise={handleSelectExercise}
                onSubmit={(exercise) => {
                  void handleSubmit(exercise);
                }}
              />
            </section>
          ) : null}

          {(mode === "daily" || isMarathonStarted) ? (
            <div className="marathon-stage">
              <section className="game-table-zone" aria-label="Attempts">
                <AttemptsTable
                  attempts={activeAttempts}
                  loading={mode === "daily" ? isLoadingState && !gameState : false}
                  revealingAttemptId={revealingAttemptId}
                />
              </section>

              {mode === "infinite" && marathonTransition ? (
                <section className="marathon-transition" aria-live="polite">
                  <div className="marathon-transition__panel">
                    <p className="marathon-transition__kicker">
                      {marathonTransition.phase === "solved" ? "Correct" : "Next Exercise"}
                    </p>
                    <p className="marathon-transition__title">
                      {marathonTransition.phase === "solved"
                        ? marathonTransition.exerciseName
                        : "Preparing next challenge"}
                    </p>
                    <p className="marathon-transition__score">Score {marathonTransition.score}</p>
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}

          {mode === "daily" ? (
            <section className="yesterday-exercise" aria-label="Yesterday exercise">
              <p className="yesterday-exercise__text">
                Yesterday&apos;s exercise was{" "}
                <span className="yesterday-exercise__name">
                  {gameState?.yesterdayExerciseName ?? "Unknown"}
                </span>
              </p>
            </section>
          ) : null}
        </section>
      </main>

      <footer className="game-footer" aria-label="Muscledle footer">
        <nav className="game-footer__links" aria-label="Footer links">
          <button type="button" className="game-footer__link" onClick={() => setFooterModal("how-to-play")}>
            HOW TO PLAY
          </button>
          <button type="button" className="game-footer__link">STATS</button>
          <Link href="/archive" className="game-footer__link">ARCHIVE</Link>
          <button type="button" className="game-footer__link" onClick={() => setFooterModal("privacy")}>
            PRIVACY
          </button>
        </nav>
        <p className="game-footer__copy">(C) 2024 MUSCLEDLE. ENGINEERED FOR INTENSITY.</p>
      </footer>

      {footerModal ? (
        <section className="info-sheet" aria-label="Information modal" onClick={() => setFooterModal(null)}>
          <div className="info-sheet__panel" onClick={(event) => event.stopPropagation()}>
            <div className="info-sheet__head">
              <h2 className="info-sheet__title">{footerModal === "how-to-play" ? "How To Play" : "Privacy"}</h2>
              <button type="button" className="exercise-media-modal__close" onClick={() => setFooterModal(null)}>
                Close
              </button>
            </div>

            {footerModal === "how-to-play" ? (
              <div className="info-sheet__body">
                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">Goal</h3>
                  <p>Guess today&apos;s exercise in as few attempts as possible.</p>
                </section>
                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">How Feedback Works</h3>
                  <p>
                    Each row compares your guess with the daily target across seven attributes: muscle, equipment,
                    movement, pattern, reps, goal, ego.
                  </p>
                  <p>
                    Green means correct. Yellow means partially aligned. Red means wrong for that attribute.
                  </p>
                </section>
                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">Game Modes</h3>
                  <p>
                    Daily: one target per day, reset at midnight Europe/Rome.
                  </p>
                  <p>
                    Marathon: continuous run, one target after another, score based on solved rounds.
                  </p>
                </section>
                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">Tips</h3>
                  <p>Use autocomplete, submit quickly, then adjust based on color patterns.</p>
                  <p>Open ARCHIVE to inspect exercise coverage and historical data.</p>
                </section>
              </div>
            ) : (
              <div className="info-sheet__body">
                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">Data We Store</h3>
                  <p>
                    We store gameplay data needed to run the game: guesses, feedback, daily game state, and aggregate
                    stats.
                  </p>
                </section>
                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">Media And Enrichment</h3>
                  <p>
                    Exercise GIFs and enrichment metadata are synced server-side and saved in the internal database.
                  </p>
                  <p>
                    Provider data is used as raw input only. Gameplay remains based on Muscledle internal fields.
                  </p>
                </section>
                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">Authentication</h3>
                  <p>
                    Sessions use Supabase auth. Anonymous sessions may be used to enable gameplay before account linking.
                  </p>
                </section>
                <section className="info-sheet__section">
                  <h3 className="info-sheet__section-title">Contact</h3>
                  <p>
                    For data requests or deletion, contact the project admin and provide your user identifier if
                    available.
                  </p>
                </section>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {toast ? <div className="game-toast">{toast.message}</div> : null}
    </>
  );
}
