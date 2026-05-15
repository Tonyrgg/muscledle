export type LiftGridCategoryKey =
  | "muscle_group"
  | "equipment"
  | "movement"
  | "pattern"
  | "goal"
  | "muscle";

export type LiftGridSolvedCell = {
  rowIndex: number;
  columnIndex: number;
  exerciseId: string;
  exerciseName: string;
};

export type LiftGridPublicState = {
  gameDate: string;
  dailyNumber: number;
  rowCategoryKey: LiftGridCategoryKey;
  columnCategoryKey: LiftGridCategoryKey;
  rows: string[];
  columns: string[];
  solvedCells: LiftGridSolvedCell[];
  completedCount: number;
  totalCells: number;
  isComplete: boolean;
  isSurrendered: boolean;
  completedBeforeSurrender: number | null;
  solvedBeforeSurrenderCells: LiftGridSolvedCell[];
};

export type LiftGridGuessFailureReason =
  | "unknown_exercise"
  | "wrong_row_category"
  | "wrong_column_category"
  | "already_used"
  | "already_solved"
  | "no_matching_cell";

export type LiftGridGuessResponse = {
  correct: boolean;
  normalizedExerciseName: string | null;
  reason: LiftGridGuessFailureReason | null;
  solvedCell: LiftGridSolvedCell | null;
  completedCount: number;
  totalCells: number;
  isComplete: boolean;
};

export type LiftGridRevealResponse = {
  solvedCells: LiftGridSolvedCell[];
  completedCount: number;
  totalCells: number;
  isComplete: boolean;
  isSurrendered: boolean;
  completedBeforeSurrender: number;
  solvedBeforeSurrenderCells: LiftGridSolvedCell[];
};

export type LiftGridFeedbackChoice = "yes_make_it" | "maybe" | "not_for_me";

export type PublicLiftGridStatsPoint = {
  gameDate: string;
  completedCount: number;
  status: "in_progress" | "completed";
};

export type PublicLiftGridStats = {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  averageCompletedCells: number;
  averageCompletionRate: number;
  currentStreak: number;
  maxStreak: number;
  completionHistory: PublicLiftGridStatsPoint[];
};

export type LiftGridEventSource = "client" | "server";

export type LiftGridEventName =
  | "page_loaded"
  | "page_load_failed"
  | "today_state_received"
  | "board_rendered"
  | "interactive_click"
  | "cell_selected"
  | "active_cell_changed"
  | "query_focused"
  | "query_changed"
  | "suggestions_rendered"
  | "suggestion_selected"
  | "guess_submit_clicked"
  | "guess_result_rendered"
  | "guess_recorded"
  | "guess_rejected"
  | "grid_completed"
  | "feedback_clicked"
  | "feedback_recorded"
  | "share_copy_clicked"
  | "share_copy_result";

export type LiftGridEventInput = {
  eventName: LiftGridEventName;
  eventSource?: LiftGridEventSource;
  gameDate?: string | null;
  dailyNumber?: number | null;
  resultId?: string | null;
  attemptId?: string | null;
  completedCount?: number | null;
  totalCells?: number | null;
  rowIndex?: number | null;
  columnIndex?: number | null;
  rowLabel?: string | null;
  columnLabel?: string | null;
  cellKey?: string | null;
  uiSurface?: string | null;
  actionTarget?: string | null;
  inputValue?: string | null;
  inputLength?: number | null;
  normalizedGuessText?: string | null;
  matchedExerciseId?: string | null;
  matchedExerciseName?: string | null;
  isCorrect?: boolean | null;
  failureReason?: LiftGridGuessFailureReason | null;
  feedbackChoice?: LiftGridFeedbackChoice | null;
  shareText?: string | null;
  pagePath?: string | null;
  referrer?: string | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  timezone?: string | null;
  language?: string | null;
  metadata?: Record<string, unknown> | null;
};
