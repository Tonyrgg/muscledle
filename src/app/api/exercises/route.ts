import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (error) {
    console.error("/api/exercises failed", error);
    return NextResponse.json({ error: "Failed to load live exercises." }, { status: 500 });
  }
}
