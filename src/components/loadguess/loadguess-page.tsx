"use client";

import Link from "next/link";
import { useState } from "react";
import { LoadGuessAttempts } from "@/components/loadguess/loadguess-attempts";
import { LoadGuessVideo } from "@/components/loadguess/loadguess-video";
import { UnitToggle } from "@/components/loadguess/unit-toggle";
import { LOAD_GUESS_VIDEOS } from "@/data/loadguess/videos";
import { getLoadFeedback } from "@/lib/loadguess/feedback";
import {
  createDailySessionState,
  LOAD_GUESS_DAILY_ROUNDS,
  LOAD_GUESS_MAX_ATTEMPTS,
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
  const [session, setSession] = useState<LoadGuessSessionState>(() => createDailySessionState());

  const currentRound = session.rounds[session.currentRoundIndex];
  const currentVideo = getVideoById(currentRound.videoId);
  const submittedCount = getSubmittedCount(currentRound);
  const isRoundComplete = currentRound.status !== "playing";
  const isLastRound = session.currentRoundIndex === session.rounds.length - 1;

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
    : `Round ${session.currentRoundIndex + 1} of ${LOAD_GUESS_DAILY_ROUNDS}`;
  const shouldShowRoundSummary = currentRound.status !== "playing";
  const roundSummaryVariant =
    currentRound.status === "won" ? "won" : "lost";
  const summaryButtonLabel = isLastRound ? "Retry from 0" : "Next round";
  const summaryEyebrow =
    currentRound.status === "won"
      ? `Round ${session.currentRoundIndex + 1} cleared`
      : `Round ${session.currentRoundIndex + 1} missed`;
  const bodyVerticalOffset = shouldShowRoundSummary ? 20 : 50;

  return (
    <main className="game-page loadguess-page">
      <header className="loadguess-hero">
        <div className="loadguess-hero__stack">
          <div className="loadguess-hero__byline">
            <span className="loadguess-hero__by">by</span>
            <Link
              href="/"
              className="loadguess-hero__home-link"
              aria-label="Go to Liftdle homepage"
            >
              <span className="loadguess-hero__word">Lift</span>
              <span className="loadguess-hero__word loadguess-hero__word--accent">dle</span>
            </Link>
          </div>
          <div className="loadguess-hero__title-row">
            <h1 className="loadguess-hero__title">
              <span className="loadguess-hero__word">Weight</span>
              <span className="loadguess-hero__word loadguess-hero__word--accent">
                Guess
              </span>
            </h1>
          </div>
        </div>
      </header>

      <div
        className={`loadguess-body ${shouldShowRoundSummary ? "loadguess-body--summary" : ""}`}
        style={{
          paddingTop: `${bodyVerticalOffset}px`,
          paddingBottom: `${bodyVerticalOffset}px`,
        }}
      >
        <section
          className="loadguess-shell"
          aria-label="WeightGuess mode"
        >
          {shouldShowRoundSummary ? (
            <section
              className={`loadguess-round-card loadguess-round-card--${roundSummaryVariant}`}
              aria-live="polite"
            >
              <div className="loadguess-round-card__head">
                <p className="loadguess-round-card__eyebrow">{summaryEyebrow}</p>
                <h2 className="loadguess-round-card__title">
                  {currentVideo.targetKg}kg
                </h2>
              </div>
              <LoadGuessVideo
                video={currentVideo}
                sourceUrl={currentVideo.originalVideoUrl}
              />
              <div className="loadguess-round-card__meta">
                <p className="loadguess-round-card__line">
                  Attempts used {submittedCount} / {LOAD_GUESS_MAX_ATTEMPTS}
                </p>
              </div>
              <button
                type="button"
                className="loadguess-result__action loadguess-round-card__action"
                onClick={isLastRound ? handleResetDaily : handleAdvanceRound}
              >
                {summaryButtonLabel}
              </button>
            </section>
          ) : (
            <section className="loadguess-playfield" aria-label="WeightGuess round">
              <div className="loadguess-status-block">
                <div className="loadguess-status-row">
                  <div className="loadguess-status" aria-live="polite">
                    {statusLabel}
                  </div>
                </div>
              </div>

              <div className="loadguess-media-block">
                <LoadGuessVideo video={currentVideo} />
              </div>

              <div className="loadguess-status-toggle">
                <UnitToggle unit={unit} onUnitChange={setUnit} />
              </div>

              <div className="loadguess-input-block">
                <LoadGuessAttempts
                  attempts={currentRound.attempts}
                  currentAttemptIndex={currentRound.currentAttemptIndex}
                  gameStatus={currentRound.status}
                  stepKg={currentVideo.stepKg}
                  unit={unit}
                  onAdjustAttempt={handleAdjustAttempt}
                  onSubmitAttempt={handleSubmitAttempt}
                />
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
