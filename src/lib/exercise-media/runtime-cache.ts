import { createAdminClient } from "@/lib/supabase/admin";

type ExerciseGifRuntimeCacheRow = {
  id: string;
  exercise_id: string;
  resolution: string;
  bucket: string;
  object_path: string;
  mime_type: string;
  byte_length: number | null;
  source: string;
  cached_at: string;
  expires_at: string;
};

type StoredGifPayload = {
  bytes: Uint8Array;
  contentType: string;
  source: string;
};

const storageBucket = (process.env.EXERCISE_MEDIA_BUCKET ?? "exercise-media").trim();
const runtimePrefix = "runtime-gifs";
const runtimeTtlDays = 30;
const cleanupIntervalMs = 10 * 60 * 1000;

let bucketEnsured = false;
let lastCleanupAt = 0;
let cleanupInFlight: Promise<number> | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function buildExpiryIso(): string {
  return new Date(Date.now() + runtimeTtlDays * 24 * 60 * 60 * 1000).toISOString();
}

function buildObjectPath(exerciseId: string, resolution: string): string {
  return `${runtimePrefix}/${exerciseId}/${resolution}.gif`;
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

export async function loadRuntimeCachedExerciseGif(
  exerciseId: string,
  resolution: string,
): Promise<StoredGifPayload | null> {
  const admin = createAdminClient();
  const now = nowIso();

  const { data, error } = await admin
    .from("exercise_gif_runtime_cache")
    .select("id, exercise_id, resolution, bucket, object_path, mime_type, byte_length, source, cached_at, expires_at")
    .eq("exercise_id", exerciseId)
    .eq("resolution", resolution)
    .gt("expires_at", now)
    .maybeSingle<ExerciseGifRuntimeCacheRow>();

  if (error) {
    console.error("[exercise-media] runtime cache read failed", error);
    return null;
  }

  if (!data) {
    return null;
  }

  const download = await admin.storage.from(data.bucket).download(data.object_path);
  if (download.error || !download.data) {
    console.error("[exercise-media] runtime cache download failed", download.error);
    await admin.from("exercise_gif_runtime_cache").delete().eq("id", data.id);
    return null;
  }

  const payload = await download.data.arrayBuffer();
  if (payload.byteLength === 0) {
    await admin.from("exercise_gif_runtime_cache").delete().eq("id", data.id);
    return null;
  }

  return {
    bytes: new Uint8Array(payload),
    contentType: data.mime_type || "image/gif",
    source: "runtime_storage",
  };
}

export async function storeRuntimeExerciseGif(params: {
  exerciseId: string;
  resolution: string;
  payload: StoredGifPayload;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ensured = await ensureStorageBucket();
  if (!ensured.ok) {
    return { ok: false, error: `storage_bucket_error:${ensured.error}` };
  }

  const admin = createAdminClient();
  const objectPath = buildObjectPath(params.exerciseId, params.resolution);

  const upload = await admin.storage.from(storageBucket).upload(objectPath, params.payload.bytes, {
    contentType: params.payload.contentType || "image/gif",
    upsert: true,
    cacheControl: String(runtimeTtlDays * 24 * 60 * 60),
  });

  if (upload.error) {
    return { ok: false, error: `storage_upload_error:${upload.error.message}` };
  }

  const write = await admin.from("exercise_gif_runtime_cache").upsert(
    {
      exercise_id: params.exerciseId,
      resolution: params.resolution,
      bucket: storageBucket,
      object_path: objectPath,
      mime_type: params.payload.contentType || "image/gif",
      byte_length: params.payload.bytes.byteLength,
      source: params.payload.source,
      cached_at: nowIso(),
      expires_at: buildExpiryIso(),
    },
    { onConflict: "exercise_id,resolution" },
  );

  if (write.error) {
    return { ok: false, error: `cache_upsert_error:${write.error.message}` };
  }

  return { ok: true };
}

export async function cleanupExpiredRuntimeExerciseGifs(limit = 64): Promise<number> {
  const admin = createAdminClient();
  const now = nowIso();

  const { data, error } = await admin
    .from("exercise_gif_runtime_cache")
    .select("id, bucket, object_path")
    .lte("expires_at", now)
    .order("expires_at", { ascending: true })
    .limit(limit)
    .returns<Array<{ id: string; bucket: string; object_path: string }>>();

  if (error) {
    console.error("[exercise-media] runtime cache cleanup scan failed", error);
    return 0;
  }

  if (!data || data.length === 0) {
    return 0;
  }

  const byBucket = new Map<string, string[]>();
  for (const item of data) {
    const items = byBucket.get(item.bucket) ?? [];
    items.push(item.object_path);
    byBucket.set(item.bucket, items);
  }

  for (const [bucket, paths] of byBucket.entries()) {
    const removed = await admin.storage.from(bucket).remove(paths);
    if (removed.error) {
      console.error("[exercise-media] runtime cache cleanup remove failed", removed.error);
    }
  }

  const ids = data.map((item) => item.id);
  const deleted = await admin.from("exercise_gif_runtime_cache").delete().in("id", ids);
  if (deleted.error) {
    console.error("[exercise-media] runtime cache cleanup delete failed", deleted.error);
    return 0;
  }

  return ids.length;
}

export async function maybeCleanupExpiredRuntimeExerciseGifs(): Promise<void> {
  const now = Date.now();
  if (cleanupInFlight) {
    await cleanupInFlight;
    return;
  }

  if (now - lastCleanupAt < cleanupIntervalMs) {
    return;
  }

  cleanupInFlight = cleanupExpiredRuntimeExerciseGifs()
    .catch((error) => {
      console.error("[exercise-media] runtime cache cleanup failed", error);
      return 0;
    })
    .finally(() => {
      lastCleanupAt = Date.now();
      cleanupInFlight = null;
    });

  await cleanupInFlight;
}
