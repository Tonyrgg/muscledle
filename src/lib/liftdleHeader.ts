export const LIFTDLE_HEADER_MODE_EVENT = "liftdle-header-mode";

export function getLiftdleHeaderLabel(pathname: string | null | undefined) {
  if (!pathname || pathname === "/") {
    return null;
  }

  if (pathname.startsWith("/daily")) return "Daily";
  if (pathname.startsWith("/liftgrid")) return "LiftGrid";
  if (pathname.startsWith("/weightGuess") || pathname.startsWith("/loadguess")) {
    return "WeightGuess";
  }
  if (pathname.startsWith("/marathon")) return "Marathon";
  if (pathname.startsWith("/archive")) return "Archive";
  if (pathname.startsWith("/how-to-play")) return "About";
  if (pathname.startsWith("/privacy") || pathname.startsWith("/cookies")) {
    return "Privacy";
  }

  const segment = pathname.split("/").filter(Boolean)[0];
  if (!segment) return null;

  return segment
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
