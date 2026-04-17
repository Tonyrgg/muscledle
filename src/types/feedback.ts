export type FeedbackCategory = "bug" | "ux" | "feature" | "data";

export type FeedbackSeverity = "blocker" | "high" | "medium" | "low";

export type FeedbackImpact = "low" | "medium" | "high" | "critical";

export type FeedbackModule =
  | "daily"
  | "marathon"
  | "archive"
  | "auth"
  | "privacy"
  | "general";

export type FeedbackDataType =
  | "exercise_text"
  | "exercise_media"
  | "attributes"
  | "translation"
  | "other";

export type FeedbackStatus =
  | "new"
  | "triaged"
  | "in_progress"
  | "waiting_user"
  | "resolved"
  | "closed";

export type FeedbackReportSummary = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: FeedbackStatus;
  category: FeedbackCategory;
  module: FeedbackModule | null;
  severity: FeedbackSeverity | null;
  impact: FeedbackImpact | null;
  title: string;
  description: string;
  reproSteps: string | null;
  currentBehavior: string | null;
  suggestion: string | null;
  useCase: string | null;
  benefit: string | null;
  dataType: FeedbackDataType | null;
  contentReference: string | null;
  pagePath: string | null;
  gameMode: "daily" | "infinite" | null;
  triageScore: number;
  attachments: Array<{
    id: string;
    fileName: string;
    mimeType: string | null;
    sizeBytes: number | null;
    signedUrl: string | null;
    createdAt: string;
  }>;
};

export type CreateFeedbackReportInput = {
  visitorId: string;
  category: FeedbackCategory;
  module?: FeedbackModule | null;
  severity?: FeedbackSeverity | null;
  impact?: FeedbackImpact | null;
  title?: string | null;
  description?: string | null;
  reproSteps?: string | null;
  currentBehavior?: string | null;
  suggestion?: string | null;
  useCase?: string | null;
  benefit?: string | null;
  dataType?: FeedbackDataType | null;
  contentReference?: string | null;
  contactEmail?: string | null;
  pagePath?: string | null;
  gameMode?: "daily" | "infinite" | null;
  diagnostics?: Record<string, unknown>;
};
