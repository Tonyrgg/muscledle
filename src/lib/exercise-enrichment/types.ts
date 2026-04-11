export type InternalExercise = {
  slug: string;
  name: string;
  aliases?: string[];
};

export type ExerciseDbRaw = {
  id: string | null;
  name: string;
  equipment?: string | null;
  bodyPart?: string | null;
  target?: string | null;
  secondaryMuscles?: string[] | null;
  instructions?: string[] | null;
};

export type NormalizedExerciseFields = {
  muscle: "chest" | "back" | "shoulders" | "legs" | "biceps" | "triceps" | "core" | "glutes" | "forearms" | "full-body";
  equipment:
    | "barbell"
    | "dumbbells"
    | "machine"
    | "cable"
    | "bodyweight"
    | "smith-machine"
    | "ez-bar"
    | "kettlebell"
    | "band"
    | "bench"
    | "other";
  movement: "push" | "pull" | "legs" | "core";
  pattern: "horizontal" | "vertical" | "hinge" | "squat" | "isolation" | "carry" | "rotation" | "other";
  reps: "1-5" | "6-12" | "12-20" | "20+";
  goal: "strength" | "hypertrophy" | "endurance" | "skill";
  ego: "low" | "medium" | "high";
};

export type EnrichmentStatus = "enriched" | "not_found" | "match_failed" | "provider_error" | "db_error";

export type ExerciseEnrichmentRecord = {
  exerciseSlug: string;
  provider: "exercisedb";
  providerExerciseId: string | null;
  providerExerciseName: string | null;
  rawEquipment: string | null;
  rawBodyPart: string | null;
  rawTarget: string | null;
  rawSecondaryMuscles: string[] | null;
  rawInstructions: string[] | null;
  normalizedMuscle: NormalizedExerciseFields["muscle"] | null;
  normalizedEquipment: NormalizedExerciseFields["equipment"] | null;
  normalizedMovement: NormalizedExerciseFields["movement"] | null;
  normalizedPattern: NormalizedExerciseFields["pattern"] | null;
  normalizedReps: NormalizedExerciseFields["reps"] | null;
  normalizedGoal: NormalizedExerciseFields["goal"] | null;
  normalizedEgo: NormalizedExerciseFields["ego"] | null;
  enrichmentStatus: EnrichmentStatus;
  enrichmentError: string | null;
  matchScore: number | null;
  lastEnrichedAt: string | null;
};

export type EnrichmentReport = {
  slug: string;
  status: EnrichmentStatus;
  providerExerciseName: string | null;
  matchScore: number | null;
  raw: {
    equipment: string | null;
    bodyPart: string | null;
    target: string | null;
    secondaryMuscles: string[] | null;
    instructions: string[] | null;
  };
  normalized: {
    muscle: NormalizedExerciseFields["muscle"] | null;
    equipment: NormalizedExerciseFields["equipment"] | null;
    movement: NormalizedExerciseFields["movement"] | null;
    pattern: NormalizedExerciseFields["pattern"] | null;
    reps: NormalizedExerciseFields["reps"] | null;
    goal: NormalizedExerciseFields["goal"] | null;
    ego: NormalizedExerciseFields["ego"] | null;
  };
  error: string | null;
};

