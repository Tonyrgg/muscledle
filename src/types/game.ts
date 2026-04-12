import type { GuessFeedback } from "@/types/exercise";

export type PublicAttemptValues = {
  muscle: string;
  equipment: string;
  movement: string;
  pattern: string;
  reps: string;
  goal: string;
  ego: string;
};

export type PublicGameAttempt = {
  id: string;
  guessExerciseId: string;
  guessSlug: string;
  guessName: string;
  guessMuscleGroup: string | null;
  values: PublicAttemptValues;
  feedback: GuessFeedback;
  isCorrect: boolean;
};

export type PublicTodayGameState = {
  gameDate: string;
  yesterdayExerciseName: string | null;
  dailySecretExerciseId: string | null;
  status: "in_progress" | "won" | "lost";
  guessCount: number;
  attempts: PublicGameAttempt[];
};

export type SubmitGuessResponse = {
  gameDate: string;
  status: "in_progress" | "won" | "lost";
  guessCount: number;
  attempt: PublicGameAttempt;
};
