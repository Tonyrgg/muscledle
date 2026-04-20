"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { GA_MEASUREMENT_ID, hasGaMeasurementId, trackPageView } from "@/lib/analytics/ga";
import { CONSENT_STORAGE_KEY, toConsentChoice } from "@/lib/privacy/consent";

const CHANGED_CONSENT_EVENT = "liftdle-consent-changed";

function readAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return false;
    const choice = toConsentChoice(JSON.parse(raw));
    return Boolean(choice?.preferences.analytics);
  } catch {
    return false;
  }
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    if (!hasGaMeasurementId) return;

    const sync = () => setAnalyticsAllowed(readAnalyticsConsent());
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

  useEffect(() => {
    if (!hasGaMeasurementId || !analyticsAllowed) return;

    const query = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
    const url = query ? `${pathname}?${query}` : pathname;
    trackPageView(url);
  }, [analyticsAllowed, pathname]);

  useEffect(() => {
    if (!hasGaMeasurementId || typeof window === "undefined" || typeof window.gtag !== "function") {
      return;
    }

    window.gtag("consent", "update", {
      analytics_storage: analyticsAllowed ? "granted" : "denied",
    });
  }, [analyticsAllowed]);

  if (!hasGaMeasurementId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('consent', 'default', { analytics_storage: 'denied' });
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
