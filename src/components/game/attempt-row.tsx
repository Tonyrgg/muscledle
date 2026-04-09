import { ExerciseIconCell } from "@/components/game/exercise-icon-cell";
import { FeedbackCell } from "@/components/game/feedback-cell";
import type { PublicGameAttempt } from "@/types/game";

type AttemptRowProps = {
  attempt: PublicGameAttempt;
};

export function AttemptRow({ attempt }: AttemptRowProps) {
  return (
    <div className="attempts-grid attempts-row" role="row">
      <div className="attempts-exercise-cell" role="cell">
        <ExerciseIconCell
          exerciseName={attempt.guessName}
          exerciseSlug={attempt.guessSlug}
          exerciseMuscleGroup={attempt.guessMuscleGroup}
        />
      </div>

      <FeedbackCell color={attempt.feedback.muscle} value={attempt.values.muscle} />
      <FeedbackCell color={attempt.feedback.equipment} value={attempt.values.equipment} />
      <FeedbackCell color={attempt.feedback.movement} value={attempt.values.movement} />
      <FeedbackCell color={attempt.feedback.pattern} value={attempt.values.pattern} />
      <FeedbackCell color={attempt.feedback.reps} value={attempt.values.reps} />
      <FeedbackCell color={attempt.feedback.goal} value={attempt.values.goal} />
      <FeedbackCell color={attempt.feedback.ego} value={attempt.values.ego} />
    </div>
  );
}
