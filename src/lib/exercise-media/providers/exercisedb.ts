import type { ExternalExerciseCandidate } from "@/lib/exercise-media/types";

type JsonRecord = Record<string, unknown>;

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asObject(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function extractArrayPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const root = asObject(payload);
  if (!root) return [];

  const possibleKeys = ["data", "results", "items", "exercises", "result"];
  for (const key of possibleKeys) {
    const maybeArray = asArray(root[key]);
    if (maybeArray.length > 0) {
      return maybeArray;
    }
  }

  return [];
}

function readCandidateName(record: JsonRecord): string | null {
  const direct = asString(record.name) ?? asString(record.exerciseName) ?? asString(record.title);
  if (direct) return direct;

  const details = asObject(record.exercise);
  return details ? asString(details.name) ?? asString(details.title) : null;
}

function readGifUrl(record: JsonRecord): string | null {
  const direct =
    asString(record.gifUrl) ??
    asString(record.gif_url) ??
    asString(record.gif) ??
    asString(record.demoGifUrl);

  if (direct) return direct;

  const media = asObject(record.media);
  if (media) {
    const mediaGif = asString(media.gifUrl) ?? asString(media.gif_url) ?? asString(media.gif);
    if (mediaGif) return mediaGif;
  }

  const images = asObject(record.images);
  if (images) {
    const imageGif = asString(images.gifUrl) ?? asString(images.gif);
    if (imageGif) return imageGif;
  }

  return null;
}

function readId(record: JsonRecord): string | null {
  const direct = asString(record.id) ?? asString(record.exerciseId);
  if (direct) return direct;

  const details = asObject(record.exercise);
  return details ? asString(details.id) : null;
}

function mapToCandidate(entry: unknown): ExternalExerciseCandidate | null {
  const row = asObject(entry);
  if (!row) return null;

  const name = readCandidateName(row);
  if (!name) return null;

  return {
    id: readId(row),
    name,
    gifUrl: readGifUrl(row),
  };
}

export async function searchExerciseDbByName(query: string): Promise<ExternalExerciseCandidate[]> {
  const cleanedQuery = query.trim();
  if (!cleanedQuery) return [];

  const baseUrl = (process.env.EXERCISEDB_API_BASE_URL ?? "https://exercisedb.p.rapidapi.com").replace(/\/+$/, "");
  const host = process.env.EXERCISEDB_API_HOST ?? "exercisedb.p.rapidapi.com";
  const key = process.env.EXERCISEDB_API_KEY;

  const url = `${baseUrl}/exercises/name/${encodeURIComponent(cleanedQuery)}`;

  const headers: Record<string, string> = {};
  if (key) {
    headers["x-rapidapi-key"] = key;
    headers["x-rapidapi-host"] = host;
  }

  try {
    const response = await fetch(url, { method: "GET", headers, cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as unknown;

    const shape = Array.isArray(payload)
      ? "array"
      : payload && typeof payload === "object"
        ? `object:${Object.keys(payload as JsonRecord).slice(0, 6).join(",")}`
        : typeof payload;

    const rows = extractArrayPayload(payload);
    const candidates = rows.map(mapToCandidate).filter((item): item is ExternalExerciseCandidate => !!item);

    console.log(
      `[exercise-media] provider search query=\"${cleanedQuery}\" status=${response.status} payload_shape=${shape} candidates=${candidates.length}`,
    );

    for (let i = 0; i < Math.min(3, candidates.length); i += 1) {
      const c = candidates[i];
      console.log(`[exercise-media] candidate[${i}] name=\"${c.name}\" gifUrl=${c.gifUrl ?? "null"}`);
    }

    if (!response.ok) {
      console.error(`[exercise-media] provider http error status=${response.status} query=\"${cleanedQuery}\"`);
      return [];
    }

    return candidates;
  } catch (error) {
    console.error(
      `[exercise-media] provider search failed query=\"${cleanedQuery}\" error=${error instanceof Error ? error.message : "unknown"}`,
    );
    return [];
  }
}

const ALLOWED_RESOLUTIONS = new Set(["180", "360", "720", "1080"]);

function getProviderConfig() {
  return {
    baseUrl: (process.env.EXERCISEDB_API_BASE_URL ?? "https://exercisedb.p.rapidapi.com").replace(/\/+$/, ""),
    host: process.env.EXERCISEDB_API_HOST ?? "exercisedb.p.rapidapi.com",
    key: process.env.EXERCISEDB_API_KEY ?? "",
  };
}

export function buildExerciseDbProxyGifUrl(exerciseId: string, resolution = "360"): string {
  const safeResolution = ALLOWED_RESOLUTIONS.has(resolution) ? resolution : "360";
  return `/api/exercises/media-gif?exerciseId=${encodeURIComponent(exerciseId)}&resolution=${safeResolution}`;
}

export async function probeExerciseDbGifById(
  exerciseId: string,
  resolution = "360",
): Promise<{ ok: boolean; status: number; error?: string }> {
  const { baseUrl, host, key } = getProviderConfig();

  if (!key) {
    return { ok: false, status: 500, error: "missing_exercisedb_api_key" };
  }

  const safeResolution = ALLOWED_RESOLUTIONS.has(resolution) ? resolution : "360";
  const url = `${baseUrl}/image?exerciseId=${encodeURIComponent(exerciseId)}&resolution=${safeResolution}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": key,
        "x-rapidapi-host": host,
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";
    const ok = response.ok && contentType.toLowerCase().includes("image/gif");
    console.log(
      `[exercise-media] gif probe exerciseId="${exerciseId}" resolution=${safeResolution} status=${response.status} contentType="${contentType}" ok=${ok}`,
    );

    try {
      await response.body?.cancel();
    } catch {
      // Best-effort: avoid buffering streamed gif in memory.
    }

    return { ok, status: response.status, error: ok ? undefined : "gif_probe_failed" };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : "gif_probe_error",
    };
  }
}
