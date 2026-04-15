'use client';

import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ExerciseMediaView } from "@/components/media/exercise-media-view";
import { getExerciseIconCandidates } from "@/lib/exercises/icons";
import { buildPostGameInsights } from "@/lib/exercises/post-game-insights";
import type { LiveExerciseSuggestion } from "@/lib/game/client";
import { useExerciseMediaAssets } from "@/lib/media/use-exercise-media-assets";
import type { FeedbackColor } from "@/types/exercise";
import type { PublicGameAttempt } from "@/types/game";
import type { ExerciseMedia } from "@/types/media";

type VictoryPanelProps = {
  gameDate: string;
  guessCount: number;
  winningAttempt: PublicGameAttempt | null;
  attempts: PublicGameAttempt[];
  targetExercise: LiveExerciseSuggestion | null;
};

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

function feedbackToEmoji(color: FeedbackColor): string {
  if (color === "green") return "\u{1F7E9}";
  if (color === "yellow") return "\u{1F7E8}";
  return "\u{1F7E5}";
}

export function VictoryPanel({
  gameDate,
  guessCount,
  winningAttempt,
  attempts,
  targetExercise,
}: VictoryPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [learningOpen, setLearningOpen] = useState(false);
  const [countdown, setCountdown] = useState("00:00:00");
  const [copied, setCopied] = useState<string | null>(null);
  const winningSlug = winningAttempt?.guessSlug ?? "";
  const fallbackMedia = useMemo<ExerciseMedia[]>(() => {
    if (!winningAttempt?.guessSlug) {
      return [];
    }

    const iconPath =
      getExerciseIconCandidates({
        slug: winningAttempt.guessSlug,
        name: winningAttempt.guessName,
        muscle_group: winningAttempt.guessMuscleGroup,
      })[0] ?? "/muscle-icons/full-body.svg";

    return [
      {
        id: `fallback-victory-icon-${winningAttempt.guessSlug}`,
        exerciseId: winningAttempt.guessSlug,
        mediaKind: "icon",
        source: "local",
        sourceId: winningAttempt.guessSlug,
        url: iconPath,
        thumbnailUrl: null,
        posterUrl: null,
        mimeType: "image/svg+xml",
        width: null,
        height: null,
        durationSeconds: null,
        isPrimary: true,
        sortOrder: 0,
        isActive: true,
        attributionText: null,
        attributionUrl: null,
        license: null,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      },
    ];
  }, [winningAttempt]);
  const { media, loading: mediaLoading, error: mediaError } = useExerciseMediaAssets(winningSlug, fallbackMedia);

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

  const orderedAttempts = useMemo(() => [...attempts], [attempts]);

  const emojiRows = useMemo(
    () =>
      orderedAttempts.map((attempt) =>
        [
          feedbackToEmoji(attempt.feedback.muscle),
          feedbackToEmoji(attempt.feedback.equipment),
          feedbackToEmoji(attempt.feedback.movement),
          feedbackToEmoji(attempt.feedback.pattern),
          feedbackToEmoji(attempt.feedback.reps),
          feedbackToEmoji(attempt.feedback.goal),
          feedbackToEmoji(attempt.feedback.ego),
        ].join(""),
      ),
    [orderedAttempts],
  );

  const shareText = useMemo(() => {
    const header = `I solved today's #Liftdle (${gameDate}) in ${guessCount} guess${guessCount === 1 ? "" : "es"} \u{1F4AA}`;
    const body = emojiRows.join("\n");
    const footer = "https://Liftdle.local";
    return [header, body, footer].filter(Boolean).join("\n");
  }, [emojiRows, gameDate, guessCount]);

  const insights = useMemo(
    () => buildPostGameInsights(targetExercise),
    [targetExercise],
  );

  const copyText = async () => {
    const value = shareText;
    try {
      await navigator.clipboard.writeText(value);
      setCopied("Result copied");
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied("Copy failed");
      window.setTimeout(() => setCopied(null), 1800);
    }
  };

  return (
    <section className="victory-panel" aria-label="Victory panel">
      <div className="victory-panel__head">
        <Logo className="victory-panel__logo" />
        <p className="victory-panel__kicker">Victory</p>
        <h3 className="victory-panel__title">You guessed {winningAttempt?.guessName ?? "today's exercise"}</h3>
        <button
          type="button"
          className="exercise-media-modal__close victory-panel__toggle"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse victory details" : "Expand victory details"}
        >
          <span
            className={`victory-panel__chevron ${expanded ? "victory-panel__chevron--up" : "victory-panel__chevron--down"}`}
            aria-hidden
          />
        </button>
      </div>

      {expanded ? (
        <>
          <div className="victory-panel__media-wrap">
            {media.length > 0 ? (
              <ExerciseMediaView
                media={media}
                context="victory"
                alt={`Demo ${winningAttempt?.guessName ?? "exercise"}`}
                className="victory-panel__media"
              />
            ) : (
              <p className="victory-panel__media-fallback">
                {mediaLoading ? "Loading demo..." : (mediaError ?? "Demo unavailable")}
              </p>
            )}
          </div>

          <div className="victory-panel__stats">
            <p className="victory-panel__stat-line">
              Attempts: <span>{guessCount}</span>
            </p>
            <p className="victory-panel__stat-label">Next exercise in</p>
            <p className="victory-panel__countdown">{countdown}</p>
            <p className="victory-panel__timezone">Europe/Rome (midnight reset)</p>
          </div>

          <section
            className="victory-panel__learning"
            aria-label="Post-game learning card"
            role="button"
            tabIndex={0}
            aria-expanded={learningOpen}
            onClick={() => setLearningOpen((current) => !current)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setLearningOpen((current) => !current);
              }
            }}
          >
            <div
              className="victory-panel__learning-toggle"
            >
              <span className="victory-panel__learning-kicker">Coach Notes</span>
              <span className={`victory-panel__learning-chevron ${learningOpen ? "victory-panel__learning-chevron--open" : ""}`} aria-hidden />
            </div>

            {learningOpen ? (
              <div className="victory-panel__learning-body">
                <p className="victory-panel__learning-head">Why use it</p>
                <p className="victory-panel__learning-line">{insights.whyUse}</p>

                <p className="victory-panel__learning-head">Execution cues</p>
                <ul className="victory-panel__learning-list">
                  {insights.cues.map((cue) => (
                    <li key={cue}>{cue}</li>
                  ))}
                </ul>

                <p className="victory-panel__learning-head">Common mistakes</p>
                <ul className="victory-panel__learning-list">
                  {insights.mistakes.map((mistake) => (
                    <li key={mistake}>{mistake}</li>
                  ))}
                </ul>

                <p className="victory-panel__learning-head">Regression / progression</p>
                <p className="victory-panel__learning-line">
                  Easier: {insights.variants.easier}
                </p>
                <p className="victory-panel__learning-line">
                  Harder: {insights.variants.harder}
                </p>

                <p className="victory-panel__learning-head">Suggested dose</p>
                <p className="victory-panel__learning-line">
                  Hypertrophy: {insights.dose.hypertrophy}
                </p>
                <p className="victory-panel__learning-line">
                  Strength/skill: {insights.dose.strengthOrSkill}
                </p>
              </div>
            ) : null}
          </section>

          <div className="victory-panel__share-card">
            <div className="victory-panel__actions">
              <button
                type="button"
                className="exercise-media-modal__close victory-panel__action"
                onClick={() => void copyText()}
              >
                Copy Result
              </button>
              <button
                type="button"
                className="exercise-media-modal__close victory-panel__action victory-panel__action--placeholder"
                disabled
              >
                Share (Soon)
              </button>
            </div>

            {copied ? <p className="victory-panel__copied">{copied}</p> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

