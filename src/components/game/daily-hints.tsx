"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { FeedbackColumnKey } from "@/lib/exercises/attribute-definitions";
import type { LiveExerciseSuggestion } from "@/lib/game/client";
import type { FeedbackColor } from "@/types/exercise";
import type { PublicGameAttempt } from "@/types/game";

type DailyHintsProps = {
  attempts: PublicGameAttempt[];
  targetExercise: LiveExerciseSuggestion | null;
};

type HintId = "attribute" | "name";

type HintStatus = {
  id: HintId;
  label: string;
  threshold: number;
  unlocked: boolean;
  remainingWrong: number;
  lockCopy: string;
};

type ColumnStats = {
  key: FeedbackColumnKey;
  redCount: number;
  yellowCount: number;
  greenCount: number;
  nonGreenCount: number;
};

type AttributeHintPlan =
  | { kind: "single"; key: FeedbackColumnKey }
  | { kind: "combo"; keys: [FeedbackColumnKey, FeedbackColumnKey] }
  | null;

const COLUMN_ORDER: FeedbackColumnKey[] = [
  "muscle",
  "equipment",
  "movement",
  "pattern",
  "reps",
  "goal",
  "ego",
];
const ATTRIBUTE_HINT_COLUMN_ORDER: FeedbackColumnKey[] = COLUMN_ORDER.filter((key) => key !== "muscle");
const ATTRIBUTE_HINT_THRESHOLD = 5;
const NAME_HINT_THRESHOLD = 10;

const COLUMN_LABEL: Record<FeedbackColumnKey, string> = {
  muscle: "Muscle",
  equipment: "Equipment",
  movement: "Movement",
  pattern: "Pattern",
  reps: "Reps",
  goal: "Goal",
  ego: "Ego",
};

const HINT_ICON_MAP: Record<HintId, string> = {
  attribute: "/hints/attribute-clue.svg",
  name: "/hints/name-clue.svg",
};

function titleCaseValue(value: string): string {
  return value
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
}

function attributeValue(exercise: LiveExerciseSuggestion, key: FeedbackColumnKey): string {
  const valuesByColumn: Record<FeedbackColumnKey, string[]> = {
    muscle: exercise.muscle,
    equipment: exercise.equipment,
    movement: exercise.movement,
    pattern: exercise.pattern,
    reps: exercise.reps,
    goal: exercise.goal,
    ego: exercise.ego,
  };

  return titleCaseValue(valuesByColumn[key].join(" / "));
}

function maskWord(input: string): string {
  const chars = Array.from(input);
  if (chars.length <= 1) return input.toUpperCase();
  return `${chars[0].toUpperCase()} ${Array.from({ length: chars.length - 1 }, () => "_").join(" ")}`;
}

function buildNameHint(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return "";

  const limited = words.slice(0, 2).map(maskWord);
  return words.length > 2 ? `${limited.join(" ")} ...` : limited.join(" ");
}

function buildRemainingWrongCopy(remainingWrong: number): string {
  return `In ${remainingWrong} wrong ${remainingWrong === 1 ? "guess" : "guesses"}`;
}

function buildAttributeHintPlan(attempts: PublicGameAttempt[]): AttributeHintPlan {
  if (attempts.length === 0) return null;

  const stats: ColumnStats[] = ATTRIBUTE_HINT_COLUMN_ORDER.map((key) => {
    let redCount = 0;
    let yellowCount = 0;
    let greenCount = 0;

    for (const attempt of attempts) {
      const color = attempt.feedback[key] as FeedbackColor;
      if (color === "red") redCount += 1;
      if (color === "yellow") yellowCount += 1;
      if (color === "green") greenCount += 1;
    }

    return {
      key,
      redCount,
      yellowCount,
      greenCount,
      nonGreenCount: redCount + yellowCount,
    };
  });

  const unresolved = stats.filter(
    (entry) =>
      entry.greenCount === 0 && (entry.redCount > 0 || entry.yellowCount > 0),
  );

  if (unresolved.length > 0) {
    unresolved.sort((left, right) => {
      const leftPriority = left.redCount > 0 ? 0 : 1;
      const rightPriority = right.redCount > 0 ? 0 : 1;
      return (
        leftPriority - rightPriority ||
        right.redCount - left.redCount ||
        right.yellowCount - left.yellowCount ||
        right.nonGreenCount - left.nonGreenCount ||
        ATTRIBUTE_HINT_COLUMN_ORDER.indexOf(left.key) - ATTRIBUTE_HINT_COLUMN_ORDER.indexOf(right.key)
      );
    });
    return { kind: "single", key: unresolved[0].key };
  }

  const comboCandidates = [...stats].sort((left, right) => {
    return (
      left.greenCount - right.greenCount ||
      right.redCount - left.redCount ||
      right.yellowCount - left.yellowCount ||
      ATTRIBUTE_HINT_COLUMN_ORDER.indexOf(left.key) - ATTRIBUTE_HINT_COLUMN_ORDER.indexOf(right.key)
    );
  });

  if (comboCandidates.length < 2) return null;

  return { kind: "combo", keys: [comboCandidates[0].key, comboCandidates[1].key] };
}

function HintIcon({ id }: { id: HintId }) {
  return (
    <span className={`daily-hints__tile-icon daily-hints__tile-icon--${id}`} aria-hidden>
      <Image
        src={HINT_ICON_MAP[id]}
        alt=""
        width={20}
        height={20}
        className="daily-hints__tile-icon-image"
      />
    </span>
  );
}

export function DailyHints({ attempts, targetExercise }: DailyHintsProps) {
  const wrongAttempts = useMemo(
    () => attempts.filter((attempt) => !attempt.isCorrect),
    [attempts],
  );
  const wrongCount = wrongAttempts.length;

  const hints = useMemo<HintStatus[]>(
    () => [
      {
        id: "attribute",
        label: "Attribute clue",
        threshold: ATTRIBUTE_HINT_THRESHOLD,
        unlocked: wrongCount >= ATTRIBUTE_HINT_THRESHOLD,
        remainingWrong: Math.max(0, ATTRIBUTE_HINT_THRESHOLD - wrongCount),
        lockCopy: buildRemainingWrongCopy(Math.max(0, ATTRIBUTE_HINT_THRESHOLD - wrongCount)),
      },
      {
        id: "name",
        label: "Name clue",
        threshold: NAME_HINT_THRESHOLD,
        unlocked: wrongCount >= NAME_HINT_THRESHOLD,
        remainingWrong: Math.max(0, NAME_HINT_THRESHOLD - wrongCount),
        lockCopy: buildRemainingWrongCopy(Math.max(0, NAME_HINT_THRESHOLD - wrongCount)),
      },
    ],
    [wrongCount],
  );

  const [selectedHint, setSelectedHint] = useState<HintId | null>(null);
  const activeHint = useMemo(() => {
    if (selectedHint && hints.some((hint) => hint.id === selectedHint && hint.unlocked)) {
      return selectedHint;
    }
    return null;
  }, [hints, selectedHint]);

  const attributeUnlockAttempts = useMemo(
    () => {
      if (wrongCount < ATTRIBUTE_HINT_THRESHOLD) return wrongAttempts;

      // Attempts are newest-first; the oldest five wrong guesses are the unlock snapshot.
      return wrongAttempts.slice(-ATTRIBUTE_HINT_THRESHOLD);
    },
    [wrongAttempts, wrongCount],
  );
  const attributePlan = useMemo(
    () => buildAttributeHintPlan(attributeUnlockAttempts),
    [attributeUnlockAttempts],
  );

  const nameHint = useMemo(
    () => (targetExercise ? buildNameHint(targetExercise.name) : ""),
    [targetExercise],
  );

  const renderAttributeContent = () => {
    if (!targetExercise || !attributePlan) return null;

    if (attributePlan.kind === "single") {
      const key = attributePlan.key;
      return (
        <div className="daily-hints__attribute-grid">
          <article className="daily-hints__attribute-card">
            <p className="daily-hints__attribute-label">{COLUMN_LABEL[key]}</p>
            <div className="daily-hints__attribute-value feedback-cell feedback-cell--green">
              <span>{attributeValue(targetExercise, key)}</span>
            </div>
          </article>
        </div>
      );
    }

    return (
      <div className="daily-hints__attribute-grid daily-hints__attribute-grid--combo">
        {attributePlan.keys.map((key) => (
          <article key={key} className="daily-hints__attribute-card">
            <p className="daily-hints__attribute-label">{COLUMN_LABEL[key]}</p>
            <div className="daily-hints__attribute-value feedback-cell feedback-cell--green">
              <span>{attributeValue(targetExercise, key)}</span>
            </div>
          </article>
        ))}
      </div>
    );
  };

  return (
    <section className="daily-hints" aria-label="Daily hints">
      <div className="daily-hints__tiles">
        {hints.map((hint) => {
          const isLocked = !hint.unlocked;
          const isActive = activeHint === hint.id && hint.unlocked;

          return (
            <button
              key={hint.id}
              type="button"
              className={`daily-hints__tile ${isLocked ? "daily-hints__tile--locked" : ""} ${isActive ? "daily-hints__tile--active" : ""}`}
              onClick={() => {
                if (!hint.unlocked) return;
                setSelectedHint((current) => (current === hint.id ? null : hint.id));
              }}
              disabled={isLocked}
              aria-pressed={isActive}
              aria-label={`${hint.label} ${hint.unlocked ? "unlocked" : hint.lockCopy.toLowerCase()}`}
            >
              <HintIcon id={hint.id} />
              <span className="daily-hints__tile-label">{hint.label}</span>
              <span className="daily-hints__tile-meta">
                {hint.unlocked ? "Unlocked" : hint.lockCopy}
              </span>
            </button>
          );
        })}
      </div>

      {activeHint ? (
        <div className="daily-hints__content" aria-live="polite">
          {activeHint === "attribute" ? renderAttributeContent() : null}

          {activeHint === "name" ? (
            <p className="daily-hints__name-mask">{nameHint || "Name clue unavailable"}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
