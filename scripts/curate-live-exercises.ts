import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

type Args = {
  target: number;
  apply: boolean;
  dryRun: boolean;
};

type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
  aliases: string[] | null;
  muscle: string[] | null;
  equipment: string[] | null;
  movement: string[] | null;
  pattern: string[] | null;
  reps: string[] | null;
  goal: string[] | null;
  ego: string[] | null;
  is_live: boolean;
};

type AttemptRow = {
  guess_exercise_id: string;
  user_id: string | null;
};

type ExerciseStats = {
  totalGuesses: number;
  uniqueGuessers: number;
  popularityScore: number;
};

type RankedExercise = {
  row: ExerciseRow;
  stats: ExerciseStats;
  signature: string;
};

const PAGE_SIZE = 1000;

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const targetArg = args.find((item) => item.startsWith("--target="));

  const parsedTarget = targetArg ? Number(targetArg.slice("--target=".length)) : 100;
  const target = Number.isFinite(parsedTarget) && parsedTarget > 0 ? Math.floor(parsedTarget) : 100;

  const apply = args.includes("--apply");
  const dryRun = !apply || args.includes("--dry-run");

  return { target, apply, dryRun };
}

function asSortedList(input: string[] | null): string[] {
  return (input ?? [])
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function buildSignature(row: ExerciseRow): string {
  return [
    asSortedList(row.muscle).join(","),
    asSortedList(row.equipment).join(","),
    asSortedList(row.movement).join(","),
    asSortedList(row.pattern).join(","),
    asSortedList(row.reps).join(","),
    asSortedList(row.goal).join(","),
    asSortedList(row.ego).join(","),
  ].join("|");
}

function tokenize(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function lexicalPopularityBonus(name: string): number {
  const tokens = tokenize(name);
  const tokenSet = new Set(tokens);
  const normalized = ` ${tokens.join(" ")} `;

  const mainstreamTerms = [
    "bench",
    "squat",
    "deadlift",
    "pull up",
    "chin up",
    "push up",
    "row",
    "press",
    "lunge",
    "dip",
    "curl",
    "plank",
    "lat pulldown",
    "hip thrust",
    "leg press",
    "calf raise",
  ];

  const nicheTerms = [
    "isometric",
    "stretch",
    "rotation",
    "twist",
    "wrist",
    "ankle",
    "neck",
    "self assisted",
    "balance board",
    "bosu",
  ];

  let bonus = 0;

  for (const term of mainstreamTerms) {
    const parts = term.split(" ");
    const hasTerm = parts.length === 1 ? tokenSet.has(parts[0]) : normalized.includes(` ${term} `);
    if (hasTerm) bonus += 12;
  }

  for (const term of nicheTerms) {
    const parts = term.split(" ");
    const hasTerm = parts.length === 1 ? tokenSet.has(parts[0]) : normalized.includes(` ${term} `);
    if (hasTerm) bonus -= 10;
  }

  return bonus;
}

function computePopularityScore(row: ExerciseRow, totalGuesses: number, uniqueGuessers: number): number {
  const aliasesBonus = Math.min(5, row.aliases?.length ?? 0);
  const lexicalBonus = lexicalPopularityBonus(row.name);
  return totalGuesses * 10 + uniqueGuessers * 30 + aliasesBonus + lexicalBonus;
}

async function fetchExercises(): Promise<ExerciseRow[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rows: ExerciseRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("exercises")
      .select("id, slug, name, aliases, muscle, equipment, movement, pattern, reps, goal, ego, is_live")
      .order("name", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
      .returns<ExerciseRow[]>();

    if (error) throw new Error(`Failed to fetch exercises: ${error.message}`);

    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchAttemptStatsByExerciseId(liveExerciseIds: string[]): Promise<Map<string, { total: number; uniqueGuessers: Set<string> }>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const stats = new Map<string, { total: number; uniqueGuessers: Set<string> }>();
  for (const id of liveExerciseIds) {
    stats.set(id, { total: 0, uniqueGuessers: new Set<string>() });
  }

  const chunkSize = 120;
  for (let i = 0; i < liveExerciseIds.length; i += chunkSize) {
    const chunkIds = liveExerciseIds.slice(i, i + chunkSize);
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("game_attempts")
        .select("guess_exercise_id, user_id")
        .in("guess_exercise_id", chunkIds)
        .range(from, from + PAGE_SIZE - 1)
        .returns<AttemptRow[]>();

      if (error) throw new Error(`Failed to fetch game_attempts: ${error.message}`);

      const page = data ?? [];
      for (const row of page) {
        const bucket = stats.get(row.guess_exercise_id);
        if (!bucket) continue;
        bucket.total += 1;
        if (row.user_id) bucket.uniqueGuessers.add(row.user_id);
      }

      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }

  return stats;
}

function rankExercises(rows: ExerciseRow[], attemptStats: Map<string, { total: number; uniqueGuessers: Set<string> }>): RankedExercise[] {
  return rows.map((row) => {
    const fromAttempts = attemptStats.get(row.id);
    const totalGuesses = fromAttempts?.total ?? 0;
    const uniqueGuessers = fromAttempts?.uniqueGuessers.size ?? 0;
    const popularityScore = computePopularityScore(row, totalGuesses, uniqueGuessers);

    return {
      row,
      signature: buildSignature(row),
      stats: {
        totalGuesses,
        uniqueGuessers,
        popularityScore,
      },
    };
  });
}

function sortByPopularity(left: RankedExercise, right: RankedExercise): number {
  return (
    right.stats.popularityScore - left.stats.popularityScore ||
    right.stats.uniqueGuessers - left.stats.uniqueGuessers ||
    right.stats.totalGuesses - left.stats.totalGuesses ||
    left.row.name.localeCompare(right.row.name)
  );
}

function chunk<T>(values: T[], chunkSize: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < values.length; i += chunkSize) {
    result.push(values.slice(i, i + chunkSize));
  }
  return result;
}

async function applyLiveSelection(currentLiveIds: string[], keepIds: Set<string>): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const toDisable = currentLiveIds.filter((id) => !keepIds.has(id));
  const toEnable = Array.from(keepIds).filter((id) => !currentLiveIds.includes(id));

  for (const ids of chunk(toDisable, 300)) {
    const { error } = await supabase.from("exercises").update({ is_live: false }).in("id", ids);
    if (error) throw new Error(`Failed to disable exercises: ${error.message}`);
  }

  for (const ids of chunk(toEnable, 300)) {
    const { error } = await supabase.from("exercises").update({ is_live: true }).in("id", ids);
    if (error) throw new Error(`Failed to enable exercises: ${error.message}`);
  }
}

async function main() {
  const { target, apply, dryRun } = parseArgs();

  const allExercises = await fetchExercises();
  const liveExercises = allExercises.filter((item) => item.is_live);
  const nonLiveExercises = allExercises.filter((item) => !item.is_live);

  if (liveExercises.length === 0) {
    console.log("[curate-live] no live exercises found");
    return;
  }

  const attemptStats = await fetchAttemptStatsByExerciseId(allExercises.map((item) => item.id));
  const rankedLive = rankExercises(liveExercises, attemptStats);
  const rankedNonLive = rankExercises(nonLiveExercises, attemptStats).sort(sortByPopularity);

  const bestBySignature = new Map<string, RankedExercise>();
  for (const exercise of rankedLive) {
    const existing = bestBySignature.get(exercise.signature);
    if (!existing || sortByPopularity(exercise, existing) < 0) {
      bestBySignature.set(exercise.signature, exercise);
    }
  }

  const dedupedLive = Array.from(bestBySignature.values()).sort(sortByPopularity);
  const selected: RankedExercise[] = [...dedupedLive];
  const usedSignatures = new Set(selected.map((item) => item.signature));

  if (selected.length < target) {
    for (const candidate of rankedNonLive) {
      if (selected.length >= target) break;
      if (usedSignatures.has(candidate.signature)) continue;
      selected.push(candidate);
      usedSignatures.add(candidate.signature);
    }
  }

  selected.sort(sortByPopularity);
  const finalKeep = selected.slice(0, target);
  const keepIds = new Set(finalKeep.map((item) => item.row.id));

  const removedByFamily = liveExercises.length - dedupedLive.length;
  const removedForTarget = Math.max(0, selected.length - finalKeep.length);
  const enabledFromNonLive = finalKeep.filter((item) => !item.row.is_live).length;
  const unresolvedTargetGap = Math.max(0, target - finalKeep.length);

  const summary = {
    exercisesTotal: allExercises.length,
    liveBefore: liveExercises.length,
    nonLiveAvailable: nonLiveExercises.length,
    uniqueFamiliesFromLive: dedupedLive.length,
    target,
    kept: finalKeep.length,
    enabledFromNonLive,
    removedByFamily,
    removedForTarget,
    unresolvedTargetGap,
    dryRun,
    mode: apply && !dryRun ? "apply" : "dry-run",
    keptPreview: finalKeep.slice(0, 20).map((item) => ({
      slug: item.row.slug,
      name: item.row.name,
      wasLiveBefore: item.row.is_live,
      popularityScore: item.stats.popularityScore,
      totalGuesses: item.stats.totalGuesses,
      uniqueGuessers: item.stats.uniqueGuessers,
    })),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!apply || dryRun) {
    return;
  }

  await applyLiveSelection(
    liveExercises.map((item) => item.id),
    keepIds,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        liveAfter: finalKeep.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[curate-live] fatal", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
