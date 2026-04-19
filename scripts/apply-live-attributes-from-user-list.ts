import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const RAW_LIST = `
Ab Wheel Rollout: muscle_group=core - muscle=core - equipment=bodyweight - movement=core - pattern=horizontal - reps=6-12 - goal=skill - ego=medium
Alternate Lateral Pulldown: muscle_group=back - muscle=back - equipment=cable - movement=pull - pattern=vertical - reps=6-12 - goal=hypertrophy - ego=medium
Arnold Press: muscle_group=shoulders - muscle=shoulders - equipment=dumbbells - movement=push - pattern=vertical - reps=6-12 - goal=hypertrophy - ego=medium
Back Extension: muscle_group=back - muscle=back, legs - equipment=bodyweight - movement=pull - pattern=hinge - reps=12+ - goal=endurance - ego=low
Barbell Alternate Biceps Curl: muscle_group=arms - muscle=arms - equipment=barbell - movement=isolation - pattern=horizontal - reps=12+ - goal=hypertrophy - ego=medium
Barbell Bench Front Squat: muscle_group=legs - muscle=legs - equipment=barbell - movement=push - pattern=squat - reps=6-12 - goal=strength - ego=high
Barbell Bent Over Row: muscle_group=back - muscle=back - equipment=barbell - movement=pull - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=medium
Barbell Clean and press: muscle_group=shoulders - muscle=shoulders, legs - equipment=barbell - movement=push - pattern=vertical - reps=6-12 - goal=skill - ego=high
Barbell Clean-grip Front Squat: muscle_group=legs - muscle=legs - equipment=barbell - movement=push - pattern=squat - reps=6-12 - goal=skill - ego=high
Barbell Close-grip Bench Press: muscle_group=arms - muscle=arms, chest - equipment=barbell - movement=push - pattern=horizontal - reps=6-12 - goal=strength - ego=high
Barbell Deadlift: muscle_group=legs - muscle=legs, back - equipment=barbell - movement=pull - pattern=hinge - reps=1-5 - goal=strength - ego=high
Barbell Decline Wide-grip Press: muscle_group=chest - muscle=chest - equipment=barbell - movement=push - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=medium
Barbell Front Raise: muscle_group=shoulders - muscle=shoulders - equipment=barbell - movement=isolation - pattern=vertical - reps=12+ - goal=hypertrophy - ego=medium
Barbell Glute Bridge Two Legs On Bench (male): muscle_group=legs - muscle=legs - equipment=barbell - movement=push - pattern=hinge - reps=6-12 - goal=hypertrophy - ego=medium
Barbell Good Morning: muscle_group=legs - muscle=legs, back - equipment=barbell - movement=pull - pattern=hinge - reps=6-12 - goal=hypertrophy - ego=medium
Barbell Incline Reverse-grip Press: muscle_group=chest - muscle=chest, arms - equipment=barbell - movement=push - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=medium
Barbell Incline Shoulder Raise: muscle_group=shoulders - muscle=shoulders - equipment=barbell - movement=isolation - pattern=vertical - reps=12+ - goal=hypertrophy - ego=medium
Barbell Jm Bench Press: muscle_group=arms - muscle=arms, chest - equipment=barbell - movement=push - pattern=horizontal - reps=6-12 - goal=strength - ego=high
Barbell Jump Squat: muscle_group=legs - muscle=legs - equipment=barbell - movement=push - pattern=squat - reps=6-12 - goal=endurance - ego=high
Barbell Lying Close-grip Triceps Extension: muscle_group=arms - muscle=arms - equipment=barbell - movement=isolation - pattern=horizontal - reps=12+ - goal=hypertrophy - ego=low
Barbell Lying Extension: muscle_group=arms - muscle=arms - equipment=barbell - movement=isolation - pattern=horizontal - reps=12+ - goal=hypertrophy - ego=medium
Barbell Narrow Stance Squat: muscle_group=legs - muscle=legs - equipment=barbell - movement=push - pattern=squat - reps=6-12 - goal=strength - ego=high
Barbell One Arm Side Deadlift: muscle_group=legs - muscle=legs, core - equipment=barbell - movement=pull - pattern=hinge - reps=6-12 - goal=strength - ego=high
Barbell Rear Delt Row: muscle_group=shoulders - muscle=shoulders, back - equipment=barbell - movement=pull - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=medium
Barbell Reverse Wrist Curl: muscle_group=arms - muscle=arms - equipment=barbell - movement=isolation - pattern=horizontal - reps=12+ - goal=hypertrophy - ego=low
Barbell Rollerout From Bench: muscle_group=core - muscle=core - equipment=barbell - movement=core - pattern=horizontal - reps=6-12 - goal=skill - ego=medium
Barbell Seated Behind Head Military Press: muscle_group=shoulders - muscle=shoulders - equipment=barbell - movement=push - pattern=vertical - reps=6-12 - goal=hypertrophy - ego=medium
Barbell Seated Calf Raise: muscle_group=legs - muscle=legs - equipment=barbell - movement=isolation - pattern=vertical - reps=12+ - goal=hypertrophy - ego=medium
Barbell Wide-grip Upright Row: muscle_group=shoulders - muscle=shoulders, arms - equipment=barbell - movement=pull - pattern=vertical - reps=6-12 - goal=hypertrophy - ego=medium
Bench Press: muscle_group=chest - muscle=chest - equipment=barbell - movement=push - pattern=horizontal - reps=6-12 - goal=strength - ego=high
Bench Press Narrow Grip: muscle_group=arms - muscle=arms, chest - equipment=barbell - movement=push - pattern=horizontal - reps=6-12 - goal=strength - ego=high
Bicep Curl: muscle_group=arms - muscle=arms - equipment=dumbbells - movement=isolation - pattern=horizontal - reps=12+ - goal=hypertrophy - ego=medium
Bodyweight Biceps Curl: muscle_group=arms - muscle=arms - equipment=bodyweight - movement=isolation - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=medium
Bulgarian Split Squat: muscle_group=legs - muscle=legs - equipment=dumbbells - movement=push - pattern=squat - reps=6-12 - goal=hypertrophy - ego=medium
Cable Alternate Shoulder Press: muscle_group=shoulders - muscle=shoulders - equipment=cable - movement=push - pattern=vertical - reps=6-12 - goal=hypertrophy - ego=medium
Cable Alternate Triceps Extension: muscle_group=arms - muscle=arms - equipment=cable - movement=isolation - pattern=horizontal - reps=12+ - goal=hypertrophy - ego=low
Cable Bench Press: muscle_group=chest - muscle=chest - equipment=cable - movement=push - pattern=horizontal - reps=6-12 - goal=strength - ego=high
Cable Cross-over Reverse Fly: muscle_group=shoulders - muscle=shoulders - equipment=cable - movement=isolation - pattern=horizontal - reps=12+ - goal=hypertrophy - ego=medium
Cable Cross-over Variation: muscle_group=chest - muscle=chest - equipment=cable - movement=push - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=medium
Cable Crossover: muscle_group=chest - muscle=chest - equipment=cable - movement=isolation - pattern=horizontal - reps=12+ - goal=hypertrophy - ego=low
Cable Crunch: muscle_group=core - muscle=core - equipment=cable - movement=core - pattern=horizontal - reps=12+ - goal=hypertrophy - ego=low
Cable Deadlift: muscle_group=legs - muscle=legs, back - equipment=cable - movement=pull - pattern=hinge - reps=6-12 - goal=strength - ego=high
Cable Decline Fly: muscle_group=chest - muscle=chest - equipment=cable - movement=isolation - pattern=horizontal - reps=12+ - goal=hypertrophy - ego=medium
Cable Front Raise: muscle_group=shoulders - muscle=shoulders - equipment=cable - movement=isolation - pattern=vertical - reps=12+ - goal=hypertrophy - ego=medium
Cable Hammer Curl (with Rope): muscle_group=arms - muscle=arms - equipment=cable - movement=isolation - pattern=horizontal - reps=12+ - goal=hypertrophy - ego=medium
Cable Incline Pushdown: muscle_group=back - muscle=back - equipment=cable - movement=pull - pattern=vertical - reps=12+ - goal=hypertrophy - ego=medium
Cable Kneeling Crunch: muscle_group=core - muscle=core - equipment=cable - movement=core - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=medium
Cable Lateral Raise: muscle_group=shoulders - muscle=shoulders - equipment=cable - movement=isolation - pattern=vertical - reps=12+ - goal=hypertrophy - ego=low
Cable Rear Delt Row (stirrups): muscle_group=shoulders - muscle=shoulders, back - equipment=cable - movement=pull - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=medium
Cable Rear Delt Row (with Rope): muscle_group=shoulders - muscle=shoulders, back - equipment=cable - movement=pull - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=medium
Cable Reverse Grip Triceps Pushdown (sz-bar) (with Arm Blaster): muscle_group=arms - muscle=arms - equipment=cable - movement=isolation - pattern=vertical - reps=12+ - goal=hypertrophy - ego=medium
Cable Standing Pulldown (with Rope): muscle_group=back - muscle=back, arms - equipment=cable - movement=pull - pattern=vertical - reps=6-12 - goal=hypertrophy - ego=medium
Cable Woodchopper: muscle_group=core - muscle=core - equipment=cable - movement=core - pattern=vertical - reps=12+ - goal=endurance - ego=low
Calf Press Using Leg Press Machine: muscle_group=legs - muscle=legs - equipment=machine - movement=isolation - pattern=vertical - reps=12+ - goal=hypertrophy - ego=medium
Calf Raise using Hack Squat Machine: muscle_group=legs - muscle=legs - equipment=machine - movement=isolation - pattern=vertical - reps=12+ - goal=hypertrophy - ego=medium
Chest Dips: muscle_group=chest - muscle=chest, arms - equipment=bodyweight - movement=push - pattern=vertical - reps=6-12 - goal=hypertrophy - ego=medium
Chest Fly: muscle_group=chest - muscle=chest - equipment=dumbbells - movement=isolation - pattern=horizontal - reps=12+ - goal=hypertrophy - ego=medium
Chin Up: muscle_group=back - muscle=back, arms - equipment=bodyweight - movement=pull - pattern=vertical - reps=6-12 - goal=skill - ego=medium
Close-Grip Bench Press: muscle_group=arms - muscle=arms, chest - equipment=barbell - movement=push - pattern=horizontal - reps=6-12 - goal=strength - ego=high
DB Underhand bench press: muscle_group=chest - muscle=chest, arms - equipment=dumbbells - movement=push - pattern=horizontal - reps=6-12 - goal=strength - ego=high
Decline Bench Leg Raise: muscle_group=core - muscle=core, legs - equipment=bodyweight - movement=core - pattern=horizontal - reps=12+ - goal=hypertrophy - ego=medium
Decline Bench Press: muscle_group=chest - muscle=chest - equipment=barbell - movement=push - pattern=horizontal - reps=6-12 - goal=strength - ego=high
Double-Leg Abdominal Press: muscle_group=core - muscle=core, legs - equipment=bodyweight - movement=core - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=medium
Dumbbell Bench Press: muscle_group=chest - muscle=chest - equipment=dumbbells - movement=push - pattern=horizontal - reps=6-12 - goal=strength - ego=high
Dumbbell Bench Seated Press: muscle_group=shoulders - muscle=shoulders - equipment=dumbbells - movement=push - pattern=vertical - reps=6-12 - goal=hypertrophy - ego=medium
Dumbbell Bench Squat: muscle_group=legs - muscle=legs - equipment=dumbbells - movement=push - pattern=squat - reps=6-12 - goal=strength - ego=high
Dumbbell Bicep Curl Lunge With Bowling Motion: muscle_group=arms - muscle=arms, legs - equipment=dumbbells - movement=isolation - pattern=squat - reps=6-12 - goal=hypertrophy - ego=medium
Dumbbell bicep curl to press: muscle_group=shoulders - muscle=shoulders, arms - equipment=dumbbells - movement=push - pattern=vertical - reps=6-12 - goal=hypertrophy - ego=medium
Dumbbell Row: muscle_group=back - muscle=back - equipment=dumbbells - movement=pull - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=medium
Elbows Tucked DB Bench Press: muscle_group=chest - muscle=chest, arms - equipment=dumbbells - movement=push - pattern=horizontal - reps=6-12 - goal=strength - ego=high
Face Pull: muscle_group=shoulders - muscle=shoulders, back - equipment=cable - movement=pull - pattern=horizontal - reps=12+ - goal=hypertrophy - ego=low
Front Raise: muscle_group=shoulders - muscle=shoulders - equipment=dumbbells - movement=isolation - pattern=vertical - reps=12+ - goal=hypertrophy - ego=medium
Hammer Curl: muscle_group=arms - muscle=arms - equipment=dumbbells - movement=isolation - pattern=horizontal - reps=12+ - goal=hypertrophy - ego=medium
Hanging Leg Raise: muscle_group=core - muscle=core - equipment=bodyweight - movement=core - pattern=vertical - reps=12+ - goal=skill - ego=medium
Incline Dumbbell Press: muscle_group=chest - muscle=chest - equipment=dumbbells - movement=push - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=medium
Kettlebell One Legged Deadlift: muscle_group=legs - muscle=legs, core - equipment=kettlebell - movement=pull - pattern=hinge - reps=6-12 - goal=strength - ego=high
Lat Pulldown: muscle_group=back - muscle=back - equipment=machine - movement=pull - pattern=vertical - reps=6-12 - goal=hypertrophy - ego=medium
Leg Curl: muscle_group=legs - muscle=legs - equipment=machine - movement=isolation - pattern=hinge - reps=12+ - goal=hypertrophy - ego=low
Leg Extension: muscle_group=legs - muscle=legs - equipment=machine - movement=isolation - pattern=squat - reps=12+ - goal=hypertrophy - ego=low
Leg Press: muscle_group=legs - muscle=legs - equipment=machine - movement=push - pattern=squat - reps=6-12 - goal=hypertrophy - ego=high
Lunges: muscle_group=legs - muscle=legs - equipment=bodyweight - movement=push - pattern=squat - reps=12+ - goal=endurance - ego=low
Machine Chest Press: muscle_group=chest - muscle=chest - equipment=machine - movement=push - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=medium
Military Press: muscle_group=shoulders - muscle=shoulders - equipment=barbell - movement=push - pattern=vertical - reps=6-12 - goal=strength - ego=high
Overhead Tricep Extension: muscle_group=arms - muscle=arms - equipment=dumbbells - movement=isolation - pattern=vertical - reps=12+ - goal=hypertrophy - ego=low
Plank: muscle_group=core - muscle=core - equipment=bodyweight - movement=core - pattern=horizontal - reps=12+ - goal=endurance - ego=low
Pull-Up: muscle_group=back - muscle=back, arms - equipment=bodyweight - movement=pull - pattern=vertical - reps=6-12 - goal=skill - ego=high
Push-Up: muscle_group=chest - muscle=chest, shoulders - equipment=bodyweight - movement=push - pattern=horizontal - reps=12+ - goal=hypertrophy - ego=low
Reverse Grip Bench Press: muscle_group=chest - muscle=chest, arms - equipment=barbell - movement=push - pattern=horizontal - reps=6-12 - goal=strength - ego=high
Romanian Deadlift: muscle_group=legs - muscle=legs - equipment=dumbbells - movement=pull - pattern=hinge - reps=6-12 - goal=hypertrophy - ego=medium
Russian Twist: muscle_group=core - muscle=core - equipment=dumbbells - movement=core - pattern=horizontal - reps=12+ - goal=endurance - ego=low
Seated Bench Press: muscle_group=chest - muscle=chest - equipment=machine - movement=push - pattern=horizontal - reps=6-12 - goal=strength - ego=high
Seated Cable Row: muscle_group=back - muscle=back - equipment=cable - movement=pull - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=medium
Single Arm Plank to Row: muscle_group=core - muscle=core, back - equipment=bodyweight - movement=core - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=medium
Skull Crusher: muscle_group=arms - muscle=arms - equipment=barbell - movement=isolation - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=high
Squat: muscle_group=legs - muscle=legs - equipment=barbell - movement=push - pattern=squat - reps=1-5 - goal=strength - ego=high
Standing Calf Raise: muscle_group=legs - muscle=legs - equipment=machine - movement=isolation - pattern=vertical - reps=12+ - goal=hypertrophy - ego=low
Sumo Deadlift: muscle_group=legs - muscle=legs, back - equipment=barbell - movement=pull - pattern=hinge - reps=1-5 - goal=strength - ego=high
T-Bar row: muscle_group=back - muscle=back - equipment=barbell - movement=pull - pattern=horizontal - reps=6-12 - goal=hypertrophy - ego=high
Tricep Pushdown: muscle_group=arms - muscle=arms - equipment=cable - movement=isolation - pattern=vertical - reps=12+ - goal=hypertrophy - ego=medium
Upright Row: muscle_group=shoulders - muscle=shoulders, arms - equipment=barbell - movement=pull - pattern=vertical - reps=6-12 - goal=hypertrophy - ego=medium
`;

const MUSCLE_GROUP_VALUES = new Set(["chest", "back", "legs", "shoulders", "arms", "core"]);
const MUSCLE_VALUES = new Set(["chest", "back", "legs", "shoulders", "arms", "core"]);
const EQUIPMENT_VALUES = new Set(["barbell", "dumbbells", "bodyweight", "machine", "cable", "kettlebell"]);
const MOVEMENT_VALUES = new Set(["push", "pull", "isolation", "core"]);
const PATTERN_VALUES = new Set(["horizontal", "vertical", "squat", "hinge"]);
const REPS_VALUES = new Set(["1-5", "6-12", "12+"]);
const GOAL_VALUES = new Set(["strength", "hypertrophy", "endurance", "skill"]);
const EGO_VALUES = new Set(["low", "medium", "high"]);

type ParsedExercise = {
  name: string;
  muscle_group: string;
  muscle: string[];
  equipment: string[];
  movement: string[];
  pattern: string[];
  reps: string[];
  goal: string[];
  ego: string[];
};

function parseList(raw: string): ParsedExercise[] {
  const rows = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return rows.map((line) => {
    const idx = line.indexOf(":");
    if (idx < 0) throw new Error(`Invalid line (missing ':'): ${line}`);
    const name = line.slice(0, idx).trim();
    const properties = line
      .slice(idx + 1)
      .split(" - ")
      .map((part) => part.trim())
      .filter(Boolean);

    const map = new Map<string, string>();
    for (const prop of properties) {
      const pIdx = prop.indexOf("=");
      if (pIdx < 0) throw new Error(`Invalid property on "${name}": ${prop}`);
      map.set(prop.slice(0, pIdx).trim(), prop.slice(pIdx + 1).trim());
    }

    return {
      name,
      muscle_group: normalizeScalar(map.get("muscle_group"), MUSCLE_GROUP_VALUES, "muscle_group", name),
      muscle: normalizeList(map.get("muscle"), MUSCLE_VALUES, "muscle", name),
      equipment: normalizeList(map.get("equipment"), EQUIPMENT_VALUES, "equipment", name),
      movement: normalizeList(map.get("movement"), MOVEMENT_VALUES, "movement", name),
      pattern: normalizeList(map.get("pattern"), PATTERN_VALUES, "pattern", name),
      reps: normalizeList(map.get("reps"), REPS_VALUES, "reps", name),
      goal: normalizeList(map.get("goal"), GOAL_VALUES, "goal", name),
      ego: normalizeList(map.get("ego"), EGO_VALUES, "ego", name),
    };
  });
}

function normalizeToken(value: string): string {
  const v = value.trim().toLowerCase();
  if (v === "dumbbell") return "dumbbells";
  if (v === "none (bodyweight exercise)") return "bodyweight";
  if (v === "barbell, bench") return "barbell";
  return v;
}

function normalizeScalar(
  value: string | undefined,
  allowed: Set<string>,
  field: string,
  exerciseName: string,
): string {
  if (!value) throw new Error(`Missing ${field} for "${exerciseName}"`);
  const token = normalizeToken(value);
  if (!allowed.has(token)) {
    throw new Error(`Invalid ${field}="${value}" for "${exerciseName}"`);
  }
  return token;
}

function normalizeList(
  value: string | undefined,
  allowed: Set<string>,
  field: string,
  exerciseName: string,
): string[] {
  if (!value) throw new Error(`Missing ${field} for "${exerciseName}"`);
  const tokens = value
    .split(",")
    .map((v) => normalizeToken(v))
    .map((v) => (v === "bench" ? "" : v))
    .filter(Boolean);

  const unique = Array.from(new Set(tokens));
  if (unique.length === 0) {
    throw new Error(`Empty ${field} for "${exerciseName}"`);
  }

  for (const token of unique) {
    if (!allowed.has(token)) {
      throw new Error(`Invalid ${field} token="${token}" for "${exerciseName}"`);
    }
  }
  return unique;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const parsed = parseList(RAW_LIST);
  const byName = new Map(parsed.map((row) => [row.name, row]));

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: liveRows, error: liveError } = await supabase
    .from("exercises")
    .select("id, name, is_live, muscle_group, muscle, equipment, movement, pattern, reps, goal, ego")
    .eq("is_live", true);
  if (liveError) throw new Error(`Failed loading live exercises: ${liveError.message}`);

  const missingInList = (liveRows ?? []).filter((row) => !byName.has(row.name)).map((row) => row.name);
  const missingInDb = parsed.filter((row) => !(liveRows ?? []).some((db) => db.name === row.name)).map((row) => row.name);

  if (missingInList.length > 0 || missingInDb.length > 0) {
    throw new Error(
      `Name mismatch. missingInList=${JSON.stringify(missingInList)} missingInDb=${JSON.stringify(missingInDb)}`,
    );
  }

  let updates = 0;
  for (const row of liveRows ?? []) {
    const next = byName.get(row.name)!;

    const patch = {
      muscle_group: next.muscle_group,
      muscle: next.muscle,
      equipment: next.equipment,
      movement: next.movement,
      pattern: next.pattern,
      reps: next.reps,
      goal: next.goal,
      ego: next.ego,
    };

    const changed =
      row.muscle_group !== patch.muscle_group ||
      JSON.stringify(row.muscle ?? []) !== JSON.stringify(patch.muscle) ||
      JSON.stringify(row.equipment ?? []) !== JSON.stringify(patch.equipment) ||
      JSON.stringify(row.movement ?? []) !== JSON.stringify(patch.movement) ||
      JSON.stringify(row.pattern ?? []) !== JSON.stringify(patch.pattern) ||
      JSON.stringify(row.reps ?? []) !== JSON.stringify(patch.reps) ||
      JSON.stringify(row.goal ?? []) !== JSON.stringify(patch.goal) ||
      JSON.stringify(row.ego ?? []) !== JSON.stringify(patch.ego);

    if (!changed) continue;
    updates += 1;

    if (apply) {
      const { error: updateError } = await supabase.from("exercises").update(patch).eq("id", row.id);
      if (updateError) throw new Error(`Failed updating "${row.name}": ${updateError.message}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        apply,
        listTotal: parsed.length,
        liveTotal: (liveRows ?? []).length,
        updates,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[apply-live-attributes-from-user-list] fatal", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

