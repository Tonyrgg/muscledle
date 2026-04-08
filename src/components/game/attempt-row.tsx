import { FeedbackCell } from "@/components/game/feedback-cell";
import type { PublicGameAttempt } from "@/types/game";

type AttemptRowProps = {
  attempt: PublicGameAttempt;
};

function badgeIcon(name: string): string {
  const first = name.trim().charAt(0).toLowerCase();
  if (first === "p") return "accessibility_new";
  if (first === "b") return "fitness_center";
  if (first === "s") return "bolt";
  return "handyman";
}

export function AttemptRow({ attempt }: AttemptRowProps) {
  return (
    <tr>
      <td className="attempt-row-exercise">
        <div className="attempt-exercise-wrap">
          <div className="attempt-icon-box">
            <span className="material-symbols-outlined" style={{ color: "var(--outline-strong)" }}>
              {badgeIcon(attempt.guessName)}
            </span>
          </div>
          <span className="attempt-name">{attempt.guessName}</span>
        </div>
      </td>

      <td className="attempt-row-cell attempt-cell-center">
        <FeedbackCell color={attempt.feedback.muscle} label={attempt.values.muscle} />
      </td>
      <td className="attempt-row-cell attempt-cell-center">
        <FeedbackCell color={attempt.feedback.equipment} label={attempt.values.equipment} />
      </td>
      <td className="attempt-row-cell attempt-cell-center">
        <FeedbackCell color={attempt.feedback.movement} label={attempt.values.movement} />
      </td>
      <td className="attempt-row-cell attempt-cell-center">
        <FeedbackCell color={attempt.feedback.pattern} label={attempt.values.pattern} />
      </td>
      <td className="attempt-row-cell attempt-cell-center">
        <FeedbackCell color={attempt.feedback.reps} label={attempt.values.reps} />
      </td>
      <td className="attempt-row-cell attempt-cell-center">
        <FeedbackCell color={attempt.feedback.goal} label={attempt.values.goal} />
      </td>
      <td className="attempt-row-cell attempt-cell-center">
        <FeedbackCell color={attempt.feedback.ego} label={attempt.values.ego} />
      </td>
    </tr>
  );
}
