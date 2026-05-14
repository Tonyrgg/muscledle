import { getGameModeByPathname } from "@/lib/game-modes";

export const LIFTDLE_HEADER_MODE_EVENT = "liftdle-header-mode";

export function getLiftdleHeaderLabel(pathname: string | null | undefined) {
  const mode = getGameModeByPathname(pathname);
  if (mode) {
    return mode.label;
  }

  const segment = pathname?.split("/").filter(Boolean)[0];
  if (!segment) return null;

  return segment
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
