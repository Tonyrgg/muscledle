import type {
  TrackableModeCompletionState,
  TrackableModeCompletions,
  TrackableModeKey,
} from "@/components/modes/use-trackable-mode-completions";

const STORAGE_PREFIX = "liftdle:mode-completion";

function getStorageKey(mode: TrackableModeKey) {
  return `${STORAGE_PREFIX}:${mode}`;
}

function getRomeDateString(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "00";

  return `${read("year")}-${read("month")}-${read("day")}`;
}

type CachedModeCompletion = {
  date: string;
  outcome: TrackableModeCompletionState;
};

function normalizeGameDate(gameDate?: string | null) {
  if (!gameDate) {
    return getRomeDateString();
  }

  const isoDateMatch = gameDate.match(/\d{4}-\d{2}-\d{2}/);
  return isoDateMatch?.[0] ?? getRomeDateString();
}

function readModeCompletion(mode: TrackableModeKey): CachedModeCompletion | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getStorageKey(mode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedModeCompletion> & { completed?: boolean };
    if (typeof parsed?.date !== "string") {
      return null;
    }
    const outcome =
      parsed?.outcome === "won" || parsed?.outcome === "lost" || parsed?.outcome === "none"
        ? parsed.outcome
        : typeof parsed?.completed === "boolean"
          ? parsed.completed
            ? "won"
            : "none"
          : null;
    if (!outcome) {
      return null;
    }
    return {
      date: parsed.date,
      outcome,
    };
  } catch {
    return null;
  }
}

export function readTrackableModeCompletionsSnapshot(): TrackableModeCompletions {
  const today = getRomeDateString();

  const daily = readModeCompletion("daily");
  const liftgrid = readModeCompletion("liftgrid");

  return {
    daily: daily?.date === today ? daily.outcome : "none",
    liftgrid: liftgrid?.date === today ? liftgrid.outcome : "none",
  };
}

export function writeTrackableModeCompletion(
  mode: TrackableModeKey,
  outcome: TrackableModeCompletionState,
  gameDate?: string | null,
) {
  if (typeof window === "undefined") return;

  try {
    const date = normalizeGameDate(gameDate);
    const payload: CachedModeCompletion = { date, outcome };
    window.localStorage.setItem(getStorageKey(mode), JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}
