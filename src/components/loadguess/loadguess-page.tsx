"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LoadGuessAttempts } from "@/components/loadguess/loadguess-attempts";
import { LoadGuessVideo } from "@/components/loadguess/loadguess-video";
import { UnitToggle } from "@/components/loadguess/unit-toggle";
import { LOAD_GUESS_VIDEOS } from "@/data/loadguess/videos";
import { formatLoadValue, getLoadFeedback } from "@/lib/loadguess/feedback";
import {
  createDailySessionState,
  LOAD_GUESS_DAILY_ROUNDS,
  LOAD_GUESS_MAX_ATTEMPTS,
  readStoredDailySession,
  writeStoredDailySession,
} from "@/lib/loadguess/daily";
import type {
  LoadGuessRoundState,
  LoadGuessSessionState,
  LoadGuessStatus,
  Unit,
} from "@/lib/loadguess/types";

function getVideoById(videoId: string) {
  const video = LOAD_GUESS_VIDEOS.find((entry) => entry.id === videoId);
  if (!video) {
    throw new Error(`Missing LoadGuess video: ${videoId}`);
  }

  return video;
}

function getSubmittedCount(round: LoadGuessRoundState): number {
  return round.attempts.filter((attempt) => attempt.submitted).length;
}

export function LoadGuessPage() {
  const [unit, setUnit] = useState<Unit>("kg");
  const [session, setSession] = useState<LoadGuessSessionState>(() =>
    readStoredDailySession() ?? createDailySessionState(),
  );
  const hasPersistedRef = useRef(false);

  useEffect(() => {
    if (!hasPersistedRef.current) {
      hasPersistedRef.current = true;
      return;
    }

    writeStoredDailySession(session);
  }, [session]);

  const currentRound = session.rounds[session.currentRoundIndex];
  const currentVideo = getVideoById(currentRound.videoId);
  const submittedCount = getSubmittedCount(currentRound);
  const isRoundComplete = currentRound.status !== "playing";
  const isLastRound = session.currentRoundIndex === session.rounds.length - 1;
  const isSessionComplete =
    isLastRound && session.rounds[session.currentRoundIndex].status !== "playing";

  function setSessionState(
    updater: (current: LoadGuessSessionState) => LoadGuessSessionState,
  ) {
    setSession((current) => updater(current));
  }

  function handleAdjustAttempt(attemptIndex: number, deltaKg: number) {
    setSessionState((current) => {
      const round = current.rounds[current.currentRoundIndex];
      if (round.status !== "playing" || attemptIndex !== round.currentAttemptIndex) {
        return current;
      }

      const nextRounds = current.rounds.map((entry, roundIndex) => {
        if (roundIndex !== current.currentRoundIndex) {
          return entry;
        }

        return {
          ...entry,
          attempts: entry.attempts.map((attempt, index) => {
            if (index !== attemptIndex || attempt.submitted) {
              return attempt;
            }

            return {
              ...attempt,
              valueKg: Math.max(0, attempt.valueKg + deltaKg),
            };
          }),
        };
      });

      return {
        ...current,
        rounds: nextRounds,
      };
    });
  }

  function handleSubmitAttempt(attemptIndex: number) {
    setSessionState((current) => {
      const round = current.rounds[current.currentRoundIndex];
      const video = getVideoById(round.videoId);

      if (round.status !== "playing" || attemptIndex !== round.currentAttemptIndex) {
        return current;
      }

      const attempt = round.attempts[attemptIndex];
      if (!attempt || attempt.submitted) {
        return current;
      }

      const feedback = getLoadFeedback(attempt.valueKg, video.targetKg);
      const nextStatus: LoadGuessStatus =
        feedback === "correct"
          ? "won"
          : attemptIndex >= LOAD_GUESS_MAX_ATTEMPTS - 1
            ? "lost"
            : "playing";

      const nextRounds = current.rounds.map((entry, roundIndex) => {
        if (roundIndex !== current.currentRoundIndex) {
          return entry;
        }

        return {
          ...entry,
          attempts: entry.attempts.map((roundAttempt, index) => {
            if (index === attemptIndex) {
              return {
                ...roundAttempt,
                submitted: true,
                feedback,
              };
            }

            if (
              nextStatus === "playing" &&
              index === attemptIndex + 1 &&
              !roundAttempt.submitted
            ) {
              return {
                ...roundAttempt,
                valueKg: attempt.valueKg,
              };
            }

            return roundAttempt;
          }),
          currentAttemptIndex:
            nextStatus === "playing" ? entry.currentAttemptIndex + 1 : entry.currentAttemptIndex,
          status: nextStatus,
        };
      });

      return {
        ...current,
        rounds: nextRounds,
      };
    });
  }

  function handleAdvanceRound() {
    setSessionState((current) => {
      if (current.currentRoundIndex >= current.rounds.length - 1) {
        return current;
      }

      return {
        ...current,
        currentRoundIndex: current.currentRoundIndex + 1,
      };
    });
  }

  function handleResetDaily() {
    setSession(createDailySessionState());
  }

  const statusLabel = isRoundComplete
    ? `Round ${session.currentRoundIndex + 1} complete`
    : `Round ${session.currentRoundIndex + 1} of ${LOAD_GUESS_DAILY_ROUNDS} - Attempt ${
        currentRound.currentAttemptIndex + 1
      } of ${LOAD_GUESS_MAX_ATTEMPTS}`;

  return (
    <main className="game-page loadguess-page">
      <section className="loadguess-shell" aria-label="Guess the Load mode">
        <header className="loadguess-hero">
          <Link
            href="/"
            className="loadguess-hero__brand"
            aria-label="Go to Liftdle homepage"
          >
            <span className="loadguess-hero__brand-main">Lift</span>
            <span className="loadguess-hero__brand-accent">dle</span>
          </Link>
          <div className="mode-switch" aria-label="Game mode switch">
            <Link href="/" className="mode-switch__button mode-switch__button--link">
              Daily
            </Link>
            <Link
              href="/marathon"
              className="mode-switch__button mode-switch__button--link"
            >
              Marathon
            </Link>
            <span
              className="mode-switch__button mode-switch__button--active"
              aria-current="page"
            >
              LoadGuess
            </span>
          </div>
          <div className="loadguess-hero__title-row">
            <h1 className="loadguess-hero__title">Guess the Load</h1>
          </div>
          <p className="loadguess-hero__subtitle">
            Daily run. Five rounds. Five attempts per round.
          </p>
        </header>

        <LoadGuessVideo video={currentVideo} />

        <div className="loadguess-status-row">
          <div className="loadguess-status" aria-live="polite">
            {statusLabel}
          </div>
          <UnitToggle unit={unit} onUnitChange={setUnit} />
        </div>

        <LoadGuessAttempts
          attempts={currentRound.attempts}
          currentAttemptIndex={currentRound.currentAttemptIndex}
          gameStatus={currentRound.status}
          stepKg={currentVideo.stepKg}
          unit={unit}
          onAdjustAttempt={handleAdjustAttempt}
          onSubmitAttempt={handleSubmitAttempt}
        />

        {isRoundComplete ? (
          <section
            className={`loadguess-result loadguess-result--${currentRound.status}`}
            aria-live="polite"
          >
            <h2>
              {currentRound.status === "won" ? "Round cleared" : "Round missed"}
            </h2>
            <p>
              {currentVideo.exercise} - Correct load{" "}
              {formatLoadValue(currentVideo.targetKg, unit)}
            </p>
            <p>
              Attempts used {submittedCount} / {LOAD_GUESS_MAX_ATTEMPTS}
            </p>
            {!isLastRound ? (
              <button
                type="button"
                className="loadguess-result__action"
                onClick={handleAdvanceRound}
              >
                Next round
              </button>
            ) : null}
          </section>
        ) : null}

        {isSessionComplete ? (
          <section className="loadguess-recap" aria-label="Daily recap">
            <div className="loadguess-recap__head">
              <h2 className="loadguess-recap__title">Daily recap</h2>
              <p className="loadguess-recap__date">{session.gameDate} - Europe/Rome</p>
            </div>

            <ol className="loadguess-recap__list">
              {session.rounds.map((round, index) => {
                const video = getVideoById(round.videoId);
                const attemptsUsed = getSubmittedCount(round);

                return (
                  <li key={`${round.videoId}-${index}`} className="loadguess-recap__item">
                    <div className="loadguess-recap__item-head">
                      <strong>Round {index + 1}</strong>
                      <span
                        className={`loadguess-recap__badge loadguess-recap__badge--${round.status}`}
                      >
                        {round.status === "won" ? "Solved" : "Missed"}
                      </span>
                    </div>
                    <p className="loadguess-recap__line">
                      {video.exercise} - {formatLoadValue(video.targetKg, unit)}
                    </p>
                    <p className="loadguess-recap__line">
                      Attempts used {attemptsUsed} / {LOAD_GUESS_MAX_ATTEMPTS}
                    </p>
                  </li>
                );
              })}
            </ol>

            <button
              type="button"
              className="loadguess-result__action"
              onClick={handleResetDaily}
            >
              Replay local daily
            </button>
          </section>
        ) : null}
      </section>
    </main>
  );
}
