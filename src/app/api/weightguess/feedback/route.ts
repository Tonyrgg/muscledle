import { NextResponse } from "next/server";
import { createWeightGuessFeedback } from "@/lib/loadguess/feedback-service";
import type { CreateWeightGuessFeedbackInput } from "@/types/weightguess-feedback";
import {
  WEIGHT_GUESS_FEEDBACK_MODE_OPTIONS,
  WEIGHT_GUESS_FEEDBACK_ROUND_OUTCOMES,
  WEIGHT_GUESS_FEEDBACK_SURFACES,
  type WeightGuessFeedbackModeOption,
  type WeightGuessFeedbackRoundOutcome,
  type WeightGuessFeedbackSurface,
} from "@/types/weightguess-feedback";

const MODE_VALUES = new Set<WeightGuessFeedbackModeOption>(
  WEIGHT_GUESS_FEEDBACK_MODE_OPTIONS,
);
const SURFACE_VALUES = new Set<WeightGuessFeedbackSurface>(
  WEIGHT_GUESS_FEEDBACK_SURFACES,
);
const ROUND_OUTCOME_VALUES = new Set<WeightGuessFeedbackRoundOutcome>(
  WEIGHT_GUESS_FEEDBACK_ROUND_OUTCOMES,
);

function validateVisitorId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 160) return null;
  return cleaned;
}

function validateRating(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0.5 || value > 5) return null;
  if (Math.round(value * 2) !== value * 2) return null;
  return value;
}

function validateSelectedModes(value: unknown): WeightGuessFeedbackModeOption[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const cleaned = value.filter(
    (entry): entry is WeightGuessFeedbackModeOption =>
      typeof entry === "string" && MODE_VALUES.has(entry as WeightGuessFeedbackModeOption),
  );

  if (cleaned.length === 0 || cleaned.length !== value.length) {
    return null;
  }

  return [...new Set(cleaned)];
}

function validateSurface(value: unknown): WeightGuessFeedbackSurface | null {
  if (typeof value !== "string" || !SURFACE_VALUES.has(value as WeightGuessFeedbackSurface)) {
    return null;
  }

  return value as WeightGuessFeedbackSurface;
}

function validateOptionalInteger(
  value: unknown,
  min: number,
  max: number,
): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function validateRoundOutcome(value: unknown): WeightGuessFeedbackRoundOutcome | null {
  if (value == null) return null;
  if (
    typeof value !== "string" ||
    !ROUND_OUTCOME_VALUES.has(value as WeightGuessFeedbackRoundOutcome)
  ) {
    return null;
  }

  return value as WeightGuessFeedbackRoundOutcome;
}

function validateDiagnostics(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Partial<CreateWeightGuessFeedbackInput> | null;

    const visitorId = validateVisitorId(body?.visitorId);
    if (!visitorId) {
      return NextResponse.json({ error: "Invalid visitorId." }, { status: 400 });
    }

    const rating = validateRating(body?.rating);
    if (rating == null) {
      return NextResponse.json({ error: "Invalid rating." }, { status: 400 });
    }

    const selectedModes = validateSelectedModes(body?.selectedModes);
    if (!selectedModes) {
      return NextResponse.json(
        { error: "Select at least one preferred mode." },
        { status: 400 },
      );
    }

    const surface = validateSurface(body?.surface);
    if (!surface) {
      return NextResponse.json({ error: "Invalid feedback surface." }, { status: 400 });
    }

    const roundNumber = validateOptionalInteger(body?.roundNumber, 1, 4);
    const attemptsUsed = validateOptionalInteger(body?.attemptsUsed, 1, 5);
    const roundOutcome = validateRoundOutcome(body?.roundOutcome);

    if (surface === "intro") {
      if (body?.roundNumber != null || body?.attemptsUsed != null || body?.roundOutcome != null) {
        return NextResponse.json(
          { error: "Intro feedback cannot include round summary fields." },
          { status: 400 },
        );
      }
    }

    if (surface === "summary") {
      if (roundNumber == null || attemptsUsed == null || roundOutcome == null) {
        return NextResponse.json(
          { error: "Summary feedback must include round number, outcome, and attempts used." },
          { status: 400 },
        );
      }
    }

    const created = await createWeightGuessFeedback({
      visitorId,
      rating,
      selectedModes,
      surface,
      roundNumber,
      roundOutcome,
      attemptsUsed,
      pagePath: typeof body?.pagePath === "string" ? body.pagePath : null,
      diagnostics: validateDiagnostics(body?.diagnostics),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/weightguess/feedback failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to store WeightGuess feedback.",
      },
      { status: 500 },
    );
  }
}
