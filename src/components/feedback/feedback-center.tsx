"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  createFeedbackReportRequest,
  ensureFeedbackVisitorId,
  getOrCreateFeedbackVisitorId,
  uploadFeedbackAttachmentRequest,
} from "@/lib/feedback/client";
import type {
  CreateFeedbackReportInput,
  FeedbackCategory,
  FeedbackDataType,
  FeedbackImpact,
  FeedbackModule,
  FeedbackSeverity,
} from "@/types/feedback";

const OPEN_FEEDBACK_EVENT = "liftdle-open-feedback";

type FieldId =
  | "module"
  | "severity"
  | "impact"
  | "description"
  | "dataType"
  | "attachments";

const CATEGORY_OPTIONS: Array<{ value: FeedbackCategory; label: string }> = [
  { value: "bug", label: "Bug" },
  { value: "ux", label: "UX improvement" },
  { value: "feature", label: "Feature request" },
  { value: "data", label: "Data/content issue" },
];

const MODULE_OPTIONS: Array<{ value: FeedbackModule; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "marathon", label: "Marathon" },
  { value: "archive", label: "Archive" },
  { value: "general", label: "Others..." },
];

const SEVERITY_OPTIONS: Array<{ value: FeedbackSeverity; label: string }> = [
  { value: "blocker", label: "Blocker" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const IMPACT_OPTIONS: Array<{ value: FeedbackImpact; label: string }> = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const DATA_TYPE_OPTIONS: Array<{ value: FeedbackDataType; label: string }> = [
  { value: "exercise_text", label: "Exercise text" },
  { value: "exercise_media", label: "Exercise media" },
  { value: "attributes", label: "Attributes/tags" },
  { value: "translation", label: "Translation" },
  { value: "other", label: "Other" },
];

const CATEGORY_STEPS: Record<FeedbackCategory, FieldId[]> = {
  bug: ["module", "severity", "impact", "description"],
  ux: ["module", "impact", "description"],
  feature: ["module", "impact", "description"],
  data: ["module", "impact", "dataType", "description"],
};

export function FeedbackCenter() {
  const pathname = usePathname();
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLElement | null>(null);
  const [fabLift, setFabLift] = useState(0);
  const [mobileInlineHost, setMobileInlineHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorsFeed, setErrorsFeed] = useState<string[]>([]);

  const [category, setCategory] = useState<FeedbackCategory | "">("");
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [moduleValue, setModuleValue] = useState<FeedbackModule | "">("");
  const [severity, setSeverity] = useState<FeedbackSeverity | "">("");
  const [impact, setImpact] = useState<FeedbackImpact | "">("");
  const [dataType, setDataType] = useState<FeedbackDataType | "">("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState("");

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const next = `${event.message || "runtime error"} @ ${event.filename || "unknown"}:${event.lineno || 0}`;
      setErrorsFeed((current) => [next, ...current].slice(0, 12));
    };

    const onUnhandled = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
      setErrorsFeed((current) => [`unhandled rejection: ${reason}`, ...current].slice(0, 12));
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandled);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);

  useEffect(() => {
    const openListener = () => {
      setOpen(true);
    };

    window.addEventListener(OPEN_FEEDBACK_EVENT, openListener);
    return () => window.removeEventListener(OPEN_FEEDBACK_EVENT, openListener);
  }, []);

  useEffect(() => {
    setFabLift(0);
  }, [pathname]);

  useEffect(() => {
    const syncHost = () => {
      if (typeof window === "undefined") {
        setMobileInlineHost(null);
        return;
      }

      const isMobile = window.matchMedia("(max-width: 760px)").matches;
      const host = document.getElementById("mobile-floating-pills-host");
      setMobileInlineHost(isMobile && host instanceof HTMLElement ? host : null);
    };

    syncHost();
    window.addEventListener("resize", syncHost);
    window.addEventListener("orientationchange", syncHost);

    return () => {
      window.removeEventListener("resize", syncHost);
      window.removeEventListener("orientationchange", syncHost);
    };
  }, [open, pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (fabRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const existing = getOrCreateFeedbackVisitorId();
    if (existing) {
      setVisitorId(existing);
      return;
    }

    void ensureFeedbackVisitorId(pathname || "/")
      .then(setVisitorId)
      .catch(() => {
        setVisitorId("");
      });
  }, [pathname]);

  const activeSteps = useMemo<FieldId[]>(() => {
    if (!category) return [];
    return CATEGORY_STEPS[category];
  }, [category]);

  const visibleFieldSet = useMemo(() => {
    const fields = new Set<FieldId>();
    for (let index = 0; index < Math.min(activeSteps.length, visibleSteps); index += 1) {
      fields.add(activeSteps[index]);
    }
    return fields;
  }, [activeSteps, visibleSteps]);

  const allStepsShown = category !== "" && visibleSteps >= activeSteps.length;

  const resetForm = () => {
    setCategory("");
    setVisibleSteps(0);
    setModuleValue("");
    setSeverity("");
    setImpact("");
    setDataType("");
    setDescription("");
    setFiles([]);
  };

  const buildDiagnostics = (): Record<string, unknown> => {
    return {
      pathname,
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      referrer: document.referrer || null,
      capturedErrors: errorsFeed,
      submittedAt: new Date().toISOString(),
    };
  };

  const validateClient = (): string | null => {
    if (!category) return "Select a category to begin.";
    if (!moduleValue) return "Select the affected area.";
    if (!impact) return "Select impact.";
    if (description.trim().length < 10) return "Description must contain at least 10 characters.";

    if (category === "bug") {
      if (!severity) return "Select severity for bug reports.";
    }

    if (category === "data") {
      if (!dataType) return "Select data/content type.";
    }

    return null;
  };

  const handleSubmit = async () => {
    setSubmitMessage(null);

    const validationError = validateClient();
    if (validationError) {
      setSubmitMessage(validationError);
      return;
    }

    if (!category || !moduleValue || !impact) {
      setSubmitMessage("Required fields are missing.");
      return;
    }

    setSubmitting(true);

    try {
      const ensuredVisitorId = visitorId || (await ensureFeedbackVisitorId(pathname || "/"));
      setVisitorId(ensuredVisitorId);

      const payload: CreateFeedbackReportInput = {
        visitorId: ensuredVisitorId,
        category,
        module: moduleValue,
        severity: severity || null,
        impact,
        title: description.trim().slice(0, 80) || "Feedback report",
        description,
        reproSteps: null,
        currentBehavior: null,
        suggestion: null,
        useCase: null,
        benefit: null,
        dataType: dataType || null,
        contentReference: null,
        contactEmail: null,
        pagePath: pathname || null,
        gameMode: pathname === "/archive" ? null : pathname === "/" ? "daily" : null,
        diagnostics: buildDiagnostics(),
      };

      const created = await createFeedbackReportRequest(payload);

      for (const file of files.slice(0, 5)) {
        await uploadFeedbackAttachmentRequest({
          reportId: created.id,
          visitorId: ensuredVisitorId,
          file,
        });
      }

      setSubmitMessage("Report sent successfully.");
      resetForm();
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : "Failed to send report.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategoryChange = (value: string) => {
    if (!value) {
      resetForm();
      return;
    }

    const nextCategory = value as FeedbackCategory;
    setCategory(nextCategory);
    setVisibleSteps(1);

    setModuleValue("");
    setSeverity("");
    setImpact("");
    setDataType("");
    setDescription("");
    setFiles([]);
    setSubmitMessage(null);
  };

  const revealNextAfter = useCallback((field: FieldId, isCompleted: boolean) => {
    if (!category || !isCompleted) return;
    const index = activeSteps.indexOf(field);
    if (index === -1) return;
    setVisibleSteps((current) => Math.max(current, Math.min(activeSteps.length, index + 2)));
  }, [activeSteps, category]);

  const content = (
    <div className="feedback-fab-wrap" style={{ "--feedback-fab-lift": `${fabLift}px` } as CSSProperties}>
      <button
        type="button"
        ref={fabRef}
        className="feedback-fab"
        onClick={() => {
          setOpen(true);
        }}
        aria-label="Open feedback center"
      >
        Give a feedback
      </button>

      {open ? (
        <section
          ref={popoverRef}
          className="feedback-popover"
          aria-label="Feedback center"
          role="dialog"
          aria-modal="false"
        >
          <div className="consent-modal feedback-modal">
            <div className="feedback-modal__head">
              <h2 className="consent-modal__title">Feedback Center</h2>
              <button type="button" className="exercise-media-modal__close" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <div className="feedback-modal__body">
                <label>
                  Category
                  <select value={category} onChange={(event) => handleCategoryChange(event.target.value)}>
                    <option value="">Select category</option>
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                {visibleFieldSet.has("module") ? (
                  <label>
                    Area
                    <select
                      value={moduleValue}
                      onChange={(event) => {
                        const next = event.target.value as FeedbackModule | "";
                        setModuleValue(next);
                        revealNextAfter("module", next !== "");
                      }}
                    >
                      <option value="">Select area</option>
                      {MODULE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {visibleFieldSet.has("severity") ? (
                  <div className="feedback-modal__field">
                    <p className="feedback-modal__field-label">Severity</p>
                    <div className="feedback-modal__pills">
                      {SEVERITY_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`feedback-modal__pill ${severity === option.value ? "feedback-modal__pill--active" : ""}`}
                          onClick={() => {
                            setSeverity(option.value);
                            revealNextAfter("severity", true);
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {visibleFieldSet.has("impact") ? (
                  <div className="feedback-modal__field">
                    <p className="feedback-modal__field-label">Impact</p>
                    <div className="feedback-modal__pills">
                      {IMPACT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`feedback-modal__pill ${impact === option.value ? "feedback-modal__pill--active" : ""}`}
                          onClick={() => {
                            setImpact(option.value);
                            revealNextAfter("impact", true);
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {visibleFieldSet.has("description") ? (
                  <label>
                    Descrizione
                    <textarea
                      value={description}
                      onChange={(event) => {
                        const next = event.target.value;
                        setDescription(next);
                      }}
                      rows={6}
                      placeholder="Scrivi qui tutti i dettagli del feedback."
                    />
                  </label>
                ) : null}

                {visibleFieldSet.has("dataType") ? (
                  <div className="feedback-modal__field">
                    <p className="feedback-modal__field-label">Data/content type</p>
                    <div className="feedback-modal__pills">
                      {DATA_TYPE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`feedback-modal__pill ${dataType === option.value ? "feedback-modal__pill--active" : ""}`}
                          onClick={() => {
                            setDataType(option.value);
                            revealNextAfter("dataType", true);
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {visibleFieldSet.has("description") ? (
                  <label>
                    Attachments (up to 5 files, 10MB each)
                    <input
                      type="file"
                      multiple
                      onChange={(event) => {
                        const next = Array.from(event.target.files ?? []).slice(0, 5);
                        setFiles(next);
                      }}
                    />
                  </label>
                ) : null}

                <div className="feedback-modal__actions feedback-modal__actions--submit">
                  <button type="button" className="exercise-media-modal__close feedback-modal__action-send" onClick={handleSubmit} disabled={!allStepsShown || submitting}>
                    {submitting ? "Sending..." : "Send report"}
                  </button>
                  <button
                    type="button"
                    className="exercise-media-modal__close feedback-modal__action-reset"
                    onClick={resetForm}
                    disabled={submitting}
                    aria-label="Reset form"
                    title="Reset form"
                  >
                    <span aria-hidden="true">↺</span>
                  </button>
                </div>

                {category ? (
                  <p className="feedback-modal__message">
                    Step {Math.min(visibleSteps, activeSteps.length)}/{activeSteps.length}
                  </p>
                ) : null}
                {submitMessage ? <p className="feedback-modal__message">{submitMessage}</p> : null}
              </div>
          </div>
        </section>
      ) : null}
    </div>
  );

  if (mobileInlineHost) {
    return createPortal(
      <div className="feedback-fab-wrap feedback-fab-wrap--inline">{content.props.children}</div>,
      mobileInlineHost,
    );
  }

  return content;
}
