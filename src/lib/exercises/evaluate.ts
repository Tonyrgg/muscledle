import type { Exercise, FeedbackColor, GuessFeedback } from "@/types/exercise";

function normalize(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()))].sort();
}

export function evaluateColumn(guess: string[], target: string[]): FeedbackColor {
  const normalizedGuess = normalize(guess);
  const normalizedTarget = normalize(target);

  const isExactMatch =
    normalizedGuess.length === normalizedTarget.length &&
    normalizedGuess.every((value, index) => value === normalizedTarget[index]);

  if (isExactMatch) {
    return "green";
  }

  const targetSet = new Set(normalizedTarget);
  const hasOverlap = normalizedGuess.some((value) => targetSet.has(value));

  return hasOverlap ? "yellow" : "red";
}

export function evaluateGuess(guess: Exercise, target: Exercise): GuessFeedback {
  return {
    muscle: evaluateColumn(guess.muscle, target.muscle),
    equipment: evaluateColumn(guess.equipment, target.equipment),
    movement: evaluateColumn(guess.movement, target.movement),
    pattern: evaluateColumn(guess.pattern, target.pattern),
    reps: evaluateColumn(guess.reps, target.reps),
    goal: evaluateColumn(guess.goal, target.goal),
    ego: evaluateColumn(guess.ego, target.ego),
  };
}

export function isCorrectGuess(feedback: GuessFeedback): boolean {
  return Object.values(feedback).every((color) => color === "green");
}
