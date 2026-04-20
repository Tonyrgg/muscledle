import { cache } from "react";
import { getExerciseNaming } from "@/lib/exercises/naming";
import { createAdminClient } from "@/lib/supabase/admin";

export type LiveExerciseSeoEntry = {
  id: string;
  slug: string;
  canonical_name: string;
  display_name: string;
  aliases: string[];
  muscle_group: string;
  muscle: string[];
  equipment: string[];
  movement: string[];
  pattern: string[];
  reps: string[];
  goal: string[];
  ego: string[];
};

type ExerciseRow = {
  id: string;
  name: string;
  slug: string;
  aliases: string[] | null;
  muscle_group: string;
  muscle: string[];
  equipment: string[];
  movement: string[];
  pattern: string[];
  reps: string[];
  goal: string[];
  ego: string[];
};

export const listLiveExerciseSeoEntries = cache(async (): Promise<LiveExerciseSeoEntry[]> => {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, slug, aliases, muscle_group, muscle, equipment, movement, pattern, reps, goal, ego")
    .eq("is_live", true)
    .order("name", { ascending: true })
    .returns<ExerciseRow[]>();

  if (error) {
    throw new Error(`Failed to load live exercises catalog: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => {
      const naming = getExerciseNaming(row.slug, row.name, row.aliases ?? []);
      if (naming.merged_into_slug) {
        return null;
      }

      return {
        id: row.id,
        slug: row.slug,
        canonical_name: naming.canonical_name,
        display_name: naming.display_name,
        aliases: naming.aliases,
        muscle_group: row.muscle_group,
        muscle: row.muscle,
        equipment: row.equipment,
        movement: row.movement,
        pattern: row.pattern,
        reps: row.reps,
        goal: row.goal,
        ego: row.ego,
      } satisfies LiveExerciseSeoEntry;
    })
    .filter((entry): entry is LiveExerciseSeoEntry => entry !== null)
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
});

export async function getLiveExerciseSeoEntryBySlug(slug: string): Promise<LiveExerciseSeoEntry | null> {
  const entries = await listLiveExerciseSeoEntries();
  return entries.find((entry) => entry.slug === slug) ?? null;
}
