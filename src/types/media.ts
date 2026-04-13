export type MediaKind = "video" | "image" | "icon";
export type MediaSource = "wger" | "youtube" | "local" | "custom";
export type MediaRenderContext = "list" | "modal" | "victory";

export type ExerciseMedia = {
  id: string;
  exerciseId: string;
  mediaKind: MediaKind;
  source: MediaSource;
  sourceId: string | null;
  url: string;
  thumbnailUrl: string | null;
  posterUrl: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  isPrimary: boolean;
  sortOrder: number;
  isActive: boolean;
  attributionText: string | null;
  attributionUrl: string | null;
  license: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Exercise = {
  id: string;
  slug: string;
  name: string;
  normalizedName: string;
  description: string | null;
  category: string | null;
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  wgerBaseId: number | null;
  wgerExerciseId: number | null;
  source: MediaSource;
  hasVideo: boolean;
  hasImage: boolean;
  hasIcon: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ResolvedExerciseMedia = {
  media: ExerciseMedia;
  renderKind: MediaKind | "image";
  renderUrl: string;
  videoUrl: string | null;
  fallbackIconUrl: string | null;
};
