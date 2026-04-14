import type { ExerciseMedia, MediaKind, ResolvedExerciseMedia } from "@/types/media";

export const MEDIA_PRIORITY: readonly MediaKind[] = ["video", "image", "icon"] as const;

function byKindPriority(a: ExerciseMedia, b: ExerciseMedia): number {
  return MEDIA_PRIORITY.indexOf(a.mediaKind) - MEDIA_PRIORITY.indexOf(b.mediaKind);
}

function byKindQuality(a: ExerciseMedia, b: ExerciseMedia): number {
  if (a.isPrimary !== b.isPrimary) {
    return a.isPrimary ? -1 : 1;
  }

  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }

  return a.createdAt.localeCompare(b.createdAt);
}

function getActiveMedia(media: ExerciseMedia[]): ExerciseMedia[] {
  return media.filter((item) => item.isActive);
}

function pickBestByKind(media: ExerciseMedia[], kind: MediaKind): ExerciseMedia | null {
  const candidates = media.filter((item) => item.mediaKind === kind);
  if (candidates.length === 0) return null;
  return [...candidates].sort(byKindQuality)[0] ?? null;
}

function resolveBestMedia(media: ExerciseMedia[]): ExerciseMedia | null {
  const active = getActiveMedia(media);
  if (active.length === 0) return null;

  const sorted = [...active].sort((a, b) => {
    const kindOrder = byKindPriority(a, b);
    if (kindOrder !== 0) return kindOrder;
    return byKindQuality(a, b);
  });

  return sorted[0] ?? null;
}

function assertResolved(media: ExerciseMedia[]): ExerciseMedia {
  const resolved = resolveBestMedia(media);
  if (!resolved) {
    throw new Error("No active media found. Every exercise must have at least one icon.");
  }
  return resolved;
}

function toResolved(media: ExerciseMedia, renderKind: MediaKind | "image", renderUrl: string): ResolvedExerciseMedia {
  const fallbackIcon = media.mediaKind === "icon" ? media.url : null;
  return {
    media,
    renderKind,
    renderUrl,
    videoUrl: media.mediaKind === "video" ? media.url : null,
    fallbackIconUrl: fallbackIcon,
  };
}

export function resolvePrimaryMedia(media: ExerciseMedia[]): ResolvedExerciseMedia {
  const best = assertResolved(media);
  const icon = getPrimaryByKind(media, "icon");
  const resolved = toResolved(best, best.mediaKind, best.url);
  return { ...resolved, fallbackIconUrl: icon?.url ?? resolved.fallbackIconUrl };
}

export function resolveListMedia(media: ExerciseMedia[]): ResolvedExerciseMedia {
  const best = assertResolved(media);

  if (best.mediaKind === "video") {
    const previewUrl = best.posterUrl ?? best.thumbnailUrl;
    if (previewUrl) {
      const resolved = toResolved(best, "image", previewUrl);
      const icon = getPrimaryByKind(media, "icon");
      return { ...resolved, fallbackIconUrl: icon?.url ?? resolved.fallbackIconUrl };
    }

    const image = getPrimaryByKind(media, "image");
    if (image) {
      const resolved = toResolved(image, "image", image.url);
      const icon = getPrimaryByKind(media, "icon");
      return { ...resolved, fallbackIconUrl: icon?.url ?? resolved.fallbackIconUrl };
    }

    const icon = getPrimaryByKind(media, "icon");
    if (icon) {
      return toResolved(icon, "icon", icon.url);
    }

    throw new Error("No renderable preview media found for list context.");
  }

  const resolved = toResolved(best, best.mediaKind, best.url);
  const icon = getPrimaryByKind(media, "icon");
  return { ...resolved, fallbackIconUrl: icon?.url ?? resolved.fallbackIconUrl };
}

export function resolveVictoryMedia(media: ExerciseMedia[]): ResolvedExerciseMedia {
  return resolveListMedia(media);
}

export function normalizeMediaWithGuaranteedIcon(media: ExerciseMedia[]): ExerciseMedia[] {
  const active = getActiveMedia(media);
  const hasIcon = active.some((item) => item.mediaKind === "icon");
  if (!hasIcon) {
    throw new Error("Invalid media set: icon fallback is required.");
  }

  return active;
}

export function getPrimaryByKind(media: ExerciseMedia[], kind: MediaKind): ExerciseMedia | null {
  return pickBestByKind(getActiveMedia(media), kind);
}
