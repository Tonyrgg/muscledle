export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

export const hasGaMeasurementId = GA_MEASUREMENT_ID.length > 0;

export type FutureGameEventName =
  | "game_start"
  | "guess_submitted"
  | "game_win"
  | "share_result";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackPageView(url: string): void {
  if (!hasGaMeasurementId || typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", "page_view", {
    page_path: url,
    send_to: GA_MEASUREMENT_ID,
  });
}

export function trackFutureGameEvent(
  name: FutureGameEventName,
  params?: Record<string, string | number | boolean>,
): void {
  if (!hasGaMeasurementId || typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", name, params ?? {});
}
