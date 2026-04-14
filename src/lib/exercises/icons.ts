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
  name?: string | null;
};

const KNOWN_EXERCISE_ICON_SLUGS = new Set([
  "bench-press",
  "dumbbell-bench-press",
  "lat-pulldown",
  "pull-up",
]);

const INFERRED_MUSCLE_KEYWORDS: Array<{ key: MuscleGroupIconKey; patterns: RegExp[] }> = [
  {
    key: "chest",
    patterns: [/\bbench\b/i, /\bchest\b/i, /\bfly\b/i, /\bpush[- ]?up\b/i, /\bpec\b/i],
  },
  {
    key: "legs",
    patterns: [/\bsquat\b/i, /\bleg\b/i, /\blunge\b/i, /\bcalf\b/i, /\bdeadlift\b/i],
  },
  {
    key: "shoulders",
    patterns: [/\bshoulder\b/i, /\boverhead\b/i, /\blateral raise\b/i, /\bfront raise\b/i],
  },
  {
    key: "arms",
    patterns: [/\bbicep\b/i, /\btricep\b/i, /\bcurl\b/i, /\bskull crusher\b/i],
  },
  {
    key: "back",
    patterns: [/\bpull[- ]?up\b/i, /\brow\b/i, /\blat\b/i, /\bback\b/i, /\bpulldown\b/i],
  },
  {
    key: "core",
    patterns: [/\bplank\b/i, /\bcore\b/i, /\bcrunch\b/i, /\babs?\b/i, /\bleg raise\b/i],
  },
];

export function getExerciseSpecificIconPath(slug: string): string {
  if (!slug) return "";
  return KNOWN_EXERCISE_ICON_SLUGS.has(slug) ? `/exercises/${slug}.svg` : "";
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
  const muscleIcon = getMuscleGroupIconPath(resolveMuscleGroupIconKey(exercise));
  const genericIcon = getMuscleGroupIconPath("full-body");

  const candidates = [specificIcon, muscleIcon, genericIcon].filter(Boolean);
  return [...new Set(candidates)];
}

export function resolveMuscleGroupIconKey(exercise: ExerciseIconSource): MuscleGroupIconKey {
  const direct = getMuscleGroupIconKey(exercise.muscle_group);
  if (direct !== "full-body") {
    return direct;
  }

  const source = `${exercise.slug ?? ""} ${exercise.name ?? ""}`.trim();
  if (!source) {
    return "full-body";
  }

  for (const matcher of INFERRED_MUSCLE_KEYWORDS) {
    if (matcher.patterns.some((pattern) => pattern.test(source))) {
      return matcher.key;
    }
  }

  return "full-body";
}
