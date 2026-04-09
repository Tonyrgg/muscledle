import type { PublicTodayGameState } from "@/types/game";

export type LiveExerciseSuggestion = {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  muscle_group: string;
};

type ErrorPayload = {
  error?: string;
};

async function parseOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as T | ErrorPayload | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? payload.error
        : undefined;
    throw new Error(message ?? fallbackMessage);
  }

  return payload as T;
}

export async function fetchTodayGameState(): Promise<PublicTodayGameState> {
  const response = await fetch("/api/game/today", {
    method: "GET",
    cache: "no-store",
  });

  return parseOrThrow<PublicTodayGameState>(
    response,
    `Failed to load game state (${response.status}).`,
  );
}

export async function submitGuessRequest(
  guessExerciseId: string,
): Promise<PublicTodayGameState> {
  const response = await fetch("/api/game/guess", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ guessExerciseId }),
  });

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorMessage =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as ErrorPayload).error === "string"
        ? (payload as ErrorPayload).error
        : null;
    throw new Error(errorMessage || "Failed to submit guess.");
  }

  return payload as PublicTodayGameState;
}

export async function fetchLiveExercises(): Promise<LiveExerciseSuggestion[]> {
  const response = await fetch("/api/exercises", {
    method: "GET",
    cache: "no-store",
  });

  return parseOrThrow<LiveExerciseSuggestion[]>(
    response,
    `Failed to load live exercises (${response.status}).`,
  );
}
