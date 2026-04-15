import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
  is_live: boolean;
  muscle_group: string | null;
  muscle: string[] | null;
  equipment: string[] | null;
  movement: string[] | null;
  pattern: string[] | null;
};

type CuratedFix = {
  slug: string;
  note: string;
  muscle_group?: "chest" | "back" | "legs" | "shoulders" | "arms" | "core";
  muscle?: string[];
  movement?: string[];
  pattern?: string[];
};

const CURATED_FIXES: CuratedFix[] = [
  {
    slug: "seated-bench-press",
    note: "Bench press is chest-dominant.",
    muscle_group: "chest",
    muscle: ["chest"],
    movement: ["push"],
    pattern: ["horizontal"],
  },
  {
    slug: "barbell-bench-press-nb",
    note: "Bench press variant should not be core/legs.",
    muscle_group: "chest",
    muscle: ["chest"],
    movement: ["push"],
    pattern: ["horizontal"],
  },
  {
    slug: "db-underhand-bench-press",
    note: "Underhand bench press remains chest-dominant push.",
    muscle_group: "chest",
    muscle: ["chest"],
    movement: ["push"],
    pattern: ["horizontal"],
  },
  {
    slug: "decline-bench-press-dumbbell",
    note: "Decline dumbbell bench press is chest-focused.",
    muscle_group: "chest",
    muscle: ["chest"],
    movement: ["push"],
    pattern: ["horizontal"],
  },
  {
    slug: "incline-bench-press-barbell",
    note: "Incline barbell bench press is chest-focused.",
    muscle_group: "chest",
    muscle: ["chest"],
    movement: ["push"],
    pattern: ["horizontal"],
  },
  {
    slug: "incline-bench-press-dumbbell",
    note: "Incline dumbbell bench press is chest-focused.",
    muscle_group: "chest",
    muscle: ["chest"],
    movement: ["push"],
    pattern: ["horizontal"],
  },
  {
    slug: "bench-press-narrow-grip",
    note: "Close/narrow grip bench shifts emphasis to triceps (arms).",
    muscle_group: "arms",
    muscle: ["arms", "chest"],
    movement: ["push"],
    pattern: ["horizontal"],
  },
  {
    slug: "barbell-close-grip-bench-press",
    note: "Close-grip bench is triceps-first with chest support.",
    muscle_group: "arms",
    muscle: ["arms", "chest"],
    movement: ["push"],
    pattern: ["horizontal"],
  },
  {
    slug: "bench-dips-on-floor-hd",
    note: "Bench dips are upper-body push, not core/legs primary.",
    muscle_group: "arms",
    muscle: ["arms", "chest"],
    movement: ["push"],
    pattern: ["vertical"],
  },
  {
    slug: "cable-standing-pulldown-with-rope",
    note: "Pulldown should map to back/pull vertical.",
    muscle_group: "back",
    muscle: ["back", "arms"],
    movement: ["pull"],
    pattern: ["vertical"],
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: !args.includes("--apply"),
  };
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

  const slugs = CURATED_FIXES.map((item) => item.slug);
  const { data: rows, error } = await supabase
    .from("exercises")
    .select("id, slug, name, is_live, muscle_group, muscle, equipment, movement, pattern")
    .in("slug", slugs)
    .returns<ExerciseRow[]>();

  if (error) throw new Error(`Failed to load exercises: ${error.message}`);

  const bySlug = new Map((rows ?? []).map((row) => [row.slug, row]));
  const missing = slugs.filter((slug) => !bySlug.has(slug));

  const plan = CURATED_FIXES.flatMap((fix) => {
    const row = bySlug.get(fix.slug);
    if (!row || !row.is_live) return [];

    const next = {
      muscle_group: fix.muscle_group ?? row.muscle_group,
      muscle: fix.muscle ?? row.muscle ?? [],
      movement: fix.movement ?? row.movement ?? [],
      pattern: fix.pattern ?? row.pattern ?? [],
    };

    const changed =
      row.muscle_group !== next.muscle_group ||
      JSON.stringify(row.muscle ?? []) !== JSON.stringify(next.muscle) ||
      JSON.stringify(row.movement ?? []) !== JSON.stringify(next.movement) ||
      JSON.stringify(row.pattern ?? []) !== JSON.stringify(next.pattern);

    if (!changed) return [];

    return [
      {
        id: row.id,
        slug: row.slug,
        name: row.name,
        note: fix.note,
        before: {
          muscle_group: row.muscle_group,
          muscle: row.muscle ?? [],
          movement: row.movement ?? [],
          pattern: row.pattern ?? [],
        },
        after: next,
      },
    ];
  });

  console.log(
    JSON.stringify(
      {
        dryRun,
        curatedTotal: CURATED_FIXES.length,
        liveFound: (rows ?? []).filter((row) => row.is_live).length,
        missing,
        toUpdate: plan.length,
        sample: plan,
      },
      null,
      2,
    ),
  );

  if (dryRun || plan.length === 0) return;

  for (const item of plan) {
    const { error: updateError } = await supabase
      .from("exercises")
      .update({
        muscle_group: item.after.muscle_group,
        muscle: item.after.muscle,
        movement: item.after.movement,
        pattern: item.after.pattern,
      })
      .eq("id", item.id);

    if (updateError) {
      throw new Error(`Failed updating ${item.slug}: ${updateError.message}`);
    }
  }

  console.log(JSON.stringify({ ok: true, updated: plan.length }, null, 2));
}

main().catch((error) => {
  console.error("[curated-live-fixes] fatal", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

