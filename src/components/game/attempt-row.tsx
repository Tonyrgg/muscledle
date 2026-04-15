import { ExerciseIconCell } from "@/components/game/exercise-icon-cell";
import { FeedbackCell } from "@/components/game/feedback-cell";
import type { FeedbackColumnKey } from "@/lib/exercises/attribute-definitions";
import type { PublicGameAttempt } from "@/types/game";

type AttemptRowProps = {
  attempt: PublicGameAttempt;
  isRevealing?: boolean;
};

export function AttemptRow({ attempt, isRevealing = false }: AttemptRowProps) {
  const columnKeys: FeedbackColumnKey[] = ["muscle", "equipment", "movement", "pattern", "reps", "goal", "ego"];

  return (
    <div className="attempts-grid attempts-row" role="row">
      <div className="attempts-exercise-cell" role="cell">
        <ExerciseIconCell
          exerciseName={attempt.guessName}
          exerciseSlug={attempt.guessSlug}
          exerciseMuscleGroup={attempt.guessMuscleGroup}
          exerciseMuscleValues={attempt.values.muscle}
        />
      </div>

      <FeedbackCell column={columnKeys[0]} color={attempt.feedback.muscle} value={attempt.values.muscle} isRevealing={isRevealing} revealOrder={0} />
      <FeedbackCell column={columnKeys[1]} color={attempt.feedback.equipment} value={attempt.values.equipment} isRevealing={isRevealing} revealOrder={1} />
      <FeedbackCell column={columnKeys[2]} color={attempt.feedback.movement} value={attempt.values.movement} isRevealing={isRevealing} revealOrder={2} />
      <FeedbackCell column={columnKeys[3]} color={attempt.feedback.pattern} value={attempt.values.pattern} isRevealing={isRevealing} revealOrder={3} />
      <FeedbackCell column={columnKeys[4]} color={attempt.feedback.reps} value={attempt.values.reps} isRevealing={isRevealing} revealOrder={4} />
      <FeedbackCell column={columnKeys[5]} color={attempt.feedback.goal} value={attempt.values.goal} isRevealing={isRevealing} revealOrder={5} />
      <FeedbackCell column={columnKeys[6]} color={attempt.feedback.ego} value={attempt.values.ego} isRevealing={isRevealing} revealOrder={6} />
    </div>
  );
}
