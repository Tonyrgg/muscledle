import { getGameMode, type GameModeKey } from "@/lib/game-modes";

type ModeIconProps = {
  mode: GameModeKey;
  className?: string;
  alt?: string;
};

export function ModeIcon({ mode, className, alt }: ModeIconProps) {
  const modeConfig = getGameMode(mode);

  return (
    <span
      className={className}
      aria-label={alt ?? `${modeConfig.label} icon`}
      role="img"
      style={
        {
          "--mode-icon-src": `url("${modeConfig.iconSrc}")`,
        } as React.CSSProperties
      }
    />
  );
}
