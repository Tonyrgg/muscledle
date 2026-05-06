import type { CreateWeightGuessFeedbackInput } from "@/types/weightguess-feedback";

export async function createWeightGuessFeedbackRequest(
  input: CreateWeightGuessFeedbackInput,
): Promise<{ id: string }> {
  const response = await fetch("/api/weightguess/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as
    | { id?: string; error?: string }
    | null;

  if (!response.ok || !payload?.id) {
    throw new Error(
      payload?.error ?? `Failed to create WeightGuess feedback (${response.status}).`,
    );
  }

  return { id: payload.id };
}
