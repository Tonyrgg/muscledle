import { AttemptRow } from "@/components/game/attempt-row";
import type { PublicGameAttempt } from "@/types/game";

type AttemptsTableProps = {
  attempts: PublicGameAttempt[];
  loading?: boolean;
};

const columns = ["Exercise", "Muscle", "Equipment", "Movement", "Pattern", "Reps", "Goal", "Ego"] as const;

export function AttemptsTable({ attempts, loading = false }: AttemptsTableProps) {
  if (loading) {
    return (
      <div className="attempts-loading" aria-live="polite">
        <div className="attempts-loading__row" />
        <div className="attempts-loading__row" />
        <div className="attempts-loading__row" />
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
            <AttemptRow key={attempt.id} attempt={attempt} />
          ))}
        </div>
      </div>
    </div>
  );
}
