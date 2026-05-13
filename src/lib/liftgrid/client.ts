"use client";

import { createClient } from "@/lib/supabase/client";
import { ensureVisitorIdentity } from "@/lib/visitor/client";
import type {
  LiftGridEventInput,
  LiftGridFeedbackChoice,
  LiftGridGuessResponse,
  LiftGridPublicState,
} from "@/types/liftgrid";

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
    if (error || !data.session?.access_token) return {};
    return { Authorization: `Bearer ${data.session.access_token}` };
  } catch {
    return {};
  }
}

async function buildClientHeaders() {
  const [identity, authHeaders] = await Promise.all([
    ensureVisitorIdentity({ path: "/liftgrid" }),
    getAuthHeaders(),
  ]);

  const headers: Record<string, string> = {
    "x-liftdle-session-id": identity.sessionId,
    "x-liftdle-visitor-id": identity.visitorId,
  };

  if (authHeaders.Authorization) {
    headers.Authorization = authHeaders.Authorization;
  }

  return headers;
}

export async function fetchLiftGridToday(): Promise<LiftGridPublicState> {
  const headers = await buildClientHeaders();
  const response = await fetch("/api/liftgrid/today", {
    method: "GET",
    cache: "no-store",
    headers,
  });

  return parseOrThrow<LiftGridPublicState>(
    response,
    `Failed to load LiftGrid (${response.status}).`,
  );
}

export async function submitLiftGridGuessRequest(input: {
  guess: string;
}): Promise<LiftGridGuessResponse> {
  const headers = await buildClientHeaders();
  const response = await fetch("/api/liftgrid/guess", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(input),
  });

  return parseOrThrow<LiftGridGuessResponse>(
    response,
    `Failed to submit LiftGrid guess (${response.status}).`,
  );
}

export async function submitLiftGridFeedbackRequest(choice: LiftGridFeedbackChoice) {
  const headers = await buildClientHeaders();
  const response = await fetch("/api/liftgrid/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ choice }),
  });

  await parseOrThrow<{ ok: true }>(
    response,
    `Failed to submit LiftGrid feedback (${response.status}).`,
  );
}

export async function resetLiftGridRequest(): Promise<LiftGridPublicState> {
  const headers = await buildClientHeaders();
  const response = await fetch("/api/liftgrid/reset", {
    method: "POST",
    headers,
  });

  return parseOrThrow<LiftGridPublicState>(
    response,
    `Failed to reset LiftGrid (${response.status}).`,
  );
}

export async function trackLiftGridEventRequest(input: LiftGridEventInput): Promise<void> {
  const headers = await buildClientHeaders();
  const response = await fetch("/api/liftgrid/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(input),
  });

  await parseOrThrow<{ ok: true }>(
    response,
    `Failed to track LiftGrid event (${response.status}).`,
  );
}
