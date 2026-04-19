import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { buildPostGameInsights } from "../src/lib/exercises/post-game-insights";

type LiveExerciseSuggestion = {
  id: string;
  slug: string;
  name: string;
  muscle_group: "chest" | "back" | "legs" | "shoulders" | "arms" | "core";
  muscle: Array<"chest" | "back" | "legs" | "shoulders" | "arms" | "core">;
  equipment: Array<"barbell" | "dumbbells" | "bodyweight" | "machine" | "cable" | "kettlebell">;
  movement: Array<"push" | "pull" | "isolation" | "core">;
  pattern: Array<"horizontal" | "vertical" | "squat" | "hinge">;
  reps: Array<"1-5" | "6-12" | "12+">;
  goal: Array<"strength" | "hypertrophy" | "endurance" | "skill">;
  ego: Array<"low" | "medium" | "high">;
};

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("exercises")
    .select("id, slug, name, muscle_group, muscle, equipment, movement, pattern, reps, goal, ego")
    .eq("is_live", true)
    .order("name", { ascending: true })
    .returns<LiveExerciseSuggestion[]>();

  if (error) throw new Error(`Failed to load live exercises: ${error.message}`);

  for (const exercise of data ?? []) {
    const notes = buildPostGameInsights(exercise);
    console.log(
      `${exercise.name}: why_use=${notes.whyUse} - cues=${notes.cues.join(" | ")} - mistakes=${notes.mistakes.join(
        " | ",
      )} - easier=${notes.variants.easier} - harder=${notes.variants.harder} - hypertrophy=${notes.dose.hypertrophy} - strength_or_skill=${notes.dose.strengthOrSkill}`,
    );
  }
}

main().catch((error) => {
  console.error("[summarize-live-coach-notes] fatal", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

