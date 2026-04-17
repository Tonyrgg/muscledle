import { CONSENT_VISITOR_ID_KEY } from "@/lib/privacy/consent";
import type { CreateFeedbackReportInput, FeedbackReportSummary } from "@/types/feedback";

export type FeedbackListResponse = {
  reports: FeedbackReportSummary[];
};

export function getOrCreateFeedbackVisitorId(): string {
  const existing = window.localStorage.getItem(CONSENT_VISITOR_ID_KEY);
  if (existing) return existing;

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(CONSENT_VISITOR_ID_KEY, generated);
  return generated;
}

export async function createFeedbackReportRequest(input: CreateFeedbackReportInput): Promise<{ id: string }> {
  const response = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;

  if (!response.ok || !payload?.id) {
    throw new Error(payload?.error ?? `Failed to create report (${response.status}).`);
  }

  return { id: payload.id };
}

export async function uploadFeedbackAttachmentRequest(args: {
  reportId: string;
  visitorId: string;
  file: File;
}): Promise<void> {
  const formData = new FormData();
  formData.append("file", args.file);

  const response = await fetch(`/api/feedback/${encodeURIComponent(args.reportId)}/attachments`, {
    method: "POST",
    headers: {
      "x-visitor-id": args.visitorId,
    },
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Failed to upload attachment (${response.status}).`);
  }
}

export async function fetchMyFeedbackReportsRequest(visitorId: string): Promise<FeedbackReportSummary[]> {
  const response = await fetch("/api/feedback", {
    method: "GET",
    headers: {
      "x-visitor-id": visitorId,
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as FeedbackListResponse | { error?: string } | null;

  if (!response.ok || !payload || !("reports" in payload)) {
    const message = payload && "error" in payload ? payload.error : null;
    throw new Error(message ?? `Failed to fetch reports (${response.status}).`);
  }

  return payload.reports;
}
