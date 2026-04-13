import { NextResponse } from "next/server";
import { syncExerciseDbMediaAssets } from "@/lib/media/sync-exercisedb";

export const dynamic = "force-dynamic";

type RequestBody = {
  limit?: unknown;
  offset?: unknown;
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

function toNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const limit = toPositiveInt(body.limit, 250);
    const offset = toNonNegativeInt(body.offset, 0);

    const report = await syncExerciseDbMediaAssets({ limit, offset });

    return NextResponse.json(
      {
        ok: report.failed === 0,
        options: { limit, offset },
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

