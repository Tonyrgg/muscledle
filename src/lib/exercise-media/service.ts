import { findBestMatch } from "@/lib/exercise-media/match";
import { getFallbackGifUrlByExerciseId } from "@/lib/exercise-media/fallback-gifs";
import {
  buildExerciseDbProxyGifUrl,
  fetchExerciseDbGifById,
  searchExerciseDbByName,
} from "@/lib/exercise-media/providers/exercisedb";
import { getExerciseMediaBySlug, getInternalExerciseBySlug, upsertExerciseMedia } from "@/lib/exercise-media/repository";
import type { ExternalExerciseCandidate, InternalExercise, SyncStatus } from "@/lib/exercise-media/types";
import { getExerciseNaming } from "@/lib/exercises/naming";
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

function normalizeQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");
}

function maybeSingularize(value: string): string {
  if (value.endsWith("ss") || value.length < 5) return value;
  if (value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  if (value.endsWith("es")) return value.slice(0, -2);
  if (value.endsWith("s")) return value.slice(0, -1);
  return value;
}

function addQueryVariant(output: string[], seen: Set<string>, value: string) {
  const normalized = normalizeQuery(value);
  if (!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  output.push(normalized);
}

function buildSearchQueries(exercise: InternalExercise): string[] {
  const naming = getExerciseNaming(exercise.slug, exercise.name, exercise.aliases ?? []);
  const ordered: string[] = [];
  const seen = new Set<string>();

  const bases = [
    naming.canonical_name,
    naming.display_name,
    exercise.name,
    ...(exercise.aliases ?? []),
    ...naming.aliases,
  ];

  for (const base of bases) {
    addQueryVariant(ordered, seen, base);
  }

  for (const query of [...ordered]) {
    addQueryVariant(ordered, seen, maybeSingularize(query));
    addQueryVariant(ordered, seen, query.replace(/\bdumbbell\b/g, "db"));
    addQueryVariant(ordered, seen, query.replace(/\bdb\b/g, "dumbbell"));
    addQueryVariant(ordered, seen, query.replace(/\bbarbell\b/g, "bb"));
    addQueryVariant(ordered, seen, query.replace(/\bbb\b/g, "barbell"));
    addQueryVariant(ordered, seen, query.replace(/\bclose grip\b/g, "close-grip"));
    addQueryVariant(ordered, seen, query.replace(/\bclose-grip\b/g, "close grip"));
    addQueryVariant(ordered, seen, query.replace(/\breverse grip\b/g, "reverse-grip"));
    addQueryVariant(ordered, seen, query.replace(/\breverse-grip\b/g, "reverse grip"));
    addQueryVariant(ordered, seen, query.replace(/\bone legged\b/g, "single leg"));
    addQueryVariant(ordered, seen, query.replace(/\bsingle leg\b/g, "one legged"));
    addQueryVariant(ordered, seen, query.replace(/\bbicep\b/g, "biceps"));
    addQueryVariant(ordered, seen, query.replace(/\btricep\b/g, "triceps"));
    addQueryVariant(ordered, seen, query.replace(/\busing\b/g, "").replace(/\s+/g, " "));
    addQueryVariant(ordered, seen, query.replace(/\bwith\b/g, "").replace(/\s+/g, " "));
  }

  for (const query of [...ordered]) {
    const tokens = query.split(" ").filter(Boolean);
    if (tokens.length >= 3) {
      addQueryVariant(ordered, seen, tokens.slice(1).join(" "));
      addQueryVariant(ordered, seen, tokens.slice(0, -1).join(" "));
    }
    if (tokens.length >= 4) {
      addQueryVariant(ordered, seen, tokens.slice(-2).join(" "));
      addQueryVariant(ordered, seen, tokens.slice(-3).join(" "));
    }
  }

  return ordered;
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

    const fallbackUrl = await getFallbackGifUrlByExerciseId(best.candidate.id).catch(() => null);
    if (fallbackUrl) {
      const byFallbackUrl = await downloadGifFromUrl(fallbackUrl);
      if (byFallbackUrl) {
        return {
          ...byFallbackUrl,
          source: "fallback_by_id",
        };
      }
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
  const primaryQuery = normalizeQuery(exercise.name);
  const queries = buildSearchQueries(exercise);
  const collected = new Map<string, ExternalExerciseCandidate>();

  for (const query of queries) {
    const candidates = await searchExerciseDbByName(query);
    if (candidates.length > 0) {
      if (query !== primaryQuery) {
        console.log(
          `[exercise-media] fallback query used slug=\"${exercise.slug}\" query=\"${query}\" candidates=${candidates.length}`,
        );
      }

      for (const candidate of candidates) {
        const key = `${candidate.id ?? ""}::${normalizeQuery(candidate.name)}`;
        const previous = collected.get(key);
        if (!previous) {
          collected.set(key, candidate);
          continue;
        }

        const previousHasGif = Boolean(previous.gifUrl);
        const nextHasGif = Boolean(candidate.gifUrl);
        if (!previousHasGif && nextHasGif) {
          collected.set(key, candidate);
        }
      }

      if (collected.size >= 24) {
        break;
      }
    }
  }

  return Array.from(collected.values());
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

  const naming = getExerciseNaming(exercise.slug, exercise.name, exercise.aliases ?? []);
  const exerciseWithNamingAliases: InternalExercise = {
    ...exercise,
    aliases: Array.from(new Set([...(exercise.aliases ?? []), ...naming.aliases])),
  };

  const candidates = await searchCandidatesWithFallback(exerciseWithNamingAliases);

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

  const best = findBestMatch(exerciseWithNamingAliases, candidates);

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
