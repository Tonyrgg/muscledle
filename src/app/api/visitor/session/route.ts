import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  isConstructedVisitorId,
  normalizeConstructedId,
  readCountryCode,
} from "@/lib/visitor/server";

type SessionBootstrapBody = {
  existingVisitorId?: string | null;
  existingSessionId?: string | null;
  path?: string | null;
  referrer?: string | null;
};

type RegisterVisitorTouchRow = {
  visitor_public_id: string;
  session_public_id: string;
  is_new_visitor: boolean;
  is_returning_visitor: boolean;
  country_code: string;
  first_landing_date: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as SessionBootstrapBody | null;
    const existingVisitorId = normalizeConstructedId(body?.existingVisitorId ?? null);
    const existingSessionId = normalizeConstructedId(body?.existingSessionId ?? null);
    const path =
      typeof body?.path === "string" && body.path.trim().length > 0
        ? body.path.trim().slice(0, 400)
        : null;
    const referrer =
      typeof body?.referrer === "string" && body.referrer.trim().length > 0
        ? body.referrer.trim().slice(0, 1000)
        : null;

    let userId: string | null = null;
    try {
      const user = await getAuthenticatedUser();
      userId = user?.id ?? null;
    } catch {
      userId = null;
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("register_visitor_touch", {
        p_existing_public_id: existingVisitorId,
        p_existing_session_id: existingSessionId,
        p_legacy_client_id:
          existingVisitorId && !isConstructedVisitorId(existingVisitorId)
            ? existingVisitorId
            : null,
        p_country_code: readCountryCode(request.headers),
        p_path: path,
        p_referrer: referrer,
        p_user_agent: request.headers.get("user-agent"),
        p_user_id: userId,
      });

    if (error) {
      throw new Error(error.message);
    }

    const rows = Array.isArray(data)
      ? (data as RegisterVisitorTouchRow[])
      : data
        ? [data as RegisterVisitorTouchRow]
        : [];
    const row = rows[0];
    if (!row) {
      throw new Error("Missing visitor identity payload.");
    }

    return NextResponse.json(
      {
        visitorId: row.visitor_public_id,
        sessionId: row.session_public_id,
        isNewVisitor: row.is_new_visitor,
        isReturningVisitor: row.is_returning_visitor,
        countryCode: row.country_code,
        firstLandingDate: row.first_landing_date,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/visitor/session failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize visitor session.",
      },
      { status: 500 },
    );
  }
}
