import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import {
  getExerciseNaming,
  listNamingMappings,
  normalizeGuessText,
  resolveMergedIntoSlug,
} from "../src/lib/exercises/naming";

type LiveExerciseRow = {
  id: string;
  slug: string;
  name: string;
  aliases: string[] | null;
  is_live: boolean;
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await supabase
    .from("exercises")
    .select("id, slug, name, aliases, is_live")
    .eq("is_live", true)
    .returns<LiveExerciseRow[]>();

  if (error) throw new Error(`Failed to load live exercises: ${error.message}`);

  const liveRows = data ?? [];
  const mappingByOldSlug = new Map(listNamingMappings().map((item) => [item.oldSlug, item]));
  const renamed: string[] = [];
  const merged: Array<{ source_slug: string; target_slug: string }> = [];
  const manualReview: string[] = [];
  const aliasIndex = new Map<string, Set<string>>();

  for (const row of liveRows) {
    const naming = getExerciseNaming(row.slug, row.name, row.aliases ?? []);
    const mapEntry = mappingByOldSlug.get(row.slug);
    if (!mapEntry) {
      manualReview.push(row.slug);
    } else if (mapEntry.oldName !== mapEntry.newName) {
      renamed.push(row.slug);
    }

    const mergedInto = resolveMergedIntoSlug(row.slug);
    if (mergedInto) {
      merged.push({ source_slug: row.slug, target_slug: mergedInto });
      continue;
    }

    for (const alias of naming.aliases) {
      const keyAlias = normalizeGuessText(alias);
      if (!keyAlias) continue;
      const bucket = aliasIndex.get(keyAlias) ?? new Set<string>();
      bucket.add(row.slug);
      aliasIndex.set(keyAlias, bucket);
    }
  }

  const aliasCollisions = Array.from(aliasIndex.entries())
    .filter(([, slugs]) => slugs.size > 1)
    .map(([alias, slugs]) => ({ alias, slugs: Array.from(slugs).sort() }))
    .sort((a, b) => a.alias.localeCompare(b.alias));

  console.log(
    JSON.stringify(
      {
        live_total: liveRows.length,
        renamed_total: renamed.length,
        merged_total: merged.length,
        renamed_slugs: renamed.sort(),
        merged,
        alias_collisions_total: aliasCollisions.length,
        alias_collisions: aliasCollisions,
        manual_review_total: manualReview.length,
        manual_review_slugs: manualReview.sort(),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[report-exercise-naming-migration] fatal", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

