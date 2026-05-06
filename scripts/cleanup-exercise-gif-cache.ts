import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { cleanupExpiredRuntimeExerciseGifs } from "../src/lib/exercise-media/runtime-cache";

function parseLimit(): number {
  const arg = process.argv.slice(2).find((item) => item.startsWith("--limit="));
  const value = arg ? Number(arg.slice("--limit=".length)) : 128;
  if (!Number.isFinite(value) || value <= 0) {
    return 128;
  }

  return Math.floor(value);
}

async function main() {
  const limit = parseLimit();
  const removed = await cleanupExpiredRuntimeExerciseGifs(limit);
  console.log(JSON.stringify({ ok: true, removed, limit }, null, 2));
}

main().catch((error) => {
  console.error("[exercise-media] cleanup fatal", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
