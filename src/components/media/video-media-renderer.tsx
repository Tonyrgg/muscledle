import { useEffect, useMemo, useState } from "react";
import type { MediaRenderContext, ResolvedExerciseMedia } from "@/types/media";

type VideoMediaRendererProps = {
  media: ResolvedExerciseMedia;
  context: MediaRenderContext;
  alt: string;
  className?: string;
};

function toYoutubeEmbedUrl(sourceId: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(sourceId)}?rel=0&modestbranding=1`;
}

export function VideoMediaRenderer({ media, context, alt, className }: VideoMediaRendererProps) {
  const fallbackUrl = media.fallbackIconUrl ?? null;
  const initialUrl = media.renderUrl;
  const [failedForUrl, setFailedForUrl] = useState<string | null>(null);
  const [loadedForUrl, setLoadedForUrl] = useState<string | null>(null);
  const currentSrc = failedForUrl === initialUrl && fallbackUrl ? fallbackUrl : initialUrl;
  const loaded = loadedForUrl === initialUrl;
  const hasMediaGifProxy = useMemo(() => initialUrl.includes("/api/exercises/media-gif"), [initialUrl]);

  useEffect(() => {
    if (context === "modal" || !hasMediaGifProxy || loaded || !fallbackUrl || failedForUrl === initialUrl) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFailedForUrl(initialUrl);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [context, failedForUrl, fallbackUrl, hasMediaGifProxy, initialUrl, loaded]);

  if (context !== "modal") {

    return (
      <img
        src={currentSrc}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setLoadedForUrl(initialUrl)}
        onError={() => {
          if (fallbackUrl) setFailedForUrl(initialUrl);
          setLoadedForUrl(initialUrl);
        }}
      />
    );
  }

  if (media.media.source === "youtube" && media.media.sourceId) {
    return (
      <iframe
        src={toYoutubeEmbedUrl(media.media.sourceId)}
        title={alt}
        className={className}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <video
      className={className}
      controls
      preload="metadata"
      poster={media.media.posterUrl ?? media.media.thumbnailUrl ?? undefined}
      src={media.videoUrl ?? media.media.url}
    >
      Your browser does not support video playback.
    </video>
  );
}
