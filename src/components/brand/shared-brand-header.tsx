"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { StreakFireIcon } from "@/components/brand/streak-fire-icon";
import {
  type LiftdleHeaderAction,
  getLiftdleHeaderLabel,
  LIFTDLE_HEADER_MODE_EVENT,
  LIFTDLE_HEADER_OPEN_EVENT,
  LIFTDLE_HEADER_STREAK_EVENT,
} from "@/lib/liftdleHeader";

export function SharedBrandHeader() {
  const pathname = usePathname();
  const hubLabel = useMemo(() => null, []);
  const [modeOverride, setModeOverride] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    setModeOverride(null);
  }, [pathname]);

  useEffect(() => {
    const handleModeChange = (event: Event) => {
      const detail =
        event instanceof CustomEvent && event.detail && typeof event.detail === "object"
          ? (event.detail as { label?: unknown })
          : null;
      setModeOverride(typeof detail?.label === "string" ? detail.label : null);
    };

    window.addEventListener(LIFTDLE_HEADER_MODE_EVENT, handleModeChange as EventListener);
    return () =>
      window.removeEventListener(LIFTDLE_HEADER_MODE_EVENT, handleModeChange as EventListener);
  }, []);

  useEffect(() => {
    const handleStreakChange = (event: Event) => {
      const detail =
        event instanceof CustomEvent && event.detail && typeof event.detail === "object"
          ? (event.detail as { value?: unknown })
          : null;
      setCurrentStreak(typeof detail?.value === "number" ? detail.value : 0);
    };

    window.addEventListener(LIFTDLE_HEADER_STREAK_EVENT, handleStreakChange as EventListener);
    return () =>
      window.removeEventListener(LIFTDLE_HEADER_STREAK_EVENT, handleStreakChange as EventListener);
  }, []);

  const pathnameLabel = getLiftdleHeaderLabel(pathname);
  const isHub = pathname === "/";
  const showModeActions =
    (pathname?.startsWith("/daily") ?? false) || (pathname?.startsWith("/liftgrid") ?? false);
  const splashlineText = isHub ? hubLabel : modeOverride ?? pathnameLabel ?? "Liftdle";

  const emitHeaderAction = (action: LiftdleHeaderAction) => {
    window.dispatchEvent(
      new CustomEvent(LIFTDLE_HEADER_OPEN_EVENT, {
        detail: { action },
      }),
    );
  };

  return (
    <header
      className={`hub-header shared-brand-header ${isHub ? "shared-brand-header--hub" : "shared-brand-header--mode"} ${
        showModeActions ? "shared-brand-header--has-tools" : ""
      }`.trim()}
    >
      <div className="shared-brand-header__row">
        <div className="shared-brand-header__slot shared-brand-header__slot--start">
          {!isHub ? (
            <Link href="/" className="shared-brand-header__home" aria-label="Go to homepage">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="shared-brand-header__home-icon">
                <path
                  d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5h-5.8a.5.5 0 0 1-.5-.5v-5.1h-4.4v5.1a.5.5 0 0 1-.5.5H3.5a.5.5 0 0 1-.5-.5z"
                  fill="currentColor"
                />
              </svg>
            </Link>
          ) : null}
        </div>
        <div className="shared-brand-header__slot shared-brand-header__slot--center">
          <div className="hub-brand shared-brand-header__brand">
            <Logo
              withSplashline
              splashlineVariant="standalone"
              splashlineText={splashlineText ?? undefined}
            />
          </div>
        </div>
        <div className="shared-brand-header__slot shared-brand-header__slot--end">
          {showModeActions ? (
            <div className="shared-brand-header__actions" aria-label="Mode actions">
              <button
                type="button"
                className="shared-brand-header__tool"
                aria-label="Open statistics"
                onClick={() => emitHeaderAction("stats")}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="shared-brand-header__tool-icon">
                  <path d="M4 20V11H8V20H4ZM10 20V4H14V20H10ZM16 20V8H20V20H16Z" fill="currentColor" />
                </svg>
                <span className="shared-brand-header__tool-tooltip">Stats</span>
              </button>
              <button
                type="button"
                className="shared-brand-header__tool"
                aria-label="Open how to play"
                onClick={() => emitHeaderAction("how-to-play")}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="shared-brand-header__tool-icon">
                  <path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 12.8a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Zm.1-9.3c-2 0-3.4 1.1-3.6 2.9h2.1c.1-.7.6-1.1 1.4-1.1.8 0 1.3.4 1.3 1.1 0 .6-.3 1-.9 1.4-.9.5-1.8 1.2-1.8 2.8v.3h2v-.2c0-.8.2-1.1 1-1.6.9-.5 1.8-1.4 1.8-2.9 0-1.8-1.4-2.7-3.3-2.7Z" fill="currentColor" />
                </svg>
                <span className="shared-brand-header__tool-tooltip">How to play</span>
              </button>
              <div
                className={`shared-brand-header__tool shared-brand-header__tool--static ${
                  currentStreak > 0
                    ? "shared-brand-header__tool--accent shared-brand-header__tool--streak-active"
                    : "shared-brand-header__tool--streak-idle"
                }`.trim()}
                aria-label={`Current streak ${currentStreak}`}
              >
                <StreakFireIcon active={currentStreak > 0} />
                <span className="shared-brand-header__tool-count">{currentStreak}</span>
                <span className="shared-brand-header__tool-tooltip">Streak {currentStreak}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
