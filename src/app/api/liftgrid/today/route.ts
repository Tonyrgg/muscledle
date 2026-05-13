import { NextResponse } from "next/server";
import { getLiftGridTodayState } from "@/lib/liftgrid/service";

export async function GET() {
  try {
    const state = await getLiftGridTodayState();
    return NextResponse.json(state, { status: 200 });
  } catch (error) {
    console.error("/api/liftgrid/today failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load today's LiftGrid state.",
      },
      { status: 500 },
    );
  }
}
