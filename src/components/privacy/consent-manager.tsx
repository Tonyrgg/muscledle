"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import {
  CONSENT_POLICY_VERSION,
  CONSENT_STORAGE_KEY,
  CONSENT_VISITOR_ID_KEY,
  DEFAULT_CONSENT_PREFERENCES,
  toConsentChoice,
  type ConsentChoice,
  type ConsentPreferences,
} from "@/lib/privacy/consent";

type ConsentSource = "banner" | "settings";
type ConsentAction = "accept_all" | "reject_all" | "save_preferences";

const OPEN_CONSENT_EVENT = "liftdle-open-consent";
const CHANGED_CONSENT_EVENT = "liftdle-consent-changed";

function readConsentChoice(): ConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    return toConsentChoice(JSON.parse(raw));
  } catch {
    return null;
  }
}

function getOrCreateVisitorId(): string {
  const existing = window.localStorage.getItem(CONSENT_VISITOR_ID_KEY);
  if (existing) return existing;

  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(CONSENT_VISITOR_ID_KEY, next);
  return next;
}

async function logConsent(
  source: ConsentSource,
  action: ConsentAction,
  preferences: ConsentPreferences,
): Promise<void> {
  const visitorId = getOrCreateVisitorId();

  await fetch("/api/privacy/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source,
      action,
      visitorId,
      policyVersion: CONSENT_POLICY_VERSION,
      preferences,
    }),
  });
}

function saveConsentChoice(preferences: ConsentPreferences): ConsentChoice {
  const next: ConsentChoice = {
    policyVersion: CONSENT_POLICY_VERSION,
    decidedAt: new Date().toISOString(),
    preferences,
  };

  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGED_CONSENT_EVENT));
  return next;
}

export function AnalyticsGate() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const sync = () => {
      const choice = readConsentChoice();
      setEnabled(Boolean(choice?.preferences.analytics));
    };

    sync();

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === CONSENT_STORAGE_KEY) {
        sync();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGED_CONSENT_EVENT, sync);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGED_CONSENT_EVENT, sync);
    };
  }, []);

  return enabled ? <Analytics /> : null;
}

export function ConsentManager() {
  const pathname = usePathname();
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLElement | null>(null);
  const [fabLift, setFabLift] = useState(0);
  const [mobileInlineHost, setMobileInlineHost] = useState<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [draft, setDraft] = useState<ConsentPreferences>(DEFAULT_CONSENT_PREFERENCES);
  const [saving, setSaving] = useState(false);
  const [bannerPrivacyOpen, setBannerPrivacyOpen] = useState(false);
  const [bannerCookiesOpen, setBannerCookiesOpen] = useState(false);
  const [settingsPrivacyOpen, setSettingsPrivacyOpen] = useState(false);
  const [settingsCookiesOpen, setSettingsCookiesOpen] = useState(false);

  const isFirstConsentRequired = ready && !choice;
  const shouldShowBanner = isFirstConsentRequired && bannerOpen && !manageOpen;
  const shouldShowManageAsOverlay = manageOpen && isFirstConsentRequired;

  useEffect(() => {
    const current = readConsentChoice();
    setChoice(current);
    setDraft(current?.preferences ?? DEFAULT_CONSENT_PREFERENCES);
    setBannerOpen(!current);
    setReady(true);

    const openManage = () => {
      const latest = readConsentChoice();
      setDraft(latest?.preferences ?? DEFAULT_CONSENT_PREFERENCES);
      setManageOpen(true);
    };

    window.addEventListener(OPEN_CONSENT_EVENT, openManage);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, openManage);
  }, []);

  useEffect(() => {
    setFabLift(0);
  }, []);

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
  }, [pathname, manageOpen, bannerOpen]);

  useEffect(() => {
    if (!manageOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (fabRef.current?.contains(target)) return;

      if (!isFirstConsentRequired) {
        setManageOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isFirstConsentRequired, manageOpen]);

  const consentSummary = useMemo(() => {
    if (!choice) return "No choice saved yet";
    return `Analytics: ${choice.preferences.analytics ? "On" : "Off"}`;
  }, [choice]);

  const persist = async (
    source: ConsentSource,
    action: ConsentAction,
    nextPreferences: ConsentPreferences,
  ) => {
    setSaving(true);
    const saved = saveConsentChoice(nextPreferences);
    setChoice(saved);

    try {
      await logConsent(source, action, nextPreferences);
    } catch {
      // Non-blocking: local preference is still authoritative for UI behavior.
    } finally {
      setSaving(false);
    }
  };

  const acceptAll = async () => {
    await persist("banner", "accept_all", {
      necessary: true,
      analytics: true,
      marketing: false,
    });
  };

  const rejectAll = async () => {
    await persist("banner", "reject_all", {
      necessary: true,
      analytics: false,
      marketing: false,
    });
  };

  const saveManage = async () => {
    await persist("settings", "save_preferences", {
      necessary: true,
      analytics: draft.analytics,
      marketing: false,
    });
    setManageOpen(false);
  };

  const content = (
    <div className="consent-fab-wrap" style={{ "--consent-fab-lift": `${fabLift}px` } as CSSProperties}>
      <button
        type="button"
        ref={fabRef}
        className="consent-fab"
        onClick={() => {
          const current = readConsentChoice();
          setDraft(current?.preferences ?? DEFAULT_CONSENT_PREFERENCES);
          setManageOpen(true);
        }}
        aria-label="Open privacy and cookies settings"
      >
        Privacy and Cookies
      </button>

      {shouldShowBanner ? (
        <section
          ref={popoverRef}
          className="consent-overlay"
          aria-label="Cookie consent"
          role="dialog"
          aria-modal="true"
        >
          <div className="consent-modal">
            <h2 className="consent-modal__title">Privacy and Cookies</h2>
            <p className="consent-modal__text">
              We use necessary cookies to run Liftdle. We also ask permission for analytics to measure gameplay and improve the product.
            </p>
            <p className="consent-modal__text">
              You can change this choice anytime from <strong>Privacy and Cookies</strong>.
            </p>

            <button
              type="button"
              className="consent-modal__manage"
              onClick={() => setBannerPrivacyOpen((current) => !current)}
            >
              {bannerPrivacyOpen ? "Hide privacy notice" : "Read privacy notice"}
            </button>
            {bannerPrivacyOpen ? (
              <p className="consent-modal__text">
                We process gameplay and session data to provide service, maintain security,
                and handle product operations. Contact: support@liftdle.app.
              </p>
            ) : null}

            <button
              type="button"
              className="consent-modal__manage"
              onClick={() => setBannerCookiesOpen((current) => !current)}
            >
              {bannerCookiesOpen ? "Hide cookie notice" : "Read cookie notice"}
            </button>
            {bannerCookiesOpen ? (
              <p className="consent-modal__text">
                Necessary cookies are always active. Analytics is optional and only enabled
                when you consent.
              </p>
            ) : null}

            <div className="consent-modal__actions">
              <button type="button" className="exercise-media-modal__close" onClick={() => void rejectAll()} disabled={saving}>
                Do not consent
              </button>
              <button type="button" className="exercise-media-modal__close" onClick={() => void acceptAll()} disabled={saving}>
                Consent
              </button>
            </div>
            <button type="button" className="consent-modal__manage" onClick={() => setManageOpen(true)} disabled={saving}>
              Manage options
            </button>
          </div>
        </section>
      ) : null}

      {manageOpen ? (
        <section
          ref={popoverRef}
          className={shouldShowManageAsOverlay ? "consent-overlay" : "consent-popover"}
          aria-label="Cookie settings"
          role="dialog"
          aria-modal={shouldShowManageAsOverlay ? "true" : "false"}
        >
          <div className="consent-modal">
            <h2 className="consent-modal__title">Privacy and Cookies</h2>
            <p className="consent-modal__text">Current status: {consentSummary}</p>

            <label className="consent-modal__toggle" htmlFor="consent-necessary">
              <span>
                <strong>Necessary cookies</strong>
                <small>Required for auth, security, and game functionality.</small>
              </span>
              <input id="consent-necessary" type="checkbox" checked disabled />
            </label>

            <label className="consent-modal__toggle" htmlFor="consent-analytics">
              <span>
                <strong>Analytics</strong>
                <small>Measure game usage and performance (aggregate product analytics).</small>
              </span>
              <input
                id="consent-analytics"
                type="checkbox"
                checked={draft.analytics}
                onChange={(event) => setDraft((current) => ({ ...current, analytics: event.target.checked }))}
              />
            </label>

            <button
              type="button"
              className="consent-modal__manage"
              onClick={() => setSettingsPrivacyOpen((current) => !current)}
            >
              {settingsPrivacyOpen ? "Hide privacy notice" : "Read privacy notice"}
            </button>
            {settingsPrivacyOpen ? (
              <p className="consent-modal__text">
                Liftdle acts as data controller for gameplay processing and related
                operations. For rights requests, contact support@liftdle.app.
              </p>
            ) : null}

            <button
              type="button"
              className="consent-modal__manage"
              onClick={() => setSettingsCookiesOpen((current) => !current)}
            >
              {settingsCookiesOpen ? "Hide cookie notice" : "Read cookie notice"}
            </button>
            {settingsCookiesOpen ? (
              <p className="consent-modal__text">
                Consent preferences are stored with timestamp and policy version.
                Necessary cookies remain active; analytics follows your current choice.
              </p>
            ) : null}

            <div className="consent-modal__actions">
              <button type="button" className="exercise-media-modal__close" onClick={() => setManageOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="exercise-media-modal__close" onClick={() => void saveManage()} disabled={saving}>
                Save preferences
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );

  if (mobileInlineHost) {
    return createPortal(
      <div className="consent-fab-wrap consent-fab-wrap--inline">{content.props.children}</div>,
      mobileInlineHost,
    );
  }

  return content;
}
