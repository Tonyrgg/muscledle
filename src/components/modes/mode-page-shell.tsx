import type { ReactNode } from "react";

type ModePageShellProps = {
  children: ReactNode;
  className?: string;
};

export function ModePageShell({ children, className }: ModePageShellProps) {
  return <main className={`game-page mode-page ${className ?? ""}`.trim()}>{children}</main>;
}
