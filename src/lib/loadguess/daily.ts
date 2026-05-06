import { LOAD_GUESS_VIDEOS } from "@/data/loadguess/videos";
import { gameDateRome } from "@/lib/game/date";
import type {
  AttemptState,
  LoadGuessRoundState,
  LoadGuessSessionState,
  LoadGuessVideo,
} from "@/lib/loadguess/types";

export const LOAD_GUESS_DAILY_ROUNDS = 5;
export const LOAD_GUESS_MAX_ATTEMPTS = 5;
export const LOAD_GUESS_STORAGE_KEY = "liftdle:weightguess:daily:v2";
const AVAILABLE_VIDEO_IDS = new Set(LOAD_GUESS_VIDEOS.map((video) => video.id));

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const output = [...items];
  let state = seed || 1;

  for (let index = output.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    const current = output[index];
    output[index] = output[swapIndex];
    output[swapIndex] = current;
  }

  return output;
}

export function createAttempts(video: LoadGuessVideo): AttemptState[] {
  return Array.from({ length: LOAD_GUESS_MAX_ATTEMPTS }, () => ({
    valueKg: video.startKg,
    submitted: false,
  }));
}

function buildRoundOrder(gameDate: string): string[] {
  const ordered = seededShuffle(LOAD_GUESS_VIDEOS, hashString(gameDate));

  return Array.from({ length: LOAD_GUESS_DAILY_ROUNDS }, (_, index) => {
    const video = ordered[index % ordered.length];
    return video.id;
  });
}

function buildRoundState(videoId: string): LoadGuessRoundState {
  const video = LOAD_GUESS_VIDEOS.find((entry) => entry.id === videoId);
  if (!video) {
    throw new Error(`Missing LoadGuess video for round: ${videoId}`);
  }

  return {
    videoId,
    attempts: createAttempts(video),
    currentAttemptIndex: 0,
    status: "playing",
  };
}

export function createDailySessionState(
  gameDate = gameDateRome(),
): LoadGuessSessionState {
  const roundVideoIds = buildRoundOrder(gameDate);

  return {
    gameDate,
    roundVideoIds,
    currentRoundIndex: 0,
    rounds: roundVideoIds.map((videoId) => buildRoundState(videoId)),
  };
}

export function readStoredDailySession(): LoadGuessSessionState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LOAD_GUESS_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as LoadGuessSessionState | null;
    if (!parsed || parsed.gameDate !== gameDateRome()) {
      window.localStorage.removeItem(LOAD_GUESS_STORAGE_KEY);
      return null;
    }

    const hasValidRoundIndex =
      Number.isInteger(parsed.currentRoundIndex) &&
      parsed.currentRoundIndex >= 0 &&
      parsed.currentRoundIndex < parsed.rounds.length;
    const hasExpectedRoundCount =
      Array.isArray(parsed.roundVideoIds) &&
      Array.isArray(parsed.rounds) &&
      parsed.roundVideoIds.length === LOAD_GUESS_DAILY_ROUNDS &&
      parsed.rounds.length === LOAD_GUESS_DAILY_ROUNDS;
    const hasAvailableVideos = parsed.roundVideoIds.every((videoId) =>
      AVAILABLE_VIDEO_IDS.has(videoId),
    );
    const roundsMatchCatalog = parsed.rounds.every(
      (round, index) =>
        AVAILABLE_VIDEO_IDS.has(round.videoId) &&
        round.videoId === parsed.roundVideoIds[index],
    );

    if (
      !hasValidRoundIndex ||
      !hasExpectedRoundCount ||
      !hasAvailableVideos ||
      !roundsMatchCatalog
    ) {
      window.localStorage.removeItem(LOAD_GUESS_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(LOAD_GUESS_STORAGE_KEY);
    return null;
  }
}

export function writeStoredDailySession(session: LoadGuessSessionState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOAD_GUESS_STORAGE_KEY, JSON.stringify(session));
}
