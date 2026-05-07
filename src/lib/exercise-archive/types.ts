import type { EnrichmentStatus } from "@/lib/exercise-enrichment/types";

export type MediaSyncStatus = "matched" | "not_found" | "no_gif" | "match_failed" | "db_error" | null;

export type ExerciseArchiveStats = {
  timesAsDailyTarget: number;
  winsWhenTarget: number;
  lossesWhenTarget: number;
  avgGuessesToSolveWhenTarget: number | null;
  totalGuesses: number;
  correctGuesses: number;
  incorrectGuesses: number;
  accuracy: number | null;
  uniqueGuessers: number;
  lastGuessedAt: string | null;
  lastDailyTargetDate: string | null;
};

export type ExerciseArchiveRow = {
  id: string;
  slug: string;
  name: string;
  exercisePagePath: string;
  aliases: string[];
  muscleGroup: string;
  muscle: string[];
  equipment: string[];
  movement: string[];
  pattern: string[];
  reps: string[];
  goal: string[];
  ego: string[];
  isLive: boolean;
  media: {
    syncStatus: MediaSyncStatus;
    providerExerciseName: string | null;
    mediaUrl: string | null;
    lastSyncedAt: string | null;
  };
  enrichment: {
    status: EnrichmentStatus | "pending" | null;
    providerExerciseId: string | null;
    providerExerciseName: string | null;
    normalizedMuscle: string | null;
    normalizedEquipment: string | null;
    normalizedMovement: string | null;
    normalizedPattern: string | null;
    normalizedReps: string | null;
    normalizedGoal: string | null;
    normalizedEgo: string | null;
    lastEnrichedAt: string | null;
  };
  stats: ExerciseArchiveStats;
};
