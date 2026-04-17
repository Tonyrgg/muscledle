import { NextResponse } from "next/server";
import { addFeedbackAttachment } from "@/lib/feedback/service";

function validateVisitorId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.length > 160) return null;
  return cleaned;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await context.params;
    if (typeof reportId !== "string" || reportId.trim().length === 0) {
      return NextResponse.json({ error: "Invalid report id." }, { status: 400 });
    }

    const visitorId = validateVisitorId(request.headers.get("x-visitor-id"));
    if (!visitorId) {
      return NextResponse.json({ error: "Missing x-visitor-id header." }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file." }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "Empty file." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 10MB limit." }, { status: 400 });
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "video/mp4",
      "text/plain",
      "application/json",
      "application/pdf",
    ];

    if (file.type && !allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 });
    }

    const result = await addFeedbackAttachment({
      reportId,
      visitorId,
      file,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/feedback/[reportId]/attachments failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload attachment." },
      { status: 500 },
    );
  }
}
