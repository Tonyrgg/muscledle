import { findBestMatch } from "@/lib/exercise-media/match";
import {
  buildExerciseDbProxyGifUrl,
  probeExerciseDbGifById,
  searchExerciseDbByName,
} from "@/lib/exercise-media/providers/exercisedb";
import { getInternalExerciseBySlug, upsertExerciseMedia } from "@/lib/exercise-media/repository";
import type { ExternalExerciseCandidate, InternalExercise, SyncStatus } from "@/lib/exercise-media/types";

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

  if (!isValidGifUrl(best.candidate.gifUrl)) {
    if (best.candidate.id) {
      const probe = await probeExerciseDbGifById(best.candidate.id, "360");
      if (probe.ok) {
        const proxyMediaUrl = buildExerciseDbProxyGifUrl(best.candidate.id, "360");
        const savedProxy = await persistStatus({
          slug: cleanSlug,
          status: "matched",
          providerExerciseName: best.candidate.name,
          mediaUrl: proxyMediaUrl,
          matchScore: best.score,
          syncError: null,
        });

        if (!savedProxy.ok) {
          return {
            ok: false,
            status: "db_error",
            details: { reason: savedProxy.error, step: "save_matched_proxy_gif" },
          };
        }

        return {
          ok: true,
          status: "matched",
          details: {
            providerExerciseName: best.candidate.name,
            matchScore: best.score,
            reason: `${best.reason} + gif probe by exerciseId`,
            mediaUrl: proxyMediaUrl,
          },
        };
      }
    }

    const saved = await persistStatus({
      slug: cleanSlug,
      status: "no_gif",
      providerExerciseName: best.candidate.name,
      mediaUrl: null,
      matchScore: best.score,
      syncError: best.candidate.gifUrl ? "gif_url_not_valid_or_not_gif" : "gif_url_missing_and_probe_failed",
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

  const saved = await persistStatus({
    slug: cleanSlug,
    status: "matched",
    providerExerciseName: best.candidate.name,
    mediaUrl: best.candidate.gifUrl,
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
      mediaUrl: best.candidate.gifUrl,
      reason: best.reason,
    },
  };
}
