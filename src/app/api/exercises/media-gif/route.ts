import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_RESOLUTIONS = new Set(["180", "360", "720", "1080"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const exerciseId = (url.searchParams.get("exerciseId") ?? "").trim();
  const resolutionParam = (url.searchParams.get("resolution") ?? "360").trim();
  const resolution = ALLOWED_RESOLUTIONS.has(resolutionParam) ? resolutionParam : "360";

  if (!exerciseId) {
    return NextResponse.json({ error: "Missing exerciseId" }, { status: 400 });
  }

  const baseUrl = (process.env.EXERCISEDB_API_BASE_URL ?? "https://exercisedb.p.rapidapi.com").replace(/\/+$/, "");
  const host = process.env.EXERCISEDB_API_HOST ?? "exercisedb.p.rapidapi.com";
  const key = process.env.EXERCISEDB_API_KEY;

  if (!key) {
    return NextResponse.json({ error: "Missing EXERCISEDB_API_KEY" }, { status: 500 });
  }

  const providerUrl = `${baseUrl}/image?exerciseId=${encodeURIComponent(exerciseId)}&resolution=${resolution}`;

  try {
    const upstream = await fetch(providerUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-key": key,
        "x-rapidapi-host": host,
      },
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          error: "ExerciseDB image fetch failed",
          status: upstream.status,
          details: text.slice(0, 200),
        },
        { status: 502 },
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/gif",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("GET /api/exercises/media-gif failed", error);
    return NextResponse.json({ error: "Failed to stream gif" }, { status: 500 });
  }
}
