import { NextResponse } from "next/server";
import { getExerciseEnrichmentBySlug } from "@/lib/exercise-enrichment/repository";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const normalizedSlug = slug.trim().toLowerCase();

    if (!normalizedSlug) {
      return NextResponse.json({ ok: false, error: "Invalid slug" }, { status: 400 });
    }

    const enrichment = await getExerciseEnrichmentBySlug(normalizedSlug);
    return NextResponse.json({ ok: true, enrichment }, { status: 200 });
  } catch (error) {
    console.error("GET /api/exercises/[slug]/enrichment failed", error);
    return NextResponse.json({ ok: false, error: "Failed to load enrichment" }, { status: 500 });
  }
}

