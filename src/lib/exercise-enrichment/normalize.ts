import type { ExerciseDbRaw, NormalizedExerciseFields } from "@/lib/exercise-enrichment/types";

function normalizeToken(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

export function mapEquipment(rawEquipment: string | null): NormalizedExerciseFields["equipment"] {
  const equipment = normalizeToken(rawEquipment);

  if (!equipment) return "other";
  if (equipment.includes("smith")) return "smith-machine";
  if (hasAny(equipment, ["ez bar", "ezbar", "ez barbell", "ez_barbell"])) return "ez-bar";
  if (equipment.includes("barbell")) return "barbell";
  if (hasAny(equipment, ["dumbbell", "dumbbells"])) return "dumbbells";
  if (equipment.includes("cable")) return "cable";
  if (equipment.includes("machine")) return "machine";
  if (hasAny(equipment, ["body weight", "bodyweight", "assisted body weight"])) return "bodyweight";
  if (equipment.includes("kettlebell")) return "kettlebell";
  if (equipment.includes("band")) return "band";
  if (equipment.includes("bench")) return "bench";
  return "other";
}

export function mapMuscle(raw: {
  target?: string | null;
  bodyPart?: string | null;
}): NormalizedExerciseFields["muscle"] {
  const source = `${normalizeToken(raw.target)} ${normalizeToken(raw.bodyPart)}`.trim();

  if (hasAny(source, ["pectoral", "chest"])) return "chest";
  if (hasAny(source, ["lats", "latissimus", "traps", "upper back", "back"])) return "back";
  if (hasAny(source, ["delts", "deltoid", "shoulder"])) return "shoulders";
  if (hasAny(source, ["quads", "hamstring", "calves", "adductors", "upper legs", "lower legs", "thigh"])) return "legs";
  if (source.includes("biceps")) return "biceps";
  if (source.includes("triceps")) return "triceps";
  if (hasAny(source, ["abs", "oblique", "waist", "core"])) return "core";
  if (hasAny(source, ["glute", "butt"])) return "glutes";
  if (source.includes("forearm")) return "forearms";
  return "full-body";
}

export function mapMovement(args: {
  muscle: NormalizedExerciseFields["muscle"];
  name: string;
}): NormalizedExerciseFields["movement"] {
  const name = normalizeToken(args.name);

  if (["chest", "shoulders", "triceps"].includes(args.muscle)) return "push";
  if (["back", "biceps", "forearms"].includes(args.muscle)) return "pull";
  if (["legs", "glutes"].includes(args.muscle)) return "legs";
  if (args.muscle === "core") return "core";

  if (hasAny(name, ["press", "push"])) return "push";
  if (hasAny(name, ["row", "pull"])) return "pull";
  if (hasAny(name, ["squat", "lunge", "deadlift", "leg"])) return "legs";
  return "core";
}

export function mapPattern(name: string, movement: NormalizedExerciseFields["movement"]): NormalizedExerciseFields["pattern"] {
  const normalizedName = normalizeToken(name);

  if (hasAny(normalizedName, ["military press", "overhead press", "shoulder press"])) return "vertical";
  if (hasAny(normalizedName, ["row", "bench press", "chest press"])) return "horizontal";
  if (hasAny(normalizedName, ["pull up", "pullup", "pulldown", "overhead press", "shoulder press"])) return "vertical";
  if (hasAny(normalizedName, ["deadlift", "romanian deadlift", "good morning"])) return "hinge";
  if (hasAny(normalizedName, ["squat", "lunge", "leg press", "split squat"])) return "squat";
  if (hasAny(normalizedName, ["curl", "extension", "raise", "fly", "pushdown", "pressdown"])) return "isolation";
  if (hasAny(normalizedName, ["carry", "walk"])) return "carry";
  if (hasAny(normalizedName, ["twist", "rotation", "woodchopper"])) return "rotation";

  if (movement === "push" || movement === "pull") return "horizontal";
  if (movement === "legs") return "squat";
  return "other";
}

export function mapReps(
  name: string,
  pattern: NormalizedExerciseFields["pattern"],
  equipment: NormalizedExerciseFields["equipment"],
): NormalizedExerciseFields["reps"] {
  const normalizedName = normalizeToken(name);

  if (pattern === "carry") return "20+";

  if (hasAny(normalizedName, ["deadlift", "squat", "bench press", "overhead press", "row", "pull up", "pullup"])) {
    return "6-12";
  }

  if (pattern === "isolation") return "12-20";
  if (equipment === "bodyweight" && hasAny(normalizedName, ["plank", "burpee", "mountain climber"])) return "20+";

  return "6-12";
}

export function mapGoal(
  name: string,
  pattern: NormalizedExerciseFields["pattern"],
  equipment: NormalizedExerciseFields["equipment"],
): NormalizedExerciseFields["goal"] {
  const normalizedName = normalizeToken(name);

  if (hasAny(normalizedName, ["handstand", "muscle up", "muscle-up", "planche", "snatch", "clean"])) return "skill";
  if (pattern === "carry" || hasAny(normalizedName, ["jump", "burpee"])) return "endurance";
  if (equipment === "bodyweight" && hasAny(normalizedName, ["plank", "mountain climber"])) return "endurance";
  if (hasAny(normalizedName, ["deadlift", "squat", "bench press", "overhead press"])) return "strength";
  return "hypertrophy";
}

export function mapEgo(
  name: string,
  equipment: NormalizedExerciseFields["equipment"],
  goal: NormalizedExerciseFields["goal"],
): NormalizedExerciseFields["ego"] {
  const normalizedName = normalizeToken(name);

  if (hasAny(normalizedName, ["bench press", "deadlift", "squat", "curl"])) return "high";
  if (hasAny(normalizedName, ["lateral raise", "face pull", "leg curl", "triceps extension"])) return "low";
  if (goal === "strength" && hasAny(equipment, ["barbell", "smith-machine"])) return "high";
  return "medium";
}

export function normalizeExerciseFields(raw: ExerciseDbRaw): NormalizedExerciseFields {
  const equipment = mapEquipment(raw.equipment ?? null);
  const muscle = mapMuscle({ target: raw.target ?? null, bodyPart: raw.bodyPart ?? null });
  const movement = mapMovement({ muscle, name: raw.name });
  const pattern = mapPattern(raw.name, movement);
  const reps = mapReps(raw.name, pattern, equipment);
  const goal = mapGoal(raw.name, pattern, equipment);
  const ego = mapEgo(raw.name, equipment, goal);

  return {
    muscle,
    equipment,
    movement,
    pattern,
    reps,
    goal,
    ego,
  };
}
