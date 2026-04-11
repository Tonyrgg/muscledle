import { findBestRawMatch } from "@/lib/exercise-enrichment/match";
import { normalizeExerciseFields } from "@/lib/exercise-enrichment/normalize";
import { searchExerciseDbRawByNameWithMeta } from "@/lib/exercise-enrichment/providers/exercisedb";
import {
  getExerciseEnrichmentBySlug,
  getInternalExerciseBySlug,
  listExerciseEnrichment,
  listInternalExercises,
  upsertExerciseEnrichment,
} from "@/lib/exercise-enrichment/repository";
import type {
  EnrichmentReport,
  EnrichmentStatus,
  ExerciseDbRaw,
  ExerciseEnrichmentRecord,
  InternalExercise,
} from "@/lib/exercise-enrichment/types";

const DEBUG = process.env.EXERCISE_ENRICHMENT_DEBUG === "true";

function debugLog(message: string, details?: unknown) {
  if (!DEBUG) return;
  if (typeof details === "undefined") {
    console.log(`[exercise-enrichment] ${message}`);
    return;
  }
  console.log(`[exercise-enrichment] ${message}`, details);
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");
}

function maybeSingularize(value: string): string {
  if (value.endsWith("ss") || value.length < 5) return value;
  if (value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  if (value.endsWith("es")) return value.slice(0, -2);
  if (value.endsWith("s")) return value.slice(0, -1);
  return value;
}

function buildSearchQueries(exercise: InternalExercise): string[] {
  const base = [exercise.name, ...(exercise.aliases ?? [])]
    .map(normalizeQuery)
    .filter(Boolean);

  const queries = new Set<string>(base);

  for (const query of base) {
    queries.add(maybeSingularize(query));
    queries.add(query.replace(/\bdumbbell\b/g, "db"));
    queries.add(query.replace(/\bdb\b/g, "dumbbell"));
    queries.add(query.replace(/\bcable\b/g, "").trim());
  }

  const canonical = normalizeQuery(exercise.name);
  if (canonical.includes("incline dumbbell press")) {
    queries.add("incline press");
    queries.add("incline chest press");
    queries.add("dumbbell incline press");
  }
  if (canonical.includes("dumbbell shoulder press")) {
    queries.add("shoulder press");
    queries.add("overhead dumbbell press");
  }
  if (canonical.includes("cable crunch")) {
    queries.add("kneeling cable crunch");
    queries.add("crunch");
  }
  if (canonical === "lunges") {
    queries.add("lunge");
    queries.add("dumbbell lunge");
  }

  return Array.from(queries).filter(Boolean);
}

function toEmptyReport(slug: string, status: EnrichmentStatus, error: string | null): EnrichmentReport {
  return {
    slug,
    status,
    providerExerciseName: null,
    matchScore: null,
    raw: {
      equipment: null,
      bodyPart: null,
      target: null,
      secondaryMuscles: null,
      instructions: null,
    },
    normalized: {
      muscle: null,
      equipment: null,
      movement: null,
      pattern: null,
      reps: null,
      goal: null,
      ego: null,
    },
    error,
  };
}

async function persist(
  record: ExerciseEnrichmentRecord,
  fallback: EnrichmentReport,
): Promise<EnrichmentReport> {
  const saved = await upsertExerciseEnrichment(record);
  if (!saved.ok) {
    return {
      ...fallback,
      status: "db_error",
      error: saved.error,
    };
  }

  return fallback;
}

async function searchWithFallback(exercise: InternalExercise): Promise<ExerciseDbRaw[]> {
  const queries = buildSearchQueries(exercise);
  let providerErrors = 0;

  for (const query of queries) {
    const result = await searchExerciseDbRawByNameWithMeta(query);
    if (result.error) {
      providerErrors += 1;
      debugLog(`provider query failed slug="${exercise.slug}" query="${query}" error="${result.error}"`);
      continue;
    }

    if (result.candidates.length > 0) {
      debugLog(`provider query hit slug="${exercise.slug}" query="${query}" candidates=${result.candidates.length}`);
      return result.candidates;
    }
  }

  if (providerErrors > 0) {
    throw new Error("provider_search_failed");
  }

  return [];
}

function buildRecord(args: {
  slug: string;
  status: EnrichmentStatus;
  error?: string | null;
  raw?: ExerciseDbRaw | null;
  providerExerciseName?: string | null;
  matchScore?: number | null;
  normalized?: ReturnType<typeof normalizeExerciseFields> | null;
}): ExerciseEnrichmentRecord {
  return {
    exerciseSlug: args.slug,
    provider: "exercisedb",
    providerExerciseId: args.raw?.id ?? null,
    providerExerciseName: args.providerExerciseName ?? args.raw?.name ?? null,
    rawEquipment: args.raw?.equipment ?? null,
    rawBodyPart: args.raw?.bodyPart ?? null,
    rawTarget: args.raw?.target ?? null,
    rawSecondaryMuscles: args.raw?.secondaryMuscles ?? null,
    rawInstructions: args.raw?.instructions ?? null,
    normalizedMuscle: args.normalized?.muscle ?? null,
    normalizedEquipment: args.normalized?.equipment ?? null,
    normalizedMovement: args.normalized?.movement ?? null,
    normalizedPattern: args.normalized?.pattern ?? null,
    normalizedReps: args.normalized?.reps ?? null,
    normalizedGoal: args.normalized?.goal ?? null,
    normalizedEgo: args.normalized?.ego ?? null,
    enrichmentStatus: args.status,
    enrichmentError: args.error ?? null,
    matchScore: args.matchScore ?? null,
    lastEnrichedAt: nowIso(),
  };
}

export async function enrichExerciseBySlug(slug: string): Promise<EnrichmentReport> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) {
    return toEmptyReport(slug, "provider_error", "invalid_slug");
  }

  debugLog(`enrich start slug="${cleanSlug}"`);

  const exercise = await getInternalExerciseBySlug(cleanSlug);
  if (!exercise) {
    const baseReport = toEmptyReport(cleanSlug, "not_found", "internal_exercise_not_found");
    const record = buildRecord({
      slug: cleanSlug,
      status: "not_found",
      error: "internal_exercise_not_found",
    });
    return persist(record, baseReport);
  }

  let candidates: ExerciseDbRaw[] = [];
  try {
    candidates = await searchWithFallback(exercise);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "provider_search_failed";
    const baseReport = toEmptyReport(cleanSlug, "provider_error", errorMessage);
    const record = buildRecord({
      slug: cleanSlug,
      status: "provider_error",
      error: errorMessage,
    });
    return persist(record, baseReport);
  }

  debugLog(`provider candidates slug="${cleanSlug}" count=${candidates.length}`);

  if (candidates.length === 0) {
    const baseReport = toEmptyReport(cleanSlug, "not_found", "provider_returned_no_candidates");
    const record = buildRecord({
      slug: cleanSlug,
      status: "not_found",
      error: "provider_returned_no_candidates",
    });
    return persist(record, baseReport);
  }

  const best = findBestRawMatch(exercise, candidates);
  if (!best) {
    const baseReport = toEmptyReport(cleanSlug, "match_failed", "no_match_above_threshold");
    const record = buildRecord({
      slug: cleanSlug,
      status: "match_failed",
      error: "no_match_above_threshold",
    });
    return persist(record, baseReport);
  }

  const normalized = normalizeExerciseFields(best.candidate);
  const report: EnrichmentReport = {
    slug: cleanSlug,
    status: "enriched",
    providerExerciseName: best.candidate.name,
    matchScore: best.score,
    raw: {
      equipment: best.candidate.equipment ?? null,
      bodyPart: best.candidate.bodyPart ?? null,
      target: best.candidate.target ?? null,
      secondaryMuscles: best.candidate.secondaryMuscles ?? null,
      instructions: best.candidate.instructions ?? null,
    },
    normalized: {
      muscle: normalized.muscle,
      equipment: normalized.equipment,
      movement: normalized.movement,
      pattern: normalized.pattern,
      reps: normalized.reps,
      goal: normalized.goal,
      ego: normalized.ego,
    },
    error: null,
  };

  debugLog(`best match slug="${cleanSlug}" name="${best.candidate.name}" score=${best.score} reason="${best.reason}"`);

  const record = buildRecord({
    slug: cleanSlug,
    status: "enriched",
    raw: best.candidate,
    providerExerciseName: best.candidate.name,
    matchScore: best.score,
    normalized,
  });
  return persist(record, report);
}

export async function enrichExercisesBatch(options?: {
  slugs?: string[];
  onlyMissing?: boolean;
}): Promise<{
  totalRequested: number;
  totalProcessed: number;
  statuses: Record<EnrichmentStatus, number>;
  results: EnrichmentReport[];
}> {
  const inputSlugs = (options?.slugs ?? []).map((item) => item.trim().toLowerCase()).filter(Boolean);
  let targets = inputSlugs;

  if (targets.length === 0) {
    const exercises = await listInternalExercises();
    targets = exercises.map((exercise) => exercise.slug);
  }

  targets = Array.from(new Set(targets));

  if (options?.onlyMissing) {
    const existing = await listExerciseEnrichment({ slugs: targets });
    const bySlug = new Map(existing.map((entry) => [entry.exerciseSlug, entry]));
    targets = targets.filter((slug) => bySlug.get(slug)?.enrichmentStatus !== "enriched");
  }

  const results: EnrichmentReport[] = [];
  const statuses: Record<EnrichmentStatus, number> = {
    enriched: 0,
    not_found: 0,
    match_failed: 0,
    provider_error: 0,
    db_error: 0,
  };

  for (const slug of targets) {
    const result = await enrichExerciseBySlug(slug);
    results.push(result);
    statuses[result.status] += 1;
  }

  return {
    totalRequested: inputSlugs.length > 0 ? inputSlugs.length : targets.length,
    totalProcessed: results.length,
    statuses,
    results,
  };
}

export async function resolveNormalizedFieldsBySlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  const enrichment = await getExerciseEnrichmentBySlug(normalizedSlug);
  if (!enrichment || enrichment.enrichmentStatus !== "enriched") {
    return null;
  }

  return {
    muscle: enrichment.normalizedMuscle,
    equipment: enrichment.normalizedEquipment,
    movement: enrichment.normalizedMovement,
    pattern: enrichment.normalizedPattern,
    reps: enrichment.normalizedReps,
    goal: enrichment.normalizedGoal,
    ego: enrichment.normalizedEgo,
  };
}
