export const WEIGHT_GUESS_FEEDBACK_MODE_OPTIONS = [
  "one_daily_video",
  "four_videos_daily",
  "infinite_mode",
] as const;

export const WEIGHT_GUESS_FEEDBACK_SURFACES = ["intro", "summary"] as const;

export const WEIGHT_GUESS_FEEDBACK_ROUND_OUTCOMES = ["won", "lost"] as const;

export type WeightGuessFeedbackModeOption =
  (typeof WEIGHT_GUESS_FEEDBACK_MODE_OPTIONS)[number];

export type WeightGuessFeedbackSurface =
  (typeof WEIGHT_GUESS_FEEDBACK_SURFACES)[number];

export type WeightGuessFeedbackRoundOutcome =
  (typeof WEIGHT_GUESS_FEEDBACK_ROUND_OUTCOMES)[number];

export const WEIGHT_GUESS_FEEDBACK_MODE_LABELS: Record<
  WeightGuessFeedbackModeOption,
  string
> = {
  one_daily_video: "one daily video",
  four_videos_daily: "a series of 4 videos daily",
  infinite_mode: "infinite mode",
};

export type CreateWeightGuessFeedbackInput = {
  visitorId: string;
  rating: number;
  selectedModes: WeightGuessFeedbackModeOption[];
  surface: WeightGuessFeedbackSurface;
  roundNumber?: number | null;
  roundOutcome?: WeightGuessFeedbackRoundOutcome | null;
  attemptsUsed?: number | null;
  pagePath?: string | null;
  diagnostics?: Record<string, unknown>;
};
