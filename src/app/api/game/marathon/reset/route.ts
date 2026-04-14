import { NextResponse } from "next/server";
import { resetMarathonRun } from "@/lib/game/marathon";
import { AuthRequiredError, GameConflictError } from "@/lib/game/shared";

export async function POST() {
  try {
    const state = await resetMarathonRun();
    return NextResponse.json(state, { status: 200 });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof GameConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reset marathon run." },
      { status: 500 },
    );
  }
}

