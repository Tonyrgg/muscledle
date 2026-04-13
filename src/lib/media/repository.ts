import { createAdminClient } from "@/lib/supabase/admin";
import { getExerciseIconCandidates } from "@/lib/exercises/icons";
import type { ExerciseMedia, MediaKind, MediaSource } from "@/types/media";

type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
  muscle_group: string | null;
};

type NewMediaRow = {
  id: string;
  exercise_id: string;
  media_kind: MediaKind;
  source: MediaSource;
  source_id: string | null;
  url: string;
  thumbnail_url: string | null;
  poster_url: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  is_primary: boolean;
  sort_order: number;
  is_active: boolean;
  attribution_text: string | null;
  attribution_url: string | null;
  license: string | null;
  created_at: string;
  updated_at: string;
};

type LegacyMediaRow = {
  media_url: string | null;
  media_type: string;
  provider: string;
  provider_exercise_name: string | null;
  sync_status: string;
};

function toIconMedia(exercise: ExerciseRow): ExerciseMedia {
  const iconPath = getExerciseIconCandidates({
    slug: exercise.slug,
    muscle_group: exercise.muscle_group,
    name: exercise.name,
  })[0];

  return {
    id: `icon-${exercise.id}`,
    exerciseId: exercise.id,
    mediaKind: "icon",
    source: "local",
    sourceId: exercise.slug,
    url: iconPath ?? "/muscle-icons/full-body.svg",
    thumbnailUrl: null,
    posterUrl: null,
    mimeType: "image/svg+xml",
    width: null,
    height: null,
    durationSeconds: null,
    isPrimary: true,
    sortOrder: 0,
    isActive: true,
    attributionText: null,
    attributionUrl: null,
    license: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

function mapNewMedia(row: NewMediaRow): ExerciseMedia {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    mediaKind: row.media_kind,
    source: row.source,
    sourceId: row.source_id,
    url: row.url,
    thumbnailUrl: row.thumbnail_url,
    posterUrl: row.poster_url,
    mimeType: row.mime_type,
    width: row.width,
    height: row.height,
    durationSeconds: row.duration_seconds,
    isPrimary: row.is_primary,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    attributionText: row.attribution_text,
    attributionUrl: row.attribution_url,
    license: row.license,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLegacyMedia(row: LegacyMediaRow, exerciseId: string): ExerciseMedia | null {
  if (!row.media_url) return null;

  return {
    id: `legacy-${exerciseId}`,
    exerciseId,
    mediaKind: "image",
    source: "custom",
    sourceId: row.provider_exercise_name ?? null,
    url: row.media_url,
    thumbnailUrl: null,
    posterUrl: null,
    mimeType: row.media_type === "gif" ? "image/gif" : null,
    width: null,
    height: null,
    durationSeconds: null,
    isPrimary: true,
    sortOrder: 0,
    isActive: row.sync_status === "matched",
    attributionText: null,
    attributionUrl: null,
    license: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

export async function getExerciseMediaAssetsBySlug(slug: string): Promise<ExerciseMedia[]> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Invalid slug");
  }

  const admin = createAdminClient();
  const { data: exercise, error: exerciseError } = await admin
    .from("exercises")
    .select("id, slug, name, muscle_group")
    .eq("slug", normalized)
    .maybeSingle<ExerciseRow>();

  if (exerciseError) {
    throw new Error(`Failed to load exercise: ${exerciseError.message}`);
  }

  if (!exercise) {
    return [];
  }

  const baseIcon = toIconMedia(exercise);

  const { data: newMediaRows, error: newMediaError } = await admin
    .from("exercise_media_assets")
    .select(
      "id, exercise_id, media_kind, source, source_id, url, thumbnail_url, poster_url, mime_type, width, height, duration_seconds, is_primary, sort_order, is_active, attribution_text, attribution_url, license, created_at, updated_at",
    )
    .eq("exercise_id", exercise.id)
    .eq("is_active", true)
    .returns<NewMediaRow[]>();

  if (!newMediaError && Array.isArray(newMediaRows)) {
    const mapped = newMediaRows.map(mapNewMedia);
    const hasIcon = mapped.some((item) => item.mediaKind === "icon");
    return hasIcon ? mapped : [...mapped, baseIcon];
  }

  const { data: legacyRow } = await admin
    .from("exercise_media")
    .select("media_url, media_type, provider, provider_exercise_name, sync_status")
    .eq("exercise_slug", normalized)
    .maybeSingle<LegacyMediaRow>();

  const legacy = legacyRow ? mapLegacyMedia(legacyRow, exercise.id) : null;
  return legacy ? [legacy, baseIcon] : [baseIcon];
}
