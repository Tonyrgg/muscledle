import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { mapEgo, mapEquipment, mapGoal, mapMovement, mapMuscle, mapPattern, mapReps } from "../src/lib/exercise-enrichment/normalize";
import { EGO_VALUES, EQUIPMENT_VALUES, GOAL_VALUES, MOVEMENT_VALUES, MUSCLE_GROUP_VALUES, MUSCLE_VALUES, PATTERN_VALUES, REPS_VALUES } from "../src/lib/exercises/schema";

type LiveExerciseRow = {
  id: string;
  slug: string;
  name: string;
  muscle_group: string | null;
  muscle: string[] | null;
  equipment: string[] | null;
  movement: string[] | null;
  pattern: string[] | null;
  reps: string[] | null;
  goal: string[] | null;
  ego: string[] | null;
};

type EnrichmentRow = {
  exercise_slug: string;
  raw_equipment: string | null;
  raw_body_part: string | null;
  raw_target: string | null;
  normalized_muscle: string | null;
  normalized_equipment: string | null;
  normalized_movement: string | null;
  normalized_pattern: string | null;
  normalized_reps: string | null;
  normalized_goal: string | null;
  normalized_ego: string | null;
};

type CanonicalAttributes = {
  muscle_group: (typeof MUSCLE_GROUP_VALUES)[number];
  muscle: string[];
  equipment: string[];
  movement: string[];
  pattern: string[];
  reps: string[];
  goal: string[];
  ego: string[];
};

type Args = {
  dryRun: boolean;
};

const ALLOWED = {
  muscle: new Set(MUSCLE_VALUES),
  muscleGroup: new Set(MUSCLE_GROUP_VALUES),
  equipment: new Set(EQUIPMENT_VALUES),
  movement: new Set(MOVEMENT_VALUES),
  pattern: new Set(PATTERN_VALUES),
  reps: new Set(REPS_VALUES),
  goal: new Set(GOAL_VALUES),
  ego: new Set(EGO_VALUES),
} as const;

function parseArgs(): Args {
  const args = process.argv.slice(2);
  return {
    dryRun: !args.includes("--apply"),
  };
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s-]+/g, "-");
}

function uniq<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function normalizeMuscleValues(values: string[] | null): string[] {
  const mapped = (values ?? []).map((value) => {
    const token = normalizeToken(value);
    if (token === "biceps" || token === "triceps" || token === "forearms") return "arms";
    if (token === "glutes") return "legs";
    if (token === "full-body" || token === "fullbody") return "core";
    return token;
  });

  return uniq(mapped.filter((value): value is (typeof MUSCLE_VALUES)[number] => ALLOWED.muscle.has(value as (typeof MUSCLE_VALUES)[number])));
}

function normalizeEquipmentValues(values: string[] | null): string[] {
  const mapped = (values ?? []).map((value) => {
    const token = normalizeToken(value);
    if (token === "dumbbell") return "dumbbells";
    if (token === "body-weight" || token === "assisted-body-weight") return "bodyweight";
    if (token === "smith-machine" || token === "bench") return "machine";
    if (token === "ez-bar" || token === "ez-barbell") return "barbell";
    if (token === "resistance-band" || token === "band") return "cable";
    return token;
  });

  return uniq(mapped.filter((value): value is (typeof EQUIPMENT_VALUES)[number] => ALLOWED.equipment.has(value as (typeof EQUIPMENT_VALUES)[number])));
}

function normalizeMovementValues(values: string[] | null): string[] {
  const mapped = (values ?? []).map((value) => {
    const token = normalizeToken(value);
    if (token === "legs" || token === "leg") return "push";
    return token;
  });
  return uniq(mapped.filter((value): value is (typeof MOVEMENT_VALUES)[number] => ALLOWED.movement.has(value as (typeof MOVEMENT_VALUES)[number])));
}

function normalizePatternValues(values: string[] | null): string[] {
  const mapped = (values ?? []).map((value) => {
    const token = normalizeToken(value);
    if (token === "isolation") return "horizontal";
    if (token === "rotation") return "horizontal";
    if (token === "carry") return "vertical";
    return token;
  });
  return uniq(mapped.filter((value): value is (typeof PATTERN_VALUES)[number] => ALLOWED.pattern.has(value as (typeof PATTERN_VALUES)[number])));
}

function normalizeRepsValues(values: string[] | null): string[] {
  const mapped = (values ?? []).map((value) => {
    const token = normalizeToken(value);
    if (token === "12-20" || token === "20+") return "12+";
    return token;
  });
  return uniq(mapped.filter((value): value is (typeof REPS_VALUES)[number] => ALLOWED.reps.has(value as (typeof REPS_VALUES)[number])));
}

function normalizeGoalValues(values: string[] | null): string[] {
  const mapped = (values ?? []).map((value) => normalizeToken(value));
  return uniq(mapped.filter((value): value is (typeof GOAL_VALUES)[number] => ALLOWED.goal.has(value as (typeof GOAL_VALUES)[number])));
}

function normalizeEgoValues(values: string[] | null): string[] {
  const mapped = (values ?? []).map((value) => normalizeToken(value));
  return uniq(mapped.filter((value): value is (typeof EGO_VALUES)[number] => ALLOWED.ego.has(value as (typeof EGO_VALUES)[number])));
}

function normalizeMuscleGroupValue(value: string | null): (typeof MUSCLE_GROUP_VALUES)[number] | null {
  if (!value) return null;
  const token = normalizeToken(value);
  return ALLOWED.muscleGroup.has(token as (typeof MUSCLE_GROUP_VALUES)[number])
    ? (token as (typeof MUSCLE_GROUP_VALUES)[number])
    : null;
}

function inferCanonicalMovement(row: Pick<LiveExerciseRow, "slug" | "name">): (typeof MOVEMENT_VALUES)[number] | null {
  const source = `${row.slug} ${row.name}`.toLowerCase();

  if (/\b(plank|crunch|woodchop|rollout|twist|hollow|leg-raise)\b/.test(source)) return "core";
  if (/\b(curl|raise|fly|pushdown|kickback|shrug)\b/.test(source)) return "isolation";
  if (/\b(row|pull-up|chin-up|pulldown|deadlift|rdl|hyperextension|face-pull)\b/.test(source)) return "pull";
  if (/\b(squat|lunge|press|dip|push-up|step-up|hip-thrust)\b/.test(source)) return "push";

  return null;
}

function inferCanonicalEquipment(row: Pick<LiveExerciseRow, "slug" | "name">): (typeof EQUIPMENT_VALUES)[number] | null {
  const source = `${row.slug} ${row.name}`.toLowerCase();

  if (/\bbarbell\b|\bez[-\s]?bar\b/.test(source)) return "barbell";
  if (/\bdumbbell(s)?\b|\bdb\b/.test(source)) return "dumbbells";
  if (/\bkettlebell\b/.test(source)) return "kettlebell";
  if (/\bcable\b/.test(source)) return "cable";
  if (/\bmachine\b|\bleg[-\s]?press\b|\bsmith\b/.test(source)) return "machine";
  if (/\bbodyweight\b|\bpull-up\b|\bpush-up\b|\bplank\b|\bdip\b/.test(source)) return "bodyweight";

  return null;
}

function hasExplicitEquipmentKeyword(row: Pick<LiveExerciseRow, "slug" | "name">): boolean {
  const source = `${row.slug} ${row.name}`.toLowerCase();
  return /\b(barbell|ez[-\s]?bar|dumbbell|kettlebell|cable|machine|smith|bodyweight|pull-up|push-up|dip|plank)\b/.test(
    source,
  );
}

function applyHighConfidenceOverrides(
  row: Pick<LiveExerciseRow, "slug" | "name">,
  next: CanonicalAttributes,
): CanonicalAttributes {
  const source = `${row.slug} ${row.name}`.toLowerCase();

  if (/\b(chin-up|pull-up)\b/.test(source)) {
    return {
      ...next,
      muscle_group: "back" as const,
      muscle: ["back", "arms"],
      equipment: ["bodyweight"],
      movement: ["pull"],
      pattern: ["vertical"],
    };
  }

  if (/\b(deadlift|rdl)\b/.test(source)) {
    return {
      ...next,
      muscle_group: "legs" as const,
      movement: ["pull"],
      pattern: ["hinge"],
    };
  }

  if (/\bseated\s+bench\s+press\b/.test(source)) {
    return {
      ...next,
      muscle_group: "chest" as const,
      muscle: ["chest"],
      movement: ["push"],
      pattern: ["horizontal"],
    };
  }

  if (/\bplank\b/.test(source)) {
    return {
      ...next,
      muscle_group: "core" as const,
      muscle: ["core"],
      equipment: ["bodyweight"],
      movement: ["core"],
      pattern: ["horizontal"],
    };
  }

  if (/\b(russian-twist|twist|woodchop|crunch|rollout)\b/.test(source)) {
    return {
      ...next,
      muscle_group: "core" as const,
      muscle: ["core"],
      movement: ["core"],
    };
  }

  return next;
}

function deriveMuscleGroupFromMuscle(
  muscles: string[],
  fallback: (typeof MUSCLE_GROUP_VALUES)[number] | null,
): (typeof MUSCLE_GROUP_VALUES)[number] {
  const set = new Set(muscles);

  if (fallback && set.has(fallback)) return fallback;
  if (muscles.length > 1 && fallback) return fallback;

  if (set.has("chest")) return "chest";
  if (set.has("back")) return "back";
  if (set.has("legs")) return "legs";
  if (set.has("shoulders")) return "shoulders";
  if (set.has("arms")) return "arms";
  if (set.has("core")) return "core";
  return fallback ?? "core";
}

function fromEnrichment(row: LiveExerciseRow, enrichment: EnrichmentRow | undefined) {
  const normalizedMuscle = enrichment?.normalized_muscle;
  const normalizedEquipment = enrichment?.normalized_equipment;
  const normalizedMovement = enrichment?.normalized_movement;
  const normalizedPattern = enrichment?.normalized_pattern;
  const normalizedReps = enrichment?.normalized_reps;
  const normalizedGoal = enrichment?.normalized_goal;
  const normalizedEgo = enrichment?.normalized_ego;

  const muscle =
    normalizedMuscle === "biceps" || normalizedMuscle === "triceps" || normalizedMuscle === "forearms"
      ? ["arms"]
      : normalizedMuscle === "glutes"
        ? ["legs"]
        : normalizedMuscle === "full-body"
          ? ["core", "legs"]
          : normalizedMuscle && ALLOWED.muscle.has(normalizedMuscle as (typeof MUSCLE_VALUES)[number])
            ? [normalizedMuscle]
            : [];

  const equipmentMap: Record<string, string> = {
    barbell: "barbell",
    dumbbells: "dumbbells",
    machine: "machine",
    cable: "cable",
    bodyweight: "bodyweight",
    kettlebell: "kettlebell",
    "smith-machine": "machine",
    "ez-bar": "barbell",
    band: "cable",
    bench: "machine",
    other: "bodyweight",
  };
  const equipmentToken = normalizedEquipment ? equipmentMap[normalizedEquipment] : null;
  const equipment = equipmentToken && ALLOWED.equipment.has(equipmentToken as (typeof EQUIPMENT_VALUES)[number]) ? [equipmentToken] : [];

  const movement =
    normalizedMovement === "core"
      ? ["core"]
      : normalizedPattern === "isolation"
        ? ["isolation"]
        : normalizedMovement === "pull"
          ? ["pull"]
          : normalizedMovement === "push" || normalizedMovement === "legs"
            ? ["push"]
            : [];

  const patternCandidate =
    normalizedPattern === "horizontal" ||
    normalizedPattern === "vertical" ||
    normalizedPattern === "squat" ||
    normalizedPattern === "hinge"
      ? normalizedPattern
      : normalizedPattern === "rotation"
        ? "horizontal"
        : normalizedPattern === "carry"
          ? "vertical"
          : normalizedPattern === "isolation"
            ? row.name.toLowerCase().includes("raise")
              ? "vertical"
              : "horizontal"
            : normalizedMovement === "legs"
              ? "squat"
              : "horizontal";
  const pattern = ALLOWED.pattern.has(patternCandidate as (typeof PATTERN_VALUES)[number]) ? [patternCandidate] : [];

  const repsCandidate = normalizedReps === "12-20" || normalizedReps === "20+" ? "12+" : normalizedReps;
  const reps = repsCandidate && ALLOWED.reps.has(repsCandidate as (typeof REPS_VALUES)[number]) ? [repsCandidate] : [];

  const goal = normalizedGoal && ALLOWED.goal.has(normalizedGoal as (typeof GOAL_VALUES)[number]) ? [normalizedGoal] : [];
  const ego = normalizedEgo && ALLOWED.ego.has(normalizedEgo as (typeof EGO_VALUES)[number]) ? [normalizedEgo] : [];

  return { muscle, equipment, movement, pattern, reps, goal, ego };
}

function inferFromNameAndRaw(row: LiveExerciseRow, enrichment: EnrichmentRow | undefined) {
  const rawEquipment = enrichment?.raw_equipment ?? row.equipment?.[0] ?? null;
  const rawBodyPart = enrichment?.raw_body_part ?? null;
  const rawTarget = enrichment?.raw_target ?? null;

  const normalizedEquipment = mapEquipment(rawEquipment);
  const normalizedMuscle = mapMuscle({
    target: rawTarget,
    bodyPart: rawBodyPart,
  });
  const normalizedMovement = mapMovement({
    muscle: normalizedMuscle,
    name: row.name,
  });
  const normalizedPattern = mapPattern(row.name, normalizedMovement);
  const normalizedReps = mapReps(row.name, normalizedPattern, normalizedEquipment);
  const normalizedGoal = mapGoal(row.name, normalizedPattern, normalizedEquipment);
  const normalizedEgo = mapEgo(row.name, normalizedEquipment, normalizedGoal);

  return fromEnrichment(row, {
    exercise_slug: row.slug,
    raw_equipment: rawEquipment,
    raw_body_part: rawBodyPart,
    raw_target: rawTarget,
    normalized_muscle: normalizedMuscle,
    normalized_equipment: normalizedEquipment,
    normalized_movement: normalizedMovement,
    normalized_pattern: normalizedPattern,
    normalized_reps: normalizedReps,
    normalized_goal: normalizedGoal,
    normalized_ego: normalizedEgo,
  });
}

function mergeValues(existing: string[], preferred: string[], fallback: string[]): string[] {
  if (existing.length > 0) return existing;
  if (preferred.length > 0) return preferred;
  if (fallback.length > 0) return fallback;
  return [];
}

async function main() {
  const { dryRun } = parseArgs();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: liveRows, error: liveError } = await supabase
    .from("exercises")
    .select("id, slug, name, muscle_group, muscle, equipment, movement, pattern, reps, goal, ego")
    .eq("is_live", true)
    .returns<LiveExerciseRow[]>();
  if (liveError) throw new Error(`Failed to load live exercises: ${liveError.message}`);

  const slugs = (liveRows ?? []).map((row) => row.slug);
  const { data: enrichmentRows, error: enrichmentError } = await supabase
    .from("exercise_enrichment")
    .select(
      "exercise_slug, raw_equipment, raw_body_part, raw_target, normalized_muscle, normalized_equipment, normalized_movement, normalized_pattern, normalized_reps, normalized_goal, normalized_ego",
    )
    .in("exercise_slug", slugs)
    .returns<EnrichmentRow[]>();
  if (enrichmentError) throw new Error(`Failed to load enrichment: ${enrichmentError.message}`);

  const enrichmentBySlug = new Map((enrichmentRows ?? []).map((row) => [row.exercise_slug, row]));

  const updates: Array<{
    id: string;
    slug: string;
    muscle_group: (typeof MUSCLE_GROUP_VALUES)[number];
    muscle: string[];
    equipment: string[];
    movement: string[];
    pattern: string[];
    reps: string[];
    goal: string[];
    ego: string[];
  }> = [];

  let invalidBefore = 0;
  let invalidAfter = 0;

  for (const row of liveRows ?? []) {
    const enrichment = enrichmentBySlug.get(row.slug);
    const existing = {
      muscleGroup: normalizeMuscleGroupValue(row.muscle_group),
      muscle: normalizeMuscleValues(row.muscle),
      equipment: normalizeEquipmentValues(row.equipment),
      movement: normalizeMovementValues(row.movement),
      pattern: normalizePatternValues(row.pattern),
      reps: normalizeRepsValues(row.reps),
      goal: normalizeGoalValues(row.goal),
      ego: normalizeEgoValues(row.ego),
    };

    const preferred = fromEnrichment(row, enrichment);
    const inferred = inferFromNameAndRaw(row, enrichment);

    const canonicalEquipment = inferCanonicalEquipment(row);
    let next: CanonicalAttributes = {
      muscle_group: existing.muscleGroup ?? "core",
      muscle: mergeValues(existing.muscle, preferred.muscle, inferred.muscle),
      equipment:
        existing.equipment.length > 0
          ? existing.equipment
          : canonicalEquipment
            ? [canonicalEquipment]
            : mergeValues(existing.equipment, preferred.equipment, inferred.equipment),
      movement: mergeValues(existing.movement, preferred.movement, inferred.movement),
      pattern: mergeValues(existing.pattern, preferred.pattern, inferred.pattern),
      reps: mergeValues(existing.reps, preferred.reps, inferred.reps),
      goal: mergeValues(existing.goal, preferred.goal, inferred.goal),
      ego: mergeValues(existing.ego, preferred.ego, inferred.ego),
    };

    const canonicalMovement = inferCanonicalMovement(row);
    if (
      canonicalMovement &&
      next.movement.length > 0 &&
      next.movement[0] !== canonicalMovement &&
      (canonicalMovement === "pull" || canonicalMovement === "core" || canonicalMovement === "isolation")
    ) {
      next = {
        ...next,
        movement: [canonicalMovement],
      };
    }

    if (canonicalEquipment && hasExplicitEquipmentKeyword(row) && next.equipment[0] !== canonicalEquipment) {
      next = {
        ...next,
        equipment: [canonicalEquipment],
      };
    }

    next = applyHighConfidenceOverrides(row, next);

    next = {
      ...next,
      muscle_group: deriveMuscleGroupFromMuscle(next.muscle, existing.muscleGroup),
    };

    const wasInvalid =
      existing.muscle.length === 0 ||
      existing.equipment.length === 0 ||
      existing.movement.length === 0 ||
      existing.pattern.length === 0 ||
      existing.reps.length === 0 ||
      existing.goal.length === 0 ||
      existing.ego.length === 0;
    if (wasInvalid) invalidBefore += 1;

    const stillInvalid =
      next.muscle.length === 0 ||
      next.equipment.length === 0 ||
      next.movement.length === 0 ||
      next.pattern.length === 0 ||
      next.reps.length === 0 ||
      next.goal.length === 0 ||
      next.ego.length === 0;
    if (stillInvalid) invalidAfter += 1;

    const changed =
      row.muscle_group !== next.muscle_group ||
      JSON.stringify(row.muscle ?? []) !== JSON.stringify(next.muscle) ||
      JSON.stringify(row.equipment ?? []) !== JSON.stringify(next.equipment) ||
      JSON.stringify(row.movement ?? []) !== JSON.stringify(next.movement) ||
      JSON.stringify(row.pattern ?? []) !== JSON.stringify(next.pattern) ||
      JSON.stringify(row.reps ?? []) !== JSON.stringify(next.reps) ||
      JSON.stringify(row.goal ?? []) !== JSON.stringify(next.goal) ||
      JSON.stringify(row.ego ?? []) !== JSON.stringify(next.ego);

    if (changed) {
      updates.push({
        id: row.id,
        slug: row.slug,
        ...next,
      });
    }
  }

  const summary = {
    liveTotal: (liveRows ?? []).length,
    invalidBefore,
    invalidAfter,
    rowsToUpdate: updates.length,
    dryRun,
    sample: updates.slice(0, 12).map((row) => ({
      slug: row.slug,
      muscle_group: row.muscle_group,
      muscle: row.muscle,
      equipment: row.equipment,
      movement: row.movement,
      pattern: row.pattern,
      reps: row.reps,
      goal: row.goal,
      ego: row.ego,
    })),
  };
  console.log(JSON.stringify(summary, null, 2));

  if (dryRun) return;

  for (const row of updates) {
    const { error } = await supabase
      .from("exercises")
      .update({
        muscle_group: row.muscle_group,
        muscle: row.muscle,
        equipment: row.equipment,
        movement: row.movement,
        pattern: row.pattern,
        reps: row.reps,
        goal: row.goal,
        ego: row.ego,
      })
      .eq("id", row.id);

    if (error) throw new Error(`Failed to update ${row.slug}: ${error.message}`);
  }

  console.log(JSON.stringify({ ok: true, updated: updates.length }, null, 2));
}

main().catch((error) => {
  console.error("[backfill-live-attributes] fatal", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
