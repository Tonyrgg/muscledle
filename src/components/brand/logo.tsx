type LogoProps = {
  className?: string;
  withTagline?: boolean;
};

export function Logo({ className, withTagline = false }: LogoProps) {
  return (
    <div className={`brand-logo ${className ?? ""}`.trim()} aria-label="Liftdle">
      <h1 className="brand-logo__wordmark">
        <span className="brand-logo__main">LIFT</span>
        <span className="brand-logo__accent">DLE</span>
      </h1>
      {withTagline ? (
        <p className="brand-logo__tagline">Guess the exercise</p>
      ) : null}
    </div>
  );
}


