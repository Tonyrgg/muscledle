import { NextResponse } from "next/server";
import { revealLiftGridSolution } from "@/lib/liftgrid/service";

export async function POST() {
  try {
    const response = await revealLiftGridSolution();
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("/api/liftgrid/reveal failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to reveal LiftGrid.",
      },
      { status: 500 },
    );
  }
}
