import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { CONSENT_POLICY_VERSION, isConsentPreferences } from "@/lib/privacy/consent";

type ConsentSource = "banner" | "settings";
type ConsentAction = "accept_all" | "reject_all" | "save_preferences";

type ConsentBody = {
  source?: ConsentSource;
  action?: ConsentAction;
  visitorId?: string;
  policyVersion?: string;
  preferences?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConsentBody;

    const source = body.source;
    const action = body.action;
    const visitorId = typeof body.visitorId === "string" ? body.visitorId.trim() : "";
    const policyVersion =
      typeof body.policyVersion === "string" && body.policyVersion.trim().length > 0
        ? body.policyVersion.trim()
        : CONSENT_POLICY_VERSION;

    if (!source || !["banner", "settings"].includes(source)) {
      return NextResponse.json({ error: "Invalid source." }, { status: 400 });
    }

    if (!action || !["accept_all", "reject_all", "save_preferences"].includes(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    if (!isConsentPreferences(body.preferences)) {
      return NextResponse.json({ error: "Invalid preferences." }, { status: 400 });
    }

    const preferences = body.preferences;

    let userId: string | null = null;
    try {
      const user = await getAuthenticatedUser();
      userId = user?.id ?? null;
    } catch {
      userId = null;
    }

    const admin = createAdminClient();
    const { error } = await admin.from("privacy_consent_events").insert({
      user_id: userId,
      visitor_id: visitorId.length > 0 ? visitorId : null,
      source,
      action,
      policy_version: policyVersion,
      necessary: preferences.necessary,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
      user_agent: request.headers.get("user-agent"),
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("/api/privacy/consent failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save consent." },
      { status: 500 },
    );
  }
}
