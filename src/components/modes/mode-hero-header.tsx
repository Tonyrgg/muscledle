import type { ReactNode } from "react";
import { ModeSignature } from "@/components/modes/mode-signature";
import { ModeTitle, type ModeTitlePart } from "@/components/modes/mode-title";

type ModeHeroHeaderProps = {
  titleParts: ModeTitlePart[];
  badge?: ReactNode;
  description?: ReactNode;
  className?: string;
  signatureHref?: string;
};

export function ModeHeroHeader({
  titleParts,
  badge,
  description,
  className,
  signatureHref,
}: ModeHeroHeaderProps) {
  return (
    <header className={`mode-hero ${className ?? ""}`.trim()}>
      <div className="mode-hero__stack">
        {badge ? <div className="mode-hero__badge">{badge}</div> : null}
        <ModeTitle parts={titleParts} />
        <ModeSignature href={signatureHref} />
        {description ? <div className="mode-hero__description">{description}</div> : null}
      </div>
    </header>
  );
}
