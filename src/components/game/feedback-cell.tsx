import type { FeedbackColor } from "@/types/exercise";

type FeedbackCellProps = {
  color: FeedbackColor;
  value: string;
};

const colorClassByFeedback: Record<FeedbackColor, string> = {
  green: "feedback-cell--green",
  yellow: "feedback-cell--yellow",
  red: "feedback-cell--red",
};

export function FeedbackCell({ color, value }: FeedbackCellProps) {
  return (
    <div className={`feedback-cell ${colorClassByFeedback[color]}`} role="cell" aria-label={value}>
      <span>{value}</span>
    </div>
  );
}
