import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { normalizeExerciseFields } from "../src/lib/exercise-enrichment/normalize";
import { searchExerciseDbRawByNameWithMeta } from "../src/lib/exercise-enrichment/providers/exercisedb";
import { buildExerciseDbProxyGifUrl } from "../src/lib/exercise-media/providers/exercisedb";

type Args = {
  targetTotal: number;
  dryRun: boolean;
};

type ExerciseRow = {
  slug: string;
  name: string;
  aliases: string[];
  muscle: string[];
  equipment: string[];
  movement: string[];
  pattern: string[];
  reps: string[];
  goal: string[];
  ego: string[];
  muscle_group: string;
  is_live: boolean;
};

type ExistingExerciseRow = {
  slug: string;
};

type ExerciseDbRaw = {
  id: string | null;
  name: string;
  equipment?: string | null;
  bodyPart?: string | null;
  target?: string | null;
  secondaryMuscles?: string[] | null;
  instructions?: string[] | null;
};

type CuratedCandidate = {
  slug: string;
  row: ExerciseRow;
  raw: ExerciseDbRaw;
  score: number;
};

const SEARCH_QUERIES = [
  "bench",
  "press",
  "incline",
  "decline",
  "push",
  "dip",
  "fly",
  "row",
  "pulldown",
  "pull",
  "chin",
  "shrug",
  "deadlift",
  "romanian",
  "good morning",
  "squat",
  "split squat",
  "lunge",
  "leg press",
  "leg extension",
  "leg curl",
  "calf",
  "hip thrust",
  "glute",
  "adductor",
  "abductor",
  "shoulder press",
  "military press",
  "arnold press",
  "lateral raise",
  "front raise",
  "rear delt",
  "face pull",
  "upright row",
  "curl",
  "hammer curl",
  "preacher curl",
  "tricep",
  "extension",
  "pushdown",
  "skull crusher",
  "plank",
  "crunch",
  "sit up",
  "leg raise",
  "hanging",
  "woodchopper",
  "twist",
  "rotation",
  "russian",
  "ab wheel",
  "mountain climber",
  "burpee",
  "carry",
  "farmer",
  "kettlebell",
  "dumbbell",
  "barbell",
  "cable",
  "machine",
  "smith",
  "landmine",
];

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const targetArg = args.find((item) => item.startsWith("--target="));
  const dryRun = args.includes("--dry-run");

  const parsedTarget = targetArg ? Number(targetArg.slice("--target=".length)) : 200;
  const targetTotal = Number.isFinite(parsedTarget) && parsedTarget > 0 ? Math.floor(parsedTarget) : 200;

  return { targetTotal, dryRun };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function canonicalName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/\bone arm\b|\bsingle arm\b|\bleft\b|\bright\b|\balternating\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildAliases(rawName: string): string[] {
  const base = rawName.toLowerCase().trim();
  const variants = new Set<string>([base]);
  variants.add(base.replace(/-/g, " "));
  variants.add(base.replace(/\s+/g, " "));
  variants.add(base.replace(/\bone arm\b/g, "single arm"));
  variants.add(base.replace(/\bsingle arm\b/g, "one arm"));
  variants.delete("");
  return Array.from(variants).slice(0, 6);
}

function mapToGameplayShape(raw: ExerciseDbRaw): ExerciseRow | null {
  const normalized = normalizeExerciseFields(raw);

  const muscle =
    normalized.muscle === "biceps" || normalized.muscle === "triceps" || normalized.muscle === "forearms"
      ? ["arms"]
      : normalized.muscle === "glutes"
        ? ["legs"]
        : normalized.muscle === "full-body"
          ? ["core", "legs"]
          : [normalized.muscle];

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

  const equipment = [equipmentMap[normalized.equipment] ?? "bodyweight"];

  const pattern: string[] =
    normalized.pattern === "horizontal" || normalized.pattern === "vertical" || normalized.pattern === "squat" || normalized.pattern === "hinge"
      ? [normalized.pattern]
      : normalized.pattern === "rotation"
        ? ["horizontal"]
        : normalized.pattern === "carry"
          ? ["vertical"]
          : normalized.pattern === "isolation"
            ? [raw.name.toLowerCase().includes("raise") ? "vertical" : "horizontal"]
            : [normalized.movement === "legs" ? "squat" : "horizontal"];

  const movement: string[] =
    normalized.movement === "core"
      ? ["core"]
      : normalized.pattern === "isolation"
        ? ["isolation"]
        : normalized.movement === "pull"
          ? ["pull"]
          : ["push"];

  const reps = [normalized.reps === "12-20" || normalized.reps === "20+" ? "12+" : normalized.reps];

  const rawName = raw.name.replace(/\s+/g, " ").trim();
  if (!rawName) return null;

  const titleName = toTitleCase(rawName);
  const slug = toSlug(rawName);
  if (!slug) return null;

  const primaryMuscle = muscle[0];
  const muscleGroup = ["chest", "back", "legs", "shoulders", "arms", "core"].includes(primaryMuscle)
    ? primaryMuscle
    : "core";

  return {
    slug,
    name: titleName,
    aliases: buildAliases(rawName),
    muscle,
    equipment,
    movement,
    pattern,
    reps,
    goal: [normalized.goal],
    ego: [normalized.ego],
    muscle_group: muscleGroup,
    is_live: true,
  };
}

function scoreCandidate(raw: ExerciseDbRaw, row: ExerciseRow): number {
  let score = 0;
  if (raw.id) score += 2;
  if (raw.instructions && raw.instructions.length >= 2) score += 2;
  if (raw.secondaryMuscles && raw.secondaryMuscles.length > 0) score += 1;
  if (row.equipment[0] !== "bodyweight") score += 1;
  if (!/\btest\b|\bdemo\b|\bstretch\b/.test(raw.name.toLowerCase())) score += 1;
  return score;
}

function isGameFriendlyName(name: string): boolean {
  const value = name.toLowerCase();
  const blocked = [
    "band ",
    "assisted",
    "internal rotation",
    "external rotation",
    "stretch",
    "warm up",
    "warm-up",
    "self assisted",
    "isometric",
    "neck",
    "wrist circles",
    "ankle circles",
  ];
  return !blocked.some((entry) => value.includes(entry));
}

async function fetchCandidates(): Promise<Map<string, ExerciseDbRaw>> {
  const byId = new Map<string, ExerciseDbRaw>();
  const byName = new Map<string, ExerciseDbRaw>();

  for (const query of SEARCH_QUERIES) {
    const result = await searchExerciseDbRawByNameWithMeta(query);
    if (result.error) {
      console.log(`[import-exercisedb] query="${query}" error=${result.error}`);
      await sleep(350);
      continue;
    }

    for (const candidate of result.candidates) {
      if (candidate.id && !byId.has(candidate.id)) {
        byId.set(candidate.id, candidate);
      }
      const key = candidate.name.toLowerCase().trim();
      if (!byName.has(key)) {
        byName.set(key, candidate);
      }
    }

    console.log(`[import-exercisedb] query="${query}" candidates=${result.candidates.length}`);
    await sleep(280);
  }

  const merged = new Map<string, ExerciseDbRaw>();
  for (const [id, candidate] of byId.entries()) {
    merged.set(`id:${id}`, candidate);
  }
  for (const [name, candidate] of byName.entries()) {
    const fallbackKey = candidate.id ? `id:${candidate.id}` : `name:${name}`;
    if (!merged.has(fallbackKey)) {
      merged.set(fallbackKey, candidate);
    }
  }

  return merged;
}

async function main() {
  const { targetTotal, dryRun } = parseArgs();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: existingRows, error: existingError } = await supabase
    .from("exercises")
    .select("slug")
    .eq("is_live", true)
    .returns<ExistingExerciseRow[]>();

  if (existingError) {
    throw new Error(`Failed to load existing exercises: ${existingError.message}`);
  }

  const existingSlugs = new Set((existingRows ?? []).map((item) => item.slug));
  const currentTotal = existingSlugs.size;
  const needed = Math.max(0, targetTotal - currentTotal);

  console.log(`[import-exercisedb] current_live=${currentTotal} target=${targetTotal} to_add=${needed}`);

  if (needed === 0) {
    console.log("[import-exercisedb] target already reached");
    return;
  }

  const collected = await fetchCandidates();
  console.log(`[import-exercisedb] raw_unique_candidates=${collected.size}`);

  const canonicalUsed = new Set<string>();
  const chosen: CuratedCandidate[] = [];
  const usedSlugs = new Set(existingSlugs);

  const ranked = Array.from(collected.values())
    .filter((raw) => isGameFriendlyName(raw.name))
    .map((raw) => {
      const row = mapToGameplayShape(raw);
      if (!row) return null;
      return {
        raw,
        row,
        score: scoreCandidate(raw, row),
      };
    })
    .filter((item): item is { raw: ExerciseDbRaw; row: ExerciseRow; score: number } => !!item)
    .sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name));

  for (const item of ranked) {
    if (chosen.length >= needed) break;

    const canonical = canonicalName(item.row.name);
    if (canonicalUsed.has(canonical)) continue;

    let slug = item.row.slug;
    if (usedSlugs.has(slug)) {
      if (item.raw.id) {
        slug = `${slug}-${item.raw.id}`;
      } else {
        continue;
      }
    }

    if (usedSlugs.has(slug)) continue;

    canonicalUsed.add(canonical);
    usedSlugs.add(slug);

    chosen.push({
      slug,
      row: {
        ...item.row,
        slug,
      },
      raw: item.raw,
      score: item.score,
    });
  }

  console.log(`[import-exercisedb] curated_selected=${chosen.length}`);

  if (chosen.length === 0) {
    console.log("[import-exercisedb] no candidates selected");
    return;
  }

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          addCount: chosen.length,
          sample: chosen.slice(0, 10).map((item) => ({
            slug: item.slug,
            name: item.row.name,
            equipment: item.row.equipment,
            pattern: item.row.pattern,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  const exercisePayload = chosen.map((item) => item.row);
  const { error: upsertExercisesError } = await supabase
    .from("exercises")
    .upsert(exercisePayload, { onConflict: "slug" });

  if (upsertExercisesError) {
    throw new Error(`Failed to upsert exercises: ${upsertExercisesError.message}`);
  }

  const nowIso = new Date().toISOString();
  const enrichmentPayload = chosen.map((item) => {
    const normalized = normalizeExerciseFields(item.raw);
    return {
      exercise_slug: item.slug,
      provider: "exercisedb",
      provider_exercise_id: item.raw.id,
      provider_exercise_name: item.raw.name,
      raw_equipment: item.raw.equipment ?? null,
      raw_body_part: item.raw.bodyPart ?? null,
      raw_target: item.raw.target ?? null,
      raw_secondary_muscles: item.raw.secondaryMuscles ?? null,
      raw_instructions: item.raw.instructions ?? null,
      normalized_muscle: normalized.muscle,
      normalized_equipment: normalized.equipment,
      normalized_movement: normalized.movement,
      normalized_pattern: normalized.pattern,
      normalized_reps: normalized.reps,
      normalized_goal: normalized.goal,
      normalized_ego: normalized.ego,
      enrichment_status: "enriched",
      enrichment_error: null,
      match_score: 1,
      last_enriched_at: nowIso,
    };
  });

  const { error: upsertEnrichmentError } = await supabase
    .from("exercise_enrichment")
    .upsert(enrichmentPayload, { onConflict: "exercise_slug" });

  if (upsertEnrichmentError) {
    throw new Error(`Failed to upsert enrichment: ${upsertEnrichmentError.message}`);
  }

  const mediaPayload = chosen.map((item) => ({
    exercise_slug: item.slug,
    provider: "exercisedb",
    provider_exercise_name: item.raw.name,
    media_type: "gif",
    media_url: item.raw.id ? buildExerciseDbProxyGifUrl(item.raw.id) : null,
    match_score: 1,
    sync_status: item.raw.id ? "matched" : "no_gif",
    sync_error: item.raw.id ? null : "missing_provider_exercise_id",
    last_synced_at: nowIso,
  }));

  const { error: upsertMediaError } = await supabase
    .from("exercise_media")
    .upsert(mediaPayload, { onConflict: "exercise_slug" });

  if (upsertMediaError) {
    throw new Error(`Failed to upsert exercise_media: ${upsertMediaError.message}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        targetTotal,
        previousTotal: currentTotal,
        added: chosen.length,
        newTotalEstimate: currentTotal + chosen.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[import-exercisedb] fatal", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
