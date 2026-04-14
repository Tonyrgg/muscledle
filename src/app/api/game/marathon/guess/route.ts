import { NextResponse } from "next/server";
import { submitMarathonGuess } from "@/lib/game/marathon";
import { AuthRequiredError, GameConflictError } from "@/lib/game/shared";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { guessExerciseId?: unknown } | null;
    const guessExerciseId = body?.guessExerciseId;

    if (typeof guessExerciseId !== "string" || guessExerciseId.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid request body. Expected { guessExerciseId: string }." },
        { status: 400 },
      );
    }

    const result = await submitMarathonGuess({ guessExerciseId: guessExerciseId.trim() });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof GameConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit marathon guess." },
      { status: 500 },
    );
  }
}

