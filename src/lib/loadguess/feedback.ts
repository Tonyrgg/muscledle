import type { LoadFeedback, Unit } from "@/lib/loadguess/types";

export const LOAD_FEEDBACK_LABELS: Record<LoadFeedback, string> = {
  cold: "Cold",
  medium: "Medium",
  warm: "Warm",
  hot: "Hot",
  correct: "Correct",
};

export function getLoadFeedback(
  guessKg: number,
  targetKg: number,
): LoadFeedback {
  const diff = Math.abs(guessKg - targetKg);

  if (diff === 0) return "correct";
  if (diff <= 5) return "hot";
  if (diff <= 15) return "warm";
  if (diff <= 30) return "medium";
  return "cold";
}

export function getLoadDirection(guessKg: number, targetKg: number): string {
  if (guessKg < targetKg) return "Too light";
  if (guessKg > targetKg) return "Too heavy";
  return "Perfect";
}

export function formatLoadValue(valueKg: number, unit: Unit): string {
  if (unit === "lb") {
    return `${Math.round(valueKg * 2.20462)} lb`;
  }

  return `${valueKg} kg`;
}
