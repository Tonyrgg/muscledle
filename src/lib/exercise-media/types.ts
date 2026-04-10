export type SyncStatus = "matched" | "not_found" | "no_gif" | "match_failed" | "db_error";

export type InternalExercise = {
  slug: string;
  name: string;
  aliases?: string[];
};

export type ExternalExerciseCandidate = {
  id?: string | null;
  name: string;
  gifUrl: string | null;
};

export type ExerciseMediaRecord = {
  exerciseSlug: string;
  provider: "exercisedb";
  providerExerciseName: string | null;
  mediaType: "gif";
  mediaUrl: string | null;
  matchScore: number | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
};
