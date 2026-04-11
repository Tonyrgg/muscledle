import { createAdminClient } from "@/lib/supabase/admin";
import type { EnrichmentStatus, ExerciseEnrichmentRecord, InternalExercise } from "@/lib/exercise-enrichment/types";

const DEBUG = process.env.EXERCISE_ENRICHMENT_DEBUG === "true";

function debugLog(message: string, details?: unknown) {
  if (!DEBUG) return;
  if (typeof details === "undefined") {
    console.log(`[exercise-enrichment] ${message}`);
    return;
  }
  console.log(`[exercise-enrichment] ${message}`, details);
}

type InternalExerciseRow = {
  slug: string;
  name: string;
  aliases: string[] | null;
};

type ExerciseEnrichmentRow = {
  exercise_slug: string;
  provider: "exercisedb";
  provider_exercise_id: string | null;
  provider_exercise_name: string | null;
  raw_equipment: string | null;
  raw_body_part: string | null;
  raw_target: string | null;
  raw_secondary_muscles: string[] | null;
  raw_instructions: string[] | null;
  normalized_muscle: ExerciseEnrichmentRecord["normalizedMuscle"];
  normalized_equipment: ExerciseEnrichmentRecord["normalizedEquipment"];
  normalized_movement: ExerciseEnrichmentRecord["normalizedMovement"];
  normalized_pattern: ExerciseEnrichmentRecord["normalizedPattern"];
  normalized_reps: ExerciseEnrichmentRecord["normalizedReps"];
  normalized_goal: ExerciseEnrichmentRecord["normalizedGoal"];
  normalized_ego: ExerciseEnrichmentRecord["normalizedEgo"];
  enrichment_status: EnrichmentStatus;
  enrichment_error: string | null;
  match_score: number | null;
  last_enriched_at: string | null;
};

function mapRowToRecord(row: ExerciseEnrichmentRow): ExerciseEnrichmentRecord {
  return {
    exerciseSlug: row.exercise_slug,
    provider: row.provider,
    providerExerciseId: row.provider_exercise_id,
    providerExerciseName: row.provider_exercise_name,
    rawEquipment: row.raw_equipment,
    rawBodyPart: row.raw_body_part,
    rawTarget: row.raw_target,
    rawSecondaryMuscles: row.raw_secondary_muscles,
    rawInstructions: row.raw_instructions,
    normalizedMuscle: row.normalized_muscle,
    normalizedEquipment: row.normalized_equipment,
    normalizedMovement: row.normalized_movement,
    normalizedPattern: row.normalized_pattern,
    normalizedReps: row.normalized_reps,
    normalizedGoal: row.normalized_goal,
    normalizedEgo: row.normalized_ego,
    enrichmentStatus: row.enrichment_status,
    enrichmentError: row.enrichment_error,
    matchScore: row.match_score,
    lastEnrichedAt: row.last_enriched_at,
  };
}

export async function getInternalExerciseBySlug(slug: string): Promise<InternalExercise | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("exercises")
    .select("slug, name, aliases")
    .eq("slug", slug)
    .eq("is_live", true)
    .maybeSingle<InternalExerciseRow>();

  if (error) {
    debugLog(`db getInternalExerciseBySlug failed slug="${slug}"`, error);
    return null;
  }

  if (!data) return null;

  return {
    slug: data.slug,
    name: data.name,
    aliases: data.aliases ?? [],
  };
}

export async function listInternalExercises(): Promise<InternalExercise[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exercises")
    .select("slug, name, aliases")
    .eq("is_live", true)
    .order("name", { ascending: true })
    .returns<InternalExerciseRow[]>();

  if (error) {
    debugLog("db listInternalExercises failed", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    slug: row.slug,
    name: row.name,
    aliases: row.aliases ?? [],
  }));
}

export async function getExerciseEnrichmentBySlug(slug: string): Promise<ExerciseEnrichmentRecord | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exercise_enrichment")
    .select(
      "exercise_slug, provider, provider_exercise_id, provider_exercise_name, raw_equipment, raw_body_part, raw_target, raw_secondary_muscles, raw_instructions, normalized_muscle, normalized_equipment, normalized_movement, normalized_pattern, normalized_reps, normalized_goal, normalized_ego, enrichment_status, enrichment_error, match_score, last_enriched_at",
    )
    .eq("exercise_slug", slug)
    .maybeSingle<ExerciseEnrichmentRow>();

  if (error) {
    debugLog(`db getExerciseEnrichmentBySlug failed slug="${slug}"`, error);
    return null;
  }

  if (!data) return null;
  return mapRowToRecord(data);
}

export async function listExerciseEnrichment(options?: {
  slugs?: string[];
  limit?: number;
}): Promise<ExerciseEnrichmentRecord[]> {
  const admin = createAdminClient();

  let query = admin
    .from("exercise_enrichment")
    .select(
      "exercise_slug, provider, provider_exercise_id, provider_exercise_name, raw_equipment, raw_body_part, raw_target, raw_secondary_muscles, raw_instructions, normalized_muscle, normalized_equipment, normalized_movement, normalized_pattern, normalized_reps, normalized_goal, normalized_ego, enrichment_status, enrichment_error, match_score, last_enriched_at",
    )
    .order("exercise_slug", { ascending: true });

  const normalizedSlugs = (options?.slugs ?? []).map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (normalizedSlugs.length > 0) {
    query = query.in("exercise_slug", normalizedSlugs);
  }

  if (options?.limit && options.limit > 0) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query.returns<ExerciseEnrichmentRow[]>();

  if (error) {
    debugLog("db listExerciseEnrichment failed", error);
    return [];
  }

  return (data ?? []).map(mapRowToRecord);
}

export async function upsertExerciseEnrichment(
  record: ExerciseEnrichmentRecord,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const payload = {
    exercise_slug: record.exerciseSlug,
    provider: record.provider,
    provider_exercise_id: record.providerExerciseId,
    provider_exercise_name: record.providerExerciseName,
    raw_equipment: record.rawEquipment,
    raw_body_part: record.rawBodyPart,
    raw_target: record.rawTarget,
    raw_secondary_muscles: record.rawSecondaryMuscles,
    raw_instructions: record.rawInstructions,
    normalized_muscle: record.normalizedMuscle,
    normalized_equipment: record.normalizedEquipment,
    normalized_movement: record.normalizedMovement,
    normalized_pattern: record.normalizedPattern,
    normalized_reps: record.normalizedReps,
    normalized_goal: record.normalizedGoal,
    normalized_ego: record.normalizedEgo,
    enrichment_status: record.enrichmentStatus,
    enrichment_error: record.enrichmentError,
    match_score: record.matchScore,
    last_enriched_at: record.lastEnrichedAt,
  };

  const { error } = await admin.from("exercise_enrichment").upsert(payload, { onConflict: "exercise_slug" });

  if (error) {
    debugLog(`db upsertExerciseEnrichment failed slug="${record.exerciseSlug}"`, error);
    return { ok: false, error: error.message };
  }

  debugLog(`db upsertExerciseEnrichment ok slug="${record.exerciseSlug}" status=${record.enrichmentStatus}`);
  return { ok: true };
}

