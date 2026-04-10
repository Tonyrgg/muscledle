import type { CSSProperties } from "react";
import type { FeedbackColor } from "@/types/exercise";

type FeedbackCellProps = {
  color: FeedbackColor;
  value: string;
  isRevealing?: boolean;
  revealOrder?: number;
};

const colorClassByFeedback: Record<FeedbackColor, string> = {
  green: "feedback-cell--green",
  yellow: "feedback-cell--yellow",
  red: "feedback-cell--red",
};

export function FeedbackCell({ color, value, isRevealing = false, revealOrder = 0 }: FeedbackCellProps) {
  const style: CSSProperties | undefined = isRevealing
    ? {
        animationDelay: `${revealOrder * 180}ms`,
      }
    : undefined;

  return (
    <div
      className={`feedback-cell ${colorClassByFeedback[color]} ${isRevealing ? "feedback-cell--reveal" : ""}`}
      role="cell"
      aria-label={value}
      style={style}
    >
      <span>{value}</span>
    </div>
  );
}
