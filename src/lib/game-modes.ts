export type GameModeKey =
  | "daily"
  | "liftgrid"
  | "weightguess"
  | "marathon"
  | "archive"
  | "about"
  | "privacy";

type GameModeConfig = {
  key: GameModeKey;
  label: string;
  iconSrc: string;
};

export const GAME_MODES: Record<GameModeKey, GameModeConfig> = {
  daily: {
    key: "daily",
    label: "Daily",
    iconSrc: "/mode-icons/daily.svg",
  },
  liftgrid: {
    key: "liftgrid",
    label: "LiftGrid",
    iconSrc: "/mode-icons/liftgrid.svg",
  },
  weightguess: {
    key: "weightguess",
    label: "WeightGuess",
    iconSrc: "/mode-icons/weightguess.svg",
  },
  marathon: {
    key: "marathon",
    label: "Marathon",
    iconSrc: "/mode-icons/marathon.svg",
  },
  archive: {
    key: "archive",
    label: "Archive",
    iconSrc: "/mode-icons/archive.svg",
  },
  about: {
    key: "about",
    label: "About",
    iconSrc: "/mode-icons/about.svg",
  },
  privacy: {
    key: "privacy",
    label: "Privacy",
    iconSrc: "/mode-icons/privacy.svg",
  },
};

export function getGameMode(mode: GameModeKey) {
  return GAME_MODES[mode];
}

export function getGameModeByPathname(pathname: string | null | undefined) {
  if (!pathname || pathname === "/") {
    return null;
  }

  if (pathname.startsWith("/daily")) return GAME_MODES.daily;
  if (pathname.startsWith("/liftgrid")) return GAME_MODES.liftgrid;
  if (pathname.startsWith("/weightGuess") || pathname.startsWith("/loadguess")) {
    return GAME_MODES.weightguess;
  }
  if (pathname.startsWith("/marathon")) return GAME_MODES.marathon;
  if (pathname.startsWith("/archive")) return GAME_MODES.archive;
  if (pathname.startsWith("/how-to-play")) return GAME_MODES.about;
  if (pathname.startsWith("/privacy") || pathname.startsWith("/cookies")) {
    return GAME_MODES.privacy;
  }

  return null;
}
