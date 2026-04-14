import { NextResponse } from "next/server";
import { syncWgerExercises } from "@/lib/wger/sync";

export const dynamic = "force-dynamic";

type RequestBody = {
  batchSize?: unknown;
  maxPages?: unknown;
};

function isAuthorized(request: Request): boolean {
  const token = process.env.ADMIN_SYNC_TOKEN;
  if (!token) return false;
  return request.headers.get("x-admin-sync-token")?.trim() === token;
}

function toPositiveInt(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value));
}

export async function POST(request: Request) {
  if (process.env.MEDIA_PROVIDER_WGER_ENABLED !== "true") {
    return NextResponse.json(
      { ok: false, error: "Wger sync is disabled. Use ExerciseDB sync." },
      { status: 409 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const batchSize = toPositiveInt(body.batchSize, 40);
    const maxPages = toPositiveInt(body.maxPages, 200);

    const report = await syncWgerExercises({
      batchSize,
      maxPages,
    });

    return NextResponse.json(
      {
        ok: report.errors.length === 0,
        report,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected sync error",
      },
      { status: 500 },
    );
  }
}
