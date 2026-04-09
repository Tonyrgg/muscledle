import type { Exercise } from "@/types/exercise";

export type MuscleGroupIconKey =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "core"
  | "full-body";

const MUSCLE_GROUP_ICON_MAP: Record<string, MuscleGroupIconKey> = {
  chest: "chest",
  back: "back",
  shoulders: "shoulders",
  arms: "arms",
  legs: "legs",
  core: "core",
};

type ExerciseIconSource = Pick<Exercise, "slug"> & {
  muscle_group?: string | null;
};

export function getExerciseSpecificIconPath(slug: string): string {
  return slug ? `/exercises/${slug}.svg` : "";
}

export function getMuscleGroupIconKey(muscleGroup?: string | null): MuscleGroupIconKey {
  if (!muscleGroup) return "full-body";

  return MUSCLE_GROUP_ICON_MAP[muscleGroup.toLowerCase()] ?? "full-body";
}

export function getMuscleGroupIconPath(key: MuscleGroupIconKey): string {
  return `/muscle-icons/${key}.svg`;
}

export function getExerciseIconCandidates(exercise: ExerciseIconSource): string[] {
  const specificIcon = getExerciseSpecificIconPath(exercise.slug);
  const muscleIcon = getMuscleGroupIconPath(getMuscleGroupIconKey(exercise.muscle_group));
  const genericIcon = getMuscleGroupIconPath("full-body");

  const candidates = [specificIcon, muscleIcon, genericIcon].filter(Boolean);
  return [...new Set(candidates)];
}
