import { NextResponse } from "next/server";
import { getExerciseMediaBySlug } from "@/lib/exercise-media/repository";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const normalized = slug.trim().toLowerCase();

    if (!normalized) {
      return NextResponse.json({ ok: false, error: "Invalid slug" }, { status: 400 });
    }

    const media = await getExerciseMediaBySlug(normalized);
    return NextResponse.json({ ok: true, media }, { status: 200 });
  } catch (error) {
    console.error("GET /api/exercises/[slug]/media failed", error);
    return NextResponse.json({ ok: false, error: "Failed to load media" }, { status: 500 });
  }
}
