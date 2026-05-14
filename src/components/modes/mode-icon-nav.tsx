"use client";

import Link from "next/link";
import { ModeIcon } from "@/components/modes/mode-icon";
import {
  useTrackableModeCompletions,
  type TrackableModeKey,
  type TrackableModeCompletions,
} from "@/components/modes/use-trackable-mode-completions";

type ModeIconNavItem = {
  mode: TrackableModeKey;
  label: string;
  href: string;
};

const MODE_ICON_NAV_ITEMS: readonly ModeIconNavItem[] = [
  {
    mode: "daily",
    label: "Daily",
    href: "/daily",
  },
  {
    mode: "liftgrid",
    label: "LiftGrid",
    href: "/liftgrid",
  },
] as const;

type ModeIconNavProps = {
  activeMode: TrackableModeKey;
  className?: string;
  completionOverrides?: Partial<TrackableModeCompletions>;
};

export function ModeIconNav({ activeMode, className, completionOverrides }: ModeIconNavProps) {
  const completions = useTrackableModeCompletions(completionOverrides);

  return (
    <nav
      className={`mode-icon-nav ${className ?? ""}`.trim()}
      aria-label="Mode navigation"
    >
      {MODE_ICON_NAV_ITEMS.map((item, index) => (
        <div className="mode-icon-nav__node" key={item.mode}>
          {index > 0 ? (
            <span className="mode-icon-nav__separator" aria-hidden="true" />
          ) : null}
          <Link
            href={item.href}
            aria-current={activeMode === item.mode ? "page" : undefined}
            className={`mode-icon-nav__item ${
              activeMode === item.mode ? "mode-icon-nav__item--active" : ""
            } ${
              completions[item.mode] ? "mode-icon-nav__item--completed" : ""
            }`.trim()}
          >
            <ModeIcon mode={item.mode} className="mode-icon mode-icon-nav__icon" alt="" />
            {completions[item.mode] ? (
              <span className="mode-icon-nav__check" aria-hidden="true">
                <svg viewBox="0 0 16 16" className="mode-icon-nav__check-icon">
                  <path
                    d="M6.55 10.95 3.7 8.1l-1.1 1.1 3.95 3.95 6.85-6.85-1.1-1.1z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            ) : null}
            <span className="mode-icon-nav__tooltip" role="tooltip">
              {item.label}
            </span>
          </Link>
        </div>
      ))}
    </nav>
  );
}
