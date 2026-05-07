import type { FeedbackColumnKey } from "@/lib/exercises/attribute-definitions";

const ICON_STUB_ALIASES = new Map<string, string>([
  ["equipment:machine", "workout-machine"],
  ["equipment:dumbbell", "dumbell"],
  ["equipment:dumbbells", "dumbell"],
  ["ego:low", "fire"],
  ["ego:medium", "fire"],
  ["ego:high", "fire"],
]);

const EQUIPMENT_ICON_SIZE_CLASSES = new Map<string, string>([
  ["machine", "feedback-cell__value-icon--equipment-machine"],
  ["cable", "feedback-cell__value-icon--equipment-cable"],
  ["barbell", "feedback-cell__value-icon--equipment-barbell"],
  ["bodyweight", "feedback-cell__value-icon--equipment-bodyweight"],
  ["kettlebell", "feedback-cell__value-icon--equipment-kettlebell"],
  ["dumbbell", "feedback-cell__value-icon--equipment-dumbbell"],
  ["dumbbells", "feedback-cell__value-icon--equipment-dumbbell"],
]);

function normalizeValueStub(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/&/g, " and ")
    .replace(/[()/]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getValueBackdropPath(column: FeedbackColumnKey, value: string): string | null {
  if (column === "muscle") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) {
    return null;
  }

  if (column === "reps") {
    return null;
  }

  const alias = ICON_STUB_ALIASES.get(`${column}:${normalizedValue}`);
  const stub = alias ?? normalizeValueStub(normalizedValue);
  return stub ? `/icons/${stub}.svg` : null;
}

export function getValueBackdropSizeClass(column: FeedbackColumnKey, value: string): string | null {
  const normalizedValue = value.trim().toLowerCase();

  if (column !== "ego") {
    if (column === "equipment") {
      return EQUIPMENT_ICON_SIZE_CLASSES.get(normalizedValue) ?? "feedback-cell__value-icon--standard";
    }

    return "feedback-cell__value-icon--standard";
  }

  if (normalizedValue === "high") return "feedback-cell__value-icon--high";
  if (normalizedValue === "medium") return "feedback-cell__value-icon--medium";
  return "feedback-cell__value-icon--low";
}
