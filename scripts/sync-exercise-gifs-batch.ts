import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { syncExerciseGifBySlug } from "../src/lib/exercise-media/service";

type ExerciseSlugRow = {
  slug: string;
};

type ItemResult = {
  slug: string;
  ok: boolean;
  status: string;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const slugsArg = args.find((arg) => arg.startsWith("--slugs="));
  const limitArg = args.find((arg) => arg.startsWith("--limit="));

  const slugs = slugsArg
    ? slugsArg
        .slice("--slugs=".length)
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    : null;

  const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : null;

  return {
    slugs,
    limit: Number.isFinite(limit) && limit && limit > 0 ? Math.floor(limit) : null,
  };
}

async function loadLiveSlugs(): Promise<string[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from("exercises")
    .select("slug")
    .eq("is_live", true)
    .order("slug", { ascending: true })
    .returns<ExerciseSlugRow[]>();

  if (error) {
    throw new Error(`Failed to load live slugs: ${error.message}`);
  }

  return (data ?? []).map((item) => item.slug);
}

async function main() {
  const { slugs: slugsFromArgs, limit } = parseArgs();
  const sourceSlugs = slugsFromArgs && slugsFromArgs.length > 0 ? slugsFromArgs : await loadLiveSlugs();
  const slugs = limit ? sourceSlugs.slice(0, limit) : sourceSlugs;

  if (slugs.length === 0) {
    console.log("[exercise-media] batch: no slugs to process");
    return;
  }

  console.log(
    `[exercise-media] batch start total=${slugs.length} source=${slugsFromArgs ? "args" : "db_live_exercises"}`,
  );

  const items: ItemResult[] = [];

  for (let i = 0; i < slugs.length; i += 1) {
    const slug = slugs[i];
    console.log(`[exercise-media] batch item ${i + 1}/${slugs.length} slug="${slug}"`);
    const result = await syncExerciseGifBySlug(slug);
    items.push({
      slug,
      ok: result.ok,
      status: result.status,
    });
  }

  const matched = items.filter((item) => item.status === "matched").length;
  const noGif = items.filter((item) => item.status === "no_gif").length;
  const matchFailed = items.filter((item) => item.status === "match_failed").length;
  const notFound = items.filter((item) => item.status === "not_found").length;
  const dbError = items.filter((item) => item.status === "db_error").length;

  console.log(
    JSON.stringify(
      {
        ok: dbError === 0,
        total: items.length,
        matched,
        no_gif: noGif,
        match_failed: matchFailed,
        not_found: notFound,
        db_error: dbError,
        failed_slugs: items.filter((item) => !item.ok).map((item) => ({ slug: item.slug, status: item.status })),
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
  console.error("[exercise-media] batch fatal", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

