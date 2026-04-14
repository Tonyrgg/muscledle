import type { ExerciseMedia, MediaSource } from "@/types/media";
import type { WgerExercisePayload } from "@/lib/wger/types";

export type MappedExercise = {
  slug: string;
  name: string;
  normalized_name: string;
  muscle_group: "chest" | "back" | "legs" | "shoulders" | "arms" | "core";
  description: string | null;
  category: string | null;
  equipment: string[];
  primary_muscles: string[];
  secondary_muscles: string[];
  wger_base_id: number | null;
  wger_exercise_id: number | null;
  source: MediaSource;
  has_video: boolean;
  has_image: boolean;
  has_icon: boolean;
  is_active: boolean;
};

export type MappedAlias = {
  alias: string;
  normalized_alias: string;
};

export type MappedMedia = Omit<ExerciseMedia, "exerciseId">;

export type MappedWgerExercise = {
  exercise: MappedExercise;
  aliases: MappedAlias[];
  media: MappedMedia[];
};

function safeTrim(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeText(input: unknown): string {
  return safeTrim(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSlug(input: unknown): string {
  return normalizeText(input).replace(/\s+/g, "-");
}

function uniq(values: Array<unknown>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of values) {
    const value = safeTrim(item);
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }

  return out;
}

function inferMuscleGroup(primaryMuscles: string[], category: string | null): MappedExercise["muscle_group"] {
  const haystack = [...primaryMuscles, category ?? ""].map((value) => value.toLowerCase());
  const joined = haystack.join(" ");

  if (/chest|pect/.test(joined)) return "chest";
  if (/lat|back|trap|rhomboid|spine/.test(joined)) return "back";
  if (/quad|hamstring|glute|calf|leg/.test(joined)) return "legs";
  if (/delt|shoulder/.test(joined)) return "shoulders";
  if (/bicep|tricep|forearm|arm/.test(joined)) return "arms";
  return "core";
}

function pickPreferredTranslation(payload: WgerExercisePayload) {
  const translations = payload.translations ?? [];
  return (
    translations.find((item) => item?.language === 2 && safeTrim(item?.name)) ??
    translations.find((item) => safeTrim(item?.name)) ??
    null
  );
}

export function mapWgerExerciseToLiftle(payload: WgerExercisePayload): MappedWgerExercise {
  const preferredTranslation = pickPreferredTranslation(payload);
  const fallbackName = `Wger Exercise ${payload.id}`;
  const name = safeTrim(preferredTranslation?.name) || safeTrim(payload.name) || fallbackName;
  const slug = toSlug(name) || `wger-exercise-${payload.id}`;
  const now = new Date().toISOString();
  const equipment = uniq((payload.equipment ?? []).map((item) => item?.name));
  const primaryMuscles = uniq((payload.muscles ?? []).map((item) => item?.name));
  const secondaryMuscles = uniq((payload.muscles_secondary ?? []).map((item) => item?.name));
  const category = safeTrim(payload.category?.name) || null;
  const muscleGroup = inferMuscleGroup(primaryMuscles, category);
  const imageMedia = (payload.images ?? []).map((image, index) => ({
    id: `wger-image-${payload.id}-${image.id ?? index}`,
    mediaKind: "image" as const,
    source: "wger" as const,
    sourceId: String(image.id ?? index),
    url: image.image,
    thumbnailUrl: image.image,
    posterUrl: image.image,
    mimeType: null,
    width: null,
    height: null,
    durationSeconds: null,
    isPrimary: image.is_main === true || index === 0,
    sortOrder: index,
    isActive: true,
    attributionText: image.license_author ?? null,
    attributionUrl: null,
    license: null,
    createdAt: now,
    updatedAt: now,
  }));

  const videoMedia = (payload.videos ?? []).map((video, index) => ({
    id: `wger-video-${payload.id}-${video.id ?? index}`,
    mediaKind: "video" as const,
    source: "wger" as const,
    sourceId: String(video.id ?? index),
    url: video.video,
    thumbnailUrl: null,
    posterUrl: null,
    mimeType: null,
    width: null,
    height: null,
    durationSeconds: video.duration ?? null,
    isPrimary: video.is_main === true || index === 0,
    sortOrder: index,
    isActive: true,
    attributionText: null,
    attributionUrl: null,
    license: null,
    createdAt: now,
    updatedAt: now,
  }));

  return {
    exercise: {
      slug,
      name,
      normalized_name: normalizeText(name),
      muscle_group: muscleGroup,
      description: safeTrim(preferredTranslation?.description) || safeTrim(payload.description) || null,
      category,
      equipment,
      primary_muscles: primaryMuscles,
      secondary_muscles: secondaryMuscles,
      wger_base_id: payload.exercise_base,
      wger_exercise_id: payload.id,
      source: "wger",
      has_video: videoMedia.length > 0,
      has_image: imageMedia.length > 0,
      has_icon: true,
      is_active: true,
    },
    aliases: uniq([...(payload.aliases ?? []), ...(preferredTranslation?.aliases ?? [])]).map((alias) => ({
      alias,
      normalized_alias: normalizeText(alias),
    })),
    media: [...videoMedia, ...imageMedia],
  };
}
