import type { ResolvedExerciseMedia } from "@/types/media";

type IconMediaRendererProps = {
  media: ResolvedExerciseMedia;
  alt: string;
  className?: string;
};

export function IconMediaRenderer({ media, alt, className }: IconMediaRendererProps) {
  return (
    <img
      src={media.renderUrl}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
