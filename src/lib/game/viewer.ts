import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/supabase/server";

function cleanPublicId(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 200);
}

export type DailyViewerIdentity = {
  userId: string | null;
  sessionPublicId: string | null;
  visitorPublicId: string | null;
};

export async function getDailyViewerIdentity(): Promise<DailyViewerIdentity> {
  const headerStore = await headers();
  const sessionPublicId = cleanPublicId(headerStore.get("x-liftdle-session-id"));
  const visitorPublicId = cleanPublicId(headerStore.get("x-liftdle-visitor-id"));

  let userId: string | null = null;
  try {
    const user = await getAuthenticatedUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  return {
    userId,
    sessionPublicId,
    visitorPublicId,
  };
}
