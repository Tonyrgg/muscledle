import { NextResponse } from "next/server";
import { getFallbackGifUrlByExerciseId } from "@/lib/exercise-media/fallback-gifs";
import {
  loadRuntimeCachedExerciseGif,
  maybeCleanupExpiredRuntimeExerciseGifs,
  storeRuntimeExerciseGif,
} from "@/lib/exercise-media/runtime-cache";

export const dynamic = "force-dynamic";

const ALLOWED_RESOLUTIONS = new Set(["180", "360", "720", "1080"]);
const UPSTREAM_TIMEOUT_MS = 4500;

type GifPayload = {
  bytes: Uint8Array;
  contentType: string;
  source: string;
};

function fallbackGifResponse(reason: string) {
  return new Response("GIF unavailable", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      "X-Media-Fallback": reason,
    },
  });
}

async function fetchFallbackGifByExerciseId(exerciseId: string): Promise<GifPayload | null> {
  const fallbackUrl = await getFallbackGifUrlByExerciseId(exerciseId);
  if (!fallbackUrl) {
    return null;
  }

  const response = await fetch(fallbackUrl, {
    method: "GET",
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error(`fallback_http_${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("image/gif")) {
    throw new Error("fallback_not_gif");
  }

  const payload = await response.arrayBuffer();
  if (payload.byteLength === 0) {
    throw new Error("fallback_empty_body");
  }

  return {
    bytes: new Uint8Array(payload),
    contentType: "image/gif",
    source: "github_dataset",
  };
}

function buildGifResponse(payload: GifPayload): Response {
  const responseBuffer = payload.bytes.buffer.slice(
    payload.bytes.byteOffset,
    payload.bytes.byteOffset + payload.bytes.byteLength,
  ) as ArrayBuffer;

  return new Response(new Blob([responseBuffer], { type: payload.contentType || "image/gif" }), {
    status: 200,
    headers: {
      "Content-Type": payload.contentType || "image/gif",
      "Content-Length": String(payload.bytes.byteLength),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Media-Fallback": payload.source,
    },
  });
}

async function persistRuntimeCache(
  exerciseId: string,
  resolution: string,
  payload: GifPayload,
): Promise<void> {
  const stored = await storeRuntimeExerciseGif({
    exerciseId,
    resolution,
    payload,
  });

  if (!stored.ok) {
    console.error("[exercise-media] runtime cache persist failed", stored.error);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const exerciseId = (url.searchParams.get("exerciseId") ?? "").trim();
  const resolutionParam = (url.searchParams.get("resolution") ?? "360").trim();
  const resolution = ALLOWED_RESOLUTIONS.has(resolutionParam) ? resolutionParam : "360";

  if (!exerciseId) {
    return NextResponse.json({ error: "Missing exerciseId" }, { status: 400 });
  }

  await maybeCleanupExpiredRuntimeExerciseGifs();

  const cached = await loadRuntimeCachedExerciseGif(exerciseId, resolution);
  if (cached) {
    return buildGifResponse(cached);
  }

  const baseUrl = (process.env.EXERCISEDB_API_BASE_URL ?? "https://exercisedb.p.rapidapi.com").replace(/\/+$/, "");
  const host = process.env.EXERCISEDB_API_HOST ?? "exercisedb.p.rapidapi.com";
  const key = process.env.EXERCISEDB_API_KEY;

  if (!key) {
    try {
      const fallback = await fetchFallbackGifByExerciseId(exerciseId);
      if (fallback) {
        await persistRuntimeCache(exerciseId, resolution, fallback);
        return buildGifResponse(fallback);
      }
    } catch (fallbackError) {
      console.error("GET /api/exercises/media-gif fallback fetch failed", fallbackError);
    }
    return fallbackGifResponse("missing_api_key");
  }

  const providerUrl = `${baseUrl}/image?exerciseId=${encodeURIComponent(exerciseId)}&resolution=${resolution}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("upstream_timeout"), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(providerUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-key": key,
        "x-rapidapi-host": host,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!upstream.ok) {
      await upstream.body?.cancel().catch(() => undefined);
      try {
        const fallback = await fetchFallbackGifByExerciseId(exerciseId);
        if (fallback) {
          await persistRuntimeCache(exerciseId, resolution, fallback);
          return buildGifResponse(fallback);
        }
      } catch (fallbackError) {
        console.error("GET /api/exercises/media-gif fallback fetch failed", fallbackError);
      }
      return fallbackGifResponse(`upstream_${upstream.status}`);
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("image/gif")) {
      await upstream.body?.cancel().catch(() => undefined);
      try {
        const fallback = await fetchFallbackGifByExerciseId(exerciseId);
        if (fallback) {
          await persistRuntimeCache(exerciseId, resolution, fallback);
          return buildGifResponse(fallback);
        }
      } catch (fallbackError) {
        console.error("GET /api/exercises/media-gif fallback fetch failed", fallbackError);
      }
      return fallbackGifResponse("upstream_not_gif");
    }

    const payload = await upstream.arrayBuffer();
    if (payload.byteLength === 0) {
      try {
        const fallback = await fetchFallbackGifByExerciseId(exerciseId);
        if (fallback) {
          await persistRuntimeCache(exerciseId, resolution, fallback);
          return buildGifResponse(fallback);
        }
      } catch (fallbackError) {
        console.error("GET /api/exercises/media-gif fallback fetch failed", fallbackError);
      }
      return fallbackGifResponse("upstream_empty_body");
    }

    const resolvedPayload: GifPayload = {
      bytes: new Uint8Array(payload),
      contentType: "image/gif",
      source: "exercisedb_upstream",
    };
    await persistRuntimeCache(exerciseId, resolution, resolvedPayload);
    return buildGifResponse(resolvedPayload);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      try {
        const fallback = await fetchFallbackGifByExerciseId(exerciseId);
        if (fallback) {
          await persistRuntimeCache(exerciseId, resolution, fallback);
          return buildGifResponse(fallback);
        }
      } catch (fallbackError) {
        console.error("GET /api/exercises/media-gif fallback fetch failed", fallbackError);
      }
      return fallbackGifResponse("upstream_timeout");
    }
    console.error("GET /api/exercises/media-gif failed", error);
    try {
      const fallback = await fetchFallbackGifByExerciseId(exerciseId);
      if (fallback) {
        await persistRuntimeCache(exerciseId, resolution, fallback);
        return buildGifResponse(fallback);
      }
    } catch (fallbackError) {
      console.error("GET /api/exercises/media-gif fallback fetch failed", fallbackError);
    }
    return fallbackGifResponse("fetch_error");
  } finally {
    clearTimeout(timeout);
  }
}
