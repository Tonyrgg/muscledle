import { NextResponse } from "next/server";
import { resetLiftGridForViewer } from "@/lib/liftgrid/service";

export async function POST() {
  try {
    const state = await resetLiftGridForViewer();
    return NextResponse.json(state, { status: 200 });
  } catch (error) {
    console.error("/api/liftgrid/reset failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to reset LiftGrid state.",
      },
      { status: 500 },
    );
  }
}
