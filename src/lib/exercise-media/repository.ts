import { createAdminClient } from "@/lib/supabase/admin";
import type { ExerciseMediaRecord, InternalExercise } from "@/lib/exercise-media/types";

type InternalExerciseRow = {
  slug: string;
  name: string;
  aliases: string[] | null;
};

type ExerciseMediaRow = {
  exercise_slug: string;
  provider: "exercisedb";
  provider_exercise_name: string | null;
  media_type: "gif";
  media_url: string | null;
  match_score: number | null;
  sync_status: ExerciseMediaRecord["syncStatus"];
  sync_error: string | null;
  last_synced_at: string | null;
};

export async function getInternalExerciseBySlug(slug: string): Promise<InternalExercise | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("exercises")
    .select("slug, name, aliases")
    .eq("slug", slug)
    .eq("is_live", true)
    .maybeSingle<InternalExerciseRow>();

  if (error) {
    console.error(`[exercise-media] supabase getInternalExerciseBySlug error slug=\"${slug}\"`, error);
    return null;
  }

  if (!data) return null;

  return {
    slug: data.slug,
    name: data.name,
    aliases: data.aliases ?? [],
  };
}

export async function getExerciseMediaBySlug(slug: string): Promise<ExerciseMediaRecord | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("exercise_media")
    .select(
      "exercise_slug, provider, provider_exercise_name, media_type, media_url, match_score, sync_status, sync_error, last_synced_at",
    )
    .eq("exercise_slug", slug)
    .maybeSingle<ExerciseMediaRow>();

  if (error) {
    console.error(`[exercise-media] supabase getExerciseMediaBySlug error slug=\"${slug}\"`, error);
    return null;
  }

  if (!data) return null;

  return {
    exerciseSlug: data.exercise_slug,
    provider: data.provider,
    providerExerciseName: data.provider_exercise_name,
    mediaType: data.media_type,
    mediaUrl: data.media_url,
    matchScore: data.match_score,
    syncStatus: data.sync_status,
    syncError: data.sync_error,
    lastSyncedAt: data.last_synced_at,
  };
}

export async function upsertExerciseMedia(
  record: ExerciseMediaRecord,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const payload = {
    exercise_slug: record.exerciseSlug,
    provider: record.provider,
    provider_exercise_name: record.providerExerciseName,
    media_type: record.mediaType,
    media_url: record.mediaUrl,
    match_score: record.matchScore,
    sync_status: record.syncStatus,
    sync_error: record.syncError,
    last_synced_at: record.lastSyncedAt,
  };

  const { error } = await admin.from("exercise_media").upsert(payload, { onConflict: "exercise_slug" });

  if (error) {
    console.error(`[exercise-media] supabase upsert error slug=\"${record.exerciseSlug}\"`, {
      payload,
      error,
    });
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
