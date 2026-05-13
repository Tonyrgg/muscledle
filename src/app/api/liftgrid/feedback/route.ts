import { NextResponse } from "next/server";
import { submitLiftGridFeedback } from "@/lib/liftgrid/service";
import type { LiftGridFeedbackChoice } from "@/types/liftgrid";

type FeedbackBody = {
  choice?: unknown;
};

const FEEDBACK_CHOICES = new Set<LiftGridFeedbackChoice>([
  "yes_make_it",
  "maybe",
  "not_for_me",
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as FeedbackBody | null;
    const choice = body?.choice;

    if (typeof choice !== "string" || !FEEDBACK_CHOICES.has(choice as LiftGridFeedbackChoice)) {
      return NextResponse.json({ error: "Invalid LiftGrid feedback choice." }, { status: 400 });
    }

    await submitLiftGridFeedback(choice as LiftGridFeedbackChoice);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("/api/liftgrid/feedback failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to store LiftGrid feedback.",
      },
      { status: 500 },
    );
  }
}
