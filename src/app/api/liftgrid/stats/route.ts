import { NextResponse } from "next/server";
import { AuthRequiredError } from "@/lib/game/shared";
import { getLiftGridStats } from "@/lib/liftgrid/service";

export async function GET() {
  try {
    const stats = await getLiftGridStats();
    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("/api/liftgrid/stats failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load LiftGrid stats." },
      { status: 500 },
    );
  }
}
