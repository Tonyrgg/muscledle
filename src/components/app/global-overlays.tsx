'use client';

import dynamic from "next/dynamic";
import { AnalyticsGate, ConsentManager } from "@/components/privacy/consent-manager";

const FeedbackCenter = dynamic(
  () => import("@/components/feedback/feedback-center").then((mod) => mod.FeedbackCenter),
  { loading: () => null },
);

export function GlobalOverlays() {
  return (
    <>
      <AnalyticsGate />
      <ConsentManager />
      <FeedbackCenter />
    </>
  );
}
