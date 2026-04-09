import { NextResponse } from "next/server";
import { getTodayGameState } from "@/lib/game/bootstrap";
import { AuthRequiredError, GameConflictError } from "@/lib/game/shared";

export async function GET() {
  try {
    const state = await getTodayGameState();
    return NextResponse.json(state, { status: 200 });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof GameConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("/api/game/today failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load today's game state." },
      { status: 500 },
    );
  }
}
