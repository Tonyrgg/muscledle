import Link from "next/link";

type ModeSignatureProps = {
  className?: string;
  href?: string;
};

export function ModeSignature({
  className,
  href = "/",
}: ModeSignatureProps) {
  return (
    <p className={`mode-signature ${className ?? ""}`.trim()}>
      <span className="mode-signature__by">by</span>
      <Link href={href} className="mode-signature__link" aria-label="Go to Liftdle homepage">
        <span className="mode-signature__part">LIFT</span>
        <span className="mode-signature__part mode-signature__part--accent">DLE</span>
      </Link>
    </p>
  );
}
