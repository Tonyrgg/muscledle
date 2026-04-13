import { NextResponse } from "next/server";
import { AuthRequiredError, GameConflictError } from "@/lib/game/shared";
import { getMarathonState } from "@/lib/game/marathon";

export async function GET() {
  try {
    const state = await getMarathonState();
    return NextResponse.json(state, { status: 200 });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof GameConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load marathon state." },
      { status: 500 },
    );
  }
}

