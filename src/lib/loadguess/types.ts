export type Unit = "kg" | "lb";

export type LoadFeedback = "cold" | "medium" | "warm" | "hot" | "correct";

export type LoadGuessStatus = "playing" | "won" | "lost";

export type LoadGuessVideo = {
  id: string;
  title: string;
  blurredVideoUrl: string;
  originalVideoUrl: string;
  posterUrl?: string;
  targetKg: number;
  targetLb: number;
  startKg: number;
  stepKg: number;
  source?: {
    platform?: string;
    url?: string;
    username?: string;
    followers?: number;
    views?: number;
  };
};

export type AttemptState = {
  valueKg: number;
  submitted: boolean;
  feedback?: LoadFeedback;
};

export type LoadGuessRoundState = {
  videoId: string;
  attempts: AttemptState[];
  currentAttemptIndex: number;
  status: LoadGuessStatus;
};

export type LoadGuessSessionState = {
  gameDate: string;
  roundVideoIds: string[];
  currentRoundIndex: number;
  rounds: LoadGuessRoundState[];
};
