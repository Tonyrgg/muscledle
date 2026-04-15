import { createAdminClient } from "@/lib/supabase/admin";
import { mapWgerExerciseToLiftdle } from "@/lib/wger/adapter";
import type { WgerApiPage, WgerExercisePayload } from "@/lib/wger/types";

const DEFAULT_WGER_BASE_URL = "https://wger.de/api/v2";

export type SyncWgerOptions = {
  batchSize?: number;
  maxPages?: number;
};

export type SyncWgerReport = {
  imported: number;
  pages: number;
  failed: number;
  errors: string[];
};

function getWgerConfig() {
  const baseUrl = (process.env.WGER_API_BASE_URL ?? DEFAULT_WGER_BASE_URL).replace(/\/+$/, "");
  const token = process.env.WGER_API_TOKEN?.trim() || null;
  return { baseUrl, token };
}

async function fetchPage(url: string, token: string | null): Promise<WgerApiPage<WgerExercisePayload>> {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: token
      ? {
          Authorization: `Token ${token}`,
        }
      : undefined,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Wger request failed (${response.status}): ${body.slice(0, 240)}`);
  }

  const payload = (await response.json()) as WgerApiPage<WgerExercisePayload>;
  return payload;
}

async function upsertMappedExercise(payload: WgerExercisePayload): Promise<void> {
  const admin = createAdminClient();
  const mapped = mapWgerExerciseToLiftdle(payload);

  const { data: exerciseRow, error: upsertExerciseError } = await admin
    .from("exercises")
    .upsert(mapped.exercise, { onConflict: "slug" })
    .select("id")
    .single<{ id: string }>();

  if (upsertExerciseError || !exerciseRow?.id) {
    throw new Error(`Exercise upsert failed for "${mapped.exercise.slug}": ${upsertExerciseError?.message ?? "missing id"}`);
  }

  const exerciseId = exerciseRow.id;

  if (mapped.aliases.length > 0) {
    const aliasRows = mapped.aliases.map((alias) => ({
      exercise_id: exerciseId,
      alias: alias.alias,
      normalized_alias: alias.normalized_alias,
    }));

    const { error: aliasError } = await admin
      .from("exercise_aliases")
      .upsert(aliasRows, { onConflict: "exercise_id,normalized_alias" });

    if (aliasError) {
      throw new Error(`Alias upsert failed for "${mapped.exercise.slug}": ${aliasError.message}`);
    }
  }

  const { error: deactivateError } = await admin
    .from("exercise_media_assets")
    .update({ is_active: false })
    .eq("exercise_id", exerciseId);

  if (deactivateError) {
    throw new Error(`Media deactivate failed for "${mapped.exercise.slug}": ${deactivateError.message}`);
  }

  if (mapped.media.length > 0) {
    const mediaRows = mapped.media.map((asset) => ({
      exercise_id: exerciseId,
      media_kind: asset.mediaKind,
      source: asset.source,
      source_id: asset.sourceId ?? asset.url,
      url: asset.url,
      thumbnail_url: asset.thumbnailUrl,
      poster_url: asset.posterUrl,
      mime_type: asset.mimeType,
      width: asset.width,
      height: asset.height,
      duration_seconds: asset.durationSeconds,
      is_primary: asset.isPrimary,
      sort_order: asset.sortOrder,
      is_active: true,
      attribution_text: asset.attributionText,
      attribution_url: asset.attributionUrl,
      license: asset.license,
    }));

    const { error: mediaError } = await admin
      .from("exercise_media_assets")
      .upsert(mediaRows, { onConflict: "exercise_id,media_kind,source,source_id" });

    if (mediaError) {
      throw new Error(`Media upsert failed for "${mapped.exercise.slug}": ${mediaError.message}`);
    }
  }
}

export async function syncWgerExercises(options?: SyncWgerOptions): Promise<SyncWgerReport> {
  const batchSize = Math.max(1, Math.min(200, options?.batchSize ?? 40));
  const maxPages = Math.max(1, options?.maxPages ?? 200);
  const { baseUrl, token } = getWgerConfig();
  const admin = createAdminClient();

  const report: SyncWgerReport = {
    imported: 0,
    pages: 0,
    failed: 0,
    errors: [],
  };

  let nextUrl: string | null = `${baseUrl}/exerciseinfo/?limit=${batchSize}`;

  try {
    for (let page = 0; page < maxPages && nextUrl; page += 1) {
      const payload = await fetchPage(nextUrl, token);
      report.pages += 1;

      for (const item of payload.results) {
        try {
          await upsertMappedExercise(item);
          report.imported += 1;
        } catch (error) {
          report.failed += 1;
          report.errors.push(error instanceof Error ? error.message : "Unknown import error");
        }
      }

      nextUrl = payload.next;
    }

    await admin
      .from("exercise_sync_state")
      .upsert(
        {
          provider: "wger",
          last_success_at: new Date().toISOString(),
          last_cursor: nextUrl,
          last_error: report.errors.length > 0 ? report.errors.slice(-1)[0] : null,
        },
        { onConflict: "provider" },
      );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wger sync failed";
    report.errors.push(message);

    await admin
      .from("exercise_sync_state")
      .upsert(
        {
          provider: "wger",
          last_error: message,
        },
        { onConflict: "provider" },
      );
  }

  return report;
}

