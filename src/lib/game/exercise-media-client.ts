'use client';

type ExerciseMediaResponse = {
  ok: boolean;
  media?: {
    mediaUrl: string | null;
  } | null;
};

const mediaUrlCache = new Map<string, string | null>();
const mediaUrlRequests = new Map<string, Promise<string | null>>();
const loadedMediaUrls = new Set<string>();
const mediaLoadRequests = new Map<string, Promise<void>>();

export function hasResolvedExerciseMedia(slug: string): boolean {
  const cached = mediaUrlCache.get(slug);
  return typeof cached === "string" && cached.length > 0;
}

export function getCachedExerciseMediaUrl(slug: string): string | null | undefined {
  return mediaUrlCache.get(slug);
}

export function isExerciseMediaLoaded(url: string): boolean {
  return loadedMediaUrls.has(url);
}

export function markExerciseMediaLoaded(url: string): void {
  loadedMediaUrls.add(url);
}

export function clearExerciseMediaUrl(slug: string): void {
  mediaUrlCache.delete(slug);
}

export async function resolveExerciseMediaUrl(slug: string): Promise<string | null> {
  const cached = mediaUrlCache.get(slug);
  if (typeof cached === "string" && cached.length > 0) {
    return cached;
  }

  const inFlight = mediaUrlRequests.get(slug);
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    try {
      const response = await fetch(`/api/exercises/${encodeURIComponent(slug)}/media`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as ExerciseMediaResponse | null;
      const mediaUrl = response.ok && payload?.ok ? (payload.media?.mediaUrl ?? null) : null;
      if (mediaUrl) {
        mediaUrlCache.set(slug, mediaUrl);
      } else {
        mediaUrlCache.delete(slug);
      }
      return mediaUrl;
    } catch {
      mediaUrlCache.delete(slug);
      return null;
    } finally {
      mediaUrlRequests.delete(slug);
    }
  })();

  mediaUrlRequests.set(slug, request);
  return request;
}

export async function preloadExerciseMedia(slug: string): Promise<void> {
  const mediaUrl = await resolveExerciseMediaUrl(slug);

  if (!mediaUrl || loadedMediaUrls.has(mediaUrl) || typeof Image === "undefined") {
    return;
  }

  const inFlight = mediaLoadRequests.get(mediaUrl);
  if (inFlight) {
    await inFlight;
    return;
  }

  const loadPromise = new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      loadedMediaUrls.add(mediaUrl);
      resolve();
    };
    img.onerror = () => {
      resolve();
    };
    img.src = mediaUrl;
  }).finally(() => {
    mediaLoadRequests.delete(mediaUrl);
  });

  mediaLoadRequests.set(mediaUrl, loadPromise);
  await loadPromise;
}
