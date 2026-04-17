"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import {
  createFeedbackReportRequest,
  fetchMyFeedbackReportsRequest,
  getOrCreateFeedbackVisitorId,
  uploadFeedbackAttachmentRequest,
} from "@/lib/feedback/client";
import type {
  CreateFeedbackReportInput,
  FeedbackCategory,
  FeedbackDataType,
  FeedbackImpact,
  FeedbackModule,
  FeedbackReportSummary,
  FeedbackSeverity,
  FeedbackStatus,
} from "@/types/feedback";

const OPEN_FEEDBACK_EVENT = "liftdle-open-feedback";

type TabId = "new" | "mine";

type FieldId =
  | "module"
  | "severity"
  | "impact"
  | "title"
  | "description"
  | "reproSteps"
  | "currentBehavior"
  | "suggestion"
  | "useCase"
  | "benefit"
  | "dataType"
  | "contentReference"
  | "contactEmail"
  | "attachments"
  | "diagnostics";

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
  { value: "auth", label: "Auth" },
  { value: "privacy", label: "Privacy and Cookies" },
  { value: "general", label: "General" },
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
  bug: ["module", "severity", "impact", "title", "description", "reproSteps", "contactEmail", "attachments", "diagnostics"],
  ux: ["module", "impact", "title", "description", "currentBehavior", "suggestion", "contactEmail", "attachments", "diagnostics"],
  feature: ["module", "impact", "title", "description", "useCase", "benefit", "contactEmail", "attachments", "diagnostics"],
  data: ["module", "impact", "title", "description", "dataType", "contentReference", "reproSteps", "contactEmail", "attachments", "diagnostics"],
};

function statusLabel(status: FeedbackStatus): string {
  if (status === "in_progress") return "In progress";
  if (status === "waiting_user") return "Waiting user";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function categoryLabel(category: FeedbackCategory): string {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category;
}

function moduleLabel(moduleValue: FeedbackModule | null): string | null {
  if (!moduleValue) return null;
  return MODULE_OPTIONS.find((option) => option.value === moduleValue)?.label ?? moduleValue;
}

function dataTypeLabel(value: FeedbackDataType | null): string | null {
  if (!value) return null;
  return DATA_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function FeedbackCenter() {
  const pathname = usePathname();
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLElement | null>(null);
  const [fabLift, setFabLift] = useState(0);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("new");
  const [reports, setReports] = useState<FeedbackReportSummary[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorsFeed, setErrorsFeed] = useState<string[]>([]);

  const [category, setCategory] = useState<FeedbackCategory | "">("");
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [moduleValue, setModuleValue] = useState<FeedbackModule | "">("");
  const [severity, setSeverity] = useState<FeedbackSeverity | "">("");
  const [impact, setImpact] = useState<FeedbackImpact | "">("");
  const [dataType, setDataType] = useState<FeedbackDataType | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reproSteps, setReproSteps] = useState("");
  const [currentBehavior, setCurrentBehavior] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [useCase, setUseCase] = useState("");
  const [benefit, setBenefit] = useState("");
  const [contentReference, setContentReference] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

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
      setTab("new");
    };

    window.addEventListener(OPEN_FEEDBACK_EVENT, openListener);
    return () => window.removeEventListener(OPEN_FEEDBACK_EVENT, openListener);
  }, []);

  useEffect(() => {
    let rafId = 0;

    const updateFabLift = () => {
      rafId = 0;

      const footer = document.querySelector<HTMLElement>(".game-footer");
      if (!footer) {
        setFabLift(0);
        return;
      }

      const footerRect = footer.getBoundingClientRect();
      const footerGap = 12;
      const overlapWithViewportBottom = window.innerHeight - footerRect.top;
      const nextLift = overlapWithViewportBottom > 0
        ? Math.max(0, overlapWithViewportBottom + footerGap)
        : 0;

      setFabLift((current) => (Math.abs(current - nextLift) < 0.5 ? current : nextLift));
    };

    const scheduleUpdate = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(updateFabLift);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [pathname]);

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

  const visitorId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return getOrCreateFeedbackVisitorId();
  }, []);

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

  const refreshReports = useCallback(async () => {
    if (!visitorId) return;
    setLoadingReports(true);

    try {
      const next = await fetchMyFeedbackReportsRequest(visitorId);
      setReports(next);
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : "Failed to load reports.");
    } finally {
      setLoadingReports(false);
    }
  }, [visitorId]);

  useEffect(() => {
    if (!open || tab !== "mine") return;
    void refreshReports();
  }, [open, refreshReports, tab]);

  const resetForm = () => {
    setCategory("");
    setVisibleSteps(0);
    setModuleValue("");
    setSeverity("");
    setImpact("");
    setDataType("");
    setTitle("");
    setDescription("");
    setReproSteps("");
    setCurrentBehavior("");
    setSuggestion("");
    setUseCase("");
    setBenefit("");
    setContentReference("");
    setContactEmail("");
    setIncludeDiagnostics(true);
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
    if (title.trim().length < 4) return "Title must contain at least 4 characters.";
    if (description.trim().length < 10) return "Description must contain at least 10 characters.";

    if (category === "bug") {
      if (!severity) return "Select severity for bug reports.";
      if (reproSteps.trim().length < 10) return "Add reproducible steps for bug reports.";
    }

    if (category === "ux") {
      if (currentBehavior.trim().length < 10) return "Describe the current behavior.";
      if (suggestion.trim().length < 8) return "Add your UX suggestion.";
    }

    if (category === "feature") {
      if (useCase.trim().length < 8) return "Describe the use case.";
      if (benefit.trim().length < 8) return "Describe expected benefit.";
    }

    if (category === "data") {
      if (!dataType) return "Select data/content type.";
      if (contentReference.trim().length < 4) return "Add a content reference (exercise name, URL, id).";
      if (reproSteps.trim().length < 10) return "Add steps to reproduce/verify.";
    }

    if (contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      return "Contact email is not valid.";
    }

    return null;
  };

  const handleSubmit = async () => {
    setSubmitMessage(null);

    if (!visitorId) {
      setSubmitMessage("Missing visitor id.");
      return;
    }

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
      const payload: CreateFeedbackReportInput = {
        visitorId,
        category,
        module: moduleValue,
        severity: severity || null,
        impact,
        title,
        description,
        reproSteps: reproSteps || null,
        currentBehavior: currentBehavior || null,
        suggestion: suggestion || null,
        useCase: useCase || null,
        benefit: benefit || null,
        dataType: dataType || null,
        contentReference: contentReference || null,
        contactEmail: contactEmail || null,
        pagePath: pathname || null,
        gameMode: pathname === "/archive" ? null : pathname === "/" ? "daily" : null,
        diagnostics: includeDiagnostics ? buildDiagnostics() : {},
      };

      const created = await createFeedbackReportRequest(payload);

      for (const file of files.slice(0, 5)) {
        await uploadFeedbackAttachmentRequest({
          reportId: created.id,
          visitorId,
          file,
        });
      }

      setSubmitMessage("Report sent successfully.");
      resetForm();
      setTab("mine");
      await refreshReports();
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
    setTitle("");
    setDescription("");
    setReproSteps("");
    setCurrentBehavior("");
    setSuggestion("");
    setUseCase("");
    setBenefit("");
    setContentReference("");
    setContactEmail("");
    setIncludeDiagnostics(true);
    setFiles([]);
    setSubmitMessage(null);
  };

  const canGoNext = category !== "" && visibleSteps < activeSteps.length;
  const canGoBack = category !== "" && visibleSteps > 1;

  return (
    <div className="feedback-fab-wrap" style={{ "--feedback-fab-lift": `${fabLift}px` } as CSSProperties}>
      <button
        type="button"
        ref={fabRef}
        className="feedback-fab"
        onClick={() => {
          setOpen(true);
          setTab("new");
        }}
        aria-label="Open feedback center"
      >
        leave a feedback
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

            <div className="feedback-modal__tabs">
              <button
                type="button"
                className={`feedback-modal__tab ${tab === "new" ? "feedback-modal__tab--active" : ""}`}
                onClick={() => setTab("new")}
              >
                New report
              </button>
              <button
                type="button"
                className={`feedback-modal__tab ${tab === "mine" ? "feedback-modal__tab--active" : ""}`}
                onClick={() => setTab("mine")}
              >
                My reports
              </button>
            </div>

            {tab === "new" ? (
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
                    <select value={moduleValue} onChange={(event) => setModuleValue(event.target.value as FeedbackModule | "")}>
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
                          onClick={() => setSeverity(option.value)}
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
                          onClick={() => setImpact(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {visibleFieldSet.has("title") ? (
                  <label>
                    Title
                    <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Short summary" />
                  </label>
                ) : null}

                {visibleFieldSet.has("description") ? (
                  <label>
                    Description
                    <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Describe the issue or request." />
                  </label>
                ) : null}

                {visibleFieldSet.has("reproSteps") ? (
                  <label>
                    Steps
                    <textarea value={reproSteps} onChange={(event) => setReproSteps(event.target.value)} rows={4} placeholder="1. ... 2. ... 3. ..." />
                  </label>
                ) : null}

                {visibleFieldSet.has("currentBehavior") ? (
                  <label>
                    Current behavior
                    <textarea value={currentBehavior} onChange={(event) => setCurrentBehavior(event.target.value)} rows={3} placeholder="How it behaves today" />
                  </label>
                ) : null}

                {visibleFieldSet.has("suggestion") ? (
                  <label>
                    Suggested improvement
                    <textarea value={suggestion} onChange={(event) => setSuggestion(event.target.value)} rows={3} placeholder="What should change" />
                  </label>
                ) : null}

                {visibleFieldSet.has("useCase") ? (
                  <label>
                    Use case
                    <textarea value={useCase} onChange={(event) => setUseCase(event.target.value)} rows={3} placeholder="When and why users need this" />
                  </label>
                ) : null}

                {visibleFieldSet.has("benefit") ? (
                  <label>
                    Benefit
                    <textarea value={benefit} onChange={(event) => setBenefit(event.target.value)} rows={3} placeholder="Expected outcome" />
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
                          onClick={() => setDataType(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {visibleFieldSet.has("contentReference") ? (
                  <label>
                    Content reference
                    <textarea value={contentReference} onChange={(event) => setContentReference(event.target.value)} rows={3} placeholder="Exercise name, archive day, URL, screenshot note" />
                  </label>
                ) : null}

                {visibleFieldSet.has("contactEmail") ? (
                  <label>
                    Contact email (optional)
                    <input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="you@example.com" />
                  </label>
                ) : null}

                {visibleFieldSet.has("attachments") ? (
                  <label>
                    Attachments (up to 5 files, 10MB each)
                    <input
                      type="file"
                      multiple
                      onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 5))}
                    />
                  </label>
                ) : null}

                {visibleFieldSet.has("diagnostics") ? (
                  <label className="feedback-modal__checkbox">
                    <input
                      type="checkbox"
                      checked={includeDiagnostics}
                      onChange={(event) => setIncludeDiagnostics(event.target.checked)}
                    />
                    Attach technical diagnostics automatically
                  </label>
                ) : null}

                <div className="feedback-modal__actions">
                  <button type="button" className="exercise-media-modal__close" onClick={() => setVisibleSteps((current) => Math.max(1, current - 1))} disabled={!canGoBack || submitting}>
                    Back
                  </button>
                  <button type="button" className="exercise-media-modal__close" onClick={() => setVisibleSteps((current) => Math.min(activeSteps.length, current + 1))} disabled={!canGoNext || submitting}>
                    Next
                  </button>
                  <button type="button" className="exercise-media-modal__close" onClick={handleSubmit} disabled={!allStepsShown || submitting}>
                    {submitting ? "Sending..." : "Send report"}
                  </button>
                  <button type="button" className="exercise-media-modal__close" onClick={resetForm} disabled={submitting}>
                    Reset
                  </button>
                </div>

                {category ? (
                  <p className="feedback-modal__message">
                    Step {Math.min(visibleSteps, activeSteps.length)}/{activeSteps.length}
                  </p>
                ) : null}
                {submitMessage ? <p className="feedback-modal__message">{submitMessage}</p> : null}
              </div>
            ) : (
              <div className="feedback-modal__body">
                <div className="feedback-modal__actions">
                  <button type="button" className="exercise-media-modal__close" onClick={() => void refreshReports()} disabled={loadingReports}>
                    {loadingReports ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                {reports.length === 0 ? (
                  <p className="feedback-modal__message">No reports yet.</p>
                ) : (
                  <div className="feedback-modal__list">
                    {reports.map((report) => {
                      const metaBits = [
                        categoryLabel(report.category),
                        moduleLabel(report.module),
                        report.severity ? `Severity ${report.severity}` : null,
                        report.impact ? `Impact ${report.impact}` : null,
                        report.dataType ? dataTypeLabel(report.dataType) : null,
                        `Score ${report.triageScore}`,
                      ].filter((value): value is string => Boolean(value));

                      return (
                        <article key={report.id} className="feedback-modal__card">
                          <div className="feedback-modal__card-head">
                            <p className="feedback-modal__card-title">{report.title}</p>
                            <span className={`feedback-modal__badge feedback-modal__badge--${report.status}`}>
                              {statusLabel(report.status)}
                            </span>
                          </div>
                          <p className="feedback-modal__meta">{metaBits.join(" | ")}</p>
                          <p className="feedback-modal__meta">{new Date(report.createdAt).toLocaleString()}</p>
                          <p className="feedback-modal__desc">{report.description}</p>

                          {report.attachments.length > 0 ? (
                            <div className="feedback-modal__attachments">
                              {report.attachments.map((attachment) => (
                                <a key={attachment.id} href={attachment.signedUrl ?? "#"} target="_blank" rel="noreferrer">
                                  {attachment.fileName}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
