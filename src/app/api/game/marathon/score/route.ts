import { NextResponse } from "next/server";
import { recordMarathonScore } from "@/lib/game/marathon";
import { AuthRequiredError, GameConflictError } from "@/lib/game/shared";

function asSafeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.floor(value);
  if (normalized < 0) {
    return null;
  }

  return normalized;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      status?: unknown;
      score?: unknown;
      solvedRounds?: unknown;
      runSeed?: unknown;
      exerciseOrderIds?: unknown;
      maxAttemptsPerRound?: unknown;
      startedAt?: unknown;
      finishedAt?: unknown;
    } | null;

    const status = body?.status;
    const score = asSafeInteger(body?.score);
    const solvedRounds = asSafeInteger(body?.solvedRounds);
    const maxAttemptsPerRound = asSafeInteger(body?.maxAttemptsPerRound);
    const exerciseOrderIds = body?.exerciseOrderIds;
    const runSeed =
      typeof body?.runSeed === "number" && Number.isFinite(body.runSeed)
        ? Math.floor(body.runSeed)
        : null;
    const startedAt = typeof body?.startedAt === "string" ? body.startedAt : null;
    const finishedAt = typeof body?.finishedAt === "string" ? body.finishedAt : null;

    const invalidStatus = status !== "won" && status !== "lost";
    const invalidExerciseOrder =
      !Array.isArray(exerciseOrderIds) ||
      exerciseOrderIds.some((id) => typeof id !== "string");

    if (
      invalidStatus ||
      score === null ||
      solvedRounds === null ||
      maxAttemptsPerRound === null ||
      invalidExerciseOrder
    ) {
      return NextResponse.json(
        { error: "Invalid request body for marathon score." },
        { status: 400 },
      );
    }

    await recordMarathonScore({
      status,
      score,
      solvedRounds,
      runSeed,
      exerciseOrderIds,
      maxAttemptsPerRound,
      startedAt,
      finishedAt,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof GameConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save marathon score." },
      { status: 500 },
    );
  }
}
