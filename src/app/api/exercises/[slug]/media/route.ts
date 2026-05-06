import { NextResponse } from "next/server";
import { getExerciseMediaBySlug } from "@/lib/exercise-media/repository";
import { getExerciseMediaAssetsBySlug } from "@/lib/media/repository";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const normalized = slug.trim().toLowerCase();

    if (!normalized) {
      return NextResponse.json({ ok: false, error: "Invalid slug" }, { status: 400 });
    }

    const mediaAssets = await getExerciseMediaAssetsBySlug(normalized);
    const primaryAsset =
      mediaAssets.find((item) => item.mediaKind !== "icon" && item.isPrimary && item.isActive) ??
      mediaAssets.find((item) => item.mediaKind !== "icon" && item.isActive) ??
      null;

    if (primaryAsset?.url) {
      return NextResponse.json(
        { ok: true, media: { mediaUrl: primaryAsset.url } },
        { status: 200 },
      );
    }

    const legacyMedia = await getExerciseMediaBySlug(normalized);
    return NextResponse.json(
      { ok: true, media: { mediaUrl: legacyMedia?.mediaUrl ?? null } },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/exercises/[slug]/media failed", error);
    return NextResponse.json({ ok: false, error: "Failed to load media" }, { status: 500 });
  }
}
