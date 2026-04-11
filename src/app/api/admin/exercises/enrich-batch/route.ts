import { NextResponse } from "next/server";
import { enrichExercisesBatch } from "@/lib/exercise-enrichment/service";

export const dynamic = "force-dynamic";

type RequestBody = {
  slugs?: unknown;
  onlyMissing?: unknown;
};

function isAuthorized(request: Request): boolean {
  const token = process.env.ADMIN_SYNC_TOKEN;
  if (!token) return false;

  const incoming = request.headers.get("x-admin-sync-token")?.trim();
  return incoming === token;
}

function parseSlugs(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
    .filter(Boolean);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const slugs = parseSlugs(body.slugs);
    const onlyMissing = body.onlyMissing === true;

    const report = await enrichExercisesBatch({
      slugs: slugs.length > 0 ? slugs : undefined,
      onlyMissing,
    });

    return NextResponse.json(
      {
        ok: true,
        options: {
          onlyMissing,
          slugs,
        },
        report,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/admin/exercises/enrich-batch failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}

