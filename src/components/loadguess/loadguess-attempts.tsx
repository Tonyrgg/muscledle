import { LoadGuessAttemptRow } from "@/components/loadguess/loadguess-attempt-row";
import type {
  AttemptState,
  LoadGuessStatus,
  Unit,
} from "@/lib/loadguess/types";

type LoadGuessAttemptsProps = {
  attempts: AttemptState[];
  currentAttemptIndex: number;
  gameStatus: LoadGuessStatus;
  stepKg: number;
  unit: Unit;
  onAdjustAttempt: (attemptIndex: number, deltaKg: number) => void;
  onSubmitAttempt: (attemptIndex: number) => void;
};

export function LoadGuessAttempts({
  attempts,
  currentAttemptIndex,
  gameStatus,
  stepKg,
  unit,
  onAdjustAttempt,
  onSubmitAttempt,
}: LoadGuessAttemptsProps) {
  const activeAttempt =
    gameStatus === "playing" ? attempts[currentAttemptIndex] : null;
  const submittedAttempts = attempts
    .map((attempt, index) => ({ attempt, index }))
    .filter((entry) => entry.attempt.submitted)
    .reverse();

  return (
    <section className="loadguess-attempts" aria-label="Load guesses">
      <ol className="loadguess-attempts__list">
        {activeAttempt ? (
          <LoadGuessAttemptRow
            key={`loadguess-attempt-active-${currentAttemptIndex}`}
            attempt={activeAttempt}
            attemptIndex={currentAttemptIndex}
            currentAttemptIndex={currentAttemptIndex}
            gameStatus={gameStatus}
            stepKg={stepKg}
            unit={unit}
            onAdjust={onAdjustAttempt}
            onSubmit={onSubmitAttempt}
          />
        ) : null}

        {submittedAttempts.map(({ attempt, index }, submittedIndex) => (
          <LoadGuessAttemptRow
            key={`loadguess-attempt-submitted-${index}`}
            attempt={attempt}
            attemptIndex={index}
            currentAttemptIndex={currentAttemptIndex}
            gameStatus="lost"
            stackIndex={submittedIndex}
            stepKg={stepKg}
            unit={unit}
            onAdjust={onAdjustAttempt}
            onSubmit={onSubmitAttempt}
          />
        ))}
      </ol>
    </section>
  );
}
