import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type {
  CreateWeightGuessFeedbackInput,
  WeightGuessFeedbackModeOption,
} from "@/types/weightguess-feedback";

function cleanVisitorId(value: string): string {
  return value.trim().slice(0, 160);
}

function cleanPagePath(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 400);
}

function normalizeSelectedModes(
  value: WeightGuessFeedbackModeOption[],
): WeightGuessFeedbackModeOption[] {
  return [...new Set(value)];
}

async function getViewerUserId(): Promise<string | null> {
  try {
    const user = await getAuthenticatedUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function createWeightGuessFeedback(
  input: CreateWeightGuessFeedbackInput,
): Promise<{ id: string }> {
  const admin = createAdminClient();
  const reporterUserId = await getViewerUserId();

  const { data, error } = await admin
    .from("weightguess_feedback_submissions")
    .insert({
      reporter_user_id: reporterUserId,
      visitor_id: cleanVisitorId(input.visitorId),
      rating: input.rating,
      selected_modes: normalizeSelectedModes(input.selectedModes),
      surface: input.surface,
      round_number: input.roundNumber ?? null,
      round_outcome: input.roundOutcome ?? null,
      attempts_used: input.attemptsUsed ?? null,
      page_path: cleanPagePath(input.pagePath),
      diagnostics: input.diagnostics ?? {},
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(
      `Failed to store WeightGuess feedback: ${error?.message ?? "unknown error"}`,
    );
  }

  return { id: data.id };
}
