"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/brand/logo";
import {
  getLiftdleHeaderLabel,
  LIFTDLE_HEADER_MODE_EVENT,
} from "@/lib/liftdleHeader";

export function SharedBrandHeader() {
  const pathname = usePathname();
  const hubLabel = useMemo(() => null, []);
  const [modeOverride, setModeOverride] = useState<string | null>(null);

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

  const pathnameLabel = getLiftdleHeaderLabel(pathname);
  const isHub = pathname === "/";
  const splashlineText = isHub ? hubLabel : modeOverride ?? pathnameLabel ?? "Liftdle";

  return (
    <header className={`hub-header shared-brand-header ${isHub ? "shared-brand-header--hub" : "shared-brand-header--mode"}`}>
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
        <div className="shared-brand-header__slot shared-brand-header__slot--end" aria-hidden="true" />
      </div>
    </header>
  );
}
