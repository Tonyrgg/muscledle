import type { ReactNode } from "react";

type ModePanelProps = {
  children: ReactNode;
  className?: string;
};

export function ModePanel({ children, className }: ModePanelProps) {
  return <section className={`mode-panel ${className ?? ""}`.trim()}>{children}</section>;
}
