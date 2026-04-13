import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_RESOLUTIONS = new Set(["180", "360", "720", "1080"]);
const FALLBACK_GIF_BASE64 = "R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=";

function fallbackGifResponse(reason: string) {
  const body = Buffer.from(FALLBACK_GIF_BASE64, "base64");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "public, max-age=300",
      "X-Media-Fallback": reason,
    },
  });
}

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
    return fallbackGifResponse("missing_api_key");
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
      await upstream.body?.cancel().catch(() => undefined);
      return fallbackGifResponse(`upstream_${upstream.status}`);
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
    return fallbackGifResponse("fetch_error");
  }
}
