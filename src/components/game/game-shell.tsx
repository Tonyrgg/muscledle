'use client';

import { useCallback, useMemo, useRef, useState } from "react";
import { AnonymousAuthBootstrap } from "@/components/game/anonymous-auth-bootstrap";
import { AttemptsTable } from "@/components/game/attempts-table";
import { GuessInput } from "@/components/game/guess-input";
import {
  fetchLiveExercises,
  fetchTodayGameState,
  submitGuessRequest,
  type LiveExerciseSuggestion,
} from "@/lib/game/client";
import type { PublicTodayGameState } from "@/types/game";

type GameShellProps = {
  initialState: PublicTodayGameState | null;
};

type ToastState = {
  id: number;
  message: string;
};

function TopNav() {
  return (
    <header className="app-topnav">
      <div className="app-topnav__inner">
        <div className="app-topnav__brand">MUSCLEDLE</div>
        <div className="app-topnav__actions">
          <div className="app-topnav__tabs">
            <span className="app-topnav__tab app-topnav__tab--active">Today&apos;s Lift</span>
            <span className="app-topnav__tab">Archive</span>
            <span className="app-topnav__tab">Statistics</span>
          </div>
          <button className="app-topnav__icon-btn focus-ring material-symbols-outlined" aria-label="leaderboard">
            leaderboard
          </button>
          <button className="app-topnav__icon-btn focus-ring material-symbols-outlined" aria-label="settings">
            settings
          </button>
        </div>
      </div>
    </header>
  );
}

function Legend() {
  return (
    <div className="legend-row" aria-hidden>
      <div className="legend-item">
        <span className="legend-swatch legend-swatch--green" />
        <span className="legend-label">Match</span>
      </div>
      <div className="legend-item">
        <span className="legend-swatch legend-swatch--yellow" />
        <span className="legend-label">Close</span>
      </div>
      <div className="legend-item">
        <span className="legend-swatch legend-swatch--red" />
        <span className="legend-label">Mismatch</span>
      </div>
    </div>
  );
}

export function GameShell({ initialState }: GameShellProps) {
  const [gameState, setGameState] = useState<PublicTodayGameState | null>(initialState);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exercises, setExercises] = useState<LiveExerciseSuggestion[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((message: string) => {
    const id = ++toastIdRef.current;
    setToast({ id, message });

    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4200);
  }, []);

  const loadExercises = useCallback(async () => {
    if (exercises.length > 0) {
      return;
    }

    setLoadingExercises(true);

    try {
      const result = await fetchLiveExercises();
      setExercises(result);
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

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedExerciseId(null);
  }, []);

  const handleSelectExercise = useCallback((exercise: LiveExerciseSuggestion) => {
    setQuery(exercise.name);
    setSelectedExerciseId(exercise.id);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedExerciseId) {
      pushToast("Select an exercise from the dropdown first.");
      return;
    }

    if (!gameState || gameState.status !== "in_progress") {
      return;
    }

    setIsSubmitting(true);

    try {
      const updated = await submitGuessRequest(selectedExerciseId);
      setGameState(updated);
      setQuery("");
      setSelectedExerciseId(null);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to submit guess.");
    } finally {
      setIsSubmitting(false);
    }
  }, [gameState, pushToast, selectedExerciseId]);

  const statusMessage = useMemo(() => {
    if (!gameState) return "Preparing daily game...";
    if (gameState.status === "won") return "You solved today's Muscledle.";
    if (gameState.status === "lost") return "No guesses left for today.";
    return null;
  }, [gameState]);

  const attemptsLabel = gameState ? `${gameState.guessCount}/${gameState.maxGuesses}` : "-/-";
  const disabled = !gameState || gameState.status !== "in_progress" || isSubmitting;

  return (
    <>
      <TopNav />
      <main className="app-main">
        <AnonymousAuthBootstrap onReady={handleAuthReady} />

        <div className="app-content">
          <div className="hero">
            <h1 className="hero__title">MUSCLEDLE</h1>
            <div className="attempts-badge">
              <span className="attempts-badge__label">Attempts</span>
              <span className="attempts-badge__divider" />
              <span className="attempts-badge__value">{attemptsLabel}</span>
            </div>
            {statusMessage ? <p className="hero__status">{statusMessage}</p> : null}
          </div>

          <div className="search-section">
            <div className="search-shell">
              <GuessInput
                query={query}
                selectedExerciseId={selectedExerciseId}
                exercises={exercises}
                loadingExercises={loadingExercises}
                disabled={disabled}
                submitting={isSubmitting}
                onQueryChange={handleQueryChange}
                onSelectExercise={handleSelectExercise}
                onSubmit={handleSubmit}
              />
            </div>
            <button type="button" onClick={handleSubmit} disabled={disabled || !selectedExerciseId} className="submit-btn">
              {isSubmitting ? "Submitting..." : "Submit Guess"}
            </button>
          </div>

          <div className="meta-row">
            <p className="meta-row__date">Game Date: {gameState?.gameDate ?? "--"}</p>
            <div className="help-wrap">
              <button className="help-btn focus-ring material-symbols-outlined" aria-label="help">
                help
              </button>
              <div className="help-tooltip">Hover cards to inspect feedback quickly.</div>
            </div>
          </div>

          <AttemptsTable attempts={gameState?.attempts ?? []} loading={isLoadingState && !gameState} />

          <Legend />
        </div>
      </main>

      {toast ? <div className="toast">{toast.message}</div> : null}
    </>
  );
}
