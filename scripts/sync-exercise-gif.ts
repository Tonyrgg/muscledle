import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { syncExerciseGifBySlug } from "../src/lib/exercise-media/service";

async function main() {
  const slug = process.argv[2]?.trim().toLowerCase();

  if (!slug) {
    throw new Error("Usage: npm run sync:gifs -- <exercise-slug>");
  }

  console.log(`[exercise-media] cli start slug=\"${slug}\"`);
  const result = await syncExerciseGifBySlug(slug);

  console.log("[exercise-media] cli result");
  console.log(
    JSON.stringify(
      {
        slug,
        ok: result.ok,
        status: result.status,
        details: result.details,
      },
      null,
      2,
    ),
  );

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[exercise-media] cli fatal", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
