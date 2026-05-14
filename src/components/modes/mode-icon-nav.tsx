import Link from "next/link";
import { ModeIcon } from "@/components/modes/mode-icon";
import type { GameModeKey } from "@/lib/game-modes";

type ModeIconNavItem = {
  mode: GameModeKey;
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
  activeMode: GameModeKey;
  className?: string;
};

export function ModeIconNav({ activeMode, className }: ModeIconNavProps) {
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
            }`.trim()}
          >
            <ModeIcon mode={item.mode} className="mode-icon mode-icon-nav__icon" alt="" />
            <span className="mode-icon-nav__tooltip" role="tooltip">
              {item.label}
            </span>
          </Link>
        </div>
      ))}
    </nav>
  );
}
