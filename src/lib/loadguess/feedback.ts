import type { LoadFeedback, Unit } from "@/lib/loadguess/types";

const KG_TO_LB_RATIO = 2.205;

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

export function convertKgToLb(valueKg: number): number {
  return Math.round(valueKg * KG_TO_LB_RATIO);
}

export function formatLoadValue(valueKg: number, unit: Unit): string {
  if (unit === "lb") {
    return `${convertKgToLb(valueKg)} lb`;
  }

  return `${valueKg} kg`;
}

export function formatLoadSummary(valueKg: number): string {
  return `${valueKg}kg / ${convertKgToLb(valueKg)}lbs`;
}
