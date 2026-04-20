'use client';

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AnalyticsGate, ConsentManager } from "@/components/privacy/consent-manager";

const FeedbackCenter = dynamic(
  () => import("@/components/feedback/feedback-center").then((mod) => mod.FeedbackCenter),
  { loading: () => null },
);

export function GlobalOverlays() {
  const [interactiveReady, setInteractiveReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const reveal = () => {
      if (cancelled) return;
      setInteractiveReady(true);
    };

    const withIdle = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof withIdle.requestIdleCallback === "function") {
      idleId = withIdle.requestIdleCallback(reveal, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(reveal, 900);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && typeof withIdle.cancelIdleCallback === "function") {
        withIdle.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <>
      <AnalyticsGate />
      {interactiveReady ? (
        <>
          <ConsentManager />
          <FeedbackCenter />
        </>
      ) : null}
    </>
  );
}
