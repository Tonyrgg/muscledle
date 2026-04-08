import { AttemptRow } from "@/components/game/attempt-row";
import type { PublicGameAttempt } from "@/types/game";

type AttemptsTableProps = {
  attempts: PublicGameAttempt[];
  loading?: boolean;
};

const columns = [
  { label: "Exercise", icon: null },
  { label: "Muscle", icon: "fitness_center" },
  { label: "Equipment", icon: "layers" },
  { label: "Movement", icon: "swap_horiz" },
  { label: "Pattern", icon: "category" },
  { label: "Reps", icon: "repeat" },
  { label: "Goal", icon: "flag" },
  { label: "Ego", icon: "bolt" },
] as const;

export function AttemptsTable({ attempts, loading = false }: AttemptsTableProps) {
  if (loading) {
    return (
      <div className="loading-stack">
        <div className="loading-row shimmer" />
        <div className="loading-row shimmer" />
        <div className="loading-row shimmer" />
      </div>
    );
  }

  if (attempts.length === 0) {
    return <div className="state-empty">No attempts yet. Make your first guess.</div>;
  }

  return (
    <div className="attempts-wrap">
      <table className="attempts-table">
        <thead>
          <tr className="attempts-head-row">
            {columns.map((column) => (
              <th key={column.label} className="attempts-head-cell">
                {column.icon ? (
                  <div className="attempts-head-stack">
                    <span className="material-symbols-outlined attempts-head-icon">{column.icon}</span>
                    {column.label}
                  </div>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{attempts.map((attempt) => <AttemptRow key={attempt.id} attempt={attempt} />)}</tbody>
      </table>
    </div>
  );
}
