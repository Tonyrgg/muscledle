'use client';

import { useEffect, useState } from "react";

type ExerciseMediaResponse = {
  ok: boolean;
  media?: {
    mediaUrl: string | null;
    mediaType: string;
    syncStatus: string;
    syncError: string | null;
  } | null;
  error?: string;
};

type ExerciseMediaPreviewProps = {
  exerciseSlug: string;
  exerciseName: string;
};

export function ExerciseMediaPreview({ exerciseSlug, exerciseName }: ExerciseMediaPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaBroken, setMediaBroken] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadMedia() {
      setIsLoading(true);
      setError(null);
      setMediaUrl(null);
      setMediaBroken(false);

      try {
        const response = await fetch(`/api/exercises/${encodeURIComponent(exerciseSlug)}/media`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as ExerciseMediaResponse | null;

        if (!active) return;

        if (!response.ok || !payload?.ok) {
          setError(payload?.error ?? `Failed to load media (${response.status})`);
          return;
        }

        const url = payload.media?.mediaUrl ?? null;
        if (!url) {
          setError("Demo unavailable");
          return;
        }

        setMediaUrl(url);
      } catch {
        if (!active) return;
        setError("Failed to load media");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadMedia();
    return () => {
      active = false;
    };
  }, [exerciseSlug]);

  if (isLoading) {
    return <p className="exercise-media-preview__state">Loading demo...</p>;
  }

  if (error) {
    return <p className="exercise-media-preview__state">{error}</p>;
  }

  if (!mediaUrl || mediaBroken) {
    return <p className="exercise-media-preview__state">Demo unavailable</p>;
  }

  return (
    <img
      src={mediaUrl}
      alt={`Demo ${exerciseName}`}
      className="exercise-media-preview__gif"
      loading="lazy"
      onError={() => setMediaBroken(true)}
    />
  );
}
