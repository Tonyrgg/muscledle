'use client';

import { useEffect, useMemo, useState } from "react";
import type { FeedbackColor } from "@/types/exercise";
import type { PublicGameAttempt } from "@/types/game";

type VictoryPanelProps = {
  gameDate: string;
  guessCount: number;
  winningAttempt: PublicGameAttempt | null;
  attempts: PublicGameAttempt[];
  acceptedFamilyMatch: boolean;
};

type ExerciseMediaResponse = {
  ok: boolean;
  media?: {
    mediaUrl: string | null;
  } | null;
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
  acceptedFamilyMatch,
}: VictoryPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [countdown, setCountdown] = useState("00:00:00");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(winningAttempt?.guessSlug ? null : "Demo unavailable");
  const [copied, setCopied] = useState<string | null>(null);
  const winningSlug = winningAttempt?.guessSlug ?? "";

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
    if (!winningSlug) {
      return;
    }

    let active = true;

    async function loadMedia() {
      setMediaError(null);
      setMediaUrl(null);

      try {
        const response = await fetch(`/api/exercises/${encodeURIComponent(winningSlug)}/media`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as ExerciseMediaResponse | null;

        if (!active) return;

        if (!response.ok || !payload?.ok) {
          setMediaError("Failed to load media");
          return;
        }

        const nextUrl = payload.media?.mediaUrl ?? null;
        if (!nextUrl) {
          setMediaError("Demo unavailable");
          return;
        }

        setMediaUrl(nextUrl);
      } catch {
        if (!active) return;
        setMediaError("Failed to load media");
      }
    }

    void loadMedia();

    return () => {
      active = false;
    };
  }, [winningSlug]);

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
    const header = `I solved today's #Muscledle (${gameDate}) in ${guessCount} guess${guessCount === 1 ? "" : "es"} \u{1F4AA}`;
    const body = emojiRows.join("\n");
    const footer = "https://muscledle.local";
    return [header, body, footer].filter(Boolean).join("\n");
  }, [emojiRows, gameDate, guessCount]);

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
            {mediaUrl ? (
              <img
                src={mediaUrl}
                alt={`Demo ${winningAttempt?.guessName ?? "exercise"}`}
                className="victory-panel__media"
                onError={() => {
                  setMediaUrl(null);
                  setMediaError("Demo unavailable");
                }}
              />
            ) : (
              <p className="victory-panel__media-fallback">{mediaError ?? "Loading demo..."}</p>
            )}
          </div>

          <div className="victory-panel__stats">
            <p className="victory-panel__stat-line">
              Attempts: <span>{guessCount}</span>
            </p>
            {acceptedFamilyMatch ? (
              <p className="victory-panel__family-match">
                Family match accepted. Variant solved this daily.
              </p>
            ) : null}
            <p className="victory-panel__stat-label">Next exercise in</p>
            <p className="victory-panel__countdown">{countdown}</p>
            <p className="victory-panel__timezone">Europe/Rome (midnight reset)</p>
          </div>

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
