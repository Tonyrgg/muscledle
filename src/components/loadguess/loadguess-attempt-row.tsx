import type { CSSProperties } from "react";
import {
  formatLoadValue,
  LOAD_FEEDBACK_LABELS,
} from "@/lib/loadguess/feedback";
import type {
  AttemptState,
  LoadGuessStatus,
  Unit,
} from "@/lib/loadguess/types";

type LoadGuessAttemptRowProps = {
  attempt: AttemptState;
  attemptIndex: number;
  currentAttemptIndex: number;
  gameStatus: LoadGuessStatus;
  stackIndex?: number;
  stepKg: number;
  unit: Unit;
  onAdjust: (attemptIndex: number, deltaKg: number) => void;
  onSubmit: (attemptIndex: number) => void;
};

export function LoadGuessAttemptRow({
  attempt,
  attemptIndex,
  currentAttemptIndex,
  gameStatus,
  stackIndex = 0,
  stepKg,
  unit,
  onAdjust,
  onSubmit,
}: LoadGuessAttemptRowProps) {
  const isCurrent = gameStatus === "playing" && attemptIndex === currentAttemptIndex;
  const canEdit = isCurrent && !attempt.submitted;
  const canDecrease = canEdit && attempt.valueKg > 0;
  const rowStateClass = attempt.submitted
    ? "loadguess-attempt-row--submitted"
    : canEdit
      ? "loadguess-attempt-row--active"
      : "loadguess-attempt-row--inactive";
  const feedback = attempt.feedback;

  return (
    <li
      className={`loadguess-attempt-row ${rowStateClass}`}
      data-disabled={!canEdit && !attempt.submitted}
      style={
        attempt.submitted
          ? ({
              "--loadguess-stack-index": stackIndex,
            } as CSSProperties)
          : undefined
      }
    >
      <div className="loadguess-attempt-row__index" aria-hidden="true">
        #{attemptIndex + 1}
      </div>

      <button
        type="button"
        className="loadguess-attempt-row__arrow"
        aria-label={`Decrease attempt ${attemptIndex + 1} by ${stepKg} kilograms`}
        disabled={!canDecrease}
        onClick={() => onAdjust(attemptIndex, -stepKg)}
      >
        <span aria-hidden="true">&larr;</span>
      </button>

      <output
        className="loadguess-attempt-row__value"
        aria-label={`Attempt ${attemptIndex + 1} load ${formatLoadValue(
          attempt.valueKg,
          unit,
        )}`}
      >
        {formatLoadValue(attempt.valueKg, unit)}
      </output>

      <button
        type="button"
        className="loadguess-attempt-row__arrow"
        aria-label={`Increase attempt ${attemptIndex + 1} by ${stepKg} kilograms`}
        disabled={!canEdit}
        onClick={() => onAdjust(attemptIndex, stepKg)}
      >
        <span aria-hidden="true">&rarr;</span>
      </button>

      <div className="loadguess-attempt-row__action">
        {attempt.submitted && feedback ? (
          <div
            className={`loadguess-attempt-row__feedback loadguess-attempt-row__feedback--${feedback}`}
            aria-live="polite"
          >
            <span>{LOAD_FEEDBACK_LABELS[feedback]}</span>
          </div>
        ) : (
          <button
            type="button"
            className="loadguess-attempt-row__submit"
            disabled={!canEdit}
            onClick={() => onSubmit(attemptIndex)}
          >
            Submit
          </button>
        )}
      </div>
    </li>
  );
}
