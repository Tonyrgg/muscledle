"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoadGuessAttempts } from "@/components/loadguess/loadguess-attempts";
import { LoadGuessVideo } from "@/components/loadguess/loadguess-video";
import { UnitToggle } from "@/components/loadguess/unit-toggle";
import { LOAD_GUESS_VIDEOS } from "@/data/loadguess/videos";
import { getOrCreateFeedbackVisitorId } from "@/lib/feedback/client";
import { createWeightGuessFeedbackRequest } from "@/lib/loadguess/feedback-api";
import { formatLoadSummary, getLoadFeedback } from "@/lib/loadguess/feedback";
import { preloadWeightGuessVideos } from "@/lib/loadguess/video-preload";
import {
  createDailySessionState,
  LOAD_GUESS_DAILY_ROUNDS,
  LOAD_GUESS_MAX_ATTEMPTS,
  LOAD_GUESS_STEP_KG,
} from "@/lib/loadguess/daily";
import type {
  LoadGuessRoundState,
  LoadGuessSessionState,
  LoadGuessStatus,
  Unit,
} from "@/lib/loadguess/types";
import {
  WEIGHT_GUESS_FEEDBACK_MODE_LABELS,
  WEIGHT_GUESS_FEEDBACK_MODE_OPTIONS,
  type WeightGuessFeedbackModeOption,
  type WeightGuessFeedbackSurface,
} from "@/types/weightguess-feedback";

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

type IntroFeedbackPhase = "idle" | "submitted" | "submitting" | "complete";
const LOAD_GUESS_FEEDBACK_SESSION_KEY = "liftdle:weightguess:feedback:v1";
const FEEDBACK_STAR_PATH =
  "M12 1.8 15.09 8.07 22 9.08 17 13.95 18.18 20.82 12 17.57 5.82 20.82 7 13.95 2 9.08 8.91 8.07 12 1.8Z";

function getStarValueFromPointer(
  starIndex: number,
  target: HTMLButtonElement,
  clientX: number,
) {
  const bounds = target.getBoundingClientRect();
  const isLeftHalf = clientX - bounds.left <= bounds.width / 2;

  return starIndex + (isLeftHalf ? 0.5 : 1);
}

function getStarFillPercent(starIndex: number, rating: number) {
  const diff = rating - starIndex;

  if (diff >= 1) return 100;
  if (diff >= 0.5) return 50;
  return 0;
}

export function LoadGuessPage() {
  const pathname = usePathname();
  const [unit, setUnit] = useState<Unit>("kg");
  const [hasStarted, setHasStarted] = useState(false);
  const [feedbackStorageReady, setFeedbackStorageReady] = useState(false);
  const [, setFeedbackCompletedThisSession] = useState(false);
  const [showFeedbackCard, setShowFeedbackCard] = useState(false);
  const [introFeedbackRating, setIntroFeedbackRating] = useState(0);
  const [introFeedbackHover, setIntroFeedbackHover] = useState<number | null>(null);
  const [introFeedbackPhase, setIntroFeedbackPhase] =
    useState<IntroFeedbackPhase>("idle");
  const [introFeedbackModes, setIntroFeedbackModes] = useState<
    WeightGuessFeedbackModeOption[]
  >([]);
  const [introFeedbackError, setIntroFeedbackError] = useState<string | null>(null);
  const [session, setSession] = useState<LoadGuessSessionState>(() => createDailySessionState());
  const introFeedbackDismissTimerRef = useRef<number | null>(null);

  const currentRound = session.rounds[session.currentRoundIndex];
  const currentVideo = getVideoById(currentRound.videoId);
  const submittedCount = getSubmittedCount(currentRound);
  const isRoundComplete = currentRound.status !== "playing";
  const isLastRound = session.currentRoundIndex === session.rounds.length - 1;
  const shouldShowIntro = !hasStarted;
  const displayedIntroFeedbackRating =
    introFeedbackHover ?? introFeedbackRating;
  const isIntroFeedbackComplete = introFeedbackPhase === "complete";
  const shouldRenderFeedbackCard = feedbackStorageReady && showFeedbackCard;

  useEffect(() => {
    preloadWeightGuessVideos();
  }, []);

  useEffect(() => {
    try {
      const storedValue = window.sessionStorage.getItem(LOAD_GUESS_FEEDBACK_SESSION_KEY);
      const isComplete = storedValue === "complete";

      setFeedbackCompletedThisSession(isComplete);
      setShowFeedbackCard(!isComplete);
    } catch {
      setFeedbackCompletedThisSession(false);
      setShowFeedbackCard(true);
    } finally {
      setFeedbackStorageReady(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (introFeedbackDismissTimerRef.current !== null) {
        window.clearTimeout(introFeedbackDismissTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isIntroFeedbackComplete || !showFeedbackCard) {
      return;
    }

    introFeedbackDismissTimerRef.current = window.setTimeout(() => {
      setShowFeedbackCard(false);
      introFeedbackDismissTimerRef.current = null;
    }, 2600);

    return () => {
      if (introFeedbackDismissTimerRef.current !== null) {
        window.clearTimeout(introFeedbackDismissTimerRef.current);
        introFeedbackDismissTimerRef.current = null;
      }
    };
  }, [isIntroFeedbackComplete, showFeedbackCard]);

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
    setHasStarted(false);
    setSession(createDailySessionState());
  }

  function handleIntroFeedbackPreview(
    starIndex: number,
    target: HTMLButtonElement,
    clientX: number,
  ) {
    setIntroFeedbackHover(getStarValueFromPointer(starIndex, target, clientX));
  }

  function handleIntroFeedbackSelect(
    starIndex: number,
    target: HTMLButtonElement,
    clientX: number,
  ) {
    const nextRating = getStarValueFromPointer(starIndex, target, clientX);

    setIntroFeedbackRating(nextRating);
    setIntroFeedbackHover(nextRating);

    if (introFeedbackPhase === "idle") {
      setIntroFeedbackPhase("submitted");
    }

    if (introFeedbackPhase !== "submitting") {
      setIntroFeedbackModes([]);
    }

    setIntroFeedbackError(null);
  }

  function handleIntroFeedbackModeToggle(option: WeightGuessFeedbackModeOption) {
    setIntroFeedbackError(null);
    setIntroFeedbackModes((current) =>
      current.includes(option)
        ? current.filter((entry) => entry !== option)
        : [...current, option],
    );
  }

  function buildFeedbackDiagnostics(surface: WeightGuessFeedbackSurface) {
    return {
      pathname: pathname || "/weightGuess",
      surface,
      submittedAt: new Date().toISOString(),
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      currentRoundIndex: session.currentRoundIndex,
      currentRoundStatus: currentRound.status,
    };
  }

  async function handleIntroFeedbackSubmit(surface: WeightGuessFeedbackSurface) {
    if (
      introFeedbackRating <= 0 ||
      introFeedbackPhase === "submitting" ||
      introFeedbackModes.length === 0
    ) {
      return;
    }

    setIntroFeedbackError(null);
    setIntroFeedbackPhase("submitting");

    try {
      await createWeightGuessFeedbackRequest({
        visitorId: getOrCreateFeedbackVisitorId(),
        rating: introFeedbackRating,
        selectedModes: introFeedbackModes,
        surface,
        roundNumber: surface === "summary" ? session.currentRoundIndex + 1 : null,
        roundOutcome:
          surface === "summary"
            ? currentRound.status === "won"
              ? "won"
              : "lost"
            : null,
        attemptsUsed: surface === "summary" ? submittedCount : null,
        pagePath: pathname || "/weightGuess",
        diagnostics: buildFeedbackDiagnostics(surface),
      });

      setIntroFeedbackPhase("complete");
      setFeedbackCompletedThisSession(true);
      try {
        window.sessionStorage.setItem(LOAD_GUESS_FEEDBACK_SESSION_KEY, "complete");
      } catch {}
    } catch (error) {
      setIntroFeedbackPhase("submitted");
      setIntroFeedbackError(
        error instanceof Error
          ? error.message
          : "Failed to send feedback. Please try again.",
      );
    }
  }

  const statusLabel = isRoundComplete
    ? `Round ${session.currentRoundIndex + 1} complete`
    : `Round ${session.currentRoundIndex + 1} of ${LOAD_GUESS_DAILY_ROUNDS}`;
  const shouldShowRoundSummary = currentRound.status !== "playing";
  const roundSummaryVariant =
    currentRound.status === "won" ? "won" : "lost";
  const summaryButtonLabel = isLastRound ? "Retry from start" : "Next round";
  const summaryEyebrow =
    currentRound.status === "won"
      ? `Round ${session.currentRoundIndex + 1} won`
      : `Round ${session.currentRoundIndex + 1} missed`;
  const bodyVerticalOffset = shouldShowRoundSummary || shouldShowIntro ? 20 : 50;

  function renderFeedbackCard(
    variant: "intro" | "summary",
    extraClassName?: string,
  ) {
    const className = `loadguess-feedback-card ${
      introFeedbackPhase === "submitting"
        ? "loadguess-feedback-card--submitting"
        : ""
    } ${extraClassName ?? ""}`.trim();
    const eyebrowCopy =
      variant === "summary" ? "Rate the mode" : "...or leave a feedback";
    const unratedCopy =
      variant === "summary" ? "Rate this mode" : "Choose a rating";

    return (
      <section className={className} aria-label="WeightGuess feedback">
        {isIntroFeedbackComplete ? (
          <div className="loadguess-feedback-card__complete" aria-live="polite">
            <p className="loadguess-feedback-card__eyebrow">Feedback received</p>
            <h3 className="loadguess-intro__title loadguess-intro__title--sub loadguess-feedback-card__complete-title">
              Thank you for the feedback.
            </h3>
            <p className="loadguess-feedback-card__complete-copy">
              Your input helps shape the next version of WeightGuess.
            </p>
          </div>
        ) : (
          <>
            <div className="loadguess-feedback-card__head">
              <p className="loadguess-feedback-card__eyebrow">{eyebrowCopy}</p>
            </div>

            <div
              className="loadguess-feedback-card__stars"
              onMouseLeave={() => setIntroFeedbackHover(null)}
            >
              {Array.from({ length: 5 }, (_, starIndex) => {
                const fillPercent = getStarFillPercent(
                  starIndex,
                  displayedIntroFeedbackRating,
                );

                return (
                  <button
                    key={`intro-feedback-star-${starIndex}`}
                    type="button"
                    className="loadguess-feedback-card__star"
                    aria-label={`Rate ${
                      fillPercent === 50 ? starIndex + 0.5 : starIndex + 1
                    } stars`}
                    aria-pressed={displayedIntroFeedbackRating >= starIndex + 0.5}
                    onMouseMove={(event) =>
                      handleIntroFeedbackPreview(
                        starIndex,
                        event.currentTarget,
                        event.clientX,
                      )
                    }
                    onFocus={() => setIntroFeedbackHover(starIndex + 1)}
                    onBlur={() => setIntroFeedbackHover(null)}
                    onClick={(event) =>
                      handleIntroFeedbackSelect(
                        starIndex,
                        event.currentTarget,
                        event.clientX,
                      )
                    }
                  >
                    <span className="loadguess-feedback-card__star-base" aria-hidden="true">
                      <svg
                        viewBox="0 0 24 24"
                        className="loadguess-feedback-card__star-icon"
                      >
                        <path d={FEEDBACK_STAR_PATH} />
                      </svg>
                    </span>
                    <span
                      className="loadguess-feedback-card__star-fill"
                      aria-hidden="true"
                      style={{ width: `${fillPercent}%` }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="loadguess-feedback-card__star-icon"
                      >
                        <path d={FEEDBACK_STAR_PATH} />
                      </svg>
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="loadguess-feedback-card__rating" aria-live="polite">
              {introFeedbackRating > 0
                ? `${introFeedbackRating.toFixed(1)} / 5`
                : unratedCopy}
            </p>

            {introFeedbackPhase === "submitted" ? (
              <div className="loadguess-feedback-card__followup">
                <p className="loadguess-feedback-card__followup-title">
                  in which mode?
                </p>
                <div className="loadguess-feedback-card__modes">
                  {WEIGHT_GUESS_FEEDBACK_MODE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`loadguess-feedback-card__mode ${
                        introFeedbackModes.includes(option)
                          ? "loadguess-feedback-card__mode--active"
                          : ""
                      }`}
                      onClick={() => handleIntroFeedbackModeToggle(option)}
                    >
                      {WEIGHT_GUESS_FEEDBACK_MODE_LABELS[option]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              className="loadguess-result__action loadguess-feedback-card__action"
              onClick={() => void handleIntroFeedbackSubmit(variant)}
              disabled={
                introFeedbackRating <= 0 ||
                introFeedbackPhase === "submitting" ||
                introFeedbackModes.length === 0
              }
            >
              {introFeedbackPhase === "submitting" ? "Sending..." : "Submit"}
            </button>

            {introFeedbackPhase === "submitting" ? (
              <p className="loadguess-feedback-card__message" aria-live="polite">
                Saving your feedback...
              </p>
            ) : null}
            {introFeedbackError ? (
              <p className="loadguess-feedback-card__message" aria-live="polite">
                {introFeedbackError}
              </p>
            ) : null}
          </>
        )}
      </section>
    );
  }

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
        className={`loadguess-body ${shouldShowRoundSummary ? "loadguess-body--summary" : ""} ${
          shouldShowIntro ? "loadguess-body--intro" : ""
        }`}
        style={{
          paddingTop: `${bodyVerticalOffset}px`,
          paddingBottom: `${bodyVerticalOffset}px`,
        }}
      >
        <section
          className={`loadguess-shell ${
            shouldShowRoundSummary && shouldRenderFeedbackCard
              ? "loadguess-shell--summary"
              : ""
          }`}
          aria-label="WeightGuess mode"
        >
          {shouldShowIntro ? (
            <div className="loadguess-intro-stack">
              <section className="loadguess-intro" aria-label="WeightGuess introduction">
                <div className="loadguess-intro__head">
                  <p className="loadguess-intro__eyebrow">Test mode</p>
                  <h2 className="loadguess-intro__title">
                    Guess the exact load before the blur wins.
                  </h2>
                  <p className="loadguess-intro__copy">
                    WeightGuess is live only as a{" "}
                    <span className="loadguess-intro__copy-emphasis">test</span>. It is
                    here to help us understand whether this mode is actually worth
                    keeping, and to collect early{" "}
                    <span className="loadguess-intro__copy-emphasis">feedback</span> on
                    how it feels.
                  </p>
                  <p className="loadguess-intro__copy loadguess-intro__copy--secondary">
                    If the response is{" "}
                    <span className="loadguess-intro__copy-emphasis">strong</span>, we
                    will source more clips and expand it. If the{" "}
                    <span className="loadguess-intro__copy-emphasis">feedback</span> is{" "}
                    <span className="loadguess-intro__copy-emphasis">negative</span>, this
                    mode will be deprecated.
                  </p>
                </div>

                <div className="loadguess-intro__stats" aria-hidden="true">
                  <p className="loadguess-intro__stat">
                    <span>4</span> rounds
                  </p>
                  <p className="loadguess-intro__stat">
                    <span>5</span> attempts
                  </p>
                  <p className="loadguess-intro__stat">
                    <span>kg / lbs</span> anytime
                  </p>
                </div>
                <h3 className="loadguess-intro__title loadguess-intro__title--sub">
                  Dial the weight up or down, lock in your guess.
                </h3>
                <button
                  type="button"
                  className="loadguess-result__action loadguess-intro__action"
                  onClick={() => setHasStarted(true)}
                >
                  Start
                </button>
              </section>

              {shouldRenderFeedbackCard ? renderFeedbackCard("intro") : null}
            </div>
          ) : shouldShowRoundSummary ? (
            <div
              className={`loadguess-summary-layout ${
                shouldRenderFeedbackCard
                  ? "loadguess-summary-layout--with-feedback"
                  : ""
              }`}
            >
              <section
                className={`loadguess-round-card loadguess-round-card--${roundSummaryVariant}`}
                aria-live="polite"
              >
                <div className="loadguess-round-card__head">
                  <p className="loadguess-round-card__eyebrow">{summaryEyebrow}</p>
                  <h2 className="loadguess-round-card__title">
                    {formatLoadSummary(currentVideo.targetKg)}
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

              {shouldRenderFeedbackCard
                ? renderFeedbackCard("summary", "loadguess-feedback-card--summary")
                : null}
            </div>
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
                  stepKg={LOAD_GUESS_STEP_KG}
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
