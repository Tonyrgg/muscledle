import type { Reps } from "@/types/exercise";

export type RepsDirection = "up" | "down" | null;

const REPS_ORDER = new Map<Reps, number>([
  ["1-5", 0],
  ["6-12", 1],
  ["12+", 2],
]);

function toComparableBucket(values: readonly string[]): number | null {
  const normalizedValues = values
    .map((value) => value.trim())
    .filter((value): value is Reps => REPS_ORDER.has(value as Reps));

  if (normalizedValues.length !== 1) {
    return null;
  }

  return REPS_ORDER.get(normalizedValues[0]) ?? null;
}

export function getRepsDirection(guessValues: readonly string[], targetValues: readonly string[]): RepsDirection {
  const guessBucket = toComparableBucket(guessValues);
  const targetBucket = toComparableBucket(targetValues);

  if (guessBucket === null || targetBucket === null || guessBucket === targetBucket) {
    return null;
  }

  return guessBucket < targetBucket ? "up" : "down";
}
