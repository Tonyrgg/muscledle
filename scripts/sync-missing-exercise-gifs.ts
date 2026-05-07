import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { syncExerciseGifBySlug } from "../src/lib/exercise-media/service";

type ExerciseRow = {
  id: string;
  slug: string;
};

type LegacyMediaRow = {
  exercise_slug: string;
  media_url: string | null;
};

type MediaAssetRow = {
  exercise_id: string;
  media_kind: string;
  is_active: boolean;
};

type ItemResult = {
  slug: string;
  ok: boolean;
  status: string;
  mediaUrl: string | null;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const delayArg = args.find((arg) => arg.startsWith("--delay-ms="));
  const slugsArg = args.find((arg) => arg.startsWith("--slugs="));

  const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : null;
  const delayMs = delayArg ? Number(delayArg.slice("--delay-ms=".length)) : 6000;
  const slugs = slugsArg
    ? slugsArg
        .slice("--slugs=".length)
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    : null;

  return {
    limit: Number.isFinite(limit) && limit && limit > 0 ? Math.floor(limit) : null,
    delayMs: Number.isFinite(delayMs) && delayMs > 0 ? Math.floor(delayMs) : 6000,
    slugs,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
}

async function loadMissingExercises(onlySlugs: string[] | null): Promise<ExerciseRow[]> {
  const supabase = getSupabase();

  let exercisesQuery = supabase
    .from("exercises")
    .select("id, slug")
    .eq("is_live", true)
    .order("slug", { ascending: true });

  if (onlySlugs && onlySlugs.length > 0) {
    exercisesQuery = exercisesQuery.in("slug", onlySlugs);
  }

  const { data: exercises, error: exercisesError } = await exercisesQuery.returns<ExerciseRow[]>();
  if (exercisesError) {
    throw new Error(`Failed to load live exercises: ${exercisesError.message}`);
  }

  const liveExercises = exercises ?? [];
  if (liveExercises.length === 0) {
    return [];
  }

  const exerciseIds = liveExercises.map((item) => item.id);
  const exerciseSlugs = liveExercises.map((item) => item.slug);

  const { data: assets, error: assetsError } = await supabase
    .from("exercise_media_assets")
    .select("exercise_id, media_kind, is_active")
    .in("exercise_id", exerciseIds)
    .returns<MediaAssetRow[]>();

  if (assetsError) {
    throw new Error(`Failed to load exercise media assets: ${assetsError.message}`);
  }

  const { data: legacyRows, error: legacyError } = await supabase
    .from("exercise_media")
    .select("exercise_slug, media_url")
    .in("exercise_slug", exerciseSlugs)
    .returns<LegacyMediaRow[]>();

  if (legacyError) {
    throw new Error(`Failed to load legacy exercise media: ${legacyError.message}`);
  }

  const assetExerciseIds = new Set(
    (assets ?? [])
      .filter((item) => item.is_active && item.media_kind !== "icon")
      .map((item) => item.exercise_id),
  );
  const legacyBySlug = new Map((legacyRows ?? []).map((item) => [item.exercise_slug, item.media_url]));

  return liveExercises.filter((exercise) => {
    if (assetExerciseIds.has(exercise.id)) return false;
    return !(legacyBySlug.get(exercise.slug)?.trim?.() ?? "");
  });
}

async function persistMatchedAsset(exercise: ExerciseRow, mediaUrl: string) {
  const supabase = getSupabase();
  const sourceId = `exercisedb:${exercise.slug}`;

  const { error: deactivateError } = await supabase
    .from("exercise_media_assets")
    .update({ is_active: false })
    .eq("exercise_id", exercise.id)
    .eq("source", "custom")
    .eq("source_id", sourceId);

  if (deactivateError) {
    throw new Error(`deactivate_failed:${deactivateError.message}`);
  }

  const { error: upsertError } = await supabase
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
    throw new Error(`upsert_failed:${upsertError.message}`);
  }
}

async function main() {
  const { limit, delayMs, slugs } = parseArgs();
  const missingExercises = await loadMissingExercises(slugs);
  const targets = limit ? missingExercises.slice(0, limit) : missingExercises;

  if (targets.length === 0) {
    console.log("[exercise-media] missing batch: no missing exercises to process");
    return;
  }

  console.log(
    `[exercise-media] missing batch start total=${targets.length} delay_ms=${delayMs} source=${slugs ? "args_filtered_missing" : "db_missing_only"}`,
  );

  const results: ItemResult[] = [];

  for (let index = 0; index < targets.length; index += 1) {
    const exercise = targets[index];
    console.log(`[exercise-media] missing batch item ${index + 1}/${targets.length} slug="${exercise.slug}"`);

    const result = await syncExerciseGifBySlug(exercise.slug);
    const mediaUrl = typeof result.details.mediaUrl === "string" ? result.details.mediaUrl.trim() : null;

    if (result.ok && result.status === "matched" && mediaUrl) {
      try {
        await persistMatchedAsset(exercise, mediaUrl);
      } catch (error) {
        results.push({
          slug: exercise.slug,
          ok: false,
          status: error instanceof Error ? error.message : "persist_failed",
          mediaUrl,
        });

        if (index < targets.length - 1) {
          await sleep(delayMs);
        }
        continue;
      }
    }

    results.push({
      slug: exercise.slug,
      ok: result.ok,
      status: result.status,
      mediaUrl,
    });

    if (index < targets.length - 1) {
      await sleep(delayMs);
    }
  }

  const matched = results.filter((item) => item.status === "matched").length;
  const noGif = results.filter((item) => item.status === "no_gif").length;
  const matchFailed = results.filter((item) => item.status === "match_failed").length;
  const dbError = results.filter((item) => item.status === "db_error" || item.status.includes("failed")).length;

  console.log(
    JSON.stringify(
      {
        ok: dbError === 0,
        total: results.length,
        matched,
        no_gif: noGif,
        match_failed: matchFailed,
        db_error: dbError,
        delay_ms: delayMs,
        remaining_missing_slugs: results.filter((item) => item.status !== "matched").map((item) => ({
          slug: item.slug,
          status: item.status,
        })),
      },
      null,
      2,
    ),
  );

  if (dbError > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[exercise-media] missing batch fatal", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
