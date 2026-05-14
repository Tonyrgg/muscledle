"use client";

import { useMemo } from "react";
import { getRandomLiftdleSplashline } from "@/lib/liftdleSplashlines";

type LogoProps = {
  className?: string;
  withTagline?: boolean;
  withSplashline?: boolean;
  splashlineVariant?: "default" | "standalone";
};

export function Logo({
  className,
  withTagline = false,
  withSplashline = false,
  splashlineVariant = "default",
}: LogoProps) {
  const splashline = useMemo(() => getRandomLiftdleSplashline(), []);
  const splashlineLengthClass =
    splashlineVariant === "standalone"
      ? splashline.length > 28
        ? "brand-logo__splashline--long"
        : "brand-logo__splashline--short"
      : "";

  return (
    <div className={`brand-logo ${className ?? ""}`.trim()} aria-label="Liftdle">
      <h1 className="brand-logo__wordmark">
        <span className="brand-logo__main">LIFT</span>
        <span className="brand-logo__accent">DLE</span>
      </h1>
      {withTagline ? (
        <div className="brand-logo__tagline-group">
          <p className="brand-logo__tagline">Guess the exercise</p>
          <span className="brand-logo__splashline">{splashline}</span>
        </div>
      ) : withSplashline ? (
        <span
          className={`brand-logo__splashline brand-logo__splashline--${splashlineVariant} ${splashlineLengthClass}`.trim()}
        >
          {splashline}
        </span>
      ) : null}
    </div>
  );
}


