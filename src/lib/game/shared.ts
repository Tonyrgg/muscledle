import type { GuessFeedback } from "@/types/exercise";

export class AuthRequiredError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class GameConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameConflictError";
  }
}

const FEEDBACK_COLORS = new Set(["green", "yellow", "red"]);

export function normalizeFeedback(input: unknown): GuessFeedback {
  const value = input as Partial<Record<keyof GuessFeedback, string>>;

  const normalizeColor = (key: keyof GuessFeedback): GuessFeedback[typeof key] => {
    const color = value?.[key];
    return FEEDBACK_COLORS.has(color ?? "") ? (color as GuessFeedback[typeof key]) : "red";
  };

  return {
    muscle: normalizeColor("muscle"),
    equipment: normalizeColor("equipment"),
    movement: normalizeColor("movement"),
    pattern: normalizeColor("pattern"),
    reps: normalizeColor("reps"),
    goal: normalizeColor("goal"),
    ego: normalizeColor("ego"),
  };
}
