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
    }, 3600);
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

  const disabled = !gameState || gameState.status !== "in_progress" || isSubmitting;

  return (
    <>
      <main className="game-page">
        <AnonymousAuthBootstrap onReady={handleAuthReady} />

        <section className="game-shell" aria-label="Muscledle gameplay">
          <header className="game-hero">
            <div className="game-hero__brand">Muscledle</div>
            <div className="game-hero__rule" aria-hidden />
            <h1 className="game-hero__title">MUSCLEDLE</h1>
            <p className="game-hero__subtitle">FIND TODAY&apos;S EXERCISE.</p>

            <div className="game-prompt-panel" role="status" aria-live="polite">
              <h2 className="game-prompt-panel__title">Guess today&apos;s Muscledle exercise.</h2>
              <p className="game-prompt-panel__subtitle">
                Type any exercise name to begin.
              </p>
            </div>

          </header>

          <section className="game-input-zone" aria-label="Guess input">
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
          </section>

          <section className="game-table-zone" aria-label="Attempts">
            <AttemptsTable attempts={gameState?.attempts ?? []} loading={isLoadingState && !gameState} />
          </section>

          <section className="yesterday-exercise" aria-label="Yesterday exercise">
            <p className="yesterday-exercise__text">
              Yesterday&apos;s exercise was{" "}
              <span className="yesterday-exercise__name">
                {gameState?.yesterdayExerciseName ?? "Unknown"}
              </span>
            </p>
          </section>
        </section>
      </main>

      <footer className="game-footer" aria-label="Muscledle footer">
        <nav className="game-footer__links" aria-label="Footer links">
          <button type="button" className="game-footer__link">HOW TO PLAY</button>
          <button type="button" className="game-footer__link">STATS</button>
          <button type="button" className="game-footer__link">ARCHIVE</button>
          <button type="button" className="game-footer__link">PRIVACY</button>
        </nav>
        <p className="game-footer__copy">(C) 2024 MUSCLEDLE. ENGINEERED FOR INTENSITY.</p>
      </footer>

      {toast ? <div className="game-toast">{toast.message}</div> : null}
    </>
  );
}
