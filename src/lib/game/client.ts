import type { PublicGameStats, PublicTodayGameState, SubmitGuessResponse } from "@/types/game";
import { createClient } from "@/lib/supabase/client";
import type { Ego, Equipment, Goal, Movement, Muscle, MuscleGroup, Pattern, Reps } from "@/types/exercise";

export type LiveExerciseSuggestion = {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  muscle_group: MuscleGroup;
  muscle: Muscle[];
  equipment: Equipment[];
  movement: Movement[];
  pattern: Pattern[];
  reps: Reps[];
  goal: Goal[];
  ego: Ego[];
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

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return {};
    }

    const token = data.session?.access_token;

    if (!token) {
      return {};
    }

    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

export async function fetchTodayGameState(): Promise<PublicTodayGameState> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/game/today", {
    method: "GET",
    cache: "no-store",
    headers: authHeaders,
  });

  return parseOrThrow<PublicTodayGameState>(
    response,
    `Failed to load game state (${response.status}).`,
  );
}

export async function submitGuessRequest(
  guessExerciseId: string,
): Promise<SubmitGuessResponse> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/game/guess", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
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

  return payload as SubmitGuessResponse;
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

export async function fetchGameStats(): Promise<PublicGameStats> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/game/stats", {
    method: "GET",
    cache: "no-store",
    headers: authHeaders,
  });

  return parseOrThrow<PublicGameStats>(response, `Failed to load stats (${response.status}).`);
}
