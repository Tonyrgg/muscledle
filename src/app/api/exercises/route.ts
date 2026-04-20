import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getExerciseNaming } from "@/lib/exercises/naming";

type ExerciseSuggestionRow = {
  id: string;
  name: string;
  slug: string;
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

type ExerciseSuggestionResponseRow = ExerciseSuggestionRow & {
  canonical_name: string;
  display_name: string;
};

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, slug, aliases, muscle_group, muscle, equipment, movement, pattern, reps, goal, ego")
      .eq("is_live", true)
      .order("name", { ascending: true })
      .returns<ExerciseSuggestionRow[]>();

    if (error) {
      return NextResponse.json(
        { error: `Failed to load live exercises: ${error.message}` },
        { status: 500 },
      );
    }

    const rows = (data ?? [])
      .map((row) => {
        const naming = getExerciseNaming(row.slug, row.name, row.aliases ?? []);
        if (naming.merged_into_slug) return null;
        return {
          ...row,
          name: naming.display_name,
          canonical_name: naming.canonical_name,
          display_name: naming.display_name,
          aliases: naming.aliases,
        } satisfies ExerciseSuggestionResponseRow;
      })
      .filter((row): row is ExerciseSuggestionResponseRow => row !== null)
      .sort((a, b) => a.display_name.localeCompare(b.display_name));

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("/api/exercises failed", error);
    return NextResponse.json({ error: "Failed to load live exercises." }, { status: 500 });
  }
}
