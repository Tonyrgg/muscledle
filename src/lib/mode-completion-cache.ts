import type { TrackableModeCompletions, TrackableModeKey } from "@/components/modes/use-trackable-mode-completions";

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
  completed: boolean;
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
    const parsed = JSON.parse(raw) as Partial<CachedModeCompletion>;
    if (typeof parsed?.date !== "string" || typeof parsed?.completed !== "boolean") {
      return null;
    }
    return {
      date: parsed.date,
      completed: parsed.completed,
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
    daily: daily?.date === today ? daily.completed : false,
    liftgrid: liftgrid?.date === today ? liftgrid.completed : false,
  };
}

export function writeTrackableModeCompletion(
  mode: TrackableModeKey,
  completed: boolean,
  gameDate?: string | null,
) {
  if (typeof window === "undefined") return;

  try {
    const date = normalizeGameDate(gameDate);
    const payload: CachedModeCompletion = { date, completed };
    window.localStorage.setItem(getStorageKey(mode), JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}
