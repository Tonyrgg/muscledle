import { useEffect, useMemo, useState } from "react";
import type { ResolvedExerciseMedia } from "@/types/media";

type ImageMediaRendererProps = {
  media: ResolvedExerciseMedia;
  alt: string;
  className?: string;
  eager?: boolean;
};

export function ImageMediaRenderer({ media, alt, className, eager = false }: ImageMediaRendererProps) {
  const fallbackUrl = media.fallbackIconUrl ?? null;
  const initialUrl = media.renderUrl;
  const blockedProviderProxy = initialUrl.includes("/api/exercises/media-gif");
  const [failedForUrl, setFailedForUrl] = useState<string | null>(null);
  const [loadedForUrl, setLoadedForUrl] = useState<string | null>(null);
  const currentSrc = blockedProviderProxy
    ? (fallbackUrl ?? initialUrl)
    : (failedForUrl === initialUrl && fallbackUrl ? fallbackUrl : initialUrl);
  const loaded = loadedForUrl === initialUrl;
  const hasMediaGifProxy = useMemo(() => initialUrl.includes("/api/exercises/media-gif"), [initialUrl]);

  useEffect(() => {
    if (!hasMediaGifProxy || loaded || !fallbackUrl || failedForUrl === initialUrl) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFailedForUrl(initialUrl);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [failedForUrl, fallbackUrl, hasMediaGifProxy, initialUrl, loaded]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
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
