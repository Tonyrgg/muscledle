import type { ExerciseDbRaw } from "@/lib/exercise-enrichment/types";

type JsonRecord = Record<string, unknown>;

const DEBUG = process.env.EXERCISE_ENRICHMENT_DEBUG === "true";

function debugLog(message: string) {
  if (DEBUG) {
    console.log(`[exercise-enrichment] ${message}`);
  }
}

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

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const normalized = value
    .map((item) => asString(item))
    .filter((item): item is string => !!item);
  return normalized.length > 0 ? normalized : null;
}

function extractArrayPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const root = asObject(payload);
  if (!root) return [];

  const keys = ["data", "results", "items", "exercises", "result"];
  for (const key of keys) {
    const rows = asArray(root[key]);
    if (rows.length > 0) return rows;
  }

  return [];
}

function readName(record: JsonRecord): string | null {
  const direct = asString(record.name) ?? asString(record.exerciseName) ?? asString(record.title);
  if (direct) return direct;

  const nested = asObject(record.exercise);
  return nested ? asString(nested.name) ?? asString(nested.title) : null;
}

function readId(record: JsonRecord): string | null {
  const direct = asString(record.id) ?? asString(record.exerciseId);
  if (direct) return direct;

  const nested = asObject(record.exercise);
  return nested ? asString(nested.id) : null;
}

function readEquipment(record: JsonRecord): string | null {
  return (
    asString(record.equipment) ??
    asString(record.equipmentType) ??
    asString(record.equipment_type) ??
    asString(asObject(record.exercise)?.equipment)
  );
}

function readBodyPart(record: JsonRecord): string | null {
  return (
    asString(record.bodyPart) ??
    asString(record.body_part) ??
    asString(asObject(record.exercise)?.bodyPart) ??
    asString(asObject(record.exercise)?.body_part)
  );
}

function readTarget(record: JsonRecord): string | null {
  return asString(record.target) ?? asString(asObject(record.exercise)?.target);
}

function readSecondaryMuscles(record: JsonRecord): string[] | null {
  return (
    asStringArray(record.secondaryMuscles) ??
    asStringArray(record.secondary_muscles) ??
    asStringArray(asObject(record.exercise)?.secondaryMuscles) ??
    asStringArray(asObject(record.exercise)?.secondary_muscles)
  );
}

function readInstructions(record: JsonRecord): string[] | null {
  return asStringArray(record.instructions) ?? asStringArray(asObject(record.exercise)?.instructions);
}

function mapToRaw(row: unknown): ExerciseDbRaw | null {
  const record = asObject(row);
  if (!record) return null;

  const name = readName(record);
  if (!name) return null;

  return {
    id: readId(record),
    name,
    equipment: readEquipment(record),
    bodyPart: readBodyPart(record),
    target: readTarget(record),
    secondaryMuscles: readSecondaryMuscles(record),
    instructions: readInstructions(record),
  };
}

export async function searchExerciseDbRawByName(query: string): Promise<ExerciseDbRaw[]> {
  const result = await searchExerciseDbRawByNameWithMeta(query);
  return result.candidates;
}

export async function searchExerciseDbRawByNameWithMeta(query: string): Promise<{
  candidates: ExerciseDbRaw[];
  error: string | null;
}> {
  const cleanedQuery = query.trim();
  if (!cleanedQuery) return { candidates: [], error: null };

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

    const rows = extractArrayPayload(payload);
    const mapped = rows.map(mapToRaw).filter((item): item is ExerciseDbRaw => !!item);

    debugLog(`provider query="${cleanedQuery}" status=${response.status} candidates=${mapped.length}`);

    if (!response.ok) {
      debugLog(`provider error status=${response.status} query="${cleanedQuery}"`);
      return { candidates: [], error: `provider_http_${response.status}` };
    }

    return { candidates: mapped, error: null };
  } catch (error) {
    debugLog(`provider exception query="${cleanedQuery}" error=${error instanceof Error ? error.message : "unknown"}`);
    return {
      candidates: [],
      error: error instanceof Error ? error.message : "provider_exception",
    };
  }
}
