import { NextResponse } from "next/server";
import { recordLiftGridEvent } from "@/lib/liftgrid/service";
import type { LiftGridEventInput } from "@/types/liftgrid";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as LiftGridEventInput | null;

    if (!body?.eventName || typeof body.eventName !== "string") {
      return NextResponse.json({ error: "Invalid LiftGrid event payload." }, { status: 400 });
    }

    await recordLiftGridEvent(body);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("/api/liftgrid/events failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to store LiftGrid event.",
      },
      { status: 500 },
    );
  }
}
