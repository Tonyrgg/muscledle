import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { exercisesSeed } from "../src/data/exercises.seed";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function seed() {
  const { error } = await supabase
    .from("exercises")
    .upsert(exercisesSeed, { onConflict: "slug" });

  if (error) {
    console.error("Failed to seed exercises:", error.message);
    process.exitCode = 1;
    return;
  }

  console.log(`Seeded ${exercisesSeed.length} exercises successfully.`);
}

seed().catch((error) => {
  console.error("Unexpected seed error:", error);
  process.exitCode = 1;
});