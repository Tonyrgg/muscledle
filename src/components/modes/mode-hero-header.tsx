type ModeHeroHeaderProps = {
  modeLead: string;
  modeAccent: string;
  subtitle?: string;
  className?: string;
};

export function ModeHeroHeader({
  modeLead,
  modeAccent,
  subtitle,
  className,
}: ModeHeroHeaderProps) {
  const fullModeLabel = `${modeLead}${modeAccent}`;

  return (
    <header className={`mode-hero ${className ?? ""}`.trim()}>
      <div className="mode-hero__bar">
        <div className="mode-hero__content">
          <h1 className="mode-hero__wordmark" aria-label={`LIFTDLE x ${fullModeLabel}`}>
            <span className="mode-hero__segment">
              <span className="mode-hero__segment-main">LIFT</span>
              <span className="mode-hero__segment-accent">DLE</span>
            </span>
            <span className="mode-hero__separator">x</span>
            <span className="mode-hero__segment">
              <span className="mode-hero__segment-main">{modeLead}</span>
              <span className="mode-hero__segment-accent">{modeAccent}</span>
            </span>
          </h1>
          {subtitle ? <p className="mode-hero__subtitle">{subtitle}</p> : null}
        </div>
      </div>
    </header>
  );
}
