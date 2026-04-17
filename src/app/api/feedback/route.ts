import { NextResponse } from "next/server";
import { createFeedbackReport, listMyFeedbackReports } from "@/lib/feedback/service";
import type {
  CreateFeedbackReportInput,
  FeedbackCategory,
  FeedbackDataType,
  FeedbackImpact,
  FeedbackModule,
  FeedbackSeverity,
} from "@/types/feedback";

const CATEGORY_VALUES = new Set<FeedbackCategory>(["bug", "ux", "feature", "data"]);
const MODULE_VALUES = new Set<FeedbackModule>(["daily", "marathon", "archive", "general"]);
const SEVERITY_VALUES = new Set<FeedbackSeverity>(["blocker", "high", "medium", "low"]);
const IMPACT_VALUES = new Set<FeedbackImpact>(["low", "medium", "high", "critical"]);
const DATA_TYPE_VALUES = new Set<FeedbackDataType>(["exercise_text", "exercise_media", "attributes", "translation", "other"]);

function validateVisitorId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.length > 160) return null;
  return cleaned;
}

function cleanOptionalText(value: unknown, minLength: number, label: string): { value: string | null; error: string | null } {
  if (value == null || value === "") {
    return { value: null, error: null };
  }

  if (typeof value !== "string") {
    return { value: null, error: `${label} must be text.` };
  }

  const cleaned = value.trim();
  if (cleaned.length < minLength) {
    return { value: null, error: `${label} must be at least ${minLength} characters.` };
  }

  return { value: cleaned, error: null };
}

function requireField<T>(value: T | null | undefined, error: string): { value: T; error: null } | { value: null; error: string } {
  if (value == null || value === "") {
    return { value: null, error };
  }

  return { value, error: null };
}

export async function GET(request: Request) {
  try {
    const visitorId = validateVisitorId(request.headers.get("x-visitor-id"));
    if (!visitorId) {
      return NextResponse.json({ error: "Missing x-visitor-id header." }, { status: 400 });
    }

    const reports = await listMyFeedbackReports(visitorId);
    return NextResponse.json({ reports }, { status: 200 });
  } catch (error) {
    console.error("GET /api/feedback failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load reports." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Partial<CreateFeedbackReportInput> | null;

    const visitorId = validateVisitorId(body?.visitorId);
    if (!visitorId) {
      return NextResponse.json({ error: "Invalid visitorId." }, { status: 400 });
    }

    const category = body?.category;
    if (!category || !CATEGORY_VALUES.has(category)) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }

    const moduleCheck = requireField(body?.module, "Module is required.");
    if (moduleCheck.error || !MODULE_VALUES.has(moduleCheck.value as FeedbackModule)) {
      return NextResponse.json({ error: moduleCheck.error ?? "Invalid module." }, { status: 400 });
    }

    const impactCheck = requireField(body?.impact, "Impact is required.");
    if (impactCheck.error || !IMPACT_VALUES.has(impactCheck.value as FeedbackImpact)) {
      return NextResponse.json({ error: impactCheck.error ?? "Invalid impact." }, { status: 400 });
    }

    const titleCheck = cleanOptionalText(body?.title, 4, "Title");
    if (titleCheck.error || !titleCheck.value) {
      return NextResponse.json({ error: titleCheck.error ?? "Title is required." }, { status: 400 });
    }

    const descriptionCheck = cleanOptionalText(body?.description, 10, "Description");
    if (descriptionCheck.error || !descriptionCheck.value) {
      return NextResponse.json({ error: descriptionCheck.error ?? "Description is required." }, { status: 400 });
    }

    const reproCheck = cleanOptionalText(body?.reproSteps, 10, "Repro steps");
    const currentBehaviorCheck = cleanOptionalText(body?.currentBehavior, 10, "Current behavior");
    const suggestionCheck = cleanOptionalText(body?.suggestion, 8, "Suggestion");
    const useCaseCheck = cleanOptionalText(body?.useCase, 8, "Use case");
    const benefitCheck = cleanOptionalText(body?.benefit, 8, "Benefit");
    const contentRefCheck = cleanOptionalText(body?.contentReference, 4, "Content reference");

    const severity = body?.severity ?? null;
    if (category === "bug") {
      if (!severity || !SEVERITY_VALUES.has(severity)) {
        return NextResponse.json({ error: "Severity is required for bug reports." }, { status: 400 });
      }
    } else if (severity && !SEVERITY_VALUES.has(severity)) {
      return NextResponse.json({ error: "Invalid severity." }, { status: 400 });
    }

    const dataType = body?.dataType ?? null;
    if (category === "data") {
      if (!dataType || !DATA_TYPE_VALUES.has(dataType)) {
        return NextResponse.json({ error: "Data type is required for data/content reports." }, { status: 400 });
      }
    } else if (dataType && !DATA_TYPE_VALUES.has(dataType)) {
      return NextResponse.json({ error: "Invalid data type." }, { status: 400 });
    }

    const contactEmail = typeof body?.contactEmail === "string" ? body.contactEmail.trim() : null;
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json({ error: "Invalid contact email." }, { status: 400 });
    }

    const report = await createFeedbackReport({
      visitorId,
      category,
      module: moduleCheck.value,
      severity,
      impact: impactCheck.value,
      title: titleCheck.value,
      description: descriptionCheck.value,
      reproSteps: reproCheck.value,
      currentBehavior: currentBehaviorCheck.value,
      suggestion: suggestionCheck.value,
      useCase: useCaseCheck.value,
      benefit: benefitCheck.value,
      dataType,
      contentReference: contentRefCheck.value,
      contactEmail,
      pagePath: typeof body?.pagePath === "string" ? body.pagePath : null,
      gameMode: body?.gameMode ?? null,
      diagnostics: body?.diagnostics ?? {},
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("POST /api/feedback failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create report." },
      { status: 500 },
    );
  }
}
