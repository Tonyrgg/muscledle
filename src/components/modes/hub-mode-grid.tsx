"use client";

import Link from "next/link";
import { ModeIcon } from "@/components/modes/mode-icon";
import {
  useTrackableModeCompletions,
  type TrackableModeCompletionState,
  type TrackableModeKey,
} from "@/components/modes/use-trackable-mode-completions";
import type { GameModeKey } from "@/lib/game-modes";

type HubCardConfig = {
  iconMode: GameModeKey;
  mode: GameModeKey;
  trackableMode?: TrackableModeKey;
  title: string;
  href: string | null;
  description: string;
  status: string | null;
  disabled: boolean;
  className: string;
  ariaLabel: string;
};

const primaryHubCards: readonly HubCardConfig[] = [
  {
    iconMode: "daily",
    mode: "daily",
    trackableMode: "daily",
    title: "Daily",
    href: "/daily",
    description: "Guess today's exercise using training clues.",
    status: null,
    disabled: false,
    className: "hub-card--daily",
    ariaLabel: "Open Daily mode",
  },
  {
    iconMode: "liftgrid",
    mode: "liftgrid",
    trackableMode: "liftgrid",
    title: "LiftGrid",
    href: "/liftgrid",
    description: "Match muscles and equipment across the grid.",
    status: "New",
    disabled: false,
    className: "hub-card--liftgrid",
    ariaLabel: "Open LiftGrid mode",
  },
] as const;

const secondaryHubCards: readonly HubCardConfig[] = [
  {
    iconMode: "weightguess",
    mode: "weightguess",
    title: "WeightGuess",
    href: null,
    description: "Watch the lift and guess the weight.",
    status: "Coming Soon",
    disabled: true,
    className: "hub-card--weightguess hub-card--disabled hub-card--coming-soon hub-card--compact",
    ariaLabel: "WeightGuess coming soon",
  },
  {
    iconMode: "marathon",
    mode: "weightguess",
    title: "More Games",
    href: null,
    description: "More competitive modes are on the way.",
    status: "Coming Soon",
    disabled: true,
    className: "hub-card--moregames hub-card--disabled hub-card--coming-soon hub-card--compact",
    ariaLabel: "More games coming soon",
  },
] as const;

function CompletionCheck({ className, outcome }: { className: string; outcome: TrackableModeCompletionState }) {
  return (
    <span className={`${className} ${outcome === "lost" ? `${className}--lost` : ""}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 16 16" className={`${className}__icon`}>
        {outcome === "lost" ? (
          <path
            d="M4.15 4.15 8 8m0 0 3.85 3.85M8 8l3.85-3.85M8 8 4.15 11.85"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M6.55 10.95 3.7 8.1l-1.1 1.1 3.95 3.95 6.85-6.85-1.1-1.1z"
            fill="currentColor"
          />
        )}
      </svg>
    </span>
  );
}

function HubCard({
  iconMode,
  trackableMode,
  title,
  href,
  description,
  status,
  disabled,
  className,
  ariaLabel,
  outcome,
}: HubCardConfig & { outcome: TrackableModeCompletionState }) {
  const cardInner = (
    <>
      <div className="hub-card__topline">
        <span className="hub-card__icon">
          <ModeIcon mode={iconMode} className="hub-card__icon-svg" alt="" />
        </span>
        <span className="hub-card__status-cluster">
          {status ? <span className="hub-card__pill">{status}</span> : null}
          {outcome !== "none" ? <CompletionCheck className="hub-card__check" outcome={outcome} /> : null}
        </span>
      </div>
      <div className="hub-card__visual" aria-hidden="true" />
      <div className="hub-card__body">
        <span className="hub-card__line" aria-hidden="true" />
        <div className="hub-card__headline">
          <h2 className="hub-card__title">{title}</h2>
          <span className="hub-card__arrow" aria-hidden="true">→</span>
        </div>
        <p className="hub-card__description">{description}</p>
      </div>
    </>
  );

  const completedClass = outcome !== "none" && !disabled ? "hub-card--completed" : "";
  const nextClassName = `hub-card ${className} ${completedClass}`.trim();

  if (disabled || !href) {
    return (
      <article
        className={nextClassName}
        aria-label={ariaLabel}
        data-mode={trackableMode ?? undefined}
      >
        {cardInner}
      </article>
    );
  }

  return (
    <Link
      href={href}
      className={nextClassName}
      aria-label={ariaLabel}
      data-mode={trackableMode ?? undefined}
    >
      {cardInner}
    </Link>
  );
}

export function HubModeGrid() {
  const completions = useTrackableModeCompletions();

  return (
    <section className="hub-grid" aria-label="Liftdle game modes">
      <div className="hub-grid__row hub-grid__row--primary">
        {primaryHubCards.map((card) => (
          <HubCard
            key={card.title}
            {...card}
            outcome={card.trackableMode ? completions[card.trackableMode] : "none"}
          />
        ))}
      </div>
      <div className="hub-grid__row hub-grid__row--secondary">
        {secondaryHubCards.map((card) => (
          <HubCard key={card.title} {...card} outcome="none" />
        ))}
      </div>
    </section>
  );
}
