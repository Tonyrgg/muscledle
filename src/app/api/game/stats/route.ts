import { NextResponse } from "next/server";
import { getGameStats } from "@/lib/game/stats";
import { AuthRequiredError } from "@/lib/game/shared";

export async function GET() {
  try {
    const stats = await getGameStats();
    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("/api/game/stats failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load game stats." },
      { status: 500 },
    );
  }
}
