"use client";

import {
  CONSENT_SESSION_ID_KEY,
  CONSENT_VISITOR_ID_KEY,
} from "@/lib/privacy/consent";

export type VisitorIdentity = {
  visitorId: string;
  sessionId: string;
  isNewVisitor: boolean;
  isReturningVisitor: boolean;
  countryCode: string;
  firstLandingDate: string;
};

type EnsureVisitorIdentityArgs = {
  path?: string | null;
};

let inflightIdentityPromise: Promise<VisitorIdentity> | null = null;

function readStoredValue(storage: Storage, key: string): string | null {
  const value = storage.getItem(key);
  if (!value) return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function persistVisitorIdentity(identity: VisitorIdentity) {
  window.localStorage.setItem(CONSENT_VISITOR_ID_KEY, identity.visitorId);
  window.sessionStorage.setItem(CONSENT_SESSION_ID_KEY, identity.sessionId);
}

export function getStoredVisitorId(): string {
  if (typeof window === "undefined") return "";
  return readStoredValue(window.localStorage, CONSENT_VISITOR_ID_KEY) ?? "";
}

export async function ensureVisitorIdentity(
  args: EnsureVisitorIdentityArgs = {},
): Promise<VisitorIdentity> {
  if (typeof window === "undefined") {
    throw new Error("Visitor identity is only available in the browser.");
  }

  if (!inflightIdentityPromise) {
    const existingVisitorId = readStoredValue(
      window.localStorage,
      CONSENT_VISITOR_ID_KEY,
    );
    const existingSessionId = readStoredValue(
      window.sessionStorage,
      CONSENT_SESSION_ID_KEY,
    );

    inflightIdentityPromise = fetch("/api/visitor/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        existingVisitorId,
        existingSessionId,
        path: args.path ?? window.location.pathname,
        referrer: document.referrer || null,
      }),
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | VisitorIdentity
          | { error?: string }
          | null;

        if (!response.ok || !payload || !("visitorId" in payload)) {
          const message =
            payload && typeof payload === "object" && "error" in payload
              ? payload.error
              : null;
          throw new Error(
            message ?? `Failed to initialize visitor identity (${response.status}).`,
          );
        }

        persistVisitorIdentity(payload);
        return payload;
      })
      .finally(() => {
        inflightIdentityPromise = null;
      });
  }

  return inflightIdentityPromise;
}
