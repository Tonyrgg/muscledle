import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type {
  CreateFeedbackReportInput,
  FeedbackDataType,
  FeedbackImpact,
  FeedbackReportSummary,
  FeedbackSeverity,
  FeedbackStatus,
} from "@/types/feedback";

const FEEDBACK_BUCKET = "feedback-attachments";

type FeedbackReportRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: FeedbackStatus;
  category: "bug" | "ux" | "feature" | "data";
  module: "daily" | "marathon" | "archive" | "auth" | "privacy" | "general" | null;
  severity: FeedbackSeverity | null;
  impact: FeedbackImpact | null;
  title: string;
  description: string;
  repro_steps: string | null;
  current_behavior: string | null;
  suggestion: string | null;
  use_case: string | null;
  benefit: string | null;
  data_type: FeedbackDataType | null;
  content_reference: string | null;
  page_path: string | null;
  game_mode: "daily" | "infinite" | null;
  triage_score: number;
};

type FeedbackAttachmentRow = {
  id: string;
  report_id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  created_at: string;
};

function cleanText(value: string | null | undefined, max = 2000): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, max);
}

function computeTriageScore(input: CreateFeedbackReportInput): number {
  const severityWeight = {
    blocker: 95,
    high: 72,
    medium: 48,
    low: 24,
  }[input.severity ?? "low"];

  const impactWeight = {
    critical: 36,
    high: 24,
    medium: 14,
    low: 6,
  }[input.impact ?? "low"];

  const categoryWeight = {
    bug: 16,
    data: 14,
    ux: 10,
    feature: 8,
  }[input.category];

  const diagnosticsBonus = input.diagnostics && Object.keys(input.diagnostics).length > 0 ? 8 : 0;
  const reproBonus = cleanText(input.reproSteps) ? 8 : 0;

  return severityWeight + impactWeight + categoryWeight + diagnosticsBonus + reproBonus;
}

async function getViewerUserId(): Promise<string | null> {
  try {
    const user = await getAuthenticatedUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function createFeedbackReport(input: CreateFeedbackReportInput): Promise<{ id: string }> {
  const admin = createAdminClient();
  const reporterUserId = await getViewerUserId();
  const triageScore = computeTriageScore(input);

  const { data: created, error } = await admin
    .from("feedback_reports")
    .insert({
      reporter_user_id: reporterUserId,
      visitor_id: input.visitorId,
      category: input.category,
      module: input.module ?? null,
      severity: input.severity ?? null,
      impact: input.impact ?? null,
      title: cleanText(input.title, 150) ?? "Untitled",
      description: cleanText(input.description, 10000) ?? "No description",
      repro_steps: cleanText(input.reproSteps, 6000),
      current_behavior: cleanText(input.currentBehavior, 5000),
      suggestion: cleanText(input.suggestion, 5000),
      use_case: cleanText(input.useCase, 5000),
      benefit: cleanText(input.benefit, 5000),
      data_type: input.dataType ?? null,
      content_reference: cleanText(input.contentReference, 5000),
      contact_email: cleanText(input.contactEmail, 250),
      page_path: cleanText(input.pagePath, 400),
      game_mode: input.gameMode ?? null,
      diagnostics: input.diagnostics ?? {},
      triage_score: triageScore,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !created) {
    throw new Error(`Failed to create feedback report: ${error?.message ?? "unknown error"}`);
  }

  await admin.from("feedback_report_events").insert({
    report_id: created.id,
    actor_user_id: reporterUserId,
    actor_role: "user",
    event_type: "created",
    payload: {
      category: input.category,
      module: input.module ?? null,
      severity: input.severity ?? null,
      impact: input.impact ?? null,
      triageScore,
    },
  });

  return { id: created.id };
}

export async function listMyFeedbackReports(visitorId: string): Promise<FeedbackReportSummary[]> {
  const admin = createAdminClient();
  const viewerUserId = await getViewerUserId();

  let query = admin
    .from("feedback_reports")
    .select("id, created_at, updated_at, status, category, module, severity, impact, title, description, repro_steps, current_behavior, suggestion, use_case, benefit, data_type, content_reference, page_path, game_mode, triage_score")
    .order("created_at", { ascending: false })
    .limit(80);

  if (viewerUserId) {
    query = query.or(`reporter_user_id.eq.${viewerUserId},visitor_id.eq.${visitorId}`);
  } else {
    query = query.eq("visitor_id", visitorId);
  }

  const { data, error } = await query.returns<FeedbackReportRow[]>();

  if (error) {
    throw new Error(`Failed to load feedback reports: ${error.message}`);
  }

  const reports = data ?? [];
  if (reports.length === 0) {
    return [];
  }

  const reportIds = reports.map((report) => report.id);
  const { data: attachmentsData, error: attachmentsError } = await admin
    .from("feedback_report_attachments")
    .select("id, report_id, file_name, mime_type, size_bytes, storage_path, created_at")
    .in("report_id", reportIds)
    .order("created_at", { ascending: true })
    .returns<FeedbackAttachmentRow[]>();

  if (attachmentsError) {
    throw new Error(`Failed to load feedback attachments: ${attachmentsError.message}`);
  }

  const attachmentsByReport = new Map<string, FeedbackAttachmentRow[]>();
  for (const attachment of attachmentsData ?? []) {
    const bucket = attachmentsByReport.get(attachment.report_id) ?? [];
    bucket.push(attachment);
    attachmentsByReport.set(attachment.report_id, bucket);
  }

  const out: FeedbackReportSummary[] = [];

  for (const report of reports) {
    const rawAttachments = attachmentsByReport.get(report.id) ?? [];
    const attachments = [] as FeedbackReportSummary["attachments"];

    for (const attachment of rawAttachments) {
      const { data: signed } = await admin.storage
        .from(FEEDBACK_BUCKET)
        .createSignedUrl(attachment.storage_path, 60 * 30);

      attachments.push({
        id: attachment.id,
        fileName: attachment.file_name,
        mimeType: attachment.mime_type,
        sizeBytes: attachment.size_bytes,
        signedUrl: signed?.signedUrl ?? null,
        createdAt: attachment.created_at,
      });
    }

    out.push({
      id: report.id,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
      status: report.status,
      category: report.category,
      module: report.module,
      severity: report.severity,
      impact: report.impact,
      title: report.title,
      description: report.description,
      reproSteps: report.repro_steps,
      currentBehavior: report.current_behavior,
      suggestion: report.suggestion,
      useCase: report.use_case,
      benefit: report.benefit,
      dataType: report.data_type,
      contentReference: report.content_reference,
      pagePath: report.page_path,
      gameMode: report.game_mode,
      triageScore: report.triage_score,
      attachments,
    });
  }

  return out;
}

export async function addFeedbackAttachment(args: {
  reportId: string;
  visitorId: string;
  file: File;
}): Promise<{ attachmentId: string }> {
  const admin = createAdminClient();
  const viewerUserId = await getViewerUserId();

  const ownerQuery = admin
    .from("feedback_reports")
    .select("id, reporter_user_id, visitor_id")
    .eq("id", args.reportId)
    .maybeSingle<{ id: string; reporter_user_id: string | null; visitor_id: string }>();

  const { data: report, error: reportError } = await ownerQuery;

  if (reportError) {
    throw new Error(`Failed to load report: ${reportError.message}`);
  }

  if (!report) {
    throw new Error("Feedback report not found.");
  }

  const allowed =
    (viewerUserId && report.reporter_user_id === viewerUserId) ||
    report.visitor_id === args.visitorId;

  if (!allowed) {
    throw new Error("You are not allowed to modify this report.");
  }

  const rawName = args.file.name || "attachment";
  const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
  const storagePath = `${report.id}/${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}`;

  const { error: uploadError } = await admin.storage
    .from(FEEDBACK_BUCKET)
    .upload(storagePath, args.file, {
      contentType: args.file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload attachment: ${uploadError.message}`);
  }

  const { data: inserted, error: insertError } = await admin
    .from("feedback_report_attachments")
    .insert({
      report_id: report.id,
      uploaded_by_user_id: viewerUserId,
      storage_path: storagePath,
      file_name: safeName,
      mime_type: args.file.type || null,
      size_bytes: Number.isFinite(args.file.size) ? args.file.size : null,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertError || !inserted) {
    throw new Error(`Failed to save attachment record: ${insertError?.message ?? "unknown error"}`);
  }

  await admin.from("feedback_report_events").insert({
    report_id: report.id,
    actor_user_id: viewerUserId,
    actor_role: "user",
    event_type: "attachment_added",
    payload: {
      fileName: safeName,
      mimeType: args.file.type || null,
      sizeBytes: Number.isFinite(args.file.size) ? args.file.size : null,
    },
  });

  return { attachmentId: inserted.id };
}
