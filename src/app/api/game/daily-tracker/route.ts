import { NextResponse } from "next/server";
import { getDailyTracker } from "@/lib/game/daily-tracker";

export async function GET() {
  try {
    const tracker = await getDailyTracker();
    return NextResponse.json(tracker, { status: 200 });
  } catch (error) {
    console.error("/api/game/daily-tracker failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load daily tracker." },
      { status: 500 },
    );
  }
}
