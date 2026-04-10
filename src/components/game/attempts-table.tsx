import { AttemptRow } from "@/components/game/attempt-row";
import type { PublicGameAttempt } from "@/types/game";

type AttemptsTableProps = {
  attempts: PublicGameAttempt[];
  loading?: boolean;
  revealingAttemptId?: string | null;
};

const columns = ["Exercise", "Muscle", "Equipment", "Movement", "Pattern", "Reps", "Goal", "Ego"] as const;

export function AttemptsTable({
  attempts,
  loading = false,
  revealingAttemptId = null,
}: AttemptsTableProps) {
  if (loading) {
    return (
      <div className="attempts-table-scroll" role="status" aria-live="polite" aria-label="Loading attempts">
        <div className="attempts-table attempts-loading">
          <div className="attempts-grid attempts-grid--header attempts-grid--skeleton-header">
            {columns.map((column) => (
              <div key={column} className="attempts-header-cell attempts-header-cell--skeleton">
                {column}
              </div>
            ))}
          </div>

          <div className="attempts-body">
            {Array.from({ length: 3 }).map((_, rowIndex) => (
              <div key={rowIndex} className="attempts-grid attempts-loading__grid-row" aria-hidden>
                {Array.from({ length: columns.length }).map((__, cellIndex) => (
                  <div
                    key={`${rowIndex}-${cellIndex}`}
                    className={`attempts-loading__cell ${cellIndex === 0 ? "attempts-loading__cell--icon" : ""}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (attempts.length === 0) {
    return <p className="attempts-empty">No attempts yet. Make your first guess.</p>;
  }

  return (
    <div className="attempts-table-scroll" role="region" aria-label="Attempts table" tabIndex={0}>
      <div className="attempts-table" role="table" aria-rowcount={attempts.length + 1}>
        <div className="attempts-grid attempts-grid--header" role="row">
          {columns.map((column) => (
            <div key={column} className="attempts-header-cell" role="columnheader">
              {column}
            </div>
          ))}
        </div>

        <div className="attempts-body" role="rowgroup">
          {attempts.map((attempt) => (
            <AttemptRow key={attempt.id} attempt={attempt} isRevealing={attempt.id === revealingAttemptId} />
          ))}
        </div>
      </div>
    </div>
  );
}
