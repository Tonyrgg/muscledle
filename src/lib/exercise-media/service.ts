import { findBestMatch } from "@/lib/exercise-media/match";
import {
  buildExerciseDbProxyGifUrl,
  fetchExerciseDbGifById,
  searchExerciseDbByName,
} from "@/lib/exercise-media/providers/exercisedb";
import { getExerciseMediaBySlug, getInternalExerciseBySlug, upsertExerciseMedia } from "@/lib/exercise-media/repository";
import type { ExternalExerciseCandidate, InternalExercise, SyncStatus } from "@/lib/exercise-media/types";
import { createAdminClient } from "@/lib/supabase/admin";

function isValidGifUrl(value: string | null): boolean {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.pathname.toLowerCase().includes(".gif");
  } catch {
    return false;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

type GifPayload = {
  bytes: Uint8Array;
  contentType: string;
  source: string;
};

const storageBucket = (process.env.EXERCISE_MEDIA_BUCKET ?? "exercise-media").trim();
let bucketEnsured = false;

function buildStorageObjectPath(slug: string): string {
  return `exercise-gifs/${slug}.gif`;
}

async function ensureStorageBucket() {
  if (bucketEnsured) return { ok: true as const };

  const admin = createAdminClient();
  const { data, error } = await admin.storage.getBucket(storageBucket);

  if (!error && data) {
    bucketEnsured = true;
    return { ok: true as const };
  }

  const created = await admin.storage.createBucket(storageBucket, {
    public: true,
    fileSizeLimit: 5_000_000,
    allowedMimeTypes: ["image/gif"],
  });

  if (created.error && !created.error.message.toLowerCase().includes("already")) {
    return { ok: false as const, error: created.error.message };
  }

  bucketEnsured = true;
  return { ok: true as const };
}

async function uploadGifToStorage(slug: string, payload: GifPayload): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  const ensured = await ensureStorageBucket();
  if (!ensured.ok) {
    return { ok: false, error: `storage_bucket_error:${ensured.error}` };
  }

  const admin = createAdminClient();
  const objectPath = buildStorageObjectPath(slug);
  const upload = await admin.storage.from(storageBucket).upload(objectPath, payload.bytes, {
    contentType: payload.contentType || "image/gif",
    upsert: true,
    cacheControl: "31536000",
  });

  if (upload.error) {
    return { ok: false, error: `storage_upload_error:${upload.error.message}` };
  }

  const publicData = admin.storage.from(storageBucket).getPublicUrl(objectPath);
  const publicUrl = publicData.data.publicUrl?.trim();

  if (!publicUrl) {
    return { ok: false, error: "storage_public_url_missing" };
  }

  return { ok: true, publicUrl };
}

async function downloadGifFromUrl(url: string): Promise<GifPayload | null> {
  try {
    const response = await fetch(url, { method: "GET", cache: "no-store" });
    if (!response.ok) return null;

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    const looksGif = contentType.includes("image/gif") || url.toLowerCase().includes(".gif");
    if (!looksGif) return null;

    const arrayBuffer = await response.arrayBuffer();
    return {
      bytes: new Uint8Array(arrayBuffer),
      contentType: contentType || "image/gif",
      source: "candidate_url",
    };
  } catch {
    return null;
  }
}

async function resolveGifPayload(best: { candidate: ExternalExerciseCandidate; score: number; reason: string }): Promise<GifPayload | null> {
  if (isValidGifUrl(best.candidate.gifUrl)) {
    const byUrl = await downloadGifFromUrl(best.candidate.gifUrl as string);
    if (byUrl) return byUrl;
  }

  if (best.candidate.id) {
    const byId = await fetchExerciseDbGifById(best.candidate.id);
    if (byId.ok && byId.bytes) {
      return {
        bytes: byId.bytes,
        contentType: byId.contentType ?? "image/gif",
        source: "provider_by_id",
      };
    }
  }

  return null;
}

async function persistStatus(params: {
  slug: string;
  status: SyncStatus;
  providerExerciseName?: string | null;
  mediaUrl?: string | null;
  matchScore?: number | null;
  syncError?: string | null;
}) {
  const write = await upsertExerciseMedia({
    exerciseSlug: params.slug,
    provider: "exercisedb",
    providerExerciseName: params.providerExerciseName ?? null,
    mediaType: "gif",
    mediaUrl: params.mediaUrl ?? null,
    matchScore: params.matchScore ?? null,
    syncStatus: params.status,
    syncError: params.syncError ?? null,
    lastSyncedAt: nowIso(),
  });

  return write;
}

async function searchCandidatesWithFallback(exercise: InternalExercise): Promise<ExternalExerciseCandidate[]> {
  const byName = await searchExerciseDbByName(exercise.name);
  if (byName.length > 0) {
    return byName;
  }

  const aliases = exercise.aliases ?? [];
  for (const alias of aliases) {
    const byAlias = await searchExerciseDbByName(alias);
    if (byAlias.length > 0) {
      console.log(`[exercise-media] fallback alias used slug=\"${exercise.slug}\" alias=\"${alias}\" candidates=${byAlias.length}`);
      return byAlias;
    }
  }

  return [];
}

export async function syncExerciseGifBySlug(
  slug: string,
): Promise<{ ok: boolean; status: string; details: Record<string, unknown> }> {
  const cleanSlug = slug.trim().toLowerCase();
  console.log(`[exercise-media] sync start slug=\"${cleanSlug}\"`);

  const exercise = await getInternalExerciseBySlug(cleanSlug);
  const existingMedia = await getExerciseMediaBySlug(cleanSlug);

  if (!exercise) {
    console.log(`[exercise-media] sync stop slug=\"${cleanSlug}\" status=not_found`);
    return {
      ok: false,
      status: "not_found",
      details: { reason: "internal_exercise_not_found" },
    };
  }

  const candidates = await searchCandidatesWithFallback(exercise);

  if (candidates.length === 0) {
    if (existingMedia?.mediaUrl) {
      return {
        ok: true,
        status: "matched",
        details: {
          providerExerciseName: existingMedia.providerExerciseName,
          matchScore: existingMedia.matchScore,
          mediaUrl: existingMedia.mediaUrl,
          reason: "provider_returned_no_candidates_kept_existing_media",
        },
      };
    }

    const saved = await persistStatus({
      slug: cleanSlug,
      status: "match_failed",
      providerExerciseName: null,
      mediaUrl: null,
      matchScore: null,
      syncError: "provider_returned_no_candidates",
    });

    if (!saved.ok) {
      return {
        ok: false,
        status: "db_error",
        details: { reason: saved.error, step: "save_match_failed_no_candidates" },
      };
    }

    return {
      ok: false,
      status: "match_failed",
      details: { reason: "provider_returned_no_candidates" },
    };
  }

  const best = findBestMatch(exercise, candidates);

  if (!best) {
    if (existingMedia?.mediaUrl) {
      return {
        ok: true,
        status: "matched",
        details: {
          providerExerciseName: existingMedia.providerExerciseName,
          matchScore: existingMedia.matchScore,
          mediaUrl: existingMedia.mediaUrl,
          reason: "no_match_above_threshold_kept_existing_media",
        },
      };
    }

    const saved = await persistStatus({
      slug: cleanSlug,
      status: "match_failed",
      providerExerciseName: null,
      mediaUrl: null,
      matchScore: null,
      syncError: "no_match_above_threshold",
    });

    if (!saved.ok) {
      return {
        ok: false,
        status: "db_error",
        details: { reason: saved.error, step: "save_match_failed_threshold" },
      };
    }

    return {
      ok: false,
      status: "match_failed",
      details: { reason: "no_match_above_threshold", candidates: candidates.length },
    };
  }

  const gifPayload = await resolveGifPayload(best);
  if (!gifPayload) {
    if (existingMedia?.mediaUrl) {
      return {
        ok: true,
        status: "matched",
        details: {
          providerExerciseName: existingMedia.providerExerciseName,
          matchScore: existingMedia.matchScore,
          mediaUrl: existingMedia.mediaUrl,
          reason: "gif_unavailable_kept_existing_media",
        },
      };
    }

    const saved = await persistStatus({
      slug: cleanSlug,
      status: "no_gif",
      providerExerciseName: best.candidate.name,
      mediaUrl: null,
      matchScore: best.score,
      syncError: best.candidate.gifUrl ? "gif_download_failed" : "gif_missing_and_provider_fetch_failed",
    });

    if (!saved.ok) {
      return {
        ok: false,
        status: "db_error",
        details: { reason: saved.error, step: "save_no_gif" },
      };
    }

    return {
      ok: false,
      status: "no_gif",
      details: {
        providerExerciseName: best.candidate.name,
        matchScore: best.score,
        reason: best.reason,
        gifUrl: best.candidate.gifUrl,
      },
    };
  }

  const uploaded = await uploadGifToStorage(cleanSlug, gifPayload);
  if (!uploaded.ok) {
    const fallbackMediaUrl = best.candidate.id ? buildExerciseDbProxyGifUrl(best.candidate.id) : best.candidate.gifUrl;
    const savedFallback = await persistStatus({
      slug: cleanSlug,
      status: "matched",
      providerExerciseName: best.candidate.name,
      mediaUrl: fallbackMediaUrl ?? null,
      matchScore: best.score,
      syncError: `storage_upload_failed:${uploaded.error}`,
    });

    if (!savedFallback.ok) {
      return {
        ok: false,
        status: "db_error",
        details: { reason: savedFallback.error, step: "save_matched_fallback_after_storage_error" },
      };
    }

    return {
      ok: true,
      status: "matched",
      details: {
        providerExerciseName: best.candidate.name,
        matchScore: best.score,
        mediaUrl: fallbackMediaUrl ?? null,
        reason: `${best.reason} + fallback_url_after_storage_error`,
      },
    };
  }

  const saved = await persistStatus({
    slug: cleanSlug,
    status: "matched",
    providerExerciseName: best.candidate.name,
    mediaUrl: uploaded.publicUrl,
    matchScore: best.score,
    syncError: null,
  });

  if (!saved.ok) {
    return {
      ok: false,
      status: "db_error",
      details: { reason: saved.error, step: "save_matched" },
    };
  }

  console.log(
    `[exercise-media] sync success slug=\"${cleanSlug}\" provider_name=\"${best.candidate.name}\" score=${best.score}`,
  );

  return {
    ok: true,
    status: "matched",
    details: {
      providerExerciseName: best.candidate.name,
      matchScore: best.score,
      mediaUrl: uploaded.publicUrl,
      reason: `${best.reason} + ${gifPayload.source} + storage_upload`,
    },
  };
}
