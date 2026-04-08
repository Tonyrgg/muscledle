import type { Exercise } from "@/types/exercise";
import { createClient } from "@/lib/supabase/server";

export async function getLiveExercises(): Promise<Exercise[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("is_live", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load live exercises: ${error.message}`);
  }

  return (data ?? []) as Exercise[];
}
