import { IconMediaRenderer } from "@/components/media/icon-media-renderer";
import { ImageMediaRenderer } from "@/components/media/image-media-renderer";
import { VideoMediaRenderer } from "@/components/media/video-media-renderer";
import { resolveListMedia, resolvePrimaryMedia, resolveVictoryMedia } from "@/lib/media/resolver";
import type { ExerciseMedia, MediaRenderContext, ResolvedExerciseMedia } from "@/types/media";

type ExerciseMediaViewProps = {
  media: ExerciseMedia[];
  context: MediaRenderContext;
  alt: string;
  className?: string;
};

function resolveByContext(context: MediaRenderContext, media: ExerciseMedia[]): ResolvedExerciseMedia {
  if (context === "list") {
    return resolveListMedia(media);
  }

  if (context === "victory") {
    return resolveVictoryMedia(media);
  }

  return resolvePrimaryMedia(media);
}

export function ExerciseMediaView({ media, context, alt, className }: ExerciseMediaViewProps) {
  const resolved = resolveByContext(context, media);

  if (resolved.media.mediaKind === "video") {
    return <VideoMediaRenderer media={resolved} context={context} alt={alt} className={className} />;
  }

  if (resolved.renderKind === "image" || resolved.media.mediaKind === "image") {
    return <ImageMediaRenderer media={resolved} alt={alt} className={className} eager={context === "modal"} />;
  }

  return <IconMediaRenderer media={resolved} alt={alt} className={className} />;
}
