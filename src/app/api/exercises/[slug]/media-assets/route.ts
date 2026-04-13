import { NextResponse } from "next/server";
import { getExerciseMediaAssetsBySlug } from "@/lib/media/repository";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const media = await getExerciseMediaAssetsBySlug(slug);

    return NextResponse.json(
      {
        ok: true,
        media,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load exercise media assets.",
      },
      { status: 500 },
    );
  }
}
