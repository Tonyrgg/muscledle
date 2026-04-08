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
  guessName: string;
  values: PublicAttemptValues;
  feedback: GuessFeedback;
  isCorrect: boolean;
};

export type PublicTodayGameState = {
  gameDate: string;
  status: "in_progress" | "won" | "lost";
  guessCount: number;
  maxGuesses: number;
  attempts: PublicGameAttempt[];
};
