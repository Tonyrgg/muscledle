import { NextResponse } from "next/server";
import { enrichExerciseBySlug } from "@/lib/exercise-enrichment/service";

export const dynamic = "force-dynamic";

type RequestBody = { slug?: unknown };

function isAuthorized(request: Request): boolean {
  const token = process.env.ADMIN_SYNC_TOKEN;
  if (!token) return false;

  const incoming = request.headers.get("x-admin-sync-token")?.trim();
  return incoming === token;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as RequestBody | null;
    const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";

    if (!slug) {
      return NextResponse.json({ ok: false, error: "Invalid body. Expected { slug: string }." }, { status: 400 });
    }

    const result = await enrichExerciseBySlug(slug);
    return NextResponse.json({ ok: true, slug, result }, { status: 200 });
  } catch (error) {
    console.error("POST /api/admin/exercises/enrich failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}

