type GitHubTreeEntry = {
  path?: string;
  type?: string;
};

const FALLBACK_REPO_TREE_URL =
  "https://api.github.com/repos/hasaneyldrm/exercises-dataset/git/trees/main?recursive=1";
const FALLBACK_RAW_BASE_URL =
  "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main";

let fallbackGifMapPromise: Promise<Map<string, string>> | null = null;

function normalizeExerciseId(exerciseId: string): string {
  return exerciseId.trim();
}

function buildFallbackRawUrl(path: string): string {
  return `${FALLBACK_RAW_BASE_URL}/${path}`;
}

async function loadFallbackGifMap(): Promise<Map<string, string>> {
  const response = await fetch(FALLBACK_REPO_TREE_URL, {
    method: "GET",
    headers: {
      "User-Agent": "muscledle-exercise-gif-fallback",
      Accept: "application/vnd.github+json",
    },
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new Error(`fallback_tree_http_${response.status}`);
  }

  const payload = (await response.json().catch(() => null)) as
    | { tree?: GitHubTreeEntry[] }
    | null;

  const map = new Map<string, string>();
  const tree = Array.isArray(payload?.tree) ? payload.tree : [];

  for (const entry of tree) {
    if (entry?.type !== "blob" || typeof entry.path !== "string") {
      continue;
    }

    const match = /^videos\/(\d{4})-[^/]+\.gif$/i.exec(entry.path);
    if (!match) {
      continue;
    }

    const exerciseId = normalizeExerciseId(match[1] ?? "");
    if (!exerciseId || map.has(exerciseId)) {
      continue;
    }

    map.set(exerciseId, buildFallbackRawUrl(entry.path));
  }

  return map;
}

async function getFallbackGifMap(): Promise<Map<string, string>> {
  if (!fallbackGifMapPromise) {
    fallbackGifMapPromise = loadFallbackGifMap().catch((error) => {
      fallbackGifMapPromise = null;
      throw error;
    });
  }

  return fallbackGifMapPromise;
}

export async function getFallbackGifUrlByExerciseId(exerciseId: string): Promise<string | null> {
  const normalized = normalizeExerciseId(exerciseId);
  if (!normalized) {
    return null;
  }

  const map = await getFallbackGifMap();
  return map.get(normalized) ?? null;
}
