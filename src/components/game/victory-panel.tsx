'use client';

import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ExerciseMediaView } from "@/components/media/exercise-media-view";
import { getExerciseIconCandidates, getMuscleGroupIconKey, getMuscleGroupIconPath } from "@/lib/exercises/icons";
import { buildPostGameInsights, buildPreferredCoachNotesForSlug } from "@/lib/exercises/post-game-insights";
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

function toKeycapDigits(value: number): string {
  const digits = String(Math.max(0, Math.floor(value))).split("");
  const map: Record<string, string> = {
    "0": "0\uFE0F\u20E3",
    "1": "1\uFE0F\u20E3",
    "2": "2\uFE0F\u20E3",
    "3": "3\uFE0F\u20E3",
    "4": "4\uFE0F\u20E3",
    "5": "5\uFE0F\u20E3",
    "6": "6\uFE0F\u20E3",
    "7": "7\uFE0F\u20E3",
    "8": "8\uFE0F\u20E3",
    "9": "9\uFE0F\u20E3",
  };
  return digits.map((digit) => map[digit] ?? "").join("");
}

function parseMuscleTokens(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split("/")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function formatCoachSectionLabel(key: string): string {
  const explicit: Record<string, string> = {
    coach_take: "Coach Take",
    make_it_easier: "Make It Easier",
    level_it_up: "Level It Up",
    build_size: "Build Size",
    build_strength: "Build Strength",
    build_skill: "Build Skill",
    build_control: "Build Control",
    build_resilience: "Build Resilience",
    chase_pump: "Chase Pump",
    build_power: "Build Power",
  };
  if (explicit[key]) return explicit[key];
  return key
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
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
  const splitIconPaths = useMemo(() => {
    const tokens = parseMuscleTokens(winningAttempt?.values.muscle ?? null);
    if (tokens.length < 2) return null;

    const first = getMuscleGroupIconPath(getMuscleGroupIconKey(tokens[0]));
    const second = getMuscleGroupIconPath(getMuscleGroupIconKey(tokens[1]));
    if (!first || !second || first === second) return null;

    return [first, second] as const;
  }, [winningAttempt?.values.muscle]);

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
    const footer = typeof window === "undefined" ? "https://liftdle.vercel.app" : window.location.origin;
    return [header, body, footer].filter(Boolean).join("\n");
  }, [emojiRows, gameDate, guessCount]);

  const shareTextForX = useMemo(() => {
    const header = `I solved today's #Liftdle (${gameDate}) in ${guessCount} guess${guessCount === 1 ? "" : "es"} \u{1F4AA}`;
    const maxRows = 10;
    const visibleRows = emojiRows.slice(0, maxRows);
    const remainingRows = Math.max(0, emojiRows.length - maxRows);
    const recap = remainingRows > 0 ? `\u2795${toKeycapDigits(remainingRows)} more` : null;
    const body = [...visibleRows, recap].filter(Boolean).join("\n");
    const footer = typeof window === "undefined" ? "https://liftdle.vercel.app" : window.location.origin;
    return [header, body, footer].filter(Boolean).join("\n");
  }, [emojiRows, gameDate, guessCount]);

  const insights = useMemo(
    () => buildPostGameInsights(targetExercise),
    [targetExercise],
  );
  const insightsPreferred = useMemo(
    () => buildPreferredCoachNotesForSlug(targetExercise?.slug ?? "", insights),
    [insights, targetExercise?.slug],
  );

  const copyText = async () => {
    const value = shareText;
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  };

  const shareOnX = () => {
    const intentUrl = `https://x.com/intent/tweet?${new URLSearchParams({ text: shareTextForX }).toString()}`;
    window.open(intentUrl, "_blank", "noopener,noreferrer");
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
            {splitIconPaths ? (
              <div className="victory-panel__split" aria-label={`Icone muscolari ${winningAttempt?.guessName ?? "exercise"}`}>
                <img
                  src={splitIconPaths[0]}
                  alt=""
                  className="victory-panel__split-part victory-panel__split-part--primary"
                  width={460}
                  height={460}
                />
                <img
                  src={splitIconPaths[1]}
                  alt=""
                  className="victory-panel__split-part victory-panel__split-part--secondary"
                  width={460}
                  height={460}
                />
                <span className="victory-panel__split-divider" />
              </div>
            ) : media.length > 0 ? (
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
                <p className="victory-panel__learning-head">{formatCoachSectionLabel("coach_take")}</p>
                <p className="victory-panel__learning-line">{insightsPreferred.coach_take}</p>
                <p className="victory-panel__learning-head">{formatCoachSectionLabel("make_it_easier")}</p>
                <p className="victory-panel__learning-line">{insightsPreferred.make_it_easier}</p>
                <p className="victory-panel__learning-head">{formatCoachSectionLabel("level_it_up")}</p>
                <p className="victory-panel__learning-line">{insightsPreferred.level_it_up}</p>
                <p className="victory-panel__learning-head">{formatCoachSectionLabel("build_size")}</p>
                <p className="victory-panel__learning-line">{insightsPreferred.build_size}</p>
                <p className="victory-panel__learning-head">{formatCoachSectionLabel(insightsPreferred.secondary_key)}</p>
                <p className="victory-panel__learning-line">{insightsPreferred.secondary_value}</p>
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
                {copyState === "copied" ? "Result copied" : copyState === "failed" ? "Copy failed" : "Copy Result"}
              </button>
              <button
                type="button"
                className="exercise-media-modal__close victory-panel__action"
                onClick={shareOnX}
              >
                Share on X
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

