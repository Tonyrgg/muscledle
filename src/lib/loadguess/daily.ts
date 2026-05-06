import { LOAD_GUESS_VIDEOS } from "@/data/loadguess/videos";
import { gameDateRome } from "@/lib/game/date";
import type {
  AttemptState,
  LoadGuessRoundState,
  LoadGuessSessionState,
} from "@/lib/loadguess/types";

export const LOAD_GUESS_DAILY_ROUNDS = 4;
export const LOAD_GUESS_MAX_ATTEMPTS = 5;
export const LOAD_GUESS_START_KG = 60;
export const LOAD_GUESS_STEP_KG = 5;
export const LOAD_GUESS_STORAGE_KEY = "liftdle:weightguess:daily:v2";
const AVAILABLE_VIDEO_IDS = new Set(LOAD_GUESS_VIDEOS.map((video) => video.id));
export const LOAD_GUESS_LOCAL_ROUNDS = 4;

export function createAttempts(): AttemptState[] {
  return Array.from({ length: LOAD_GUESS_MAX_ATTEMPTS }, () => ({
    valueKg: LOAD_GUESS_START_KG,
    submitted: false,
  }));
}

function buildRoundOrder(): string[] {
  return LOAD_GUESS_VIDEOS.slice(0, LOAD_GUESS_LOCAL_ROUNDS).map((video) => video.id);
}

function buildRoundState(videoId: string): LoadGuessRoundState {
  const video = LOAD_GUESS_VIDEOS.find((entry) => entry.id === videoId);
  if (!video) {
    throw new Error(`Missing LoadGuess video for round: ${videoId}`);
  }

  return {
    videoId,
    attempts: createAttempts(),
    currentAttemptIndex: 0,
    status: "playing",
  };
}

export function createDailySessionState(
  gameDate = gameDateRome(),
): LoadGuessSessionState {
  const roundVideoIds = buildRoundOrder();

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
      parsed.roundVideoIds.length === LOAD_GUESS_LOCAL_ROUNDS &&
      parsed.rounds.length === LOAD_GUESS_LOCAL_ROUNDS;
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
