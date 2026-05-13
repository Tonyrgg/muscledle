type ModeTitlePart = {
  text: string;
  accent?: boolean;
};

type ModeTitleProps = {
  parts: ModeTitlePart[];
  className?: string;
};

export function ModeTitle({ parts, className }: ModeTitleProps) {
  return (
    <h1 className={`mode-title ${className ?? ""}`.trim()}>
      {parts.map((part) => (
        <span
          key={`${part.text}-${part.accent ? "accent" : "base"}`}
          className={`mode-title__part ${part.accent ? "mode-title__part--accent" : ""}`.trim()}
        >
          {part.text}
        </span>
      ))}
    </h1>
  );
}

export type { ModeTitlePart };
