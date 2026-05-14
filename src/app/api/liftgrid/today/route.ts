import { NextResponse } from "next/server";
import { getLiftGridTodayState } from "@/lib/liftgrid/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const state = await getLiftGridTodayState();
    return NextResponse.json(state, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
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
