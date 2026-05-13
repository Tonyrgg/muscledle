import { NextResponse } from "next/server";
import { submitLiftGridGuess } from "@/lib/liftgrid/service";

type GuessBody = {
  rowIndex?: unknown;
  columnIndex?: unknown;
  guess?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as GuessBody | null;
    const rowIndex = body?.rowIndex;
    const columnIndex = body?.columnIndex;
    const guess = body?.guess;

    if (
      typeof rowIndex !== "number" ||
      !Number.isInteger(rowIndex) ||
      rowIndex < 0 ||
      typeof columnIndex !== "number" ||
      !Number.isInteger(columnIndex) ||
      columnIndex < 0 ||
      typeof guess !== "string" ||
      guess.trim().length === 0
    ) {
      return NextResponse.json({ error: "Invalid LiftGrid guess payload." }, { status: 400 });
    }

    const response = await submitLiftGridGuess({
      rowIndex,
      columnIndex,
      guess,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("/api/liftgrid/guess failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process LiftGrid guess.",
      },
      { status: 500 },
    );
  }
}
