import type { FeedbackColor } from "@/types/exercise";

type FeedbackCellProps = {
  color: FeedbackColor;
  label: string;
};

const colorClassByFeedback: Record<FeedbackColor, string> = {
  green: "feedback-pill--green",
  yellow: "feedback-pill--yellow",
  red: "feedback-pill--red",
};

export function FeedbackCell({ color, label }: FeedbackCellProps) {
  return (
    <span aria-label={label} className={`feedback-cell feedback-pill ${colorClassByFeedback[color]}`}>
      {label}
    </span>
  );
}
