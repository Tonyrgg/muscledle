import Link from "next/link";

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
        <Link href="/" className="mode-hero__home" aria-label="Go to homepage">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="mode-hero__home-icon">
            <path
              d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5h-5.8a.5.5 0 0 1-.5-.5v-5.1h-4.4v5.1a.5.5 0 0 1-.5.5H3.5a.5.5 0 0 1-.5-.5z"
              fill="currentColor"
            />
          </svg>
        </Link>
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
