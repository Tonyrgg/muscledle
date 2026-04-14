import { syncExerciseGifBySlug } from "@/lib/exercise-media/service";
import { createAdminClient } from "@/lib/supabase/admin";

type SyncExerciseDbMediaOptions = {
  limit?: number;
  offset?: number;
};

export type SyncExerciseDbMediaReport = {
  total: number;
  processed: number;
  matched: number;
  failed: number;
  skipped: number;
  errors: string[];
};

type ExerciseRow = {
  id: string;
  slug: string;
};

function toPositiveInt(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value ?? NaN)) return fallback;
  return Math.max(1, Math.floor(value as number));
}

function toNonNegativeInt(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value ?? NaN)) return fallback;
  return Math.max(0, Math.floor(value as number));
}

export async function syncExerciseDbMediaAssets(options?: SyncExerciseDbMediaOptions): Promise<SyncExerciseDbMediaReport> {
  const admin = createAdminClient();
  const limit = toPositiveInt(options?.limit, 250);
  const offset = toNonNegativeInt(options?.offset, 0);

  const report: SyncExerciseDbMediaReport = {
    total: 0,
    processed: 0,
    matched: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const { data: exercises, error: exercisesError } = await admin
    .from("exercises")
    .select("id, slug")
    .eq("is_live", true)
    .order("slug", { ascending: true })
    .range(offset, offset + limit - 1)
    .returns<ExerciseRow[]>();

  if (exercisesError) {
    throw new Error(`Failed to load exercises: ${exercisesError.message}`);
  }

  const targets = exercises ?? [];
  report.total = targets.length;

  for (const exercise of targets) {
    report.processed += 1;

    const synced = await syncExerciseGifBySlug(exercise.slug);
    if (!synced.ok || synced.status !== "matched") {
      if (synced.status === "match_failed" || synced.status === "no_gif" || synced.status === "not_found") {
        report.skipped += 1;
      } else {
        report.failed += 1;
      }
      report.errors.push(`${exercise.slug}: ${synced.status}`);
      continue;
    }

    const mediaUrl = typeof synced.details.mediaUrl === "string" ? synced.details.mediaUrl.trim() : "";
    if (!mediaUrl) {
      report.skipped += 1;
      report.errors.push(`${exercise.slug}: matched_without_media_url`);
      continue;
    }

    const sourceId = `exercisedb:${exercise.slug}`;

    const { error: deactivateError } = await admin
      .from("exercise_media_assets")
      .update({ is_active: false })
      .eq("exercise_id", exercise.id)
      .eq("source", "custom")
      .eq("source_id", sourceId);

    if (deactivateError) {
      report.failed += 1;
      report.errors.push(`${exercise.slug}: deactivate_failed:${deactivateError.message}`);
      continue;
    }

    const { error: upsertError } = await admin
      .from("exercise_media_assets")
      .upsert(
        {
          exercise_id: exercise.id,
          media_kind: "image",
          source: "custom",
          source_id: sourceId,
          url: mediaUrl,
          thumbnail_url: mediaUrl,
          poster_url: mediaUrl,
          mime_type: "image/gif",
          is_primary: true,
          sort_order: 0,
          is_active: true,
          attribution_text: "ExerciseDB",
          attribution_url: "https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb",
        },
        { onConflict: "exercise_id,media_kind,source,source_id" },
      );

    if (upsertError) {
      report.failed += 1;
      report.errors.push(`${exercise.slug}: upsert_failed:${upsertError.message}`);
      continue;
    }

    report.matched += 1;
  }

  await admin.from("exercise_sync_state").upsert(
    {
      provider: "exercisedb",
      last_success_at: new Date().toISOString(),
      last_cursor: String(offset + report.total),
      last_error: report.errors.length > 0 ? report.errors.slice(-1)[0] : null,
    },
    { onConflict: "provider" },
  );

  return report;
}

