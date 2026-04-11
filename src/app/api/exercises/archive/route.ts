import { NextResponse } from "next/server";
import { listExerciseArchive } from "@/lib/exercise-archive/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const liveOnly = (url.searchParams.get("liveOnly") ?? "false").toLowerCase() === "true";

    const rows = await listExerciseArchive();

    const filtered = rows.filter((row) => {
      if (liveOnly && !row.isLive) return false;
      if (!q) return true;

      const haystack = `${row.name} ${row.slug} ${row.aliases.join(" ")} ${row.muscleGroup}`.toLowerCase();
      return haystack.includes(q);
    });

    return NextResponse.json({ ok: true, total: filtered.length, rows: filtered }, { status: 200 });
  } catch (error) {
    console.error("GET /api/exercises/archive failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}

