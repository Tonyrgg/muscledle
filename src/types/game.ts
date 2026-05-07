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

export type PublicAttemptRepsDirection = "up" | "down" | null;

export type PublicGameAttempt = {
  id: string;
  guessExerciseId: string;
  guessSlug: string;
  guessName: string;
  guessMuscleGroup: string | null;
  values: PublicAttemptValues;
  repsDirection: PublicAttemptRepsDirection;
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

export type PublicGameStatsPoint = {
  gameDate: string;
  guessCount: number;
  status: "in_progress" | "won" | "lost";
};

export type PublicGameStats = {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  averageGuesses: number;
  oneShots: number;
  oneShotRate: number;
  currentStreak: number;
  maxStreak: number;
  guessHistory: PublicGameStatsPoint[];
};

export type PublicDailyTracker = {
  gameDate: string;
  playersTried: number;
  playersWon: number;
  playersFailed: number;
  successRate: number;
};

export type PublicMarathonState = {
  status: "not_started" | "in_progress" | "won" | "lost";
  score: number;
  currentIndex: number;
  attempts: PublicGameAttempt[];
  maxAttemptsPerRound: number;
  exerciseOrderIds: string[];
  runSeed: number | null;
};

export type SubmitMarathonGuessResponse = {
  state: PublicMarathonState;
  attempt: PublicGameAttempt;
  pointsEarned: number;
  acceptedFamilyMatch: boolean;
};
