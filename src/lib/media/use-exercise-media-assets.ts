"use client";

import { useEffect, useMemo, useState } from "react";
import type { ExerciseMedia } from "@/types/media";

type MediaAssetsPayload = {
  ok: boolean;
  media?: ExerciseMedia[];
  error?: string;
};

const mediaCache = new Map<string, ExerciseMedia[]>();
const inFlight = new Map<string, Promise<ExerciseMedia[]>>();

async function fetchMediaAssets(slug: string): Promise<ExerciseMedia[]> {
  const cached = mediaCache.get(slug);
  if (cached) return cached;

  const pending = inFlight.get(slug);
  if (pending) return pending;

  const task = (async () => {
    const response = await fetch(`/api/exercises/${encodeURIComponent(slug)}/media-assets`, {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as MediaAssetsPayload | null;
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error ?? `Failed to load media assets (${response.status}).`);
    }

    const media = payload.media ?? [];
    mediaCache.set(slug, media);
    return media;
  })()
    .finally(() => {
      inFlight.delete(slug);
    });

  inFlight.set(slug, task);
  return task;
}

export function invalidateExerciseMediaAssets(slug: string): void {
  mediaCache.delete(slug);
}

export function useExerciseMediaAssets(slug: string, fallbackMedia: ExerciseMedia[]) {
  const normalized = slug.trim().toLowerCase();
  const [media, setMedia] = useState<ExerciseMedia[]>(() => mediaCache.get(normalized) ?? fallbackMedia);
  const [loading, setLoading] = useState(() => !mediaCache.has(normalized));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!normalized) return;

    let active = true;
    const kickoff = window.setTimeout(() => {
      if (!active) return;
      setLoading(!mediaCache.has(normalized));
      setError(null);
    }, 0);

    void fetchMediaAssets(normalized)
      .then((payload) => {
        if (!active) return;
        setMedia(payload.length > 0 ? payload : fallbackMedia);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load media assets.");
        setMedia(fallbackMedia);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(kickoff);
    };
  }, [fallbackMedia, normalized]);

  return useMemo(
    () => ({
      media,
      loading,
      error,
    }),
    [error, loading, media],
  );
}
