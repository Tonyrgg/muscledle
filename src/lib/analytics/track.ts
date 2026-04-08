import { createClient } from "@/lib/supabase/server";

type TrackEventParams = {
  userId?: string | null;
  sessionId?: string | null;
  eventName: string;
  payload?: Record<string, unknown>;
};

export async function trackEvent(params: TrackEventParams) {
  try {
    const supabase = await createClient();

    await supabase.from("analytics_events").insert({
      user_id: params.userId ?? null,
      session_id: params.sessionId ?? null,
      event_name: params.eventName,
      payload: params.payload ?? {},
    });
  } catch (error) {
    console.error("analytics_events insert failed", error);
  }
}
