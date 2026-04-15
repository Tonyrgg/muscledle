import type { Exercise } from "@/types/exercise";

export type MuscleGroupIconKey =
  | "chest"
  | "upper-back"
  | "middle-back"
  | "lower-back"
  | "back-legs"
  | "back-calves"
  | "front-legs"
  | "front-calves"
  | "front-shoulders"
  | "back-shoulders"
  | "biceps"
  | "triceps"
  | "front-forearms"
  | "back-forearms"
  | "core"
  | "buttocks"
  | "trapezium"
  | "full-body";

const MUSCLE_GROUP_ICON_PATH_MAP: Record<MuscleGroupIconKey, string> = {
  chest: "/muscle-icons/chest.svg",
  "upper-back": "/muscle-icons/upper-back.svg",
  "middle-back": "/muscle-icons/middle-back.svg",
  "lower-back": "/muscle-icons/lower-back.svg",
  "back-legs": "/muscle-icons/back-legs.svg",
  "back-calves": "/muscle-icons/back-calves.svg",
  "front-legs": "/muscle-icons/front-legs.svg",
  "front-calves": "/muscle-icons/front-calves.svg",
  "front-shoulders": "/muscle-icons/front-shoulders.svg",
  "back-shoulders": "/muscle-icons/back-shoulders.svg",
  biceps: "/muscle-icons/biceps.svg",
  triceps: "/muscle-icons/triceps.svg",
  "front-forearms": "/muscle-icons/front-forearms.svg",
  "back-forearms": "/muscle-icons/back-forearms.svg",
  core: "/muscle-icons/core.svg",
  buttocks: "/muscle-icons/buttocks.svg",
  trapezium: "/muscle-icons/trapezium.svg",
  "full-body": "/muscle-icons/core.svg",
};

const MUSCLE_GROUP_ICON_MAP: Record<string, MuscleGroupIconKey> = {
  chest: "chest",
  back: "upper-back",
  shoulders: "front-shoulders",
  arms: "biceps",
  legs: "front-legs",
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

const DETAILED_ICON_MATCHERS: Array<{ key: MuscleGroupIconKey; patterns: RegExp[] }> = [
  {
    key: "biceps",
    patterns: [/\bbiceps?\b/i, /\bcurl\b/i, /preacher/i, /hammer/i],
  },
  {
    key: "triceps",
    patterns: [/\btriceps?\b/i, /pushdown/i, /skull\s*crusher/i, /overhead\s+tricep/i],
  },
  {
    key: "front-forearms",
    patterns: [/\bforearm\b/i, /wrist\s*curl/i, /reverse\s*curl/i],
  },
  {
    key: "front-shoulders",
    patterns: [/shoulder/i, /overhead\s*press/i, /front\s*raise/i, /lateral\s*raise/i, /arnold/i],
  },
  {
    key: "back-shoulders",
    patterns: [/rear\s*delt/i, /face\s*pull/i],
  },
  {
    key: "trapezium",
    patterns: [/shrug/i, /trapez/i],
  },
  {
    key: "chest",
    patterns: [/\bbench\b/i, /\bchest\b/i, /\bfly\b/i, /\bpec\b/i, /push[- ]?up/i, /\bdip\b/i],
  },
  {
    key: "upper-back",
    patterns: [/pull[- ]?up/i, /lat\b/i, /pulldown/i, /chin[- ]?up/i],
  },
  {
    key: "middle-back",
    patterns: [/\brow\b/i, /seated\s*cable\s*row/i, /t-?bar/i],
  },
  {
    key: "lower-back",
    patterns: [/back\s*extension/i, /hyperextension/i],
  },
  {
    key: "back-legs",
    patterns: [/deadlift/i, /rdl\b/i, /romanian/i, /hamstring/i],
  },
  {
    key: "buttocks",
    patterns: [/hip\s*thrust/i, /glute/i, /kickback/i],
  },
  {
    key: "front-calves",
    patterns: [/calf\s*raise/i],
  },
  {
    key: "front-legs",
    patterns: [/squat/i, /lunge/i, /leg\s*press/i, /leg\s*extension/i, /split\s*squat/i],
  },
  {
    key: "core",
    patterns: [/\bplank\b/i, /\bcore\b/i, /crunch/i, /\babs?\b/i, /leg\s*raise/i, /woodchop/i, /rollout/i, /twist/i],
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
  return MUSCLE_GROUP_ICON_PATH_MAP[key] ?? MUSCLE_GROUP_ICON_PATH_MAP["full-body"];
}

export function getExerciseIconCandidates(exercise: ExerciseIconSource): string[] {
  const specificIcon = getExerciseSpecificIconPath(exercise.slug);
  const detailedIcon = getMuscleGroupIconPath(resolveMuscleGroupIconKey(exercise));
  const genericIcon = getMuscleGroupIconPath("full-body");

  const candidates = [specificIcon, detailedIcon, genericIcon].filter(Boolean);
  return [...new Set(candidates)];
}

export function resolveMuscleGroupIconKey(exercise: ExerciseIconSource): MuscleGroupIconKey {
  const direct = getMuscleGroupIconKey(exercise.muscle_group);
  if (direct !== "full-body") {
    return direct;
  }

  const source = `${exercise.slug ?? ""} ${exercise.name ?? ""}`.trim();

  if (source) {
    for (const matcher of DETAILED_ICON_MATCHERS) {
      if (matcher.patterns.some((pattern) => pattern.test(source))) {
        return matcher.key;
      }
    }
  }

  return "full-body";
}
